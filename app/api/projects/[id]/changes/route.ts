import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { isAdmin } from '@/lib/auth'
import { randomUUID } from 'crypto'

type Ctx = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Ctx) {
  const { id } = await params
  const userId = req.headers.get('x-user-id')!
  const role   = req.headers.get('x-user-role') || ''
  if (!isAdmin(role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { title, description, requester, status, impact } = body
  if (!title || !requester) return NextResponse.json({ error: 'title and requester required' }, { status: 400 })

  const now = new Date().toISOString()
  const { data, error } = await db
    .from('project_change_requests')
    .insert({
      id: randomUUID(), project_id: id,
      title, description: description || null,
      requester, status: status || 'pending', impact: impact || 'medium',
      created_by: userId, created_at: now, updated_at: now,
    })
    .select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ change: data })
}
