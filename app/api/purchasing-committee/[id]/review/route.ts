import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { randomUUID } from 'crypto'

type Ctx = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Ctx) {
  const { id }   = await params
  const userId   = req.headers.get('x-user-id')!

  // Verify the caller is an assigned reviewer for this entry
  const { data: reviewer, error: revErr } = await db
    .from('purchasing_committee_reviewers')
    .select('id')
    .eq('entry_id', id)
    .eq('user_id', userId)
    .single()

  if (revErr || !reviewer) {
    return NextResponse.json({ error: 'You are not an assigned reviewer for this entry' }, { status: 403 })
  }

  // Fix B1: only accept votes while the entry is still under review
  const { data: entry } = await db
    .from('purchasing_committee_entries')
    .select('status')
    .eq('id', id)
    .single()

  if (!entry) return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
  if (entry.status !== 'under_review') {
    return NextResponse.json(
      { error: `Reviews can only be submitted while the entry is under review (current status: ${entry.status})` },
      { status: 400 }
    )
  }

  const body = await req.json()
  const { status, comment } = body

  if (!['approved', 'rejected'].includes(status)) {
    return NextResponse.json({ error: 'status must be approved or rejected' }, { status: 400 })
  }

  const now = new Date().toISOString()

  // Upsert the review — Fix A2: check errors on both branches
  const existing = await db
    .from('purchasing_committee_reviews')
    .select('id')
    .eq('entry_id', id)
    .eq('reviewer_id', reviewer.id)
    .single()

  if (existing.data) {
    const { error: updateErr } = await db
      .from('purchasing_committee_reviews')
      .update({ status, comment: comment || null, reviewed_at: now, updated_at: now })
      .eq('id', existing.data.id)
    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })
  } else {
    const { error: insertErr } = await db
      .from('purchasing_committee_reviews')
      .insert({
        id: randomUUID(), entry_id: id, reviewer_id: reviewer.id,
        status, comment: comment || null, reviewed_at: now,
        created_at: now, updated_at: now,
      })
    if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 })
  }

  // Check if all reviewers have now completed
  const { data: allReviewers } = await db
    .from('purchasing_committee_reviewers')
    .select('id')
    .eq('entry_id', id)

  const { data: completedReviews } = await db
    .from('purchasing_committee_reviews')
    .select('reviewer_id, status')
    .eq('entry_id', id)
    .in('status', ['approved', 'rejected'])

  const completedIds = new Set((completedReviews ?? []).map((r: { reviewer_id: string }) => r.reviewer_id))
  const allDone = (allReviewers ?? []).length > 0
    && (allReviewers ?? []).every((r: { id: string }) => completedIds.has(r.id))

  if (allDone) {
    await db.from('purchasing_committee_entries').update({
      status: 'review_completed', updated_at: now,
    }).eq('id', id)
  }

  return NextResponse.json({ ok: true, all_reviews_completed: allDone })
}
