import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { isAdmin } from '@/lib/auth'

type Ctx = { params: Promise<{ id: string }> }

// ── GET /api/invoices/[id] ────────────────────────────────────────────────────
export async function GET(req: NextRequest, { params }: Ctx) {
  const { id }   = await params
  const userId   = req.headers.get('x-user-id')!
  const role     = req.headers.get('x-user-role') || ''

  const { data, error } = await db
    .from('invoices')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Only the owner or admin/finance/hr can view
  if (data.user_id !== userId && !isAdmin(role) && role !== 'finance' && role !== 'hr') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return NextResponse.json({ invoice: data })
}

// ── PATCH /api/invoices/[id] ──────────────────────────────────────────────────
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { id }   = await params
  const userId   = req.headers.get('x-user-id')!
  const role     = req.headers.get('x-user-role') || ''

  // Fetch first to check ownership
  const { data: existing } = await db.from('invoices').select('user_id').eq('id', id).single()
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (existing.user_id !== userId && !isAdmin(role) && role !== 'finance') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const allowed = [
    'name','amount','transaction_date','expense_category','cost_center',
    'description','currency','bill_number','paid_by','status',
    'exchange_rate','invoice_receipt_path','bank_screenshot_path',
    'extracted_date','extracted_amount',
    'fuel_amount','materials_amount','transportation_amount','food_amount','others_amount',
  ]
  const body   = await req.json()
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  for (const k of allowed) {
    if (k in body) update[k] = body[k]
  }

  const { data, error } = await db
    .from('invoices')
    .update(update)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ invoice: data })
}

// ── DELETE /api/invoices/[id] ─────────────────────────────────────────────────
export async function DELETE(req: NextRequest, { params }: Ctx) {
  const { id }   = await params
  const userId   = req.headers.get('x-user-id')!
  const role     = req.headers.get('x-user-role') || ''

  const { data: existing } = await db.from('invoices').select('user_id').eq('id', id).single()
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (existing.user_id !== userId && !isAdmin(role) && role !== 'finance') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { error } = await db.from('invoices').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
