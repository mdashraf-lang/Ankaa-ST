"use client"

import * as React from "react"
import {
  Plus, Airplane, CheckCircle, WarningCircle, Wind,
} from "@phosphor-icons/react"
import { PageHeader } from "@/components/ui/page-header"
import { Button } from "@/components/ui/button"
import { StatCard } from "@/components/ui/stat-card"
import { DataTable } from "@/components/ui/data-table"
import { StatusBadge } from "@/components/ui/status-badge"
import { formatDate } from "@/lib/utils"
import { Modal } from "@/components/ui/modal"
import { Input, Textarea } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { useConfirm } from "@/components/ui/confirm-dialog"
import { apiFetch } from "@/lib/api"
import { toast } from "sonner"
import type { FleetFlightLog, FleetDrone, FleetPilot } from "@/lib/types"
import type { Column } from "@/components/ui/data-table"

type FlightLogRow = FleetFlightLog & { drone_name?: string; pilot_name?: string }

const WEATHER_LABELS: Record<string, string> = {
  clear: "Clear", cloudy: "Cloudy", rain: "Rain", wind: "Windy", storm: "Storm",
}

const EMPTY_FORM = {
  mission_name: "",
  drone_id: "",
  pilot_id: "",
  start_time: "",
  end_time: "",
  flight_duration: "",
  start_location: "",
  end_location: "",
  flight_path: "",
  status: "completed" as FleetFlightLog["status"],
  weather_conditions: "",
  wind_speed: "",
  temperature: "",
  notes: "",
}

type FormState = typeof EMPTY_FORM

