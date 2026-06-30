"use client"

import * as React from "react"
import { Plus, MapPin, CheckCircle, Clock, Car } from "@phosphor-icons/react"
import { PageHeader } from "@/components/ui/page-header"
import { Button } from "@/components/ui/button"
import { StatCard } from "@/components/ui/stat-card"
import { DataTable } from "@/components/ui/data-table"
import { StatusBadge } from "@/components/ui/status-badge"
import { Modal } from "@/components/ui/modal"
import { Input, Textarea } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { useConfirm } from "@/components/ui/confirm-dialog"
import { formatDate } from "@/lib/utils"
import { apiFetch } from "@/lib/api"
import { toast } from "sonner"
import type { FleetTrip, FleetVehicle, FleetDriver } from "@/lib/types"
import type { Column } from "@/components/ui/data-table"

type TripRow = FleetTrip & {
  vehicle_name?: string
  license_plate_number?: string
  license_plate_alphabets?: string
  driver_name?: string
}

const EMPTY_FORM = {
  vehicle_id: "",
  driver_id: "",
  requested_by: "",
  purpose: "",
  destination: "",
  departure: "",
  return_time: "",
  mileage_start: "",
  mileage_end: "",
  status: "pending" as FleetTrip["status"],
  notes: "",
}

type FormState = typeof EMPTY_FORM

