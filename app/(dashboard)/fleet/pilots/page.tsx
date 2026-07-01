"use client"

import * as React from "react"
import { Plus, Airplane } from "@phosphor-icons/react"
import { PageHeader } from "@/components/ui/page-header"
import { Button } from "@/components/ui/button"
import { StatCard } from "@/components/ui/stat-card"
import { DataTable } from "@/components/ui/data-table"
import { StatusBadge } from "@/components/ui/status-badge"
import { Modal } from "@/components/ui/modal"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { useConfirm } from "@/components/ui/confirm-dialog"
import { formatDate } from "@/lib/utils"
import { apiFetch } from "@/lib/api"
import { toast } from "sonner"
import { Users, CheckCircle } from "@phosphor-icons/react/dist/ssr"
import type { FleetPilot } from "@/lib/types"
import type { Column } from "@/components/ui/data-table"

const EMPTY_FORM = {
  name: "",
  phone: "",
  email: "",
  address: "",
  drone_category: "small" as FleetPilot["drone_category"],
  total_flight_hours: "",
  license_number: "",
  license_expiry: "",
  status: "active" as FleetPilot["status"],
}

type FormState = typeof EMPTY_FORM

export default function PilotsPage() {
  const [pilots, setPilots] = React.useState<FleetPilot[]>([])
  const [loading, setLoading] = React.useState(true)
  const [modalOpen, setModalOpen] = React.useState(false)
  const [editTarget, setEditTarget] = React.useState<FleetPilot | null>(null)
  const [form, setForm] = React.useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = React.useState(false)
  const [deleting, setDeleting] = React.useState<string | null>(null)
  const confirm = useConfirm()

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiFetch<{ pilots: FleetPilot[] }>("/api/fleet/pilots")
      setPilots(res.pilots ?? [])
    } catch { toast.error("Failed to load pilots") }
    finally { setLoading(false) }
  }, [])

  React.useEffect(() => { load() }, [load])

  function openAdd() { setEditTarget(null); setForm(EMPTY_FORM); setModalOpen(true) }
  function openEdit(p: FleetPilot) {
    setEditTarget(p)
    setForm({
      name: p.name ?? "",
      phone: p.phone ?? "",
      email: p.email ?? "",
      address: p.address ?? "",
      drone_category: p.drone_category,
      total_flight_hours: String(p.total_flight_hours ?? ""),
      license_number: p.license_number ?? "",
      license_expiry: p.license_expiry ?? "",
      status: p.status,
    })
    setModalOpen(true)
  }
  function closeModal() { setModalOpen(false); setEditTarget(null) }
  function setField(key: keyof FormState, value: string) { setForm((f) => ({ ...f, [key]: value })) }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { toast.error("Name is required"); return }
    setSaving(true)
    try {
      const payload = { ...form, total_flight_hours: form.total_flight_hours ? Number(form.total_flight_hours) : 0 }
      if (editTarget) {
        await apiFetch(`/api/fleet/pilots/${editTarget.id}`, { method: "PATCH", body: JSON.stringify(payload) })
        toast.success("Pilot updated")
      } else {
        await apiFetch("/api/fleet/pilots", { method: "POST", body: JSON.stringify(payload) })
        toast.success("Pilot added")
      }
      closeModal(); load()
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : "Save failed") }
    finally { setSaving(false) }
  }

  async function handleDelete(id: string) {
    const ok = await confirm({ title: "Delete Pilot", message: "This pilot will be permanently removed from the system.", confirmLabel: "Delete" })
    if (!ok) return
    setDeleting(id)
    try {
      await apiFetch(`/api/fleet/pilots/${id}`, { method: "DELETE" })
      toast.success("Pilot deleted"); load()
    } catch { toast.error("Delete failed") }
    finally { setDeleting(null) }
  }

  const stats = {
    total: pilots.length,
    active: pilots.filter((p) => p.status === "active").length,
    onMission: pilots.filter((p) => p.status === "on_mission").length,
  }

  const columns: Column<FleetPilot>[] = [
    {
      key: "name", header: "Name", sortable: true,
      render: (v) => <span className="font-medium" style={{ color: "var(--text-primary)" }}>{v as string}</span>,
    },
    { key: "phone", header: "Phone" },
    {
      key: "drone_category", header: "Category",
      render: (v) => (
        <span className="text-xs px-2 py-0.5 rounded-full capitalize"
          style={{ background: "var(--surface-muted)", color: "var(--text-secondary)" }}>
          {v as string}
        </span>
      ),
    },
    {
      key: "total_flight_hours", header: "Flight Hours", sortable: true,
      render: (v) => `${(v as number).toLocaleString()} hrs`,
    },
    {
      key: "license_expiry", header: "License Expiry", sortable: true,
      render: (v) => {
        if (!v) return "—"
        const isExpiring = new Date(v as string).getTime() - Date.now() < 30 * 86400000
        return <span style={{ color: isExpiring ? "var(--status-warning)" : "var(--text-secondary)" }}>{formatDate(v as string)}</span>
      },
    },
    { key: "status", header: "Status", render: (v) => <StatusBadge status={v as string} /> },
    {
      key: "id", header: "",
      render: (v, row) => (
        <div className="flex items-center gap-2">
          <button className="text-xs px-2 py-1 rounded"
            style={{ color: "var(--brand-navy)", background: "var(--surface-muted)" }}
            onClick={(e) => { e.stopPropagation(); openEdit(row as FleetPilot) }}>Edit</button>
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
        title="Pilots"
        actions={<Button variant="primary" size="md" onClick={openAdd}><Plus size={16} />Add Pilot</Button>}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Total Pilots" value={stats.total} icon={<Users size={18} />} color="#1B2A5E" iconBg="#EEF1F8" />
        <StatCard title="Active" value={stats.active} icon={<CheckCircle size={18} />} color="#10A854" iconBg="#EDFBF3" />
        <StatCard title="On Mission" value={stats.onMission} icon={<Airplane size={18} />} color="#2563EB" iconBg="#EFF4FF" />
      </div>

      <DataTable
        columns={columns} data={pilots} loading={loading}
        emptyIcon={<Airplane size={28} />} emptyTitle="No pilots registered"
        emptyDescription="Add pilots to manage drone operations."
        emptyAction={<Button variant="primary" size="sm" onClick={openAdd}><Plus size={14} />Add Pilot</Button>}
      />

      <Modal
        open={modalOpen}
        onOpenChange={(open) => { if (!open) closeModal() }}
        title={editTarget ? "Edit Pilot" : "Add Pilot"}
        size="md"
        footer={
          <div className="flex items-center justify-between w-full">
            {editTarget ? (
              <Button type="button" variant="destructive" size="sm"
                loading={deleting === editTarget.id}
                onClick={() => { handleDelete(editTarget.id); closeModal() }}>
                Delete Pilot
              </Button>
            ) : <span />}
            <div className="flex gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={closeModal}>Cancel</Button>
              <Button type="submit" form="pilot-form" variant="primary" size="sm" loading={saving}>
                {editTarget ? "Save Changes" : "Add Pilot"}
              </Button>
            </div>
          </div>
        }
      >
        <form id="pilot-form" onSubmit={handleSave} className="flex flex-col gap-4">
          <Input label="Full Name" required value={form.name} onChange={(e) => setField("name", e.target.value)} placeholder="Pilot's full name" />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Phone" value={form.phone} onChange={(e) => setField("phone", e.target.value)} />
            <Input label="Email" type="email" value={form.email} onChange={(e) => setField("email", e.target.value)} />
          </div>
          <Input label="Address" value={form.address} onChange={(e) => setField("address", e.target.value)} />
          <div className="grid grid-cols-2 gap-4">
            <Select label="Drone Category" value={form.drone_category} onChange={(e) => setField("drone_category", e.target.value)}>
              <option value="small">Small</option>
              <option value="medium">Medium</option>
              <option value="large">Large</option>
            </Select>
            <Input label="Total Flight Hours" type="number" value={form.total_flight_hours} onChange={(e) => setField("total_flight_hours", e.target.value)} placeholder="0" />
            <Input label="License Number" value={form.license_number} onChange={(e) => setField("license_number", e.target.value)} />
            <Input label="License Expiry" type="date" value={form.license_expiry} onChange={(e) => setField("license_expiry", e.target.value)} />
            <Select label="Status" value={form.status} onChange={(e) => setField("status", e.target.value)}>
              <option value="active">Active</option>
              <option value="on_mission">On Mission</option>
              <option value="off_duty">Off Duty</option>
              <option value="inactive">Inactive</option>
            </Select>
          </div>
        </form>
      </Modal>
    </div>
  )
}
