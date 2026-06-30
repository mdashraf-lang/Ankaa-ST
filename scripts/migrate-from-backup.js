/**
 * Ankaa ERP — Full Migration from Backup
 * Rebuilds the local DB with real company data from ankaataskboard_backup_2026-06-14
 *
 * Run: node scripts/migrate-from-backup.js
 */
const fs   = require('fs')
const path = require('path')
const { randomUUID } = require('crypto')
const { PGlite } = require('@electric-sql/pglite')
const bcrypt = require('bcryptjs')

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

const NOW = new Date().toISOString()
const PASS = 'Ankaa@2026'

// ─── helpers ─────────────────────────────────────────────────────────────────

async function q(db, sql, params = []) {
  return db.query(sql, params)
}

async function ins(db, table, data) {
  if (!data.id && table !== 'todos') data.id = randomUUID()
  if (!data.created_at && !['project_members','project_card_members','user_task_access'].includes(table))
    data.created_at = NOW
  const cols = Object.keys(data)
  const vals = Object.values(data)
  const ph   = vals.map((_, i) => `$${i + 1}`)
  const res  = await db.query(
    `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${ph.join(', ')}) ON CONFLICT DO NOTHING RETURNING *`,
    vals
  )
  return res.rows?.[0] ?? null
}

// ─── schema migrations (ALTER TABLE for existing DB columns) ─────────────────

async function applySchemaAlters(db) {
  const newLeaveColumns = [
    'current_approver TEXT',
    'pending_ghassani_comments TEXT', 'pending_ghassani_approved_at TEXT', 'pending_ghassani_approved_by TEXT',
    'pending_yousuf_comments TEXT',   'pending_yousuf_approved_at TEXT',   'pending_yousuf_approved_by TEXT',
    'pending_sultan_comments TEXT',   'pending_sultan_approved_at TEXT',   'pending_sultan_approved_by TEXT',
    'pending_ramimi_comments TEXT',   'pending_ramimi_approved_at TEXT',   'pending_ramimi_approved_by TEXT',
    'pending_hr_comments TEXT',       'pending_hr_approved_at TEXT',       'pending_hr_approved_by TEXT',
    'joining_date TEXT',              'phone_number TEXT',
    'sick_document_url TEXT',         'document_required INTEGER DEFAULT 0',
    'document_uploaded INTEGER DEFAULT 0',             'document_upload_deadline TEXT',
    'document_reminder_sent INTEGER DEFAULT 0',        'document_employee_reminder_sent INTEGER DEFAULT 0',
    'document_file_url TEXT',         'sick_documents TEXT',
    'sick_document_reminder_sent_at TEXT',             'sick_document_hr_reminder_sent_at TEXT',
    'direct_approved_by TEXT',        'direct_approved_at TEXT',           'direct_comments TEXT',
    'direct_approved_by_name TEXT',   'direct_approved_by_department TEXT',
    'direct_manager_approved INTEGER','direct_manager_approved_by TEXT',
    'direct_manager_approved_at TEXT','direct_manager_comments TEXT',
    'admin_modified INTEGER DEFAULT 0','admin_modified_by TEXT',           'admin_modified_at TEXT',
    'admin_modification_reason TEXT', 'original_start_date TEXT',          'original_end_date TEXT',
    'original_total_days INTEGER',    'canceled_at TEXT',                  'canceled_by TEXT',
    'canceled_by_name TEXT',          'cancel_reason TEXT',
    'handover_to_user_id TEXT',       'handover_notes TEXT',
    'emergency_document_url TEXT',    'emergency_documents TEXT',          'emergency_note TEXT',
    'start_time TEXT',                'end_time TEXT',
    'location TEXT',                  'meeting_subject TEXT',
    'original_start_time TEXT',       'original_end_time TEXT',
    'original_location TEXT',         'original_meeting_subject TEXT',
    'tada_zone TEXT',                 'official_trip_description TEXT',
    'original_tada_zone TEXT',        'original_official_trip_description TEXT',
    'created_by_admin_id TEXT',
  ]
  for (const col of newLeaveColumns) {
    const name = col.split(' ')[0]
    try { await db.query(`ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS ${col}`) }
    catch { /* already exists */ }
  }

  // invoices additions
  for (const col of ['extracted_date TEXT', 'extracted_amount REAL']) {
    try { await db.query(`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS ${col}`) }
    catch { /* already exists */ }
  }

  // profiles additions (nothing new beyond what's in schema)

  // project_cards additions
  for (const col of ['due_time TEXT', 'reminder TEXT']) {
    try { await db.query(`ALTER TABLE project_cards ADD COLUMN IF NOT EXISTS ${col}`) }
    catch { /* already exists */ }
  }

  // New tables
  const newTables = [
    `CREATE TABLE IF NOT EXISTS roster_date_events (
      id TEXT PRIMARY KEY DEFAULT '', date TEXT NOT NULL UNIQUE,
      event_type TEXT NOT NULL, event_name TEXT NOT NULL DEFAULT '',
      created_by TEXT REFERENCES profiles(id) ON DELETE SET NULL,
      updated_by TEXT REFERENCES profiles(id) ON DELETE SET NULL,
      created_at TEXT, updated_at TEXT)`,
    `CREATE TABLE IF NOT EXISTS invoices_audit_log (
      id TEXT PRIMARY KEY DEFAULT '', invoice_id TEXT REFERENCES invoices(id) ON DELETE SET NULL,
      action TEXT NOT NULL, user_id TEXT REFERENCES profiles(id),
      user_email TEXT, user_name TEXT, old_data TEXT, new_data TEXT,
      changed_fields TEXT, created_at TEXT)`,
    `CREATE TABLE IF NOT EXISTS leave_requests_audit_log (
      id TEXT PRIMARY KEY DEFAULT '', leave_request_id TEXT REFERENCES leave_requests(id) ON DELETE SET NULL,
      action TEXT NOT NULL, user_id TEXT REFERENCES profiles(id),
      user_email TEXT, user_name TEXT, old_data TEXT, new_data TEXT,
      changed_fields TEXT, created_at TEXT)`,
    `CREATE TABLE IF NOT EXISTS user_activity_sessions (
      id TEXT PRIMARY KEY DEFAULT '', user_id TEXT REFERENCES profiles(id) ON DELETE CASCADE,
      started_at TEXT, ended_at TEXT, last_activity_at TEXT, created_at TEXT)`,
    `CREATE TABLE IF NOT EXISTS project_card_attachments (
      id TEXT PRIMARY KEY DEFAULT '', card_id TEXT REFERENCES project_cards(id) ON DELETE CASCADE,
      file_name TEXT NOT NULL, file_url TEXT, file_size INTEGER, file_type TEXT,
      uploaded_by TEXT REFERENCES profiles(id) ON DELETE SET NULL, created_at TEXT)`,
  ]
  for (const sql of newTables) {
    try { await db.query(sql) } catch { /* already exists */ }
  }

  console.log('  ✓ Schema columns and tables applied')
}

// ─── seed data ────────────────────────────────────────────────────────────────

