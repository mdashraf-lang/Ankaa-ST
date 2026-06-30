"use client"

import * as React from "react"
import {
  CaretLeft, CaretRight, UploadSimple, Link as LinkIcon,
  CheckCircle, Clock, XCircle, Monitor, Warning,
  ArrowsClockwise, MagnifyingGlass, Trash, FloppyDisk,
  FileXls, Lightning, Info, CalendarBlank, User,
} from "@phosphor-icons/react"
import { PageHeader }      from "@/components/ui/page-header"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { StatCard }        from "@/components/ui/stat-card"
import { AttendanceClock } from "@/components/people/attendance-clock"
import { Avatar }          from "@/components/ui/avatar"
import { Button }          from "@/components/ui/button"
import { getDaysInMonth, getMonthName } from "@/lib/utils"
import { apiFetch }        from "@/lib/api"
import { useAuth }         from "@/contexts/AuthContext"

// ── Types ─────────────────────────────────────────────────────────────────────
interface RosterRecord {
  id: string; user_id: string; date: string; status: string
  clock_in: string | null; clock_out: string | null
  late_minutes: number | null; location_type: string | null; marked_at: string | null
}

interface DeviceMapping {
  device_id:   number
  device_name: string
  id:          string | null
  employee_id: string | null
  profile_id:  string | null
  profile:     { id: string; full_name: string | null; employee_id: string | null; avatar_url: string | null } | null
  is_active:   number
}

interface EmpOption {
  id: string; full_name: string | null; employee_id: string | null
}

interface PreviewRow {
  device_name: string; date: string
  check_in: string | null; check_out: string | null
  profile_id: string | null; employee_id: string | null
  full_name: string | null; matched: boolean
}

interface DeviceRawRecord {
  id: string; device_name: string; department: string; date: string
  shift: string; timetable: string
  check_in: string | null; check_out: string | null
  profile_id: string | null; employee_id: string | null
  full_name: string | null; matched: number; created_at: string
  import_log_id: string
}

interface ImportLog {
  id: string; filename: string; total_records: number; matched: number
  unmatched: number; skipped: number; date_from: string | null; date_to: string | null
  created_at: string
  profiles: { full_name: string | null } | null
}

