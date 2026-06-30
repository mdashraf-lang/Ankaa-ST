"use client"

import * as React from "react"
import type { ProjectTask } from "@/lib/types"
import { EmptyState } from "@/components/ui/empty-state"
import { ChartBar } from "@phosphor-icons/react/dist/ssr"

interface GanttChartProps {
  tasks: ProjectTask[]
  startDate: string
  endDate: string
}

const statusColors: Record<string, string> = {
  not_started: "#C8CDD8",
  in_progress: "#1B2A5E",
  completed: "#10A854",
  blocked: "#D63C3C",
}

export function GanttChart({ tasks, startDate, endDate }: GanttChartProps) {
  const start = new Date(startDate)
  const end = new Date(endDate)
  const totalDays = Math.ceil(
    (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
  )

  if (tasks.length === 0) {
    return (
      <EmptyState
        icon={<ChartBar size={28} />}
        title="No tasks yet"
        description="Add tasks to this project to see the Gantt timeline."
      />
    )
  }

  return (
    <div className="overflow-x-auto">
      <div style={{ minWidth: Math.max(800, totalDays * 16 + 240) }}>
        {/* Header: months */}
        <div className="flex" style={{ paddingLeft: 240 }}>
          {(() => {
            const months: { label: string; days: number }[] = []
            const cur = new Date(start)
            while (cur <= end) {
              const y = cur.getFullYear()
              const m = cur.getMonth()
              const daysInMonth = new Date(y, m + 1, 0).getDate()
              const remaining =
                Math.ceil((end.getTime() - cur.getTime()) / (1000 * 60 * 60 * 24)) + 1
              const days = Math.min(daysInMonth - cur.getDate() + 1, remaining)
              months.push({
                label: cur.toLocaleString("en-GB", { month: "short", year: "2-digit" }),
                days,
              })
              cur.setMonth(cur.getMonth() + 1)
              cur.setDate(1)
            }
            return months.map((m, i) => (
              <div
                key={i}
                className="text-xs font-medium border-r py-1.5 px-2 flex-shrink-0"
                style={{
                  width: m.days * 16,
                  color: "var(--text-muted)",
                  borderColor: "var(--surface-border)",
                  background: "var(--surface-muted)",
                }}
              >
                {m.label}
              </div>
            ))
          })()}
        </div>

        {/* Tasks */}
        {tasks.map((task) => {
          const taskStart = task.start_date ? new Date(task.start_date) : start
          const taskEnd = task.end_date ? new Date(task.end_date) : end
          const offsetDays = Math.max(
            0,
            Math.ceil((taskStart.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
          )
          const durationDays = Math.max(
            1,
            Math.ceil((taskEnd.getTime() - taskStart.getTime()) / (1000 * 60 * 60 * 24)) + 1
          )
          const color = statusColors[task.status] ?? "#C8CDD8"

          return (
            <div
              key={task.id}
              className="flex items-center border-b"
              style={{
                borderColor: "var(--surface-border)",
                background: "var(--surface-base)",
              }}
            >
              {/* Task name */}
              <div
                className="flex-shrink-0 px-3 py-2 flex items-center gap-2"
                style={{
                  width: 240,
                  borderRight: "1px solid var(--surface-border)",
                  paddingLeft: task.parent_id ? 24 : undefined,
                }}
              >
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: color }}
                />
                <span
                  className="text-xs truncate"
                  style={{ color: "var(--text-primary)" }}
                  title={task.title}
                >
                  {task.title}
                </span>
              </div>

              {/* Bar area */}
              <div className="flex-1 relative h-9 flex items-center">
                {/* Background grid lines */}
                <div
                  className="absolute inset-0"
                  style={{
                    backgroundImage: `repeating-linear-gradient(90deg, var(--surface-border) 0, var(--surface-border) 1px, transparent 1px, transparent 16px)`,
                  }}
                />
                {/* Task bar */}
                <div
                  className="absolute h-5 rounded-full flex items-center px-2"
                  style={{
                    left: offsetDays * 16,
                    width: durationDays * 16 - 2,
                    background: color,
                    opacity: 0.9,
                  }}
                >
                  {durationDays > 3 && (
                    <span className="text-[9px] text-white font-medium truncate">
                      {task.progress}%
                    </span>
                  )}
                  {/* Progress fill */}
                  <div
                    className="absolute left-0 top-0 bottom-0 rounded-full"
                    style={{
                      width: `${task.progress}%`,
                      background: "rgba(255,255,255,0.3)",
                    }}
                  />
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
