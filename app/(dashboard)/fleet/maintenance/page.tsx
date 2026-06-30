"use client"

import * as React from "react"
import { Plus, Wrench, CheckCircle, Clock, XCircle } from "@phosphor-icons/react"
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
import type { FleetVehicleMaintenance, FleetVehicle } from "@/lib/types"
import type { Column } from "@/components/ui/data-table"

type MaintenanceRow = FleetVehicleMaintenance & { vehicle_name?: string }

const ISSUE_LABELS: Record<string, string> = {
  engine: "Engine", brakes: "Brakes", transmission: "Transmission",
  electrical: "Electrical", tires: "Tires", oil_change: "Oil Change",
  ac_system: "AC System", battery: "Battery", lights: "Lights", other: "Other",
}

const EMPTY_FORM = {
  vehicle_id: "",
  issue_type: "other",
  oil_change_details: "",
  status: "pending" as FleetVehicleMaintenance["status"],
  reported_date: "",
  completion_date: "",
  cost: "",
  notes: "",
  parts_replaced: "",
}

type FormState = typeof EMPTY_FORM

export default function VehicleMaintenancePage() {
  const [records, setRecords] = React.useState<MaintenanceRow[]>([])
  const [vehicles, setVehicles] = React.useState<FleetVehicle[]>([])
  const [loading, setLoading] = React.useState(true)
  const [statusFilter, setStatusFilter] = React.useState("all")
  const [modalOpen, setModalOpen] = React.useState(false)
  const [editTarget, setEditTarget] = React.useState<MaintenanceRow | null>(null)
  const [form, setForm] = React.useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = React.useState(false)
  const [deleting, setDeleting] = React.useState<string | null>(null)
  const confirm = useConfirm()

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const [rRes, vRes] = await Promise.allSettled([
        apiFetch<{ records: MaintenanceRow[] }>("/api/fleet/maintenance"),
        apiFetch<{ vehicles: FleetVehicle[] }>("/api/fleet/vehicles"),
      ])
      if (rRes.status === "fulfilled") setRecords(rRes.value.records ?? [])
      if (vRes.status === "fulfilled") setVehicles(vRes.value.vehicles ?? [])
    } catch { toast.error("Failed to load maintenance records") }
    finally { setLoading(false) }
  }, [])

  React.useEffect(() => { load() }, [load])

  function openAdd() {
    setEditTarget(null)
    setForm({ ...EMPTY_FORM, reported_date: new Date().toISOString().split("T")[0] })
    setModalOpen(true)
  }
  function openEdit(r: MaintenanceRow) {
    setEditTarget(r)
    setForm({
      vehicle_id: r.vehicle_id ?? "",
      issue_type: r.issue_type ?? "other",
      oil_change_details: r.oil_change_details ?? "",
      status: r.status,
      reported_date: r.reported_date ?? "",
      completion_date: r.completion_date ?? "",
      cost: r.cost != null ? String(r.cost) : "",
      notes: r.notes ?? "",
      parts_replaced: r.parts_replaced ?? "",
    })
    setModalOpen(true)
  }
  function closeModal() { setModalOpen(false); setEditTarget(null) }
  function setField(key: keyof FormState, value: string) { setForm((f) => ({ ...f, [key]: value })) }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!form.vehicle_id) { toast.error("Vehicle is required"); return }
    setSaving(true)
    try {
      const payload = { ...form, cost: form.cost ? Number(form.cost) : null }
      if (editTarget) {
        await apiFetch(`/api/fleet/maintenance/${editTarget.id}`, { method: "PATCH", body: JSON.stringify(payload) })
        toast.success("Record updated")
      } else {
        await apiFetch("/api/fleet/maintenance", { method: "POST", body: JSON.stringify(payload) })
        toast.success("Maintenance logged")
      }
      closeModal(); load()
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : "Save failed") }
    finally { setSaving(false) }
  }

  async function handleDelete(id: string) {
    const ok = await confirm({ title: "Delete Record", message: "This maintenance record will be permanently deleted.", confirmLabel: "Delete" })
    if (!ok) return
    setDeleting(id)
    try {
      await apiFetch(`/api/fleet/maintenance/${id}`, { method: "DELETE" })
      toast.success("Record deleted"); load()
    } catch { toast.error("Delete failed") }
    finally { setDeleting(null) }
  }

  const filtered = statusFilter === "all" ? records : records.filter((r) => r.status === statusFilter)
  const stats = {
    total: records.length,
    pending: records.filter((r) => r.status === "pending").length,
    inProgress: records.filter((r) => r.status === "in_progress").length,
    completed: records.filter((r) => r.status === "completed").length,
  }
  const totalCost = records.reduce((sum, r) => sum + (r.cost ?? 0), 0)
  const filterTabs = ["all", "pending", "in_progress", "completed", "cancelled"]

  const columns: Column<MaintenanceRow>[] = [
    {
      key: "vehicle_name", header: "Vehicle",
      render: (v, row) => {
        const r = row as MaintenanceRow
        return <span className="font-medium" style={{ color: "var(--text-primary)" }}>{(v as string) || r.vehicle_id}</span>
      },
    },
    {
      key: "issue_type", header: "Issue Type",
      render: (v) => (
        <span className="text-xs px-2 py-0.5 rounded-full"
          style={{ background: "var(--surface-muted)", color: "var(--text-secondary)" }}>
          {ISSUE_LABELS[v as string] ?? (v as string) ?? "—"}
        </span>
      ),
    },
    { key: "status", header: "Status", render: (v) => <StatusBadge status={v as string} /> },
    { key: "reported_date", header: "Reported", sortable: true, render: (v) => formatDate(v as string) ?? "—" },
    { key: "completion_date", header: "Completed", render: (v) => (v ? formatDate(v as string) : "—") },
    { key: "cost", header: "Cost", sortable: true, render: (v) => v != null ? `OMR ${(v as number).toFixed(3)}` : "—" },
    {
      key: "notes", header: "Notes",
      render: (v) => (
        <span className="text-xs truncate max-w-[200px] block" style={{ color: "var(--text-secondary)" }}>
          {(v as string | null) ?? "—"}
        </span>
      ),
    },
    {
      key: "id", header: "",
      render: (v, row) => (
        <div className="flex items-center gap-2">
          <button className="text-xs px-2 py-1 rounded"
            style={{ color: "var(--brand-navy)", background: "var(--surface-muted)" }}
            onClick={(e) => { e.stopPropagation(); openEdit(row as MaintenanceRow) }}>Edit</button>
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
        title="Vehicle Maintenance"
        subtitle="Track repairs, servicing and maintenance history for all vehicles"
        actions={<Button variant="primary" size="md" onClick={openAdd}><Plus size={16} />Log Maintenance</Button>}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Records" value={stats.total} icon={<Wrench size={18} />} color="#1B2A5E" iconBg="#EEF1F8" />
        <StatCard title="Pending" value={stats.pending} icon={<Clock size={18} />} color="#E89B1A" iconBg="#FFF8E6" />
        <StatCard title="Completed" value={stats.completed} icon={<CheckCircle size={18} />} color="#10A854" iconBg="#EDFBF3" />
        <StatCard title="Total Cost" value={`OMR ${totalCost.toFixed(3)}`} icon={<XCircle size={18} />} color="#EF4444" iconBg="#FEF2F2" />
      </div>

      <div className="flex border-b" style={{ borderColor: "var(--surface-border)" }}>
        {filterTabs.map((f) => (
          <button key={f} onClick={() => setStatusFilter(f)}
            className="px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors"
            style={{ borderColor: statusFilter === f ? "var(--brand-navy)" : "transparent", color: statusFilter === f ? "var(--brand-navy)" : "var(--text-muted)" }}>
            {f.replace("_", " ").replace(/^\w/, (c) => c.toUpperCase())}
          </button>
        ))}
      </div>

      <DataTable
        columns={columns} data={filtered} loading={loading}
        emptyIcon={<Wrench size={28} />} emptyTitle="No maintenance records"
        emptyDescription="Log vehicle maintenance to keep your fleet in top condition."
        emptyAction={<Button variant="primary" size="sm" onClick={openAdd}><Plus size={14} />Log Maintenance</Button>}
      />

      <Modal
        open={modalOpen}
        onOpenChange={(open) => { if (!open) closeModal() }}
        title={editTarget ? "Edit Maintenance Record" : "Log Maintenance"}
        size="lg"
        footer={
          <div className="flex items-center justify-between w-full">
            {editTarget ? (
              <Button type="button" variant="destructive" size="sm"
                loading={deleting === editTarget.id}
                onClick={() => { handleDelete(editTarget.id); closeModal() }}>
                Delete Record
              </Button>
            ) : <span />}
            <div className="flex gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={closeModal}>Cancel</Button>
              <Button type="submit" form="maintenance-form" variant="primary" size="sm" loading={saving}>
                {editTarget ? "Save Changes" : "Log Maintenance"}
              </Button>
            </div>
          </div>
        }
      >
        <form id="maintenance-form" onSubmit={handleSave} className="flex flex-col gap-4">
          <Select label="Vehicle" required value={form.vehicle_id} onChange={(e) => setField("vehicle_id", e.target.value)}>
            <option value="">Select vehicle…</option>
            {vehicles.map(v => <option key={v.id} value={v.id}>{v.vehicle_name}</option>)}
          </Select>
          <div className="grid grid-cols-2 gap-4">
            <Select label="Issue Type" value={form.issue_type} onChange={(e) => setField("issue_type", e.target.value)}>
              {Object.entries(ISSUE_LABELS).map(([k, lbl]) => <option key={k} value={k}>{lbl}</option>)}
            </Select>
            <Select label="Status" value={form.status} onChange={(e) => setField("status", e.target.value)}>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </Select>
            <Input label="Reported Date" type="date" value={form.reported_date} onChange={(e) => setField("reported_date", e.target.value)} />
            <Input label="Completion Date" type="date" value={form.completion_date} onChange={(e) => setField("completion_date", e.target.value)} />
            <Input label="Cost (OMR)" type="number" step="0.001" value={form.cost} onChange={(e) => setField("cost", e.target.value)} placeholder="0.000" />
            <Input label="Parts Replaced" value={form.parts_replaced} onChange={(e) => setField("parts_replaced", e.target.value)} placeholder="Comma-separated" />
          </div>
          <Input label="Oil Change Details" value={form.oil_change_details} onChange={(e) => setField("oil_change_details", e.target.value)} />
          <Textarea label="Notes" value={form.notes} onChange={(e) => setField("notes", e.target.value)} />
        </form>
      </Modal>
    </div>
  )
}
