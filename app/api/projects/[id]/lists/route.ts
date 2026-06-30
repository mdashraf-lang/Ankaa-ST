import { NextRequest, NextResponse } from 'next/server'
import { db as supabaseAdmin } from '@/lib/db'
import { randomUUID } from 'crypto'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const { data, error } = await supabaseAdmin
    .from('project_lists')
    .select(
      '*, project_cards(id, title, description, position, completed, due_date, labels, priority, project_card_members(user_id, profiles:user_id(id, full_name)))'
    )
    .eq('project_id', id)
    .order('position')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Sort cards within each list by position
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lists = (data || []).map((list: any) => ({
    ...list,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    project_cards: (list.project_cards || []).sort((a: any, b: any) => a.position - b.position),
  }))

  return NextResponse.json({ lists })
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { title, position } = await req.json()

  const { data, error } = await supabaseAdmin
    .from('project_lists')
    .insert({ id: randomUUID(), project_id: id, title, position: position ?? 0, created_at: new Date().toISOString() })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ list: data })
}
