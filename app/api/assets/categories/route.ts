import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { randomUUID } from 'crypto'

// ── GET /api/assets/categories ───────────────────────────────────────────────
export async function GET() {
  const { data, error } = await db
    .from('asset_categories')
    .select('*')
    .order('name', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ categories: data ?? [] })
}

// ── POST /api/assets/categories ──────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { data, error } = await db
    .from('asset_categories')
    .insert({ id: randomUUID(), ...body, created_at: new Date().toISOString() })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ category: data })
}
