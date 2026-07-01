/**
 * One-time script: wipe ALL boards from the local DB.
 * Run: node scripts/clear-boards.js
 */
const fs   = require('fs')
const path = require('path')

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
const DATA_DIR = path.join(__dirname, '..', '.local-db')

async function main() {
  if (!fs.existsSync(DATA_DIR)) {
    console.log('No local DB found — nothing to clear.')
    return
  }

  const db = new PGlite(DATA_DIR.replace(/\\/g, '/'))

  console.log('\nClearing all boards...')
  const tables = [
    'project_card_members',
    'project_card_activities',
    'project_card_attachments',
    'project_checklist_items',
    'project_checklists',
    'project_cards',
    'project_labels',
    'project_lists',
    'project_members',
    'projects',
  ]

  for (const table of tables) {
    try {
      const res = await db.query(`DELETE FROM ${table}`)
      console.log(`  ✓ ${table}`)
    } catch (e) {
      console.log(`  ⚠ ${table}: ${e.message?.split('\n')[0]}`)
    }
  }

  const { rows } = await db.query('SELECT COUNT(*) AS n FROM projects')
  console.log(`\nBoards remaining: ${rows[0].n}`)
  console.log('Done — all boards cleared. Employees can now create their own.\n')

  await db.close()
}

main().catch(e => {
  console.error('Failed:', e.message || e)
  process.exit(1)
})
