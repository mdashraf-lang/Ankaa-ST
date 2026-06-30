import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { randomUUID } from 'crypto'

export async function GET(_req: NextRequest) {
  const sql = `
    SELECT m.*, d.drone_name
    FROM fleet_drone_maintenance m
    LEFT JOIN fleet_drones d ON d.id = m.drone_id
    ORDER BY m.created_at DESC
  `
  const result = await (db.query(sql, []) as Promise<{ rows: Record<string, unknown>[] }>)
  return NextResponse.json({ records: result.rows ?? [] })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const now = new Date().toISOString()
  const { data, error } = await db
    .from('fleet_drone_maintenance')
    .insert({ id: randomUUID(), ...body, created_at: now })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ record: data })
}
