import { NextRequest, NextResponse } from 'next/server'
import { db as supabaseAdmin } from '@/lib/db'
import { canManageUsers } from '@/lib/auth'
import bcrypt from 'bcryptjs'

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select(
      'id, full_name, email, role, joining_date, date_of_birth, gender, phone_number, emergency_number, created_at, last_sign_in_at'
    )
    .order('full_name')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ users: data || [] })
}

export async function POST(req: NextRequest) {
  const role = req.headers.get('x-user-role') || ''
  if (!canManageUsers(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const {
    email,
    password,
    full_name,
    role: newRole,
    joining_date,
    gender,
    phone_number,
    emergency_number,
    employee_id,
    department_id,
    position_title,
    contract_type,
    basic_salary,
  } = body

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
  }

  const password_hash = await bcrypt.hash(password, 10)

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .insert({
      email: email.toLowerCase(),
      password_hash,
      full_name:      full_name      || null,
      role:           newRole        || 'collaborator',
      joining_date:   joining_date   || null,
      gender:         gender         || null,
      phone_number:   phone_number   || null,
      emergency_number: emergency_number || null,
      employee_id:    employee_id    || null,
      department_id:  department_id  || null,
      position_title: position_title || null,
      contract_type:  contract_type  || 'full_time',
      basic_salary:   basic_salary   || null,
      status:         'active',
      created_at:     new Date().toISOString(),
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ user: data })
}
