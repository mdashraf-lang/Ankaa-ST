/**
 * Ankaa ERP — Create or list users
 * Run: node scripts/create-test-user.js
 */

// Load .env.local manually (no dotenv dependency)
const fs = require('fs')
const path = require('path')
const envPath = path.join(__dirname, '..', '.env.local')
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const [key, ...rest] = line.split('=')
    if (key && rest.length) process.env[key.trim()] = rest.join('=').trim()
  })
}

const { createClient } = require('@supabase/supabase-js')
const bcrypt = require('bcryptjs')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
)

async function listUsers() {
  console.log('\n── Existing users in Supabase ──────────────────')
  const { data, error } = await supabase
    .from('profiles')
    .select('email, full_name, role')
    .order('role')

  if (error) {
    console.error('Error fetching users:', error.message)
    return
  }

  if (!data || data.length === 0) {
    console.log('No users found.')
    return
  }

  data.forEach(u => {
    console.log(`  ${u.email.padEnd(35)} role: ${u.role?.padEnd(15)} name: ${u.full_name || '—'}`)
  })
  console.log(`\nTotal: ${data.length} user(s)`)
}

async function createTestAdmin() {
  const email    = 'admin@ankaa.om'
  const password = 'Ankaa@2026'
  const fullName = 'Test Admin'
  const role     = 'admin'

  console.log('\n── Creating test admin user ─────────────────────')
  console.log(`  Email    : ${email}`)
  console.log(`  Password : ${password}`)
  console.log(`  Role     : ${role}`)

  // Check if already exists
  const { data: existing } = await supabase
    .from('profiles')
    .select('id, email')
    .eq('email', email)
    .single()

  if (existing) {
    console.log('\n  User already exists — updating password...')
    const hash = await bcrypt.hash(password, 10)
    const { error } = await supabase
      .from('profiles')
      .update({ password_hash: hash, role, full_name: fullName })
      .eq('email', email)
    if (error) console.error('  Update failed:', error.message)
    else console.log('  Password updated. You can now log in.')
    return
  }

  const hash = await bcrypt.hash(password, 10)
  const { error } = await supabase.from('profiles').insert({
    email,
    password_hash: hash,
    full_name: fullName,
    role,
    username: 'testadmin',
  })

  if (error) console.error('  Create failed:', error.message)
  else console.log('  Test admin created successfully.')
}

async function main() {
  console.log('Ankaa ERP — User Setup')
  console.log('Supabase:', process.env.NEXT_PUBLIC_SUPABASE_URL)

  await listUsers()
  await createTestAdmin()

  console.log('\n── Login credentials ────────────────────────────')
  console.log('  URL      : http://localhost:3001/login')
  console.log('  Email    : admin@ankaa.om')
  console.log('  Password : Ankaa@2026')
  console.log('─────────────────────────────────────────────────\n')
}

main().catch(console.error)
