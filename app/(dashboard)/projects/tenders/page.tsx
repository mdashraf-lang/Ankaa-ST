"use client"

import * as React from "react"
import { Plus, FileText } from "@phosphor-icons/react"
import { PageHeader } from "@/components/ui/page-header"
import { Button } from "@/components/ui/button"
import { StatCard } from "@/components/ui/stat-card"
import { DataTable } from "@/components/ui/data-table"
import { StatusBadge } from "@/components/ui/status-badge"
import { formatDate, formatCurrency } from "@/lib/utils"
import {
  Files,
  FolderOpen,
  HourglassHigh,
  Trophy,
} from "@phosphor-icons/react/dist/ssr"
import type { Tender } from "@/lib/types"
import type { Column } from "@/components/ui/data-table"
import Link from "next/link"

export default function TendersPage() {
  const [tenders] = React.useState<Tender[]>([])
  const [loading] = React.useState(false)
  const [statusFilter, setStatusFilter] = React.useState<string>("all")

  const filteredTenders =
    statusFilter === "all"
      ? tenders
      : tenders.filter((t) => t.status === statusFilter)

  const stats = {
    total: tenders.length,
    open: tenders.filter((t) => t.status === "open").length,
    inProgress: tenders.filter((t) => t.status === "in_progress").length,
    awarded: tenders.filter((t) => t.status === "awarded").length,
  }

  const filterTabs = [
    { key: "all", label: "All" },
    { key: "open", label: "Open" },
    { key: "in_progress", label: "In Progress" },
    { key: "submitted", label: "Submitted" },
    { key: "under_review", label: "Under Review" },
    { key: "awarded", label: "Awarded" },
    { key: "rejected", label: "Rejected" },
  ]

  const columns: Column<Tender>[] = [
    {
      key: "reference_number",
      header: "Reference",
      render: (v) => (
        <span className="font-mono text-xs" style={{ color: "var(--text-muted)" }}>
          {v as string}
        </span>
      ),
    },
    {
      key: "title",
      header: "Tender Title",
      sortable: true,
      render: (v, row) => (
        <Link href={`/projects/tenders/${row.id}`}>
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
      key: "client_name",
      header: "Client",
      sortable: true,
    },
    {
      key: "tender_value",
      header: "Value",
      sortable: true,
      render: (v, row) =>
        v != null ? formatCurrency(v as number, row.currency as string) : "â€”",
    },
    {
      key: "submission_deadline",
      header: "Deadline",
      sortable: true,
      render: (v) => {
        const d = new Date(v as string)
        const daysLeft = Math.ceil((d.getTime() - Date.now()) / 86400000)
        return (
          <div className="flex flex-col">
            <span style={{ color: "var(--text-secondary)" }}>{formatDate(v as string)}</span>
            {daysLeft > 0 && daysLeft <= 7 && (
              <span className="text-xs" style={{ color: "var(--status-warning)" }}>
                {daysLeft}d left
              </span>
            )}
            {daysLeft <= 0 && (
              <span className="text-xs" style={{ color: "var(--status-error)" }}>
                Overdue
              </span>
            )}
          </div>
        )
      },
    },
    {
      key: "priority",
      header: "Priority",
      render: (v) => <StatusBadge status={v as string} />,
    },
    {
      key: "status",
      header: "Status",
      render: (v) => <StatusBadge status={v as string} />,
    },
    {
      key: "id",
      header: "Actions",
      render: (v) => (
        <Link href={`/projects/tenders/${v}`}>
          <Button variant="ghost" size="icon-sm">
            <FolderOpen size={14} />
          </Button>
        </Link>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Tenders"
        actions={
          <Button variant="primary" size="md">
            <Plus size={16} />
            New Tender
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Tenders"
          value={stats.total}
          icon={<Files size={18} />}
          color="#1B2A5E"
          iconBg="#EEF1F8"
        />
        <StatCard
          title="Open"
          value={stats.open}
          icon={<FolderOpen size={18} />}
          color="#2563EB"
          iconBg="#EFF4FF"
        />
        <StatCard
          title="In Progress"
          value={stats.inProgress}
          icon={<HourglassHigh size={18} />}
          color="#E89B1A"
          iconBg="#FFF8E6"
        />
        <StatCard
          title="Awarded"
          value={stats.awarded}
          icon={<Trophy size={18} />}
          color="#10A854"
          iconBg="#EDFBF3"
        />
      </div>

      {/* Filter tabs */}
      <div
        className="flex border-b overflow-x-auto"
        style={{ borderColor: "var(--surface-border)" }}
      >
        {filterTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            className="px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap"
            style={{
              borderColor:
                statusFilter === tab.key ? "var(--brand-navy)" : "transparent",
              color:
                statusFilter === tab.key ? "var(--brand-navy)" : "var(--text-muted)",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={filteredTenders}
        loading={loading}
        emptyIcon={<FileText size={28} />}
        emptyTitle="No tenders found"
        emptyDescription="Create a new tender to start tracking your pipeline."
        emptyAction={
          <Button variant="primary" size="sm">
            <Plus size={14} />
            New Tender
          </Button>
        }
      />
    </div>
  )
}

