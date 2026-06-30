import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { randomUUID } from 'crypto'

export async function GET(_req: NextRequest) {
  const sql = `
    SELECT m.*, v.vehicle_name
    FROM fleet_vehicle_maintenance m
    LEFT JOIN fleet_vehicles v ON v.id = m.vehicle_id
    ORDER BY m.created_at DESC
  `
  const result = await (db.query(sql, []) as Promise<{ rows: Record<string, unknown>[] }>)
  return NextResponse.json({ records: result.rows ?? [] })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const now = new Date().toISOString()
  const { data, error } = await db
    .from('fleet_vehicle_maintenance')
    .insert({ id: randomUUID(), ...body, created_at: now, updated_at: now })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ record: data })
}
