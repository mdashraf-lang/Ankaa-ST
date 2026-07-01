/**
 * Ankaa ERP — Local Database Setup
 * Run: node scripts/setup-local-db.js
 */
const fs   = require('fs')
const path = require('path')
const { randomUUID } = require('crypto')

// Load .env.local
const envPath = path.join(__dirname, '..', '.env.local')
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const t = line.trim()
    if (!t || t.startsWith('#')) return
    const eq = t.indexOf('=')
    if (eq === -1) return
    process.env[t.slice(0, eq).trim()] = t.slice(eq + 1).trim()
  })
}

const { PGlite } = require('@electric-sql/pglite')
const bcrypt     = require('bcryptjs')

const DATA_DIR = path.join(__dirname, '..', '.local-db')

// Split SQL into individual statements, skipping blank lines and comments
function splitSQL(sql) {
  const stmts = []
  let current = ''
  for (const line of sql.split('\n')) {
    const trimmed = line.trim()
    if (trimmed.startsWith('--') || trimmed === '') continue
    current += line + '\n'
    if (trimmed.endsWith(';')) {
      const stmt = current.trim().replace(/;$/, '').trim()
      if (stmt) stmts.push(stmt)
      current = ''
    }
  }
  if (current.trim()) stmts.push(current.trim())
  return stmts
}

async function runSchema(db) {
  const sql = fs.readFileSync(path.join(__dirname, '..', 'lib', 'db', 'schema.sql'), 'utf8')
  const stmts = splitSQL(sql)
  let ok = 0, skipped = 0
  for (const stmt of stmts) {
    try {
      await db.query(stmt)
      ok++
    } catch (e) {
      const msg = String(e.message || e)
      if (msg.includes('already exists') || msg.includes('duplicate')) {
        skipped++
      } else {
        console.warn('  ⚠', msg.split('\n')[0].slice(0, 80))
      }
    }
  }
  console.log(`  ✓ ${ok} statements applied, ${skipped} already existed`)
}

