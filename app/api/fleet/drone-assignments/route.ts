import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { randomUUID } from 'crypto'

export async function GET(_req: NextRequest) {
  const sql = `
    SELECT da.*,
      d.drone_name, p.name AS pilot_name
    FROM fleet_drone_assignments da
    LEFT JOIN fleet_drones d ON d.id = da.drone_id
    LEFT JOIN fleet_pilots p ON p.id = da.pilot_id
    ORDER BY da.created_at DESC
  `
  const result = await (db.query(sql, []) as Promise<{ rows: Record<string, unknown>[] }>)
  return NextResponse.json({ assignments: result.rows ?? [] })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const now = new Date().toISOString()
  const { data, error } = await db
    .from('fleet_drone_assignments')
    .insert({ id: randomUUID(), ...body, is_active: 1, created_at: now, updated_at: now })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ assignment: data })
}
