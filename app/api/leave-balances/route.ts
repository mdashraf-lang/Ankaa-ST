import { NextRequest, NextResponse } from 'next/server'
import { db as supabaseAdmin } from '@/lib/db'

export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id')!
  const { searchParams } = new URL(req.url)
  const targetUserId = searchParams.get('user_id') || userId

  const { data, error } = await supabaseAdmin
    .from('leave_balances')
    .select('*')
    .eq('user_id', targetUserId)
    .single()

  if (error || !data) {
    // Return defaults if no record exists
    return NextResponse.json({
      balance: {
        user_id: targetUserId,
        annual_leave_days: 30,
        sick_leave_days: 21,
        emergency_leave_days: 6,
        maternity_leave_days: 98,
        paternity_leave_days: 7,
        other_leave_days: 0,
      },
    })
  }
  return NextResponse.json({ balance: data })
}
