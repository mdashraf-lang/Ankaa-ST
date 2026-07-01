import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { randomUUID } from 'crypto'
import { isAdmin, isHR } from '@/lib/auth'
import * as XLSX from 'xlsx'

export const dynamic = 'force-dynamic'

// ── Normalise a string for matching (lower-case, collapse spaces) ─────────────
function norm(s: string) { return s.toLowerCase().replace(/\s+/g, ' ').trim() }

// ── Parse time string "HH:MM:SS" or "-" → "HH:MM" or null ───────────────────
function parseTime(raw: string): string | null {
  if (!raw || raw.trim() === '-' || raw.trim() === '') return null
  const m = raw.trim().match(/^(\d{1,2}):(\d{2})/)
  if (!m) return null
  return `${m[1].padStart(2, '0')}:${m[2]}`
}

// ── Parse date string "YYYY-MM-DD" from various formats ──────────────────────
function parseDate(raw: string): string | null {
  if (!raw || raw.trim() === '-') return null
  const s = raw.trim()
  // ISO  YYYY-MM-DD
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (m) return `${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`
  // YYYY/MM/DD
  m = s.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})/)
  if (m) return `${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`
  // DD/MM/YYYY
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (m) return `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`
  return null
}

// ── Parse the iVMS-4200 "Start/End Work Time Report" xlsx ────────────────────
// Expected structure:
//   Row 0-1: blank
//   Row 2:   "Start/End Work Time Report"
//   Row 3:   date-range string
//   Row 4:   Department | Name | Date | Shift | Timetable | Check In Time | Check Out Time
//   Row 5+:  data rows (blank rows at end)
interface RawRow {
  device_name: string
  department:  string
  date:        string
  shift:       string
  timetable:   string
  check_in:    string | null
  check_out:   string | null
}

function parseWorkbook(buffer: Buffer): {
  rows: RawRow[]
  date_from: string | null
  date_to:   string | null
  period:    string
} {
  const wb = XLSX.read(buffer, { type: 'buffer', raw: false })
  const ws  = wb.Sheets[wb.SheetNames[0]]
  const raw = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, defval: '' })

  // Locate header row — scan first 8 rows for "Name" + "Date" columns
  let headerIdx = -1
  let colName = -1, colDept = -1, colDate = -1, colShift = -1, colTT = -1, colIn = -1, colOut = -1

  for (let r = 0; r < Math.min(raw.length, 8); r++) {
    const cells = raw[r].map(c => norm(String(c)))
    if (cells.includes('name') && cells.includes('date') && cells.some(c => c.includes('check'))) {
      headerIdx = r
      colDept  = cells.findIndex(c => c === 'department')
      colName  = cells.findIndex(c => c === 'name')
      colDate  = cells.findIndex(c => c === 'date')
      colShift = cells.findIndex(c => c === 'shift')
      colTT    = cells.findIndex(c => c === 'timetable')
      colIn    = cells.findIndex(c => c.includes('check') && c.includes('in'))
      colOut   = cells.findIndex(c => c.includes('check') && c.includes('out'))
      break
    }
  }

  if (headerIdx === -1 || colName === -1) {
    throw new Error(
      'Could not find report headers. Expected columns: Department, Name, Date, Check In Time, Check Out Time. ' +
      'Please export a "Start/End Work Time Report" from iVMS-4200 → Time & Attendance → Report.'
    )
  }

  // Extract period string from row 3 if present
  const periodRow = raw[3] ? String(raw[3][0] ?? '').trim() : ''

  const rows: RawRow[] = []
  for (let r = headerIdx + 1; r < raw.length; r++) {
    const row = raw[r].map(c => String(c).trim())
    const name = colName >= 0 ? row[colName] : ''
    if (!name || name === '-') continue   // skip blank rows

    const dateStr = parseDate(colDate >= 0 ? row[colDate] : '')
    if (!dateStr) continue

    rows.push({
      device_name: name,
      department:  colDept  >= 0 ? row[colDept]  : '',
      date:        dateStr,
      shift:       colShift >= 0 ? row[colShift] : '',
      timetable:   colTT    >= 0 ? row[colTT]    : '',
      check_in:    parseTime(colIn  >= 0 ? row[colIn]  : ''),
      check_out:   parseTime(colOut >= 0 ? row[colOut] : ''),
    })
  }

  const dates     = rows.map(r => r.date).filter(Boolean).sort()
  const date_from = dates[0] ?? null
  const date_to   = dates[dates.length - 1] ?? null

  return { rows, date_from, date_to, period: periodRow }
}