// ── Colour maps ───────────────────────────────────────────────────────────────
const STATUS_COLOR: Record<string, string> = {
  present: "#10A854", late: "#E89B1A", absent: "#D63C3C",
  remote: "#2563EB", on_leave: "#C9A227", holiday: "#7A849A", none: "transparent",
}
const STATUS_LABEL: Record<string, string> = {
  present: "Present", late: "Late", absent: "Absent",
  remote: "Remote", on_leave: "On Leave", holiday: "Holiday", none: "",
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function Skeleton({ w = "100%", h = 20, r = 8 }: { w?: string | number; h?: number; r?: number }) {
  return (
    <div className="animate-pulse rounded" style={{
      width: w, height: h, borderRadius: r, background: "var(--surface-muted)",
    }} />
  )
}

function fmtTime(ts: string | null) {
  if (!ts) return "—"
  return new Date(ts).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
}

function fmtDate(s: string | null) {
  if (!s) return "—"
  return new Date(s).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
}

function empIdFromNum(n: number) {
  return `ANK-${String(n).padStart(3, "0")}`
}

// ══════════════════════════════════════════════════════════════════════════════
//  PERSONAL ATTENDANCE SECTION
// ══════════════════════════════════════════════════════════════════════════════
function PersonalSection() {
  const { user }  = useAuth()
  const today     = new Date()
  const todayStr  = today.toISOString().slice(0, 10)
  const [viewMonth, setViewMonth] = React.useState(today.getMonth() + 1)
  const [viewYear,  setViewYear]  = React.useState(today.getFullYear())
  const [records,   setRecords]   = React.useState<RosterRecord[]>([])
  const [todayRecord, setTodayRecord] = React.useState<RosterRecord | null>(null)
  const [loading,   setLoading]   = React.useState(true)
  const monthStr = `${viewYear}-${String(viewMonth).padStart(2, "0")}`

  React.useEffect(() => {
    if (!user?.id) return
    apiFetch<{ attendance: RosterRecord | null }>("/api/attendance")
      .then(r => setTodayRecord(r.attendance)).catch(() => {})
  }, [user?.id])

  React.useEffect(() => {
    if (!user?.id) return
    setLoading(true)
    apiFetch<{ attendance: RosterRecord[] }>(`/api/roster?month=${monthStr}`)
      .then(r => {
        const mine = (r.attendance ?? []).filter(x => x.user_id === user.id)
        setRecords(mine)
        const tr = mine.find(x => x.date === todayStr)
        if (tr) setTodayRecord(tr)
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

  const daysInMonth    = getDaysInMonth(viewYear, viewMonth)
  const firstDayOfWeek = new Date(viewYear, viewMonth - 1, 1).getDay()

  return (
    <>
      <AttendanceClock
        initialRecord={todayRecord}
        onUpdate={rec => {
          const rr: RosterRecord = { ...rec, user_id: user?.id ?? "", date: todayStr, marked_at: new Date().toISOString() }
          setTodayRecord(rr)
          setRecords(prev => {
            const idx = prev.findIndex(r => r.date === todayStr)
            if (idx >= 0) { const n = [...prev]; n[idx] = rr; return n }
            return [...prev, rr]
          })
        }}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Present"  value={summary.present} subtitle="This month"     icon={<CheckCircle size={18} />} color="#10A854" iconBg="#EDFBF3" />
        <StatCard title="Late"     value={summary.late}    subtitle="Arrived late"   icon={<Clock size={18} />}       color="#E89B1A" iconBg="#FFF8E6" />
        <StatCard title="Absent"   value={summary.absent}  subtitle="Days missed"    icon={<XCircle size={18} />}     color="#D63C3C" iconBg="#FFF0F0" />
        <StatCard title="Remote"   value={summary.remote}  subtitle="Work from home" icon={<Monitor size={18} />}     color="#2563EB" iconBg="#EFF4FF" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Monthly Attendance — {getMonthName(viewMonth)} {viewYear}</CardTitle>
          <div className="flex items-center gap-2">
            <button onClick={() => { if (viewMonth === 1) { setViewMonth(12); setViewYear(y => y-1) } else setViewMonth(m => m-1) }}
              className="w-8 h-8 flex items-center justify-center rounded-[var(--radius-md)] hover:bg-[#F1F3F7] transition-colors"
              style={{ color: "var(--text-muted)" }}><CaretLeft size={16} /></button>
            <button onClick={() => { if (viewMonth === 12) { setViewMonth(1); setViewYear(y => y+1) } else setViewMonth(m => m+1) }}
              className="w-8 h-8 flex items-center justify-center rounded-[var(--radius-md)] hover:bg-[#F1F3F7] transition-colors"
              style={{ color: "var(--text-muted)" }}><CaretRight size={16} /></button>
          </div>
        </CardHeader>

        <div className="grid grid-cols-7 gap-1 mb-1 px-4">
          {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => (
            <div key={d} className="text-center text-xs font-medium py-1" style={{ color: "var(--text-muted)" }}>{d}</div>
          ))}
        </div>

        <div className="px-4 pb-4">
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
                const dow      = new Date(dateStr).getDay()
                const isWeekend = dow === 5 || dow === 6
                return (
                  <div key={day}
                    className="relative flex flex-col items-center justify-center p-1.5 rounded-[var(--radius-md)] aspect-square transition-colors hover:bg-[#F1F3F7]"
                    title={status !== "none" ? STATUS_LABEL[status] : undefined}>
                    <span className="text-xs font-medium" style={{
                      color: isToday ? "var(--brand-navy)" : isWeekend ? "var(--text-disabled)" : isFuture ? "var(--text-disabled)" : "var(--text-secondary)",
                      fontWeight: isToday ? 700 : undefined,
                    }}>{day}</span>
                    {!isFuture && status !== "none" && (
                      <span className="w-1.5 h-1.5 rounded-full mt-0.5" style={{ background: STATUS_COLOR[status] }} />
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
        </div>

        <div className="flex flex-wrap gap-4 px-4 pb-4 pt-3 border-t" style={{ borderColor: "var(--surface-border)" }}>
          {Object.entries(STATUS_COLOR).filter(([k]) => k !== "none").map(([s, color]) => (
            <div key={s} className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ background: color }} />
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>{STATUS_LABEL[s]}</span>
            </div>
          ))}
        </div>
      </Card>

      {todayRecord && (
        <Card>
          <CardHeader><CardTitle>Today's Record</CardTitle></CardHeader>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 px-4 pb-4">
            {[
              { label: "Status",    value: STATUS_LABEL[todayRecord.status] ?? todayRecord.status },
              { label: "Clock In",  value: fmtTime(todayRecord.clock_in) },
              { label: "Clock Out", value: fmtTime(todayRecord.clock_out) },
              { label: "Location",  value: todayRecord.location_type ?? "—" },
            ].map(item => (
              <div key={item.label} className="flex flex-col gap-0.5">
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>{item.label}</span>
                <span className="text-sm font-medium capitalize" style={{ color: "var(--text-primary)" }}>{item.value}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
//  IMPORT PANEL — upload XLS → preview → import; then shows live DB records
// ══════════════════════════════════════════════════════════════════════════════
function ImportPanel() {
  const [dragOver,  setDragOver]  = React.useState(false)
  const [file,      setFile]      = React.useState<File | null>(null)
  const [parsing,   setParsing]   = React.useState(false)
  const [preview,   setPreview]   = React.useState<PreviewRow[] | null>(null)
  const [previewMeta, setPreviewMeta] = React.useState<{date_from:string|null;date_to:string|null;period:string}|null>(null)
  const [importing, setImporting] = React.useState(false)
  const [result,    setResult]    = React.useState<{imported:number;unmatched:number;skipped:number;log_id:string}|null>(null)
  const [error,     setError]     = React.useState<string | null>(null)

  // ── DB state ─────────────────────────────────────────────────────────────
  const [logs,        setLogs]        = React.useState<ImportLog[]>([])
  const [dbRecords,   setDbRecords]   = React.useState<DeviceRawRecord[]>([])
  const [activeLogId, setActiveLogId] = React.useState<string | null>(null)
  const [dbLoading,   setDbLoading]   = React.useState(true)
  const [filterDate,  setFilterDate]  = React.useState("")
  const inputRef = React.useRef<HTMLInputElement>(null)

  // Load logs + records from DB on mount and after each import
  const loadDb = React.useCallback((logId?: string) => {
    setDbLoading(true)
    const params = logId ? `?log_id=${logId}` : filterDate ? `?date=${filterDate}` : ""
    apiFetch<{ logs: ImportLog[]; records: DeviceRawRecord[] }>(`/api/attendance/device-import${params}`)
      .then(r => {
        setLogs(r.logs ?? [])
        setDbRecords(r.records ?? [])
        if (!activeLogId && r.logs?.[0]) setActiveLogId(r.logs[0].id)
      })
      .catch(() => {})
      .finally(() => setDbLoading(false))
  }, [filterDate, activeLogId])

  React.useEffect(() => { loadDb() }, [])

  function switchLog(id: string) {
    setActiveLogId(id)
    setDbLoading(true)
    apiFetch<{ logs: ImportLog[]; records: DeviceRawRecord[] }>(`/api/attendance/device-import?log_id=${id}`)
      .then(r => { setLogs(r.logs ?? []); setDbRecords(r.records ?? []) })
      .catch(() => {})
      .finally(() => setDbLoading(false))
  }

  function applyDateFilter() {
    setActiveLogId(null)
    setDbLoading(true)
    const q = filterDate ? `?date=${filterDate}` : ""
    apiFetch<{ logs: ImportLog[]; records: DeviceRawRecord[] }>(`/api/attendance/device-import${q}`)
      .then(r => { setLogs(r.logs ?? []); setDbRecords(r.records ?? []) })
      .catch(() => {})
      .finally(() => setDbLoading(false))
  }

  async function handleFile(f: File) {
    setFile(f); setPreview(null); setResult(null); setError(null)
    setParsing(true)
    try {
      const fd = new FormData()
      fd.append("file", f); fd.append("action", "preview")
      const res  = await fetch("/api/attendance/device-import", { method: "POST", body: fd, credentials: "include" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setPreview(data.rows)
      setPreviewMeta({ date_from: data.date_from, date_to: data.date_to, period: data.period ?? "" })
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Parse failed")
    } finally { setParsing(false) }
  }

  async function confirmImport() {
    if (!file) return
    setImporting(true); setError(null)
    try {
      const fd = new FormData()
      fd.append("file", file); fd.append("action", "import")
      const res  = await fetch("/api/attendance/device-import", { method: "POST", body: fd, credentials: "include" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setResult(data); setPreview(null); setFile(null)
      // Reload DB records from the new import batch
      loadDb(data.log_id)
      setActiveLogId(data.log_id)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Import failed")
    } finally { setImporting(false) }
  }

  function reset() { setFile(null); setPreview(null); setResult(null); setError(null) }

  const previewMatched   = preview?.filter(r => r.matched).length  ?? 0
  const previewUnmatched = preview?.filter(r => !r.matched).length ?? 0
  const activeLog = logs.find(l => l.id === activeLogId)

  const dbPresent  = dbRecords.filter(r => r.check_in).length
  const dbAbsent   = dbRecords.filter(r => !r.check_in).length
  const dbMatched  = dbRecords.filter(r => r.matched).length
  const dbUnmapped = dbRecords.filter(r => !r.matched).length

  return (
    <div className="flex flex-col gap-5">

      {/* ── Upload zone ────────────────────────────────────────────────────── */}
      {!preview && !result && (
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
          onClick={() => inputRef.current?.click()}
          className="flex flex-col items-center justify-center gap-3 rounded-[var(--radius-xl)] border-2 border-dashed cursor-pointer transition-all"
          style={{
            minHeight: 160,
            borderColor: dragOver ? "#1B2A5E" : "var(--surface-border)",
            background:  dragOver ? "#EEF1F8" : "var(--surface-subtle)",
          }}
        >
          <input ref={inputRef} type="file" accept=".xls,.xlsx" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
          {parsing ? (
            <>
              <div className="w-7 h-7 rounded-full border-2 border-t-[#1B2A5E] animate-spin"
                style={{ borderColor: "var(--surface-border)", borderTopColor: "#1B2A5E" }} />
              <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Parsing report…</p>
            </>
          ) : (
            <>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ background: dragOver ? "#1B2A5E" : "#EEF1F8" }}>
                <FileXls size={24} style={{ color: dragOver ? "#fff" : "#1B2A5E" }} />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                  Drop iVMS-4200 "Start/End Work Time Report"
                </p>
                <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                  or <span style={{ color: "#1B2A5E", fontWeight: 600 }}>click to browse</span> — .xls / .xlsx
                </p>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs"
                style={{ borderColor: "var(--surface-border)", color: "var(--text-muted)" }}>
                <Info size={12} />
                Time &amp; Attendance → Report → Regular Report → Export XLS
              </div>
            </>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 p-4 rounded-[var(--radius-lg)] border"
          style={{ background: "#FFF0F0", borderColor: "#FFCDD2" }}>
          <Warning size={16} style={{ color: "#D63C3C", flexShrink: 0, marginTop: 1 }} />
          <p className="text-xs flex-1" style={{ color: "#991B1B" }}>{error}</p>
          <button onClick={reset} className="text-xs font-medium" style={{ color: "#D63C3C" }}>Dismiss</button>
        </div>
      )}

      {/* Success banner */}
      {result && (
        <div className="flex items-center gap-4 p-4 rounded-[var(--radius-xl)] border"
          style={{ background: "#EDFBF3", borderColor: "#BBF7D0" }}>
          <CheckCircle size={24} weight="fill" style={{ color: "#10A854", flexShrink: 0 }} />
          <div className="flex-1">
            <p className="text-sm font-semibold" style={{ color: "#065F46" }}>Import complete — records saved to database</p>
            <div className="flex gap-5 mt-1">
              {[
                { label: "Saved to roster", value: result.imported,  color: "#10A854" },
                { label: "Unmatched",       value: result.unmatched, color: "#E89B1A" },
                { label: "Skipped",         value: result.skipped,   color: "#7A849A" },
              ].map(s => (
                <div key={s.label} className="flex items-baseline gap-1">
                  <span className="text-lg font-bold" style={{ color: s.color }}>{s.value}</span>
                  <span className="text-xs" style={{ color: "#065F46" }}>{s.label}</span>
                </div>
              ))}
            </div>
          </div>
          <button onClick={reset} className="text-xs font-medium px-3 py-1.5 rounded-[var(--radius-md)] border flex-shrink-0"
            style={{ borderColor: "#BBF7D0", color: "#065F46" }}>
            Import Another
          </button>
        </div>
      )}

      {/* Preview table */}
      {preview && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                Preview — {preview.length} records
              </p>
              {previewMeta?.period && (
                <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{previewMeta.period}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: "#EDFBF3", color: "#10A854" }}>
                {previewMatched} matched
              </span>
              {previewUnmatched > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: "#FFF8E6", color: "#E89B1A" }}>
                  {previewUnmatched} unmatched
                </span>
              )}
            </div>
          </div>

          <div className="rounded-[var(--radius-lg)] border overflow-hidden" style={{ borderColor: "var(--surface-border)" }}>
            <div className="overflow-auto max-h-72">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ background: "var(--surface-subtle)", borderBottom: "1px solid var(--surface-border)" }}>
                    {["Device Name","Date","Check In","Check Out","ERP Employee","EMP-ID","Status"].map(h => (
                      <th key={h} className="px-3 py-2 text-left font-semibold whitespace-nowrap" style={{ color: "var(--text-muted)" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.map((r, i) => (
                    <tr key={i} className="border-t" style={{ borderColor: "var(--surface-border)" }}>
                      <td className="px-3 py-2 font-medium" style={{ color: "var(--text-primary)" }}>{r.device_name}</td>
                      <td className="px-3 py-2" style={{ color: "var(--text-secondary)" }}>{r.date}</td>
                      <td className="px-3 py-2 font-mono" style={{ color: r.check_in ? "#10A854" : "var(--text-disabled)" }}>
                        {r.check_in ?? "—"}
                      </td>
                      <td className="px-3 py-2 font-mono" style={{ color: r.check_out ? "#7A849A" : "var(--text-disabled)" }}>
                        {r.check_out ?? "—"}
                      </td>
                      <td className="px-3 py-2" style={{ color: r.matched ? "var(--text-primary)" : "#E89B1A" }}>
                        {r.full_name ?? (r.matched ? "—" : "Not mapped")}
                      </td>
                      <td className="px-3 py-2 font-mono text-[10px]" style={{ color: "var(--text-muted)" }}>
                        {r.employee_id ?? "—"}
                      </td>
                      <td className="px-3 py-2">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                          style={{ background: r.matched ? "#EDFBF3" : "#FFF8E6", color: r.matched ? "#10A854" : "#E89B1A" }}>
                          {r.matched ? "✓ Will import" : "⚠ Unmatched"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="primary" onClick={confirmImport} disabled={importing || previewMatched === 0}>
              {importing
                ? <><div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />Saving…</>
                : <><UploadSimple size={14} />Save {previewMatched} record{previewMatched !== 1 ? "s" : ""} to Database</>
              }
            </Button>
            <Button variant="secondary" onClick={reset}>Cancel</Button>
            {previewMatched === 0 && (
              <p className="text-xs" style={{ color: "#E89B1A" }}>No matched records — set up Device Mapping first.</p>
            )}
          </div>
        </div>
      )}

      {/* ── Live DB Records ────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 pt-2 border-t" style={{ borderColor: "var(--surface-border)" }}>
        {/* Toolbar */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            Device Attendance Records
            <span className="ml-2 text-xs font-normal" style={{ color: "var(--text-muted)" }}>
              (stored from face recognition device)
            </span>
          </p>
          <div className="flex items-center gap-2">
            <input
              type="date" value={filterDate}
              onChange={e => setFilterDate(e.target.value)}
              onKeyDown={e => e.key === "Enter" && applyDateFilter()}
              className="h-8 px-2 text-xs rounded-[var(--radius-md)] border"
              style={{ borderColor: "var(--surface-border)", color: "var(--text-primary)", background: "var(--surface-base)", outline: "none" }}
            />
            <Button variant="secondary" size="sm" onClick={applyDateFilter}>Filter</Button>
            <Button variant="ghost" size="sm" onClick={() => { setFilterDate(""); loadDb() }}>
              <ArrowsClockwise size={13} />
            </Button>
          </div>
        </div>

        {/* Import batch selector */}
        {logs.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {logs.map(log => (
              <button
                key={log.id}
                onClick={() => switchLog(log.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs whitespace-nowrap transition-all flex-shrink-0"
                style={{
                  background:   log.id === activeLogId ? "#1B2A5E" : "var(--surface-base)",
                  borderColor:  log.id === activeLogId ? "#1B2A5E" : "var(--surface-border)",
                  color:        log.id === activeLogId ? "#fff"    : "var(--text-secondary)",
                  fontWeight:   log.id === activeLogId ? 600       : 400,
                }}
              >
                <FileXls size={11} />
                {log.date_from ?? log.filename.replace(/\.[^/.]+$/, "")}
                <span className="opacity-60">({log.total_records})</span>
              </button>
            ))}
          </div>
        )}

        {/* Stats bar */}
        {dbRecords.length > 0 && (
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: "Total",    value: dbRecords.length, color: "#1B2A5E", bg: "#EEF1F8" },
              { label: "Present",  value: dbPresent,        color: "#10A854", bg: "#EDFBF3" },
              { label: "Absent",   value: dbAbsent,         color: "#D63C3C", bg: "#FFF0F0" },
              { label: "Unmapped", value: dbUnmapped,       color: "#E89B1A", bg: "#FFF8E6" },
            ].map(s => (
              <div key={s.label} className="flex flex-col items-center gap-0.5 p-3 rounded-[var(--radius-lg)]"
                style={{ background: s.bg }}>
                <span className="text-xl font-bold" style={{ color: s.color }}>{s.value}</span>
                <span className="text-[10px] font-medium" style={{ color: s.color }}>{s.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* Records table */}
        {dbLoading ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} h={44} r={8} />)}
          </div>
        ) : dbRecords.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 rounded-[var(--radius-lg)] border border-dashed"
            style={{ borderColor: "var(--surface-border)" }}>
            <CalendarBlank size={28} style={{ color: "var(--text-disabled)" }} />
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              {logs.length === 0 ? "No imports yet — upload a report to see data here." : "No records for this filter."}
            </p>
          </div>
        ) : (
          <div className="rounded-[var(--radius-lg)] border overflow-hidden" style={{ borderColor: "var(--surface-border)" }}>
            <div className="overflow-auto max-h-[480px]">
              <table className="w-full text-xs">
                <thead className="sticky top-0 z-10">
                  <tr style={{ background: "var(--surface-subtle)", borderBottom: "1px solid var(--surface-border)" }}>
                    {["Name (Device)","Date","Shift","Check In","Check Out","ERP Employee","ANK-ID","Status"].map(h => (
                      <th key={h} className="px-3 py-2.5 text-left font-semibold whitespace-nowrap"
                        style={{ color: "var(--text-muted)" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dbRecords.map(r => {
                    const hasIn   = !!r.check_in
                    const status  = !r.matched ? "unmapped" : hasIn ? "present" : "absent"
                    const statusStyle = {
                      unmapped: { bg: "#FFF8E6", color: "#E89B1A", label: "Unmapped" },
                      present:  { bg: "#EDFBF3", color: "#10A854", label: "Present"  },
                      absent:   { bg: "#FFF0F0", color: "#D63C3C", label: "Absent"   },
                    }[status]

                    return (
                      <tr key={r.id} className="border-t transition-colors hover:bg-[#F8FAFC]"
                        style={{ borderColor: "var(--surface-border)" }}>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            <Avatar name={r.device_name} size="sm" />
                            <span className="font-medium" style={{ color: "var(--text-primary)" }}>{r.device_name}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap" style={{ color: "var(--text-secondary)" }}>{r.date}</td>
                        <td className="px-3 py-2.5 text-[10px]" style={{ color: "var(--text-disabled)" }}>
                          {r.timetable || r.shift || "—"}
                        </td>
                        <td className="px-3 py-2.5 font-mono font-semibold"
                          style={{ color: r.check_in ? "#10A854" : "var(--text-disabled)" }}>
                          {r.check_in ?? "—"}
                        </td>
                        <td className="px-3 py-2.5 font-mono"
                          style={{ color: r.check_out ? "#7A849A" : "var(--text-disabled)" }}>
                          {r.check_out ?? "—"}
                        </td>
                        <td className="px-3 py-2.5" style={{ color: r.matched ? "var(--text-primary)" : "var(--text-disabled)" }}>
                          {r.full_name ?? "—"}
                        </td>
                        <td className="px-3 py-2.5 font-mono text-[10px]" style={{ color: "var(--text-muted)" }}>
                          {r.employee_id ?? "—"}
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                            style={{ background: statusStyle.bg, color: statusStyle.color }}>
                            {statusStyle.label}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-2 border-t text-xs" style={{ borderColor: "var(--surface-border)", color: "var(--text-muted)" }}>
              {dbRecords.length} record{dbRecords.length !== 1 ? "s" : ""} · {dbMatched} mapped · {dbUnmapped} unmapped
              {activeLog?.filename ? ` · ${activeLog.filename}` : ""}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
//  MAPPING PANEL (tab 2 of device sync)
// ══════════════════════════════════════════════════════════════════════════════
function MappingPanel() {
  const [mappings,   setMappings]   = React.useState<DeviceMapping[]>([])
  const [employees,  setEmployees]  = React.useState<EmpOption[]>([])
  const [loading,    setLoading]    = React.useState(true)
  const [saving,     setSaving]     = React.useState<Record<number, boolean>>({})
  const [saved,      setSaved]      = React.useState<Record<number, boolean>>({})
  const [edits,      setEdits]      = React.useState<Record<number, string>>({})   // device_id → profile_id
  const [search,     setSearch]     = React.useState("")
  const [autoMatch,  setAutoMatch]  = React.useState(false)

  React.useEffect(() => {
    Promise.all([
      apiFetch<{ mappings: DeviceMapping[] }>("/api/attendance/device-mapping"),
      apiFetch<{ users: EmpOption[] }>("/api/users?fields=id,full_name,employee_id"),
    ]).then(([m, u]) => {
      setMappings(m.mappings ?? [])
      setEmployees(u.users ?? [])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  function handleAutoMatch() {
    const newEdits = { ...edits }
    let count = 0
    for (const m of mappings) {
      if (m.profile_id) continue // already mapped
      // Try matching by: employee_id number == device_id (ANK-001 → device 1)
      const expectedEmpId = empIdFromNum(m.device_id)
      const match = employees.find(e => e.employee_id === expectedEmpId)
      if (match) { newEdits[m.device_id] = match.id; count++ }
    }
    setEdits(newEdits)
    setAutoMatch(true)
    setTimeout(() => setAutoMatch(false), 2000)
  }

  async function saveMapping(deviceId: number) {
    const profileId = edits[deviceId] ?? null
    setSaving(s => ({ ...s, [deviceId]: true }))
    try {
      const emp = employees.find(e => e.id === profileId)
      await apiFetch("/api/attendance/device-mapping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          device_id:   deviceId,
          profile_id:  profileId,
          employee_id: emp?.employee_id ?? null,
        }),
      })
      setSaved(s => ({ ...s, [deviceId]: true }))
      setTimeout(() => setSaved(s => ({ ...s, [deviceId]: false })), 2000)
      // Refresh mappings
      apiFetch<{ mappings: DeviceMapping[] }>("/api/attendance/device-mapping")
        .then(r => setMappings(r.mappings ?? [])).catch(() => {})
    } catch { /* noop */ }
    finally { setSaving(s => ({ ...s, [deviceId]: false })) }
  }

  async function clearMapping(deviceId: number) {
    setSaving(s => ({ ...s, [deviceId]: true }))
    try {
      await apiFetch(`/api/attendance/device-mapping?device_id=${deviceId}`, { method: "DELETE" })
      setEdits(e => { const n = { ...e }; delete n[deviceId]; return n })
      apiFetch<{ mappings: DeviceMapping[] }>("/api/attendance/device-mapping")
        .then(r => setMappings(r.mappings ?? [])).catch(() => {})
    } catch { /* noop */ }
    finally { setSaving(s => ({ ...s, [deviceId]: false })) }
  }

  const filtered = mappings.filter(m =>
    !search ||
    m.device_name.toLowerCase().includes(search.toLowerCase()) ||
    String(m.device_id).includes(search) ||
    (m.profile?.full_name ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (m.employee_id ?? "").toLowerCase().includes(search.toLowerCase())
  )

  const totalMapped   = mappings.filter(m => m.profile_id).length
  const totalUnmapped = mappings.filter(m => !m.profile_id).length

  return (
    <div className="flex flex-col gap-4">
      {/* Stats + actions row */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-3 flex-1">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold"
            style={{ background: "#EDFBF3", color: "#10A854" }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#10A854" }} />
            {totalMapped} mapped
          </div>
          {totalUnmapped > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold"
              style={{ background: "#FFF8E6", color: "#E89B1A" }}>
              <Warning size={12} />
              {totalUnmapped} unmapped
            </div>
          )}
        </div>

        <Button variant="secondary" size="sm" onClick={handleAutoMatch}>
          <Lightning size={14} /> {autoMatch ? "Matched!" : "Auto-match by ID"}
        </Button>
      </div>

      {/* Info bar */}
      <div className="flex items-start gap-2 p-3 rounded-[var(--radius-md)] border text-xs"
        style={{ background: "#EFF4FF", borderColor: "#BFDBFE", color: "#1e40af" }}>
        <Info size={14} style={{ flexShrink: 0, marginTop: 1 }} />
        Auto-match links device IDs to employees by number (device 1 → ANK-001, device 2 → ANK-002…).
        Edit rows manually if the numbering differs.
      </div>

      {/* Search */}
      <div className="relative">
        <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
        <input
          type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by device ID, name, or employee ID…"
          className="w-full h-9 pl-8 pr-3 text-sm rounded-[var(--radius-md)] border"
          style={{ background: "var(--surface-base)", borderColor: "var(--surface-border)", color: "var(--text-primary)", outline: "none" }}
          onFocus={e => (e.currentTarget.style.borderColor = "#1B2A5E")}
          onBlur={e => (e.currentTarget.style.borderColor = "var(--surface-border)")}
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} h={52} r={10} />)}
        </div>
      ) : (
        <div className="rounded-[var(--radius-lg)] border overflow-hidden" style={{ borderColor: "var(--surface-border)" }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "var(--surface-subtle)", borderBottom: "1px solid var(--surface-border)" }}>
                {["Device ID","Device Name (iVMS-4200)","→","ERP Employee","ANK-ID","Action"].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold"
                    style={{ color: "var(--text-muted)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(m => {
                const currentProfileId = edits[m.device_id] !== undefined ? edits[m.device_id] : (m.profile_id ?? "")
                const isDirty    = edits[m.device_id] !== undefined && edits[m.device_id] !== (m.profile_id ?? "")
                const isMapped   = !!currentProfileId
                const isSaving   = !!saving[m.device_id]
                const justSaved  = !!saved[m.device_id]
                const selEmployee = employees.find(e => e.id === currentProfileId)

                return (
                  <tr key={m.device_id} className="border-t transition-colors hover:bg-[#F8FAFC]"
                    style={{ borderColor: "var(--surface-border)" }}>
                    {/* Device ID */}
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-[var(--radius-md)] text-xs font-bold font-mono"
                        style={{ background: "#EEF1F8", color: "#1B2A5E" }}>
                        {m.device_id}
                      </span>
                    </td>

                    {/* Device name */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Avatar name={m.device_name} size="sm" />
                        <span style={{ color: "var(--text-primary)" }}>{m.device_name}</span>
                      </div>
                    </td>

                    {/* Arrow */}
                    <td className="px-2 py-3 text-center">
                      <LinkIcon size={14} style={{ color: isMapped ? "#10A854" : "var(--text-disabled)" }} />
                    </td>

                    {/* Employee selector */}
                    <td className="px-4 py-3">
                      <select
                        value={currentProfileId}
                        onChange={e => setEdits(prev => ({ ...prev, [m.device_id]: e.target.value }))}
                        className="w-full h-8 px-2 text-sm rounded-[var(--radius-md)] border"
                        style={{
                          background: "var(--surface-base)",
                          borderColor: isDirty ? "#1B2A5E" : "var(--surface-border)",
                          color: "var(--text-primary)", outline: "none",
                        }}
                        disabled={isSaving}
                      >
                        <option value="">— Not mapped —</option>
                        {employees.map(e => (
                          <option key={e.id} value={e.id}>
                            {e.full_name ?? e.id} {e.employee_id ? `(${e.employee_id})` : ""}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* ANK-ID */}
                    <td className="px-4 py-3">
                      <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded"
                        style={{
                          background: isMapped ? "#EEF1F8" : "var(--surface-muted)",
                          color:      isMapped ? "#1B2A5E" : "var(--text-disabled)",
                        }}>
                        {selEmployee?.employee_id ?? (isMapped ? "—" : empIdFromNum(m.device_id)+"?")}
                      </span>
                    </td>

                    {/* Action */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {(isDirty || !m.profile_id) && currentProfileId && (
                          <button
                            onClick={() => saveMapping(m.device_id)}
                            disabled={isSaving}
                            className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-[var(--radius-md)] transition-all"
                            style={{
                              background: justSaved ? "#10A854" : "#1B2A5E",
                              color: "#fff",
                            }}
                          >
                            {isSaving ? (
                              <div className="w-3 h-3 rounded-full border border-white/30 border-t-white animate-spin" />
                            ) : justSaved ? (
                              <CheckCircle size={12} />
                            ) : (
                              <FloppyDisk size={12} />
                            )}
                            {justSaved ? "Saved" : "Save"}
                          </button>
                        )}
                        {m.profile_id && (
                          <button
                            onClick={() => clearMapping(m.device_id)}
                            disabled={isSaving}
                            className="flex items-center gap-1 text-xs px-2 py-1.5 rounded-[var(--radius-md)] transition-all hover:bg-red-50"
                            style={{ color: "#D63C3C" }}
                          >
                            <Trash size={12} />
                          </button>
                        )}
                        {!m.profile_id && !currentProfileId && (
                          <span className="text-xs" style={{ color: "var(--text-disabled)" }}>—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-10">
              <User size={24} style={{ color: "var(--text-disabled)" }} />
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>No matching device entries</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
//  DEVICE SYNC WRAPPER
// ══════════════════════════════════════════════════════════════════════════════
function DeviceSyncSection() {
  const [tab, setTab] = React.useState<"import" | "mapping">("import")

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-[var(--radius-md)] flex items-center justify-center"
            style={{ background: "#EEF1F8" }}>
            <ArrowsClockwise size={18} style={{ color: "#1B2A5E" }} />
          </div>
          <div>
            <CardTitle>HIKVISION iVMS-4200 Integration</CardTitle>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
              Import XLS punch reports and manage device ↔ employee ID mapping
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 p-1 rounded-[var(--radius-md)]"
          style={{ background: "var(--surface-subtle)" }}>
          {(["import", "mapping"] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="px-3 py-1.5 rounded-[var(--radius-md)] text-xs font-semibold capitalize transition-all"
              style={{
                background: tab === t ? "#fff" : "transparent",
                color:      tab === t ? "#1B2A5E" : "var(--text-muted)",
                boxShadow:  tab === t ? "0 1px 3px rgba(0,0,0,.08)" : "none",
              }}
            >
              {t === "import" ? "Import" : "Device Mapping"}
            </button>
          ))}
        </div>
      </CardHeader>

      <div className="px-4 pb-4">
        {tab === "import"  && <ImportPanel />}
        {tab === "mapping" && <MappingPanel />}
      </div>
    </Card>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
//  PAGE ROOT
// ══════════════════════════════════════════════════════════════════════════════
export default function AttendancePage() {
  const { user, loading: authLoading } = useAuth()
  const isAdminOrHR = ["admin", "hr"].includes(user?.role ?? "")
  const [mainTab, setMainTab] = React.useState<"personal" | "device">("personal")

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-t-[#1B2A5E] rounded-full animate-spin"
          style={{ borderColor: "var(--surface-border)", borderTopColor: "#1B2A5E" }} />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <PageHeader
          title="Attendance"
          subtitle={isAdminOrHR
            ? "Track attendance and manage HIKVISION device integration"
            : "Track your daily attendance and review your monthly history"}
        />
        {isAdminOrHR && (
          <div className="flex items-center gap-1 p-1 rounded-[var(--radius-lg)] border flex-shrink-0"
            style={{ background: "var(--surface-subtle)", borderColor: "var(--surface-border)" }}>
            {[
              { key: "personal", label: "My Attendance" },
              { key: "device",   label: "Device Sync" },
            ].map(t => (
              <button
                key={t.key}
                onClick={() => setMainTab(t.key as "personal" | "device")}
                className="flex items-center gap-1.5 px-4 py-2 rounded-[var(--radius-md)] text-sm font-medium transition-all"
                style={{
                  background: mainTab === t.key ? "#1B2A5E" : "transparent",
                  color:      mainTab === t.key ? "#fff"    : "var(--text-muted)",
                  boxShadow:  mainTab === t.key ? "0 1px 3px rgba(0,0,0,.15)" : "none",
                }}
              >
                {t.key === "device" && <ArrowsClockwise size={14} />}
                {t.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {mainTab === "personal" && <PersonalSection />}
      {mainTab === "device"   && isAdminOrHR && <DeviceSyncSection />}
    </div>
  )
}
