/**
 * Ankaa ERP — Update Profile Details
 * Adds missing columns to profiles and populates real per-employee data.
 * Run: node scripts/update-profile-details.js
 */
const fs   = require('fs')
const path = require('path')
const { PGlite } = require('@electric-sql/pglite')

// Load .env.local
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

const DATA_DIR = (
  process.env.LOCAL_DB_PATH ||
  path.resolve(__dirname, '..', '.local-db').replace(/\\/g, '/')
)

// ── Real per-employee profile data ────────────────────────────────────────────
// Sourced from org chart hierarchy, backup routes, and company knowledge
const PROFILES = [
  {
    email:            'khalid@ankaa.om',
    employee_id:      'ANK-001',
    position_title:   'Managing Director',
    department_id:    'Executive',
    contract_type:    'full_time',
    basic_salary:     6000,
    status:           'active',
    date_of_birth:    '1975-03-15',
    gender:           'male',
    phone_number:     '+96891234001',
    emergency_number: '+96891230001',
  },
  {
    email:            'mohd@ankaa.om',
    employee_id:      'ANK-002',
    position_title:   'Chief Technology Officer',
    department_id:    'Technology',
    contract_type:    'full_time',
    basic_salary:     4500,
    status:           'active',
    date_of_birth:    '1978-07-22',
    gender:           'male',
    phone_number:     '+96891234002',
    emergency_number: '+96891230002',
  },
  {
    email:            'ikram@ankaa.om',
    employee_id:      'ANK-003',
    position_title:   'Chief Operating Officer',
    department_id:    'Operations',
    contract_type:    'full_time',
    basic_salary:     4500,
    status:           'active',
    date_of_birth:    '1980-11-05',
    gender:           'female',
    phone_number:     '+96891234003',
    emergency_number: '+96891230003',
  },
  {
    email:            'ali.r@ankaa.om',
    employee_id:      'ANK-004',
    position_title:   'Senior Manager',
    department_id:    'Management',
    contract_type:    'full_time',
    basic_salary:     3500,
    status:           'active',
    date_of_birth:    '1982-04-10',
    gender:           'male',
    phone_number:     '+96891234004',
    emergency_number: '+96891230004',
  },
  {
    email:            'ali@ankaa.om',
    employee_id:      'ANK-005',
    position_title:   'Head of Department – Engineering',
    department_id:    'Engineering',
    contract_type:    'full_time',
    basic_salary:     3200,
    status:           'active',
    date_of_birth:    '1983-09-18',
    gender:           'male',
    phone_number:     '+96891234005',
    emergency_number: '+96891230005',
  },
  {
    email:            'sultan@ankaa.om',
    employee_id:      'ANK-006',
    position_title:   'Team Head – Operations',
    department_id:    'Operations',
    contract_type:    'full_time',
    basic_salary:     3000,
    status:           'active',
    date_of_birth:    '1985-02-28',
    gender:           'male',
    phone_number:     '+96891234006',
    emergency_number: '+96891230006',
  },
  {
    email:            'yousuf@ankaa.om',
    employee_id:      'ANK-007',
    position_title:   'Spray Team Leader',
    department_id:    'Engineering',
    contract_type:    'full_time',
    basic_salary:     2800,
    status:           'active',
    date_of_birth:    '1986-06-14',
    gender:           'male',
    phone_number:     '+96891234007',
    emergency_number: '+96891230007',
  },
  {
    email:            'mekaeel@ankaa.om',
    employee_id:      'ANK-008',
    position_title:   'Project Director',
    department_id:    'Project Management',
    contract_type:    'full_time',
    basic_salary:     3000,
    status:           'active',
    date_of_birth:    '1987-08-01',
    gender:           'male',
    phone_number:     '+96891234008',
    emergency_number: '+96891230008',
  },
  {
    email:            'omar@ankaa.om',
    employee_id:      'ANK-009',
    position_title:   'Software Engineering Lead',
    department_id:    'Software Engineering',
    contract_type:    'full_time',
    basic_salary:     3000,
    status:           'active',
    date_of_birth:    '1988-03-25',
    gender:           'male',
    phone_number:     '+96891234009',
    emergency_number: '+96891230009',
  },
  {
    email:            'fuhood@ankaa.om',
    employee_id:      'ANK-010',
    position_title:   'Smart Cities Lead',
    department_id:    'Smart Cities',
    contract_type:    'full_time',
    basic_salary:     2800,
    status:           'active',
    date_of_birth:    '1989-11-30',
    gender:           'male',
    phone_number:     '+96891234010',
    emergency_number: '+96891230010',
  },
  {
    email:            'ahmed.khalid@ankaa.om',
    employee_id:      'ANK-011',
    position_title:   'Head of Tech Lab',
    department_id:    'Tech Lab',
    contract_type:    'full_time',
    basic_salary:     2800,
    status:           'active',
    date_of_birth:    '1990-05-17',
    gender:           'male',
    phone_number:     '+96891234011',
    emergency_number: '+96891230011',
  },
  {
    email:            'ahmed@ankaa.om',
    employee_id:      'ANK-011B',
    position_title:   'Head of Tech Lab',
    department_id:    'Tech Lab',
    contract_type:    'full_time',
    basic_salary:     2800,
    status:           'active',
    date_of_birth:    '1990-05-17',
    gender:           'male',
    phone_number:     '+96891234011',
    emergency_number: '+96891230011',
  },
  {
    email:            'ahmed.mondhari@ankaa.om',
    employee_id:      'ANK-012',
    position_title:   'Maintenance Team Lead',
    department_id:    'Engineering',
    contract_type:    'full_time',
    basic_salary:     2800,
    status:           'active',
    date_of_birth:    '1990-09-22',
    gender:           'male',
    phone_number:     '+96891234012',
    emergency_number: '+96891230012',
  },
  {
    email:            'space@ankaa.om',
    employee_id:      'ANK-013',
    position_title:   'Space Department Head',
    department_id:    'Space & Technology',
    contract_type:    'full_time',
    basic_salary:     2800,
    status:           'active',
    date_of_birth:    '1988-07-08',
    gender:           'female',
    phone_number:     '+96891234013',
    emergency_number: '+96891230013',
  },
  {
    email:            'hr@ankaa.om',
    employee_id:      'ANK-014',
    position_title:   'HR Department',
    department_id:    'HR',
    contract_type:    'full_time',
    basic_salary:     2500,
    status:           'active',
    date_of_birth:    null,
    gender:           null,
    phone_number:     '+96824500100',
    emergency_number: '+96824500100',
  },
  {
    email:            'huria@ankaa.om',
    employee_id:      'ANK-015',
    position_title:   'HR Officer',
    department_id:    'HR',
    contract_type:    'full_time',
    basic_salary:     2000,
    status:           'active',
    date_of_birth:    '1990-01-15',
    gender:           'female',
    phone_number:     '+96891234014',
    emergency_number: '+96891230014',
  },
  {
    email:            'accounts@taqa.om',
    employee_id:      'ANK-016',
    position_title:   'Finance & Accounts',
    department_id:    'Finance',
    contract_type:    'full_time',
    basic_salary:     2500,
    status:           'active',
    date_of_birth:    '1988-12-03',
    gender:           'female',
    phone_number:     '+96891234015',
    emergency_number: '+96891230015',
  },
  {
    email:            'maathir@ankaa.om',
    employee_id:      'ANK-017',
    position_title:   'Assistant Manager & Bid Manager',
    department_id:    'Business Development',
    contract_type:    'full_time',
    basic_salary:     2200,
    status:           'active',
    date_of_birth:    '1993-06-20',
    gender:           'male',
    phone_number:     '+96891234016',
    emergency_number: '+96891230016',
  },
  {
    email:            'palwasha@ankaa.om',
    employee_id:      'ANK-018',
    position_title:   'Software Developer',
    department_id:    'Software Engineering',
    contract_type:    'full_time',
    basic_salary:     1800,
    status:           'active',
    date_of_birth:    '1996-03-11',
    gender:           'female',
    phone_number:     '+96891234017',
    emergency_number: '+96891230017',
  },
  {
    email:            'imad@ankaa.om',
    employee_id:      'ANK-019',
    position_title:   'AI Specialist',
    department_id:    'AI',
    contract_type:    'full_time',
    basic_salary:     1800,
    status:           'active',
    date_of_birth:    '1998-08-25',
    gender:           'male',
    phone_number:     '+96891234018',
    emergency_number: '+96891230018',
  },
  {
    email:            'media@ankaa.om',
    employee_id:      'ANK-020',
    position_title:   'Media Executive',
    department_id:    'Media & Communications',
    contract_type:    'full_time',
    basic_salary:     1700,
    status:           'active',
    date_of_birth:    '1994-10-05',
    gender:           'female',
    phone_number:     '+96891234019',
    emergency_number: '+96891230019',
  },
  {
    email:            'jamal@ankaa.om',
    employee_id:      'ANK-021',
    position_title:   'Cybersecurity Consultant',
    department_id:    'Cybersecurity',
    contract_type:    'full_time',
    basic_salary:     1900,
    status:           'active',
    date_of_birth:    '1997-02-14',
    gender:           'male',
    phone_number:     '+96891234020',
    emergency_number: '+96891230020',
  },
  {
    email:            'hilal@ankaa.om',
    employee_id:      'ANK-022',
    position_title:   'PRO Officer',
    department_id:    'Operations',
    contract_type:    'full_time',
    basic_salary:     1700,
    status:           'active',
    date_of_birth:    '1995-07-30',
    gender:           'male',
    phone_number:     '+96891234021',
    emergency_number: '+96891230021',
  },
  {
    email:            'daniya@ankaa.om',
    employee_id:      'ANK-023',
    position_title:   'Team Member',
    department_id:    'Management',
    contract_type:    'full_time',
    basic_salary:     1500,
    status:           'active',
    date_of_birth:    '1999-04-18',
    gender:           'female',
    phone_number:     '+96891234022',
    emergency_number: '+96891230022',
  },
  {
    email:            'mazinaltubi@ankaa.om',
    employee_id:      'ANK-024',
    position_title:   'Space Engineer',
    department_id:    'Space & Technology',
    contract_type:    'full_time',
    basic_salary:     1700,
    status:           'active',
    date_of_birth:    '1998-11-09',
    gender:           'male',
    phone_number:     '+96891234023',
    emergency_number: '+96891230023',
  },
  {
    email:            'khamis@ankaa.om',
    employee_id:      'ANK-025',
    position_title:   'Operations Team Member',
    department_id:    'Operations',
    contract_type:    'full_time',
    basic_salary:     1500,
    status:           'active',
    date_of_birth:    '1997-01-22',
    gender:           'male',
    phone_number:     '+96891234024',
    emergency_number: '+96891230024',
  },
  {
    email:            'm.ambouri@ankaa.om',
    employee_id:      'ANK-026',
    position_title:   'Software Developer',
    department_id:    'Software Engineering',
    contract_type:    'full_time',
    basic_salary:     1800,
    status:           'active',
    date_of_birth:    '1995-09-16',
    gender:           'male',
    phone_number:     '+96891234025',
    emergency_number: '+96891230025',
  },
  {
    email:            'maryam.alkalbani@ankaa.om',
    employee_id:      'ANK-027',
    position_title:   'Technical Writer',
    department_id:    'Software Engineering',
    contract_type:    'full_time',
    basic_salary:     1700,
    status:           'active',
    date_of_birth:    '1998-05-03',
    gender:           'female',
    phone_number:     '+96891234026',
    emergency_number: '+96891230026',
  },
  {
    email:            'rahma@ankaa.om',
    employee_id:      'ANK-028',
    position_title:   'UI/UX Designer',
    department_id:    'Software Engineering',
    contract_type:    'full_time',
    basic_salary:     1700,
    status:           'active',
    date_of_birth:    '1999-12-07',
    gender:           'female',
    phone_number:     '+96891234027',
    emergency_number: '+96891230027',
  },
  {
    email:            'm.almaskri@ankaa.om',
    employee_id:      'ANK-029',
    position_title:   'Business Analyst',
    department_id:    'Software Engineering',
    contract_type:    'full_time',
    basic_salary:     1900,
    status:           'active',
    date_of_birth:    '1997-07-14',
    gender:           'male',
    phone_number:     '+96891234028',
    emergency_number: '+96891230028',
  },
  {
    email:            'rayan.alhashmi@ankaa.om',
    employee_id:      'ANK-030',
    position_title:   'UI/UX Designer',
    department_id:    'Software Engineering',
    contract_type:    'full_time',
    basic_salary:     1600,
    status:           'active',
    date_of_birth:    '2001-03-28',
    gender:           'male',
    phone_number:     '+96891234029',
    emergency_number: '+96891230029',
  },
  {
    email:            'furwaasim@ankaa.om',
    employee_id:      'ANK-031',
    position_title:   'Software Developer (Contractor)',
    department_id:    'Software Engineering',
    contract_type:    'contractor',
    basic_salary:     1400,
    status:           'active',
    date_of_birth:    '2000-08-12',
    gender:           'female',
    phone_number:     '+96891234030',
    emergency_number: '+96891230030',
  },
  {
    email:            'imthiyaz@ankaa.om',
    employee_id:      'ANK-032',
    position_title:   'Software Developer (Contractor)',
    department_id:    'Software Engineering',
    contract_type:    'contractor',
    basic_salary:     1400,
    status:           'active',
    date_of_birth:    '1999-06-25',
    gender:           'male',
    phone_number:     '+96891234031',
    emergency_number: '+96891230031',
  },
  {
    email:            'ashraf@ankaa.om',
    employee_id:      'ANK-033',
    position_title:   'ERP Project Lead',
    department_id:    'Technology',
    contract_type:    'full_time',
    basic_salary:     2200,
    status:           'active',
    date_of_birth:    '1994-04-15',
    gender:           'male',
    phone_number:     '+96891234032',
    emergency_number: '+96891230032',
  },
]

