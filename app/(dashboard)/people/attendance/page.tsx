"use client"

import * as React from "react"
import { CaretLeft, CaretRight } from "@phosphor-icons/react"
import { PageHeader } from "@/components/ui/page-header"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { StatCard } from "@/components/ui/stat-card"
import { AttendanceClock } from "@/components/people/attendance-clock"
import { CheckCircle, Clock, XCircle, Monitor } from "@phosphor-icons/react/dist/ssr"
import { getDaysInMonth, getMonthName } from "@/lib/utils"
import { apiFetch } from "@/lib/api"
import { useAuth } from "@/contexts/AuthContext"

interface RosterRecord {
  id: string
  user_id: string
  date: string
  status: string
  clock_in: string | null
  clock_out: string | null
  late_minutes: number | null
  location_type: string | null
  marked_at: string | null
}

const statusColors: Record<string, string> = {
  present:  "#10A854",
  late:     "#E89B1A",
  absent:   "#D63C3C",
  remote:   "#2563EB",
  on_leave: "#C9A227",
  holiday:  "#7A849A",
  none:     "transparent",
}

const statusLabels: Record<string, string> = {
  present:  "Present",
  late:     "Late",
  absent:   "Absent",
  remote:   "Remote",
  on_leave: "On Leave",
  holiday:  "Holiday",
  none:     "",
}

