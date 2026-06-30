import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { randomUUID } from 'crypto'

export async function GET(_req: NextRequest) {
  const { data, error } = await db
    .from('fleet_pilots')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ pilots: data ?? [] })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const now = new Date().toISOString()
  const { data, error } = await db
    .from('fleet_pilots')
    .insert({ id: randomUUID(), ...body, created_at: now, updated_at: now })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ pilot: data })
}
