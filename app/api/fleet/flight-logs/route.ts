import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { randomUUID } from 'crypto'

export async function GET(_req: NextRequest) {
  const sql = `
    SELECT fl.*,
      d.drone_name, p.name AS pilot_name
    FROM fleet_flight_logs fl
    LEFT JOIN fleet_drones d ON d.id = fl.drone_id
    LEFT JOIN fleet_pilots p ON p.id = fl.pilot_id
    ORDER BY fl.created_at DESC
  `
  const result = await (db.query(sql, []) as Promise<{ rows: Record<string, unknown>[] }>)
  return NextResponse.json({ logs: result.rows ?? [] })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const now = new Date().toISOString()
  const { data, error } = await db
    .from('fleet_flight_logs')
    .insert({ id: randomUUID(), ...body, created_at: now, updated_at: now })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ log: data })
}
