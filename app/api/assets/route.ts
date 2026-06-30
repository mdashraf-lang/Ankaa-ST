import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { randomUUID } from 'crypto'

// ── GET /api/assets ─────────────────────────────────────────────────────────
// Raw SQL with LEFT JOINs for category, company, location, vendor, assigned_to
export async function GET() {
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
    ORDER BY a.created_at DESC
  `
  const result = await (db.query(sql, []) as Promise<{ rows: Record<string, unknown>[] }>)
  return NextResponse.json({ assets: result.rows ?? [] })
}

// ── POST /api/assets ─────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const body = await req.json()
  const userId = req.headers.get('x-user-id') ?? null
  const now = new Date().toISOString()
  const { data, error } = await db
    .from('assets')
    .insert({
      id: randomUUID(),
      ...body,
      created_by: userId,
      created_at: now,
      updated_at: now,
    })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ asset: data })
}
