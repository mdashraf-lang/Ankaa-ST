import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { isAdmin, isHR } from '@/lib/auth'

// ── Approval chain ────────────────────────────────────────────────────────────
const NEXT_STATUS: Record<string, string> = {
  pending_ghassani: 'pending_ramimi',
  pending_yousuf:   'pending_sultan',
  pending_sultan:   'pending_hr',
  pending_ramimi:   'pending_hr',
  pending_hr:       'approved',
}

const STAGE_FIELDS: Record<string, { at: string; by: string; col: string }> = {
  pending_ghassani: { at: 'pending_ghassani_approved_at', by: 'pending_ghassani_approved_by', col: 'pending_ghassani_comments' },
  pending_yousuf:   { at: 'pending_yousuf_approved_at',   by: 'pending_yousuf_approved_by',   col: 'pending_yousuf_comments'   },
  pending_sultan:   { at: 'pending_sultan_approved_at',   by: 'pending_sultan_approved_by',   col: 'pending_sultan_comments'   },
  pending_ramimi:   { at: 'pending_ramimi_approved_at',   by: 'pending_ramimi_approved_by',   col: 'pending_ramimi_comments'   },
  pending_hr:       { at: 'pending_hr_approved_at',       by: 'pending_hr_approved_by',       col: 'pending_hr_comments'       },
}

// Roles that can act on each stage
const STAGE_ROLES: Record<string, string[]> = {
  pending_ghassani: ['hod', 'admin', 'md', 'cto', 'coo'],
  pending_yousuf:   ['hod', 'admin', 'md', 'cto', 'coo'],
  pending_sultan:   ['hod', 'admin', 'md', 'cto', 'coo'],
  pending_ramimi:   ['admin', 'md', 'cto', 'coo'],
  pending_hr:       ['hr', 'admin', 'md', 'cto', 'coo'],
}

function canActOnStage(status: string, role: string): boolean {
  return (STAGE_ROLES[status] ?? []).includes(role)
}

// ── GET /api/leave-requests/[id] ─────────────────────────────────────────────
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const userId = req.headers.get('x-user-id')!
  const role   = req.headers.get('x-user-role') || ''

  const { data, error } = await db
    .from('leave_requests')
    .select('*, profiles:user_id(id, full_name, email, role, position_title, department_id)')
    .eq('id', id)
    .single()

  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const lr = data as Record<string, unknown>
  if (lr.user_id !== userId && !isHR(role) && !isAdmin(role) && !canActOnStage(lr.status as string, role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return NextResponse.json({ leave_request: data })
}

// ── PATCH /api/leave-requests/[id] ───────────────────────────────────────────
// Body: { action: 'approve' | 'reject', comments?: string }
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id }  = await params
  const userId  = req.headers.get('x-user-id')!
  const role    = req.headers.get('x-user-role') || ''
  const body    = await req.json()
  const { action, comments } = body

  if (!['approve', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'Invalid action. Use approve or reject.' }, { status: 400 })
  }

  // Fetch current state
  const { data: lr, error: fetchErr } = await db
    .from('leave_requests')
    .select('id, status, user_id, current_approval_level, approval_history')
    .eq('id', id)
    .single()

  if (fetchErr || !lr) return NextResponse.json({ error: 'Leave request not found' }, { status: 404 })

  const lrData        = lr as Record<string, unknown>
  const currentStatus = lrData.status as string

  // Must be in a pending state
  if (!currentStatus.startsWith('pending_')) {
    return NextResponse.json(
      { error: `Cannot ${action} — request is already "${currentStatus}"` },
      { status: 400 }
    )
  }

  // Authorisation: must be able to act on THIS stage
  if (!canActOnStage(currentStatus, role) && !isAdmin(role)) {
    return NextResponse.json(
      { error: `Your role (${role}) cannot approve requests at stage "${currentStatus}"` },
      { status: 403 }
    )
  }

  const now        = new Date().toISOString()
  const fields     = STAGE_FIELDS[currentStatus]
  const nextStatus = action === 'reject'
    ? 'rejected'
    : (NEXT_STATUS[currentStatus] ?? 'approved')

  // Build update payload
  const updateData: Record<string, unknown> = {
    status:                nextStatus,
    updated_at:            now,
    current_approval_level: ((lrData.current_approval_level as number) ?? 0) + 1,
  }

  // Stamp the per-stage columns
  if (fields) {
    updateData[fields.by] = userId
    updateData[fields.at] = now
    if (comments) updateData[fields.col] = comments
  }

  // Append to approval_history JSON
  let history: unknown[] = []
  try { history = JSON.parse((lrData.approval_history as string) ?? '[]') } catch { /* empty */ }
  history.push({
    stage:       currentStatus,
    action,
    approved_by: userId,
    approved_at: now,
    comments:    comments ?? null,
    next_status: nextStatus,
  })
  updateData.approval_history = JSON.stringify(history)

  const { data, error } = await db
    .from('leave_requests')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ leave_request: data })
}

// ── DELETE /api/leave-requests/[id]  (cancel own pending request) ────────────
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id }  = await params
  const userId  = req.headers.get('x-user-id')!
  const role    = req.headers.get('x-user-role') || ''

  const { data: lr } = await db
    .from('leave_requests')
    .select('id, user_id, status')
    .eq('id', id)
    .single()

  if (!lr) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const lrData  = lr as Record<string, unknown>
  const isOwner = lrData.user_id === userId
  if (!isOwner && !isAdmin(role) && !isHR(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const now = new Date().toISOString()
  const { data, error } = await db
    .from('leave_requests')
    .update({ canceled: 1, canceled_at: now, canceled_by: userId, status: 'canceled', updated_at: now })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ leave_request: data })
}
