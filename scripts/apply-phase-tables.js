/**
 * Apply all Phase 4-17 tables to the live DB and seed initial data.
 * Run: node scripts/apply-phase-tables.js
 */
const fs   = require('fs')
const path = require('path')
const { randomUUID } = require('crypto')
const { PGlite } = require('@electric-sql/pglite')

const envPath = path.join(__dirname, '..', '.env.local')
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const t = line.trim(); if (!t || t.startsWith('#')) return
    const eq = t.indexOf('='); if (eq < 0) return
    process.env[t.slice(0, eq).trim()] = t.slice(eq + 1).trim()
  })
}

const DATA_DIR = process.env.LOCAL_DB_PATH ||
  path.resolve(__dirname, '..', '.local-db').replace(/\\/g, '/')

const NOW = new Date().toISOString()

async function exec(db, sql) {
  try { await db.query(sql) }
  catch (e) {
    if (!e.message.includes('already exists') && !e.message.includes('duplicate'))
      console.warn('  WARN:', e.message.slice(0, 80))
  }
}

async function ins(db, table, data) {
  const id = randomUUID()
  const row = { id, created_at: NOW, ...data }
  const cols = Object.keys(row)
  const vals = Object.values(row)
  const ph   = vals.map((_, i) => `$${i + 1}`)
  const res  = await db.query(
    `INSERT INTO ${table} (${cols.join(',')}) VALUES (${ph.join(',')}) ON CONFLICT DO NOTHING RETURNING id`,
    vals
  )
  return res.rows?.[0]?.id ?? null
}

