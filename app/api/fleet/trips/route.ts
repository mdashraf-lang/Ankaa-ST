import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { randomUUID } from 'crypto'

export async function GET(_req: NextRequest) {
  const sql = `
    SELECT t.*,
      v.vehicle_name, v.license_plate_number, v.license_plate_alphabets,
      d.name AS driver_name
    FROM fleet_trips t
    LEFT JOIN fleet_vehicles v ON v.id = t.vehicle_id
    LEFT JOIN fleet_drivers d ON d.id = t.driver_id
    ORDER BY t.created_at DESC
  `
  const result = await (db.query(sql, []) as Promise<{ rows: Record<string, unknown>[] }>)
  return NextResponse.json({ trips: result.rows ?? [] })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const now = new Date().toISOString()
  const { data, error } = await db
    .from('fleet_trips')
    .insert({ id: randomUUID(), ...body, created_at: now, updated_at: now })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ trip: data })
}
