"use client"

import * as React from "react"
import { ListChecks } from "@phosphor-icons/react"
import { PageHeader } from "@/components/ui/page-header"
import { DataTable } from "@/components/ui/data-table"
import { StatusBadge } from "@/components/ui/status-badge"
import { formatDate } from "@/lib/utils"
import type { KanbanCard } from "@/lib/types"
import type { Column } from "@/components/ui/data-table"

type FilterTab = "all" | "today" | "week" | "overdue" | "completed"

export default function TaskListPage() {
  const [activeFilter, setActiveFilter] = React.useState<FilterTab>("all")
  const [tasks] = React.useState<KanbanCard[]>([])
  const [loading] = React.useState(false)

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const endOfWeek = new Date(today)
  endOfWeek.setDate(today.getDate() + 7)

  const filteredTasks = tasks.filter((t) => {
    if (activeFilter === "completed") return t.completed
    if (activeFilter === "all") return !t.completed
    if (!t.due_date) return false
    const due = new Date(t.due_date)
    if (activeFilter === "today")
      return due.toDateString() === today.toDateString() && !t.completed
    if (activeFilter === "week")
      return due >= today && due <= endOfWeek && !t.completed
    if (activeFilter === "overdue") return due < today && !t.completed
    return true
  })

  const filterTabs: { key: FilterTab; label: string }[] = [
    { key: "all", label: "All" },
    { key: "today", label: "Today" },
    { key: "week", label: "This Week" },
    { key: "overdue", label: "Overdue" },
    { key: "completed", label: "Completed" },
  ]

  const columns: Column<KanbanCard>[] = [
    {
      key: "title",
      header: "Task",
      sortable: true,
      render: (v, row) => (
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={row.completed as boolean}
            readOnly
            className="w-4 h-4 rounded accent-[#1B2A5E]"
          />
          <span
            className="text-sm font-medium"
            style={{
              color: "var(--text-primary)",
              textDecoration: row.completed ? "line-through" : undefined,
            }}
          >
            {v as string}
          </span>
        </div>
      ),
    },
    {
      key: "list_id",
      header: "Board",
      render: (v) => (
        <span
          className="text-xs px-2 py-0.5 rounded-full"
          style={{
            background: "var(--surface-muted)",
            color: "var(--text-secondary)",
          }}
        >
          {v as string}
        </span>
      ),
    },
    {
      key: "priority",
      header: "Priority",
      sortable: true,
      render: (v) =>
        v ? <StatusBadge status={v as string} /> : (
          <span style={{ color: "var(--text-disabled)" }}>â€”</span>
        ),
    },
    {
      key: "due_date",
      header: "Due Date",
      sortable: true,
      render: (v) => {
        if (!v) return <span style={{ color: "var(--text-disabled)" }}>â€”</span>
        const due = new Date(v as string)
        const isOverdue = due < today
        return (
          <span style={{ color: isOverdue ? "var(--status-error)" : "var(--text-secondary)" }}>
            {formatDate(v as string)}
          </span>
        )
      },
    },
    {
      key: "completed",
      header: "Status",
      render: (v) => (
        <StatusBadge status={v ? "completed" : "pending"} />
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="My Tasks"
        subtitle="All tasks assigned to you"
      />

      {/* Filter tabs */}
      <div
        className="flex border-b"
        style={{ borderColor: "var(--surface-border)" }}
      >
        {filterTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveFilter(tab.key)}
            className="px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors"
            style={{
              borderColor:
                activeFilter === tab.key ? "var(--brand-navy)" : "transparent",
              color:
                activeFilter === tab.key ? "var(--brand-navy)" : "var(--text-muted)",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={filteredTasks}
        loading={loading}
        emptyIcon={<ListChecks size={28} />}
        emptyTitle="No tasks found"
        emptyDescription={
          activeFilter === "overdue"
            ? "You have no overdue tasks."
            : activeFilter === "today"
            ? "No tasks due today."
            : "No tasks assigned to you."
        }
      />
    </div>
  )
}