export default function FlightLogsPage() {
  const [logs, setLogs] = React.useState<FlightLogRow[]>([])
  const [drones, setDrones] = React.useState<FleetDrone[]>([])
  const [pilots, setPilots] = React.useState<FleetPilot[]>([])
  const [loading, setLoading] = React.useState(true)
  const [statusFilter, setStatusFilter] = React.useState("all")
  const [modalOpen, setModalOpen] = React.useState(false)
  const [editTarget, setEditTarget] = React.useState<FlightLogRow | null>(null)
  const [form, setForm] = React.useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = React.useState(false)
  const [deleting, setDeleting] = React.useState<string | null>(null)
  const confirm = useConfirm()

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const [lRes, dRes, pRes] = await Promise.allSettled([
        apiFetch<{ logs: FlightLogRow[] }>("/api/fleet/flight-logs"),
        apiFetch<{ drones: FleetDrone[] }>("/api/fleet/drones"),
        apiFetch<{ pilots: FleetPilot[] }>("/api/fleet/pilots"),
      ])
      if (lRes.status === "fulfilled") setLogs(lRes.value.logs ?? [])
      if (dRes.status === "fulfilled") setDrones(dRes.value.drones ?? [])
      if (pRes.status === "fulfilled") setPilots(pRes.value.pilots ?? [])
    } catch { toast.error("Failed to load flight logs") }
    finally { setLoading(false) }
  }, [])

  React.useEffect(() => { load() }, [load])

  function openAdd() { setEditTarget(null); setForm(EMPTY_FORM); setModalOpen(true) }
  function openEdit(l: FlightLogRow) {
    setEditTarget(l)
    setForm({
      mission_name: l.mission_name ?? "",
      drone_id: l.drone_id ?? "",
      pilot_id: l.pilot_id ?? "",
      start_time: l.start_time ?? "",
      end_time: l.end_time ?? "",
      flight_duration: l.flight_duration != null ? String(l.flight_duration) : "",
      start_location: l.start_location ?? "",
      end_location: l.end_location ?? "",
      flight_path: l.flight_path ?? "",
      status: l.status,
      weather_conditions: l.weather_conditions ?? "",
      wind_speed: l.wind_speed != null ? String(l.wind_speed) : "",
      temperature: l.temperature != null ? String(l.temperature) : "",
      notes: l.notes ?? "",
    })
    setModalOpen(true)
  }
  function closeModal() { setModalOpen(false); setEditTarget(null) }
  function setField(key: keyof FormState, value: string) { setForm((f) => ({ ...f, [key]: value })) }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!form.mission_name.trim()) { toast.error("Mission name is required"); return }
    setSaving(true)
    try {
      const payload = {
        ...form,
        drone_id: form.drone_id || null,
        pilot_id: form.pilot_id || null,
        flight_duration: form.flight_duration ? Number(form.flight_duration) : 0,
        wind_speed: form.wind_speed ? Number(form.wind_speed) : null,
        temperature: form.temperature ? Number(form.temperature) : null,
      }
      if (editTarget) {
        await apiFetch(`/api/fleet/flight-logs/${editTarget.id}`, { method: "PATCH", body: JSON.stringify(payload) })
        toast.success("Flight log updated")
      } else {
        await apiFetch("/api/fleet/flight-logs", { method: "POST", body: JSON.stringify(payload) })
        toast.success("Flight logged")
      }
      closeModal(); load()
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : "Save failed") }
    finally { setSaving(false) }
  }

  async function handleDelete(id: string) {
    const ok = await confirm({ title: "Delete Flight Log", message: "This flight log will be permanently deleted and cannot be recovered.", confirmLabel: "Delete" })
    if (!ok) return
    setDeleting(id)
    try {
      await apiFetch(`/api/fleet/flight-logs/${id}`, { method: "DELETE" })
      toast.success("Log deleted"); load()
    } catch { toast.error("Delete failed") }
    finally { setDeleting(null) }
  }

  const filtered = statusFilter === "all" ? logs : logs.filter((l) => l.status === statusFilter)
  const totalHours = logs.reduce((sum, l) => sum + (l.flight_duration ?? 0), 0)
  const incidents = logs.filter((l) => l.status === "incident").length
  const stats = {
    total: logs.length,
    completed: logs.filter((l) => l.status === "completed").length,
    incidents,
    totalHours: Math.round(totalHours * 10) / 10,
  }

  const filterTabs = ["all", "completed", "in_progress", "aborted", "incident"]

  const columns: Column<FlightLogRow>[] = [
    {
      key: "mission_name", header: "Mission", sortable: true,
      render: (v) => <span className="font-medium" style={{ color: "var(--text-primary)" }}>{v as string}</span>,
    },
    {
      key: "drone_name", header: "Drone",
      render: (v, row) => {
        const r = row as FlightLogRow
        return <span style={{ color: "var(--text-secondary)" }}>{(v as string) || r.drone_id || "—"}</span>
      },
    },
    {
      key: "pilot_name", header: "Pilot",
      render: (v, row) => {
        const r = row as FlightLogRow
        return <span style={{ color: "var(--text-secondary)" }}>{(v as string) || r.pilot_id || "—"}</span>
      },
    },
    {
      key: "start_time", header: "Start", sortable: true,
      render: (v) => formatDate(v as string) ?? "—",
    },
    {
      key: "flight_duration", header: "Duration", sortable: true,
      render: (v) => (v != null ? `${v} hrs` : "—"),
    },
    {
      key: "weather_conditions", header: "Weather",
      render: (v) => (
        <span className="text-xs px-2 py-0.5 rounded-full flex items-center gap-1 w-fit"
          style={{ background: "var(--surface-muted)", color: "var(--text-secondary)" }}>
          <Wind size={10} />
          {WEATHER_LABELS[v as string] ?? (v as string) ?? "—"}
        </span>
      ),
    },
    { key: "status", header: "Status", render: (v) => <StatusBadge status={v as string} /> },
    {
      key: "id", header: "",
      render: (v, row) => (
        <div className="flex items-center gap-2">
          <button className="text-xs px-2 py-1 rounded"
            style={{ color: "var(--brand-navy)", background: "var(--surface-muted)" }}
            onClick={(e) => { e.stopPropagation(); openEdit(row as FlightLogRow) }}>Edit</button>
          <button className="text-xs px-2 py-1 rounded"
            style={{ color: "var(--status-error, #D63C3C)", background: "var(--surface-muted)" }}
            disabled={deleting === (v as string)}
            onClick={(e) => { e.stopPropagation(); handleDelete(v as string) }}>
            {deleting === (v as string) ? "…" : "Delete"}
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Flight Logs"
        subtitle="Complete log of all drone missions and flights"
        actions={<Button variant="primary" size="md" onClick={openAdd}><Plus size={16} />Log Flight</Button>}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Flights" value={stats.total} icon={<Airplane size={18} />} color="#1B2A5E" iconBg="#EEF1F8" />
        <StatCard title="Completed" value={stats.completed} icon={<CheckCircle size={18} />} color="#10A854" iconBg="#EDFBF3" />
        <StatCard title="Incidents" value={stats.incidents} icon={<WarningCircle size={18} />} color="#EF4444" iconBg="#FEF2F2" />
        <StatCard title="Total Hours" value={`${stats.totalHours} hrs`} icon={<Wind size={18} />} color="#2563EB" iconBg="#EFF4FF" />
      </div>

      {incidents > 0 && (
        <div className="rounded-[var(--radius-lg)] border p-4 flex items-start gap-3"
          style={{ background: "var(--status-error-bg)", borderColor: "var(--status-error)" }}>
          <WarningCircle size={18} style={{ color: "var(--status-error)", flexShrink: 0, marginTop: 1 }} />
          <div>
            <p className="text-sm font-medium" style={{ color: "var(--status-error)" }}>
              {incidents} incident{incidents > 1 ? "s" : ""} recorded
            </p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
              Review incident logs and file safety reports as required.
            </p>
          </div>
        </div>
      )}

      <div className="flex border-b" style={{ borderColor: "var(--surface-border)" }}>
        {filterTabs.map((f) => (
          <button key={f} onClick={() => setStatusFilter(f)}
            className="px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors capitalize"
            style={{ borderColor: statusFilter === f ? "var(--brand-navy)" : "transparent", color: statusFilter === f ? "var(--brand-navy)" : "var(--text-muted)" }}>
            {f.replace("_", " ")}
          </button>
        ))}
      </div>

      <DataTable
        columns={columns} data={filtered} loading={loading}
        emptyIcon={<Airplane size={28} />} emptyTitle="No flight logs"
        emptyDescription="Log drone missions to track flight hours and operational data."
        emptyAction={<Button variant="primary" size="sm" onClick={openAdd}><Plus size={14} />Log Flight</Button>}
      />

      <Modal
        open={modalOpen}
        onOpenChange={(open) => { if (!open) closeModal() }}
        title={editTarget ? "Edit Flight Log" : "Log Flight"}
        size="xl"
        footer={
          <div className="flex items-center justify-between w-full">
            {editTarget ? (
              <Button type="button" variant="destructive" size="sm"
                loading={deleting === editTarget.id}
                onClick={() => { handleDelete(editTarget.id); closeModal() }}>
                Delete Log
              </Button>
            ) : <span />}
            <div className="flex gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={closeModal}>Cancel</Button>
              <Button type="submit" form="flight-log-form" variant="primary" size="sm" loading={saving}>
                {editTarget ? "Save Changes" : "Log Flight"}
              </Button>
            </div>
          </div>
        }
      >
        <form id="flight-log-form" onSubmit={handleSave} className="flex flex-col gap-4">
          <Input label="Mission Name" required value={form.mission_name} onChange={(e) => setField("mission_name", e.target.value)} placeholder="e.g. Coastal Survey #12" />
          <div className="grid grid-cols-2 gap-4">
            <Select label="Drone" value={form.drone_id} onChange={(e) => setField("drone_id", e.target.value)}>
              <option value="">Select drone…</option>
              {drones.map(d => <option key={d.id} value={d.id}>{d.drone_name}</option>)}
            </Select>
            <Select label="Pilot" value={form.pilot_id} onChange={(e) => setField("pilot_id", e.target.value)}>
              <option value="">Select pilot…</option>
              {pilots.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
            <Input label="Start Time" type="datetime-local" value={form.start_time} onChange={(e) => setField("start_time", e.target.value)} />
            <Input label="End Time" type="datetime-local" value={form.end_time} onChange={(e) => setField("end_time", e.target.value)} />
            <Input label="Duration (hrs)" type="number" step="0.1" value={form.flight_duration} onChange={(e) => setField("flight_duration", e.target.value)} placeholder="0.0" />
            <Select label="Status" value={form.status} onChange={(e) => setField("status", e.target.value)}>
              <option value="completed">Completed</option>
              <option value="in_progress">In Progress</option>
              <option value="aborted">Aborted</option>
              <option value="incident">Incident</option>
            </Select>
            <Input label="Start Location" value={form.start_location} onChange={(e) => setField("start_location", e.target.value)} />
            <Input label="End Location" value={form.end_location} onChange={(e) => setField("end_location", e.target.value)} />
            <Select label="Weather" value={form.weather_conditions} onChange={(e) => setField("weather_conditions", e.target.value)}>
              <option value="">Select…</option>
              {Object.entries(WEATHER_LABELS).map(([k, lbl]) => <option key={k} value={k}>{lbl}</option>)}
            </Select>
            <Input label="Wind Speed (km/h)" type="number" value={form.wind_speed} onChange={(e) => setField("wind_speed", e.target.value)} />
            <Input label="Temperature (°C)" type="number" value={form.temperature} onChange={(e) => setField("temperature", e.target.value)} />
          </div>
          <Input label="Flight Path / Area" value={form.flight_path} onChange={(e) => setField("flight_path", e.target.value)} />
          <Textarea label="Notes" value={form.notes} onChange={(e) => setField("notes", e.target.value)} />
        </form>
      </Modal>
    </div>
  )
}
