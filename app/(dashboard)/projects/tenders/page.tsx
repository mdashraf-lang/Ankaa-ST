"use client"

import * as React from "react"
import Link from "next/link"
import { Plus, FileText, Warning } from "@phosphor-icons/react"
import {
  Files, FolderOpen, HourglassHigh, Trophy,
} from "@phosphor-icons/react/dist/ssr"
import { toast } from "sonner"
import { PageHeader }  from "@/components/ui/page-header"
import { Button }      from "@/components/ui/button"
import { StatCard }    from "@/components/ui/stat-card"
import { DataTable }   from "@/components/ui/data-table"
import { StatusBadge } from "@/components/ui/status-badge"
import { Modal }       from "@/components/ui/modal"
import { Input, Textarea } from "@/components/ui/input"
import { formatDate, formatCurrency } from "@/lib/utils"
import { apiFetch }    from "@/lib/api"
import { useAuth }     from "@/contexts/AuthContext"
import type { Tender } from "@/lib/types"
import type { Column } from "@/components/ui/data-table"

const STATUS_OPTS = ["open","in_progress","submitted","under_review","awarded","rejected","cancelled"]
const PRIORITY_OPTS = ["low","medium","high","critical"]

interface TenderForm {
  title: string; client_name: string; reference_number: string
  client_contact: string; tender_value: string; currency: string
  submission_deadline: string; status: string; priority: string
  description: string; source: string
}
const BLANK: TenderForm = {
  title:"", client_name:"", reference_number:"", client_contact:"",
  tender_value:"", currency:"OMR", submission_deadline:"",
  status:"open", priority:"medium", description:"", source:"",
}

