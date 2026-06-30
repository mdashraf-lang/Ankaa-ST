/**
 * Ankaa ERP — Seed real company accounts (from backup source code)
 * All passwords set to: Ankaa@2026
 *
 * Run: node scripts/seed-real-users.js
 */
const path    = require('path')
const { randomUUID } = require('crypto')
const { PGlite } = require('@electric-sql/pglite')
const bcrypt  = require('bcryptjs')

const DATA_DIR = path.resolve(__dirname, '..', '.local-db').replace(/\\/g, '/')
const MOCK_PASSWORD = 'Ankaa@2026'

// ── Real Ankaa company accounts (extracted from backup source code) ─────────
// Org chart hierarchy: Khalid → Mohd (Mohammed Al Riyami) → Ali Ramimi / Ali Ghassani
//                      Khalid → Ikram → Sultan / HR
const REAL_USERS = [
  // ── C-Level / Top Management ────────────────────────────────────────────────
  {
    email:     'khalid@ankaa.om',
    full_name: 'Khalid',
    role:      'md',
    username:  'khalid',
    note:      'MD — top of org chart',
  },
  {
    email:     'mohd@ankaa.om',
    full_name: 'Mohammed Al Riyami',
    role:      'cto',
    username:  'mohd',
    note:      'Reports to Khalid — Ali Ghassani and Ali Ramimi report to him',
  },
  {
    email:     'ikram@ankaa.om',
    full_name: 'Ikram Al Balushi',
    role:      'coo',
    username:  'ikram',
    note:      'Reports to Khalid — Sultan and HR report to Ikram',
  },

  // ── Senior Managers / HODs ──────────────────────────────────────────────────
  {
    email:     'ali.r@ankaa.om',
    full_name: 'Ali Al Ramimi',
    role:      'admin',
    username:  'ali_ramimi',
    note:      'Senior Manager — leave approver level 2',
  },
  {
    email:     'ali@ankaa.om',
    full_name: 'Ali Al Ghassani',
    role:      'hod',
    username:  'ali_ghassani',
    note:      'Head of Department — leave approver level 1',
  },
  {
    email:     'sultan@ankaa.om',
    full_name: 'Sultan Al Balushi',
    role:      'hod',
    username:  'sultan',
    note:      'Team Head — reports to Ikram',
  },
  {
    email:     'yousuf@ankaa.om',
    full_name: 'Yousuf Al Riyami',
    role:      'hod',
    username:  'yousuf',
    note:      'Spray Team Leader',
  },
  {
    email:     'mekaeel@ankaa.om',
    full_name: 'Mekaeel Abdullah',
    role:      'hod',
    username:  'mekaeel',
    note:      'Project Director',
  },
  {
    email:     'omar@ankaa.om',
    full_name: 'Omar Al Ghaithy',
    role:      'hod',
    username:  'omar',
    note:      'Software Engineering Lead',
  },
  {
    email:     'fuhood@ankaa.om',
    full_name: 'Fuhood Al Haddabi',
    role:      'hod',
    username:  'fuhood',
    note:      'Team Lead — Smart Cities',
  },
  {
    email:     'ahmed.khalid@ankaa.om',
    full_name: 'Ahmed Al Kharusi',
    role:      'hod',
    username:  'ahmed_khalid',
    note:      'Head of Tech Lab',
  },
  {
    email:     'ahmed.mondhari@ankaa.om',
    full_name: 'Ahmed Al Mandhiri',
    role:      'hod',
    username:  'ahmed_mondhari',
    note:      'Team Lead — Maintenance',
  },
  {
    email:     'space@ankaa.om',
    full_name: 'Ghaydah Al Jabri',
    role:      'hod',
    username:  'ghaydah',
    note:      'Team Lead — Space Department',
  },

  // ── HR ───────────────────────────────────────────────────────────────────────
  {
    email:     'hr@ankaa.om',
    full_name: 'HR Department',
    role:      'hr',
    username:  'hr',
    note:      'HR — reports to Ikram',
  },
  {
    email:     'huria@ankaa.om',
    full_name: 'Huria',
    role:      'hr',
    username:  'huria',
    note:      'Admin / HR (system email)',
  },

  // ── Finance ──────────────────────────────────────────────────────────────────
  {
    email:     'accounts@taqa.om',
    full_name: 'Fateme Sohrabi',
    role:      'finance',
    username:  'fateme_taqa',
    note:      'Accounts — TAQA',
  },

  // ── Team Members ─────────────────────────────────────────────────────────────
  {
    email:     'maathir@ankaa.om',
    full_name: 'Maathir Al Wahaibi',
    role:      'team_member',
    username:  'maathir',
    note:      'Assistant Manager & Bid Manager — under Ali Ghassani',
  },
  {
    email:     'palwasha@ankaa.om',
    full_name: 'Palwasha Asif',
    role:      'team_member',
    username:  'palwasha',
    note:      'Software Developer — under Omar',
  },
  {
    email:     'imad@ankaa.om',
    full_name: 'Imad Al Ramimi',
    role:      'team_member',
    username:  'imad',
    note:      'AI — under Ali Ramimi',
  },
  {
    email:     'media@ankaa.om',
    full_name: 'Reham Al Ghanboosi',
    role:      'team_member',
    username:  'reham',
    note:      'Media Executive — under Ali Ramimi',
  },
  {
    email:     'jamal@ankaa.om',
    full_name: 'Jamal Al Raisi',
    role:      'team_member',
    username:  'jamal',
    note:      'Cybersecurity Consultant — under Ali Ghassani',
  },
  {
    email:     'hilal@ankaa.om',
    full_name: 'Hilal Al Riyami',
    role:      'team_member',
    username:  'hilal',
    note:      'PRO — under Sultan',
  },
  {
    email:     'daniya@ankaa.om',
    full_name: 'Daniya Al Shabibi',
    role:      'team_member',
    username:  'daniya',
    note:      'Under Ali Ramimi',
  },
  {
    email:     'mazinaltubi@ankaa.om',
    full_name: 'Mazin Al Toubi',
    role:      'team_member',
    username:  'mazin',
    note:      'Under Ghaydah Al Jabri',
  },
  {
    email:     'khamis@ankaa.om',
    full_name: 'Khamis',
    role:      'team_member',
    username:  'khamis',
    note:      'Team member',
  },
  {
    email:     'm.ambouri@ankaa.om',
    full_name: 'Mohammed Ambouri',
    role:      'team_member',
    username:  'm_ambouri',
    note:      'Under Omar',
  },

  // ── Collaborators ────────────────────────────────────────────────────────────
  {
    email:     'furwaasim@ankaa.om',
    full_name: 'Furwa Asim',
    role:      'collaborator',
    username:  'furwa',
    note:      'Collaborator — under Omar',
  },
  {
    email:     'imthiyaz@ankaa.om',
    full_name: 'Mohammad Imthiyaz',
    role:      'collaborator',
    username:  'imthiyaz',
    note:      'Collaborator — under Omar',
  },

  // NOTE: ashraf@ankaa.om is managed by seed-ashraf-roles.js with a specific
  // password. Do NOT include it here — this script would overwrite it with Ankaa@2026.
]

