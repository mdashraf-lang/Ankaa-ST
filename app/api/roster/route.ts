import { NextRequest, NextResponse } from 'next/server'
import { db as supabaseAdmin } from '@/lib/db'
import { isHR, isAdmin } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id')!
  const role = req.headers.get('x-user-role') || ''
  const { searchParams } = new URL(req.url)
  const month = searchParams.get('month') // YYYY-MM

  let query = supabaseAdmin
    .from('roster_attendance')
    .select('*, profiles:user_id(id, full_name)')
    .order('date')

  if (month) {
    const [year, mon] = month.split('-')
    const startDate = `${year}-${mon}-01`
    // Get last day of month by going to next month day 0
    const lastDay = new Date(parseInt(year), parseInt(mon), 0).getDate()
    const endDate = `${year}-${mon}-${String(lastDay).padStart(2, '0')}`
    query = query.gte('date', startDate).lte('date', endDate)
  }

  if (!isHR(role) && !isAdmin(role)) {
    query = query.eq('user_id', userId)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ attendance: data || [] })
}

export async function POST(req: NextRequest) {
  const userId = req.headers.get('x-user-id')!
  const role = req.headers.get('x-user-role') || ''
  const body = await req.json()
  const { user_id, date, status } = body

  const targetUserId = isHR(role) || isAdmin(role) ? user_id || userId : userId

  const { data, error } = await supabaseAdmin
    .from('roster_attendance')
    .upsert(
      { user_id: targetUserId, date, status, marked_by: userId, marked_at: new Date().toISOString() },
      { onConflict: 'user_id,date' }
    )
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ attendance: data })
}
