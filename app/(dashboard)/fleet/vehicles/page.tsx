"use client"

import * as React from "react"
import { Plus, Rows, GridFour, WarningCircle } from "@phosphor-icons/react"
import { PageHeader } from "@/components/ui/page-header"
import { Button } from "@/components/ui/button"
import { StatCard } from "@/components/ui/stat-card"
import { VehicleCard } from "@/components/fleet/vehicle-card"
import { DataTable } from "@/components/ui/data-table"
import { StatusBadge } from "@/components/ui/status-badge"
import { EmptyState } from "@/components/ui/empty-state"
import { Modal } from "@/components/ui/modal"
import { Input, Textarea } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { useConfirm } from "@/components/ui/confirm-dialog"
import { formatDate } from "@/lib/utils"
import { apiFetch } from "@/lib/api"
import { toast } from "sonner"
import {
  Car,
  CheckCircle,
  Wrench,
} from "@phosphor-icons/react/dist/ssr"
import type { FleetVehicle } from "@/lib/types"
import type { Column } from "@/components/ui/data-table"

type ViewMode = "grid" | "table"

const EMPTY_FORM = {
  vehicle_name: "",
  model: "",
  category: "ankaa" as FleetVehicle["category"],
  color: "",
  year: "",
  fuel_type: "",
  status: "available" as FleetVehicle["status"],
  mileage: "",
  license_plate_number: "",
  license_plate_alphabets: "",
  registration_issue_date: "",
  registration_expiry_date: "",
  insurance_expiry_date: "",
  operating_card_number: "",
  operating_card_issue_date: "",
  operating_card_expiry_date: "",
  notes: "",
}

type FormState = typeof EMPTY_FORM

