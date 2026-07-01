import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { isAdmin } from '@/lib/auth'
import { randomUUID } from 'crypto'

type Ctx = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Ctx) {
  const { id } = await params
  const userId = req.headers.get('x-user-id')!
  const role   = req.headers.get('x-user-role') || ''
  if (!isAdmin(role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { title, description, assignee_id, due_date, status } = body
  if (!title) return NextResponse.json({ error: 'title required' }, { status: 400 })

  const now = new Date().toISOString()
  const { data, error } = await db
    .from('project_action_items')
    .insert({
      id: randomUUID(), project_id: id,
      title, description: description || null,
      assignee_id: assignee_id || null,
      due_date: due_date || null,
      status: status || 'open',
      created_by: userId, created_at: now, updated_at: now,
    })
    .select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ action: data })
}
