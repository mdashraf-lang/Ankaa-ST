"use client"

import * as React from "react"
import { Plus, Car, CheckCircle, XCircle, ClockCounterClockwise } from "@phosphor-icons/react"
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
import type { FleetVehicleAssignment, FleetVehicle, FleetDriver } from "@/lib/types"
import type { Column } from "@/components/ui/data-table"

type AssignmentRow = FleetVehicleAssignment & {
  vehicle_name?: string
  license_plate_number?: string
  license_plate_alphabets?: string
  driver_name?: string
  driver_phone?: string
}

const EMPTY_FORM = {
  vehicle_id: "",
  driver_id: "",
  cc_recipient_id: "",
  start_condition: "good" as string,
  start_condition_note: "",
  start_mileage: "",
  assignment_date: "",
  assignment_time: "",
}

type FormState = typeof EMPTY_FORM

const EMPTY_RETURN_FORM = {
  end_condition: "good",
  end_condition_note: "",
  return_notes: "",
  end_mileage: "",
  return_date: "",
  return_time: "",
}

type ReturnFormState = typeof EMPTY_RETURN_FORM

export default function VehicleAssignmentsPage() {
  const [assignments, setAssignments] = React.useState<AssignmentRow[]>([])
  const [vehicles, setVehicles] = React.useState<FleetVehicle[]>([])
  const [drivers, setDrivers] = React.useState<FleetDriver[]>([])
  const [loading, setLoading] = React.useState(true)
  const [statusFilter, setStatusFilter] = React.useState("all")
  const [modalOpen, setModalOpen] = React.useState(false)
  const [returnModal, setReturnModal] = React.useState<AssignmentRow | null>(null)
  const [form, setForm] = React.useState<FormState>(EMPTY_FORM)
  const [returnForm, setReturnForm] = React.useState<ReturnFormState>(EMPTY_RETURN_FORM)
  const [saving, setSaving] = React.useState(false)
  const [deleting, setDeleting] = React.useState<string | null>(null)
  const confirm = useConfirm()

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const [aRes, vRes, dRes] = await Promise.allSettled([
        apiFetch<{ assignments: AssignmentRow[] }>("/api/fleet/assignments"),
        apiFetch<{ vehicles: FleetVehicle[] }>("/api/fleet/vehicles"),
        apiFetch<{ drivers: FleetDriver[] }>("/api/fleet/drivers"),
      ])
      if (aRes.status === "fulfilled") setAssignments(aRes.value.assignments ?? [])
      if (vRes.status === "fulfilled") setVehicles(vRes.value.vehicles ?? [])
      if (dRes.status === "fulfilled") setDrivers(dRes.value.drivers ?? [])
    } catch { toast.error("Failed to load assignments") }
    finally { setLoading(false) }
  }, [])

  React.useEffect(() => { load() }, [load])

  function openAdd() { setForm({ ...EMPTY_FORM, assignment_date: new Date().toISOString().split("T")[0] }); setModalOpen(true) }
  function closeModal() { setModalOpen(false) }
  function setField(key: keyof FormState, value: string) { setForm((f) => ({ ...f, [key]: value })) }
  function setReturnField(key: keyof ReturnFormState, value: string) { setReturnForm((f) => ({ ...f, [key]: value })) }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!form.vehicle_id || !form.driver_id) { toast.error("Vehicle and driver are required"); return }
    setSaving(true)
    try {
      const payload = {
        ...form,
        start_mileage: form.start_mileage ? Number(form.start_mileage) : null,
        cc_recipient_id: form.cc_recipient_id || null,
      }
      await apiFetch("/api/fleet/assignments", { method: "POST", body: JSON.stringify(payload) })
      toast.success("Assignment created")
      closeModal(); load()
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : "Save failed") }
    finally { setSaving(false) }
  }

  async function handleReturn(e: React.FormEvent) {
    e.preventDefault()
    if (!returnModal) return
    setSaving(true)
    try {
      const payload = {
        ...returnForm,
        is_active: 0,
        end_mileage: returnForm.end_mileage ? Number(returnForm.end_mileage) : null,
      }
      await apiFetch(`/api/fleet/assignments/${returnModal.id}`, { method: "PATCH", body: JSON.stringify(payload) })
      toast.success("Vehicle returned")
      setReturnModal(null); load()
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : "Return failed") }
    finally { setSaving(false) }
  }

  async function handleDelete(id: string) {
    const ok = await confirm({ title: "Delete Assignment", message: "This assignment record will be permanently deleted.", confirmLabel: "Delete" })
    if (!ok) return
    setDeleting(id)
    try {
      await apiFetch(`/api/fleet/assignments/${id}`, { method: "DELETE" })
      toast.success("Assignment deleted"); load()
    } catch { toast.error("Delete failed") }
    finally { setDeleting(null) }
  }

  const filtered =
    statusFilter === "all" ? assignments
      : statusFilter === "active" ? assignments.filter((a) => a.is_active === 1)
      : assignments.filter((a) => a.is_active === 0)

  const stats = {
    total: assignments.length,
    active: assignments.filter((a) => a.is_active === 1).length,
    returned: assignments.filter((a) => a.is_active === 0).length,
  }
  const filterTabs = ["all", "active", "returned"]

  const columns: Column<AssignmentRow>[] = [
    {
      key: "vehicle_name", header: "Vehicle",
      render: (v, row) => <span className="font-medium" style={{ color: "var(--text-primary)" }}>{(v as string) || (row as AssignmentRow).vehicle_id}</span>,
    },
    {
      key: "driver_name", header: "Driver",
      render: (v, row) => <span style={{ color: "var(--text-secondary)" }}>{(v as string) || (row as AssignmentRow).driver_id}</span>,
    },
    { key: "assignment_date", header: "Assigned On", sortable: true, render: (v) => formatDate(v as string) ?? "—" },
    { key: "return_date", header: "Returned On", render: (v) => (v ? formatDate(v as string) : "—") },
    { key: "start_condition", header: "Start Condition", render: (v) => <StatusBadge status={v as string} /> },
    { key: "start_mileage", header: "Start km", render: (v) => (v != null ? `${(v as number).toLocaleString()} km` : "—") },
    { key: "end_mileage", header: "End km", render: (v) => (v != null ? `${(v as number).toLocaleString()} km` : "—") },
    { key: "is_active", header: "Status", render: (v) => <StatusBadge status={(v as number) === 1 ? "active" : "returned"} /> },
    {
      key: "id", header: "",
      render: (v, row) => {
        const r = row as AssignmentRow
        return (
          <div className="flex items-center gap-2">
            {r.is_active === 1 && (
              <button className="text-xs px-2 py-1 rounded"
                style={{ color: "#10A854", background: "var(--surface-muted)" }}
                onClick={(e) => { e.stopPropagation(); setReturnForm({ ...EMPTY_RETURN_FORM, return_date: new Date().toISOString().split("T")[0] }); setReturnModal(r) }}>
                Return
              </button>
            )}
            <button className="text-xs px-2 py-1 rounded"
              style={{ color: "var(--status-error)", background: "var(--surface-muted)" }}
              disabled={deleting === (v as string)}
              onClick={(e) => { e.stopPropagation(); handleDelete(v as string) }}>
              {deleting === (v as string) ? "…" : "Delete"}
            </button>
          </div>
        )
      },
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Vehicle Assignments"
        subtitle="Track which driver has which vehicle and assignment history"
        actions={<Button variant="primary" size="md" onClick={openAdd}><Plus size={16} />New Assignment</Button>}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Total Assignments" value={stats.total} icon={<Car size={18} />} color="#1B2A5E" iconBg="#EEF1F8" />
        <StatCard title="Active" value={stats.active} icon={<CheckCircle size={18} />} color="#10A854" iconBg="#EDFBF3" />
        <StatCard title="Returned" value={stats.returned} icon={<XCircle size={18} />} color="#6B7280" iconBg="#F3F4F6" />
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
        emptyIcon={<ClockCounterClockwise size={28} />} emptyTitle="No assignments found"
        emptyDescription="Assign vehicles to drivers to start tracking."
        emptyAction={<Button variant="primary" size="sm" onClick={openAdd}><Plus size={14} />New Assignment</Button>}
      />

      {/* New Assignment Modal */}
      <Modal
        open={modalOpen}
        onOpenChange={(open) => { if (!open) closeModal() }}
        title="New Assignment"
        size="md"
        footer={
          <>
            <Button type="button" variant="ghost" size="sm" onClick={closeModal}>Cancel</Button>
            <Button type="submit" form="assignment-form" variant="primary" size="sm" loading={saving}>
              Create Assignment
            </Button>
          </>
        }
      >
        <form id="assignment-form" onSubmit={handleSave} className="flex flex-col gap-4">
          <Select label="Vehicle" required value={form.vehicle_id} onChange={(e) => setField("vehicle_id", e.target.value)}>
            <option value="">Select vehicle…</option>
            {vehicles.filter(v => v.status === "available").map(v => (
              <option key={v.id} value={v.id}>{v.vehicle_name} — {v.license_plate_alphabets} {v.license_plate_number}</option>
            ))}
          </Select>
          <Select label="Driver" required value={form.driver_id} onChange={(e) => setField("driver_id", e.target.value)}>
            <option value="">Select driver…</option>
            {drivers.filter(d => d.status === "active").map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </Select>
          <div className="grid grid-cols-2 gap-4">
            <Select label="Start Condition" value={form.start_condition} onChange={(e) => setField("start_condition", e.target.value)}>
              <option value="excellent">Excellent</option>
              <option value="good">Good</option>
              <option value="fair">Fair</option>
              <option value="poor">Poor</option>
              <option value="other">Other</option>
            </Select>
            <Input label="Start Mileage (km)" type="number" value={form.start_mileage} onChange={(e) => setField("start_mileage", e.target.value)} placeholder="0" />
            <Input label="Assignment Date" type="date" value={form.assignment_date} onChange={(e) => setField("assignment_date", e.target.value)} />
            <Input label="Assignment Time" type="time" value={form.assignment_time} onChange={(e) => setField("assignment_time", e.target.value)} />
          </div>
          <Input label="Start Condition Note" value={form.start_condition_note} onChange={(e) => setField("start_condition_note", e.target.value)} placeholder="Optional note" />
        </form>
      </Modal>

      {/* Return Modal */}
      <Modal
        open={!!returnModal}
        onOpenChange={(open) => { if (!open) setReturnModal(null) }}
        title={`Return Vehicle — ${returnModal?.vehicle_name ?? ""}`}
        size="md"
        footer={
          <>
            <Button type="button" variant="ghost" size="sm" onClick={() => setReturnModal(null)}>Cancel</Button>
            <Button type="submit" form="return-form" variant="primary" size="sm" loading={saving}>
              Confirm Return
            </Button>
          </>
        }
      >
        <form id="return-form" onSubmit={handleReturn} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <Select label="End Condition" value={returnForm.end_condition} onChange={(e) => setReturnField("end_condition", e.target.value)}>
              <option value="excellent">Excellent</option>
              <option value="good">Good</option>
              <option value="fair">Fair</option>
              <option value="poor">Poor</option>
              <option value="other">Other</option>
            </Select>
            <Input label="End Mileage (km)" type="number" value={returnForm.end_mileage} onChange={(e) => setReturnField("end_mileage", e.target.value)} placeholder="0" />
            <Input label="Return Date" type="date" value={returnForm.return_date} onChange={(e) => setReturnField("return_date", e.target.value)} />
            <Input label="Return Time" type="time" value={returnForm.return_time} onChange={(e) => setReturnField("return_time", e.target.value)} />
          </div>
          <Input label="End Condition Note" value={returnForm.end_condition_note} onChange={(e) => setReturnField("end_condition_note", e.target.value)} />
          <Textarea label="Return Notes" value={returnForm.return_notes} onChange={(e) => setReturnField("return_notes", e.target.value)} />
        </form>
      </Modal>
    </div>
  )
}
