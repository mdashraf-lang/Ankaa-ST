import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id')
  const role   = req.headers.get('x-user-role') || ''
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const today = new Date().toISOString().slice(0, 10)

  // Run all queries in parallel
  const [
    leavePendingRes,
    projectsRes,
    presentTodayRes,
    myBalanceRes,
    myTodosRes,
    myLeaveHistoryRes,
  ] = await Promise.all([
    // Pending leave requests
    db.from('leave_requests').select('id').eq('status', 'pending_ghassani'),
    // Active projects
    db.from('projects').select('id'),
    // Employees present today
    db.from('roster_attendance').select('id').eq('date', today).eq('status', 'present'),
    // My leave balance
    db.from('leave_balances').select('*').eq('user_id', userId).single(),
    // My open todos
    db.from('todos')
      .select('id, task, due_date, priority, is_complete')
      .eq('user_id', userId)
      .eq('is_complete', 0)
      .order('due_date', { ascending: true })
      .limit(5),
    // My recent leave (last 5)
    db.from('leave_requests')
      .select('id, leave_type, start_date, end_date, total_working_days, status, reason, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  // Upcoming = approved requests with end_date >= today (filter in JS)
  const myUpcomingLeave = (myLeaveHistoryRes.data ?? [])
    .filter((r: Record<string, unknown>) => r.status === 'approved' && String(r.end_date ?? '') >= today)
    .slice(0, 3)

  // Also get pending leave for current user's approvals
  const pendingForMeRes = await (async () => {
    const approverStatuses: Record<string, string> = {
      hod:   'pending_ghassani',
      admin: 'pending_ramimi',
      hr:    'pending_hr',
      cto:   'pending_ghassani',
      md:    'pending_ghassani',
    }
    const myPendingStatus = approverStatuses[role]
    if (!myPendingStatus) return { data: [], error: null }
    return db.from('leave_requests').select('id').eq('status', myPendingStatus)
  })()

  const stats = {
    leave_pending:     (leavePendingRes.data?.length ?? 0),
    active_projects:   (projectsRes.data?.length ?? 0),
    employees_present: (presentTodayRes.data?.length ?? 0),
    pending_for_me:    (pendingForMeRes.data?.length ?? 0),
  }

  return NextResponse.json({
    stats,
    my_balance:     myBalanceRes.data ?? null,
    upcoming_leave: myUpcomingLeave,
    my_todos:       myTodosRes.data ?? [],
    recent_leave:   myLeaveHistoryRes.data ?? [],
  })
}
