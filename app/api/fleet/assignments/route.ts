import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { randomUUID } from 'crypto'

export async function GET(_req: NextRequest) {
  const sql = `
    SELECT va.*,
      v.vehicle_name, v.license_plate_number, v.license_plate_alphabets,
      d.name AS driver_name, d.phone AS driver_phone
    FROM fleet_vehicle_assignments va
    LEFT JOIN fleet_vehicles v ON v.id = va.vehicle_id
    LEFT JOIN fleet_drivers d ON d.id = va.driver_id
    ORDER BY va.created_at DESC
  `
  const result = await (db.query(sql, []) as Promise<{ rows: Record<string, unknown>[] }>)
  return NextResponse.json({ assignments: result.rows ?? [] })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const now = new Date().toISOString()
  const { data, error } = await db
    .from('fleet_vehicle_assignments')
    .insert({ id: randomUUID(), ...body, is_active: 1, created_at: now, updated_at: now })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ assignment: data })
}
