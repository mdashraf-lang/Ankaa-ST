import { NextRequest, NextResponse } from 'next/server'
import { db as supabaseAdmin } from '@/lib/db'
import { isAdmin } from '@/lib/auth'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const userId = req.headers.get('x-user-id')
  const role = req.headers.get('x-user-role') || ''

  // Users can get their own profile; admins can get anyone's
  if (userId !== id && !isAdmin(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select(
      'id, email, full_name, username, role, employee_id, position_title, department_id, contract_type, basic_salary, status, joining_date, date_of_birth, gender, phone_number, emergency_number, avatar_url, last_sign_in_at, created_at'
    )
    .eq('id', id)
    .single()

  if (error || !data) return NextResponse.json({ error: 'User not found' }, { status: 404 })
  return NextResponse.json({ user: data })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const userId = req.headers.get('x-user-id')
  const role = req.headers.get('x-user-role') || ''

  if (userId !== id && !isAdmin(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()

  const selfEditFields = [
    'full_name',
    'username',
    'phone_number',
    'emergency_number',
    'gender',
    'date_of_birth',
  ]
  const adminEditFields = ['role', 'joining_date', 'email']

  const allowedFields: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(body)) {
    if (selfEditFields.includes(key)) allowedFields[key] = value
    if (isAdmin(role) && adminEditFields.includes(key)) allowedFields[key] = value
  }
  allowedFields.updated_at = new Date().toISOString()

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .update(allowedFields)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ user: data })
}