export default function TripsPage() {
  const [trips, setTrips] = React.useState<TripRow[]>([])
  const [vehicles, setVehicles] = React.useState<FleetVehicle[]>([])
  const [drivers, setDrivers] = React.useState<FleetDriver[]>([])
  const [loading, setLoading] = React.useState(true)
  const [statusFilter, setStatusFilter] = React.useState("all")
  const [modalOpen, setModalOpen] = React.useState(false)
  const [editTarget, setEditTarget] = React.useState<TripRow | null>(null)
  const [form, setForm] = React.useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = React.useState(false)
  const [deleting, setDeleting] = React.useState<string | null>(null)
  const confirm = useConfirm()

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const [tRes, vRes, dRes] = await Promise.allSettled([
        apiFetch<{ trips: TripRow[] }>("/api/fleet/trips"),
        apiFetch<{ vehicles: FleetVehicle[] }>("/api/fleet/vehicles"),
        apiFetch<{ drivers: FleetDriver[] }>("/api/fleet/drivers"),
      ])
      if (tRes.status === "fulfilled") setTrips(tRes.value.trips ?? [])
      if (vRes.status === "fulfilled") setVehicles(vRes.value.vehicles ?? [])
      if (dRes.status === "fulfilled") setDrivers(dRes.value.drivers ?? [])
    } catch { toast.error("Failed to load trips") }
    finally { setLoading(false) }
  }, [])

  React.useEffect(() => { load() }, [load])

  function openAdd() { setEditTarget(null); setForm(EMPTY_FORM); setModalOpen(true) }
  function openEdit(t: TripRow) {
    setEditTarget(t)
    setForm({
      vehicle_id: t.vehicle_id ?? "",
      driver_id: t.driver_id ?? "",
      requested_by: t.requested_by ?? "",
      purpose: t.purpose ?? "",
      destination: t.destination ?? "",
      departure: t.departure ?? "",
      return_time: t.return_time ?? "",
      mileage_start: t.mileage_start != null ? String(t.mileage_start) : "",
      mileage_end: t.mileage_end != null ? String(t.mileage_end) : "",
      status: t.status,
      notes: t.notes ?? "",
    })
    setModalOpen(true)
  }
  function closeModal() { setModalOpen(false); setEditTarget(null) }
  function setField(key: keyof FormState, value: string) { setForm((f) => ({ ...f, [key]: value })) }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        ...form,
        vehicle_id: form.vehicle_id || null,
        driver_id: form.driver_id || null,
        mileage_start: form.mileage_start ? Number(form.mileage_start) : null,
        mileage_end: form.mileage_end ? Number(form.mileage_end) : null,
      }
      if (editTarget) {
        await apiFetch(`/api/fleet/trips/${editTarget.id}`, { method: "PATCH", body: JSON.stringify(payload) })
        toast.success("Trip updated")
      } else {
        await apiFetch("/api/fleet/trips", { method: "POST", body: JSON.stringify(payload) })
        toast.success("Trip logged")
      }
      closeModal(); load()
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : "Save failed") }
    finally { setSaving(false) }
  }

  async function handleDelete(id: string) {
    const ok = await confirm({ title: "Delete Trip", message: "This trip log will be permanently deleted.", confirmLabel: "Delete" })
    if (!ok) return
    setDeleting(id)
    try {
      await apiFetch(`/api/fleet/trips/${id}`, { method: "DELETE" })
      toast.success("Trip deleted"); load()
    } catch { toast.error("Delete failed") }
    finally { setDeleting(null) }
  }

  const filtered = statusFilter === "all" ? trips : trips.filter((t) => t.status === statusFilter)
  const stats = {
    total: trips.length,
    pending: trips.filter((t) => t.status === "pending").length,
    active: trips.filter((t) => t.status === "active").length,
    completed: trips.filter((t) => t.status === "completed").length,
  }
  const totalKm = trips.reduce((sum, t) => {
    if (t.mileage_start != null && t.mileage_end != null) return sum + (t.mileage_end - t.mileage_start)
    return sum
  }, 0)
  const filterTabs = ["all", "pending", "approved", "active", "completed", "cancelled"]

  const columns: Column<TripRow>[] = [
    {
      key: "vehicle_name", header: "Vehicle",
      render: (v, row) => <span className="font-medium" style={{ color: "var(--text-primary)" }}>{(v as string) || (row as TripRow).vehicle_id || "—"}</span>,
    },
    {
      key: "driver_name", header: "Driver",
      render: (v, row) => <span style={{ color: "var(--text-secondary)" }}>{(v as string) || (row as TripRow).driver_id || "—"}</span>,
    },
    {
      key: "destination", header: "Destination",
      render: (v) => (
        <span className="flex items-center gap-1.5" style={{ color: "var(--text-secondary)" }}>
          <MapPin size={12} />{(v as string | null) ?? "—"}
        </span>
      ),
    },
    {
      key: "purpose", header: "Purpose",
      render: (v) => <span className="text-xs truncate max-w-[160px] block" style={{ color: "var(--text-muted)" }}>{(v as string | null) ?? "—"}</span>,
    },
    { key: "departure", header: "Departure", sortable: true, render: (v) => formatDate(v as string) ?? "—" },
    { key: "return_time", header: "Return", render: (v) => (v ? formatDate(v as string) : "—") },
    {
      key: "mileage_start", header: "Distance",
      render: (_, row) => {
        const t = row as TripRow
        if (t.mileage_start != null && t.mileage_end != null) return `${(t.mileage_end - t.mileage_start).toLocaleString()} km`
        return "—"
      },
    },
    { key: "status", header: "Status", render: (v) => <StatusBadge status={v as string} /> },
    {
      key: "id", header: "",
      render: (v, row) => (
        <div className="flex items-center gap-2">
          <button className="text-xs px-2 py-1 rounded"
            style={{ color: "var(--brand-navy)", background: "var(--surface-muted)" }}
            onClick={(e) => { e.stopPropagation(); openEdit(row as TripRow) }}>Edit</button>
          <button className="text-xs px-2 py-1 rounded"
            style={{ color: "var(--status-error)", background: "var(--surface-muted)" }}
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
        title="Trips"
        subtitle="Log and track all vehicle trips and journeys"
        actions={<Button variant="primary" size="md" onClick={openAdd}><Plus size={16} />Log Trip</Button>}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Trips" value={stats.total} icon={<Car size={18} />} color="#1B2A5E" iconBg="#EEF1F8" />
        <StatCard title="Pending" value={stats.pending} icon={<Clock size={18} />} color="#E89B1A" iconBg="#FFF8E6" />
        <StatCard title="Active" value={stats.active} icon={<MapPin size={18} />} color="#2563EB" iconBg="#EFF4FF" />
        <StatCard title="Total km" value={`${totalKm.toLocaleString()} km`} icon={<CheckCircle size={18} />} color="#10A854" iconBg="#EDFBF3" />
      </div>

      <div className="flex border-b" style={{ borderColor: "var(--surface-border)" }}>
        {filterTabs.map((f) => (
          <button key={f} onClick={() => setStatusFilter(f)}
            className="px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors capitalize"
            style={{ borderColor: statusFilter === f ? "var(--brand-navy)" : "transparent", color: statusFilter === f ? "var(--brand-navy)" : "var(--text-muted)" }}>
            {f}
          </button>
        ))}
      </div>

      <DataTable
        columns={columns} data={filtered} loading={loading}
        emptyIcon={<MapPin size={28} />} emptyTitle="No trips recorded"
        emptyDescription="Log trips to track fleet usage and mileage."
        emptyAction={<Button variant="primary" size="sm" onClick={openAdd}><Plus size={14} />Log Trip</Button>}
      />

      <Modal
        open={modalOpen}
        onOpenChange={(open) => { if (!open) closeModal() }}
        title={editTarget ? "Edit Trip" : "Log Trip"}
        size="lg"
        footer={
          <div className="flex items-center justify-between w-full">
            {editTarget ? (
              <Button type="button" variant="destructive" size="sm"
                loading={deleting === editTarget.id}
                onClick={() => { handleDelete(editTarget.id); closeModal() }}>
                Delete Trip
              </Button>
            ) : <span />}
            <div className="flex gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={closeModal}>Cancel</Button>
              <Button type="submit" form="trip-form" variant="primary" size="sm" loading={saving}>
                {editTarget ? "Save Changes" : "Log Trip"}
              </Button>
            </div>
          </div>
        }
      >
        <form id="trip-form" onSubmit={handleSave} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <Select label="Vehicle" value={form.vehicle_id} onChange={(e) => setField("vehicle_id", e.target.value)}>
              <option value="">Select vehicle…</option>
              {vehicles.map(v => <option key={v.id} value={v.id}>{v.vehicle_name}</option>)}
            </Select>
            <Select label="Driver" value={form.driver_id} onChange={(e) => setField("driver_id", e.target.value)}>
              <option value="">Select driver…</option>
              {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </Select>
          </div>
          <Input label="Requested By" value={form.requested_by} onChange={(e) => setField("requested_by", e.target.value)} />
          <Input label="Destination" value={form.destination} onChange={(e) => setField("destination", e.target.value)} placeholder="Where to?" />
          <Input label="Purpose" value={form.purpose} onChange={(e) => setField("purpose", e.target.value)} placeholder="Reason for trip" />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Departure" type="datetime-local" value={form.departure} onChange={(e) => setField("departure", e.target.value)} />
            <Input label="Return Time" type="datetime-local" value={form.return_time} onChange={(e) => setField("return_time", e.target.value)} />
            <Input label="Start Mileage (km)" type="number" value={form.mileage_start} onChange={(e) => setField("mileage_start", e.target.value)} placeholder="0" />
            <Input label="End Mileage (km)" type="number" value={form.mileage_end} onChange={(e) => setField("mileage_end", e.target.value)} placeholder="0" />
            <Select label="Status" value={form.status} onChange={(e) => setField("status", e.target.value)}>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </Select>
          </div>
          <Textarea label="Notes" value={form.notes} onChange={(e) => setField("notes", e.target.value)} />
        </form>
      </Modal>
    </div>
  )
}
