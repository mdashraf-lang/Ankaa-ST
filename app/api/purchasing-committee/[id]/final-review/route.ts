import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

type Ctx = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Ctx) {
  const { id }  = await params
  const userId  = req.headers.get('x-user-id')!

  // Fix B2: verify entry is in pending_final state
  const { data: entry } = await db
    .from('purchasing_committee_entries')
    .select('status')
    .eq('id', id)
    .single()

  if (!entry) return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
  if (entry.status !== 'pending_final') {
    return NextResponse.json(
      { error: `Final decisions can only be submitted when the entry is pending final approval (current: ${entry.status})` },
      { status: 400 }
    )
  }

  const { data: finalReview } = await db
    .from('purchasing_committee_final_reviews')
    .select('*')
    .eq('entry_id', id)
    .single()

  if (!finalReview) {
    return NextResponse.json({ error: 'Final review not yet assigned' }, { status: 404 })
  }

  const isCEO = finalReview.ceo_user_id === userId
  const isMD  = finalReview.md_user_id  === userId

  if (!isCEO && !isMD) {
    return NextResponse.json({ error: 'You are not the assigned CEO or MD reviewer' }, { status: 403 })
  }

  // Fix A4: prevent re-submission once a decision has already been recorded
  const alreadyDecided = isCEO
    ? finalReview.ceo_status !== 'pending'
    : finalReview.md_status  !== 'pending'

  if (alreadyDecided) {
    return NextResponse.json(
      { error: 'Your decision has already been recorded and cannot be changed' },
      { status: 409 }
    )
  }

  const body = await req.json()
  const { status, comment } = body

  if (!['approved', 'rejected'].includes(status)) {
    return NextResponse.json({ error: 'status must be approved or rejected' }, { status: 400 })
  }

  const now = new Date().toISOString()

  const patch: Record<string, string | null> = { updated_at: now }
  if (isCEO) {
    patch.ceo_status      = status
    patch.ceo_comment     = comment || null
    patch.ceo_reviewed_at = now
  } else {
    patch.md_status       = status
    patch.md_comment      = comment || null
    patch.md_reviewed_at  = now
  }

  const { error: updateErr } = await db
    .from('purchasing_committee_final_reviews')
    .update(patch)
    .eq('id', finalReview.id)

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

  // Re-fetch to get the combined state
  const { data: updated } = await db
    .from('purchasing_committee_final_reviews')
    .select('*')
    .eq('id', finalReview.id)
    .single()

  if (!updated) return NextResponse.json({ error: 'Failed to read updated state' }, { status: 500 })

  // Rejection by either → rejected immediately. Both approved → approved.
  let entryStatus: string | null = null
  if (updated.ceo_status === 'rejected' || updated.md_status === 'rejected') {
    entryStatus = 'rejected'
  } else if (updated.ceo_status === 'approved' && updated.md_status === 'approved') {
    entryStatus = 'approved'
  }

  if (entryStatus) {
    await db.from('purchasing_committee_entries').update({
      status: entryStatus, updated_at: now,
    }).eq('id', id)
  }

  return NextResponse.json({ ok: true, final_review: updated, entry_status: entryStatus })
}
