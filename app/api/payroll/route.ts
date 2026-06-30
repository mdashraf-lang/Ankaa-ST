import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { isAdmin } from '@/lib/auth'

// Oman GOSI rates (full-time Omani nationals)
const GOSI_EMPLOYEE = 0.07   // 7%
const GOSI_EMPLOYER = 0.115  // 11.5%
const TRANSPORT_ALLOWANCE = 50  // OMR flat

export async function GET(req: NextRequest) {
  const role = req.headers.get('x-user-role') || ''
  const userId = req.headers.get('x-user-id') || ''
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1))
  const year  = parseInt(searchParams.get('year')  || String(new Date().getFullYear()))

  // Admins/HR/MD/CTO see all; others see only their own slip
  const viewAll = isAdmin(role) || ['hr', 'md', 'cto', 'coo', 'finance'].includes(role)

  const { data: profiles, error } = await db
    .from('profiles')
    .select('id, full_name, email, employee_id, position_title, department_id, contract_type, basic_salary, status, role, joining_date')
    .eq('status', 'active')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows = (profiles || [])
    .filter((p: Record<string, unknown>) => viewAll || p.id === userId)
    .filter((p: Record<string, unknown>) => p.basic_salary && (p.basic_salary as number) > 0)
    .map((p: Record<string, unknown>) => {
      const basic = (p.basic_salary as number) ?? 0
      const housingPct = ['md','cto','coo','admin'].includes(p.role as string) ? 0.30 : 0.25
      const housing    = Math.round(basic * housingPct * 1000) / 1000
      const transport  = TRANSPORT_ALLOWANCE
      const gross      = basic + housing + transport

      const isFullTime = (p.contract_type as string) === 'full_time'
      const gosiEmp    = isFullTime ? Math.round(basic * GOSI_EMPLOYEE * 1000) / 1000 : 0
      const gosiEmr    = isFullTime ? Math.round(basic * GOSI_EMPLOYER * 1000) / 1000 : 0
      const net        = Math.round((gross - gosiEmp) * 1000) / 1000

      // Calculate working days in the month (Sun–Thu for Oman)
      const daysInMonth = new Date(year, month, 0).getDate()
      let workingDays = 0
      for (let d = 1; d <= daysInMonth; d++) {
        const dow = new Date(year, month - 1, d).getDay()
        if (dow !== 5 && dow !== 6) workingDays++ // Fri=5, Sat=6 are Oman weekend
      }

      return {
        id:                `${p.id}-${year}-${month}`,
        period_id:         `${year}-${String(month).padStart(2,'0')}`,
        user_id:           p.id,
        employee_id:       p.employee_id ?? null,
        full_name:         p.full_name,
        position_title:    p.position_title ?? null,
        department:        p.department_id ?? null,
        basic_salary:      basic,
        housing_allowance: housing,
        transport_allowance: transport,
        other_allowances:  0,
        gross_salary:      gross,
        gosi_employee:     gosiEmp || null,
        gosi_employer:     gosiEmr || null,
        other_deductions:  0,
        net_salary:        net,
        working_days:      workingDays,
        status:            'pending',
      }
    })
    .sort((a: Record<string, unknown>, b: Record<string, unknown>) =>
      String(a.full_name ?? '').localeCompare(String(b.full_name ?? ''))
    )

  type Row = typeof rows[number]
  const totals = {
    total_basic:    rows.reduce((s: number, r: Row) => s + r.basic_salary, 0),
    total_gross:    rows.reduce((s: number, r: Row) => s + r.gross_salary, 0),
    total_gosi_emp: rows.reduce((s: number, r: Row) => s + (r.gosi_employee ?? 0), 0),
    total_gosi_emr: rows.reduce((s: number, r: Row) => s + (r.gosi_employer ?? 0), 0),
    total_net:      rows.reduce((s: number, r: Row) => s + (r.net_salary ?? 0), 0),
    employee_count: rows.length,
  }

  return NextResponse.json({ records: rows, totals, month, year })
}
