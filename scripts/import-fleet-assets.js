/**
 * Import fleet + asset data from old projects into Ankaa ERP.
 * Uses the same PGlite pattern as setup-local-db.js.
 * Run BEFORE starting the dev server (single-writer constraint).
 *
 *   node scripts/import-fleet-assets.js
 */

const fs   = require('fs')
const path = require('path')
const { randomUUID } = require('crypto')

// ── Load .env.local ───────────────────────────────────────────────────────────
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

const FLEET_DB  = 'C:/Users/MD Ashraf/Desktop/Ankaa S&T/fleet-final-main/fleet-final-main/db.sqlite3'
const ASSET_DIR = 'C:/Users/MD Ashraf/Desktop/Ankaa S&T/asset_management-master/asset_management-master'
const DATA_DIR  = path.join(__dirname, '..', '.local-db').replace(/\\/g, '/')

function uuid()   { return randomUUID() }
function now()    { return new Date().toISOString() }
function toNum(v) { if (v == null || v === '') return null; const n = Number(v); return isNaN(n) ? null : n }
function toDate(v) {
  if (!v) return null
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) return v
  try { const d = new Date(v); return isNaN(d) ? null : d.toISOString() } catch { return null }
}

function sqliteAll(db, sql) {
  const stmt = db.prepare(sql)
  const rows = []
  while (stmt.step()) rows.push(stmt.getAsObject())
  stmt.free()
  return rows
}

function readDjangoFixture(filePath) {
  const buf  = fs.readFileSync(filePath)
  const text = buf.toString('utf16le').replace(/^﻿/, '')
  return JSON.parse(text)
}

// ── PHASE 1: Extract all data using sql.js (WASM SQLite) ──────────────────────
async function extractData() {
  const initSqlJs = require('sql.js')
  const SQL = await initSqlJs()
  const buf = fs.readFileSync(FLEET_DB)
  const db  = new SQL.Database(buf)

  const src = {
    vehicles:         sqliteAll(db, 'SELECT * FROM cars_vehicle ORDER BY id'),
    drivers:          sqliteAll(db, 'SELECT * FROM cars_driver ORDER BY id'),
    pilots:           sqliteAll(db, 'SELECT * FROM cars_pilot ORDER BY id'),
    drones:           sqliteAll(db, 'SELECT * FROM cars_drone ORDER BY id'),
    assignments:      sqliteAll(db, 'SELECT * FROM cars_vehicleassignment ORDER BY id'),
    maintenance:      sqliteAll(db, 'SELECT * FROM cars_maintenancerecord ORDER BY id'),
    bills:            sqliteAll(db, 'SELECT * FROM cars_carbill ORDER BY id'),
    droneAssignments: sqliteAll(db, 'SELECT * FROM cars_droneassignment ORDER BY id'),
    flightLogs:       sqliteAll(db, 'SELECT * FROM cars_flightlog ORDER BY id'),
    fixture:          readDjangoFixture(path.join(ASSET_DIR, 'assets_data.json')),
    part1:            JSON.parse(fs.readFileSync(path.join(ASSET_DIR, 'assets_data_part1.json'), 'utf8')),
  }

  db.close()
  return src
}

