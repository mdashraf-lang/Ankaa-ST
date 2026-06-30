const path    = require('path')
const { randomUUID } = require('crypto')
const { PGlite } = require('@electric-sql/pglite')
const bcrypt  = require('bcryptjs')

const DATA_DIR = path.resolve(__dirname, '..', '.local-db').replace(/\\/g, '/')

;(async () => {
  console.log('DB path:', DATA_DIR)
  const db = new PGlite(DATA_DIR)

  const accounts = [
    { email: 'superadmin@ankaa.om', password: 'SuperAdmin@2026', full_name: 'Super Admin', role: 'admin', username: 'superadmin' },
    { email: 'admin@ankaa.om',      password: 'Admin@2026',       full_name: 'Admin',        role: 'admin',       username: 'admin'      },
  ]

  for (const a of accounts) {
    const hash = await bcrypt.hash(a.password, 10)

    // Try update first
    const upd = await db.query(
      'UPDATE profiles SET password_hash=$1, role=$2, full_name=$3 WHERE email=$4 RETURNING id',
      [hash, a.role, a.full_name, a.email]
    )

    if (upd.rows.length) {
      console.log('UPDATED  ' + a.email + '  role:' + a.role + '  pass:' + a.password)
    } else {
      await db.query(
        'INSERT INTO profiles (id, email, password_hash, full_name, role, username) VALUES ($1,$2,$3,$4,$5,$6)',
        [randomUUID(), a.email, hash, a.full_name, a.role, a.username]
      )
      console.log('CREATED  ' + a.email + '  role:' + a.role + '  pass:' + a.password)
    }
  }

  // Verify
  const { rows } = await db.query(
    "SELECT email, role FROM profiles ORDER BY role"
  )
  console.log('\nAll accounts in local DB:')
  rows.forEach(r => console.log('  ' + r.email.padEnd(32) + r.role))

  await db.close()
  console.log('\nDone. Restart the dev server and log in.')
})().catch(e => { console.error('Error:', e.message); process.exit(1) })
