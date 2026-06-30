/**
 * Ankaa ERP — Import real data from Supabase → PGlite
 *
 * Pulls every table from the live Supabase project and inserts it into the
 * local PGlite database. Run once when you have internet access.
 *
 * Usage:
 *   node scripts/import-from-supabase.js
 *
 * After this you can set USE_LOCAL_DB=true and work fully offline.
 */

const fs         = require('fs')
const path       = require('path')
const { randomUUID } = require('crypto')

// ── Load .env.local ──────────────────────────────────────────────────────────
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

const { createClient } = require('@supabase/supabase-js')
const { PGlite }       = require('@electric-sql/pglite')
const bcrypt           = require('bcryptjs')

const SUPABASE_URL      = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY
const DATA_DIR          = path.join(__dirname, '..', '.local-db')

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

// ── BYTEA columns (binary) — skip these, set to NULL locally ─────────────────
// (avatars, document uploads — not needed for offline dev)
const BYTEA_COLS = new Set([
  'avatar_url', 'invoice_receipt_path', 'bank_screenshot_path',
  'sick_document_url', 'sick_documents', 'document_file_url',
  'emergency_document_url',
])

// ── Tables to import, IN DEPENDENCY ORDER ────────────────────────────────────
const TABLES = [
  'profiles',
  'org_chart',
  'cost_centers',
  'leave_balances',
  'leave_requests',
  'invoices',
  'notifications',
  'projects',
  'project_members',
  'project_lists',
  'project_cards',
  'project_labels',
  'project_card_members',
  'project_checklists',
  'project_checklist_items',
  'project_card_activities',
  'todos',
  'roster_attendance',
  'user_task_access',
  'password_reset_tokens',
]

// Columns that only exist in Supabase schema (not in local PGlite schema) — skip
const SKIP_COLS_BY_TABLE = {
  invoices: ['invoice_receipt_path', 'bank_screenshot_path'],
  leave_requests: [
    'sick_document_url', 'sick_documents', 'document_file_url',
    'emergency_document_url', 'emergency_documents',
  ],
  profiles: ['avatar_url', 'website'],
}

// ── Sanitise a row for local insert ──────────────────────────────────────────
function sanitiseRow(table, row) {
  const out = {}
  const skipCols = new Set(SKIP_COLS_BY_TABLE[table] || [])

  for (const [k, v] of Object.entries(row)) {
    if (skipCols.has(k) || BYTEA_COLS.has(k)) { out[k] = null; continue }

    if (v === null || v === undefined) { out[k] = null; continue }

    // Supabase returns UUIDs as strings — fine for TEXT PK columns
    // Supabase returns JSONB as objects — stringify for local TEXT columns
    if (typeof v === 'object' && !Array.isArray(v)) {
      out[k] = JSON.stringify(v)
    } else if (Array.isArray(v)) {
      out[k] = JSON.stringify(v)
    } else {
      out[k] = v
    }
  }
  return out
}

// ── Insert rows into PGlite ───────────────────────────────────────────────────
async function insertRows(db, table, rows) {
  if (!rows || rows.length === 0) return 0

  let inserted = 0
  for (const rawRow of rows) {
    const row = sanitiseRow(table, rawRow)

    // Ensure every row has an id
    if (!row.id) row.id = randomUUID()

    const cols = Object.keys(row)
    if (cols.length === 0) continue

    const vals = cols.map(c => row[c])
    const ph   = vals.map((_, i) => `$${i + 1}`)

    try {
      await db.query(
        `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${ph.join(', ')})
         ON CONFLICT DO NOTHING`,
        vals
      )
      inserted++
    } catch (e) {
      // Silently skip rows that fail FK constraints (e.g. references to non-imported rows)
      const msg = String(e.message || e)
      if (!msg.includes('violates foreign key') && !msg.includes('constraint')) {
        console.warn(`  ⚠ ${table} row skip:`, msg.split('\n')[0].slice(0, 80))
      }
    }
  }
  return inserted
}

