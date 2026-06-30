import { NextRequest, NextResponse } from 'next/server'
import { db as supabaseAdmin } from '@/lib/db'
import { isAdmin } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id')!
  const role = req.headers.get('x-user-role') || ''
  const { searchParams } = new URL(req.url)
  const targetUserId = searchParams.get('user_id')

  // Admins can see any user's todos; regular users only their own
  const queryUserId = isAdmin(role) && targetUserId ? targetUserId : userId

  const { data, error } = await supabaseAdmin
    .from('todos')
    .select('*')
    .eq('user_id', queryUserId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ todos: data || [] })
}

export async function POST(req: NextRequest) {
  const userId = req.headers.get('x-user-id')!
  const role = req.headers.get('x-user-role') || ''
  const body = await req.json()
  const { task, due_date, due_time, priority, notes, assigned_to_user_id } = body

  if (!task) return NextResponse.json({ error: 'Task is required' }, { status: 400 })

  const targetUserId = isAdmin(role) && assigned_to_user_id ? assigned_to_user_id : userId

  const { data, error } = await supabaseAdmin
    .from('todos')
    .insert({
      user_id: targetUserId,
      task,
      due_date: due_date || null,
      due_time: due_time || null,
      priority: priority || 'medium',
      notes: notes || null,
      created_by: userId,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ todo: data })
}
