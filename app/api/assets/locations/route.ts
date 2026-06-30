import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { randomUUID } from 'crypto'

// ── GET /api/assets/locations ────────────────────────────────────────────────
export async function GET() {
  const { data, error } = await db
    .from('asset_locations')
    .select('*')
    .order('name', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ locations: data ?? [] })
}

// ── POST /api/assets/locations ───────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { data, error } = await db
    .from('asset_locations')
    .insert({ id: randomUUID(), ...body, created_at: new Date().toISOString() })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ location: data })
}
