"use client"

import * as React from "react"
import { Plus, Airplane } from "@phosphor-icons/react"
import { PageHeader } from "@/components/ui/page-header"
import { Button } from "@/components/ui/button"
import { StatCard } from "@/components/ui/stat-card"
import { DataTable } from "@/components/ui/data-table"
import { StatusBadge } from "@/components/ui/status-badge"
import { Modal } from "@/components/ui/modal"
import { Input, Textarea } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { useConfirm } from "@/components/ui/confirm-dialog"
import { apiFetch } from "@/lib/api"
import { toast } from "sonner"
import { CheckCircle, Wrench } from "@phosphor-icons/react/dist/ssr"
import type { FleetDrone } from "@/lib/types"
import type { Column } from "@/components/ui/data-table"

const EMPTY_FORM = {
  drone_name: "",
  model: "",
  registration_number: "",
  category: "ankaa" as FleetDrone["category"],
  status: "available" as FleetDrone["status"],
  flight_hours: "",
  registration_date: "",
  last_maintenance: "",
  next_maintenance: "",
  notes: "",
}

type FormState = typeof EMPTY_FORM

export default function DronesPage() {
  const [drones, setDrones] = React.useState<FleetDrone[]>([])
  const [loading, setLoading] = React.useState(true)
  const [modalOpen, setModalOpen] = React.useState(false)
  const [editTarget, setEditTarget] = React.useState<FleetDrone | null>(null)
  const [form, setForm] = React.useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = React.useState(false)
  const [deleting, setDeleting] = React.useState<string | null>(null)
  const confirm = useConfirm()

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiFetch<{ drones: FleetDrone[] }>("/api/fleet/drones")
      setDrones(res.drones ?? [])
    } catch { toast.error("Failed to load drones") }
    finally { setLoading(false) }
  }, [])

  React.useEffect(() => { load() }, [load])

  function openAdd() { setEditTarget(null); setForm(EMPTY_FORM); setModalOpen(true) }
  function openEdit(d: FleetDrone) {
    setEditTarget(d)
    setForm({
      drone_name: d.drone_name ?? "",
      model: d.model ?? "",
      registration_number: d.registration_number ?? "",
      category: d.category,
      status: d.status,
      flight_hours: String(d.flight_hours ?? ""),
      registration_date: d.registration_date ?? "",
      last_maintenance: d.last_maintenance ?? "",
      next_maintenance: d.next_maintenance ?? "",
      notes: d.notes ?? "",
    })
    setModalOpen(true)
  }
  function closeModal() { setModalOpen(false); setEditTarget(null) }
  function setField(key: keyof FormState, value: string) { setForm((f) => ({ ...f, [key]: value })) }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!form.drone_name.trim()) { toast.error("Drone name is required"); return }
    setSaving(true)
    try {
      const payload = { ...form, flight_hours: form.flight_hours ? Number(form.flight_hours) : 0 }
      if (editTarget) {
        await apiFetch(`/api/fleet/drones/${editTarget.id}`, { method: "PATCH", body: JSON.stringify(payload) })
        toast.success("Drone updated")
      } else {
        await apiFetch("/api/fleet/drones", { method: "POST", body: JSON.stringify(payload) })
        toast.success("Drone added")
      }
      closeModal(); load()
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : "Save failed") }
    finally { setSaving(false) }
  }

  async function handleDelete(id: string) {
    const ok = await confirm({ title: "Delete Drone", message: "This drone will be permanently removed. Any associated flight logs will be unlinked.", confirmLabel: "Delete" })
    if (!ok) return
    setDeleting(id)
    try {
      await apiFetch(`/api/fleet/drones/${id}`, { method: "DELETE" })
      toast.success("Drone deleted"); load()
    } catch { toast.error("Delete failed") }
    finally { setDeleting(null) }
  }

  const stats = {
    total: drones.length,
    available: drones.filter((d) => d.status === "available").length,
    inUse: drones.filter((d) => d.status === "in_use").length,
  }

  const columns: Column<FleetDrone>[] = [
    {
      key: "drone_name", header: "Name", sortable: true,
      render: (v) => <span className="font-medium" style={{ color: "var(--text-primary)" }}>{v as string}</span>,
    },
    { key: "model", header: "Model" },
    {
      key: "registration_number", header: "Registration",
      render: (v) => <span className="font-mono text-xs" style={{ color: "var(--text-muted)" }}>{v as string}</span>,
    },
    { key: "status", header: "Status", render: (v) => <StatusBadge status={v as string} /> },
    {
      key: "flight_hours", header: "Flight Hours", sortable: true,
      render: (v) => `${(v as number).toLocaleString()} hrs`,
    },
    {
      key: "id", header: "",
      render: (v, row) => (
        <div className="flex items-center gap-2">
          <button className="text-xs px-2 py-1 rounded"
            style={{ color: "var(--brand-navy)", background: "var(--surface-muted)" }}
            onClick={(e) => { e.stopPropagation(); openEdit(row as FleetDrone) }}>Edit</button>
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
        title="Drones"
        actions={<Button variant="primary" size="md" onClick={openAdd}><Plus size={16} />Add Drone</Button>}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Total Drones" value={stats.total} icon={<Airplane size={18} />} color="#1B2A5E" iconBg="#EEF1F8" />
        <StatCard title="Available" value={stats.available} icon={<CheckCircle size={18} />} color="#10A854" iconBg="#EDFBF3" />
        <StatCard title="In Use" value={stats.inUse} icon={<Airplane size={18} />} color="#2563EB" iconBg="#EFF4FF" />
        <StatCard title="Maintenance" value={drones.filter(d => d.status === "maintenance").length} icon={<Wrench size={18} />} color="#E89B1A" iconBg="#FFF8E6" />
      </div>

      <DataTable
        columns={columns} data={drones} loading={loading}
        emptyIcon={<Airplane size={28} />} emptyTitle="No drones registered"
        emptyDescription="Add drones to manage your aerial fleet."
        emptyAction={<Button variant="primary" size="sm" onClick={openAdd}><Plus size={14} />Add Drone</Button>}
      />

      <Modal
        open={modalOpen}
        onOpenChange={(open) => { if (!open) closeModal() }}
        title={editTarget ? "Edit Drone" : "Add Drone"}
        size="lg"
        footer={
          <div className="flex items-center justify-between w-full">
            {editTarget ? (
              <Button type="button" variant="destructive" size="sm"
                loading={deleting === editTarget.id}
                onClick={() => { handleDelete(editTarget.id); closeModal() }}>
                Delete Drone
              </Button>
            ) : <span />}
            <div className="flex gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={closeModal}>Cancel</Button>
              <Button type="submit" form="drone-form" variant="primary" size="sm" loading={saving}>
                {editTarget ? "Save Changes" : "Add Drone"}
              </Button>
            </div>
          </div>
        }
      >
        <form id="drone-form" onSubmit={handleSave} className="flex flex-col gap-4">
          <Input label="Drone Name" required value={form.drone_name} onChange={(e) => setField("drone_name", e.target.value)} placeholder="e.g. DJI Matrice 300" />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Model" value={form.model} onChange={(e) => setField("model", e.target.value)} />
            <Input label="Registration Number" value={form.registration_number} onChange={(e) => setField("registration_number", e.target.value)} />
            <Select label="Category" value={form.category} onChange={(e) => setField("category", e.target.value)}>
              <option value="ankaa">Ankaa</option>
              <option value="gis">GIS</option>
              <option value="taqa">Taqa</option>
            </Select>
            <Select label="Status" value={form.status} onChange={(e) => setField("status", e.target.value)}>
              <option value="available">Available</option>
              <option value="in_use">In Use</option>
              <option value="maintenance">Maintenance</option>
              <option value="retired">Retired</option>
            </Select>
            <Input label="Flight Hours" type="number" value={form.flight_hours} onChange={(e) => setField("flight_hours", e.target.value)} placeholder="0" />
            <Input label="Registration Date" type="date" value={form.registration_date} onChange={(e) => setField("registration_date", e.target.value)} />
            <Input label="Last Maintenance" type="date" value={form.last_maintenance} onChange={(e) => setField("last_maintenance", e.target.value)} />
            <Input label="Next Maintenance" type="date" value={form.next_maintenance} onChange={(e) => setField("next_maintenance", e.target.value)} />
          </div>
          <Textarea label="Notes" value={form.notes} onChange={(e) => setField("notes", e.target.value)} />
        </form>
      </Modal>
    </div>
  )
}
