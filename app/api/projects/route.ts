import { NextRequest, NextResponse } from 'next/server'
import { db as supabaseAdmin } from '@/lib/db'
import { isAdmin } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id')!
  const role = req.headers.get('x-user-role') || ''

  if (isAdmin(role)) {
    // Admins see all projects with members
    const { data, error } = await supabaseAdmin
      .from('projects')
      .select(
        '*, project_members(user_id, role, profiles:user_id(id, full_name, email))'
      )
      .order('created_at', { ascending: false })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ projects: data || [] })
  }

  // Regular users: only projects they're members of
  const { data, error } = await supabaseAdmin
    .from('project_members')
    .select(
      'project_id, role, projects!inner(id, name, description, created_at, updated_at, created_by)'
    )
    .eq('user_id', userId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const projects = (data || []).map((m: any) => ({
    ...m.projects,
    member_role: m.role,
  }))
  return NextResponse.json({ projects })
}

export async function POST(req: NextRequest) {
  const userId = req.headers.get('x-user-id')!
  const body = await req.json()
  const { name, description } = body

  if (!name) return NextResponse.json({ error: 'Name required' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('projects')
    .insert({ name, description: description || null, created_by: userId })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // Add creator as member with owner role
  await supabaseAdmin
    .from('project_members')
    .insert({ project_id: data.id, user_id: userId, role: 'owner' })

  return NextResponse.json({ project: data })
}
