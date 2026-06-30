import * as React from "react"
import { DataTable } from "@/components/ui/data-table"
import { StatusBadge } from "@/components/ui/status-badge"
import { Avatar } from "@/components/ui/avatar"
import { formatCurrency } from "@/lib/utils"
import type { PayrollRecord } from "@/lib/types"
import type { Column } from "@/components/ui/data-table"
import { Money } from "@phosphor-icons/react/dist/ssr"

export type PayrollRow = PayrollRecord & { employee_id: string | null }

interface PayrollTableProps {
  records: PayrollRow[]
  loading?: boolean
}

export function PayrollTable({ records, loading = false }: PayrollTableProps) {
  const columns: Column<PayrollRow>[] = [
    {
      key: "employee_id",
      header: "Emp. ID",
      render: (v) => (
        <span className="font-mono text-xs" style={{ color: "var(--text-muted)" }}>
          {(v as string | null) ?? "—"}
        </span>
      ),
    },
    {
      key: "full_name",
      header: "Employee",
      sortable: true,
      render: (v, row) => (
        <div className="flex items-center gap-2.5">
          <Avatar name={v as string} size="sm" />
          <div className="min-w-0">
            <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
              {v as string}
            </p>
            <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
              {row.position_title ?? row.department ?? ""}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "department",
      header: "Department",
      render: (v) => (
        <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
          {(v as string | null) ?? "—"}
        </span>
      ),
    },
    {
      key: "basic_salary",
      header: "Basic",
      sortable: true,
      render: (v) => (
        <span className="font-mono text-sm">{formatCurrency(v as number)}</span>
      ),
    },
    {
      key: "housing_allowance",
      header: "Housing",
      render: (v) => (
        <span className="font-mono text-sm text-blue-600">{formatCurrency(v as number)}</span>
      ),
    },
    {
      key: "transport_allowance",
      header: "Transport",
      render: (v) => (
        <span className="font-mono text-sm text-blue-600">{formatCurrency(v as number)}</span>
      ),
    },
    {
      key: "gross_salary",
      header: "Gross",
      sortable: true,
      render: (v) => (
        <span className="font-mono text-sm font-semibold">{formatCurrency(v as number)}</span>
      ),
    },
    {
      key: "gosi_employee",
      header: "GOSI (7%)",
      render: (v) =>
        v != null ? (
          <span className="font-mono text-sm" style={{ color: "var(--status-error)" }}>
            -{formatCurrency(v as number)}
          </span>
        ) : (
          <span className="text-xs" style={{ color: "var(--text-disabled)" }}>N/A</span>
        ),
    },
    {
      key: "net_salary",
      header: "Net Salary",
      sortable: true,
      render: (v) =>
        v != null ? (
          <span className="font-mono text-sm font-bold" style={{ color: "var(--status-success)" }}>
            {formatCurrency(v as number)}
          </span>
        ) : "—",
    },
    {
      key: "status",
      header: "Status",
      render: (v) => <StatusBadge status={v as string} />,
    },
  ]

  return (
    <DataTable
      columns={columns}
      data={records}
      loading={loading}
      emptyIcon={<Money size={28} />}
      emptyTitle="No payroll records"
      emptyDescription="No active employees with salary data found for this period."
    />
  )
}
