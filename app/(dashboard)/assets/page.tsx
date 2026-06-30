"use client"

import * as React from "react"
import Link from "next/link"
import {
  Plus,
  DownloadSimple,
  Package,
  CheckCircle,
  Wrench,
  UserPlus,
} from "@phosphor-icons/react"
import { PageHeader } from "@/components/ui/page-header"
import { Button } from "@/components/ui/button"
import { StatCard } from "@/components/ui/stat-card"
import { DataTable } from "@/components/ui/data-table"
import { StatusBadge } from "@/components/ui/status-badge"
import { Modal } from "@/components/ui/modal"
import { Input, Textarea } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { formatDate, formatCurrency } from "@/lib/utils"
import { apiFetch } from "@/lib/api"
import { toast } from "sonner"
import type { Asset, AssetCategory, AssetCompany, AssetLocation, AssetVendor } from "@/lib/types"
import type { Column } from "@/components/ui/data-table"

type AssetRow = Asset & {
  category_name?: string | null
  company_name?: string | null
  location_name?: string | null
  vendor_name?: string | null
  assigned_to_name?: string | null
}

type FormState = {
  name: string
  asset_id: string
  category_id: string
  company_id: string
  location_id: string
  vendor_id: string
  condition: string
  status: string
  purchase_date: string
  purchase_price: string
  serial_number: string
  notes: string
}

const EMPTY_FORM: FormState = {
  name: "",
  asset_id: "",
  category_id: "",
  company_id: "",
  location_id: "",
  vendor_id: "",
  condition: "good",
  status: "available",
  purchase_date: "",
  purchase_price: "",
  serial_number: "",
  notes: "",
}

const COMPANIES = ["all", "ankaa", "gis", "taqa", "wingtech"]

