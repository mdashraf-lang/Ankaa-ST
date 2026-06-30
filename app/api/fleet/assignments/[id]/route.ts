import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const updatePayload: Record<string, unknown> = { ...body, updated_at: new Date().toISOString() }
  if (body.end_mileage != null && body.is_active === undefined) {
    updatePayload.is_active = 0
    if (!body.return_date) updatePayload.return_date = new Date().toISOString().split('T')[0]
    if (!body.return_time) updatePayload.return_time = new Date().toTimeString().split(' ')[0].slice(0, 5)
  }
  const { data, error } = await db
    .from('fleet_vehicle_assignments')
    .update(updatePayload)
    .eq('id', id)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ assignment: data })
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { error } = await db.from('fleet_vehicle_assignments').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
