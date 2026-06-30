import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { isAdmin } from '@/lib/auth'
import { randomUUID } from 'crypto'

// Force dynamic so Next.js never caches this — CRUD must always reflect latest data
export const dynamic = 'force-dynamic'

// ── GET /api/org-chart ────────────────────────────────────────────────────────
export async function GET() {
  // Use raw SQL to avoid the QueryBuilder generating `ORDER BY order` (reserved keyword)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nodesResult    = await (db.query(`SELECT * FROM org_chart ORDER BY "order" ASC`) as Promise<{ rows: any[] }>)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const profilesResult = await (db.query(`SELECT id, full_name, email, role, phone_number, employee_id, position_title, department_id, status, avatar_url, joining_date, basic_salary, contract_type, gender, date_of_birth, emergency_number FROM profiles`) as Promise<{ rows: any[] }>)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const profileMap = new Map<string, any>(
    (profilesResult.rows ?? []).map((p: any) => [p.id as string, p])
  )

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nodes = (nodesResult.rows ?? []).map((n: any) => {
    const profile = profileMap.get(n.user_id)
    return {
      ...n,
      // Profile data takes precedence; fall back to values stored directly on the org_chart row
      full_name:         profile?.full_name         ?? n.full_name         ?? null,
      email:             profile?.email              ?? n.email             ?? null,
      role:              profile?.role               ?? null,
      phone_number:      profile?.phone_number       ?? null,
      employee_id:       profile?.employee_id        ?? null,
      position_title:    n.title ?? profile?.position_title ?? null,
      dept_from_profile: profile?.department_id      ?? null,
      status:            profile?.status             ?? 'active',
      avatar_url:        profile?.avatar_url         ?? null,
      joining_date:      profile?.joining_date       ?? null,
      basic_salary:      profile?.basic_salary       ?? null,
      contract_type:     profile?.contract_type      ?? null,
      gender:            profile?.gender             ?? null,
      emergency_number:  profile?.emergency_number   ?? null,
      level:             n.level                    ?? null,
    }
  })

  return NextResponse.json({ org_chart: nodes })
}

// ── POST /api/org-chart ───────────────────────────────────────────────────────
// { node: {...} }          → add a single node
// { nodes: [...] }         → bulk replace (legacy internal use)
export async function POST(req: NextRequest) {
  const role = req.headers.get('x-user-role') || ''
  if (!isAdmin(role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()

  // ── Bulk replace ──────────────────────────────────────────────────────────
  if (body.nodes && Array.isArray(body.nodes)) {
    await db.query(`DELETE FROM org_chart WHERE id != $1`, ['__never__'])
    for (const n of body.nodes) {
      await db.query(
        `INSERT INTO org_chart (id, title, user_id, parent_id, position, color,
          children_layout, "order", department, reporting_to,
          is_c_level, can_direct_approve, is_head_of_department)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) ON CONFLICT DO NOTHING`,
        [n.id ?? randomUUID(), n.title ?? null, n.user_id ?? null, n.parent_id ?? null,
         n.position ?? 'center', n.color ?? null, n.children_layout ?? null,
         n.order ?? 0, n.department ?? null, n.reporting_to ?? null,
         n.is_c_level ? 1 : 0, n.can_direct_approve ? 1 : 0, n.is_head_of_department ? 1 : 0]
      )
    }
    return NextResponse.json({ success: true })
  }

  // ── Add single node ───────────────────────────────────────────────────────
  const n = body.node
  if (!n) return NextResponse.json({ error: 'node required' }, { status: 400 })

  const id = n.id ?? randomUUID()
  const result = await db.query(
    `INSERT INTO org_chart (id, title, user_id, parent_id, position, color,
      children_layout, "order", department, reporting_to,
      is_c_level, can_direct_approve, is_head_of_department)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
    [id, n.title ?? null, n.user_id ?? null, n.parent_id ?? null,
     n.position ?? 'center', n.color ?? null, n.children_layout ?? null,
     n.order ?? 0, n.department ?? null, n.reporting_to ?? null,
     n.is_c_level ? 1 : 0, n.can_direct_approve ? 1 : 0, n.is_head_of_department ? 1 : 0]
  ) as { rows: unknown[] }

  return NextResponse.json({ node: result.rows?.[0] ?? null })
}
