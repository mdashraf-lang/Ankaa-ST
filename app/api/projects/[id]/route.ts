import { NextRequest, NextResponse } from 'next/server'
import { db as supabaseAdmin } from '@/lib/db'
import { isAdmin } from '@/lib/auth'

type Ctx = { params: Promise<{ id: string }> }

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const { id }   = await params
  const userId   = req.headers.get('x-user-id')!
  const role     = req.headers.get('x-user-role') || ''

  // Only the project owner or an admin can delete
  const { data: member } = await supabaseAdmin
    .from('project_members')
    .select('role')
    .eq('project_id', id)
    .eq('user_id', userId)
    .single()

  if (!member && !isAdmin(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (member?.role !== 'owner' && !isAdmin(role)) {
    return NextResponse.json({ error: 'Only the project owner can delete this board' }, { status: 403 })
  }

  // Cascade deletes handled by FK constraints (lists → cards → members)
  const { error } = await supabaseAdmin
    .from('projects')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
