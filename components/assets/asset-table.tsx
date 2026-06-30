import * as React from "react"
import Link from "next/link"
import { DataTable } from "@/components/ui/data-table"
import { StatusBadge } from "@/components/ui/status-badge"
import { formatDate, formatCurrency } from "@/lib/utils"
import { Package } from "@phosphor-icons/react/dist/ssr"
import type { Asset } from "@/lib/types"
import type { Column } from "@/components/ui/data-table"

interface AssetTableProps {
  assets: Asset[]
  loading?: boolean
}

export function AssetTable({ assets, loading = false }: AssetTableProps) {
  const columns: Column<Asset>[] = [
    {
      key: "asset_id",
      header: "Asset ID",
      render: (v) => (
        <span className="font-mono text-xs" style={{ color: "var(--text-muted)" }}>
          {(v as string | null) ?? "—"}
        </span>
      ),
    },
    {
      key: "name",
      header: "Name",
      sortable: true,
      render: (v, row) => (
        <Link href={`/assets/${row.id}`}>
          <span
            className="font-medium hover:underline"
            style={{ color: "var(--brand-navy)" }}
          >
            {v as string}
          </span>
        </Link>
      ),
    },
    {
      key: "category_id",
      header: "Category",
      render: (v) => (v as string | null) ?? "—",
    },
    {
      key: "company_id",
      header: "Company",
      render: (v) => (v as string | null) ?? "—",
    },
    {
      key: "status",
      header: "Status",
      render: (v) => <StatusBadge status={v as string} />,
    },
    {
      key: "condition",
      header: "Condition",
      render: (v) => (
        <span
          className="text-xs px-2 py-0.5 rounded-full capitalize"
          style={{
            background: "var(--surface-muted)",
            color: "var(--text-secondary)",
          }}
        >
          {(v as string).replace("_", " ")}
        </span>
      ),
    },
    {
      key: "purchase_date",
      header: "Purchase Date",
      sortable: true,
      render: (v) => formatDate(v as string),
    },
    {
      key: "current_value",
      header: "Current Value",
      sortable: true,
      render: (v) =>
        v != null ? formatCurrency(v as number) : "—",
    },
  ]

  return (
    <DataTable
      columns={columns}
      data={assets}
      loading={loading}
      emptyIcon={<Package size={28} />}
      emptyTitle="No assets found"
      emptyDescription="Add assets to begin tracking your company inventory."
    />
  )
}
