import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { isHR, isExecutive, isAdmin } from '@/lib/auth'
import { randomUUID } from 'crypto'

// Stages each role is responsible for approving
const ROLE_STAGES: Record<string, string[]> = {
  hod:   ['pending_ghassani', 'pending_yousuf', 'pending_sultan'],
  admin: ['pending_ghassani', 'pending_yousuf', 'pending_sultan', 'pending_ramimi', 'pending_hr'],
  hr:    ['pending_hr'],
  md:    ['pending_ghassani', 'pending_yousuf', 'pending_sultan', 'pending_ramimi', 'pending_hr'],
  cto:   ['pending_ghassani', 'pending_yousuf', 'pending_sultan', 'pending_ramimi', 'pending_hr'],
  coo:   ['pending_ghassani', 'pending_yousuf', 'pending_sultan', 'pending_ramimi', 'pending_hr'],
}

function getInitialStatus(role: string): string {
  if (['md', 'cto', 'coo', 'admin'].includes(role)) return 'pending_hr'
  if (['hod', 'admin', 'finance'].includes(role)) return 'pending_hr'
  if (role === 'hr') return 'pending_hr'
  return 'pending_ghassani'
}

// ── GET /api/leave-requests ───────────────────────────────────────────────────
// Uses raw SQL with LEFT JOIN so PGlite returns employee profile data correctly.
export async function GET(req: NextRequest) {
  const userId       = req.headers.get('x-user-id')!
  const role         = req.headers.get('x-user-role') || ''
  const { searchParams } = new URL(req.url)
  const filterStatus = searchParams.get('status')
  const targetUserId = searchParams.get('user_id')
  const pendingApproval = searchParams.get('pending_approval') === 'true'

  const whereParts: string[] = []
  const params: unknown[] = []
  let pi = 1

  if (pendingApproval) {
    const myStages = ROLE_STAGES[role] ?? []
    if (myStages.length === 0) return NextResponse.json({ leave_requests: [] })
    const placeholders = myStages.map(() => `$${pi++}`)
    whereParts.push(`lr.status IN (${placeholders.join(', ')})`)
    params.push(...myStages)
    whereParts.push(`lr.user_id != $${pi++}`)
    params.push(userId)
  } else if (isHR(role) || isExecutive(role) || isAdmin(role)) {
    if (targetUserId) {
      whereParts.push(`lr.user_id = $${pi++}`)
      params.push(targetUserId)
    }
  } else {
    whereParts.push(`lr.user_id = $${pi++}`)
    params.push(userId)
  }

  if (filterStatus) {
    whereParts.push(`lr.status = $${pi++}`)
    params.push(filterStatus)
  }

  const whereClause = whereParts.length ? `WHERE ${whereParts.join(' AND ')}` : ''

  const sql = `
    SELECT
      lr.*,
      p.id          AS profile_id,
      p.full_name   AS profile_full_name,
      p.email       AS profile_email,
      p.role        AS profile_role,
      p.employee_id AS profile_employee_id,
      p.position_title AS profile_position_title,
      p.department_id  AS profile_department_id
    FROM leave_requests lr
    LEFT JOIN profiles p ON p.id = lr.user_id
    ${whereClause}
    ORDER BY lr.created_at DESC
  `

  const result = await (db.query(sql, params) as Promise<{ rows: Record<string, unknown>[] }>)

  const rows = (result.rows ?? []).map(row => ({
    ...row,
    profiles: row.profile_id ? {
      id:             row.profile_id,
      full_name:      row.profile_full_name,
      email:          row.profile_email,
      role:           row.profile_role,
      employee_id:    row.profile_employee_id,
      position_title: row.profile_position_title,
      department_id:  row.profile_department_id,
    } : null,
  }))

  return NextResponse.json({ leave_requests: rows })
}

// ── POST /api/leave-requests ──────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const userId = req.headers.get('x-user-id')!
  const role   = req.headers.get('x-user-role') || ''
  const body   = await req.json()
  const { start_date, end_date, leave_type, reason, description, half_day } = body

  if (!start_date || !end_date || !leave_type || !reason) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const start  = new Date(start_date)
  const end    = new Date(end_date)
  let workDays = 0
  const cur    = new Date(start)
  while (cur <= end) {
    const dow = cur.getDay()
    if (dow !== 5 && dow !== 6) workDays++
    cur.setDate(cur.getDate() + 1)
  }
  if (half_day) workDays = Math.max(0.5, workDays - 0.5)

  const { data: profile } = await db
    .from('profiles')
    .select('joining_date, phone_number')
    .eq('id', userId)
    .single()

  const profileData = profile as Record<string, unknown> | null
  const initialStatus = getInitialStatus(role)
  const id = randomUUID()
  const now = new Date().toISOString()

  const { data, error } = await db
    .from('leave_requests')
    .insert({
      id,
      user_id:            userId,
      start_date,
      end_date,
      leave_type,
      reason,
      description:        description || null,
      total_working_days: workDays,
      half_day:           half_day ? 1 : 0,
      status:             initialStatus,
      current_approver:   initialStatus,
      current_approval_level: 1,
      approval_history:   '[]',
      joining_date:       profileData?.joining_date ?? null,
      phone_number:       profileData?.phone_number ?? null,
      created_at:         now,
      updated_at:         now,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ leave_request: data })
}