// ── GET /api/attendance/device-import ← import history + raw records ─────────
export async function GET(req: NextRequest) {
  const role = req.headers.get('x-user-role') || ''
  if (!isAdmin(role) && !isHR(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const date    = searchParams.get('date')     // YYYY-MM-DD
  const logId   = searchParams.get('log_id')   // filter by import batch

  // Import history
  const { data: logs } = await db
    .from('device_import_log')
    .select('*, profiles:imported_by(full_name)')
    .order('created_at', { ascending: false })
    .limit(20)

  // Raw device records (latest import or by date)
  let recordsQuery = db
    .from('device_attendance_raw')
    .select('*')
    .order('date', { ascending: false })
    .order('device_name')

  if (date)  recordsQuery = recordsQuery.eq('date', date)
  if (logId) recordsQuery = recordsQuery.eq('import_log_id', logId)
  if (!date && !logId) {
    // Default: latest import
    const latestLog = (logs ?? [])[0] as Record<string, unknown> | undefined
    if (latestLog?.id) {
      recordsQuery = recordsQuery.eq('import_log_id', latestLog.id as string)
    } else {
      recordsQuery = recordsQuery.limit(0)
    }
  }

  const { data: records } = await recordsQuery.limit(500)

  return NextResponse.json({ logs: logs ?? [], records: records ?? [] })
}

// ── POST /api/attendance/device-import ← parse XLS, store raw, process ───────
// Body: multipart/form-data { file: File, action: 'preview' | 'import' }
export async function POST(req: NextRequest) {
  const role   = req.headers.get('x-user-role') || ''
  const userId = req.headers.get('x-user-id')   || ''
  if (!isAdmin(role) && !isHR(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const form   = await req.formData()
  const file   = form.get('file') as File | null
  const action = (form.get('action') as string | null) ?? 'preview'

  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  const buffer = Buffer.from(await file.arrayBuffer())

  let parsed: ReturnType<typeof parseWorkbook>
  try {
    parsed = parseWorkbook(buffer)
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 422 })
  }

  const { rows, date_from, date_to, period } = parsed
  if (rows.length === 0) {
    return NextResponse.json({ error: 'No data rows found in the report.' }, { status: 422 })
  }

  // Load all device mappings → build name → profile lookup
  const { data: mappingsRaw } = await db
    .from('device_id_mapping')
    .select('device_name, profile_id, employee_id, profiles:profile_id(full_name)')

  const byName: Record<string, { profile_id: string; employee_id: string; full_name: string }> = {}
  for (const m of (mappingsRaw ?? []) as Record<string, unknown>[]) {
    const key = norm(m.device_name as string)
    const p   = m.profiles as Record<string, unknown> | null
    byName[key] = {
      profile_id:  m.profile_id  as string,
      employee_id: m.employee_id as string,
      full_name:   (p?.full_name as string) ?? '',
    }
  }

  // Enrich rows with profile match
  const enriched = rows.map(r => {
    const match = byName[norm(r.device_name)]
    return {
      ...r,
      profile_id:  match?.profile_id  ?? null,
      employee_id: match?.employee_id ?? null,
      full_name:   match?.full_name   ?? null,
      matched:     !!match,
    }
  })

  // ── preview: return enriched rows, do NOT write to DB ────────────────────
  if (action === 'preview') {
    return NextResponse.json({
      rows: enriched,
      date_from, date_to, period,
      total:     enriched.length,
      matched:   enriched.filter(r => r.matched).length,
      unmatched: enriched.filter(r => !r.matched).length,
    })
  }

  // ── import: write raw records + process into roster_attendance ────────────
  const now    = new Date().toISOString()
  const logId  = randomUUID()

  let matched = 0, unmatched = 0, imported = 0, skipped = 0

  // 1. Insert raw records into device_attendance_raw
  const rawInserts = enriched.map(r => ({
    id:            randomUUID(),
    import_log_id: logId,
    device_name:   r.device_name,
    department:    r.department,
    date:          r.date,
    shift:         r.shift,
    timetable:     r.timetable,
    check_in:      r.check_in,
    check_out:     r.check_out,
    profile_id:    r.profile_id,
    employee_id:   r.employee_id,
    full_name:     r.full_name,
    matched:       r.matched ? 1 : 0,
    created_at:    now,
  }))

  // Insert in batches of 50
  for (let i = 0; i < rawInserts.length; i += 50) {
    await db.from('device_attendance_raw').insert(rawInserts.slice(i, i + 50))
  }

  // 2. Process matched records into roster_attendance
  const SHIFT_START = 8 // 08:00 Oman
  for (const r of enriched) {
    if (!r.matched || !r.profile_id) { unmatched++; continue }
    matched++

    const checkInTs  = r.check_in  ? `${r.date}T${r.check_in}:00`  : null
    const checkOutTs = r.check_out ? `${r.date}T${r.check_out}:00` : null

    let status      = checkInTs ? 'present' : 'absent'
    let lateMinutes = 0
    if (checkInTs) {
      const inTime     = new Date(checkInTs)
      const shiftStart = new Date(`${r.date}T0${SHIFT_START}:00:00`)
      lateMinutes      = Math.max(0, Math.floor((inTime.getTime() - shiftStart.getTime()) / 60000))
      if (lateMinutes > 15) status = 'late'
    }

    const { error } = await db
      .from('roster_attendance')
      .upsert(
        {
          id:            randomUUID(),
          user_id:       r.profile_id,
          date:          r.date,
          status,
          clock_in:      checkInTs,
          clock_out:     checkOutTs,
          late_minutes:  lateMinutes,
          location_type: 'office',
          marked_at:     now,
          marked_by:     userId,
        },
        { onConflict: 'user_id,date' }
      )
    if (error) { skipped++; continue }
    imported++
  }

  // 3. Write import log
  await db.from('device_import_log').insert({
    id:            logId,
    imported_by:   userId,
    filename:      file.name,
    total_records: enriched.length,
    matched,
    unmatched,
    skipped,
    date_from,
    date_to,
    created_at:    now,
  })

  return NextResponse.json({
    log_id: logId,
    total: enriched.length,
    matched, unmatched, imported, skipped,
    date_from, date_to,
  })
}
