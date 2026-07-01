"use client"

import * as React from "react"
import Link from "next/link"
import {
  Plus, Trash, Eye, Warning, Gavel,
  HourglassHigh, CheckCircle, ClockCountdown,
} from "@phosphor-icons/react"
import { toast }          from "sonner"
import { PageHeader }     from "@/components/ui/page-header"
import { Button }         from "@/components/ui/button"
import { Modal }          from "@/components/ui/modal"
import { Input, Textarea } from "@/components/ui/input"
import { DataTable }      from "@/components/ui/data-table"
import { StatusBadge }    from "@/components/ui/status-badge"
import { StatCard }       from "@/components/ui/stat-card"
import { apiFetch }       from "@/lib/api"
import { formatDate, formatCurrency } from "@/lib/utils"
import { useAuth }        from "@/contexts/AuthContext"
import type { PCEntry }   from "@/lib/types"
import type { Column }    from "@/components/ui/data-table"

// ── Constants ─────────────────────────────────────────────────────────────────
// Must match isPCAdmin() in the API routes — all roles that can manage entries
const ADMIN_ROLES = ["admin","super_admin","ceo","md","cto","coo","tender_icv_manager"]
// Only 'admin' and 'tender_icv_manager' can delete (mirrors API isPCAdmin + creator check)
// But since all ADMIN_ROLES create, any of them as creator should be able to delete their own.
// The API enforces isPCAdmin which includes all the above — so ADMIN_ROLES covers delete too.

const REVIEWER_ROLE_LABELS: Record<string, string> = {
  tender_icv_manager: "Tender & ICV Manager",
  cto:     "CTO",
  hr:      "HR",
  finance: "Finance",
  coo:     "COO",
}

const STATUS_COLORS: Record<string, { bg: string; color: string; label: string }> = {
  pending_review:   { bg: "#F3F4F6", color: "#6B7280", label: "Pending Review" },
  under_review:     { bg: "#EFF6FF", color: "#2563EB", label: "Under Review" },
  review_completed: { bg: "#EEF2FF", color: "#4F46E5", label: "Review Completed" },
  pending_final:    { bg: "#FFF8E6", color: "#D97706", label: "Pending Final" },
  approved:         { bg: "#ECFDF5", color: "#059669", label: "Approved" },
  rejected:         { bg: "#FFF0F0", color: "#DC2626", label: "Rejected" },
}

const FILTER_TABS = [
  { key: "all",              label: "All" },
  { key: "under_review",     label: "Under Review" },
  { key: "review_completed", label: "Review Completed" },
  { key: "pending_final",    label: "Pending Final" },
  { key: "approved",         label: "Approved" },
  { key: "rejected",         label: "Rejected" },
]

// ── Status badge (custom colours) ─────────────────────────────────────────────
function PCStatusBadge({ status }: { status: string }) {
  const s = STATUS_COLORS[status] ?? { bg: "#F3F4F6", color: "#6B7280", label: status }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap"
      style={{ background: s.bg, color: s.color }}>
      {s.label}
    </span>
  )
}

// ── New Entry Modal ────────────────────────────────────────────────────────────
interface NewEntryForm {
  name: string; tender_number: string; price: string; currency: string
  submission_end_date: string; description: string
  reviewer_roles: string[]
}
const BLANK: NewEntryForm = {
  name:"", tender_number:"", price:"", currency:"OMR",
  submission_end_date:"", description:"", reviewer_roles:[],
}