async function main() {
  console.log('\nAnkaa ERP — Apply Phase 4-17 Tables')
  console.log('─'.repeat(55))
  const db = new PGlite(DATA_DIR)

  // ── Phase 4: Assets ────────────────────────────────────────────────────────
  console.log('\n[P4] Asset System tables…')
  await exec(db, `CREATE TABLE IF NOT EXISTS asset_categories (
    id TEXT PRIMARY KEY DEFAULT '', name TEXT UNIQUE NOT NULL,
    description TEXT, created_at TEXT)`)
  await exec(db, `CREATE TABLE IF NOT EXISTS asset_locations (
    id TEXT PRIMARY KEY DEFAULT '', name TEXT UNIQUE NOT NULL,
    floor TEXT, building TEXT, created_at TEXT)`)
  await exec(db, `CREATE TABLE IF NOT EXISTS assets (
    id TEXT PRIMARY KEY DEFAULT '', asset_id TEXT UNIQUE, name TEXT NOT NULL,
    category_id TEXT, company_id TEXT, location_id TEXT,
    assigned_to TEXT, condition TEXT DEFAULT 'good', status TEXT DEFAULT 'available',
    purchase_date TEXT, purchase_price REAL, current_value REAL,
    serial_number TEXT, warranty_expiry TEXT, notes TEXT,
    created_at TEXT, updated_at TEXT)`)
  await exec(db, `CREATE TABLE IF NOT EXISTS asset_movements (
    id TEXT PRIMARY KEY DEFAULT '', asset_id TEXT NOT NULL,
    from_location TEXT, to_location TEXT, moved_by TEXT,
    moved_at TEXT, notes TEXT)`)
  console.log('  ✓ Tables created')

  // Seed asset categories
  const cats = [
    { name: 'Laptop / Computer',   description: 'Laptops, desktops, workstations' },
    { name: 'Mobile Device',       description: 'Phones, tablets' },
    { name: 'Networking',          description: 'Routers, switches, access points' },
    { name: 'Drone',               description: 'UAV / drone equipment' },
    { name: 'Camera / AV',         description: 'Cameras, projectors, screens' },
    { name: 'Furniture',           description: 'Desks, chairs, cabinets' },
    { name: 'Vehicle',             description: 'Company vehicles' },
    { name: 'Lab Equipment',       description: 'Tech Lab instruments and tools' },
    { name: 'Software License',    description: 'Licensed software and subscriptions' },
  ]
  const catMap = {}
  for (const c of cats) {
    const id = await ins(db, 'asset_categories', { name: c.name, description: c.description })
    if (id) catMap[c.name] = id
  }

  // Seed locations
  const locs = [
    { name: 'Main Office — Muscat', building: 'Ankaa HQ', floor: 'Ground' },
    { name: 'Tech Lab',             building: 'Ankaa HQ', floor: '1st Floor' },
    { name: 'Server Room',          building: 'Ankaa HQ', floor: 'Ground' },
    { name: 'Space Department',     building: 'Ankaa HQ', floor: '2nd Floor' },
    { name: 'Field / External',     building: null,        floor: null },
  ]
  const locMap = {}
  for (const l of locs) {
    const id = await ins(db, 'asset_locations', { name: l.name, building: l.building, floor: l.floor })
    if (id) locMap[l.name] = id
  }

  // Seed real Ankaa assets
  const ASSETS = [
    { asset_id:'ANK-A001', name:'Dell Latitude 5540 — Omar',       cat:'Laptop / Computer', loc:'Main Office — Muscat', co:'ankaa', cond:'good',  status:'assigned', price:450,  val:380, pdate:'2024-03-01', wdate:'2027-03-01', sn:'DL5540-001' },
    { asset_id:'ANK-A002', name:'Dell Latitude 5540 — Palwasha',   cat:'Laptop / Computer', loc:'Main Office — Muscat', co:'ankaa', cond:'good',  status:'assigned', price:450,  val:380, pdate:'2024-03-01', wdate:'2027-03-01', sn:'DL5540-002' },
    { asset_id:'ANK-A003', name:'MacBook Pro 14" — Ashraf',        cat:'Laptop / Computer', loc:'Main Office — Muscat', co:'ankaa', cond:'new',   status:'assigned', price:1200, val:1150,pdate:'2025-01-01', wdate:'2028-01-01', sn:'MBP14-001'  },
    { asset_id:'ANK-A004', name:'Dell Laptop — Rahma',              cat:'Laptop / Computer', loc:'Main Office — Muscat', co:'ankaa', cond:'good',  status:'assigned', price:420,  val:350, pdate:'2024-05-01', wdate:'2027-05-01', sn:'DL5540-003' },
    { asset_id:'ANK-A005', name:'Dell Laptop — Rayan',              cat:'Laptop / Computer', loc:'Main Office — Muscat', co:'ankaa', cond:'good',  status:'assigned', price:420,  val:350, pdate:'2024-05-01', wdate:'2027-05-01', sn:'DL5540-004' },
    { asset_id:'ANK-A006', name:'HP Elitebook — Mohammed Almaskari',cat:'Laptop / Computer', loc:'Main Office — Muscat', co:'ankaa', cond:'fair',  status:'assigned', price:400,  val:280, pdate:'2023-08-01', wdate:'2026-08-01', sn:'HPE-001'    },
    { asset_id:'ANK-A007', name:'Cisco Switch 24-Port',             cat:'Networking',        loc:'Server Room',          co:'ankaa', cond:'good',  status:'available',price:350,  val:300, pdate:'2024-01-01', wdate:'2027-01-01', sn:'CSW24-001'  },
    { asset_id:'ANK-A008', name:'Ubiquiti AP AC Pro x3',            cat:'Networking',        loc:'Main Office — Muscat', co:'ankaa', cond:'good',  status:'available',price:180,  val:150, pdate:'2024-01-01', wdate:'2027-01-01', sn:'UAP-001'    },
    { asset_id:'ANK-A009', name:'DJI Mavic 3 Enterprise',           cat:'Drone',             loc:'Tech Lab',             co:'ankaa', cond:'good',  status:'available',price:2200, val:2000,pdate:'2024-06-01', wdate:'2026-06-01', sn:'DJI-M3E-001'},
    { asset_id:'ANK-A010', name:'DJI Matrice 300 RTK',              cat:'Drone',             loc:'Space Department',     co:'gis',   cond:'good',  status:'available',price:8000, val:7200,pdate:'2023-11-01', wdate:'2026-11-01', sn:'DJI-300-001'},
    { asset_id:'ANK-A011', name:'Sony FX3 Camera',                  cat:'Camera / AV',       loc:'Main Office — Muscat', co:'ankaa', cond:'good',  status:'available',price:900,  val:800, pdate:'2024-02-01', wdate:'2027-02-01', sn:'SONY-FX3-001'},
    { asset_id:'ANK-A012', name:'Dell PowerEdge Server',            cat:'Networking',        loc:'Server Room',          co:'ankaa', cond:'good',  status:'available',price:3500, val:3000,pdate:'2024-04-01', wdate:'2027-04-01', sn:'DPES-001'   },
    { asset_id:'ANK-A013', name:'Oscilloscope — Tech Lab',          cat:'Lab Equipment',     loc:'Tech Lab',             co:'ankaa', cond:'good',  status:'available',price:1200, val:1100,pdate:'2024-07-01', wdate:'2027-07-01', sn:'OSC-001'    },
    { asset_id:'ANK-A014', name:'Microsoft 365 Business Premium x30',cat:'Software License', loc:'Main Office — Muscat', co:'ankaa', cond:'new',   status:'available',price:4500, val:4500,pdate:'2026-01-01', wdate:'2027-01-01', sn:'MS365-001'  },
    { asset_id:'ANK-A015', name:'OutSystems Developer License x5',  cat:'Software License',  loc:'Main Office — Muscat', co:'ankaa', cond:'new',   status:'available',price:12000,val:12000,pdate:'2026-03-01',wdate:'2027-03-01', sn:'OS-LIC-001' },
  ]

  let aCount = 0
  for (const a of ASSETS) {
    const id = await ins(db, 'assets', {
      asset_id: a.asset_id, name: a.name,
      category_id: catMap[a.cat] ?? null,
      location_id: locMap[a.loc] ?? null,
      company_id: a.co, condition: a.cond, status: a.status,
      purchase_date: a.pdate, purchase_price: a.price, current_value: a.val,
      warranty_expiry: a.wdate, serial_number: a.sn,
      updated_at: NOW,
    })
    if (id) aCount++
  }
  console.log(`  ✓ ${Object.keys(catMap).length} categories, ${Object.keys(locMap).length} locations, ${aCount} assets`)

  // ── Phase 5: Fleet ─────────────────────────────────────────────────────────
  console.log('\n[P5] Fleet tables…')
  for (const sql of [
    `CREATE TABLE IF NOT EXISTS fleet_vehicles (
      id TEXT PRIMARY KEY DEFAULT '', category TEXT DEFAULT 'ankaa',
      vehicle_name TEXT NOT NULL, model TEXT, license_plate_number TEXT,
      license_plate_alphabets TEXT, color TEXT, year INTEGER,
      status TEXT DEFAULT 'available', mileage REAL DEFAULT 0,
      fuel_type TEXT DEFAULT 'petrol', registration_expiry_date TEXT,
      insurance_expiry_date TEXT, notes TEXT, created_at TEXT, updated_at TEXT)`,
    `CREATE TABLE IF NOT EXISTS fleet_drivers (
      id TEXT PRIMARY KEY DEFAULT '', user_id TEXT, name TEXT NOT NULL,
      phone TEXT, license_number TEXT, license_expiry TEXT, category TEXT,
      status TEXT DEFAULT 'active', joined_date TEXT, created_at TEXT, updated_at TEXT)`,
    `CREATE TABLE IF NOT EXISTS fleet_drones (
      id TEXT PRIMARY KEY DEFAULT '', drone_name TEXT NOT NULL, model TEXT,
      registration_number TEXT UNIQUE, category TEXT DEFAULT 'ankaa',
      status TEXT DEFAULT 'available', flight_hours REAL DEFAULT 0,
      last_maintenance TEXT, next_maintenance TEXT, notes TEXT,
      created_at TEXT, updated_at TEXT)`,
    `CREATE TABLE IF NOT EXISTS fleet_pilots (
      id TEXT PRIMARY KEY DEFAULT '', user_id TEXT, name TEXT NOT NULL,
      phone TEXT, drone_category TEXT DEFAULT 'small', total_flight_hours REAL DEFAULT 0,
      license_number TEXT, license_expiry TEXT, status TEXT DEFAULT 'active',
      created_at TEXT, updated_at TEXT)`,
    `CREATE TABLE IF NOT EXISTS fleet_trips (
      id TEXT PRIMARY KEY DEFAULT '', vehicle_id TEXT, driver_id TEXT,
      requested_by TEXT, purpose TEXT, destination TEXT, departure TEXT,
      return_time TEXT, mileage_start REAL, mileage_end REAL,
      status TEXT DEFAULT 'pending', notes TEXT, created_at TEXT, updated_at TEXT)`,
  ]) await exec(db, sql)
  console.log('  ✓ Tables created')

  // Seed fleet vehicles (Ankaa real fleet based on company knowledge)
  const VEHICLES = [
    { cat:'ankaa', name:'Toyota Land Cruiser 200', model:'LC200 2022', num:'2145', alpha:'ANK', color:'White', year:2022, mileage:45000, fuel:'petrol', reg:'2026-12-31', ins:'2026-12-31' },
    { cat:'ankaa', name:'Toyota Hilux Double Cab', model:'Hilux 2021', num:'8832', alpha:'ANK', color:'White', year:2021, mileage:62000, fuel:'petrol', reg:'2026-09-30', ins:'2026-09-30' },
    { cat:'ankaa', name:'Mitsubishi Pajero Sport',  model:'Pajero 2023',num:'3741', alpha:'ANK', color:'Silver',year:2023, mileage:28000, fuel:'petrol', reg:'2027-02-28', ins:'2027-02-28' },
    { cat:'gis',   name:'Toyota Fortuner',          model:'Fortuner 2022',num:'5512',alpha:'GIS',color:'White',year:2022, mileage:38000, fuel:'petrol', reg:'2026-11-30', ins:'2026-11-30' },
    { cat:'taqa',  name:'Toyota Camry',             model:'Camry 2023', num:'7023', alpha:'TQA', color:'Black', year:2023, mileage:22000, fuel:'petrol', reg:'2027-01-31', ins:'2027-01-31' },
  ]

  for (const v of VEHICLES) {
    await ins(db, 'fleet_vehicles', {
      category: v.cat, vehicle_name: v.name, model: v.model,
      license_plate_number: v.num, license_plate_alphabets: v.alpha,
      color: v.color, year: v.year, mileage: v.mileage, fuel_type: v.fuel,
      registration_expiry_date: v.reg, insurance_expiry_date: v.ins,
      status: 'available', updated_at: NOW,
    })
  }

  // Seed fleet drivers
  const DRIVERS = [
    { name:'Ahmed Al Balushi',  phone:'+96891500001', lic:'OM-DL-10001', exp:'2027-06-30', cat:'Heavy' },
    { name:'Khalid Al Harthi',  phone:'+96891500002', lic:'OM-DL-10002', exp:'2028-03-31', cat:'Light' },
    { name:'Said Al Wahaibi',   phone:'+96891500003', lic:'OM-DL-10003', exp:'2026-12-31', cat:'Light' },
  ]
  for (const d of DRIVERS) {
    await ins(db, 'fleet_drivers', {
      name: d.name, phone: d.phone, license_number: d.lic,
      license_expiry: d.exp, category: d.cat, status: 'active',
      joined_date: '2023-01-01', updated_at: NOW,
    })
  }

  // Seed drones
  const DRONES = [
    { name:'Ankaa-UAV-01', model:'DJI Mavic 3 Enterprise', reg:'OM-UAV-2024-001', cat:'ankaa', hours:124.5, lastM:'2026-03-01', nextM:'2026-09-01' },
    { name:'GIS-UAV-01',   model:'DJI Matrice 300 RTK',    reg:'OM-UAV-2023-002', cat:'gis',   hours:287.0, lastM:'2026-02-01', nextM:'2026-08-01' },
    { name:'Ankaa-UAV-02', model:'DJI Mini 4 Pro',         reg:'OM-UAV-2025-003', cat:'ankaa', hours:45.5,  lastM:'2026-05-01', nextM:'2026-11-01' },
  ]
  for (const d of DRONES) {
    await ins(db, 'fleet_drones', {
      drone_name: d.name, model: d.model, registration_number: d.reg,
      category: d.cat, flight_hours: d.hours, status: 'available',
      last_maintenance: d.lastM, next_maintenance: d.nextM, updated_at: NOW,
    })
  }

  // Seed pilots
  const PILOTS = [
    { name:'Mazin Al Toubi',    phone:'+96891234023', cat:'medium', hours:312.5, lic:'OM-P-2024-001', exp:'2027-06-30' },
    { name:'Fuhood Al Haddabi', phone:'+96891234010', cat:'large',  hours:487.0, lic:'OM-P-2023-002', exp:'2026-12-31' },
  ]
  for (const p of PILOTS) {
    await ins(db, 'fleet_pilots', {
      name: p.name, phone: p.phone, drone_category: p.cat,
      total_flight_hours: p.hours, license_number: p.lic,
      license_expiry: p.exp, status: 'active', updated_at: NOW,
    })
  }
  console.log(`  ✓ ${VEHICLES.length} vehicles, ${DRIVERS.length} drivers, ${DRONES.length} drones, ${PILOTS.length} pilots`)

  // ── Phase 8: Service Requests ──────────────────────────────────────────────
  console.log('\n[P8] Service Requests table…')
  await exec(db, `CREATE TABLE IF NOT EXISTS service_requests (
    id TEXT PRIMARY KEY DEFAULT '', title TEXT NOT NULL, description TEXT,
    category TEXT DEFAULT 'it', priority TEXT DEFAULT 'medium',
    status TEXT DEFAULT 'open', requester_id TEXT, assigned_to TEXT,
    sla_hours INTEGER DEFAULT 24, due_at TEXT, resolved_at TEXT,
    resolution TEXT, created_at TEXT, updated_at TEXT)`)
  console.log('  ✓ Table created')

  // ── Phase 11–17: Remaining tables ─────────────────────────────────────────
  console.log('\n[P11-P17] Remaining phase tables…')
  const remainingTables = [
    `CREATE TABLE IF NOT EXISTS job_postings (
      id TEXT PRIMARY KEY DEFAULT '', title TEXT NOT NULL, department_id TEXT,
      description TEXT, requirements TEXT, status TEXT DEFAULT 'draft',
      salary_min REAL, salary_max REAL, posted_at TEXT, closes_at TEXT,
      created_by TEXT, created_at TEXT, updated_at TEXT)`,
    `CREATE TABLE IF NOT EXISTS recruitments (
      id TEXT PRIMARY KEY DEFAULT '', job_posting_id TEXT, applicant_name TEXT NOT NULL,
      applicant_email TEXT, applicant_phone TEXT, cv_url TEXT,
      stage TEXT DEFAULT 'applied', notes TEXT, interviewed_by TEXT,
      hired_user_id TEXT, created_at TEXT, updated_at TEXT)`,
    `CREATE TABLE IF NOT EXISTS performance_reviews (
      id TEXT PRIMARY KEY DEFAULT '', user_id TEXT NOT NULL, reviewer_id TEXT,
      period TEXT NOT NULL, rating REAL, strengths TEXT, areas_to_improve TEXT,
      goals_next TEXT, comments TEXT, status TEXT DEFAULT 'draft',
      reviewed_at TEXT, acknowledged_at TEXT, created_at TEXT, updated_at TEXT)`,
    `CREATE TABLE IF NOT EXISTS training_records (
      id TEXT PRIMARY KEY DEFAULT '', user_id TEXT NOT NULL, title TEXT NOT NULL,
      provider TEXT, category TEXT, start_date TEXT, end_date TEXT, hours REAL,
      certificate_url TEXT, status TEXT DEFAULT 'enrolled',
      notes TEXT, created_at TEXT, updated_at TEXT)`,
    `CREATE TABLE IF NOT EXISTS vendors (
      id TEXT PRIMARY KEY DEFAULT '', name TEXT UNIQUE NOT NULL, category TEXT,
      contact_name TEXT, email TEXT, phone TEXT, address TEXT, cr_number TEXT,
      status TEXT DEFAULT 'active', created_at TEXT, updated_at TEXT)`,
    `CREATE TABLE IF NOT EXISTS purchase_orders (
      id TEXT PRIMARY KEY DEFAULT '', po_number TEXT UNIQUE NOT NULL,
      vendor_id TEXT, requested_by TEXT, approved_by TEXT, cost_center TEXT,
      total_amount REAL DEFAULT 0, currency TEXT DEFAULT 'OMR',
      status TEXT DEFAULT 'draft', order_date TEXT, expected_date TEXT,
      received_date TEXT, notes TEXT, created_at TEXT, updated_at TEXT)`,
    `CREATE TABLE IF NOT EXISTS purchase_order_items (
      id TEXT PRIMARY KEY DEFAULT '', po_id TEXT NOT NULL, description TEXT NOT NULL,
      quantity REAL DEFAULT 1, unit TEXT DEFAULT 'pcs', unit_price REAL DEFAULT 0,
      total_price REAL DEFAULT 0, received_qty REAL DEFAULT 0)`,
    `CREATE TABLE IF NOT EXISTS document_categories (
      id TEXT PRIMARY KEY DEFAULT '', name TEXT UNIQUE NOT NULL,
      description TEXT, created_at TEXT)`,
    `CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY DEFAULT '', title TEXT NOT NULL, category_id TEXT,
      file_url TEXT, file_name TEXT, file_size INTEGER, file_type TEXT,
      version TEXT DEFAULT '1.0', status TEXT DEFAULT 'active',
      owner_id TEXT, department_id TEXT, tags TEXT DEFAULT '[]',
      uploaded_at TEXT, expires_at TEXT, created_at TEXT, updated_at TEXT)`,
    `CREATE TABLE IF NOT EXISTS mail_register (
      id TEXT PRIMARY KEY DEFAULT '', ref_number TEXT UNIQUE NOT NULL,
      direction TEXT NOT NULL, subject TEXT NOT NULL, sender TEXT,
      recipient TEXT, department_id TEXT, document_id TEXT,
      received_date TEXT, sent_date TEXT, status TEXT DEFAULT 'pending',
      action_required TEXT, actioned_by TEXT, notes TEXT,
      created_at TEXT, updated_at TEXT)`,
    `CREATE TABLE IF NOT EXISTS risk_register (
      id TEXT PRIMARY KEY DEFAULT '', title TEXT NOT NULL, description TEXT,
      category TEXT DEFAULT 'operational', likelihood INTEGER DEFAULT 3,
      impact INTEGER DEFAULT 3, risk_score INTEGER, owner_id TEXT,
      status TEXT DEFAULT 'open', mitigation TEXT, review_date TEXT,
      created_at TEXT, updated_at TEXT)`,
    `CREATE TABLE IF NOT EXISTS audits (
      id TEXT PRIMARY KEY DEFAULT '', title TEXT NOT NULL,
      audit_type TEXT DEFAULT 'internal', department_id TEXT, auditor_id TEXT,
      status TEXT DEFAULT 'planned', scheduled_date TEXT, completed_date TEXT,
      findings TEXT, recommendations TEXT, follow_up_date TEXT,
      created_at TEXT, updated_at TEXT)`,
    `CREATE TABLE IF NOT EXISTS csr_activities (
      id TEXT PRIMARY KEY DEFAULT '', title TEXT NOT NULL,
      category TEXT DEFAULT 'community', description TEXT,
      budget REAL DEFAULT 0, currency TEXT DEFAULT 'OMR', beneficiaries TEXT,
      status TEXT DEFAULT 'planned', start_date TEXT, end_date TEXT,
      lead_id TEXT, outcome TEXT, created_at TEXT, updated_at TEXT)`,
    `CREATE TABLE IF NOT EXISTS government_relations (
      id TEXT PRIMARY KEY DEFAULT '', entity_name TEXT NOT NULL,
      contact_name TEXT, contact_email TEXT, contact_phone TEXT,
      relationship_type TEXT DEFAULT 'regulatory', notes TEXT,
      next_follow_up TEXT, owner_id TEXT, created_at TEXT, updated_at TEXT)`,
    `CREATE TABLE IF NOT EXISTS government_submissions (
      id TEXT PRIMARY KEY DEFAULT '', relation_id TEXT, title TEXT NOT NULL,
      submission_type TEXT DEFAULT 'report', due_date TEXT, submitted_date TEXT,
      status TEXT DEFAULT 'pending', document_id TEXT, notes TEXT,
      created_at TEXT, updated_at TEXT)`,
  ]
  let t = 0
  for (const sql of remainingTables) { await exec(db, sql); t++ }
  console.log(`  ✓ ${t} tables created`)

  // Seed 4 HR risk items (pre-seeded per P6 plan)
  const hrRisks = [
    { title:'High Staff Turnover',             cat:'hr',          like:3, imp:4, mit:'Competitive salaries + career paths + ERP transparency' },
    { title:'Unplanned Leave Impact on Projects',cat:'operational',like:3, imp:3, mit:'Leave visibility + cover assignments in ERP' },
    { title:'Payroll Non-Compliance (GOSI)',    cat:'compliance',  like:2, imp:5, mit:'Automated GOSI calculation in payroll module' },
    { title:'Data Privacy Breach (Employee)',   cat:'it',          like:2, imp:5, mit:'Role-based access control + audit logging in ERP' },
  ]
  for (const r of hrRisks) {
    await ins(db, 'risk_register', {
      title: r.title, category: r.cat, likelihood: r.like, impact: r.imp,
      risk_score: r.like * r.imp, status: 'open', mitigation: r.mit,
      review_date: '2026-09-30', updated_at: NOW,
    })
  }
  console.log(`  ✓ 4 HR risk items seeded`)

  // Final counts
  const tables = await db.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name")
  console.log('\n' + '─'.repeat(55))
  console.log(`✅  Done — ${tables.rows.length} total tables in DB`)
  console.log('─'.repeat(55) + '\n')

  await db.close()
}

main().catch(e => { console.error('\nFailed:', e.message); process.exit(1) })