// Emails that seed-ashraf-roles.js owns — skip them here to avoid overwriting
const SKIP_EMAILS = new Set([
  'ashraf@ankaa.om',
  'mdashraf@ankaa.om',
  'mdashraf.intern@ankaa.om',
])

;(async () => {
  console.log('\nAnkaa ERP — Seeding Real Company Accounts')
  console.log('─'.repeat(55))
  console.log('DB:', DATA_DIR)
  console.log('Password for all:', MOCK_PASSWORD)
  console.log('─'.repeat(55))

  const db = new PGlite(DATA_DIR)

  // Pre-hash once, reuse (same cost, just different salts)
  const hash = await bcrypt.hash(MOCK_PASSWORD, 10)

  let created = 0, updated = 0, failed = 0

  for (const u of REAL_USERS) {
    if (SKIP_EMAILS.has(u.email)) {
      console.log(`  ⊘ ${u.email.padEnd(32)} skipped  (managed by seed-ashraf-roles.js)`)
      continue
    }
    try {
      const upd = await db.query(
        `UPDATE profiles
         SET password_hash=$1, role=$2, full_name=$3
         WHERE email=$4
         RETURNING id`,
        [hash, u.role, u.full_name, u.email]
      )

      if (upd.rows.length) {
        updated++
        console.log(`  ↻ ${u.email.padEnd(32)} ${u.role.padEnd(12)} ${u.note}`)
      } else {
        await db.query(
          `INSERT INTO profiles (id, email, password_hash, full_name, role, username)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [randomUUID(), u.email, hash, u.full_name, u.role, u.username]
        )
        created++
        console.log(`  ✓ ${u.email.padEnd(32)} ${u.role.padEnd(12)} ${u.note}`)
      }
    } catch (e) {
      failed++
      console.log(`  ✗ ${u.email.padEnd(32)} FAILED: ${e.message.split('\n')[0]}`)
    }
  }

  // Also ensure leave balances exist for all
  const { rows: allProfiles } = await db.query('SELECT id FROM profiles')
  for (const p of allProfiles) {
    await db.query(
      `INSERT INTO leave_balances (id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [randomUUID(), p.id]
    ).catch(() => {})
  }

  // Print summary
  console.log('\n' + '─'.repeat(55))
  console.log(`Created: ${created}  Updated: ${updated}  Failed: ${failed}`)
  console.log(`Total accounts: ${allProfiles.length}`)
  console.log('─'.repeat(55))

  // Verify — list all accounts by role
  const { rows } = await db.query(
    `SELECT email, full_name, role FROM profiles ORDER BY
       CASE role
         WHEN 'admin' THEN 1
         WHEN 'md' THEN 3 WHEN 'cto' THEN 4 WHEN 'coo' THEN 5
         WHEN 'hr' THEN 6 WHEN 'finance' THEN 7
         WHEN 'hod' THEN 8 WHEN 'team_member' THEN 9
         ELSE 10 END, email`
  )

  console.log('\n  Full Name                      Email                          Role')
  console.log('  ' + '─'.repeat(78))
  for (const r of rows) {
    console.log(
      '  ' +
      (r.full_name || '').padEnd(30) + ' ' +
      (r.email || '').padEnd(32) + ' ' +
      (r.role || '')
    )
  }

  console.log('\n  Password for ALL accounts:  Ankaa@2026')
  console.log('  Login at: http://localhost:3001/login')
  console.log('─'.repeat(55) + '\n')

  await db.close()
})().catch(e => { console.error('\nError:', e.message); process.exit(1) })
