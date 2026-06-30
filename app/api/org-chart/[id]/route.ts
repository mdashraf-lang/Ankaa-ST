import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { isAdmin } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// ── PATCH /api/org-chart/[id] ─────────────────────────────────────────────────
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const role   = req.headers.get('x-user-role') || ''
  if (!isAdmin(role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body    = await req.json()
  const allowed = ['title', 'user_id', 'parent_id', 'position', 'color', 'children_layout',
                   'order', 'department', 'reporting_to', 'is_c_level',
                   'can_direct_approve', 'is_head_of_department',
                   'full_name', 'email', 'level']

  const sets:   string[]  = []
  const params2: unknown[] = []
  let idx = 1

  for (const key of allowed) {
    if (!(key in body)) continue
    let val = body[key]
    // Coerce boolean flags to integers for PGlite
    if (['is_c_level', 'can_direct_approve', 'is_head_of_department'].includes(key)) {
      val = val ? 1 : 0
    }
    // "order" is a reserved word — must be quoted in SQL
    const colSql = key === 'order' ? '"order"' : key
    sets.push(`${colSql} = $${idx}`)
    params2.push(val)
    idx++
  }

  if (sets.length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  params2.push(id)
  const result = await db.query(
    `UPDATE org_chart SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
    params2
  ) as { rows: unknown[] }

  if (!result.rows?.length) return NextResponse.json({ error: 'Node not found' }, { status: 404 })
  return NextResponse.json({ node: result.rows[0] })
}

// ── DELETE /api/org-chart/[id] ────────────────────────────────────────────────
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const role   = req.headers.get('x-user-role') || ''
  if (!isAdmin(role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Find node's parent so we can re-parent children
  const nodeRes  = await db.query(`SELECT parent_id FROM org_chart WHERE id = $1`, [id]) as { rows: { parent_id: string | null }[] }
  const parentId = nodeRes.rows?.[0]?.parent_id ?? null

  // Re-parent direct children one level up (prevents orphaned nodes)
  await db.query(
    `UPDATE org_chart SET parent_id = $1 WHERE parent_id = $2`,
    [parentId, id]
  )

  const childCountRes = await db.query(`SELECT COUNT(*) AS n FROM org_chart WHERE parent_id = $1`, [parentId]) as { rows: { n: number | string }[] }
  const childCount    = childCountRes.rows?.[0]

  // Delete the node
  await db.query(`DELETE FROM org_chart WHERE id = $1`, [id])

  return NextResponse.json({ success: true, children_reparented: Number(childCount?.n ?? 0) })
}
