import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// ── GET /api/assets/[id] ──────────────────────────────────────────────────────
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const sql = `
    SELECT a.*,
      c.name  AS category_name,
      co.name AS company_name,
      l.name  AS location_name,
      v.name  AS vendor_name,
      p.full_name AS assigned_to_name
    FROM assets a
    LEFT JOIN asset_categories c  ON c.id  = a.category_id
    LEFT JOIN asset_companies  co ON co.id = a.company_id
    LEFT JOIN asset_locations  l  ON l.id  = a.location_id
    LEFT JOIN asset_vendors    v  ON v.id  = a.vendor_id
    LEFT JOIN profiles         p  ON p.id  = a.assigned_to
    WHERE a.id = $1
    LIMIT 1
  `
  const result = await (db.query(sql, [id]) as Promise<{ rows: Record<string, unknown>[] }>)
  const asset = result.rows?.[0] ?? null
  if (!asset) return NextResponse.json({ error: 'Asset not found' }, { status: 404 })
  return NextResponse.json({ asset })
}

// ── PATCH /api/assets/[id] ────────────────────────────────────────────────────
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await req.json()
  const userId = req.headers.get('x-user-id') ?? null
  const { data, error } = await db
    .from('assets')
    .update({ ...body, modified_by: userId, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ asset: data })
}

// ── DELETE /api/assets/[id] ───────────────────────────────────────────────────
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { error } = await db.from('assets').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
}
