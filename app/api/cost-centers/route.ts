import { NextResponse } from 'next/server'
import { db as supabaseAdmin } from '@/lib/db'

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('cost_centers')
    .select('*')
    .eq('active', 1)
    .order('name')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ cost_centers: data || [] })
}
