import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// ── DELETE /api/assets/movements/[id] ───────────────────────────────────────
// Movements are immutable audit records — only deletion is allowed.
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { error } = await db.from('asset_movements').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
}