export default function VehiclesPage() {
  const [vehicles, setVehicles] = React.useState<FleetVehicle[]>([])
  const [loading, setLoading] = React.useState(true)
  const [categoryFilter, setCategoryFilter] = React.useState<string>("all")
  const [viewMode, setViewMode] = React.useState<ViewMode>("grid")
  const [modalOpen, setModalOpen] = React.useState(false)
  const [editTarget, setEditTarget] = React.useState<FleetVehicle | null>(null)
  const [form, setForm] = React.useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = React.useState(false)
  const [deleting, setDeleting] = React.useState<string | null>(null)
  const confirm = useConfirm()

  const categories = ["all", "ankaa", "gis", "taqa"]

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiFetch<{ vehicles: FleetVehicle[] }>("/api/fleet/vehicles")
      setVehicles(res.vehicles ?? [])
    } catch {
      toast.error("Failed to load vehicles")
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => { load() }, [load])

  function openAdd() {
    setEditTarget(null)
    setForm(EMPTY_FORM)
    setModalOpen(true)
  }

  function openEdit(v: FleetVehicle) {
    setEditTarget(v)
    setForm({
      vehicle_name: v.vehicle_name ?? "",
      model: v.model ?? "",
      category: v.category,
      color: v.color ?? "",
      year: v.year != null ? String(v.year) : "",
      fuel_type: v.fuel_type ?? "",
      status: v.status,
      mileage: String(v.mileage ?? ""),
      license_plate_number: v.license_plate_number ?? "",
      license_plate_alphabets: v.license_plate_alphabets ?? "",
      registration_issue_date: v.registration_issue_date ?? "",
      registration_expiry_date: v.registration_expiry_date ?? "",
      insurance_expiry_date: v.insurance_expiry_date ?? "",
      operating_card_number: v.operating_card_number ?? "",
      operating_card_issue_date: v.operating_card_issue_date ?? "",
      operating_card_expiry_date: v.operating_card_expiry_date ?? "",
      notes: v.notes ?? "",
    })
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setEditTarget(null)
  }

  function setField(key: keyof FormState, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!form.vehicle_name.trim()) { toast.error("Vehicle name is required"); return }
    setSaving(true)
    try {
      const payload = {
        ...form,
        year: form.year ? Number(form.year) : null,
        mileage: form.mileage ? Number(form.mileage) : 0,
      }
      if (editTarget) {
        await apiFetch(`/api/fleet/vehicles/${editTarget.id}`, { method: "PATCH", body: JSON.stringify(payload) })
        toast.success("Vehicle updated")
      } else {
        await apiFetch("/api/fleet/vehicles", { method: "POST", body: JSON.stringify(payload) })
        toast.success("Vehicle added")
      }
      closeModal()
      load()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Save failed")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    const ok = await confirm({ title: "Delete Vehicle", message: "This vehicle will be permanently removed. This action cannot be undone.", confirmLabel: "Delete" })
    if (!ok) return
    setDeleting(id)
    try {
      await apiFetch(`/api/fleet/vehicles/${id}`, { method: "DELETE" })
      toast.success("Vehicle deleted")
      load()
    } catch {
      toast.error("Delete failed")
    } finally {
      setDeleting(null)
    }
  }

  const filteredVehicles =
    categoryFilter === "all"
      ? vehicles
      : vehicles.filter((v) => v.category === categoryFilter)

  const stats = {
    total: vehicles.length,
    available: vehicles.filter((v) => v.status === "available").length,
    inUse: vehicles.filter((v) => v.status === "in_use").length,
    maintenance: vehicles.filter((v) => v.status === "maintenance").length,
  }

  const expiringVehicles = vehicles.filter((v) => {
    if (!v.registration_expiry_date) return false
    const diff = new Date(v.registration_expiry_date).getTime() - Date.now()
    return diff > 0 && diff < 30 * 86400000
  })

  const tableColumns: Column<FleetVehicle>[] = [
    {
      key: "vehicle_name",
      header: "Vehicle Name",
      sortable: true,
      render: (v) => (
        <span className="font-medium" style={{ color: "var(--text-primary)" }}>
          {v as string}
        </span>
      ),
    },
    { key: "model", header: "Model" },
    {
      key: "category",
      header: "Category",
      render: (v) => (
        <span
          className="text-xs px-2 py-0.5 rounded-full uppercase"
          style={{ background: "var(--surface-muted)", color: "var(--text-secondary)" }}
        >
          {v as string}
        </span>
      ),
    },
    {
      key: "license_plate_number",
      header: "Plate",
      render: (v, row) => (
        <span className="font-mono text-xs font-bold">
          {(row as FleetVehicle).license_plate_alphabets} {v as string}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (v) => <StatusBadge status={v as string} />,
    },
    {
      key: "mileage",
      header: "Mileage",
      sortable: true,
      render: (v) => `${(v as number).toLocaleString()} km`,
    },
    {
      key: "registration_expiry_date",
      header: "Reg. Expiry",
      render: (v) => {
        if (!v) return "—"
        const isExpiring = new Date(v as string).getTime() - Date.now() < 30 * 86400000
        return (
          <span style={{ color: isExpiring ? "var(--status-warning)" : "var(--text-secondary)" }}>
            {formatDate(v as string)}
          </span>
        )
      },
    },
    {
      key: "id",
      header: "",
      render: (v, row) => (
        <div className="flex items-center gap-2">
          <button
            className="text-xs px-2 py-1 rounded"
            style={{ color: "var(--brand-navy)", background: "var(--surface-muted)" }}
            onClick={(e) => { e.stopPropagation(); openEdit(row as FleetVehicle) }}
          >
            Edit
          </button>
          <button
            className="text-xs px-2 py-1 rounded"
            style={{ color: "var(--status-error, #D63C3C)", background: "var(--surface-muted)" }}
            disabled={deleting === (v as string)}
            onClick={(e) => { e.stopPropagation(); handleDelete(v as string) }}
          >
            {deleting === (v as string) ? "…" : "Delete"}
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Vehicles"
        subtitle="Manage fleet vehicles across all company categories"
        actions={
          <div className="flex items-center gap-2">
            <div
              className="flex items-center rounded-[var(--radius-md)] border p-0.5"
              style={{ borderColor: "var(--surface-border)" }}
            >
              <button
                onClick={() => setViewMode("grid")}
                className="flex items-center justify-center w-8 h-7 rounded-[var(--radius-sm)] transition-colors"
                style={{
                  background: viewMode === "grid" ? "var(--brand-navy)" : "transparent",
                  color: viewMode === "grid" ? "white" : "var(--text-muted)",
                }}
                title="Grid view"
              >
                <GridFour size={15} />
              </button>
              <button
                onClick={() => setViewMode("table")}
                className="flex items-center justify-center w-8 h-7 rounded-[var(--radius-sm)] transition-colors"
                style={{
                  background: viewMode === "table" ? "var(--brand-navy)" : "transparent",
                  color: viewMode === "table" ? "white" : "var(--text-muted)",
                }}
                title="Table view"
              >
                <Rows size={15} />
              </button>
            </div>
            <Button variant="primary" size="md" onClick={openAdd}>
              <Plus size={16} />
              Add Vehicle
            </Button>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Vehicles" value={stats.total} icon={<Car size={18} />} color="#1B2A5E" iconBg="#EEF1F8" />
        <StatCard title="Available" value={stats.available} icon={<CheckCircle size={18} />} color="#10A854" iconBg="#EDFBF3" />
        <StatCard title="In Use" value={stats.inUse} icon={<Car size={18} />} color="#2563EB" iconBg="#EFF4FF" />
        <StatCard title="Maintenance" value={stats.maintenance} icon={<Wrench size={18} />} color="#E89B1A" iconBg="#FFF8E6" />
      </div>

      {/* Expiry Alerts */}
      {expiringVehicles.length > 0 && (
        <div
          className="rounded-[var(--radius-lg)] border p-4 flex items-start gap-3"
          style={{ background: "var(--status-warning-bg)", borderColor: "var(--status-warning)" }}
        >
          <WarningCircle size={18} style={{ color: "var(--status-warning)", flexShrink: 0, marginTop: 1 }} />
          <div>
            <p className="text-sm font-medium" style={{ color: "var(--status-warning)" }}>
              {expiringVehicles.length} vehicle{expiringVehicles.length > 1 ? "s" : ""} with registration expiring soon
            </p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
              {expiringVehicles.map((v) => v.vehicle_name).join(", ")}
            </p>
          </div>
        </div>
      )}

      {/* Category tabs */}
      <div className="flex border-b" style={{ borderColor: "var(--surface-border)" }}>
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setCategoryFilter(c)}
            className="px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors"
            style={{
              borderColor: categoryFilter === c ? "var(--brand-navy)" : "transparent",
              color: categoryFilter === c ? "var(--brand-navy)" : "var(--text-muted)",
            }}
          >
            {c === "all" ? "All" : c.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Content */}
      {viewMode === "grid" ? (
        filteredVehicles.length === 0 ? (
          <EmptyState
            icon={<Car size={32} />}
            title="No vehicles found"
            description="Add vehicles to start managing your fleet."
            action={
              <Button variant="primary" size="sm" onClick={openAdd}>
                <Plus size={14} />
                Add Vehicle
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredVehicles.map((v) => (
              <div key={v.id} onClick={() => openEdit(v)} className="cursor-pointer">
                <VehicleCard vehicle={v} />
              </div>
            ))}
          </div>
        )
      ) : (
        <DataTable
          columns={tableColumns}
          data={filteredVehicles}
          loading={loading}
          emptyIcon={<Car size={28} />}
          emptyTitle="No vehicles found"
          emptyDescription="Add vehicles to start managing your fleet."
        />
      )}

      {/* Add/Edit Modal */}
      <Modal
        open={modalOpen}
        onOpenChange={(open) => { if (!open) closeModal() }}
        title={editTarget ? "Edit Vehicle" : "Add Vehicle"}
        size="xl"
        footer={
          <div className="flex items-center justify-between w-full">
            {editTarget ? (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                loading={deleting === editTarget.id}
                onClick={() => { handleDelete(editTarget.id); closeModal() }}
              >
                Delete Vehicle
              </Button>
            ) : <span />}
            <div className="flex gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={closeModal}>Cancel</Button>
              <Button type="submit" form="vehicle-form" variant="primary" size="sm" loading={saving}>
                {editTarget ? "Save Changes" : "Add Vehicle"}
              </Button>
            </div>
          </div>
        }
      >
        <form id="vehicle-form" onSubmit={handleSave} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Vehicle Name" required value={form.vehicle_name} onChange={(e) => setField("vehicle_name", e.target.value)} placeholder="e.g. Toyota Land Cruiser" />
            <Input label="Model" value={form.model} onChange={(e) => setField("model", e.target.value)} placeholder="e.g. 2021 GXR" />
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
            <Input label="Plate Alphabets" value={form.license_plate_alphabets} onChange={(e) => setField("license_plate_alphabets", e.target.value)} placeholder="e.g. م ع" />
            <Input label="Plate Number" value={form.license_plate_number} onChange={(e) => setField("license_plate_number", e.target.value)} placeholder="e.g. 12345" />
            <Input label="Color" value={form.color} onChange={(e) => setField("color", e.target.value)} placeholder="e.g. White" />
            <Input label="Year" type="number" value={form.year} onChange={(e) => setField("year", e.target.value)} placeholder="e.g. 2022" />
            <Select label="Fuel Type" value={form.fuel_type} onChange={(e) => setField("fuel_type", e.target.value)}>
              <option value="">Select…</option>
              <option value="petrol">Petrol</option>
              <option value="diesel">Diesel</option>
              <option value="electric">Electric</option>
              <option value="hybrid">Hybrid</option>
            </Select>
            <Input label="Mileage (km)" type="number" value={form.mileage} onChange={(e) => setField("mileage", e.target.value)} placeholder="0" />
            <Input label="Reg. Issue Date" type="date" value={form.registration_issue_date} onChange={(e) => setField("registration_issue_date", e.target.value)} />
            <Input label="Reg. Expiry Date" type="date" value={form.registration_expiry_date} onChange={(e) => setField("registration_expiry_date", e.target.value)} />
            <Input label="Insurance Expiry" type="date" value={form.insurance_expiry_date} onChange={(e) => setField("insurance_expiry_date", e.target.value)} />
            <Input label="Operating Card No." value={form.operating_card_number} onChange={(e) => setField("operating_card_number", e.target.value)} />
            <Input label="Op. Card Issue Date" type="date" value={form.operating_card_issue_date} onChange={(e) => setField("operating_card_issue_date", e.target.value)} />
            <Input label="Op. Card Expiry Date" type="date" value={form.operating_card_expiry_date} onChange={(e) => setField("operating_card_expiry_date", e.target.value)} />
          </div>
          <Textarea label="Notes" value={form.notes} onChange={(e) => setField("notes", e.target.value)} placeholder="Any additional notes…" />
        </form>
      </Modal>
    </div>
  )
}