export default function AssetsPage() {
  const [assets, setAssets] = React.useState<AssetRow[]>([])
  const [categories, setCategories] = React.useState<AssetCategory[]>([])
  const [companies, setCompanies] = React.useState<AssetCompany[]>([])
  const [locations, setLocations] = React.useState<AssetLocation[]>([])
  const [vendors, setVendors] = React.useState<AssetVendor[]>([])
  const [loading, setLoading] = React.useState(true)
  const [companyFilter, setCompanyFilter] = React.useState("all")
  const [showModal, setShowModal] = React.useState(false)
  const [form, setForm] = React.useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = React.useState(false)

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const [assetRes, catRes, compRes, locRes, vendRes] = await Promise.all([
        apiFetch<{ assets: AssetRow[] }>('/api/assets'),
        apiFetch<{ categories: AssetCategory[] }>('/api/assets/categories'),
        apiFetch<{ companies: AssetCompany[] }>('/api/assets/companies'),
        apiFetch<{ locations: AssetLocation[] }>('/api/assets/locations'),
        apiFetch<{ vendors: AssetVendor[] }>('/api/assets/vendors'),
      ])
      setAssets(assetRes.assets ?? [])
      setCategories(catRes.categories ?? [])
      setCompanies(compRes.companies ?? [])
      setLocations(locRes.locations ?? [])
      setVendors(vendRes.vendors ?? [])
    } catch {
      toast.error('Failed to load assets')
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => { load() }, [load])

  const filteredAssets =
    companyFilter === "all"
      ? assets
      : assets.filter((a) =>
          (a.company_name ?? "").toLowerCase() === companyFilter ||
          (a.company_id ?? "").toLowerCase() === companyFilter
        )

  const stats = {
    total: assets.length,
    available: assets.filter((a) => a.status === "available").length,
    assigned: assets.filter((a) => a.status === "assigned").length,
    maintenance: assets.filter((a) => a.status === "maintenance").length,
  }

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
    if (!form.name.trim()) { toast.error('Asset name is required'); return }
    setSaving(true)
    try {
      await apiFetch('/api/assets', {
        method: 'POST',
        body: JSON.stringify({
          name: form.name,
          asset_id: form.asset_id || null,
          category_id: form.category_id || null,
          company_id: form.company_id || null,
          location_id: form.location_id || null,
          vendor_id: form.vendor_id || null,
          condition: form.condition,
          status: form.status,
          purchase_date: form.purchase_date || null,
          purchase_price: form.purchase_price ? Number(form.purchase_price) : null,
          serial_number: form.serial_number || null,
          notes: form.notes || null,
          quantity: 1,
        }),
      })
      toast.success('Asset added')
      closeModal()
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const columns: Column<AssetRow>[] = [
    {
      key: "asset_id",
      header: "Asset ID",
      render: (v) =>
        v ? (
          <span
            className="font-mono text-xs font-semibold px-2 py-0.5 rounded"
            style={{ background: "var(--surface-muted)", color: "var(--text-muted)" }}
          >
            {v as string}
          </span>
        ) : (
          <span style={{ color: "var(--text-disabled)" }}>—</span>
        ),
    },
    {
      key: "name",
      header: "Name",
      sortable: true,
      render: (v, row) => (
        <Link href={`/assets/${row.id}`}>
          <span className="font-medium hover:underline" style={{ color: "var(--brand-navy)" }}>
            {v as string}
          </span>
        </Link>
      ),
    },
    {
      key: "category_name",
      header: "Category",
      render: (v) => (
        <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
          {(v as string | null) ?? "—"}
        </span>
      ),
    },
    {
      key: "company_name",
      header: "Company",
      render: (v) => (
        <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
          {(v as string | null) ?? "—"}
        </span>
      ),
    },
    {
      key: "location_name",
      header: "Location",
      render: (v) => (
        <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
          {(v as string | null) ?? "—"}
        </span>
      ),
    },
    {
      key: "condition",
      header: "Condition",
      render: (v) => (
        <span
          className="text-xs px-2 py-0.5 rounded-full capitalize"
          style={{ background: "var(--surface-muted)", color: "var(--text-secondary)" }}
        >
          {(v as string).replace("_", " ")}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (v) => <StatusBadge status={v as string} />,
    },
    {
      key: "assigned_to_name",
      header: "Assigned To",
      render: (v) => (
        <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
          {(v as string | null) ?? "—"}
        </span>
      ),
    },
    {
      key: "purchase_date",
      header: "Purchase Date",
      sortable: true,
      render: (v) => formatDate(v as string) ?? "—",
    },
    {
      key: "current_value",
      header: "Current Value",
      sortable: true,
      render: (v) => (v != null ? formatCurrency(v as number) : "—"),
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Asset Registry"
        subtitle="Track and manage all company assets"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="md">
              <DownloadSimple size={16} />
              Export
            </Button>
            <Button variant="primary" size="md" onClick={openAdd}>
              <Plus size={16} />
              Add Asset
            </Button>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Assets"
          value={stats.total}
          icon={<Package size={18} />}
          color="#1B2A5E"
          iconBg="#EEF1F8"
        />
        <StatCard
          title="Available"
          value={stats.available}
          icon={<CheckCircle size={18} />}
          color="#10A854"
          iconBg="#EDFBF3"
        />
        <StatCard
          title="Assigned"
          value={stats.assigned}
          icon={<UserPlus size={18} />}
          color="#2563EB"
          iconBg="#EFF4FF"
        />
        <StatCard
          title="Maintenance"
          value={stats.maintenance}
          icon={<Wrench size={18} />}
          color="#E89B1A"
          iconBg="#FFF8E6"
        />
      </div>

      {/* Company tabs */}
      <div className="flex border-b" style={{ borderColor: "var(--surface-border)" }}>
        {COMPANIES.map((c) => (
          <button
            key={c}
            onClick={() => setCompanyFilter(c)}
            className="px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors capitalize"
            style={{
              borderColor: companyFilter === c ? "var(--brand-navy)" : "transparent",
              color: companyFilter === c ? "var(--brand-navy)" : "var(--text-muted)",
            }}
          >
            {c === "all" ? "All Companies" : c.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={filteredAssets}
        loading={loading}
        emptyIcon={<Package size={28} />}
        emptyTitle="No assets found"
        emptyDescription="Add assets to begin tracking your company inventory."
        emptyAction={
          <Button variant="primary" size="sm" onClick={openAdd}>
            <Plus size={14} />
            Add Asset
          </Button>
        }
      />

      {/* Add Asset Modal */}
      <Modal
        open={showModal}
        onOpenChange={(open) => { if (!open) closeModal() }}
        title="Add Asset"
        size="lg"
        footer={
          <>
            <Button type="button" variant="secondary" size="md" onClick={closeModal}>Cancel</Button>
            <Button type="submit" form="add-asset-form" variant="primary" size="md" loading={saving}>
              Add Asset
            </Button>
          </>
        }
      >
        <form id="add-asset-form" onSubmit={handleSave} className="flex flex-col gap-4">
          <Input
            label="Asset Name"
            required
            value={form.name}
            onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="e.g. Dell Latitude 5540"
          />
          <Input
            label="Asset ID"
            hint="Leave blank to auto-assign (e.g. Ankaa-OEM-0001)"
            value={form.asset_id}
            onChange={(e) => setForm(f => ({ ...f, asset_id: e.target.value }))}
            placeholder="e.g. Ankaa-OEM-0001"
          />

          <div className="grid grid-cols-2 gap-3">
            <Select label="Category" value={form.category_id} onChange={(e) => setForm(f => ({ ...f, category_id: e.target.value }))}>
              <option value="">Select…</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
            <Select label="Company" value={form.company_id} onChange={(e) => setForm(f => ({ ...f, company_id: e.target.value }))}>
              <option value="">Select…</option>
              {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Select label="Location" value={form.location_id} onChange={(e) => setForm(f => ({ ...f, location_id: e.target.value }))}>
              <option value="">Select…</option>
              {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </Select>
            <Select label="Vendor" value={form.vendor_id} onChange={(e) => setForm(f => ({ ...f, vendor_id: e.target.value }))}>
              <option value="">Select…</option>
              {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Select label="Condition" value={form.condition} onChange={(e) => setForm(f => ({ ...f, condition: e.target.value }))}>
              <option value="new">New</option>
              <option value="newly_purchased">Newly Purchased</option>
              <option value="good">Good</option>
              <option value="fair">Fair</option>
              <option value="poor">Poor</option>
            </Select>
            <Select label="Status" value={form.status} onChange={(e) => setForm(f => ({ ...f, status: e.target.value }))}>
              <option value="available">Available</option>
              <option value="assigned">Assigned</option>
              <option value="maintenance">Maintenance</option>
              <option value="retired">Retired</option>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input label="Purchase Date" type="date" value={form.purchase_date} onChange={(e) => setForm(f => ({ ...f, purchase_date: e.target.value }))} />
            <Input label="Purchase Price (OMR)" type="number" min="0" step="0.01" value={form.purchase_price} onChange={(e) => setForm(f => ({ ...f, purchase_price: e.target.value }))} placeholder="0.000" />
          </div>

          <Input label="Serial Number" value={form.serial_number} onChange={(e) => setForm(f => ({ ...f, serial_number: e.target.value }))} placeholder="Manufacturer serial" />

          <Textarea label="Notes" value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Additional notes…" rows={2} />
        </form>
      </Modal>
    </div>
  )
}
