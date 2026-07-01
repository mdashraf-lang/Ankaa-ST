import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { isAdmin } from '@/lib/auth'

type Ctx = { params: Promise<{ id: string; rid: string }> }

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { rid } = await params
  const role    = req.headers.get('x-user-role') || ''
  if (!isAdmin(role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const allowed = ['title','description','level','status','owner','mitigation']
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const patch: Record<string, any> = { updated_at: new Date().toISOString() }
  for (const k of allowed) if (k in body) patch[k] = body[k]

  const { data, error } = await db.from('project_risks').update(patch).eq('id', rid).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ risk: data })
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { rid } = await params
  const role    = _req.headers.get('x-user-role') || ''
  if (!isAdmin(role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { error } = await db.from('project_risks').delete().eq('id', rid)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
