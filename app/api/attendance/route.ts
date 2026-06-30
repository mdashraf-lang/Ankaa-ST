import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { randomUUID } from 'crypto'

export const dynamic = 'force-dynamic'

// ── GET /api/attendance  → today's record for the logged-in user ──────────────
export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id')!
  const today  = new Date().toISOString().slice(0, 10)

  const { data } = await db
    .from('roster_attendance')
    .select('*')
    .eq('user_id', userId)
    .eq('date', today)
    .single()

  return NextResponse.json({ attendance: data ?? null })
}

// ── POST /api/attendance  → clock in or clock out ────────────────────────────
// Body: { action: 'in' | 'out', location_type?: 'office' | 'remote' | 'field' }
export async function POST(req: NextRequest) {
  const userId = req.headers.get('x-user-id')!
  const body   = await req.json()
  const { action, location_type } = body as { action: 'in' | 'out'; location_type?: string }

  if (!['in', 'out'].includes(action)) {
    return NextResponse.json({ error: 'action must be "in" or "out"' }, { status: 400 })
  }

  const now   = new Date()
  const today = now.toISOString().slice(0, 10)
  const ts    = now.toISOString()

  // Fetch existing record for today
  const { data: existing } = await db
    .from('roster_attendance')
    .select('id, clock_in, clock_out, status')
    .eq('user_id', userId)
    .eq('date', today)
    .single()

  const existingRow = existing as Record<string, unknown> | null

  if (action === 'in') {
    // Determine lateness — Oman working hours start at 8:00 AM
    const shiftStart  = new Date(`${today}T08:00:00`)
    const lateMinutes = Math.max(0, Math.floor((now.getTime() - shiftStart.getTime()) / 60000))
    const status      = lateMinutes > 15 ? 'late' : 'present'

    if (existingRow?.id) {
      const { data, error } = await db
        .from('roster_attendance')
        .update({ clock_in: ts, status, late_minutes: lateMinutes, location_type: location_type ?? 'office', marked_at: ts, marked_by: userId })
        .eq('id', existingRow.id as string)
        .select()
        .single()
      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
      return NextResponse.json({ attendance: data })
    } else {
      const { data, error } = await db
        .from('roster_attendance')
        .insert({
          id: randomUUID(),
          user_id: userId,
          date: today,
          status,
          clock_in: ts,
          late_minutes: lateMinutes,
          location_type: location_type ?? 'office',
          marked_at: ts,
          marked_by: userId,
        })
        .select()
        .single()
      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
      return NextResponse.json({ attendance: data })
    }
  } else {
    // Clock out — update existing record
    if (!existingRow?.id) {
      return NextResponse.json({ error: 'No clock-in record found for today' }, { status: 400 })
    }
    const { data, error } = await db
      .from('roster_attendance')
      .update({ clock_out: ts, marked_at: ts })
      .eq('id', existingRow.id as string)
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ attendance: data })
  }
}
