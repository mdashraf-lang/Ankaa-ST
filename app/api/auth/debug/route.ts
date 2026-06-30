import { NextRequest, NextResponse } from 'next/server'
import { db as supabaseAdmin } from '@/lib/db'
import bcrypt from 'bcryptjs'

// TEMPORARY debug endpoint — remove before going to production
export async function POST(req: NextRequest) {
  const { email, password } = await req.json()

  const steps: Record<string, unknown> = {}

  // Step 1: Can we reach Supabase at all?
  try {
    const { count, error } = await supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact', head: true })

    steps.supabase_connection = error
      ? { ok: false, error: error.message }
      : { ok: true, total_users: count }
  } catch (e: unknown) {
    steps.supabase_connection = { ok: false, error: String(e) }
  }

  // Step 2: Does the email exist?
  try {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('id, email, role, full_name, password_hash')
      .eq('email', email?.toLowerCase().trim())
      .single()

    if (error) {
      steps.user_lookup = { found: false, error: error.message }
    } else {
      steps.user_lookup = {
        found: true,
        email: data.email,
        role: data.role,
        full_name: data.full_name,
        has_password_hash: !!data.password_hash,
        hash_prefix: data.password_hash?.substring(0, 7) ?? null,
      }

      // Step 3: Does the password match?
      if (data.password_hash && password) {
        const match = await bcrypt.compare(password, data.password_hash)
        steps.password_check = { match }
      } else {
        steps.password_check = { match: false, reason: 'no hash or no password provided' }
      }
    }
  } catch (e: unknown) {
    steps.user_lookup = { found: false, error: String(e) }
  }

  return NextResponse.json({ steps })
}