// ── PHASE 2: Write to PGlite ──────────────────────────────────────────────────
async function importData(src) {
  const { PGlite } = require('@electric-sql/pglite')
  const pg = new PGlite(DATA_DIR)

  // Simple insert ignoring conflicts
  async function ins(table, row) {
    const cols = Object.keys(row).filter(k => row[k] !== undefined)
    const vals = cols.map(k => row[k])
    const ph   = vals.map((_, i) => `$${i + 1}`)
    await pg.query(
      `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${ph.join(', ')}) ON CONFLICT DO NOTHING`,
      vals
    ).catch(() => {/* silently skip FK violations / dupes */})
  }

  // ── Fleet ──────────────────────────────────────────────────────────────────
  const vehicleIdMap = {}
  for (const v of src.vehicles) {
    const id = uuid()
    vehicleIdMap[v.id] = id
    await ins('fleet_vehicles', {
      id, category: v.category||'ankaa', vehicle_name: v.vehicle_name||'Vehicle',
      model: v.model||null, license_plate_number: v.license_plate_number||null,
      license_plate_alphabets: v.license_plate_alphabets||null, color: v.color||null,
      year: toNum(v.year), status: v.status||'available', mileage: toNum(v.mileage)??0,
      fuel_type: v.fuel_type||null,
      registration_issue_date: toDate(v.registration_issue_date),
      registration_expiry_date: toDate(v.registration_expiry_date),
      insurance_expiry_date: toDate(v.insurance_expiry_date),
      operating_card_number: v.operating_card_number||null,
      operating_card_issue_date: toDate(v.operating_card_issue_date),
      operating_card_expiry_date: toDate(v.operating_card_expiry_date),
      notes: v.notes||null,
      created_at: toDate(v.created_at)||now(), updated_at: toDate(v.updated_at)||now(),
    })
  }

  const driverIdMap = {}
  for (const d of src.drivers) {
    const id = uuid()
    driverIdMap[d.id] = id
    await ins('fleet_drivers', {
      id, name: d.name||'Driver', phone: d.phone||null, email: d.email||null,
      address: d.address||null, license_number: d.license_number||null,
      license_expiry: toDate(d.license_expiry), category: d.category||null,
      status: d.status||'active', joined_date: toDate(d.joined_date),
      created_at: toDate(d.created_at)||now(), updated_at: toDate(d.updated_at)||now(),
    })
  }

  const pilotIdMap = {}
  for (const p of src.pilots) {
    const id = uuid()
    pilotIdMap[p.id] = id
    await ins('fleet_pilots', {
      id, name: p.name||'Pilot', phone: p.phone||null, email: p.email||null,
      address: p.address||null, drone_category: p.drone_category||'small',
      total_flight_hours: toNum(p.total_flight_hours)??0,
      license_number: p.license_number||null, license_expiry: toDate(p.license_expiry),
      status: p.status||'active',
      created_at: toDate(p.created_at)||now(), updated_at: toDate(p.updated_at)||now(),
    })
  }

  const droneIdMap = {}
  for (const d of src.drones) {
    const id = uuid()
    droneIdMap[d.id] = id
    await ins('fleet_drones', {
      id, drone_name: d.drone_name||d.name||'Drone', model: d.model||null,
      registration_number: d.registration_number||null, category: d.category||'ankaa',
      status: d.status||'available', flight_hours: toNum(d.flight_hours)??0,
      registration_date: toDate(d.registration_date),
      last_maintenance: toDate(d.last_maintenance), next_maintenance: toDate(d.next_maintenance),
      notes: d.notes||null,
      created_at: toDate(d.created_at)||now(), updated_at: toDate(d.updated_at)||now(),
    })
  }

  for (const a of src.assignments) {
    const vid = vehicleIdMap[a.vehicle_id], did = driverIdMap[a.driver_id]
    if (!vid || !did) continue
    await ins('fleet_vehicle_assignments', {
      id: uuid(), vehicle_id: vid, driver_id: did,
      start_condition: a.start_condition||'good', start_condition_note: a.start_condition_note||null,
      end_condition: a.end_condition||null, end_condition_note: a.end_condition_note||null,
      return_notes: a.return_notes||null, start_mileage: toNum(a.start_mileage),
      end_mileage: toNum(a.end_mileage), assignment_date: toDate(a.assignment_date),
      assignment_time: a.assignment_time||null, return_date: toDate(a.return_date),
      return_time: a.return_time||null, is_active: a.is_active ? 1 : 0,
      created_at: toDate(a.created_at)||now(), updated_at: toDate(a.updated_at)||now(),
    })
  }

  for (const m of src.maintenance) {
    const vid = vehicleIdMap[m.vehicle_id]
    if (!vid) continue
    await ins('fleet_vehicle_maintenance', {
      id: uuid(), vehicle_id: vid, issue_type: m.issue_type||'other',
      oil_change_details: m.oil_change_details||null, status: m.status||'pending',
      reported_date: toDate(m.reported_date), completion_date: toDate(m.completion_date),
      cost: toNum(m.cost), notes: m.notes||null, parts_replaced: m.parts_replaced||null,
      created_at: toDate(m.reported_date)||now(), updated_at: now(),
    })
  }

  for (const b of src.bills) {
    await ins('fleet_vehicle_bills', {
      id: uuid(), vehicle_id: vehicleIdMap[b.vehicle_id]||null,
      bill_number: b.bill_number||null, bill_date: toDate(b.bill_date),
      amount: toNum(b.amount), description: b.description||null, mileage: toNum(b.mileage),
      created_at: toDate(b.created_at)||now(), updated_at: now(),
    })
  }

  for (const da of src.droneAssignments) {
    const did = droneIdMap[da.drone_id], pid = pilotIdMap[da.pilot_id]
    if (!did || !pid) continue
    await ins('fleet_drone_assignments', {
      id: uuid(), drone_id: did, pilot_id: pid,
      start_condition: da.start_condition||'good', start_condition_note: da.start_condition_note||null,
      end_condition: da.end_condition||null, end_condition_note: da.end_condition_note||null,
      start_flight_hours: toNum(da.start_flight_hours)??0, end_flight_hours: toNum(da.end_flight_hours),
      assignment_date: toDate(da.assignment_date), return_date: toDate(da.return_date),
      is_active: da.is_active ? 1 : 0, start_location: da.start_location||null,
      end_location: da.end_location||null,
      created_at: toDate(da.created_at)||now(), updated_at: now(),
    })
  }

  for (const fl of src.flightLogs) {
    await ins('fleet_flight_logs', {
      id: uuid(), pilot_id: pilotIdMap[fl.pilot_id]||null, drone_id: droneIdMap[fl.drone_id]||null,
      mission_name: fl.mission_name||fl.name||'Mission',
      start_time: toDate(fl.start_time), end_time: toDate(fl.end_time),
      flight_duration: toNum(fl.flight_duration)??0, start_location: fl.start_location||null,
      end_location: fl.end_location||null, status: fl.status||'completed',
      weather_conditions: fl.weather_conditions||null, wind_speed: toNum(fl.wind_speed),
      temperature: toNum(fl.temperature), notes: fl.notes||null,
      created_at: toDate(fl.created_at)||now(), updated_at: now(),
    })
  }

  // ── Assets ─────────────────────────────────────────────────────────────────
  const catMap  = {}
  const locMap  = {}
  const vendMap = {}

  // Categories from fixture
  for (const r of src.fixture.filter(x => x.model === 'assets.assetcategory')) {
    const id = uuid(); catMap[r.pk] = id
    await ins('asset_categories', { id, name: r.fields.name, description: r.fields.description||null, created_at: now() })
  }

  // Locations from fixture
  const seenLocNames = new Set()
  for (const r of src.fixture.filter(x => x.model === 'assets.location')) {
    const id = uuid(); locMap[r.pk] = id
    const key = r.fields.name.toLowerCase()
    locMap['n:' + key] = id; seenLocNames.add(key)
    await ins('asset_locations', { id, name: r.fields.name, address: r.fields.address||null, created_at: now() })
  }
  // Extra locations from part1
  for (const a of src.part1) {
    if (!a.location) continue
    const key = a.location.toLowerCase().trim()
    if (seenLocNames.has(key)) continue
    seenLocNames.add(key)
    const id = uuid(); locMap['n:' + key] = id
    await ins('asset_locations', { id, name: a.location.trim(), created_at: now() })
  }

  // Vendors from fixture
  const seenVendNames = new Set()
  for (const r of src.fixture.filter(x => x.model === 'assets.vendor')) {
    const id = uuid(); vendMap[r.pk] = id
    const key = r.fields.name.toLowerCase()
    vendMap['n:' + key] = id; seenVendNames.add(key)
    await ins('asset_vendors', {
      id, name: r.fields.name, contact_person: r.fields.contact_person||null,
      email: r.fields.email||null, phone: r.fields.phone||null, address: r.fields.address||null,
      created_at: now(), updated_at: now(),
    })
  }
  // Extra vendors from part1
  for (const a of src.part1) {
    if (!a.vendor || !a.vendor.trim()) continue
    const key = a.vendor.toLowerCase().trim()
    if (seenVendNames.has(key)) continue
    seenVendNames.add(key)
    const id = uuid(); vendMap['n:' + key] = id
    await ins('asset_vendors', { id, name: a.vendor.trim(), created_at: now(), updated_at: now() })
  }

  // Extra categories from part1
  const seenCatNames = new Set(Object.values(src.fixture.filter(x=>x.model==='assets.assetcategory').map(r=>r.fields.name.toLowerCase())))
  for (const a of src.part1) {
    if (!a.category) continue
    const key = a.category.toLowerCase().trim()
    if (seenCatNames.has(key)) continue
    seenCatNames.add(key)
    const id = uuid(); catMap['n:' + key] = id
    await ins('asset_categories', { id, name: a.category.trim(), created_at: now() })
  }

  // Companies
  const ankaaId = uuid()
  await ins('asset_companies', { id: ankaaId, name: 'Ankaa S&T', code: 'ANKAA', created_at: now() })

  // Assets from fixture
  const seenAssetIds = new Set()
  for (const r of src.fixture.filter(x => x.model === 'assets.asset')) {
    const f = r.fields
    const assetId = f.asset_id ? String(f.asset_id) : null
    if (assetId) seenAssetIds.add(assetId.toLowerCase())
    await ins('assets', {
      id: uuid(), asset_id: assetId, name: f.name,
      condition: f.condition||'good', status: f.status||'available',
      category_id: f.category ? catMap[f.category] : null,
      company_id: ankaaId,
      location_id: f.location ? locMap[f.location] : null,
      vendor_id: f.vendor ? vendMap[f.vendor] : null,
      serial_number: f.serial_number||null, barcode: f.barcode||null,
      account_reference_number: f.account_reference_number||null,
      quantity: toNum(f.quantity)??1,
      purchase_date: toDate(f.purchase_date), purchase_price: toNum(f.purchase_price),
      current_value: toNum(f.current_value), salvage_value: toNum(f.salvage_value)??0,
      useful_life_years: toNum(f.useful_life_years)??5,
      depreciation_method: f.depreciation_method||'straight_line',
      last_depreciation_date: toDate(f.last_depreciation_date),
      warranty_expiry: toDate(f.warranty_expiration), description: f.description||null,
      created_at: toDate(f.created_at)||now(), updated_at: toDate(f.updated_at)||now(),
    })
  }

  // Assets from part1 (skip duplicates)
  for (const a of src.part1) {
    const aid = a.asset_id ? a.asset_id.replace(/\//g, '-') : null
    if (aid && seenAssetIds.has(aid.toLowerCase())) continue

    const catKey  = a.category ? 'n:' + a.category.toLowerCase().trim() : null
    const locKey  = a.location ? 'n:' + a.location.toLowerCase().trim() : null
    const vendKey = a.vendor && a.vendor.trim() ? 'n:' + a.vendor.toLowerCase().trim() : null
    const condRaw = (a.condition||'good').toLowerCase().trim()
    const cond = { 'newly purchased':'newly_purchased','new':'new','good':'good','fair':'fair','poor':'poor' }[condRaw] || 'good'

    await ins('assets', {
      id: uuid(), asset_id: aid, name: a.name, condition: cond, status: 'available',
      category_id: catKey ? catMap[catKey] : null,
      company_id: ankaaId,
      location_id: locKey ? locMap[locKey] : null,
      vendor_id: vendKey ? vendMap[vendKey] : null,
      account_reference_number: a.account_reference_number||null,
      quantity: toNum(a.quantity)??1,
      purchase_date: toDate(a.purchase_date), purchase_price: toNum(a.purchase_price),
      salvage_value: toNum(a.depreciation_salvage_value)??0,
      useful_life_years: toNum(a.useful_life_years)??5,
      warranty_expiry: toDate(a.warranty_expiration),
      created_at: now(), updated_at: now(),
    })
  }

  // ── Verify ─────────────────────────────────────────────────────────────────
  const checks = [
    ['fleet_vehicles', src.vehicles.length],
    ['fleet_drivers',  src.drivers.length],
    ['fleet_pilots',   src.pilots.length],
    ['fleet_drones',   src.drones.length],
    ['fleet_vehicle_assignments', src.assignments.length],
    ['assets', src.fixture.filter(x=>x.model==='assets.asset').length + src.part1.length],
  ]
  for (const [t, expected] of checks) {
    const r = await pg.query(`SELECT COUNT(*) AS n FROM ${t}`)
    const got = Number(r.rows[0].n)
    console.log(`  ${t.padEnd(30)} ${got} rows (expected ~${expected})`)
  }

  await pg.close()
}

async function main() {
  console.log('\nAnkaa ERP — Fleet + Asset Import')
  console.log('Phase 1: Reading source data (SQLite + JSON)...')
  const src = await extractData()
  console.log(`  Fleet: ${src.vehicles.length} vehicles, ${src.drivers.length} drivers, ${src.pilots.length} pilots, ${src.drones.length} drones`)
  console.log(`  Assets: ${src.fixture.filter(x=>x.model==='assets.asset').length} (fixture) + ${src.part1.length} (part1)`)
  console.log('Phase 2: Writing to ERP database...')
  await importData(src)
  console.log('\n✅  Done — start the dev server to see data.')
}

main().catch(e => { console.error('Failed:', e.message); process.exit(1) })
