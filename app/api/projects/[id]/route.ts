import { NextRequest, NextResponse } from 'next/server'
import { db as supabaseAdmin } from '@/lib/db'
import { isAdmin } from '@/lib/auth'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: Ctx) {
  const { id } = await params
  const userId = req.headers.get('x-user-id')!
  const role   = req.headers.get('x-user-role') || ''

  const { data: project, error } = await supabaseAdmin
    .from('projects')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // check access: admin sees all, others must be a member
  if (!isAdmin(role)) {
    const { data: member } = await supabaseAdmin
      .from('project_members')
      .select('role')
      .eq('project_id', id)
      .eq('user_id', userId)
      .single()
    if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // fetch related data
  const [membersRes, risksRes, changesRes, actionsRes] = await Promise.all([
    supabaseAdmin
      .from('project_members')
      .select('*, profiles:user_id(id, full_name, email, avatar_url, role)')
      .eq('project_id', id),
    supabaseAdmin
      .from('project_risks')
      .select('*')
      .eq('project_id', id)
      .order('created_at', { ascending: false }),
    supabaseAdmin
      .from('project_change_requests')
      .select('*')
      .eq('project_id', id)
      .order('created_at', { ascending: false }),
    supabaseAdmin
      .from('project_action_items')
      .select('*')
      .eq('project_id', id)
      .order('created_at', { ascending: false }),
  ])

  return NextResponse.json({
    project,
    members:  membersRes.data  ?? [],
    risks:    risksRes.data    ?? [],
    changes:  changesRes.data  ?? [],
    actions:  actionsRes.data  ?? [],
  })
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { id }  = await params
  const userId  = req.headers.get('x-user-id')!
  const role    = req.headers.get('x-user-role') || ''

  // Only admin or project owner can edit
  if (!isAdmin(role)) {
    const { data: member } = await supabaseAdmin
      .from('project_members')
      .select('role')
      .eq('project_id', id)
      .eq('user_id', userId)
      .single()
    if (!member || member.role !== 'owner') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  const body = await req.json()
  const allowed = ['name','description','section','status','priority','start_date','end_date','progress','department_id']
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const patch: Record<string, any> = { updated_at: new Date().toISOString() }
  for (const key of allowed) {
    if (key in body) patch[key] = body[key]
  }

  const { data, error } = await supabaseAdmin
    .from('projects')
    .update(patch)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ project: data })
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const { id }   = await params
  const userId   = req.headers.get('x-user-id')!
  const role     = req.headers.get('x-user-role') || ''

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
    return NextResponse.json({ error: 'Only the project owner can delete this project' }, { status: 403 })
  }

  const { error } = await supabaseAdmin
    .from('projects')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