// ── Tender Modal ──────────────────────────────────────────────────────────────
function TenderModal({
  open, onClose, onSaved,
}: {
  open: boolean
  onClose: () => void
  onSaved: (t: Tender) => void
}) {
  const [form,   setForm]   = React.useState<TenderForm>(BLANK)
  const [saving, setSaving] = React.useState(false)
  const [error,  setError]  = React.useState<string|null>(null)

  React.useEffect(() => {
    if (open) { setForm(BLANK); setError(null) }
  }, [open])

  async function save() {
    if (!form.title.trim())               { setError("Title is required"); return }
    if (!form.client_name.trim())         { setError("Client name is required"); return }
    if (!form.submission_deadline)        { setError("Submission deadline is required"); return }
    setSaving(true); setError(null)
    try {
      const payload = {
        ...form,
        tender_value: form.tender_value ? parseFloat(form.tender_value) : null,
        reference_number: form.reference_number || null,
        client_contact:   form.client_contact   || null,
        description:      form.description      || null,
        source:           form.source           || null,
      }
      const r = await apiFetch<{ tender: Tender }>("/api/tenders", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      onSaved(r.tender)
      toast.success("Tender created")
      onClose()
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed") }
    finally { setSaving(false) }
  }

  const s = (k: keyof TenderForm, v: string) => setForm(f => ({ ...f, [k]: v }))

  return (
    <Modal open={open} onOpenChange={v => !v && onClose()}
      title="New Tender"
      description="Add a new tender to track your pipeline."
      footer={<>
        <Button variant="secondary" size="sm" onClick={onClose} disabled={saving}>Cancel</Button>
        <Button variant="primary" size="sm" loading={saving} onClick={save}>Create Tender</Button>
      </>}>
      <div className="flex flex-col gap-4">
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-[var(--radius-md)] text-sm"
            style={{ background:"#FFF0F0", color:"#DC2626", border:"1px solid #FECACA" }}>
            <Warning size={14}/> {error}
          </div>
        )}

        <Input label="Tender Title *" value={form.title} onChange={e => s("title", e.target.value)} autoFocus
          placeholder="e.g. Supply of IT Equipment for Ministry of Finance" />

        <div className="grid grid-cols-2 gap-3">
          <Input label="Client Name *" value={form.client_name} onChange={e => s("client_name", e.target.value)} />
          <Input label="Reference Number" value={form.reference_number} onChange={e => s("reference_number", e.target.value)}
            placeholder="TND-2026-001" />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Input label="Value" type="number" value={form.tender_value} onChange={e => s("tender_value", e.target.value)} />
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider" style={{ color:"var(--text-muted)" }}>Currency</label>
            <select value={form.currency} onChange={e => s("currency", e.target.value)}
              className="h-10 px-3 text-sm rounded-[var(--radius-md)] border"
              style={{ background:"var(--surface-base)", borderColor:"var(--surface-border)", color:"var(--text-primary)" }}>
              {["OMR","USD","AED","SAR","EUR","GBP"].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <Input label="Deadline *" type="date" value={form.submission_deadline} onChange={e => s("submission_deadline", e.target.value)} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          {[
            { label:"Status",   key:"status"   as const, opts: STATUS_OPTS },
            { label:"Priority", key:"priority" as const, opts: PRIORITY_OPTS },
          ].map(({ label, key, opts }) => (
            <div key={key} className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider" style={{ color:"var(--text-muted)" }}>{label}</label>
              <select value={form[key]} onChange={e => s(key, e.target.value)}
                className="h-10 px-3 text-sm rounded-[var(--radius-md)] border capitalize"
                style={{ background:"var(--surface-base)", borderColor:"var(--surface-border)", color:"var(--text-primary)" }}>
                {opts.map(o => <option key={o} value={o} className="capitalize">{o.replace("_"," ")}</option>)}
              </select>
            </div>
          ))}
        </div>

        <Input label="Source / Portal" value={form.source} onChange={e => s("source", e.target.value)}
          placeholder="e.g. Etimad, Tender.gov.om" />
        <Input label="Client Contact" value={form.client_contact} onChange={e => s("client_contact", e.target.value)} />
        <Textarea label="Description (optional)" value={form.description} onChange={e => s("description", e.target.value)} rows={2} />
      </div>
    </Modal>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
//  PAGE
// ═════════════════════════════════════════════════════════════════════════════
export default function TendersPage() {
  const { user } = useAuth()
  const isAdmin  = ["admin","md","ceo","cto","coo","super_admin","hr"].includes(user?.role ?? "")

  const [tenders,      setTenders]      = React.useState<Tender[]>([])
  const [loading,      setLoading]      = React.useState(true)
  const [statusFilter, setStatusFilter] = React.useState<string>("all")
  const [modal,        setModal]        = React.useState(false)

  React.useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const r = await apiFetch<{ tenders: Tender[] }>("/api/tenders")
        setTenders(r.tenders ?? [])
      } catch { toast.error("Failed to load tenders") }
      finally { setLoading(false) }
    }
    load()
  }, [])

  const filteredTenders = statusFilter === "all"
    ? tenders
    : tenders.filter(t => t.status === statusFilter)

  const stats = {
    total:      tenders.length,
    open:       tenders.filter(t => t.status === "open").length,
    inProgress: tenders.filter(t => t.status === "in_progress").length,
    awarded:    tenders.filter(t => t.status === "awarded").length,
  }

  const filterTabs = [
    { key:"all",           label:"All" },
    { key:"open",          label:"Open" },
    { key:"in_progress",   label:"In Progress" },
    { key:"submitted",     label:"Submitted" },
    { key:"under_review",  label:"Under Review" },
    { key:"awarded",       label:"Awarded" },
    { key:"rejected",      label:"Rejected" },
  ]

  const columns: Column<Tender>[] = [
    {
      key: "reference_number", header: "Reference",
      render: v => (
        <span className="font-mono text-xs" style={{ color:"var(--text-muted)" }}>
          {(v as string | null) ?? "—"}
        </span>
      ),
    },
    {
      key: "title", header: "Tender Title", sortable: true,
      render: (v, row) => (
        <Link href={`/projects/tenders/${row.id}`}
          className="font-medium hover:underline" style={{ color:"var(--brand-navy)" }}>
          {v as string}
        </Link>
      ),
    },
    { key: "client_name", header: "Client", sortable: true },
    {
      key: "tender_value", header: "Value", sortable: true,
      render: (v, row) => v != null ? formatCurrency(v as number, row.currency) : "—",
    },
    {
      key: "submission_deadline", header: "Deadline", sortable: true,
      render: v => {
        const d = new Date(v as string)
        const daysLeft = Math.ceil((d.getTime() - Date.now()) / 86400000)
        return (
          <div className="flex flex-col">
            <span style={{ color:"var(--text-secondary)" }}>{formatDate(v as string)}</span>
            {daysLeft > 0 && daysLeft <= 7 && (
              <span className="text-xs" style={{ color:"var(--status-warning)" }}>{daysLeft}d left</span>
            )}
            {daysLeft <= 0 && (
              <span className="text-xs" style={{ color:"var(--status-error)" }}>Overdue</span>
            )}
          </div>
        )
      },
    },
    { key: "priority", header: "Priority", render: v => <StatusBadge status={v as string} /> },
    { key: "status",   header: "Status",   render: v => <StatusBadge status={v as string} /> },
    {
      key: "id", header: "",
      render: v => (
        <Link href={`/projects/tenders/${v}`}>
          <Button variant="ghost" size="icon-sm"><FolderOpen size={14}/></Button>
        </Link>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Tenders"
        actions={
          isAdmin && (
            <Button variant="primary" size="md" onClick={() => setModal(true)}>
              <Plus size={16}/> New Tender
            </Button>
          )
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Tenders"  value={stats.total}      icon={<Files size={18}/>}        color="#1B2A5E" iconBg="#EEF1F8" />
        <StatCard title="Open"           value={stats.open}       icon={<FolderOpen size={18}/>}   color="#2563EB" iconBg="#EFF4FF" />
        <StatCard title="In Progress"    value={stats.inProgress} icon={<HourglassHigh size={18}/>} color="#E89B1A" iconBg="#FFF8E6" />
        <StatCard title="Awarded"        value={stats.awarded}    icon={<Trophy size={18}/>}        color="#10A854" iconBg="#EDFBF3" />
      </div>

      {/* Filter tabs */}
      <div className="flex border-b overflow-x-auto" style={{ borderColor:"var(--surface-border)" }}>
        {filterTabs.map(tab => (
          <button key={tab.key} onClick={() => setStatusFilter(tab.key)}
            className="px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap"
            style={{
              borderColor: statusFilter === tab.key ? "var(--brand-navy)" : "transparent",
              color:       statusFilter === tab.key ? "var(--brand-navy)" : "var(--text-muted)",
            }}>
            {tab.label}
            {tab.key !== "all" && (
              <span className="ml-1 text-xs" style={{ color:"var(--text-disabled)" }}>
                ({tenders.filter(t => t.status === tab.key).length})
              </span>
            )}
          </button>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={filteredTenders}
        loading={loading}
        emptyIcon={<FileText size={28}/>}
        emptyTitle="No tenders found"
        emptyDescription="Create a new tender to start tracking your pipeline."
        emptyAction={isAdmin ? (
          <Button variant="primary" size="sm" onClick={() => setModal(true)}>
            <Plus size={14}/> New Tender
          </Button>
        ) : undefined}
      />

      <TenderModal
        open={modal}
        onClose={() => setModal(false)}
        onSaved={t => setTenders(prev => [t, ...prev])}
      />
    </div>
  )
}
