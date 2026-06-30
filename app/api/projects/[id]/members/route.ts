import { NextRequest, NextResponse } from 'next/server'
import { db as supabaseAdmin } from '@/lib/db'
import { randomUUID } from 'crypto'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(
  _req: NextRequest,
  { params }: Ctx
) {
  const { id } = await params
  const { data, error } = await supabaseAdmin
    .from('project_members')
    .select('user_id, role, joined_at, profiles:user_id(id, full_name, email)')
    .eq('project_id', id)
    .order('joined_at')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ members: data || [] })
}

export async function POST(
  req: NextRequest,
  { params }: Ctx
) {
  const { id } = await params
  const { userId, role = 'member' } = await req.json()
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('project_members')
    .upsert(
      { id: randomUUID(), project_id: id, user_id: userId, role, joined_at: new Date().toISOString() },
      { onConflict: 'project_id,user_id', ignoreDuplicates: false }
    )
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ member: data })
}

export async function DELETE(
  req: NextRequest,
  { params }: Ctx
) {
  const { id } = await params
  const userId = new URL(req.url).searchParams.get('userId')
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

  const { error } = await supabaseAdmin
    .from('project_members')
    .delete()
    .eq('project_id', id)
    .eq('user_id', userId)
    .neq('role', 'owner') // can't remove the owner

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
