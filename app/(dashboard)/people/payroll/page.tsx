"use client"

import * as React from "react"
import { CaretLeft, CaretRight, DownloadSimple } from "@phosphor-icons/react"
import { PageHeader } from "@/components/ui/page-header"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { StatCard } from "@/components/ui/stat-card"
import { PayrollTable, type PayrollRow } from "@/components/people/payroll-table"
import { Money, Users, Bank, Buildings } from "@phosphor-icons/react/dist/ssr"
import { getMonthName, formatCurrency } from "@/lib/utils"
import { apiFetch } from "@/lib/api"

interface PayrollResponse {
  records: PayrollRow[]
  totals: {
    total_basic: number
    total_gross: number
    total_gosi_emp: number
    total_gosi_emr: number
    total_net: number
    employee_count: number
  }
  month: number
  year: number
}

export default function PayrollPage() {
  const today = new Date()
  const [viewMonth, setViewMonth] = React.useState(today.getMonth() + 1)
  const [viewYear,  setViewYear]  = React.useState(today.getFullYear())
  const [data,    setData]    = React.useState<PayrollResponse | null>(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    setLoading(true)
    apiFetch<PayrollResponse>(`/api/payroll?month=${viewMonth}&year=${viewYear}`)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [viewMonth, viewYear])

  const prevMonth = () => {
    if (viewMonth === 1) { setViewMonth(12); setViewYear((y) => y - 1) }
    else setViewMonth((m) => m - 1)
  }
  const nextMonth = () => {
    if (viewMonth === 12) { setViewMonth(1); setViewYear((y) => y + 1) }
    else setViewMonth((m) => m + 1)
  }

  const totals = data?.totals
  const records = data?.records ?? []

  function exportCSV() {
    const header = "Emp ID,Name,Department,Position,Basic (OMR),Housing,Transport,Gross,GOSI Emp,Net Salary"
    const rows = records.map(r =>
      [
        r.employee_id ?? '',
        r.full_name,
        r.department ?? '',
        r.position_title ?? '',
        r.basic_salary.toFixed(3),
        r.housing_allowance.toFixed(3),
        r.transport_allowance.toFixed(3),
        r.gross_salary.toFixed(3),
        (r.gosi_employee ?? 0).toFixed(3),
        (r.net_salary ?? 0).toFixed(3),
      ].join(',')
    )
    const csv = [header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `payroll_${getMonthName(viewMonth)}_${viewYear}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Payroll"
        subtitle={`Salary details for ${getMonthName(viewMonth)} ${viewYear}`}
        actions={
          <Button variant="secondary" size="md" onClick={exportCSV} disabled={loading || records.length === 0}>
            <DownloadSimple size={16} />
            Export CSV
          </Button>
        }
      />

      {/* Month selector */}
      <Card padding="sm">
        <div className="flex items-center gap-3">
          <button onClick={prevMonth}
            className="w-8 h-8 flex items-center justify-center rounded-[var(--radius-md)] hover:bg-[#F1F3F7] transition-colors"
            style={{ color: "var(--text-muted)" }}>
            <CaretLeft size={16} />
          </button>
          <span className="text-base font-semibold w-36 text-center" style={{ color: "var(--text-primary)" }}>
            {getMonthName(viewMonth)} {viewYear}
          </span>
          <button onClick={nextMonth}
            className="w-8 h-8 flex items-center justify-center rounded-[var(--radius-md)] hover:bg-[#F1F3F7] transition-colors"
            style={{ color: "var(--text-muted)" }}>
            <CaretRight size={16} />
          </button>
        </div>
      </Card>

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Net Payroll"
          value={loading ? "—" : `OMR ${(totals?.total_net ?? 0).toLocaleString("en-OM", { minimumFractionDigits: 3 })}`}
          subtitle="Net salaries this month"
          icon={<Money size={18} />}
          color="#1B2A5E"
          iconBg="#EEF1F8"
        />
        <StatCard
          title="Employees"
          value={loading ? "—" : totals?.employee_count ?? 0}
          subtitle="On payroll this month"
          icon={<Users size={18} />}
          color="#2563EB"
          iconBg="#EFF4FF"
        />
        <StatCard
          title="GOSI Employer"
          value={loading ? "—" : `OMR ${(totals?.total_gosi_emr ?? 0).toLocaleString("en-OM", { minimumFractionDigits: 3 })}`}
          subtitle="Total employer contribution (11.5%)"
          icon={<Bank size={18} />}
          color="#E89B1A"
          iconBg="#FFF8E6"
        />
        <StatCard
          title="Total Gross"
          value={loading ? "—" : `OMR ${(totals?.total_gross ?? 0).toLocaleString("en-OM", { minimumFractionDigits: 3 })}`}
          subtitle="Before deductions"
          icon={<Buildings size={18} />}
          color="#10A854"
          iconBg="#EDFBF3"
        />
      </div>

      {/* Allowances breakdown */}
      {!loading && records.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Payroll Breakdown</CardTitle></CardHeader>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            {[
              { label: "Basic Salaries",       value: totals?.total_basic  ?? 0 },
              { label: "Housing Allowances",   value: records.reduce((s, r) => s + r.housing_allowance, 0) },
              { label: "Transport Allowances", value: records.reduce((s, r) => s + r.transport_allowance, 0) },
              { label: "GOSI (Employee)",      value: totals?.total_gosi_emp ?? 0 },
            ].map(({ label, value }) => (
              <div key={label} className="flex flex-col gap-1 p-3 rounded-[var(--radius-md)]"
                style={{ background: "var(--surface-subtle)" }}>
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>{label}</span>
                <span className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
                  {formatCurrency(value)}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Payroll table */}
      <PayrollTable records={records} loading={loading} />
    </div>
  )
}
