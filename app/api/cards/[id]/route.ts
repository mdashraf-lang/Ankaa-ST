import { NextRequest, NextResponse } from 'next/server'
import { db as supabaseAdmin } from '@/lib/db'
import { randomUUID } from 'crypto'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await req.json()
  const allowed = ['title', 'description', 'list_id', 'position', 'completed', 'due_date', 'labels', 'priority']
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  for (const key of allowed) {
    if (key in body) update[key] = body[key]
  }

  const { data, error } = await supabaseAdmin
    .from('project_cards')
    .update(update)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // Update assignee if specified
  if ('assigned_to' in body) {
    await supabaseAdmin.from('project_card_members').delete().eq('card_id', id)
    if (body.assigned_to) {
      await supabaseAdmin.from('project_card_members').insert({
        id: randomUUID(), card_id: id, user_id: body.assigned_to,
        created_at: new Date().toISOString(),
      })
    }
  }

  return NextResponse.json({ card: data })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { error } = await supabaseAdmin.from('project_cards').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
}
