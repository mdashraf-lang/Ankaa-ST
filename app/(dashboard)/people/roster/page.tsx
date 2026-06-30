"use client"

import * as React from "react"
import { CaretLeft, CaretRight, Plus } from "@phosphor-icons/react"
import { toast } from "sonner"
import { PageHeader } from "@/components/ui/page-header"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { getDaysInMonth, getMonthName } from "@/lib/utils"
import { apiFetch } from "@/lib/api"
import { useAuth } from "@/contexts/AuthContext"

interface AttendanceRecord {
  id: string
  user_id: string
  date: string
  status: string
  profiles?: { id: string; full_name: string | null }
}

interface Employee {
  id: string
  full_name: string | null
  email?: string
}

const STATUS_OPTIONS = [
  { value: 'present',  label: 'Present' },
  { value: 'late',     label: 'Late' },
  { value: 'absent',   label: 'Absent' },
  { value: 'remote',   label: 'Remote' },
  { value: 'on_leave', label: 'On Leave' },
  { value: 'holiday',  label: 'Holiday' },
]

const statusAbbrv: Record<string, { abbr: string; bg: string; color: string }> = {
  present: { abbr: "P", bg: "#EDFBF3", color: "#10A854" },
  late: { abbr: "L", bg: "#FFF8E6", color: "#E89B1A" },
  absent: { abbr: "A", bg: "#FFF0F0", color: "#D63C3C" },
  remote: { abbr: "R", bg: "#EFF4FF", color: "#2563EB" },
  on_leave: { abbr: "LV", bg: "#F5F3FF", color: "#7C3AED" },
  holiday: { abbr: "H", bg: "#F1F3F7", color: "#4A5366" },
}

