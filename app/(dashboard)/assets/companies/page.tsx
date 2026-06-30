"use client"

import * as React from "react"
import { Plus, Buildings, PencilSimple, Trash } from "@phosphor-icons/react"
import { PageHeader } from "@/components/ui/page-header"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/ui/data-table"
import { formatDate } from "@/lib/utils"
import { Modal } from "@/components/ui/modal"
import { Input, Textarea } from "@/components/ui/input"
import { useConfirm } from "@/components/ui/confirm-dialog"
import { apiFetch } from "@/lib/api"
import { toast } from "sonner"
import type { AssetCompany } from "@/lib/types"
import type { Column } from "@/components/ui/data-table"

type FormState = { name: string; code: string; description: string }
const EMPTY_FORM: FormState = { name: "", code: "", description: "" }

export default function AssetCompaniesPage() {
  const [companies, setCompanies] = React.useState<AssetCompany[]>([])
  const [loading, setLoading] = React.useState(true)
  const [showModal, setShowModal] = React.useState(false)
  const [editing, setEditing] = React.useState<AssetCompany | null>(null)
  const [form, setForm] = React.useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = React.useState(false)
  const confirm = useConfirm()

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiFetch<{ companies: AssetCompany[] }>('/api/assets/companies')
      setCompanies(res.companies ?? [])
    } catch {
      toast.error('Failed to load companies')
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

  function openEdit(company: AssetCompany) {
    setEditing(company)
    setForm({ name: company.name, code: company.code ?? "", description: company.description ?? "" })
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
    setEditing(null)
    setForm(EMPTY_FORM)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { toast.error('Company name is required'); return }
    setSaving(true)
    try {
      if (editing) {
        await apiFetch(`/api/assets/companies/${editing.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ name: form.name, code: form.code || null, description: form.description || null }),
        })
        toast.success('Company updated')
      } else {
        await apiFetch('/api/assets/companies', {
          method: 'POST',
          body: JSON.stringify({ name: form.name, code: form.code || null, description: form.description || null }),
        })
        toast.success('Company added')
      }
      closeModal()
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(company: AssetCompany) {
    const ok = await confirm({ title: `Delete "${company.name}"?`, message: "This company will be permanently removed. Assets linked to it will not be deleted but will lose their company association.", confirmLabel: "Delete" })
    if (!ok) return
    try {
      await apiFetch(`/api/assets/companies/${company.id}`, { method: 'DELETE' })
      toast.success('Company deleted')
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed')
    }
  }

  const columns: Column<AssetCompany>[] = [
    {
      key: "code",
      header: "Code",
      render: (v) => (
        <span
          className="font-mono text-xs font-bold px-2 py-0.5 rounded"
          style={{ background: "var(--brand-navy)", color: "white" }}
        >
          {(v as string | null) ?? "—"}
        </span>
      ),
    },
    {
      key: "name",
      header: "Company Name",
      sortable: true,
      render: (v) => (
        <span className="font-medium" style={{ color: "var(--text-primary)" }}>
          {v as string}
        </span>
      ),
    },
    {
      key: "description",
      header: "Description",
      render: (v) => (
        <span className="text-sm" style={{ color: "var(--text-muted)" }}>
          {(v as string | null) ?? "—"}
        </span>
      ),
    },
    {
      key: "created_at",
      header: "Created",
      render: (v) => formatDate(v as string) ?? "—",
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
        title="Asset Companies"
        subtitle="Manage the companies that own assets (Ankaa, GIS, Taqa, Wingtech)"
        actions={
          <Button variant="primary" size="md" onClick={openAdd}>
            <Plus size={16} />
            Add Company
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={companies}
        loading={loading}
        onRowClick={openEdit}
        emptyIcon={<Buildings size={28} />}
        emptyTitle="No companies configured"
        emptyDescription="Add companies to categorise assets by ownership."
        emptyAction={
          <Button variant="primary" size="sm" onClick={openAdd}>
            <Plus size={14} />
            Add Company
          </Button>
        }
      />

      <Modal
        open={showModal}
        onOpenChange={(open) => { if (!open) closeModal() }}
        title={editing ? "Edit Company" : "Add Company"}
        size="md"
        footer={
          <>
            <Button type="button" variant="secondary" size="md" onClick={closeModal}>Cancel</Button>
            <Button type="submit" form="company-form" variant="primary" size="md" loading={saving}>
              {editing ? "Save Changes" : "Add Company"}
            </Button>
          </>
        }
      >
        <form id="company-form" onSubmit={handleSave} className="flex flex-col gap-4">
          <Input label="Company Name" required value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Ankaa S&T" />
          <Input label="Code" value={form.code} onChange={(e) => setForm(f => ({ ...f, code: e.target.value }))} placeholder="e.g. ANKAA" hint="Used in auto-generated Asset IDs" />
          <Textarea label="Description" value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional description" rows={3} />
        </form>
      </Modal>
    </div>
  )
}
