import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { randomUUID } from 'crypto'

// ── GET /api/assets/movements ────────────────────────────────────────────────
// JOINs asset name and moved_by profile full_name
export async function GET() {
  const sql = `
    SELECT m.*,
      a.name      AS asset_name,
      p.full_name AS moved_by_name
    FROM asset_movements m
    LEFT JOIN assets   a ON a.id = m.asset_id
    LEFT JOIN profiles p ON p.id = m.moved_by
    ORDER BY m.moved_at DESC
  `
  const result = await (db.query(sql, []) as Promise<{ rows: Record<string, unknown>[] }>)
  return NextResponse.json({ movements: result.rows ?? [] })
}

// ── POST /api/assets/movements ───────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const body = await req.json()
  const userId = req.headers.get('x-user-id') ?? null
  const { data, error } = await db
    .from('asset_movements')
    .insert({
      id: randomUUID(),
      ...body,
      moved_by: body.moved_by ?? userId,
      moved_at: body.moved_at ?? new Date().toISOString(),
    })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ movement: data })
}
