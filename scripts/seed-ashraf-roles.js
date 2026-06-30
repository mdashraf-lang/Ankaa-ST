/**
 * Seed three Mohammad Ashraf accounts — one per role.
 * Run: node scripts/seed-ashraf-roles.js
 */
const fs   = require('fs')
const path = require('path')
const { randomUUID } = require('crypto')
const { PGlite } = require('@electric-sql/pglite')
const bcrypt = require('bcryptjs')

const envPath = path.join(__dirname, '..', '.env.local')
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const t = line.trim()
    if (!t || t.startsWith('#')) return
    const eq = t.indexOf('=')
    if (eq < 0) return
    process.env[t.slice(0, eq).trim()] = t.slice(eq + 1).trim()
  })
}

const DATA_DIR = process.env.LOCAL_DB_PATH ||
  path.resolve(__dirname, '..', '.local-db').replace(/\\/g, '/')

const ACCOUNTS = [
  {
    email:         'ashraf@ankaa.om',
    password:      'Ashraf@Super2026',
    full_name:     'MD Ashraf',
    role:          'admin',
    username:      'ashraf',
    employee_id:   'ANK-033',
    position_title:'ERP Project Lead – Super Admin',
    department_id: 'Technology',
    joining_date:  '2025-01-01',
    phone_number:  '+96891234032',
    gender:        'male',
    date_of_birth: '1994-04-15',
    status:        'active',
    contract_type: 'full_time',
    basic_salary:  2200,
  },
  {
    email:         'mdashraf@ankaa.om',
    password:      'Ashraf@Admin2026',
    full_name:     'MD Ashraf',
    role:          'admin',
    username:      'mdashraf_admin',
    employee_id:   'ANK-033A',
    position_title:'ERP Administrator',
    department_id: 'Technology',
    joining_date:  '2025-01-01',
    phone_number:  '+96891234032',
    gender:        'male',
    date_of_birth: '1994-04-15',
    status:        'active',
    contract_type: 'full_time',
    basic_salary:  2000,
  },
  {
    email:         'mdashraf.intern@ankaa.om',
    password:      'Ashraf@Train2026',
    full_name:     'MD Ashraf',
    role:          'trainee',
    username:      'mdashraf_intern',
    employee_id:   'ANK-033T',
    position_title:'Software Engineering Trainee',
    department_id: 'Software Engineering',
    joining_date:  '2026-01-01',
    phone_number:  '+96891234032',
    gender:        'male',
    date_of_birth: '1994-04-15',
    status:        'active',
    contract_type: 'intern',
    basic_salary:  500,
  },
]

async function main() {
  console.log('\nAnkaa ERP — Seed Ashraf Multi-Role Accounts')
  console.log('─'.repeat(55))
  console.log('DB:', DATA_DIR)

  const db = new PGlite(DATA_DIR)

  // Ensure 'trainee' role is accepted (it's a TEXT field so no constraint needed)
  // Also add 'trainee' to the UserRole type in types.ts

  for (const a of ACCOUNTS) {
    const hash = await bcrypt.hash(a.password, 10)

    // Try update first
    const upd = await db.query(
      `UPDATE profiles SET
         password_hash=$1, role=$2, full_name=$3, username=$4,
         employee_id=$5, position_title=$6, department_id=$7,
         joining_date=$8, phone_number=$9, gender=$10, date_of_birth=$11,
         status=$12, contract_type=$13, basic_salary=$14,
         updated_at=$15
       WHERE email=$16 RETURNING id`,
      [hash, a.role, a.full_name, a.username,
       a.employee_id, a.position_title, a.department_id,
       a.joining_date, a.phone_number, a.gender, a.date_of_birth,
       a.status, a.contract_type, a.basic_salary,
       new Date().toISOString(), a.email]
    )

    if (upd.rows.length) {
      console.log(`  ↻  ${a.email.padEnd(32)} updated  → ${a.role}`)
      // Ensure leave balance exists
      await db.query(
        `INSERT INTO leave_balances (id, user_id, annual_leave_days, sick_leave_days)
         SELECT $1, id, 30, 21 FROM profiles WHERE email=$2
         ON CONFLICT DO NOTHING`,
        [randomUUID(), a.email]
      ).catch(() => {})
    } else {
      const id = randomUUID()
      await db.query(
        `INSERT INTO profiles
           (id, email, password_hash, full_name, role, username,
            employee_id, position_title, department_id, joining_date,
            phone_number, gender, date_of_birth, status, contract_type,
            basic_salary, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
         ON CONFLICT DO NOTHING`,
        [id, a.email, hash, a.full_name, a.role, a.username,
         a.employee_id, a.position_title, a.department_id, a.joining_date,
         a.phone_number, a.gender, a.date_of_birth, a.status, a.contract_type,
         a.basic_salary, new Date().toISOString()]
      )
      await db.query(
        `INSERT INTO leave_balances (id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [randomUUID(), id]
      ).catch(() => {})
      console.log(`  ✓  ${a.email.padEnd(32)} created  → ${a.role}`)
    }
  }

  console.log('\n' + '─'.repeat(55))
  console.log('✅  Done')
  console.log('─'.repeat(55))
  console.log('\n  Account                              Role         Password')
  console.log('  ' + '─'.repeat(72))
  for (const a of ACCOUNTS) {
    console.log(`  ${a.email.padEnd(38)} ${a.role.padEnd(12)} ${a.password}`)
  }
  console.log('\n  Login at: http://localhost:3001/login')
  console.log('─'.repeat(55) + '\n')

  await db.close()
}

main().catch(e => { console.error('\nFailed:', e.message); process.exit(1) })
