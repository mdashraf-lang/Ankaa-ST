"use client"

import * as React from "react"
import { Plus, ArrowRight, Package, Trash } from "@phosphor-icons/react"
import { PageHeader } from "@/components/ui/page-header"
import { Button } from "@/components/ui/button"
import { StatCard } from "@/components/ui/stat-card"
import { DataTable } from "@/components/ui/data-table"
import { formatDate } from "@/lib/utils"
import { Modal } from "@/components/ui/modal"
import { Input, Textarea } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { useConfirm } from "@/components/ui/confirm-dialog"
import { apiFetch } from "@/lib/api"
import { toast } from "sonner"
import type { AssetMovement, Asset } from "@/lib/types"
import type { Column } from "@/components/ui/data-table"

type MovementRow = AssetMovement & { asset_name?: string | null; moved_by_name?: string | null }

type FormState = {
  asset_id: string
  from_location: string
  to_location: string
  asset_condition: string
  notes: string
}
const EMPTY_FORM: FormState = {
  asset_id: "",
  from_location: "",
  to_location: "",
  asset_condition: "",
  notes: "",
}

export default function AssetMovementsPage() {
  const [movements, setMovements] = React.useState<MovementRow[]>([])
  const [assets, setAssets] = React.useState<Asset[]>([])
  const [loading, setLoading] = React.useState(true)
  const [search, setSearch] = React.useState("")
  const [showModal, setShowModal] = React.useState(false)
  const [form, setForm] = React.useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = React.useState(false)
  const confirm = useConfirm()

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const [movRes, assetRes] = await Promise.all([
        apiFetch<{ movements: MovementRow[] }>('/api/assets/movements'),
        apiFetch<{ assets: Asset[] }>('/api/assets'),
      ])
      setMovements(movRes.movements ?? [])
      setAssets(assetRes.assets ?? [])
    } catch {
      toast.error('Failed to load movements')
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => { load() }, [load])

  const filtered = search
    ? movements.filter(
        (m) =>
          (m.asset_name ?? m.asset_id).toLowerCase().includes(search.toLowerCase()) ||
          m.from_location?.toLowerCase().includes(search.toLowerCase()) ||
          m.to_location?.toLowerCase().includes(search.toLowerCase()),
      )
    : movements

  const thisMonth = movements.filter((m) => {
    const d = new Date(m.moved_at)
    const now = new Date()
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  }).length

  function openAdd() {
    setForm(EMPTY_FORM)
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
    setForm(EMPTY_FORM)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!form.asset_id) { toast.error('Asset is required'); return }
    setSaving(true)
    try {
      await apiFetch('/api/assets/movements', {
        method: 'POST',
        body: JSON.stringify({
          asset_id: form.asset_id,
          from_location: form.from_location || null,
          to_location: form.to_location || null,
          asset_condition: form.asset_condition || null,
          notes: form.notes || null,
        }),
      })
      toast.success('Movement logged')
      closeModal()
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(movement: MovementRow) {
    const ok = await confirm({ title: "Delete Movement Record", message: "This movement record will be permanently deleted from the audit trail.", confirmLabel: "Delete" })
    if (!ok) return
    try {
      await apiFetch(`/api/assets/movements/${movement.id}`, { method: 'DELETE' })
      toast.success('Movement deleted')
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed')
    }
  }

  const columns: Column<MovementRow>[] = [
    {
      key: "asset_name",
      header: "Asset",
      render: (v, row) => (
        <span className="font-medium text-xs" style={{ color: "var(--text-primary)" }}>
          {(v as string | null) ?? row.asset_id}
        </span>
      ),
    },
    {
      key: "from_location",
      header: "From",
      render: (v) => (
        <span style={{ color: "var(--text-secondary)" }}>
          {(v as string | null) ?? "—"}
        </span>
      ),
    },
    {
      key: "to_location",
      header: "To",
      render: (v) => (
        <span className="flex items-center gap-1.5">
          <ArrowRight size={12} style={{ color: "var(--text-muted)" }} />
          <span style={{ color: "var(--text-secondary)" }}>
            {(v as string | null) ?? "—"}
          </span>
        </span>
      ),
    },
    {
      key: "asset_condition",
      header: "Condition",
      render: (v) => (
        <span
          className="text-xs px-2 py-0.5 rounded-full capitalize"
          style={{ background: "var(--surface-muted)", color: "var(--text-secondary)" }}
        >
          {(v as string | null) ?? "—"}
        </span>
      ),
    },
    {
      key: "moved_by_name",
      header: "Moved By",
      render: (v, row) => (
        <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
          {(v as string | null) ?? row.moved_by ?? "—"}
        </span>
      ),
    },
    {
      key: "moved_at",
      header: "Moved On",
      sortable: true,
      render: (v) => formatDate(v as string) ?? "—",
    },
    {
      key: "notes",
      header: "Notes",
      render: (v) => (
        <span className="text-xs truncate max-w-[200px] block" style={{ color: "var(--text-muted)" }}>
          {(v as string | null) ?? "—"}
        </span>
      ),
    },
    {
      key: "id",
      header: "",
      render: (_, row) => (
        <button
          onClick={(e) => { e.stopPropagation(); handleDelete(row) }}
          className="p-1 rounded hover:bg-[var(--surface-muted)] transition-colors"
          title="Delete"
        >
          <Trash size={14} style={{ color: "var(--status-error)" }} />
        </button>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Asset Movements"
        subtitle="Full audit trail of asset transfers between locations and companies"
        actions={
          <Button variant="primary" size="md" onClick={openAdd}>
            <Plus size={16} />
            Log Movement
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard
          title="Total Movements"
          value={movements.length}
          icon={<Package size={18} />}
          color="#1B2A5E"
          iconBg="#EEF1F8"
        />
        <StatCard
          title="This Month"
          value={thisMonth}
          icon={<ArrowRight size={18} />}
          color="#2563EB"
          iconBg="#EFF4FF"
        />
      </div>

      {/* Search */}
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by asset, from or to location…"
        className="w-full max-w-sm px-3 py-2 text-sm rounded-[var(--radius-md)] border outline-none focus:ring-2"
        style={{
          borderColor: "var(--surface-border)",
          background: "var(--surface-base)",
          color: "var(--text-primary)",
        }}
      />

      <DataTable
        columns={columns}
        data={filtered}
        loading={loading}
        emptyIcon={<ArrowRight size={28} />}
        emptyTitle="No movements recorded"
        emptyDescription="Log asset movements to maintain a full audit trail."
        emptyAction={
          <Button variant="primary" size="sm" onClick={openAdd}>
            <Plus size={14} />
            Log Movement
          </Button>
        }
      />

      <Modal
        open={showModal}
        onOpenChange={(open) => { if (!open) closeModal() }}
        title="Log Asset Movement"
        size="md"
        footer={
          <>
            <Button type="button" variant="secondary" size="md" onClick={closeModal}>Cancel</Button>
            <Button type="submit" form="movement-form" variant="primary" size="md" loading={saving}>
              Log Movement
            </Button>
          </>
        }
      >
        <form id="movement-form" onSubmit={handleSave} className="flex flex-col gap-4">
          <Select label="Asset" required value={form.asset_id} onChange={(e) => setForm(f => ({ ...f, asset_id: e.target.value }))}>
            <option value="">Select asset…</option>
            {assets.map((a) => (
              <option key={a.id} value={a.id}>{a.name}{a.asset_id ? ` (${a.asset_id})` : ""}</option>
            ))}
          </Select>
          <div className="grid grid-cols-2 gap-3">
            <Input label="From Location" value={form.from_location} onChange={(e) => setForm(f => ({ ...f, from_location: e.target.value }))} placeholder="Current location" />
            <Input label="To Location" value={form.to_location} onChange={(e) => setForm(f => ({ ...f, to_location: e.target.value }))} placeholder="Destination" />
          </div>
          <Select label="Asset Condition" value={form.asset_condition} onChange={(e) => setForm(f => ({ ...f, asset_condition: e.target.value }))}>
            <option value="">Select condition…</option>
            <option value="new">New</option>
            <option value="good">Good</option>
            <option value="fair">Fair</option>
            <option value="poor">Poor</option>
          </Select>
          <Textarea label="Notes" value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Reason for movement, handover notes…" rows={2} />
        </form>
      </Modal>
    </div>
  )
}
