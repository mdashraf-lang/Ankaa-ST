import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { isAdmin, isHR } from '@/lib/auth'
import { randomUUID } from 'crypto'

export async function GET(req: NextRequest) {
  const role = req.headers.get('x-user-role') || ''

  const { searchParams } = new URL(req.url)
  const status   = searchParams.get('status')
  const priority = searchParams.get('priority')

  let query = db.from('tenders').select('*').order('created_at', { ascending: false })

  if (status)   query = query.eq('status', status)
  if (priority) query = query.eq('priority', priority)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Non-admin/HR: only see tenders they are assigned to
  if (!isAdmin(role) && !isHR(role)) {
    const userId = req.headers.get('x-user-id')!
    const { data: assignments } = await db
      .from('tender_assignments')
      .select('tender_id')
      .eq('user_id', userId)
    const assignedIds = new Set((assignments ?? []).map((a: { tender_id: string }) => a.tender_id))
    return NextResponse.json({ tenders: (data ?? []).filter((t: { id: string }) => assignedIds.has(t.id)) })
  }

  return NextResponse.json({ tenders: data ?? [] })
}

export async function POST(req: NextRequest) {
  const userId = req.headers.get('x-user-id')!
  const role   = req.headers.get('x-user-role') || ''

  if (!isAdmin(role) && !isHR(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const {
    title, client_name, reference_number, client_contact,
    tender_value, currency, submission_deadline,
    status, priority, description, source, project_id,
  } = body

  if (!title || !client_name || !submission_deadline) {
    return NextResponse.json({ error: 'title, client_name, and submission_deadline are required' }, { status: 400 })
  }

  const now = new Date().toISOString()
  const { data, error } = await db
    .from('tenders')
    .insert({
      id: randomUUID(),
      title,
      client_name,
      reference_number: reference_number || null,
      client_contact:   client_contact   || null,
      tender_value:     tender_value     ?? null,
      currency:         currency         || 'OMR',
      submission_deadline,
      status:    status    || 'open',
      priority:  priority  || 'medium',
      description: description || null,
      source:      source      || null,
      project_id:  project_id  || null,
      created_by: userId,
      created_at: now,
      updated_at: now,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ tender: data })
}