function NewEntryModal({
  open, onClose, onCreated,
}: { open: boolean; onClose: () => void; onCreated: (e: PCEntry) => void }) {
  const [form,   setForm]   = React.useState<NewEntryForm>(BLANK)
  const [saving, setSaving] = React.useState(false)
  const [error,  setError]  = React.useState<string|null>(null)

  React.useEffect(() => { if (open) { setForm(BLANK); setError(null) } }, [open])

  function toggleRole(role: string) {
    setForm(f => ({
      ...f,
      reviewer_roles: f.reviewer_roles.includes(role)
        ? f.reviewer_roles.filter(r => r !== role)
        : [...f.reviewer_roles, role],
    }))
  }

  async function save() {
    if (!form.name.trim())             { setError("Tender name is required");         return }
    if (!form.tender_number.trim())    { setError("Tender number is required");       return }
    if (!form.price || isNaN(Number(form.price))) { setError("Valid price required"); return }
    if (!form.submission_end_date)     { setError("Submission end date is required"); return }
    if (!form.description.trim())      { setError("Description is required");         return }
    if (form.reviewer_roles.length === 0) { setError("Select at least one reviewer"); return }

    setSaving(true); setError(null)
    try {
      const r = await apiFetch<{ entry: PCEntry }>("/api/purchasing-committee", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, price: Number(form.price) }),
      })
      onCreated(r.entry)
      toast.success("Entry created and reviewers notified")
      onClose()
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed to create") }
    finally { setSaving(false) }
  }

  const s = (k: keyof NewEntryForm, v: string) => setForm(f => ({ ...f, [k]: v }))

  return (
    <Modal open={open} onOpenChange={v => !v && onClose()}
      title="New Purchasing Committee Entry"
      description="Create a tender entry for committee review."
      footer={<>
        <Button variant="secondary" size="sm" onClick={onClose} disabled={saving}>Cancel</Button>
        <Button variant="primary"   size="sm" loading={saving}  onClick={save}>Create Entry</Button>
      </>}>
      <div className="flex flex-col gap-4">
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-[var(--radius-md)] text-sm"
            style={{ background:"#FFF0F0", color:"#DC2626", border:"1px solid #FECACA" }}>
            <Warning size={14}/> {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Input label="Tender Name *" value={form.name}
            onChange={e => s("name", e.target.value)} autoFocus />
          <Input label="Tender Number *" value={form.tender_number}
            onChange={e => s("tender_number", e.target.value)} placeholder="e.g. TND-2026-001" />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Input label="Price *" type="number" value={form.price}
            onChange={e => s("price", e.target.value)} />
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider" style={{ color:"var(--text-muted)" }}>Currency</label>
            <select value={form.currency} onChange={e => s("currency", e.target.value)}
              className="h-10 px-3 text-sm rounded-[var(--radius-md)] border"
              style={{ background:"var(--surface-base)", borderColor:"var(--surface-border)", color:"var(--text-primary)" }}>
              {["OMR","USD","EUR"].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <Input label="Submission Deadline *" type="date" value={form.submission_end_date}
            onChange={e => s("submission_end_date", e.target.value)} />
        </div>

        <Textarea label="Description *" value={form.description}
          onChange={e => s("description", e.target.value)} rows={4}
          placeholder="Describe the tender scope, requirements, and objectives…" />

        {/* Reviewer checkboxes */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold uppercase tracking-wider" style={{ color:"var(--text-muted)" }}>
            Assign Reviewers * (select at least one)
          </label>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(REVIEWER_ROLE_LABELS).map(([role, label]) => (
              <label key={role} className="flex items-center gap-2.5 p-2.5 rounded-[var(--radius-md)] border cursor-pointer transition-colors"
                style={{
                  borderColor: form.reviewer_roles.includes(role) ? "var(--brand-navy)" : "var(--surface-border)",
                  background:  form.reviewer_roles.includes(role) ? "#EEF1F8" : "var(--surface-base)",
                }}>
                <input type="checkbox" className="accent-[var(--brand-navy)]"
                  checked={form.reviewer_roles.includes(role)}
                  onChange={() => toggleRole(role)} />
                <span className="text-sm font-medium" style={{ color:"var(--text-primary)" }}>{label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  )
}

// ── Delete Confirm Modal ──────────────────────────────────────────────────────
function DeleteConfirm({
  entry, onCancel, onDeleted,
}: { entry: PCEntry; onCancel: () => void; onDeleted: (id: string) => void }) {
  const [busy, setBusy] = React.useState(false)
  async function go() {
    setBusy(true)
    try {
      await apiFetch(`/api/purchasing-committee/${entry.id}`, { method: "DELETE" })
      onDeleted(entry.id)
      toast.success(`"${entry.name}" deleted`)
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Delete failed") }
    finally { setBusy(false) }
  }
  return (
    <Modal open onOpenChange={v => !v && onCancel()}
      title="Delete Entry"
      description={`Delete "${entry.name}" (${entry.tender_number})? This cannot be undone.`}
      footer={<>
        <Button variant="secondary" size="sm" onClick={onCancel} disabled={busy}>Cancel</Button>
        <Button size="sm" loading={busy} onClick={go}
          style={{ background:"#DC2626", color:"#fff", border:"none" }}>Delete</Button>
      </>}>{null}</Modal>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
//  PAGE
// ═════════════════════════════════════════════════════════════════════════════
export default function PurchasingCommitteePage() {
  const { user }  = useAuth()
  const isAdmin   = ADMIN_ROLES.includes(user?.role ?? "")

  const [entries,      setEntries]      = React.useState<PCEntry[]>([])
  const [loading,      setLoading]      = React.useState(true)
  const [statusFilter, setStatusFilter] = React.useState("all")
  const [modal,        setModal]        = React.useState(false)
  const [deleteTarget, setDeleteTarget] = React.useState<PCEntry|null>(null)

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const r = await apiFetch<{ entries: PCEntry[] }>("/api/purchasing-committee")
      setEntries(r.entries ?? [])
    } catch { toast.error("Failed to load entries") }
    finally { setLoading(false) }
  }, [])

  React.useEffect(() => { load() }, [load])

  const filtered = statusFilter === "all"
    ? entries
    : entries.filter(e => e.status === statusFilter)

  const stats = {
    total:        entries.length,
    underReview:  entries.filter(e => e.status === "under_review").length,
    pendingFinal: entries.filter(e => e.status === "pending_final").length,
    approved:     entries.filter(e => e.status === "approved").length,
  }

  const columns: Column<PCEntry>[] = [
    {
      key: "tender_number", header: "Ref No.",
      render: v => <span className="font-mono text-xs" style={{ color:"var(--text-muted)" }}>{v as string}</span>,
    },
    {
      key: "name", header: "Tender Name", sortable: true,
      render: (v, row) => (
        <Link href={`/projects/purchasing-committee/${row.id}`}
          className="font-medium hover:underline" style={{ color:"var(--brand-navy)" }}>
          {v as string}
        </Link>
      ),
    },
    {
      key: "price", header: "Price",
      render: (v, row) => formatCurrency(v as number, row.currency),
    },
    {
      key: "submission_end_date", header: "Deadline",
      render: v => {
        const daysLeft = Math.ceil((new Date(v as string).getTime() - Date.now()) / 86400000)
        return (
          <div className="flex flex-col">
            <span style={{ color:"var(--text-secondary)" }}>{formatDate(v as string)}</span>
            {daysLeft > 0 && daysLeft <= 7 && (
              <span className="text-xs" style={{ color:"#D97706" }}>{daysLeft}d left</span>
            )}
            {daysLeft <= 0 && (
              <span className="text-xs" style={{ color:"#DC2626" }}>Overdue</span>
            )}
          </div>
        )
      },
    },
    {
      key: "status", header: "Status",
      render: v => <PCStatusBadge status={v as string} />,
    },
    {
      key: "id", header: "Actions",
      render: (v, row) => (
        <div className="flex items-center gap-1">
          <Link href={`/projects/purchasing-committee/${v}`}>
            <button className="w-7 h-7 flex items-center justify-center rounded hover:bg-[#EEF1F8] transition-colors"
              style={{ color:"#1B2A5E" }}>
              <Eye size={14}/>
            </button>
          </Link>
          {isAdmin && row.created_by === user?.id && (
            <button onClick={() => setDeleteTarget(row)}
              className="w-7 h-7 flex items-center justify-center rounded hover:bg-[#FFF0F0] transition-colors"
              style={{ color:"#DC2626" }}>
              <Trash size={14}/>
            </button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Purchasing Committee"
        actions={isAdmin && (
          <Button variant="primary" size="md" onClick={() => setModal(true)}>
            <Plus size={16}/> New Entry
          </Button>
        )}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Entries"   value={stats.total}        icon={<Gavel size={18}/>}          color="#1B2A5E" iconBg="#EEF1F8"/>
        <StatCard title="Under Review"    value={stats.underReview}  icon={<HourglassHigh size={18}/>}  color="#2563EB" iconBg="#EFF6FF"/>
        <StatCard title="Pending Final"   value={stats.pendingFinal} icon={<ClockCountdown size={18}/>} color="#D97706" iconBg="#FFF8E6"/>
        <StatCard title="Approved"        value={stats.approved}     icon={<CheckCircle size={18}/>}    color="#059669" iconBg="#ECFDF5"/>
      </div>

      {/* Filter tabs */}
      <div className="flex border-b overflow-x-auto" style={{ borderColor:"var(--surface-border)" }}>
        {FILTER_TABS.map(tab => (
          <button key={tab.key} onClick={() => setStatusFilter(tab.key)}
            className="px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap"
            style={{
              borderColor: statusFilter === tab.key ? "var(--brand-navy)" : "transparent",
              color:       statusFilter === tab.key ? "var(--brand-navy)" : "var(--text-muted)",
            }}>
            {tab.label}
            {tab.key !== "all" && (
              <span className="ml-1.5 text-xs" style={{ color:"var(--text-disabled)" }}>
                ({entries.filter(e => e.status === tab.key).length})
              </span>
            )}
          </button>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        loading={loading}
        emptyIcon={<Gavel size={28}/>}
        emptyTitle="No committee entries"
        emptyDescription="Create a new entry to start the purchasing committee review process."
        emptyAction={isAdmin ? (
          <Button variant="primary" size="sm" onClick={() => setModal(true)}>
            <Plus size={14}/> New Entry
          </Button>
        ) : undefined}
      />

      <NewEntryModal
        open={modal}
        onClose={() => setModal(false)}
        onCreated={e => setEntries(prev => [e, ...prev])}
      />
      {deleteTarget && (
        <DeleteConfirm
          entry={deleteTarget}
          onCancel={() => setDeleteTarget(null)}
          onDeleted={id => { setEntries(prev => prev.filter(e => e.id !== id)); setDeleteTarget(null) }}
        />
      )}
    </div>
  )
}