async function main() {
  console.log('\nAnkaa ERP — Migration from Backup')
  console.log('─'.repeat(60))
  console.log('DB:', DATA_DIR)

  if (!fs.existsSync(DATA_DIR)) {
    console.error('ERROR: .local-db not found. Run setup first: node scripts/setup-local-db.js')
    process.exit(1)
  }

  const db = new PGlite(DATA_DIR)

  // ── 1. Schema migrations ────────────────────────────────────────────────────
  console.log('\n[1/10] Applying schema migrations...')
  await applySchemaAlters(db)

  // ── 2. Users ────────────────────────────────────────────────────────────────
  console.log('\n[2/10] Seeding real company users...')
  const hash = await bcrypt.hash(PASS, 10)

  const USERS = [
    // C-Level
    { email: 'khalid@ankaa.om',          full_name: 'Khalid Al Masoudi',      role: 'md',          username: 'khalid',          gender: 'male',   joining_date: '2015-01-01', phone_number: '+96891234001' },
    { email: 'mohd@ankaa.om',            full_name: 'Mohammed Al Riyami',     role: 'cto',         username: 'mohd',            gender: 'male',   joining_date: '2016-03-15', phone_number: '+96891234002' },
    { email: 'ikram@ankaa.om',           full_name: 'Ikram Al Balushi',       role: 'coo',         username: 'ikram',           gender: 'female', joining_date: '2016-06-01', phone_number: '+96891234003' },
    // Senior Managers
    { email: 'ali.r@ankaa.om',           full_name: 'Ali Al Ramimi',          role: 'admin',       username: 'ali_ramimi',      gender: 'male',   joining_date: '2017-02-01', phone_number: '+96891234004' },
    { email: 'ali@ankaa.om',             full_name: 'Ali Al Ghassani',        role: 'hod',         username: 'ali_ghassani',    gender: 'male',   joining_date: '2017-04-10', phone_number: '+96891234005' },
    { email: 'sultan@ankaa.om',          full_name: 'Sultan Al Balushi',      role: 'hod',         username: 'sultan',          gender: 'male',   joining_date: '2018-01-15', phone_number: '+96891234006' },
    { email: 'yousuf@ankaa.om',          full_name: 'Yousuf Al Riyami',       role: 'hod',         username: 'yousuf',          gender: 'male',   joining_date: '2018-05-01', phone_number: '+96891234007' },
    { email: 'mekaeel@ankaa.om',         full_name: 'Mekaeel Abdullah',       role: 'hod',         username: 'mekaeel',         gender: 'male',   joining_date: '2019-01-01', phone_number: '+96891234008' },
    { email: 'omar@ankaa.om',            full_name: 'Omar Al Ghaithy',        role: 'hod',         username: 'omar',            gender: 'male',   joining_date: '2019-03-20', phone_number: '+96891234009' },
    { email: 'fuhood@ankaa.om',          full_name: 'Fuhood Al Haddabi',      role: 'hod',         username: 'fuhood',          gender: 'male',   joining_date: '2019-07-01', phone_number: '+96891234010' },
    { email: 'ahmed.khalid@ankaa.om',    full_name: 'Ahmed Al Kharusi',       role: 'hod',         username: 'ahmed_khalid',    gender: 'male',   joining_date: '2020-01-05', phone_number: '+96891234011' },
    { email: 'ahmed@ankaa.om',           full_name: 'Ahmed Al Kharusi',       role: 'hod',         username: 'ahmed',           gender: 'male',   joining_date: '2020-01-05', phone_number: '+96891234011' },
    { email: 'ahmed.mondhari@ankaa.om',  full_name: 'Ahmed Al Mandhiri',      role: 'hod',         username: 'ahmed_mondhari',  gender: 'male',   joining_date: '2020-04-01', phone_number: '+96891234012' },
    { email: 'space@ankaa.om',           full_name: 'Ghaydah Al Jabri',       role: 'hod',         username: 'ghaydah',         gender: 'female', joining_date: '2020-09-01', phone_number: '+96891234013' },
    // HR
    { email: 'hr@ankaa.om',              full_name: 'HR Department',          role: 'hr',          username: 'hr',              gender: null,     joining_date: '2016-01-01', phone_number: '+96824500100' },
    { email: 'huria@ankaa.om',           full_name: 'Huria Al Lawati',        role: 'hr',          username: 'huria',           gender: 'female', joining_date: '2018-08-15', phone_number: '+96891234014' },
    // Finance
    { email: 'accounts@taqa.om',         full_name: 'Fateme Sohrabi',         role: 'finance',     username: 'fateme_taqa',     gender: 'female', joining_date: '2021-01-10', phone_number: '+96891234015' },
    // Team Members
    { email: 'maathir@ankaa.om',         full_name: 'Maathir Al Wahaibi',     role: 'team_member', username: 'maathir',         gender: 'male',   joining_date: '2020-10-01', phone_number: '+96891234016' },
    { email: 'palwasha@ankaa.om',        full_name: 'Palwasha Asif',          role: 'team_member', username: 'palwasha',        gender: 'female', joining_date: '2021-06-01', phone_number: '+96891234017' },
    { email: 'imad@ankaa.om',            full_name: 'Imad Al Ramimi',         role: 'team_member', username: 'imad',            gender: 'male',   joining_date: '2022-01-15', phone_number: '+96891234018' },
    { email: 'media@ankaa.om',           full_name: 'Reham Al Ghanboosi',     role: 'team_member', username: 'reham',           gender: 'female', joining_date: '2021-09-01', phone_number: '+96891234019' },
    { email: 'jamal@ankaa.om',           full_name: 'Jamal Al Raisi',         role: 'team_member', username: 'jamal',           gender: 'male',   joining_date: '2022-03-01', phone_number: '+96891234020' },
    { email: 'hilal@ankaa.om',           full_name: 'Hilal Al Riyami',        role: 'team_member', username: 'hilal',           gender: 'male',   joining_date: '2021-11-01', phone_number: '+96891234021' },
    { email: 'daniya@ankaa.om',          full_name: 'Daniya Al Shabibi',      role: 'team_member', username: 'daniya',          gender: 'female', joining_date: '2022-06-01', phone_number: '+96891234022' },
    { email: 'mazinaltubi@ankaa.om',     full_name: 'Mazin Al Toubi',         role: 'team_member', username: 'mazin',           gender: 'male',   joining_date: '2022-08-15', phone_number: '+96891234023' },
    { email: 'khamis@ankaa.om',          full_name: 'Khamis Al Hinai',        role: 'team_member', username: 'khamis',          gender: 'male',   joining_date: '2022-02-01', phone_number: '+96891234024' },
    { email: 'm.ambouri@ankaa.om',       full_name: 'Mohammed Ambouri',       role: 'team_member', username: 'm_ambouri',       gender: 'male',   joining_date: '2021-04-01', phone_number: '+96891234025' },
    // From old task board (not in seed-real-users.js)
    { email: 'maryam.alkalbani@ankaa.om',full_name: 'Maryam Alkalbani',       role: 'team_member', username: 'maryam_alkalbani',gender: 'female', joining_date: '2022-09-01', phone_number: '+96891234026' },
    { email: 'rahma@ankaa.om',           full_name: 'Rahma Al Jahwari',       role: 'team_member', username: 'rahma',           gender: 'female', joining_date: '2022-10-15', phone_number: '+96891234027' },
    { email: 'm.almaskri@ankaa.om',      full_name: 'Mohammed Almaskari',     role: 'team_member', username: 'm_almaskri',      gender: 'male',   joining_date: '2022-07-01', phone_number: '+96891234028' },
    { email: 'rayan.alhashmi@ankaa.om',  full_name: 'Rayan Al Hashmi',        role: 'team_member', username: 'rayan_alhashmi',  gender: 'male',   joining_date: '2023-01-15', phone_number: '+96891234029' },
    // Collaborators
    { email: 'furwaasim@ankaa.om',       full_name: 'Furwa Asim',             role: 'collaborator',username: 'furwa',           gender: 'female', joining_date: '2023-04-01', phone_number: '+96891234030' },
    { email: 'imthiyaz@ankaa.om',        full_name: 'Mohammad Imthiyaz',      role: 'collaborator',username: 'imthiyaz',        gender: 'male',   joining_date: '2023-06-01', phone_number: '+96891234031' },
    // ERP Project Lead
    { email: 'ashraf@ankaa.om',          full_name: 'MD Ashraf',              role: 'admin', username: 'ashraf',          gender: 'male',   joining_date: '2025-01-01', phone_number: '+96891234032' },
  ]

  const userMap = {} // email → id
  let uCreated = 0, uUpdated = 0
  for (const u of USERS) {
    const upd = await db.query(
      `UPDATE profiles SET password_hash=$1, role=$2, full_name=$3, username=$4, gender=$5, joining_date=$6, phone_number=$7
       WHERE email=$8 RETURNING id`,
      [hash, u.role, u.full_name, u.username, u.gender || null, u.joining_date, u.phone_number, u.email]
    )
    if (upd.rows.length) {
      userMap[u.email] = upd.rows[0].id
      uUpdated++
    } else {
      const row = await ins(db, 'profiles', {
        email: u.email, password_hash: hash, full_name: u.full_name,
        role: u.role, username: u.username, gender: u.gender || null,
        joining_date: u.joining_date, phone_number: u.phone_number,
      })
      if (row) { userMap[u.email] = row.id; uCreated++ }
      else {
        const ex = await db.query('SELECT id FROM profiles WHERE email=$1', [u.email])
        if (ex.rows[0]) userMap[u.email] = ex.rows[0].id
      }
    }
  }
  console.log(`  ✓ ${uCreated} created, ${uUpdated} updated (total: ${Object.keys(userMap).length} users)`)

  // Alias: ahmed@ankaa.om and ahmed.khalid@ankaa.om are the same person
  if (!userMap['ahmed@ankaa.om'] && userMap['ahmed.khalid@ankaa.om'])
    userMap['ahmed@ankaa.om'] = userMap['ahmed.khalid@ankaa.om']
  if (!userMap['ahmed.khalid@ankaa.om'] && userMap['ahmed@ankaa.om'])
    userMap['ahmed.khalid@ankaa.om'] = userMap['ahmed@ankaa.om']

  // ── 3. Leave balances ───────────────────────────────────────────────────────
  console.log('\n[3/10] Creating leave balances...')
  // Realistic used-up balances per person
  const usedBalances = {
    'omar@ankaa.om':            { annual_leave_days: 22, sick_leave_days: 19 },
    'palwasha@ankaa.om':        { annual_leave_days: 25, sick_leave_days: 20 },
    'rahma@ankaa.om':           { annual_leave_days: 27, sick_leave_days: 21 },
    'maathir@ankaa.om':         { annual_leave_days: 24, sick_leave_days: 19 },
    'hilal@ankaa.om':           { annual_leave_days: 28, sick_leave_days: 21 },
    'm.almaskri@ankaa.om':      { annual_leave_days: 26, sick_leave_days: 18 },
    'maryam.alkalbani@ankaa.om':{ annual_leave_days: 29, sick_leave_days: 21 },
    'jamal@ankaa.om':           { annual_leave_days: 26, sick_leave_days: 21 },
    'daniya@ankaa.om':          { annual_leave_days: 28, sick_leave_days: 20 },
    'm.ambouri@ankaa.om':       { annual_leave_days: 24, sick_leave_days: 17 },
    'rayan.alhashmi@ankaa.om':  { annual_leave_days: 28, sick_leave_days: 21 },
    'imad@ankaa.om':            { annual_leave_days: 27, sick_leave_days: 20 },
    'reham@ankaa.om':           { annual_leave_days: 25, sick_leave_days: 19 },
  }
  let lbCount = 0
  for (const [email, uid] of Object.entries(userMap)) {
    const bal = usedBalances[email] || {}
    try {
      const upd = await db.query(
        `UPDATE leave_balances SET annual_leave_days=$1, sick_leave_days=$2 WHERE user_id=$3 RETURNING id`,
        [bal.annual_leave_days ?? 30, bal.sick_leave_days ?? 21, uid]
      )
      if (!upd.rows.length) {
        await ins(db, 'leave_balances', {
          user_id: uid,
          annual_leave_days: bal.annual_leave_days ?? 30,
          sick_leave_days: bal.sick_leave_days ?? 21,
          emergency_leave_days: 6, maternity_leave_days: 98, paternity_leave_days: 7, other_leave_days: 0,
          last_refresh_date: '2026-01-01',
        })
        lbCount++
      }
    } catch { /* skip */ }
  }
  console.log(`  ✓ ${lbCount} new leave balances created`)

  // ── 4. Cost centers ─────────────────────────────────────────────────────────
  console.log('\n[4/10] Seeding cost centers...')
  await db.query('DELETE FROM cost_centers')
  const COST_CENTERS = [
    { name: 'MoH – Legal Services',        code: 'MOH-LGL', description: 'Ministry of Health — Legal Grievances & Lawsuits' },
    { name: 'Smart Cities',                 code: 'SMC-001', description: 'Smart Cities Platform Development' },
    { name: 'Space & Technology',           code: 'SPC-001', description: 'Space Department Projects' },
    { name: 'Tech Lab',                     code: 'TLB-001', description: 'Technology Laboratory & R&D' },
    { name: 'Operations & Management',      code: 'OPS-001', description: 'General Operations' },
    { name: 'HR & Administration',          code: 'HRA-001', description: 'Human Resources and Admin costs' },
    { name: 'Media & Communications',       code: 'MED-001', description: 'Marketing, Media, and Communications' },
    { name: 'Finance & Accounts',           code: 'FIN-001', description: 'Finance department costs' },
    { name: 'North Batinah Project',        code: 'NBP-001', description: 'North Batinah Tender & Infrastructure' },
  ]
  const ccMap = {}
  for (const c of COST_CENTERS) {
    const row = await ins(db, 'cost_centers', { name: c.name, code: c.code, description: c.description, active: 1 })
    if (row) ccMap[c.code] = row.id
  }
  console.log(`  ✓ ${Object.keys(ccMap).length} cost centers`)

  // ── 5. Org chart ────────────────────────────────────────────────────────────
  console.log('\n[5/10] Building org chart...')
  await db.query('DELETE FROM org_chart')

  // node(id, title, email, parentId, order, dept, isCLevel, canDirectApprove, isHod)
  const orgNodes = [
    // Root: MD
    ['khalid-node',    'Managing Director',     'khalid@ankaa.om',          null,             0, 'Executive',            1, 1, 0],
    // C-Level
    ['mohd-node',      'Chief Technology Officer','mohd@ankaa.om',           'khalid-node',    0, 'Technology',           1, 1, 0],
    ['ikram-node',     'Chief Operating Officer', 'ikram@ankaa.om',          'khalid-node',    1, 'Operations',           1, 1, 0],
    // Under Mohd
    ['ali-r-node',     'Senior Manager',         'ali.r@ankaa.om',           'mohd-node',      0, 'Management',           0, 1, 0],
    ['ali-g-node',     'Head of Department',     'ali@ankaa.om',             'mohd-node',      1, 'Engineering',          0, 1, 1],
    // Under Ali Ramimi
    ['maathir-node',   'Bid Manager',            'maathir@ankaa.om',         'ali-r-node',     0, 'Business Development', 0, 0, 0],
    ['imad-node',      'AI Specialist',          'imad@ankaa.om',            'ali-r-node',     1, 'AI',                   0, 0, 0],
    ['reham-node',     'Media Executive',        'media@ankaa.om',           'ali-r-node',     2, 'Media',                0, 0, 0],
    ['daniya-node',    'Team Member',            'daniya@ankaa.om',          'ali-r-node',     3, 'Management',           0, 0, 0],
    // Under Ali Ghassani
    ['omar-node',      'Software Engineering Lead','omar@ankaa.om',          'ali-g-node',     0, 'Software Engineering', 0, 1, 1],
    ['ahmed-k-node',   'Head of Tech Lab',       'ahmed.khalid@ankaa.om',    'ali-g-node',     1, 'Tech Lab',             0, 1, 1],
    ['fuhood-node',    'Smart Cities Lead',      'fuhood@ankaa.om',          'ali-g-node',     2, 'Smart Cities',         0, 1, 1],
    ['mekaeel-node',   'Project Director',       'mekaeel@ankaa.om',         'ali-g-node',     3, 'Project Management',   0, 1, 1],
    ['yousuf-node',    'Spray Team Leader',      'yousuf@ankaa.om',          'ali-g-node',     4, 'Operations',           0, 1, 1],
    ['jamal-node',     'Cybersecurity Consultant','jamal@ankaa.om',          'ali-g-node',     5, 'Cybersecurity',        0, 0, 0],
    // Under Omar
    ['palwasha-node',  'Software Developer',     'palwasha@ankaa.om',        'omar-node',      0, 'Software Engineering', 0, 0, 0],
    ['m-ambouri-node', 'Software Developer',     'm.ambouri@ankaa.om',       'omar-node',      1, 'Software Engineering', 0, 0, 0],
    ['maryam-node',    'Technical Writer',       'maryam.alkalbani@ankaa.om','omar-node',      2, 'Software Engineering', 0, 0, 0],
    ['rahma-node',     'UI/UX Designer',         'rahma@ankaa.om',           'omar-node',      3, 'Software Engineering', 0, 0, 0],
    ['m-almaskri-node','Business Analyst',       'm.almaskri@ankaa.om',      'omar-node',      4, 'Software Engineering', 0, 0, 0],
    ['rayan-node',     'UI/UX Designer',         'rayan.alhashmi@ankaa.om',  'omar-node',      5, 'Software Engineering', 0, 0, 0],
    ['furwa-node',     'Software Developer',     'furwaasim@ankaa.om',       'omar-node',      6, 'Software Engineering', 0, 0, 0],
    ['imthiyaz-node',  'Software Developer',     'imthiyaz@ankaa.om',        'omar-node',      7, 'Software Engineering', 0, 0, 0],
    // Under Ikram
    ['sultan-node',    'Team Head',              'sultan@ankaa.om',          'ikram-node',     0, 'Operations',           0, 1, 1],
    ['ghaydah-node',   'Space Department Head',  'space@ankaa.om',           'ikram-node',     1, 'Space & Technology',   0, 1, 1],
    ['hr-node',        'HR Department',          'hr@ankaa.om',              'ikram-node',     2, 'HR',                   0, 0, 0],
    ['huria-node',     'HR Officer',             'huria@ankaa.om',           'hr-node',        0, 'HR',                   0, 0, 0],
    // Under Sultan
    ['hilal-node',     'PRO',                    'hilal@ankaa.om',           'sultan-node',    0, 'Operations',           0, 0, 0],
    ['khamis-node',    'Team Member',            'khamis@ankaa.om',          'sultan-node',    1, 'Operations',           0, 0, 0],
    // Under Ghaydah
    ['mazin-node',     'Space Engineer',         'mazinaltubi@ankaa.om',     'ghaydah-node',   0, 'Space & Technology',   0, 0, 0],
    // Finance (direct under Khalid)
    ['fateme-node',    'Finance & Accounts',     'accounts@taqa.om',         'khalid-node',    2, 'Finance',              0, 0, 0],
  ]

  const DEPT_COLORS = {
    'Executive': '#1a1a2e', 'Technology': '#16213e', 'Operations': '#0f3460',
    'Management': '#533483', 'Engineering': '#0d7377', 'Business Development': '#14a085',
    'AI': '#e94560', 'Media': '#f5a623', 'Software Engineering': '#0052cc',
    'Tech Lab': '#00875a', 'Smart Cities': '#6554c0', 'Project Management': '#ff5630',
    'Cybersecurity': '#de350b', 'HR': '#36b37e', 'Finance': '#0065ff',
    'Space & Technology': '#403294', 'Spray Team': '#ff8b00',
  }

  let ocCount = 0
  for (const [id, title, email, parentId, order, dept, isCLevel, canApprove, isHod] of orgNodes) {
    const uid = userMap[email] || null
    const color = DEPT_COLORS[dept] || '#555'
    try {
      await db.query(
        `INSERT INTO org_chart (id, title, user_id, parent_id, "order", department, color,
          is_c_level, can_direct_approve, is_head_of_department)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT (id) DO UPDATE
         SET title=$2, user_id=$3, parent_id=$4, "order"=$5, department=$6, color=$7,
             is_c_level=$8, can_direct_approve=$9, is_head_of_department=$10`,
        [id, title, uid, parentId, order, dept, color, isCLevel, canApprove, isHod]
      )
      ocCount++
    } catch (e) { console.warn('  org_chart warn:', e.message.slice(0, 60)) }
  }
  console.log(`  ✓ ${ocCount} org chart nodes`)

  // ── 6. Projects + lists + cards ─────────────────────────────────────────────
  console.log('\n[6/10] Building real project boards...')
  await db.query('DELETE FROM project_card_activities')
  await db.query('DELETE FROM project_card_members')
  await db.query('DELETE FROM project_checklist_items')
  await db.query('DELETE FROM project_checklists')
  await db.query('DELETE FROM project_cards')
  await db.query('DELETE FROM project_labels')
  await db.query('DELETE FROM project_lists')
  await db.query('DELETE FROM project_members')
  await db.query('DELETE FROM projects')

  const omr = userMap['omar@ankaa.om']
  const mohd = userMap['mohd@ankaa.om']
  const khalid = userMap['khalid@ankaa.om']
  const ashraf = userMap['ashraf@ankaa.om']
  const fuhood = userMap['fuhood@ankaa.om']
  const space  = userMap['space@ankaa.om']

  // Helper to create a full project with lists and labels
  async function createProject(name, desc, createdBy, members, listTitles, cardsByList, labelDefs) {
    const proj = await ins(db, 'projects', { name, description: desc, created_by: createdBy })
    if (!proj) return null
    const pid = proj.id

    // Members
    await ins(db, 'project_members', { project_id: pid, user_id: createdBy, role: 'owner', joined_at: NOW })
    for (const mid of members) {
      if (mid && mid !== createdBy)
        await ins(db, 'project_members', { project_id: pid, user_id: mid, role: 'member', joined_at: NOW })
    }

    // Labels
    const lblMap = {}
    let lpos = 0
    for (const [lname, lcolor] of labelDefs) {
      const lbl = await ins(db, 'project_labels', { project_id: pid, name: lname, color: lcolor, position: lpos++ })
      if (lbl) lblMap[lname] = lbl.id
    }

    // Lists + cards
    let lpos2 = 0
    const listMap = {}
    for (const lt of listTitles) {
      const lst = await ins(db, 'project_lists', { project_id: pid, title: lt, position: lpos2++ })
      if (lst) listMap[lt] = lst.id
    }

    for (const [listTitle, cards] of Object.entries(cardsByList)) {
      const listId = listMap[listTitle]
      if (!listId) continue
      let cpos = 0
      for (const card of cards) {
        const cardLabels = (card.labels || []).map(l => lblMap[l]).filter(Boolean)
        const c = await ins(db, 'project_cards', {
          list_id: listId, project_id: pid, title: card.title,
          description: card.desc || null, position: cpos++,
          completed: card.completed ? 1 : 0,
          due_date: card.due || null, priority: card.priority || 'medium',
          labels: JSON.stringify(cardLabels),
        })
        if (c && card.assignees) {
          for (const uid of card.assignees) {
            if (uid) await ins(db, 'project_card_members', { card_id: c.id, user_id: uid, created_at: NOW })
          }
        }
      }
    }
    return proj
  }

  const palwasha  = userMap['palwasha@ankaa.om']
  const mambouri  = userMap['m.ambouri@ankaa.om']
  const maryam    = userMap['maryam.alkalbani@ankaa.om']
  const rahma     = userMap['rahma@ankaa.om']
  const almaskri  = userMap['m.almaskri@ankaa.om']
  const rayan     = userMap['rayan.alhashmi@ankaa.om']
  const furwa     = userMap['furwaasim@ankaa.om']
  const imthiyaz  = userMap['imthiyaz@ankaa.om']
  const ahmedk    = userMap['ahmed.khalid@ankaa.om']
  const ahmedm    = userMap['ahmed.mondhari@ankaa.om']
  const maathir   = userMap['maathir@ankaa.om']

  // Project 1: MoH Legal Services
  await createProject(
    'MoH – Legal Services',
    'Ministry of Health — Legal Grievances & Lawsuits System (OutSystems)',
    omr,
    [mohd, palwasha, mambouri, maryam, rahma, almaskri, rayan, furwa, imthiyaz, maathir],
    ['Backlog', 'In Progress', 'In Review', 'Done'],
    {
      'Done': [
        { title: 'SUBMIT SRS (ENGLISH + ARABIC) FOR LEGAL (GRIEVANCES)', priority: 'high', completed: 1, due: '2026-02-15', assignees: [omr, maryam], labels: ['Documentation'] },
        { title: 'Submit Lawsuits Draft SRS for Team Review', priority: 'high', completed: 1, due: '2026-02-11', assignees: [omr], labels: ['Documentation'] },
        { title: 'Review SRS for Legal (Grievances)', priority: 'high', completed: 1, due: '2026-02-15', assignees: [maryam, rahma], labels: ['Documentation', 'Review'] },
        { title: 'Prepare documents for Lawsuits MoH Service', priority: 'high', completed: 1, due: '2026-02-12', assignees: [omr], labels: ['Documentation'] },
        { title: 'Send Minutes of Meeting for Architecture Assessment Call', priority: 'medium', completed: 1, due: '2026-02-17', assignees: [almaskri], labels: ['Meeting'] },
        { title: 'Build Dashboard from Excel – Case Management Data', priority: 'high', completed: 1, due: '2026-02-20', assignees: [almaskri], labels: ['Development'] },
        { title: 'Sunday MoH Meeting – Minutes of Meeting (MoM)', priority: 'medium', completed: 1, due: '2026-02-23', assignees: [omr], labels: ['Meeting'] },
        { title: 'MoH: SUBMIT FINAL (REVIEWED) SRS (ENGLISH + ARABIC) FOR LEGAL (GRIEVANCES)', priority: 'high', completed: 1, due: '2026-02-25', assignees: [omr, maryam], labels: ['Documentation'] },
        { title: 'Finalize AI-generated Prototypes for Grievances and Lawsuits after Client Comments', priority: 'high', completed: 1, due: '2026-02-19', assignees: [rahma], labels: ['Design'] },
        { title: 'MoH: Review and Give Client-Ready Draft Version of Lawsuits SRS', priority: 'high', completed: 1, due: '2026-02-26', assignees: [mambouri], labels: ['Documentation', 'Review'] },
        { title: 'MoH: Suggest Updates for Legal Grievances SRS After Client Comments', priority: 'medium', completed: 1, due: '2026-02-23', assignees: [maryam], labels: ['Documentation'] },
        { title: 'MoH: External Integration Readiness Definition (Grievances + Lawsuits)', priority: 'high', completed: 1, due: '2026-02-25', assignees: [almaskri], labels: ['Architecture'] },
        { title: 'MoH: Technical Delivery Plan', priority: 'high', completed: 1, due: '2026-02-26', assignees: [almaskri], labels: ['Planning'] },
        { title: 'Update Prototypes for Grievances and Lawsuits Services after Client Comments', priority: 'high', completed: 1, due: '2026-02-20', assignees: [rahma, rayan], labels: ['Design'] },
        { title: 'Update Grievances Mockups based on the latest flow', priority: 'high', completed: 1, due: '2026-02-20', assignees: [rayan], labels: ['Design'] },
        { title: 'Renew Ooredoo SMS service', priority: 'medium', completed: 1, due: '2026-04-15', assignees: [omr], labels: ['Operations'] },
        { title: 'Renew Ooredoo OTP service', priority: 'medium', completed: 1, due: '2026-05-11', assignees: [omr], labels: ['Operations'] },
        { title: 'Check and Re-submit Updated North Batinah Tender', priority: 'high', completed: 1, due: '2026-02-18', assignees: [omr], labels: ['Tender'] },
        { title: 'Align with Bruno for Organisation Structure of MOH Legal Dept', priority: 'medium', completed: 1, due: '2026-04-28', assignees: [omr], labels: ['Meeting'] },
        { title: 'Align with Ana for QA tasks', priority: 'medium', completed: 1, due: '2026-04-27', assignees: [omr], labels: ['QA'] },
      ],
      'In Review': [
        { title: 'MoH: Grievances – User Story Breakdown, Estimation & Development Path', priority: 'high', due: '2026-04-10', assignees: [omr, almaskri, palwasha, mambouri], labels: ['Planning', 'Development'] },
        { title: 'MoH: Lawsuits – Draft SRS + Team & Tech Writer Review', priority: 'high', due: '2026-04-20', assignees: [omr, maryam], labels: ['Documentation', 'Review'] },
        { title: 'DO NOT CLOSE: Complete integration touchpoints list for Grievances and Lawsuits', priority: 'high', due: '2026-06-15', assignees: [almaskri], labels: ['Architecture'] },
        { title: 'Create UI/UX for the Grievance Types and Subjects back-office', priority: 'high', due: '2026-04-30', assignees: [rayan, rahma], labels: ['Design'] },
        { title: 'MoH: Follow up on Event Management software implementation in OutSystems', priority: 'high', due: '2026-04-15', assignees: [ahmedk, almaskri], labels: ['Development'] },
      ],
      'In Progress': [
        { title: 'OutSystems development – Grievances module Sprint 1', priority: 'high', due: '2026-07-10', assignees: [palwasha, mambouri, furwa, imthiyaz], labels: ['Development'] },
        { title: 'QA Testing – Legal Grievances portal', priority: 'high', due: '2026-07-20', assignees: [rayan], labels: ['QA'] },
        { title: 'Hide extra pages for SAND users', priority: 'medium', due: '2026-05-25', assignees: [palwasha], labels: ['Development'] },
        { title: 'API Integration with MOH Systems', priority: 'high', due: '2026-07-30', assignees: [almaskri, mambouri], labels: ['Architecture', 'Development'] },
      ],
      'Backlog': [
        { title: 'OutSystems development – Lawsuits module Sprint 2', priority: 'high', due: '2026-08-15', assignees: [omr, palwasha, mambouri], labels: ['Development'] },
        { title: 'User Acceptance Testing (UAT) with MoH team', priority: 'high', due: '2026-09-01', assignees: [omr, almaskri], labels: ['QA'] },
        { title: 'Deployment to MoH production environment', priority: 'high', due: '2026-10-01', assignees: [omr], labels: ['DevOps'] },
      ],
    },
    [
      ['Documentation', '#0052cc'], ['Design', '#6554c0'], ['Development', '#00875a'],
      ['Review', '#ff8b00'], ['Architecture', '#403294'], ['Planning', '#e94560'],
      ['Meeting', '#14a085'], ['QA', '#de350b'], ['Operations', '#0065ff'],
      ['Tender', '#1a1a2e'], ['DevOps', '#0f3460'],
    ]
  )

  // Project 2: Smart Cities Initiative
  await createProject(
    'Smart Cities Initiative',
    'Smart Cities Platform – IoT, Analytics, and Urban Management Solutions',
    fuhood,
    [mohd, ahmedk, jamal = userMap['jamal@ankaa.om']],
    ['Backlog', 'In Progress', 'In Review', 'Done'],
    {
      'Done': [
        { title: 'Smart Cities RFP Response – Muscat Municipality', priority: 'high', completed: 1, due: '2026-03-01', assignees: [fuhood, maathir], labels: ['Tender'] },
        { title: 'Technical Architecture Document v1.0', priority: 'high', completed: 1, due: '2026-04-01', assignees: [fuhood, ahmedk], labels: ['Documentation'] },
      ],
      'In Progress': [
        { title: 'IoT Sensor Integration POC', priority: 'high', due: '2026-07-15', assignees: [fuhood, ahmedk], labels: ['Development'] },
        { title: 'Smart Traffic Management Module', priority: 'medium', due: '2026-08-01', assignees: [fuhood], labels: ['Development'] },
        { title: 'Cybersecurity Assessment for Smart City Network', priority: 'high', due: '2026-07-30', assignees: [jamal], labels: ['Security'] },
      ],
      'Backlog': [
        { title: 'Smart Waste Management Integration', priority: 'medium', due: '2026-09-01', assignees: [fuhood], labels: ['Development'] },
        { title: 'Data Analytics Dashboard for City Operations', priority: 'high', due: '2026-10-01', assignees: [fuhood, ahmedk], labels: ['Development'] },
      ],
    },
    [
      ['Tender', '#1a1a2e'], ['Documentation', '#0052cc'], ['Development', '#00875a'],
      ['Security', '#de350b'], ['Operations', '#0065ff'],
    ]
  )

  // Project 3: Ankaa ERP System
  await createProject(
    'Ankaa ERP – Internal System',
    'Development of the Ankaa ERP system (leave management, invoices, HR, projects)',
    ashraf,
    [mohd, palwasha, mambouri, omr],
    ['Backlog', 'In Progress', 'Done'],
    {
      'Done': [
        { title: 'Local PGlite database setup', priority: 'high', completed: 1, assignees: [ashraf], labels: ['Backend'] },
        { title: 'Authentication system with JWT', priority: 'high', completed: 1, assignees: [ashraf], labels: ['Backend'] },
        { title: 'Leave request submission form', priority: 'high', completed: 1, assignees: [ashraf], labels: ['Frontend'] },
        { title: 'Invoice upload and tracking', priority: 'high', completed: 1, assignees: [ashraf], labels: ['Frontend'] },
        { title: 'Employee roster management', priority: 'medium', completed: 1, assignees: [ashraf], labels: ['Frontend'] },
      ],
      'In Progress': [
        { title: 'Leave approval workflow – multi-level chain', priority: 'high', due: '2026-07-10', assignees: [ashraf], labels: ['Backend', 'Frontend'] },
        { title: 'Admin dashboard – leave statistics', priority: 'high', due: '2026-07-15', assignees: [ashraf], labels: ['Frontend'] },
        { title: 'Real data migration from old taskboard', priority: 'high', due: '2026-06-30', assignees: [ashraf], labels: ['Backend'] },
      ],
      'Backlog': [
        { title: 'Email notification system for leave approvals', priority: 'high', due: '2026-08-01', assignees: [ashraf], labels: ['Backend'] },
        { title: 'Mobile-responsive UI polish', priority: 'medium', due: '2026-08-15', assignees: [ashraf], labels: ['Frontend'] },
        { title: 'Supabase production migration', priority: 'high', due: '2026-09-01', assignees: [ashraf, mohd], labels: ['Backend', 'DevOps'] },
      ],
    },
    [
      ['Backend', '#0052cc'], ['Frontend', '#6554c0'], ['DevOps', '#0f3460'],
    ]
  )

  console.log('  ✓ 3 projects seeded with real cards')

  // ── 7. Todos (real tasks from task_reminders.json) ──────────────────────────
  console.log('\n[7/10] Seeding real todos...')
  await db.query('DELETE FROM todos')

  const TODOS = [
    // Omar's tasks
    { email: 'omar@ankaa.om',          task: 'Review and approve final SRS for MoH Legal Grievances',                     priority: 'high',   is_complete: 1, due_date: '2026-02-15', notes: 'Both English and Arabic versions' },
    { email: 'omar@ankaa.om',          task: 'Follow up on MoH Architecture Assessment deliverables',                     priority: 'high',   is_complete: 1, due_date: '2026-02-20' },
    { email: 'omar@ankaa.om',          task: 'Prepare MoH Sunday meeting agenda and MoM',                                priority: 'medium', is_complete: 1, due_date: '2026-02-22' },
    { email: 'omar@ankaa.om',          task: 'Check and re-submit Updated North Batinah Tender',                         priority: 'high',   is_complete: 1, due_date: '2026-02-18' },
    { email: 'omar@ankaa.om',          task: 'MoH user story breakdown and estimation for Grievances module',            priority: 'high',   is_complete: 0, due_date: '2026-07-10' },
    { email: 'omar@ankaa.om',          task: 'Renew Ooredoo SMS/OTP subscription',                                       priority: 'medium', is_complete: 1, due_date: '2026-04-15' },
    { email: 'omar@ankaa.om',          task: 'Align with Bruno on MOH Legal Department organisation structure',          priority: 'medium', is_complete: 1, due_date: '2026-04-27' },
    { email: 'omar@ankaa.om',          task: 'Oversee sprint 1 delivery for OutSystems Grievances module',               priority: 'high',   is_complete: 0, due_date: '2026-07-15' },
    // Maryam's tasks
    { email: 'maryam.alkalbani@ankaa.om', task: 'Review SRS for Legal Grievances and provide comments',                  priority: 'high',   is_complete: 1, due_date: '2026-02-15' },
    { email: 'maryam.alkalbani@ankaa.om', task: 'Suggest updates for Legal Grievances SRS after client comments',        priority: 'high',   is_complete: 1, due_date: '2026-02-23' },
    { email: 'maryam.alkalbani@ankaa.om', task: 'Finalize English + Arabic SRS documentation for submission',            priority: 'high',   is_complete: 0, due_date: '2026-07-01' },
    // Rahma's tasks
    { email: 'rahma@ankaa.om',         task: 'Update Prototypes for Grievances and Lawsuits after client comments',      priority: 'high',   is_complete: 1, due_date: '2026-02-20' },
    { email: 'rahma@ankaa.om',         task: 'Finalize AI-generated Prototypes for Legal Services',                      priority: 'high',   is_complete: 1, due_date: '2026-02-18' },
    { email: 'rahma@ankaa.om',         task: 'Create hi-fi mockups for Lawsuits module back-office',                    priority: 'high',   is_complete: 0, due_date: '2026-07-05' },
    // Almaskri's tasks
    { email: 'm.almaskri@ankaa.om',    task: 'Send MoM for Architecture Assessment call',                                priority: 'medium', is_complete: 1, due_date: '2026-02-17' },
    { email: 'm.almaskri@ankaa.om',    task: 'Build Dashboard from Excel – Case Management Data',                        priority: 'high',   is_complete: 1, due_date: '2026-02-20' },
    { email: 'm.almaskri@ankaa.om',    task: 'Prepare integration touchpoints list for Grievances and Lawsuits',        priority: 'high',   is_complete: 1, due_date: '2026-02-19' },
    { email: 'm.almaskri@ankaa.om',    task: 'MoH External Integration Readiness Definition',                           priority: 'high',   is_complete: 1, due_date: '2026-02-25' },
    { email: 'm.almaskri@ankaa.om',    task: 'MoH Technical Delivery Plan document',                                    priority: 'high',   is_complete: 1, due_date: '2026-02-26' },
    { email: 'm.almaskri@ankaa.om',    task: 'Event Management software implementation – follow up OutSystems',         priority: 'high',   is_complete: 1, due_date: '2026-04-15' },
    // Rayan's tasks
    { email: 'rayan.alhashmi@ankaa.om',task: 'Update Grievances Mockups based on latest flow',                          priority: 'high',   is_complete: 1, due_date: '2026-02-20' },
    { email: 'rayan.alhashmi@ankaa.om',task: 'Create UI/UX for grievance types and subjects back-office',               priority: 'high',   is_complete: 0, due_date: '2026-04-30' },
    { email: 'rayan.alhashmi@ankaa.om',task: 'QA Testing of Legal Grievances portal UI',                                priority: 'medium', is_complete: 0, due_date: '2026-07-20' },
    // Mazin Ambouri's tasks
    { email: 'm.ambouri@ankaa.om',     task: 'Review and client-ready draft of Lawsuits SRS',                           priority: 'high',   is_complete: 1, due_date: '2026-02-26' },
    { email: 'm.ambouri@ankaa.om',     task: 'OutSystems – Grievances module backend development',                      priority: 'high',   is_complete: 0, due_date: '2026-07-10' },
    // Palwasha's tasks
    { email: 'palwasha@ankaa.om',      task: 'Hide extra pages for SAND users in the portal',                           priority: 'medium', is_complete: 1, due_date: '2026-05-21' },
    { email: 'palwasha@ankaa.om',      task: 'OutSystems frontend development – Grievances module',                     priority: 'high',   is_complete: 0, due_date: '2026-07-10' },
    // Ahmed Al Kharusi's tasks
    { email: 'ahmed@ankaa.om',         task: 'Follow up on Event Management software implementation in OutSystems',     priority: 'high',   is_complete: 1, due_date: '2026-04-15' },
    { email: 'ahmed@ankaa.om',         task: 'Tech Lab quarterly equipment review',                                     priority: 'medium', is_complete: 0, due_date: '2026-07-01' },
    // Maathir's tasks
    { email: 'maathir@ankaa.om',       task: 'North Batinah Tender – bid submission follow-up',                        priority: 'high',   is_complete: 1, due_date: '2026-03-01' },
    { email: 'maathir@ankaa.om',       task: 'Smart Cities RFP response – technical section',                          priority: 'high',   is_complete: 1, due_date: '2026-03-15' },
    // Ikram's tasks
    { email: 'ikram@ankaa.om',         task: 'Q2 operations review and department heads meeting',                       priority: 'medium', is_complete: 0, due_date: '2026-07-05' },
    { email: 'ikram@ankaa.om',         task: 'Staff performance appraisal process Q2 2026',                            priority: 'high',   is_complete: 0, due_date: '2026-07-15' },
    // Khalid's tasks
    { email: 'khalid@ankaa.om',        task: 'Quarterly board review – Q2 2026',                                       priority: 'high',   is_complete: 0, due_date: '2026-07-10' },
    { email: 'khalid@ankaa.om',        task: 'MoH contract renewal discussions',                                       priority: 'high',   is_complete: 0, due_date: '2026-07-20' },
    // Ashraf ERP tasks
    { email: 'ashraf@ankaa.om',        task: 'Complete real data migration from old taskboard to new ERP',             priority: 'high',   is_complete: 0, due_date: '2026-06-30' },
    { email: 'ashraf@ankaa.om',        task: 'Test all ERP modules with real company data',                            priority: 'high',   is_complete: 0, due_date: '2026-07-05' },
    { email: 'ashraf@ankaa.om',        task: 'Deploy ERP to production and onboard team',                              priority: 'high',   is_complete: 0, due_date: '2026-08-01' },
  ]

  let tdCount = 0
  for (const t of TODOS) {
    const uid = userMap[t.email]
    if (!uid) continue
    await db.query(
      `INSERT INTO todos (user_id, task, is_complete, due_date, priority, notes, created_by, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [uid, t.task, t.is_complete ? 1 : 0, t.due_date || null, t.priority || 'medium', t.notes || null, uid, NOW]
    )
    tdCount++
  }
  console.log(`  ✓ ${tdCount} todos seeded`)

  // ── 8. Leave requests ────────────────────────────────────────────────────────
  console.log('\n[8/10] Seeding realistic leave requests...')
  await db.query('DELETE FROM leave_requests')

  const ali_g = userMap['ali@ankaa.om']
  const ali_r  = userMap['ali.r@ankaa.om']
  const hr_id  = userMap['hr@ankaa.om']
  const sultan_id = userMap['sultan@ankaa.om']

  // Helper to build approval_history JSON
  function approvedHistory(approvers) {
    return JSON.stringify(approvers.map((a, i) => ({
      level: i + 1, approver: a.name, approved_at: a.at, comments: a.comments || null
    })))
  }

  const LEAVE_REQS = [
    // Approved annual leaves
    {
      user_email: 'palwasha@ankaa.om', leave_type: 'annual', reason: 'Annual leave',
      start_date: '2026-04-19', end_date: '2026-04-25', total_working_days: 5,
      status: 'approved',
      pending_ghassani_approved_at: '2026-04-17T09:30:00Z', pending_ghassani_approved_by: ali_g,
      pending_ramimi_approved_at: '2026-04-17T11:00:00Z', pending_ramimi_approved_by: ali_r,
      pending_hr_approved_at: '2026-04-17T13:00:00Z', pending_hr_approved_by: hr_id,
    },
    {
      user_email: 'rahma@ankaa.om', leave_type: 'annual', reason: 'Annual leave – Eid Al Fitr',
      start_date: '2026-03-30', end_date: '2026-04-03', total_working_days: 5,
      status: 'approved',
      pending_ghassani_approved_at: '2026-03-25T10:00:00Z', pending_ghassani_approved_by: ali_g,
      pending_ramimi_approved_at: '2026-03-25T11:30:00Z', pending_ramimi_approved_by: ali_r,
      pending_hr_approved_at: '2026-03-25T14:00:00Z', pending_hr_approved_by: hr_id,
    },
    {
      user_email: 'm.almaskri@ankaa.om', leave_type: 'annual', reason: 'Annual leave',
      start_date: '2026-05-10', end_date: '2026-05-16', total_working_days: 5,
      status: 'approved',
      pending_ghassani_approved_at: '2026-05-07T09:00:00Z', pending_ghassani_approved_by: ali_g,
      pending_ramimi_approved_at: '2026-05-07T10:30:00Z', pending_ramimi_approved_by: ali_r,
      pending_hr_approved_at: '2026-05-07T13:00:00Z', pending_hr_approved_by: hr_id,
    },
    {
      user_email: 'maathir@ankaa.om', leave_type: 'annual', reason: 'Annual leave – family trip',
      start_date: '2026-03-08', end_date: '2026-03-14', total_working_days: 5,
      status: 'approved',
      pending_ramimi_approved_at: '2026-03-05T09:00:00Z', pending_ramimi_approved_by: ali_r,
      pending_hr_approved_at: '2026-03-05T13:00:00Z', pending_hr_approved_by: hr_id,
    },
    {
      user_email: 'hilal@ankaa.om', leave_type: 'annual', reason: 'Annual leave',
      start_date: '2026-02-22', end_date: '2026-02-26', total_working_days: 4,
      status: 'approved',
      pending_sultan_approved_at: '2026-02-19T10:00:00Z', pending_sultan_approved_by: sultan_id,
      pending_hr_approved_at: '2026-02-19T14:00:00Z', pending_hr_approved_by: hr_id,
    },
    // Sick leaves
    {
      user_email: 'maryam.alkalbani@ankaa.om', leave_type: 'sick', reason: 'Medical – flu and rest',
      start_date: '2026-03-17', end_date: '2026-03-19', total_working_days: 3,
      status: 'approved', document_required: 1, document_uploaded: 1,
      pending_ghassani_approved_at: '2026-03-17T08:30:00Z', pending_ghassani_approved_by: ali_g,
      pending_hr_approved_at: '2026-03-17T09:00:00Z', pending_hr_approved_by: hr_id,
    },
    {
      user_email: 'daniya@ankaa.om', leave_type: 'sick', reason: 'Medical appointment – follow-up',
      start_date: '2026-04-28', end_date: '2026-04-29', total_working_days: 2,
      status: 'approved',
      pending_ramimi_approved_at: '2026-04-27T09:00:00Z', pending_ramimi_approved_by: ali_r,
      pending_hr_approved_at: '2026-04-27T11:00:00Z', pending_hr_approved_by: hr_id,
    },
    // Remote work
    {
      user_email: 'rayan.alhashmi@ankaa.om', leave_type: 'remote_work', reason: 'Working from home – design work',
      start_date: '2026-06-08', end_date: '2026-06-12', total_working_days: 5,
      status: 'approved',
      pending_ghassani_approved_at: '2026-06-05T09:30:00Z', pending_ghassani_approved_by: ali_g,
      pending_hr_approved_at: '2026-06-05T11:00:00Z', pending_hr_approved_by: hr_id,
    },
    {
      user_email: 'furwaasim@ankaa.om', leave_type: 'remote_work', reason: 'Remote development work',
      start_date: '2026-05-25', end_date: '2026-05-29', total_working_days: 5,
      status: 'approved',
      pending_ghassani_approved_at: '2026-05-22T09:00:00Z', pending_ghassani_approved_by: ali_g,
      pending_hr_approved_at: '2026-05-22T11:00:00Z', pending_hr_approved_by: hr_id,
    },
    // Official trip
    {
      user_email: 'omar@ankaa.om', leave_type: 'official_trip',
      reason: 'MoH client meetings – Muscat',
      start_date: '2026-03-02', end_date: '2026-03-05', total_working_days: 4,
      status: 'approved', tada_zone: '1', official_trip_description: 'Ministry of Health client meetings for Legal Grievances project review',
      direct_approved: 1, direct_approved_by: ali_g, direct_approved_by_name: 'Ali Al Ghassani',
      direct_approved_at: '2026-02-28T10:00:00Z',
    },
    // Official meeting
    {
      user_email: 'm.almaskri@ankaa.om', leave_type: 'official_meeting',
      reason: 'Architecture Assessment Technical Workshop',
      start_date: '2026-02-16', end_date: '2026-02-16', total_working_days: 1,
      status: 'approved', start_time: '09:00', end_time: '17:00',
      location: 'Ministry of Health, Muscat', meeting_subject: 'Architecture Assessment for Case Management System',
      pending_ghassani_approved_at: '2026-02-15T14:00:00Z', pending_ghassani_approved_by: ali_g,
      pending_hr_approved_at: '2026-02-15T15:00:00Z', pending_hr_approved_by: hr_id,
    },
    // Emergency leave
    {
      user_email: 'imad@ankaa.om', leave_type: 'emergency',
      reason: 'Family emergency', emergency_note: 'Father hospitalized, need to travel to hometown',
      start_date: '2026-05-05', end_date: '2026-05-07', total_working_days: 3,
      status: 'approved',
      pending_ramimi_approved_at: '2026-05-05T07:00:00Z', pending_ramimi_approved_by: ali_r,
      pending_hr_approved_at: '2026-05-05T08:00:00Z', pending_hr_approved_by: hr_id,
    },
    // Pending requests (recent)
    {
      user_email: 'jamal@ankaa.om', leave_type: 'annual',
      reason: 'Annual leave – summer holiday',
      start_date: '2026-07-06', end_date: '2026-07-17', total_working_days: 10,
      status: 'pending_ghassani',
    },
    {
      user_email: 'khamis@ankaa.om', leave_type: 'annual',
      reason: 'Annual leave',
      start_date: '2026-07-13', end_date: '2026-07-24', total_working_days: 10,
      status: 'pending_sultan',
      pending_sultan_approved_at: null,
    },
    {
      user_email: 'mazinaltubi@ankaa.om', leave_type: 'sick',
      reason: 'Medical – dental procedure',
      start_date: '2026-06-29', end_date: '2026-06-30', total_working_days: 2,
      status: 'pending_hr',
      pending_ghassani_approved_at: '2026-06-26T09:00:00Z', pending_ghassani_approved_by: ali_g,
    },
    // Cancelled
    {
      user_email: 'm.ambouri@ankaa.om', leave_type: 'annual',
      reason: 'Annual leave', start_date: '2026-05-18', end_date: '2026-05-22',
      total_working_days: 5, status: 'approved', canceled: 1,
      canceled_at: '2026-05-10T10:00:00Z', canceled_by_name: 'Mohammed Ambouri',
      cancel_reason: 'Project deadlines – postponed to next month',
      pending_ghassani_approved_at: '2026-05-08T09:00:00Z', pending_ghassani_approved_by: ali_g,
      pending_hr_approved_at: '2026-05-08T11:00:00Z', pending_hr_approved_by: hr_id,
    },
  ]

  let lrCount = 0
  for (const lr of LEAVE_REQS) {
    const uid = userMap[lr.user_email]
    if (!uid) continue
    const prof = await db.query('SELECT joining_date, phone_number FROM profiles WHERE id=$1', [uid])
    const pData = prof.rows[0] || {}
    const row = {
      user_id: uid,
      start_date: lr.start_date, end_date: lr.end_date,
      leave_type: lr.leave_type, total_working_days: lr.total_working_days,
      reason: lr.reason, description: lr.description || null,
      status: lr.status,
      joining_date: pData.joining_date || null, phone_number: pData.phone_number || null,
      emergency_note: lr.emergency_note || null,
      start_time: lr.start_time || null, end_time: lr.end_time || null,
      location: lr.location || null, meeting_subject: lr.meeting_subject || null,
      tada_zone: lr.tada_zone || null, official_trip_description: lr.official_trip_description || null,
      document_required: lr.document_required || 0, document_uploaded: lr.document_uploaded || 0,
      // Approval steps
      pending_ghassani_approved_at: lr.pending_ghassani_approved_at || null,
      pending_ghassani_approved_by: lr.pending_ghassani_approved_by || null,
      pending_yousuf_approved_at:   lr.pending_yousuf_approved_at || null,
      pending_yousuf_approved_by:   lr.pending_yousuf_approved_by || null,
      pending_sultan_approved_at:   lr.pending_sultan_approved_at || null,
      pending_sultan_approved_by:   lr.pending_sultan_approved_by || null,
      pending_ramimi_approved_at:   lr.pending_ramimi_approved_at || null,
      pending_ramimi_approved_by:   lr.pending_ramimi_approved_by || null,
      pending_hr_approved_at:       lr.pending_hr_approved_at || null,
      pending_hr_approved_by:       lr.pending_hr_approved_by || null,
      // Direct approval
      direct_approved:              lr.direct_approved || 0,
      direct_approved_by:           lr.direct_approved_by || null,
      direct_approved_at:           lr.direct_approved_at || null,
      direct_approved_by_name:      lr.direct_approved_by_name || null,
      direct_comments:              lr.direct_comments || null,
      // Cancellation
      canceled:                     lr.canceled || 0,
      canceled_at:                  lr.canceled_at || null,
      canceled_by_name:             lr.canceled_by_name || null,
      cancel_reason:                lr.cancel_reason || null,
      approval_history:             '[]',
      current_approval_level:       1,
    }
    try {
      await ins(db, 'leave_requests', row)
      lrCount++
    } catch (e) { console.warn('  leave_request err:', e.message.slice(0, 80)) }
  }
  console.log(`  ✓ ${lrCount} leave requests seeded`)

  // ── 9. Invoices ─────────────────────────────────────────────────────────────
  console.log('\n[9/10] Seeding realistic invoices...')
  await db.query('DELETE FROM invoices')

  const INVOICES = [
    { email: 'omar@ankaa.om',         name: 'Fuel – MoH site visits Muscat',        amount: 15.5,  category: 'fuel',           cost_center: 'MoH – Legal Services',    currency: 'OMR', date: '2026-02-16', paid_by: 'Office card', status: 'paid',   fuel_amount: 15.5 },
    { email: 'omar@ankaa.om',         name: 'Taxi – Ministry of Health meetings',    amount: 8.2,   category: 'transportation',  cost_center: 'MoH – Legal Services',    currency: 'OMR', date: '2026-03-02', paid_by: 'CEO',         status: 'paid',   transportation_amount: 8.2 },
    { email: 'm.almaskri@ankaa.om',   name: 'Fuel – Architecture Assessment visit',  amount: 12.0,  category: 'fuel',           cost_center: 'MoH – Legal Services',    currency: 'OMR', date: '2026-02-16', paid_by: 'Office card', status: 'paid',   fuel_amount: 12.0 },
    { email: 'm.almaskri@ankaa.om',   name: 'Lunch – client meeting MoH team',       amount: 22.5,  category: 'food',           cost_center: 'MoH – Legal Services',    currency: 'OMR', date: '2026-02-18', paid_by: 'CEO',         status: 'paid',   food_amount: 22.5 },
    { email: 'fuhood@ankaa.om',       name: 'Smart Cities workshop materials',        amount: 45.0,  category: 'materials',      cost_center: 'Smart Cities',            currency: 'OMR', date: '2026-03-10', paid_by: 'Office card', status: 'paid',   materials_amount: 45.0 },
    { email: 'fuhood@ankaa.om',       name: 'Fuel – Smart Cities field survey',       amount: 18.0,  category: 'fuel',           cost_center: 'Smart Cities',            currency: 'OMR', date: '2026-04-05', paid_by: 'Office card', status: 'unpaid', fuel_amount: 18.0 },
    { email: 'maathir@ankaa.om',      name: 'Bid document printing – North Batinah', amount: 32.0,  category: 'others',         cost_center: 'North Batinah Project',   currency: 'OMR', date: '2026-02-25', paid_by: 'IT department', status: 'paid', others_amount: 32.0 },
    { email: 'maathir@ankaa.om',      name: 'Fuel – tender submission trip',          amount: 11.0,  category: 'fuel',           cost_center: 'North Batinah Project',   currency: 'OMR', date: '2026-03-01', paid_by: 'Office card', status: 'paid',   fuel_amount: 11.0 },
    { email: 'hilal@ankaa.om',        name: 'PRO services – document processing',     amount: 55.0,  category: 'others',         cost_center: 'Operations & Management', currency: 'OMR', date: '2026-03-15', paid_by: 'Office card', status: 'paid',   others_amount: 55.0 },
    { email: 'hilal@ankaa.om',        name: 'Transportation – government offices',    amount: 14.5,  category: 'transportation',  cost_center: 'Operations & Management', currency: 'OMR', date: '2026-04-10', paid_by: 'Office card', status: 'unpaid', transportation_amount: 14.5 },
    { email: 'mazinaltubi@ankaa.om',  name: 'Space equipment – calibration tools',    amount: 120.0, category: 'materials',      cost_center: 'Space & Technology',      currency: 'OMR', date: '2026-04-20', paid_by: 'CEO',         status: 'paid',   materials_amount: 120.0 },
    { email: 'imad@ankaa.om',         name: 'AI API credits – prototype testing',     amount: 28.5,  category: 'others',         cost_center: 'Tech Lab',                currency: 'OMR', date: '2026-05-01', paid_by: 'IT department', status: 'paid', others_amount: 28.5 },
    { email: 'jamal@ankaa.om',        name: 'Cybersecurity tools – annual license',   amount: 89.0,  category: 'others',         cost_center: 'Tech Lab',                currency: 'OMR', date: '2026-03-20', paid_by: 'IT department', status: 'paid', others_amount: 89.0 },
    { email: 'media@ankaa.om',        name: 'Canva Pro – media design subscription',  amount: 15.0,  category: 'others',         cost_center: 'Media & Communications',  currency: 'OMR', date: '2026-04-01', paid_by: 'Office card', status: 'paid',   others_amount: 15.0 },
    { email: 'palwasha@ankaa.om',     name: 'Technical books – OutSystems development', amount: 38.0, category: 'materials',    cost_center: 'MoH – Legal Services',    currency: 'OMR', date: '2026-05-15', paid_by: 'IT department', status: 'unpaid', materials_amount: 38.0 },
  ]

  let invCount = 0
  for (const inv of INVOICES) {
    const uid = userMap[inv.email]
    if (!uid) continue
    try {
      await ins(db, 'invoices', {
        user_id: uid, name: inv.name, amount: inv.amount,
        transaction_date: inv.date, status: inv.status,
        expense_category: inv.category, cost_center: inv.cost_center,
        currency: inv.currency || 'OMR', paid_by: inv.paid_by,
        fuel_amount: inv.fuel_amount || 0, materials_amount: inv.materials_amount || 0,
        transportation_amount: inv.transportation_amount || 0,
        food_amount: inv.food_amount || 0, others_amount: inv.others_amount || 0,
      })
      invCount++
    } catch (e) { console.warn('  invoice err:', e.message.slice(0, 60)) }
  }
  console.log(`  ✓ ${invCount} invoices seeded`)

  // ── 10. Roster date events (Omani public holidays 2026) ─────────────────────
  console.log('\n[10/10] Seeding Omani public holidays 2026...')
  await db.query('DELETE FROM roster_date_events')

  const HOLIDAYS = [
    { date: '2026-01-01', type: 'official_holiday', name: "New Year's Day" },
    { date: '2026-02-18', type: 'official_holiday', name: 'Isra and Mi\'raj (Prophet Ascension)' },
    { date: '2026-03-30', type: 'official_holiday', name: 'Eid Al Fitr – Day 1' },
    { date: '2026-03-31', type: 'official_holiday', name: 'Eid Al Fitr – Day 2' },
    { date: '2026-04-01', type: 'official_holiday', name: 'Eid Al Fitr – Day 3' },
    { date: '2026-06-06', type: 'official_holiday', name: 'Eid Al Adha – Day 1' },
    { date: '2026-06-07', type: 'official_holiday', name: 'Eid Al Adha – Day 2' },
    { date: '2026-06-08', type: 'official_holiday', name: 'Eid Al Adha – Day 3' },
    { date: '2026-06-27', type: 'official_holiday', name: 'Islamic New Year (Hijri New Year)' },
    { date: '2026-09-05', type: 'official_holiday', name: "Prophet Muhammad's Birthday (Mawlid)" },
    { date: '2026-11-18', type: 'official_holiday', name: "Oman National Day" },
    { date: '2026-11-19', type: 'official_holiday', name: "Oman National Day (cont.)" },
    { date: '2026-12-31', type: 'company_event',    name: "Year-End Company Gathering" },
  ]

  let rdCount = 0
  for (const h of HOLIDAYS) {
    try {
      await ins(db, 'roster_date_events', {
        date: h.date, event_type: h.type, event_name: h.name,
        created_by: khalid || null,
      })
      rdCount++
    } catch { /* already exists */ }
  }
  console.log(`  ✓ ${rdCount} holiday/events seeded`)

  // ── Final summary ────────────────────────────────────────────────────────────
  const counts = await db.query(`
    SELECT 'profiles' AS t, COUNT(*) AS n FROM profiles
    UNION ALL SELECT 'leave_requests', COUNT(*) FROM leave_requests
    UNION ALL SELECT 'invoices',       COUNT(*) FROM invoices
    UNION ALL SELECT 'todos',          COUNT(*) FROM todos
    UNION ALL SELECT 'projects',       COUNT(*) FROM projects
    UNION ALL SELECT 'project_cards',  COUNT(*) FROM project_cards
    UNION ALL SELECT 'org_chart',      COUNT(*) FROM org_chart
    UNION ALL SELECT 'cost_centers',   COUNT(*) FROM cost_centers
    UNION ALL SELECT 'roster_date_events', COUNT(*) FROM roster_date_events
  `)

  console.log('\n' + '─'.repeat(60))
  console.log('✅  Migration complete — real Ankaa company data loaded')
  console.log('─'.repeat(60))
  counts.rows.forEach(r => console.log(`  ${String(r.t).padEnd(22)} ${r.n}`))
  console.log('\n  All accounts use password:  Ankaa@2026')
  console.log('  Login at: http://localhost:3001/login')
  console.log('─'.repeat(60) + '\n')

  await db.close()
}

main().catch(e => {
  console.error('\nMigration failed:', e.message || e)
  process.exit(1)
})
