"use client"

import * as React from "react"
import { Plus, Rows, SquaresFour, Briefcase, ListChecks } from "@phosphor-icons/react"
import Link from "next/link"
import { PageHeader } from "@/components/ui/page-header"
import { Button } from "@/components/ui/button"
import { ProjectCard } from "@/components/projects/project-card"
import { DataTable } from "@/components/ui/data-table"
import { StatusBadge } from "@/components/ui/status-badge"
import { EmptyState } from "@/components/ui/empty-state"
import { formatDate } from "@/lib/utils"
import type { ERPProject } from "@/lib/types"
import type { Column } from "@/components/ui/data-table"

type Section = "all" | ERPProject["section"]
type ViewMode = "kanban" | "list"

const sectionLabels: Record<ERPProject["section"], string> = {
  current: "Current",
  expected: "Expected",
  research: "R&D",
  closing: "Closing",
}

export default function ProjectsPage() {
  const [activeSection, setActiveSection] = React.useState<Section>("all")
  const [viewMode, setViewMode] = React.useState<ViewMode>("kanban")
  const [projects] = React.useState<ERPProject[]>([])
  const [loading] = React.useState(false)

  const tabs: { key: Section; label: string }[] = [
    { key: "all", label: "All" },
    { key: "current", label: "Current" },
    { key: "expected", label: "Expected" },
    { key: "research", label: "R&D" },
    { key: "closing", label: "Closing" },
  ]

  const filteredProjects =
    activeSection === "all"
      ? projects
      : projects.filter((p) => p.section === activeSection)

  const columns: Column<ERPProject>[] = [
    {
      key: "name",
      header: "Project Name",
      sortable: true,
      render: (v) => (
        <span className="font-medium" style={{ color: "var(--text-primary)" }}>
          {v as string}
        </span>
      ),
    },
    {
      key: "section",
      header: "Section",
      render: (v) => (
        <span
          className="text-xs px-2 py-0.5 rounded-full"
          style={{
            background: "var(--surface-muted)",
            color: "var(--text-secondary)",
          }}
        >
          {sectionLabels[v as ERPProject["section"]]}
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
        <div className="flex items-center gap-2 min-w-[100px]">
          <div
            className="flex-1 h-1.5 rounded-full overflow-hidden"
            style={{ background: "var(--surface-muted)" }}
          >
            <div
              className="h-full rounded-full"
              style={{ width: `${v}%`, background: "var(--brand-navy)" }}
            />
          </div>
          <span className="text-xs tabular-nums w-8 text-right" style={{ color: "var(--text-muted)" }}>
            {v as number}%
          </span>
        </div>
      ),
    },
    {
      key: "start_date",
      header: "Start",
      render: (v) => formatDate(v as string),
    },
    {
      key: "end_date",
      header: "End",
      render: (v) => (v ? formatDate(v as string) : "—"),
    },
    {
      key: "id",
      header: "",
      render: (v) => (
        <Link href={`/tasks/list?board=${v}`}>
          <button
            className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-[var(--radius-md)] transition-all hover:opacity-80"
            style={{ background: "#EEF1F8", color: "#1B2A5E" }}
          >
            <ListChecks size={12} /> Tasks
          </button>
        </Link>
      ),
    },
  ]

  const grouped = React.useMemo(() => {
    const g: Record<ERPProject["section"], ERPProject[]> = {
      current: [],
      expected: [],
      research: [],
      closing: [],
    }
    projects.forEach((p) => g[p.section].push(p))
    return g
  }, [projects])

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Projects"
        subtitle="Manage all company projects across departments"
        actions={
          <div className="flex items-center gap-2">
            <div
              className="flex items-center rounded-[var(--radius-md)] border p-0.5"
              style={{ borderColor: "var(--surface-border)" }}
            >
              <button
                onClick={() => setViewMode("kanban")}
                className="flex items-center justify-center w-8 h-7 rounded-[var(--radius-sm)] transition-colors"
                style={{
                  background:
                    viewMode === "kanban" ? "var(--brand-navy)" : "transparent",
                  color:
                    viewMode === "kanban" ? "white" : "var(--text-muted)",
                }}
                title="Kanban view"
              >
                <SquaresFour size={15} />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className="flex items-center justify-center w-8 h-7 rounded-[var(--radius-sm)] transition-colors"
                style={{
                  background:
                    viewMode === "list" ? "var(--brand-navy)" : "transparent",
                  color:
                    viewMode === "list" ? "white" : "var(--text-muted)",
                }}
                title="List view"
              >
                <Rows size={15} />
              </button>
            </div>
            <Button variant="primary" size="md">
              <Plus size={16} />
              New Project
            </Button>
          </div>
        }
      />

      {/* Section tabs */}
      <div
        className="flex border-b"
        style={{ borderColor: "var(--surface-border)" }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveSection(tab.key)}
            className="px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors"
            style={{
              borderColor:
                activeSection === tab.key ? "var(--brand-navy)" : "transparent",
              color:
                activeSection === tab.key
                  ? "var(--brand-navy)"
                  : "var(--text-muted)",
            }}
          >
            {tab.label}
            {tab.key !== "all" && (
              <span
                className="ml-1.5 text-xs"
                style={{ color: "var(--text-disabled)" }}
              >
                ({(tab.key === "research" ? grouped.research : grouped[tab.key as keyof typeof grouped])?.length ?? 0})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {viewMode === "kanban" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {(["current", "expected", "research", "closing"] as const).map(
            (section) => {
              const sectionProjects =
                activeSection === "all"
                  ? grouped[section]
                  : section === activeSection
                  ? grouped[section]
                  : []

              if (activeSection !== "all" && section !== activeSection) return null

              return (
                <div key={section} className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <h3
                      className="text-sm font-semibold"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {sectionLabels[section]}
                    </h3>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{
                        background: "var(--surface-muted)",
                        color: "var(--text-muted)",
                      }}
                    >
                      {sectionProjects.length}
                    </span>
                  </div>

                  <div
                    className="rounded-[var(--radius-lg)] p-2 flex flex-col gap-2 min-h-[200px]"
                    style={{ background: "var(--surface-muted)" }}
                  >
                    {sectionProjects.length === 0 ? (
                      <div className="flex-1 flex items-center justify-center py-8">
                        <p className="text-xs" style={{ color: "var(--text-disabled)" }}>
                          No projects
                        </p>
                      </div>
                    ) : (
                      sectionProjects.map((p) => (
                        <div key={p.id} className="flex flex-col gap-1">
                          <ProjectCard project={p} />
                          <Link href={`/tasks/list?board=${p.id}`}
                            className="flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-[var(--radius-md)] transition-all hover:bg-[#EEF1F8] self-start"
                            style={{ color: "#1B2A5E" }}>
                            <ListChecks size={11} /> Open Tasks →
                          </Link>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )
            }
          )}
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={filteredProjects}
          loading={loading}
          emptyIcon={<Briefcase size={28} />}
          emptyTitle="No projects found"
          emptyDescription="Create a new project to get started."
          emptyAction={
            <Button variant="primary" size="sm">
              <Plus size={14} />
              New Project
            </Button>
          }
        />
      )}
    </div>
  )
}