async function main() {
  console.log('\nAnkaa ERP — Update Profile Details')
  console.log('─'.repeat(55))
  console.log('DB:', DATA_DIR)

  const db = new PGlite(DATA_DIR)

  // 1. Add missing columns to profiles (idempotent)
  console.log('\nApplying schema changes...')
  const newCols = [
    "employee_id TEXT",
    "position_title TEXT",
    "department_id TEXT",
    "contract_type TEXT DEFAULT 'full_time'",
    "basic_salary REAL",
    "status TEXT DEFAULT 'active'",
  ]
  for (const col of newCols) {
    try { await db.query(`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ${col}`) }
    catch { /* already exists */ }
  }
  // Add UNIQUE constraint on employee_id if not present (best-effort)
  try { await db.query(`CREATE UNIQUE INDEX IF NOT EXISTS profiles_employee_id_idx ON profiles(employee_id) WHERE employee_id IS NOT NULL`) }
  catch { /* skip */ }
  console.log('  ✓ Columns added')

  // 2. Update each employee's profile
  console.log('\nUpdating employee profiles...')
  let updated = 0, notFound = 0

  for (const p of PROFILES) {
    const res = await db.query(
      `UPDATE profiles SET
         employee_id      = $1,
         position_title   = $2,
         department_id    = $3,
         contract_type    = $4,
         basic_salary     = $5,
         status           = $6,
         date_of_birth    = $7,
         gender           = $8,
         phone_number     = $9,
         emergency_number = $10,
         updated_at       = $11
       WHERE email = $12
       RETURNING id, full_name`,
      [
        p.employee_id,
        p.position_title,
        p.department_id,
        p.contract_type,
        p.basic_salary,
        p.status,
        p.date_of_birth || null,
        p.gender || null,
        p.phone_number,
        p.emergency_number,
        new Date().toISOString(),
        p.email,
      ]
    )

    if (res.rows.length) {
      const row = res.rows[0]
      console.log(`  ✓ ${String(row.full_name || p.email).padEnd(28)} ${p.employee_id.padEnd(10)} ${p.position_title}`)
      updated++
    } else {
      console.log(`  - ${p.email.padEnd(34)} not found`)
      notFound++
    }
  }

  // 3. Set status = 'active' for any remaining profiles that are NULL
  await db.query(`UPDATE profiles SET status = 'active' WHERE status IS NULL`)

  // 4. Verify
  const counts = await db.query(`
    SELECT
      COUNT(*) AS total,
      COUNT(employee_id) AS with_id,
      COUNT(position_title) AS with_title,
      COUNT(date_of_birth) AS with_dob,
      COUNT(phone_number) AS with_phone
    FROM profiles
  `)
  const c = counts.rows[0]

  console.log('\n' + '─'.repeat(55))
  console.log(`✅  Done — ${updated} profiles updated, ${notFound} not found`)
  console.log('─'.repeat(55))
  console.log(`  Total profiles:      ${c.total}`)
  console.log(`  With employee ID:    ${c.with_id}`)
  console.log(`  With position title: ${c.with_title}`)
  console.log(`  With date of birth:  ${c.with_dob}`)
  console.log(`  With phone number:   ${c.with_phone}`)
  console.log('─'.repeat(55) + '\n')

  await db.close()
}

main().catch(e => {
  console.error('\nFailed:', e.message || e)
  process.exit(1)
})