export default function AttendancePage() {
  const { user } = useAuth()
  const today    = new Date()
  const [viewMonth, setViewMonth] = React.useState(today.getMonth() + 1)
  const [viewYear,  setViewYear]  = React.useState(today.getFullYear())
  const [records,   setRecords]   = React.useState<RosterRecord[]>([])
  const [todayRecord, setTodayRecord] = React.useState<RosterRecord | null>(null)
  const [loading,   setLoading]   = React.useState(true)

  const monthStr = `${viewYear}-${String(viewMonth).padStart(2, "0")}`

  // Load today's clock-in record
  React.useEffect(() => {
    if (!user?.id) return
    apiFetch<{ attendance: RosterRecord | null }>('/api/attendance')
      .then(res => setTodayRecord(res.attendance))
      .catch(() => {})
  }, [user?.id])

  React.useEffect(() => {
    if (!user?.id) return
    setLoading(true)
    apiFetch<{ attendance: RosterRecord[] }>(`/api/roster?month=${monthStr}`)
      .then(res => {
        const mine = (res.attendance ?? []).filter(r => r.user_id === user.id)
        setRecords(mine)
        // If this month is current month, sync todayRecord from roster results too
        const todayStr = today.toISOString().slice(0, 10)
        const todayFromRoster = mine.find(r => r.date === todayStr)
        if (todayFromRoster) setTodayRecord(todayFromRoster)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [monthStr, user?.id])

  const logMap = React.useMemo(() => {
    const m: Record<string, RosterRecord> = {}
    records.forEach(r => { m[r.date] = r })
    return m
  }, [records])

  const summary = React.useMemo(() => {
    let present = 0, late = 0, absent = 0, remote = 0
    records.forEach(r => {
      if (r.status === "present") present++
      else if (r.status === "late") late++
      else if (r.status === "absent") absent++
      else if (r.status === "remote") remote++
    })
    return { present, late, absent, remote }
  }, [records])

  const daysInMonth  = getDaysInMonth(viewYear, viewMonth)
  const firstDayOfWeek = new Date(viewYear, viewMonth - 1, 1).getDay()
  const monthName    = getMonthName(viewMonth)

  const prevMonth = () => {
    if (viewMonth === 1) { setViewMonth(12); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (viewMonth === 12) { setViewMonth(1); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }

  const todayStr = today.toISOString().slice(0, 10)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Attendance"
        subtitle="Track your daily attendance and review your monthly history"
      />

      {/* Clock in/out */}
      <AttendanceClock
        initialRecord={todayRecord}
        onUpdate={rec => {
          const rosterRec: RosterRecord = {
            ...rec,
            user_id: user?.id ?? '',
            date: todayStr,
            marked_at: new Date().toISOString(),
          }
          setTodayRecord(rosterRec)
          setRecords(prev => {
            const idx = prev.findIndex(r => r.date === todayStr)
            if (idx >= 0) { const next = [...prev]; next[idx] = rosterRec; return next }
            return [...prev, rosterRec]
          })
        }}
      />

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Present"  value={summary.present} subtitle="This month" icon={<CheckCircle size={18} />} color="#10A854" iconBg="#EDFBF3" />
        <StatCard title="Late"     value={summary.late}    subtitle="Arrived late" icon={<Clock size={18} />}       color="#E89B1A" iconBg="#FFF8E6" />
        <StatCard title="Absent"   value={summary.absent}  subtitle="Days missed"  icon={<XCircle size={18} />}     color="#D63C3C" iconBg="#FFF0F0" />
        <StatCard title="Remote"   value={summary.remote}  subtitle="Work from home" icon={<Monitor size={18} />}  color="#2563EB" iconBg="#EFF4FF" />
      </div>

      {/* Calendar */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Attendance</CardTitle>
          <div className="flex items-center gap-3">
            <button onClick={prevMonth}
              className="w-8 h-8 flex items-center justify-center rounded-[var(--radius-md)] hover:bg-[#F1F3F7] transition-colors"
              style={{ color: "var(--text-muted)" }}>
              <CaretLeft size={16} />
            </button>
            <span className="text-sm font-medium w-32 text-center" style={{ color: "var(--text-primary)" }}>
              {monthName} {viewYear}
            </span>
            <button onClick={nextMonth}
              className="w-8 h-8 flex items-center justify-center rounded-[var(--radius-md)] hover:bg-[#F1F3F7] transition-colors"
              style={{ color: "var(--text-muted)" }}>
              <CaretRight size={16} />
            </button>
          </div>
        </CardHeader>

        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => (
            <div key={d} className="text-center text-xs font-medium py-1" style={{ color: "var(--text-muted)" }}>{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
        {loading ? (
          <div className="grid grid-cols-7 gap-1 animate-pulse">
            {Array.from({ length: 35 }).map((_, i) => (
              <div key={i} className="aspect-square rounded-[var(--radius-md)]" style={{ background: "var(--surface-muted)" }} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDayOfWeek }).map((_, i) => <div key={`e-${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day     = i + 1
              const dateStr = `${viewYear}-${String(viewMonth).padStart(2,"0")}-${String(day).padStart(2,"0")}`
              const record  = logMap[dateStr]
              const status  = record?.status ?? "none"
              const isToday = dateStr === todayStr
              const isFuture = new Date(dateStr) > today
              const dow = new Date(dateStr).getDay()
              const isWeekend = dow === 5 || dow === 6 // Fri/Sat = Oman weekend

              return (
                <div key={day}
                  className="relative flex flex-col items-center justify-center p-1.5 rounded-[var(--radius-md)] aspect-square transition-colors hover:bg-[#F1F3F7] cursor-default"
                  title={status !== "none" ? statusLabels[status] : undefined}>
                  <span className="text-xs font-medium" style={{
                    color: isToday ? "var(--brand-navy)" : isWeekend ? "var(--text-disabled)" : isFuture ? "var(--text-disabled)" : "var(--text-secondary)",
                    fontWeight: isToday ? 700 : undefined,
                  }}>
                    {day}
                  </span>
                  {!isFuture && status !== "none" && (
                    <span className="w-1.5 h-1.5 rounded-full mt-0.5" style={{ background: statusColors[status] }} />
                  )}
                  {isWeekend && !record && (
                    <span className="w-1 h-1 rounded-full mt-0.5" style={{ background: "#e2e8f0" }} />
                  )}
                  {isToday && (
                    <span className="absolute inset-0 rounded-[var(--radius-md)] border-2" style={{ borderColor: "var(--brand-navy)" }} />
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Legend */}
        <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t" style={{ borderColor: "var(--surface-border)" }}>
          {Object.entries(statusColors).filter(([k]) => k !== "none").map(([s, color]) => (
            <div key={s} className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ background: color }} />
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>{statusLabels[s]}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Today's record detail */}
      {todayRecord && (
        <Card>
          <CardHeader><CardTitle>Today's Record</CardTitle></CardHeader>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>Status</span>
              <span className="text-sm font-medium capitalize" style={{ color: "var(--text-primary)" }}>
                {statusLabels[todayRecord.status] ?? todayRecord.status}
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>Marked At</span>
              <span className="text-sm" style={{ color: "var(--text-primary)" }}>
                {todayRecord.marked_at ? new Date(todayRecord.marked_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "—"}
              </span>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
