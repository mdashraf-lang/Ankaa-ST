import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

type Ctx = { params: Promise<{ id: string }> }

// Fix A1: must list all executive roles; isAdmin() from lib/roles only matches 'admin'
function isPCAdmin(role: string): boolean {
  return ['admin', 'super_admin', 'ceo', 'md', 'cto', 'coo', 'tender_icv_manager'].includes(role)
}

export async function GET(req: NextRequest, { params }: Ctx) {
  const { id }   = await params
  const userId   = req.headers.get('x-user-id')!
  const role     = req.headers.get('x-user-role') || ''

  const { data: entry, error } = await db
    .from('purchasing_committee_entries')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !entry) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Access control: admin/TM, or assigned reviewer, or CEO/MD in final review
  if (!isPCAdmin(role)) {
    const [revRes, finalRes] = await Promise.all([
      db.from('purchasing_committee_reviewers').select('id').eq('entry_id', id).eq('user_id', userId).single(),
      db.from('purchasing_committee_final_reviews').select('id').eq('entry_id', id).or(`ceo_user_id.eq.${userId},md_user_id.eq.${userId}`).single(),
    ])
    if (!revRes.data && !finalRes.data) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  // Fetch all related data
  const [reviewersRes, reviewsRes, finalRes] = await Promise.all([
    db.from('purchasing_committee_reviewers')
      .select('*, profiles:user_id(id, full_name, email, avatar_url)')
      .eq('entry_id', id),
    db.from('purchasing_committee_reviews')
      .select('*')
      .eq('entry_id', id),
    db.from('purchasing_committee_final_reviews')
      .select('*, ceo_profile:ceo_user_id(id, full_name, email), md_profile:md_user_id(id, full_name, email)')
      .eq('entry_id', id)
      .single(),
  ])

  // Also fetch creator profile
  const { data: creatorProfile } = entry.created_by
    ? await db.from('profiles').select('id, full_name, email').eq('id', entry.created_by).single()
    : { data: null }

  return NextResponse.json({
    entry,
    reviewers:    reviewersRes.data ?? [],
    reviews:      reviewsRes.data   ?? [],
    final_review: finalRes.data     ?? null,
    creator:      creatorProfile    ?? null,
  })
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const { id }  = await params
  const userId  = req.headers.get('x-user-id')!
  const role    = req.headers.get('x-user-role') || ''

  if (!isPCAdmin(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Only the creator can delete
  const { data: entry } = await db
    .from('purchasing_committee_entries')
    .select('created_by')
    .eq('id', id)
    .single()

  if (!entry) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (entry.created_by !== userId) {
    return NextResponse.json({ error: 'Only the creator can delete this entry' }, { status: 403 })
  }

  const { error } = await db.from('purchasing_committee_entries').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
