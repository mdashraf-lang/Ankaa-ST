"use client"

import * as React from "react"
import { use } from "react"
import Link from "next/link"
import { ArrowLeft, Users, File, ChartBar } from "@phosphor-icons/react"
import { PageHeader } from "@/components/ui/page-header"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { StatusBadge } from "@/components/ui/status-badge"
import { DataTable } from "@/components/ui/data-table"
import { EmptyState } from "@/components/ui/empty-state"
import { formatDate, formatCurrency } from "@/lib/utils"
import type { Tender, TenderAssignment, TenderSubmission } from "@/lib/types"
import type { Column } from "@/components/ui/data-table"

type TabKey = "overview" | "assignments" | "submissions" | "progress"

export default function TenderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const [activeTab, setActiveTab] = React.useState<TabKey>("overview")
  const [tender] = React.useState<Tender | null>(null)
  const [assignments] = React.useState<TenderAssignment[]>([])
  const [submissions] = React.useState<TenderSubmission[]>([])

  const tabs: { key: TabKey; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "assignments", label: "Assignments" },
    { key: "submissions", label: "Submissions" },
    { key: "progress", label: "Progress" },
  ]

  const assignmentColumns: Column<TenderAssignment>[] = [
    {
      key: "full_name",
      header: "Employee",
      render: (v) => (
        <span className="font-medium" style={{ color: "var(--text-primary)" }}>
          {(v as string | null) ?? "—"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (v) => <StatusBadge status={v as string} />,
    },
    {
      key: "progress",
      header: "Progress",
      render: (v) => (
        <div className="flex items-center gap-2">
          <div
            className="w-20 h-1.5 rounded-full overflow-hidden"
            style={{ background: "var(--surface-muted)" }}
          >
            <div
              className="h-full rounded-full"
              style={{ width: `${v}%`, background: "var(--brand-navy)" }}
            />
          </div>
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            {v as number}%
          </span>
        </div>
      ),
    },
    {
      key: "due_date",
      header: "Due Date",
      render: (v) => (v ? formatDate(v as string) : "—"),
    },
  ]

  const submissionColumns: Column<TenderSubmission>[] = [
    {
      key: "version",
      header: "Version",
      render: (v) => (
        <span className="font-mono text-xs" style={{ color: "var(--text-muted)" }}>
          {v as string}
        </span>
      ),
    },
    { key: "type", header: "Type" },
    { key: "submitted_by", header: "Submitted By" },
    {
      key: "submitted_at",
      header: "Date",
      render: (v) => formatDate(v as string),
    },
    {
      key: "file_url",
      header: "File",
      render: (v) =>
        v ? (
          <a
            href={v as string}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm hover:underline"
            style={{ color: "var(--brand-navy)" }}
          >
            Download
          </a>
        ) : (
          <span style={{ color: "var(--text-disabled)" }}>—</span>
        ),
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={tender?.title ?? "Tender Details"}
        breadcrumb={
          <Link
            href="/projects/tenders"
            className="flex items-center gap-1.5 text-sm hover:underline"
            style={{ color: "var(--text-muted)" }}
          >
            <ArrowLeft size={14} />
            Back to Tenders
          </Link>
        }
        actions={tender ? <StatusBadge status={tender.status} /> : undefined}
      />

      {/* Tabs */}
      <div
        className="flex border-b"
        style={{ borderColor: "var(--surface-border)" }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors"
            style={{
              borderColor:
                activeTab === tab.key ? "var(--brand-navy)" : "transparent",
              color:
                activeTab === tab.key ? "var(--brand-navy)" : "var(--text-muted)",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Tender Information</CardTitle>
            </CardHeader>
            <div className="grid grid-cols-2 gap-x-8 gap-y-4">
              {[
                { label: "Reference", value: tender?.reference_number },
                { label: "Client", value: tender?.client_name },
                {
                  label: "Value",
                  value: tender?.tender_value
                    ? formatCurrency(tender.tender_value, tender.currency)
                    : "—",
                },
                { label: "Currency", value: tender?.currency },
                {
                  label: "Deadline",
                  value: tender?.submission_deadline
                    ? formatDate(tender.submission_deadline)
                    : undefined,
                },
                { label: "Priority", value: tender?.priority, isBadge: true },
                { label: "Status", value: tender?.status, isBadge: true },
                {
                  label: "Created",
                  value: tender?.created_at
                    ? formatDate(tender.created_at)
                    : undefined,
                },
              ].map((f) => (
                <div key={f.label} className="flex flex-col gap-0.5">
                  <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
                    {f.label}
                  </span>
                  {f.isBadge && f.value ? (
                    <StatusBadge status={f.value} />
                  ) : (
                    <span className="text-sm" style={{ color: "var(--text-primary)" }}>
                      {f.value ?? "—"}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
            </CardHeader>
            <div className="flex flex-col gap-3">
              {[
                { label: "Created", date: tender?.created_at },
                { label: "Submission Deadline", date: tender?.submission_deadline },
              ].map((t) => (
                <div
                  key={t.label}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                  style={{ borderColor: "var(--surface-border)" }}
                >
                  <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
                    {t.label}
                  </span>
                  <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                    {t.date ? formatDate(t.date) : "—"}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {activeTab === "assignments" && (
        <DataTable
          columns={assignmentColumns}
          data={assignments}
          emptyIcon={<Users size={28} />}
          emptyTitle="No assignments"
          emptyDescription="Assign team members to work on this tender."
        />
      )}

      {activeTab === "submissions" && (
        <DataTable
          columns={submissionColumns}
          data={submissions}
          emptyIcon={<File size={28} />}
          emptyTitle="No submissions yet"
          emptyDescription="Document submissions will appear here."
        />
      )}

      {activeTab === "progress" && (
        <Card>
          <CardHeader>
            <CardTitle>Overall Progress</CardTitle>
          </CardHeader>
          {assignments.length === 0 ? (
            <EmptyState
              icon={<ChartBar size={28} />}
              title="No progress data"
              description="Progress will be shown once team members are assigned."
            />
          ) : (
            <div className="flex flex-col gap-4">
              {assignments.map((a) => (
                <div key={a.id} className="flex flex-col gap-1">
                  <div className="flex justify-between">
                    <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
                      {a.full_name ?? a.user_id}
                    </span>
                    <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                      {a.progress}%
                    </span>
                  </div>
                  <div
                    className="h-2 rounded-full overflow-hidden"
                    style={{ background: "var(--surface-muted)" }}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${a.progress}%`, background: "var(--brand-navy)" }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