async function main() {
  console.log('\nAnkaa ERP — Local DB Setup')
  console.log('─'.repeat(50))

  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
  // Forward slashes — PGlite Node.js accepts plain paths (no file:// prefix)
  const db = new PGlite(DATA_DIR.replace(/\\/g, '/'))
  console.log('Database path:', DATA_DIR)

  // Check if gen_random_uuid() works in this PGlite version
  let useJsUUID = false
  try {
    await db.query("SELECT gen_random_uuid()")
  } catch {
    useJsUUID = true
    console.log('  Note: Using JavaScript UUIDs (gen_random_uuid not available)')
  }

  // Apply schema
  console.log('\nApplying schema...')
  await runSchema(db)

  // Tables that use joined_at instead of created_at
  const NO_CREATED_AT = new Set(['project_members', 'project_card_members', 'user_task_access', 'user_activity_sessions'])

  // Helper: insert and return row
  async function insert(table, data) {
    if (!data.id) data.id = randomUUID()
    if (!NO_CREATED_AT.has(table) && !data.created_at) data.created_at = new Date().toISOString()
    const cols = Object.keys(data)
    const vals = Object.values(data)
    const ph   = vals.map((_, i) => `$${i + 1}`)
    const res  = await db.query(
      `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${ph.join(', ')})
       ON CONFLICT DO NOTHING RETURNING *`,
      vals
    )
    return res.rows?.[0] ?? null
  }

  // Seed users
  console.log('\nSeeding users...')
  const users = [
    { email: 'admin@ankaa.om',     password: 'Ankaa@2026', full_name: 'Admin User',        role: 'admin',       username: 'admin'    },
    { email: 'ceo@ankaa.om',       password: 'Ankaa@2026', full_name: 'CEO',                role: 'ceo',         username: 'ceo'      },
    { email: 'hr@ankaa.om',        password: 'Ankaa@2026', full_name: 'HR Manager',         role: 'hr',          username: 'hr'       },
    { email: 'finance@ankaa.om',   password: 'Ankaa@2026', full_name: 'Finance Manager',    role: 'finance',     username: 'finance'  },
    { email: 'hod@ankaa.om',       password: 'Ankaa@2026', full_name: 'Head of Department', role: 'hod',         username: 'hod'      },
    { email: 'employee@ankaa.om',  password: 'Ankaa@2026', full_name: 'Team Member',        role: 'team_member', username: 'employee' },
  ]

  const createdUsers = []
  for (const u of users) {
    const hash = await bcrypt.hash(u.password, 10)
    // Try update first (if exists), then insert
    const upd = await db.query(
      `UPDATE profiles SET password_hash=$1, role=$2, full_name=$3 WHERE email=$4 RETURNING id`,
      [hash, u.role, u.full_name, u.email]
    )
    if (upd.rows.length) {
      console.log(`  ↻ ${u.email.padEnd(28)} updated  (${u.role})`)
      createdUsers.push({ id: upd.rows[0].id, email: u.email, role: u.role })
    } else {
      const row = await insert('profiles', {
        email: u.email, password_hash: hash,
        full_name: u.full_name, role: u.role, username: u.username,
      })
      if (row) {
        console.log(`  ✓ ${u.email.padEnd(28)} created  (${u.role})`)
        createdUsers.push({ id: row.id, email: u.email, role: u.role })
      } else {
        console.log(`  - ${u.email.padEnd(28)} skipped`)
        // Fetch existing
        const ex = await db.query('SELECT id FROM profiles WHERE email=$1', [u.email])
        if (ex.rows[0]) createdUsers.push({ id: ex.rows[0].id, email: u.email, role: u.role })
      }
    }
  }

  // Leave balances
  console.log('\nCreating leave balances...')
  let lb = 0
  for (const u of createdUsers) {
    try {
      await insert('leave_balances', { user_id: u.id })
      lb++
    } catch { /* already exists */ }
  }
  console.log(`  ✓ ${lb} created`)

  // Cost centers
  console.log('\nSeeding cost centers...')
  const centers = [
    { name: 'Operations', code: 'OPS' },
    { name: 'Engineering', code: 'ENG' },
    { name: 'HR & Admin',  code: 'HRA' },
    { name: 'Finance',     code: 'FIN' },
    { name: 'IT',          code: 'ITE' },
    { name: 'Projects',    code: 'PRJ' },
  ]
  let cc = 0
  for (const c of centers) {
    const row = await insert('cost_centers', { name: c.name, code: c.code, active: 1 })
    if (row) cc++
  }
  console.log(`  ✓ ${cc} created`)

  // Org chart stub
  console.log('\nCreating org chart stub...')
  const ceo = createdUsers.find(u => u.role === 'ceo')
  const hr  = createdUsers.find(u => u.role === 'hr')
  if (ceo) {
    try {
      await db.query(
        `INSERT INTO org_chart (id, title, user_id, parent_id, "order", is_c_level)
         VALUES ($1, $2, $3, NULL, 0, 1) ON CONFLICT (id) DO NOTHING`,
        ['root', 'CEO', ceo.id]
      )
      if (hr) {
        await db.query(
          `INSERT INTO org_chart (id, title, user_id, parent_id, "order", is_head_of_department)
           VALUES ($1, $2, $3, 'root', 1, 1) ON CONFLICT (id) DO NOTHING`,
          ['hr-node', 'HR Manager', hr.id]
        )
      }
      console.log('  ✓ Org chart seeded')
    } catch (e) {
      console.log('  - Org chart already exists')
    }
  }

  // Verify
  const counts = await db.query(`
    SELECT 'profiles' AS t, COUNT(*) AS n FROM profiles
    UNION ALL SELECT 'cost_centers', COUNT(*) FROM cost_centers
    UNION ALL SELECT 'projects',     COUNT(*) FROM projects
  `)
  console.log('\nDB counts:', counts.rows.map(r => `${r.t}:${r.n}`).join('  '))

  await db.close()

  // ── Print login table ──────────────────────────────────────────────────────
  console.log('\n' + '─'.repeat(50))
  console.log('✅  Local database ready — zero internet required')
  console.log('─'.repeat(50))
  console.log('\n  All accounts use password:  Ankaa@2026\n')
  console.log('  Email                         Role')
  console.log('  ─────────────────────────     ─────────────')
  console.log('  admin@ankaa.om                admin       ← use this first')
  console.log('  ceo@ankaa.om                  ceo')
  console.log('  hr@ankaa.om                   hr')
  console.log('  finance@ankaa.om              finance')
  console.log('  hod@ankaa.om                  hod')
  console.log('  employee@ankaa.om             team_member')
  console.log('\n  Start the server:')
  console.log('  node node_modules\\next\\dist\\bin\\next dev --port 3001')
  console.log('\n  Open: http://localhost:3001/login')
  console.log('─'.repeat(50) + '\n')
}

main().catch(e => {
  console.error('\nSetup failed:', e.message || e)
  process.exit(1)
})