export default function RosterPage() {
  const { user }  = useAuth()
  const isManager = ['super_admin', 'admin', 'hr'].includes(user?.role ?? '')
  const today = new Date()
  const [viewMonth, setViewMonth] = React.useState(today.getMonth() + 1)
  const [viewYear, setViewYear] = React.useState(today.getFullYear())
  const [employees, setEmployees] = React.useState<Employee[]>([])
  const [logs, setLogs] = React.useState<AttendanceRecord[]>([])
  const [loading, setLoading] = React.useState(true)
  const [marking, setMarking] = React.useState<string | null>(null) // 'userId-date'
  // For cell click popover
  const [popover, setPopover] = React.useState<{ userId: string; date: string; current: string | null } | null>(null)

  const monthStr = `${viewYear}-${String(viewMonth).padStart(2, '0')}`

  React.useEffect(() => {
    setLoading(true)
    apiFetch<{ attendance: AttendanceRecord[] }>(`/api/roster?month=${monthStr}`)
      .then((d) => {
        const records = d.attendance
        setLogs(records)
        // Build unique employee list from attendance records
        const empMap = new Map<string, Employee>()
        records.forEach((r) => {
          if (!empMap.has(r.user_id)) {
            empMap.set(r.user_id, {
              id: r.user_id,
              full_name: r.profiles?.full_name ?? null,
            })
          }
        })
        setEmployees(Array.from(empMap.values()))
      })
      .catch(() => toast.error('Failed to load roster'))
      .finally(() => setLoading(false))
  }, [monthStr])

  const daysInMonth = getDaysInMonth(viewYear, viewMonth)

  const logMap = React.useMemo(() => {
    const m: Record<string, Record<string, string>> = {}
    logs.forEach((l) => {
      if (!m[l.user_id]) m[l.user_id] = {}
      m[l.user_id][l.date] = l.status
    })
    return m
  }, [logs])

  const prevMonth = () => {
    if (viewMonth === 1) { setViewMonth(12); setViewYear((y) => y - 1) }
    else setViewMonth((m) => m - 1)
  }
  const nextMonth = () => {
    if (viewMonth === 12) { setViewMonth(1); setViewYear((y) => y + 1) }
    else setViewMonth((m) => m + 1)
  }

  async function markAttendance(userId: string, date: string, status: string) {
    const key = `${userId}-${date}`
    setMarking(key)
    setPopover(null)
    try {
      await apiFetch('/api/roster', {
        method: 'POST',
        body: JSON.stringify({ user_id: userId, date, status }),
      })
      setLogs(prev => {
        const idx = prev.findIndex(l => l.user_id === userId && l.date === date)
        if (idx >= 0) {
          const next = [...prev]; next[idx] = { ...next[idx], status }; return next
        }
        return [...prev, { id: `${userId}-${date}`, user_id: userId, date, status }]
      })
      toast.success(`Marked ${status}`)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to mark attendance')
    } finally {
      setMarking(null)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Attendance Roster"
        subtitle="Monthly attendance overview for all employees"
      />

      <Card>
        <CardHeader>
          <CardTitle>Roster Grid</CardTitle>
          <div className="flex items-center gap-3">
            <button
              onClick={prevMonth}
              className="w-8 h-8 flex items-center justify-center rounded-[var(--radius-md)] hover:bg-[#F1F3F7] transition-colors"
              style={{ color: "var(--text-muted)" }}
            >
              <CaretLeft size={16} />
            </button>
            <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              {getMonthName(viewMonth)} {viewYear}
            </span>
            <button
              onClick={nextMonth}
              className="w-8 h-8 flex items-center justify-center rounded-[var(--radius-md)] hover:bg-[#F1F3F7] transition-colors"
              style={{ color: "var(--text-muted)" }}
            >
              <CaretRight size={16} />
            </button>
          </div>
        </CardHeader>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 mb-4">
          {Object.entries(statusAbbrv).map(([s, v]) => (
            <div key={s} className="flex items-center gap-1.5">
              <span
                className="w-6 h-6 rounded-[var(--radius-sm)] flex items-center justify-center text-[10px] font-bold"
                style={{ background: v.bg, color: v.color }}
              >
                {v.abbr}
              </span>
              <span className="text-xs capitalize" style={{ color: "var(--text-muted)" }}>
                {s.replace("_", " ")}
              </span>
            </div>
          ))}
        </div>

        {loading ? (
          <div
            className="rounded-[var(--radius-lg)] border p-12 text-center"
            style={{ borderColor: "var(--surface-border)" }}
          >
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              Loading attendance data…
            </p>
          </div>
        ) : employees.length === 0 ? (
          <div
            className="rounded-[var(--radius-lg)] border p-12 text-center"
            style={{ borderColor: "var(--surface-border)" }}
          >
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              No attendance records found for this month.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="text-xs border-collapse">
              <thead>
                <tr>
                  <th
                    className="sticky left-0 z-10 px-3 py-2 text-left text-xs font-medium whitespace-nowrap min-w-[140px]"
                    style={{
                      background: "var(--surface-muted)",
                      color: "var(--text-muted)",
                      borderRight: "1px solid var(--surface-border)",
                    }}
                  >
                    Employee
                  </th>
                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const d = i + 1
                    const date = new Date(viewYear, viewMonth - 1, d)
                    const isWeekend = date.getDay() === 5 || date.getDay() === 6
                    return (
                      <th
                        key={d}
                        className="px-1.5 py-2 text-center font-medium"
                        style={{
                          background: isWeekend ? "#F8F9FB" : "var(--surface-muted)",
                          color: isWeekend ? "var(--text-disabled)" : "var(--text-muted)",
                          minWidth: 32,
                          borderRight: "1px solid var(--surface-border)",
                        }}
                      >
                        {d}
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {employees.map((emp) => (
                  <tr key={emp.id}>
                    <td
                      className="sticky left-0 z-10 px-3 py-1.5 font-medium whitespace-nowrap"
                      style={{
                        background: "var(--surface-base)",
                        color: "var(--text-primary)",
                        borderRight: "1px solid var(--surface-border)",
                        borderBottom: "1px solid var(--surface-border)",
                      }}
                    >
                      {emp.full_name ?? emp.email ?? emp.id.slice(0, 8)}
                    </td>
                    {Array.from({ length: daysInMonth }).map((_, i) => {
                      const d = i + 1
                      const dateStr = `${viewYear}-${String(viewMonth).padStart(2, "0")}-${String(d).padStart(2, "0")}`
                      const status = logMap[emp.id]?.[dateStr]
                      const cfg = status ? statusAbbrv[status] : null
                      const isFuture = new Date(dateStr) > today
                      const markKey = `${emp.id}-${dateStr}`
                      const isMarkingThis = marking === markKey
                      const isPopoverOpen = popover?.userId === emp.id && popover?.date === dateStr

                      return (
                        <td
                          key={d}
                          className="p-1 text-center relative"
                          style={{
                            borderRight: "1px solid var(--surface-border)",
                            borderBottom: "1px solid var(--surface-border)",
                          }}
                        >
                          {isMarkingThis ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-[var(--radius-sm)]"
                              style={{ background: 'var(--surface-muted)' }}>
                              <span className="text-[8px]" style={{ color: 'var(--text-disabled)' }}>…</span>
                            </span>
                          ) : cfg ? (
                            <span
                              className="inline-flex items-center justify-center w-6 h-6 rounded-[var(--radius-sm)] text-[10px] font-bold cursor-pointer"
                              style={{ background: cfg.bg, color: cfg.color }}
                              title={isManager ? 'Click to change' : undefined}
                              onClick={() => isManager && !isFuture && setPopover(isPopoverOpen ? null : { userId: emp.id, date: dateStr, current: status ?? null })}
                            >
                              {cfg.abbr}
                            </span>
                          ) : isManager && !isFuture ? (
                            <span
                              className="inline-flex items-center justify-center w-6 h-6 rounded-[var(--radius-sm)] opacity-0 hover:opacity-100 cursor-pointer transition-opacity"
                              style={{ background: 'var(--surface-muted)', color: 'var(--text-disabled)' }}
                              title="Mark attendance"
                              onClick={() => setPopover(isPopoverOpen ? null : { userId: emp.id, date: dateStr, current: null })}
                            >
                              <Plus size={8} />
                            </span>
                          ) : null}

                          {/* Status picker popover */}
                          {isPopoverOpen && (
                            <div
                              className="absolute z-50 left-0 top-full mt-1 rounded-[var(--radius-md)] border shadow-lg overflow-hidden"
                              style={{ background: 'var(--surface-base)', borderColor: 'var(--surface-border)', minWidth: 100 }}
                              onMouseLeave={() => setPopover(null)}
                            >
                              {STATUS_OPTIONS.map(opt => (
                                <button
                                  key={opt.value}
                                  className="w-full px-3 py-1.5 text-left text-xs hover:bg-[#F1F3F7] transition-colors"
                                  style={{
                                    color: opt.value === popover.current ? 'var(--brand-navy)' : 'var(--text-secondary)',
                                    fontWeight: opt.value === popover.current ? 700 : 400,
                                  }}
                                  onClick={() => markAttendance(emp.id, dateStr, opt.value)}
                                >
                                  {opt.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
