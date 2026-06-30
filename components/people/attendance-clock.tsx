"use client"

import * as React from "react"
import { Timer, MapPin } from "@phosphor-icons/react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { StatusBadge } from "@/components/ui/status-badge"
import { apiFetch } from "@/lib/api"

interface AttendanceRecord {
  id: string
  status: string
  clock_in: string | null
  clock_out: string | null
  late_minutes: number | null
  location_type: string | null
}

interface AttendanceClockProps {
  initialRecord?: AttendanceRecord | null
  onUpdate?: (record: AttendanceRecord) => void
}

export function AttendanceClock({ initialRecord, onUpdate }: AttendanceClockProps) {
  const [currentTime, setCurrentTime]   = React.useState(new Date())
  const [record,      setRecord]        = React.useState<AttendanceRecord | null>(initialRecord ?? null)
  const [locationType, setLocationType] = React.useState<"office" | "remote" | "field">("office")
  const [loading,     setLoading]       = React.useState(false)

  React.useEffect(() => {
    const id = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  React.useEffect(() => {
    if (initialRecord !== undefined) setRecord(initialRecord)
  }, [initialRecord])

  const isClockedIn = !!(record?.clock_in && !record?.clock_out)

  async function handleClockAction() {
    setLoading(true)
    try {
      const { attendance } = await apiFetch<{ attendance: AttendanceRecord }>('/api/attendance', {
        method: 'POST',
        body: JSON.stringify({ action: isClockedIn ? 'out' : 'in', location_type: locationType }),
      })
      setRecord(attendance)
      onUpdate?.(attendance)
      toast.success(isClockedIn ? 'Clocked out successfully' : 'Clocked in successfully')
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to record attendance')
    } finally {
      setLoading(false)
    }
  }

  function fmtTime(ts: string | null) {
    if (!ts) return '—'
    return new Date(ts).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  }

  const statusValue = record?.status ?? 'absent'
  const donForToday = !!(record?.clock_in && record?.clock_out)

  return (
    <Card>
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
        {/* Live clock */}
        <div className="flex flex-col items-center gap-1 min-w-[160px]">
          <p className="text-4xl font-mono font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            {currentTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </p>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            {currentTime.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>

        <div className="w-px h-16 hidden sm:block" style={{ background: 'var(--surface-border)' }} />

        {/* Status + times */}
        <div className="flex flex-col gap-2 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Today:</span>
            <StatusBadge status={statusValue} />
          </div>
          <div className="flex items-center gap-6">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Clock In</span>
              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{fmtTime(record?.clock_in ?? null)}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Clock Out</span>
              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{fmtTime(record?.clock_out ?? null)}</span>
            </div>
            {(record?.late_minutes ?? 0) > 0 && (
              <div className="flex flex-col gap-0.5">
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Late by</span>
                <span className="text-sm font-medium" style={{ color: '#E89B1A' }}>{record!.late_minutes} min</span>
              </div>
            )}
          </div>
        </div>

        {/* Location select + action button */}
        <div className="flex flex-col gap-3">
          {!isClockedIn && !donForToday && (
            <div className="flex items-center gap-2">
              <MapPin size={14} style={{ color: 'var(--text-muted)' }} />
              <select
                className="text-sm border rounded-[var(--radius-md)] px-2 py-1"
                style={{ borderColor: 'var(--surface-border)', background: 'var(--surface-muted)', color: 'var(--text-secondary)' }}
                value={locationType}
                onChange={e => setLocationType(e.target.value as typeof locationType)}
              >
                <option value="office">Office</option>
                <option value="remote">Remote</option>
                <option value="field">Field</option>
              </select>
            </div>
          )}

          {donForToday ? (
            <div className="flex items-center gap-2 text-sm font-medium" style={{ color: '#10A854' }}>
              <Timer size={16} /> Done for today
            </div>
          ) : (
            <Button
              variant={isClockedIn ? 'destructive' : 'primary'}
              loading={loading}
              onClick={handleClockAction}
            >
              <Timer size={16} />
              {isClockedIn ? 'Clock Out' : 'Clock In'}
            </Button>
          )}
        </div>
      </div>
    </Card>
  )
}
