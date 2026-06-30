import { NextRequest, NextResponse } from 'next/server'
import { db as supabaseAdmin } from '@/lib/db'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { list_id, title, description, position } = await req.json()

  if (!list_id || !title) {
    return NextResponse.json({ error: 'list_id and title required' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('project_cards')
    .insert({
      project_id: id,
      list_id,
      title,
      description: description || null,
      position: position ?? 0,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ card: data })
}
