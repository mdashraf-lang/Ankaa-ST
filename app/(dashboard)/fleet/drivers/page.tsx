"use client"

import * as React from "react"
import { Plus, User } from "@phosphor-icons/react"
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
import { Users, Car, CheckCircle } from "@phosphor-icons/react/dist/ssr"
import type { FleetDriver } from "@/lib/types"
import type { Column } from "@/components/ui/data-table"

const EMPTY_FORM = {
  name: "",
  phone: "",
  email: "",
  address: "",
  license_number: "",
  license_expiry: "",
  category: "",
  status: "active" as FleetDriver["status"],
  joined_date: "",
}

type FormState = typeof EMPTY_FORM

export default function DriversPage() {
  const [drivers, setDrivers] = React.useState<FleetDriver[]>([])
  const [loading, setLoading] = React.useState(true)
  const [statusFilter, setStatusFilter] = React.useState("all")
  const [modalOpen, setModalOpen] = React.useState(false)
  const [editTarget, setEditTarget] = React.useState<FleetDriver | null>(null)
  const [form, setForm] = React.useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = React.useState(false)
  const [deleting, setDeleting] = React.useState<string | null>(null)
  const confirm = useConfirm()

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiFetch<{ drivers: FleetDriver[] }>("/api/fleet/drivers")
      setDrivers(res.drivers ?? [])
    } catch {
      toast.error("Failed to load drivers")
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => { load() }, [load])

  function openAdd() { setEditTarget(null); setForm(EMPTY_FORM); setModalOpen(true) }
  function openEdit(d: FleetDriver) {
    setEditTarget(d)
    setForm({
      name: d.name ?? "",
      phone: d.phone ?? "",
      email: d.email ?? "",
      address: d.address ?? "",
      license_number: d.license_number ?? "",
      license_expiry: d.license_expiry ?? "",
      category: d.category ?? "",
      status: d.status,
      joined_date: d.joined_date ?? "",
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
      if (editTarget) {
        await apiFetch(`/api/fleet/drivers/${editTarget.id}`, { method: "PATCH", body: JSON.stringify(form) })
        toast.success("Driver updated")
      } else {
        await apiFetch("/api/fleet/drivers", { method: "POST", body: JSON.stringify(form) })
        toast.success("Driver added")
      }
      closeModal(); load()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Save failed")
    } finally { setSaving(false) }
  }

  async function handleDelete(id: string) {
    const ok = await confirm({ title: "Delete Driver", message: "This driver will be permanently removed from the system.", confirmLabel: "Delete" })
    if (!ok) return
    setDeleting(id)
    try {
      await apiFetch(`/api/fleet/drivers/${id}`, { method: "DELETE" })
      toast.success("Driver deleted"); load()
    } catch { toast.error("Delete failed") }
    finally { setDeleting(null) }
  }

  const filteredDrivers = statusFilter === "all" ? drivers : drivers.filter((d) => d.status === statusFilter)
  const stats = {
    total: drivers.length,
    active: drivers.filter((d) => d.status === "active").length,
    onTrip: drivers.filter((d) => d.status === "on_trip").length,
  }
  const filterTabs = ["all", "active", "on_trip", "off_duty", "inactive"]

  const columns: Column<FleetDriver>[] = [
    {
      key: "name", header: "Name", sortable: true,
      render: (v) => <span className="font-medium" style={{ color: "var(--text-primary)" }}>{v as string}</span>,
    },
    { key: "phone", header: "Phone" },
    {
      key: "license_number", header: "License No.",
      render: (v) => <span className="font-mono text-xs" style={{ color: "var(--text-secondary)" }}>{(v as string | null) ?? "—"}</span>,
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
            onClick={(e) => { e.stopPropagation(); openEdit(row as FleetDriver) }}>Edit</button>
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
        title="Drivers"
        actions={<Button variant="primary" size="md" onClick={openAdd}><Plus size={16} />Add Driver</Button>}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Total Drivers" value={stats.total} icon={<Users size={18} />} color="#1B2A5E" iconBg="#EEF1F8" />
        <StatCard title="Active" value={stats.active} icon={<CheckCircle size={18} />} color="#10A854" iconBg="#EDFBF3" />
        <StatCard title="On Trip" value={stats.onTrip} icon={<Car size={18} />} color="#2563EB" iconBg="#EFF4FF" />
      </div>

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
        columns={columns} data={filteredDrivers} loading={loading}
        emptyIcon={<User size={28} />} emptyTitle="No drivers found"
        emptyDescription="Add drivers to manage fleet assignments."
        emptyAction={<Button variant="primary" size="sm" onClick={openAdd}><Plus size={14} />Add Driver</Button>}
      />

      <Modal
        open={modalOpen}
        onOpenChange={(open) => { if (!open) closeModal() }}
        title={editTarget ? "Edit Driver" : "Add Driver"}
        size="md"
        footer={
          <div className="flex items-center justify-between w-full">
            {editTarget ? (
              <Button type="button" variant="destructive" size="sm"
                loading={deleting === editTarget.id}
                onClick={() => { handleDelete(editTarget.id); closeModal() }}>
                Delete Driver
              </Button>
            ) : <span />}
            <div className="flex gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={closeModal}>Cancel</Button>
              <Button type="submit" form="driver-form" variant="primary" size="sm" loading={saving}>
                {editTarget ? "Save Changes" : "Add Driver"}
              </Button>
            </div>
          </div>
        }
      >
        <form id="driver-form" onSubmit={handleSave} className="flex flex-col gap-4">
          <Input label="Full Name" required value={form.name} onChange={(e) => setField("name", e.target.value)} placeholder="Driver's full name" />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Phone" value={form.phone} onChange={(e) => setField("phone", e.target.value)} placeholder="+968 XXXX XXXX" />
            <Input label="Email" type="email" value={form.email} onChange={(e) => setField("email", e.target.value)} />
          </div>
          <Input label="Address" value={form.address} onChange={(e) => setField("address", e.target.value)} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="License Number" value={form.license_number} onChange={(e) => setField("license_number", e.target.value)} />
            <Input label="License Expiry" type="date" value={form.license_expiry} onChange={(e) => setField("license_expiry", e.target.value)} />
            <Input label="Category" value={form.category} onChange={(e) => setField("category", e.target.value)} placeholder="e.g. light, heavy" />
            <Select label="Status" value={form.status} onChange={(e) => setField("status", e.target.value)}>
              <option value="active">Active</option>
              <option value="on_trip">On Trip</option>
              <option value="off_duty">Off Duty</option>
              <option value="inactive">Inactive</option>
            </Select>
            <Input label="Joined Date" type="date" value={form.joined_date} onChange={(e) => setField("joined_date", e.target.value)} />
          </div>
        </form>
      </Modal>
    </div>
  )
}
