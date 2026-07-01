import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { randomUUID } from 'crypto'

type Ctx = { params: Promise<{ id: string }> }

// Fix A1: must list all executive roles; isAdmin() from lib/roles only matches 'admin'
function isPCAdmin(role: string): boolean {
  return ['admin', 'super_admin', 'ceo', 'md', 'cto', 'coo', 'tender_icv_manager'].includes(role)
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const { id } = await params
  const role   = req.headers.get('x-user-role') || ''

  if (!isPCAdmin(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Validate entry exists and is in review_completed state
  const { data: entry } = await db
    .from('purchasing_committee_entries')
    .select('id, status')
    .eq('id', id)
    .single()

  if (!entry) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (entry.status !== 'review_completed') {
    return NextResponse.json({ error: 'All reviewer decisions must be completed first' }, { status: 400 })
  }

  // Check that a final review doesn't already exist
  const { data: existing } = await db
    .from('purchasing_committee_final_reviews')
    .select('id')
    .eq('entry_id', id)
    .single()

  if (existing) {
    return NextResponse.json({ error: 'Final review already assigned' }, { status: 400 })
  }

  // Auto-find CEO and MD by ERP role
  const [ceoRes, mdRes] = await Promise.all([
    db.from('profiles').select('id').eq('role', 'ceo').limit(1),
    db.from('profiles').select('id').eq('role', 'md').limit(1),
  ])

  const ceoUserId = ceoRes.data?.[0]?.id ?? null
  const mdUserId  = mdRes.data?.[0]?.id  ?? null

  // Fix A3: do not create a final review if neither CEO nor MD can be resolved
  if (!ceoUserId && !mdUserId) {
    return NextResponse.json(
      { error: 'No CEO or MD profile found in the system. Assign ceo/md roles to users before proceeding.' },
      { status: 422 }
    )
  }

  const now = new Date().toISOString()

  // Fix B3: use try/catch to handle the UNIQUE(entry_id) race condition
  try {
    const { data: finalReview, error } = await db
      .from('purchasing_committee_final_reviews')
      .insert({
        id: randomUUID(), entry_id: id,
        ceo_user_id: ceoUserId, md_user_id: mdUserId,
        ceo_status: 'pending', md_status: 'pending',
        created_at: now, updated_at: now,
      })
      .select().single()

    if (error) {
      // Unique constraint violation means a concurrent request already inserted
      if (error.message.includes('unique') || error.message.includes('UNIQUE')) {
        return NextResponse.json({ error: 'Final review was just assigned by another admin' }, { status: 409 })
      }
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Advance entry status to pending_final
    await db.from('purchasing_committee_entries').update({
      status: 'pending_final', updated_at: now,
    }).eq('id', id)

    return NextResponse.json({ final_review: finalReview })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Unknown error' }, { status: 500 })
  }
}