// ── Apply schema ──────────────────────────────────────────────────────────────
async function applySchema(db) {
  const sql = fs.readFileSync(path.join(__dirname, '..', 'lib', 'db', 'schema.sql'), 'utf8')
  const stmts = sql
    .split('\n')
    .reduce((acc, line) => {
      const t = line.trim()
      if (t.startsWith('--') || t === '') return acc
      const last = acc[acc.length - 1] || ''
      const next = last + (last ? '\n' : '') + line
      if (t.endsWith(';')) { acc.push(next); return [...acc.slice(0, -1), next] }
      // rebuild
      if (acc.length === 0) return [line]
      acc[acc.length - 1] = next
      return acc
    }, [''])
    .filter(s => s.trim().replace(/;$/, '').trim().length > 0)

  let ok = 0
  for (const stmt of sql.split(';').map(s => s.trim()).filter(Boolean)) {
    try { await db.query(stmt); ok++ } catch { /* already exists */ }
  }
  return ok
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\nAnkaa ERP — Import from Supabase → Local PGlite')
  console.log('─'.repeat(55))
  console.log('Supabase:', SUPABASE_URL)

  // ── Connect to Supabase ───────────────────────────────────────────────────
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  })

  // Quick connectivity check
  console.log('\nChecking Supabase connection...')
  const { count, error: connErr } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })

  if (connErr) {
    console.error('Cannot reach Supabase:', connErr.message)
    console.error('\nThis script requires internet access to Supabase.')
    console.error('If you are offline, use the mock data:')
    console.error('  node scripts/setup-local-db.js')
    process.exit(1)
  }
  console.log(`  ✓ Connected — ${count} user(s) found in profiles`)

  // ── Init PGlite ───────────────────────────────────────────────────────────
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
  const db = new PGlite(DATA_DIR.replace(/\\/g, '/'))

  console.log('\nApplying schema...')
  let stmtCount = 0
  const schema = fs.readFileSync(path.join(__dirname, '..', 'lib', 'db', 'schema.sql'), 'utf8')
  for (const stmt of schema.split(';').map(s => s.trim()).filter(s => s && !s.startsWith('--'))) {
    try { await db.query(stmt); stmtCount++ } catch { /* skip already-exists */ }
  }
  console.log(`  ✓ ${stmtCount} statements`)

  // ── Import each table ─────────────────────────────────────────────────────
  console.log('\nImporting tables from Supabase...')
  const summary = []

  for (const table of TABLES) {
    process.stdout.write(`  ${table.padEnd(35)}`)

    // Fetch all rows (paginate for large tables)
    let allRows = []
    let from    = 0
    const PAGE  = 1000
    let done    = false

    while (!done) {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .range(from, from + PAGE - 1)

      if (error) {
        console.log(`SKIP (${error.message.split('\n')[0]})`)
        done = true
        break
      }

      allRows = allRows.concat(data || [])
      if (!data || data.length < PAGE) done = true
      else from += PAGE
    }

    if (allRows.length === 0) {
      console.log('0 rows')
      summary.push({ table, fetched: 0, inserted: 0 })
      continue
    }

    const inserted = await insertRows(db, table, allRows)
    console.log(`${inserted} / ${allRows.length} rows`)
    summary.push({ table, fetched: allRows.length, inserted })
  }

  // ── Fix password_hash for any users where it came back garbled ────────────
  // The Supabase password_hash is a bcrypt string (TEXT) — verify it looks right
  console.log('\nVerifying password hashes...')
  const { rows: profRows } = await db.query(
    `SELECT id, email, password_hash FROM profiles LIMIT 100`
  )
  let hashOk = 0, hashBad = 0
  for (const p of profRows) {
    const h = p.password_hash
    if (typeof h === 'string' && h.startsWith('$2')) {
      hashOk++
    } else {
      hashBad++
      // Replace with a known temp password so the account can still be used
      const tempHash = await bcrypt.hash('Ankaa@2026', 10)
      await db.query(
        `UPDATE profiles SET password_hash = $1 WHERE id = $2`,
        [tempHash, p.id]
      )
    }
  }
  console.log(`  ✓ ${hashOk} valid bcrypt hashes`)
  if (hashBad > 0) {
    console.log(`  ⚠ ${hashBad} hashes were invalid — reset to Ankaa@2026`)
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  const total = summary.reduce((s, r) => s + r.inserted, 0)
  console.log('\n' + '─'.repeat(55))
  console.log(`✅  Import complete — ${total} rows loaded into local PGlite`)
  console.log('─'.repeat(55))

  // Print users
  const { rows: users } = await db.query(
    `SELECT email, full_name, role FROM profiles ORDER BY role LIMIT 30`
  )
  if (users.length > 0) {
    console.log('\nUser accounts now available locally:')
    console.log('  Email                              Role')
    console.log('  ─────────────────────────────────  ──────────────')
    for (const u of users) {
      console.log(`  ${(u.email || '').padEnd(35)} ${u.role || '—'}`)
    }
    console.log('\n  Password: use the real Ankaa password for your account')
    console.log('  (Accounts with invalid hashes were reset to: Ankaa@2026)\n')
  }

  console.log('  Start server: node node_modules\\next\\dist\\bin\\next dev --port 3001')
  console.log('  Login:        http://localhost:3001/login')
  console.log('─'.repeat(55) + '\n')

  await db.close()
}

main().catch(e => {
  console.error('\nImport failed:', e.message || e)
  process.exit(1)
})
