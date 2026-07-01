import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { isAdmin, isHR } from '@/lib/auth'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: Ctx) {
  const { id }   = await params
  const userId   = req.headers.get('x-user-id')!
  const role     = req.headers.get('x-user-role') || ''

  const { data: tender, error } = await db
    .from('tenders')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !tender) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Check access
  if (!isAdmin(role) && !isHR(role)) {
    const { data: assignment } = await db
      .from('tender_assignments')
      .select('id')
      .eq('tender_id', id)
      .eq('user_id', userId)
      .single()
    if (!assignment) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const [assignmentsRes, submissionsRes] = await Promise.all([
    db.from('tender_assignments')
      .select('*, profiles:user_id(id, full_name, email, avatar_url)')
      .eq('tender_id', id),
    db.from('tender_submissions')
      .select('*, profiles:submitted_by(id, full_name)')
      .eq('tender_id', id)
      .order('submitted_at', { ascending: false }),
  ])

  return NextResponse.json({
    tender,
    assignments: assignmentsRes.data  ?? [],
    submissions: submissionsRes.data  ?? [],
  })
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { id } = await params
  const role   = req.headers.get('x-user-role') || ''

  if (!isAdmin(role) && !isHR(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const allowed = [
    'title','client_name','reference_number','client_contact','tender_value',
    'currency','submission_deadline','status','priority','description','source','project_id',
  ]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const patch: Record<string, any> = { updated_at: new Date().toISOString() }
  for (const key of allowed) {
    if (key in body) patch[key] = body[key]
  }

  const { data, error } = await db
    .from('tenders')
    .update(patch)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ tender: data })
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const { id } = await params
  const role   = req.headers.get('x-user-role') || ''

  if (!isAdmin(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { error } = await db.from('tenders').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
