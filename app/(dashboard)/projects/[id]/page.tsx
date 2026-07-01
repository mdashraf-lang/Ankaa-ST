"use client"

import * as React from "react"
import Link from "next/link"
import { use } from "react"
import { ArrowLeft, Warning, ArrowsClockwise, CheckSquare, Users } from "@phosphor-icons/react"
import { PageHeader } from "@/components/ui/page-header"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { StatusBadge } from "@/components/ui/status-badge"
import { Badge } from "@/components/ui/badge"
import { GanttChart } from "@/components/projects/gantt-chart"
import { EmptyState } from "@/components/ui/empty-state"
import { DataTable } from "@/components/ui/data-table"
import { formatDate } from "@/lib/utils"
import type { ERPProject, ProjectTask, ProjectRisk, ChangeRequest, ActionItem } from "@/lib/types"
import type { Column } from "@/components/ui/data-table"

type TabKey = "overview" | "timeline" | "risks" | "changes" | "actions" | "team"

export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const [activeTab, setActiveTab] = React.useState<TabKey>("overview")
  const [project] = React.useState<ERPProject | null>(null)
  const [tasks] = React.useState<ProjectTask[]>([])
  const [risks] = React.useState<ProjectRisk[]>([])
  const [changes] = React.useState<ChangeRequest[]>([])
  const [actions] = React.useState<ActionItem[]>([])

  const tabs: { key: TabKey; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "timeline", label: "Timeline" },
    { key: "risks", label: "Risks" },
    { key: "changes", label: "Change Requests" },
    { key: "actions", label: "Action Items" },
    { key: "team", label: "Team" },
  ]

  const riskColumns: Column<ProjectRisk>[] = [
    { key: "title", header: "Risk", sortable: true },
    {
      key: "level",
      header: "Level",
      render: (v) => <StatusBadge status={v as string} />,
    },
    { key: "owner", header: "Owner", render: (v) => (v as string | null) ?? "—" },
    {
      key: "status",
      header: "Status",
      render: (v) => <StatusBadge status={v as string} />,
    },
    { key: "mitigation", header: "Mitigation", render: (v) => (v as string | null) ?? "—" },
  ]

  const changeColumns: Column<ChangeRequest>[] = [
    { key: "title", header: "Title", sortable: true },
    { key: "requester", header: "Requester" },
    {
      key: "status",
      header: "Status",
      render: (v) => <StatusBadge status={v as string} />,
    },
    {
      key: "impact",
      header: "Impact",
      render: (v) => <StatusBadge status={v as string} />,
    },
    {
      key: "created_at",
      header: "Submitted",
      render: (v) => formatDate(v as string),
    },
  ]

  const actionColumns: Column<ActionItem>[] = [
    { key: "title", header: "Action Item", sortable: true },
    {
      key: "due_date",
      header: "Due Date",
      render: (v) => (v ? formatDate(v as string) : "—"),
    },
    {
      key: "status",
      header: "Status",
      render: (v) => <StatusBadge status={v as string} />,
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={project?.name ?? "Project Details"}
        breadcrumb={
          <Link
            href="/projects"
            className="flex items-center gap-1.5 text-sm hover:underline"
            style={{ color: "var(--text-muted)" }}
          >
            <ArrowLeft size={14} />
            Back to Projects
          </Link>
        }
        actions={
          project ? <StatusBadge status={project.status} /> : undefined
        }
      />

      {/* Tab navigation */}
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

      {/* Tab content */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 flex flex-col gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Project Details</CardTitle>
              </CardHeader>
              <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                {[
                  { label: "Section", value: project?.section },
                  { label: "Status", value: project?.status, isBadge: true },
                  { label: "Start Date", value: project?.start_date ? formatDate(project.start_date) : undefined },
                  { label: "End Date", value: project?.end_date ? formatDate(project.end_date) : "—" },
                  { label: "Progress", value: project ? `${project.progress}%` : undefined },
                  { label: "Department", value: project?.department_id ?? "—" },
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

            {/* Progress bar */}
            {project && (
              <Card>
                <CardHeader>
                  <CardTitle>Overall Progress</CardTitle>
                  <span className="text-2xl font-bold" style={{ color: "var(--brand-navy)" }}>
                    {project.progress}%
                  </span>
                </CardHeader>
                <div
                  className="h-3 rounded-full overflow-hidden"
                  style={{ background: "var(--surface-muted)" }}
                >
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${project.progress}%`,
                      background: "var(--brand-navy)",
                    }}
                  />
                </div>
              </Card>
            )}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <div className="flex flex-col gap-3">
              {[
                { label: "Tasks", value: tasks.length },
                { label: "Risks", value: risks.length },
                { label: "Change Requests", value: changes.length },
                { label: "Action Items", value: actions.length },
              ].map((s) => (
                <div
                  key={s.label}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                  style={{ borderColor: "var(--surface-border)" }}
                >
                  <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
                    {s.label}
                  </span>
                  <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                    {s.value}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {activeTab === "timeline" && (
        <Card>
          <CardHeader>
            <CardTitle>Project Timeline</CardTitle>
          </CardHeader>
          <GanttChart
            tasks={tasks}
            startDate={project?.start_date ?? new Date().toISOString()}
            endDate={project?.end_date ?? new Date(Date.now() + 90 * 86400000).toISOString()}
          />
        </Card>
      )}

      {activeTab === "risks" && (
        <DataTable
          columns={riskColumns}
          data={risks}
          emptyIcon={<Warning size={28} />}
          emptyTitle="No risks identified"
          emptyDescription="Add risks to track potential issues and mitigations."
        />
      )}

      {activeTab === "changes" && (
        <DataTable
          columns={changeColumns}
          data={changes}
          emptyIcon={<ArrowsClockwise size={28} />}
          emptyTitle="No change requests"
          emptyDescription="Change requests for this project will appear here."
        />
      )}

      {activeTab === "actions" && (
        <DataTable
          columns={actionColumns}
          data={actions}
          emptyIcon={<CheckSquare size={28} />}
          emptyTitle="No action items"
          emptyDescription="Action items assigned in this project will appear here."
        />
      )}

      {activeTab === "team" && (
        <Card>
          <CardHeader>
            <CardTitle>Project Team</CardTitle>
          </CardHeader>
          <EmptyState
            icon={<Users size={28} />}
            title="No team members"
            description="Assign team members to this project to see them here."
          />
        </Card>
      )}
    </div>
  )
}
