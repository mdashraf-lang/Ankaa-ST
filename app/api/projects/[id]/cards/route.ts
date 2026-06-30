import { NextRequest, NextResponse } from 'next/server'
import { db as supabaseAdmin } from '@/lib/db'
import { randomUUID } from 'crypto'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { list_id, title, description, position, assigned_to, due_date, priority } = await req.json()

  if (!list_id || !title) {
    return NextResponse.json({ error: 'list_id and title required' }, { status: 400 })
  }

  const now = new Date().toISOString()
  const { data, error } = await supabaseAdmin
    .from('project_cards')
    .insert({
      id: randomUUID(),
      project_id: id,
      list_id,
      title,
      description: description || null,
      position: position ?? 0,
      completed: 0,
      labels: '[]',
      priority: priority || 'medium',
      due_date: due_date || null,
      created_at: now,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // Assign to a project member if specified
  if (assigned_to && data) {
    await supabaseAdmin.from('project_card_members').insert({
      id: randomUUID(), card_id: data.id, user_id: assigned_to, created_at: now,
    })
  }

  return NextResponse.json({ card: data })
}
