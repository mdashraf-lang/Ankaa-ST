import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { randomUUID } from 'crypto'

// Roles with full admin access to purchasing committee
// Fix A1: isAdmin() only matches 'admin'; must explicitly list all executive roles
function isPCAdmin(role: string): boolean {
  return ['admin', 'super_admin', 'ceo', 'md', 'cto', 'coo', 'tender_icv_manager'].includes(role)
}

export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id')!
  const role   = req.headers.get('x-user-role') || ''

  if (isPCAdmin(role)) {
    const { data, error } = await db
      .from('purchasing_committee_entries')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ entries: data ?? [] })
  }

  // Regular users: see only entries where they are a reviewer or final reviewer
  const [reviewerRes, finalRes] = await Promise.all([
    db.from('purchasing_committee_reviewers').select('entry_id').eq('user_id', userId),
    db.from('purchasing_committee_final_reviews').select('entry_id').or(`ceo_user_id.eq.${userId},md_user_id.eq.${userId}`),
  ])

  // Fix B4: surface errors instead of silently returning empty
  if (reviewerRes.error) return NextResponse.json({ error: reviewerRes.error.message }, { status: 500 })

  const ids = new Set<string>([
    ...(reviewerRes.data ?? []).map((r: { entry_id: string }) => r.entry_id),
    ...(finalRes.data    ?? []).map((r: { entry_id: string }) => r.entry_id),
  ])

  if (ids.size === 0) return NextResponse.json({ entries: [] })

  const { data, error } = await db
    .from('purchasing_committee_entries')
    .select('*')
    .in('id', [...ids])
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ entries: data ?? [] })
}

export async function POST(req: NextRequest) {
  const userId = req.headers.get('x-user-id')!
  const role   = req.headers.get('x-user-role') || ''

  if (!isPCAdmin(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { name, tender_number, price, currency, submission_end_date, description, reviewer_roles } = body

  if (!name || !tender_number || price == null || !submission_end_date || !description) {
    return NextResponse.json({ error: 'name, tender_number, price, submission_end_date, description are required' }, { status: 400 })
  }
  if (!Array.isArray(reviewer_roles) || reviewer_roles.length === 0) {
    return NextResponse.json({ error: 'At least one reviewer role must be selected' }, { status: 400 })
  }

  const now     = new Date().toISOString()
  const entryId = randomUUID()

  const { data: entry, error: entryErr } = await db
    .from('purchasing_committee_entries')
    .insert({
      id: entryId, name, tender_number, price: Number(price),
      currency: currency || 'OMR', submission_end_date, description,
      status: 'under_review', created_by: userId, created_at: now, updated_at: now,
    })
    .select().single()

  if (entryErr) return NextResponse.json({ error: entryErr.message }, { status: 400 })

  // Find users for each requested reviewer role
  const validRoles = ['tender_icv_manager', 'cto', 'hr', 'finance', 'coo']
  const roles = (reviewer_roles as string[]).filter(r => validRoles.includes(r))

  const reviewerInserts: object[] = []
  for (const r of roles) {
    const { data: profiles } = await db
      .from('profiles').select('id').eq('role', r).limit(1)
    const assignedUserId = profiles?.[0]?.id ?? null
    if (!assignedUserId) continue
    reviewerInserts.push({
      id: randomUUID(), entry_id: entryId, role: r,
      user_id: assignedUserId, assigned_at: now,
    })
  }

  if (reviewerInserts.length > 0) {
    // Fix B6: check for reviewer insert error and clean up on failure
    const { error: revErr } = await db
      .from('purchasing_committee_reviewers')
      .insert(reviewerInserts)
    if (revErr) {
      // Roll back the entry so it doesn't orphan
      await db.from('purchasing_committee_entries').delete().eq('id', entryId)
      return NextResponse.json({ error: `Entry created but reviewer assignment failed: ${revErr.message}` }, { status: 400 })
    }
  }

  return NextResponse.json({ entry })
}
