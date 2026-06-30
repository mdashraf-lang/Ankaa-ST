import { NextRequest, NextResponse } from 'next/server'
import { db as supabaseAdmin } from '@/lib/db'
import { isAdmin } from '@/lib/auth'
import { randomUUID } from 'crypto'

export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id')!
  const role = req.headers.get('x-user-role') || ''
  const { searchParams } = new URL(req.url)
  const filterStatus = searchParams.get('status')

  let query = supabaseAdmin
    .from('invoices')
    .select('*, profiles:user_id(id, full_name, email)')
    .order('created_at', { ascending: false })

  // Admins/Finance/HR see all; others see own
  if (!isAdmin(role) && role !== 'finance' && role !== 'hr') {
    query = query.eq('user_id', userId)
  }

  if (filterStatus) query = query.eq('status', filterStatus)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ invoices: data || [] })
}

export async function POST(req: NextRequest) {
  const userId = req.headers.get('x-user-id')!
  const body = await req.json()
  const {
    name,
    amount,
    transaction_date,
    expense_category,
    cost_center,
    description,
    currency,
    bill_number,
    paid_by,
    status,
    fuel_amount,
    materials_amount,
    transportation_amount,
    food_amount,
    others_amount,
  } = body

  if (!name) return NextResponse.json({ error: 'Name required' }, { status: 400 })

  const now = new Date().toISOString()
  const { data, error } = await supabaseAdmin
    .from('invoices')
    .insert({
      id: randomUUID(),
      user_id: userId,
      created_at: now,
      name,
      amount: amount || null,
      transaction_date: transaction_date || null,
      expense_category: expense_category || null,
      cost_center: cost_center || null,
      description: description || null,
      currency: currency || 'OMR',
      bill_number: bill_number || null,
      paid_by: paid_by || null,
      status: status || 'unpaid',
      fuel_amount: fuel_amount ?? 0,
      materials_amount: materials_amount ?? 0,
      transportation_amount: transportation_amount ?? 0,
      food_amount: food_amount ?? 0,
      others_amount: others_amount ?? 0,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ invoice: data })
}
