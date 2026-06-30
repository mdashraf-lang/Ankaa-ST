import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { signToken } from '@/lib/auth'
import { db as supabaseAdmin } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('id, email, password_hash, role, full_name, username')
      .eq('email', email.toLowerCase().trim())
      .single()

    if (error || !data || !data.password_hash) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    const match = await bcrypt.compare(password, data.password_hash)
    if (!match) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    // Update last_sign_in_at
    await supabaseAdmin
      .from('profiles')
      .update({ last_sign_in_at: new Date().toISOString() })
      .eq('id', data.id)

    const token = await signToken({
      userId: data.id,
      email: data.email,
      role: data.role || 'collaborator',
    })

    const response = NextResponse.json({
      user: {
        id: data.id,
        email: data.email,
        role: data.role,
        full_name: data.full_name,
        username: data.username,
      },
    })

    response.cookies.set('ankaa_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 8, // 8 hours
      path: '/',
    })

    return response
  } catch (e) {
    console.error('[Auth] Login error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
