import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { randomUUID } from 'crypto'

// ── GET /api/assets/companies ────────────────────────────────────────────────
export async function GET() {
  const { data, error } = await db
    .from('asset_companies')
    .select('*')
    .order('name', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ companies: data ?? [] })
}

// ── POST /api/assets/companies ───────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { data, error } = await db
    .from('asset_companies')
    .insert({ id: randomUUID(), ...body, created_at: new Date().toISOString() })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ company: data })
}
