"use client"

import * as React from "react"
import { Plus, Storefront, Phone, EnvelopeSimple, PencilSimple, Trash } from "@phosphor-icons/react"
import { PageHeader } from "@/components/ui/page-header"
import { Button } from "@/components/ui/button"
import { StatCard } from "@/components/ui/stat-card"
import { DataTable } from "@/components/ui/data-table"
import { Modal } from "@/components/ui/modal"
import { Input, Textarea } from "@/components/ui/input"
import { useConfirm } from "@/components/ui/confirm-dialog"
import { apiFetch } from "@/lib/api"
import { toast } from "sonner"
import type { AssetVendor } from "@/lib/types"
import type { Column } from "@/components/ui/data-table"

type FormState = {
  name: string
  contact_person: string
  email: string
  phone: string
  address: string
}
const EMPTY_FORM: FormState = { name: "", contact_person: "", email: "", phone: "", address: "" }

export default function AssetVendorsPage() {
  const [vendors, setVendors] = React.useState<AssetVendor[]>([])
  const [loading, setLoading] = React.useState(true)
  const [showModal, setShowModal] = React.useState(false)
  const [editing, setEditing] = React.useState<AssetVendor | null>(null)
  const [form, setForm] = React.useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = React.useState(false)
  const confirm = useConfirm()

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiFetch<{ vendors: AssetVendor[] }>('/api/assets/vendors')
      setVendors(res.vendors ?? [])
    } catch {
      toast.error('Failed to load vendors')
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => { load() }, [load])

  function openAdd() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setShowModal(true)
  }

  function openEdit(vendor: AssetVendor) {
    setEditing(vendor)
    setForm({
      name: vendor.name,
      contact_person: vendor.contact_person ?? "",
      email: vendor.email ?? "",
      phone: vendor.phone ?? "",
      address: vendor.address ?? "",
    })
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
    setEditing(null)
    setForm(EMPTY_FORM)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { toast.error('Vendor name is required'); return }
    setSaving(true)
    try {
      const payload = {
        name: form.name,
        contact_person: form.contact_person || null,
        email: form.email || null,
        phone: form.phone || null,
        address: form.address || null,
      }
      if (editing) {
        await apiFetch(`/api/assets/vendors/${editing.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        })
        toast.success('Vendor updated')
      } else {
        await apiFetch('/api/assets/vendors', {
          method: 'POST',
          body: JSON.stringify(payload),
        })
        toast.success('Vendor added')
      }
      closeModal()
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(vendor: AssetVendor) {
    const ok = await confirm({ title: `Delete "${vendor.name}"?`, message: "This vendor will be permanently removed. Assets linked to this vendor will not be deleted.", confirmLabel: "Delete" })
    if (!ok) return
    try {
      await apiFetch(`/api/assets/vendors/${vendor.id}`, { method: 'DELETE' })
      toast.success('Vendor deleted')
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed')
    }
  }

  const columns: Column<AssetVendor>[] = [
    {
      key: "name",
      header: "Vendor Name",
      sortable: true,
      render: (v) => (
        <span className="font-medium" style={{ color: "var(--text-primary)" }}>
          {v as string}
        </span>
      ),
    },
    {
      key: "contact_person",
      header: "Contact Person",
      render: (v) => (
        <span style={{ color: "var(--text-secondary)" }}>
          {(v as string | null) ?? "—"}
        </span>
      ),
    },
    {
      key: "phone",
      header: "Phone",
      render: (v) =>
        v ? (
          <span className="flex items-center gap-1.5 text-sm" style={{ color: "var(--text-secondary)" }}>
            <Phone size={12} />
            {v as string}
          </span>
        ) : "—",
    },
    {
      key: "email",
      header: "Email",
      render: (v) =>
        v ? (
          <span className="flex items-center gap-1.5 text-sm" style={{ color: "var(--text-secondary)" }}>
            <EnvelopeSimple size={12} />
            {v as string}
          </span>
        ) : "—",
    },
    {
      key: "address",
      header: "Address",
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
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); openEdit(row) }}
            className="p-1 rounded hover:bg-[var(--surface-muted)] transition-colors"
            title="Edit"
          >
            <PencilSimple size={14} style={{ color: "var(--text-muted)" }} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); handleDelete(row) }}
            className="p-1 rounded hover:bg-[var(--surface-muted)] transition-colors"
            title="Delete"
          >
            <Trash size={14} style={{ color: "var(--status-error)" }} />
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Asset Vendors"
        subtitle="Manage suppliers and vendors for asset procurement"
        actions={
          <Button variant="primary" size="md" onClick={openAdd}>
            <Plus size={16} />
            Add Vendor
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard
          title="Total Vendors"
          value={vendors.length}
          icon={<Storefront size={18} />}
          color="#1B2A5E"
          iconBg="#EEF1F8"
        />
        <StatCard
          title="With Email"
          value={vendors.filter((v) => v.email).length}
          icon={<EnvelopeSimple size={18} />}
          color="#2563EB"
          iconBg="#EFF4FF"
        />
      </div>

      <DataTable
        columns={columns}
        data={vendors}
        loading={loading}
        onRowClick={openEdit}
        emptyIcon={<Storefront size={28} />}
        emptyTitle="No vendors configured"
        emptyDescription="Add vendors to track asset suppliers and procurement sources."
        emptyAction={
          <Button variant="primary" size="sm" onClick={openAdd}>
            <Plus size={14} />
            Add Vendor
          </Button>
        }
      />

      <Modal
        open={showModal}
        onOpenChange={(open) => { if (!open) closeModal() }}
        title={editing ? "Edit Vendor" : "Add Vendor"}
        size="md"
        footer={
          <>
            <Button type="button" variant="secondary" size="md" onClick={closeModal}>Cancel</Button>
            <Button type="submit" form="vendor-form" variant="primary" size="md" loading={saving}>
              {editing ? "Save Changes" : "Add Vendor"}
            </Button>
          </>
        }
      >
        <form id="vendor-form" onSubmit={handleSave} className="flex flex-col gap-4">
          <Input label="Vendor Name" required value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Al-Futtaim Tech" />
          <Input label="Contact Person" value={form.contact_person} onChange={(e) => setForm(f => ({ ...f, contact_person: e.target.value }))} placeholder="Full name" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Email" type="email" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} placeholder="vendor@example.com" />
            <Input label="Phone" value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+968 XXXX XXXX" />
          </div>
          <Textarea label="Address" value={form.address} onChange={(e) => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Street, City, Country" rows={2} />
        </form>
      </Modal>
    </div>
  )
}
