"use client"

import * as React from "react"
import Link from "next/link"
import { use } from "react"
import {
  ArrowLeft, Warning, ArrowsClockwise, CheckSquare, Users,
  Plus, Pencil, Trash, X,
} from "@phosphor-icons/react"
import { toast } from "sonner"
import { PageHeader }   from "@/components/ui/page-header"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { StatusBadge }  from "@/components/ui/status-badge"
import { Button }       from "@/components/ui/button"
import { Modal }        from "@/components/ui/modal"
import { Input, Textarea } from "@/components/ui/input"
import { DataTable }    from "@/components/ui/data-table"
import { EmptyState }   from "@/components/ui/empty-state"
import { formatDate }   from "@/lib/utils"
import { apiFetch }     from "@/lib/api"
import { useAuth }      from "@/contexts/AuthContext"
import type { ERPProject, ProjectRisk, ChangeRequest, ActionItem } from "@/lib/types"
import type { Column }  from "@/components/ui/data-table"

type TabKey = "overview" | "risks" | "changes" | "actions" | "team"

interface Member {
  id: string; user_id: string; role: string
  profiles: { id: string; full_name: string | null; email: string; avatar_url: string | null; role: string } | null
}

// ── Risk Modal ────────────────────────────────────────────────────────────────
function RiskModal({
  open, projectId, editing, onClose, onSaved,
}: {
  open: boolean; projectId: string; editing: ProjectRisk | null
  onClose: () => void; onSaved: (r: ProjectRisk) => void
}) {
  const [form, setForm] = React.useState({ title:"", level:"medium", status:"open", owner:"", mitigation:"", description:"" })
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    if (!open) return
    if (editing) {
      setForm({ title: editing.title, level: editing.level, status: editing.status,
        owner: editing.owner ?? "", mitigation: editing.mitigation ?? "", description: "" })
    } else {
      setForm({ title:"", level:"medium", status:"open", owner:"", mitigation:"", description:"" })
    }
  }, [open, editing])

  async function save() {
    if (!form.title.trim()) { toast.error("Title required"); return }
    setSaving(true)
    try {
      const url    = editing ? `/api/projects/${projectId}/risks/${editing.id}` : `/api/projects/${projectId}/risks`
      const method = editing ? "PATCH" : "POST"
      const r = await apiFetch<{ risk: ProjectRisk }>(url, {
        method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
      })
      onSaved(r.risk)
      toast.success(editing ? "Risk updated" : "Risk added")
      onClose()
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Failed") }
    finally { setSaving(false) }
  }

  const s = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  return (
    <Modal open={open} onOpenChange={v => !v && onClose()}
      title={editing ? "Edit Risk" : "Add Risk"}
      footer={<>
        <Button variant="secondary" size="sm" onClick={onClose} disabled={saving}>Cancel</Button>
        <Button variant="primary" size="sm" loading={saving} onClick={save}>{editing ? "Save" : "Add Risk"}</Button>
      </>}>
      <div className="flex flex-col gap-3">
        <Input label="Title *" value={form.title} onChange={e => s("title", e.target.value)} autoFocus />
        <div className="grid grid-cols-2 gap-3">
          {[
            { label:"Level", key:"level", opts:["low","medium","high","critical"] },
            { label:"Status", key:"status", opts:["open","mitigated","closed"] },
          ].map(({ label, key, opts }) => (
            <div key={key} className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider" style={{ color:"var(--text-muted)" }}>{label}</label>
              <select value={(form as Record<string,string>)[key]} onChange={e => s(key, e.target.value)}
                className="h-10 px-3 text-sm rounded-[var(--radius-md)] border capitalize"
                style={{ background:"var(--surface-base)", borderColor:"var(--surface-border)", color:"var(--text-primary)" }}>
                {opts.map(o => <option key={o} value={o} className="capitalize">{o}</option>)}
              </select>
            </div>
          ))}
        </div>
        <Input label="Owner" value={form.owner} onChange={e => s("owner", e.target.value)} placeholder="Person responsible" />
        <Textarea label="Mitigation" value={form.mitigation} onChange={e => s("mitigation", e.target.value)} rows={2} />
      </div>
    </Modal>
  )
}

// ── Change Request Modal ──────────────────────────────────────────────────────
function ChangeModal({
  open, projectId, editing, onClose, onSaved,
}: {
  open: boolean; projectId: string; editing: ChangeRequest | null
  onClose: () => void; onSaved: (c: ChangeRequest) => void
}) {
  const [form, setForm] = React.useState({ title:"", requester:"", status:"pending", impact:"medium", description:"" })
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    if (!open) return
    if (editing) {
      setForm({ title: editing.title, requester: editing.requester,
        status: editing.status, impact: editing.impact, description: editing.description ?? "" })
    } else {
      setForm({ title:"", requester:"", status:"pending", impact:"medium", description:"" })
    }
  }, [open, editing])

  async function save() {
    if (!form.title.trim() || !form.requester.trim()) { toast.error("Title and requester required"); return }
    setSaving(true)
    try {
      const url    = editing ? `/api/projects/${projectId}/changes/${editing.id}` : `/api/projects/${projectId}/changes`
      const method = editing ? "PATCH" : "POST"
      const r = await apiFetch<{ change: ChangeRequest }>(url, {
        method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
      })
      onSaved(r.change)
      toast.success(editing ? "Updated" : "Change request added")
      onClose()
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Failed") }
    finally { setSaving(false) }
  }

  const s = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  return (
    <Modal open={open} onOpenChange={v => !v && onClose()}
      title={editing ? "Edit Change Request" : "New Change Request"}
      footer={<>
        <Button variant="secondary" size="sm" onClick={onClose} disabled={saving}>Cancel</Button>
        <Button variant="primary" size="sm" loading={saving} onClick={save}>{editing ? "Save" : "Submit"}</Button>
      </>}>
      <div className="flex flex-col gap-3">
        <Input label="Title *" value={form.title} onChange={e => s("title", e.target.value)} autoFocus />
        <Input label="Requester *" value={form.requester} onChange={e => s("requester", e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          {[
            { label:"Status", key:"status", opts:["pending","approved","rejected"] },
            { label:"Impact", key:"impact", opts:["low","medium","high"] },
          ].map(({ label, key, opts }) => (
            <div key={key} className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider" style={{ color:"var(--text-muted)" }}>{label}</label>
              <select value={(form as Record<string,string>)[key]} onChange={e => s(key, e.target.value)}
                className="h-10 px-3 text-sm rounded-[var(--radius-md)] border capitalize"
                style={{ background:"var(--surface-base)", borderColor:"var(--surface-border)", color:"var(--text-primary)" }}>
                {opts.map(o => <option key={o} value={o} className="capitalize">{o}</option>)}
              </select>
            </div>
          ))}
        </div>
        <Textarea label="Description" value={form.description} onChange={e => s("description", e.target.value)} rows={2} />
      </div>
    </Modal>
  )
}

// ── Action Item Modal ─────────────────────────────────────────────────────────
function ActionModal({
  open, projectId, editing, onClose, onSaved,
}: {
  open: boolean; projectId: string; editing: ActionItem | null
  onClose: () => void; onSaved: (a: ActionItem) => void
}) {
  const [form, setForm] = React.useState({ title:"", status:"open", due_date:"", description:"" })
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    if (!open) return
    if (editing) {
      setForm({ title: editing.title, status: editing.status, due_date: editing.due_date ?? "", description: "" })
    } else {
      setForm({ title:"", status:"open", due_date:"", description:"" })
    }
  }, [open, editing])

  async function save() {
    if (!form.title.trim()) { toast.error("Title required"); return }
    setSaving(true)
    try {
      const url    = editing ? `/api/projects/${projectId}/actions/${editing.id}` : `/api/projects/${projectId}/actions`
      const method = editing ? "PATCH" : "POST"
      const r = await apiFetch<{ action: ActionItem }>(url, {
        method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
      })
      onSaved(r.action)
      toast.success(editing ? "Updated" : "Action item added")
      onClose()
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Failed") }
    finally { setSaving(false) }
  }

  const s = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  return (
    <Modal open={open} onOpenChange={v => !v && onClose()}
      title={editing ? "Edit Action Item" : "New Action Item"}
      footer={<>
        <Button variant="secondary" size="sm" onClick={onClose} disabled={saving}>Cancel</Button>
        <Button variant="primary" size="sm" loading={saving} onClick={save}>{editing ? "Save" : "Add"}</Button>
      </>}>
      <div className="flex flex-col gap-3">
        <Input label="Title *" value={form.title} onChange={e => s("title", e.target.value)} autoFocus />
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider" style={{ color:"var(--text-muted)" }}>Status</label>
            <select value={form.status} onChange={e => s("status", e.target.value)}
              className="h-10 px-3 text-sm rounded-[var(--radius-md)] border capitalize"
              style={{ background:"var(--surface-base)", borderColor:"var(--surface-border)", color:"var(--text-primary)" }}>
              {["open","in_progress","completed"].map(o => <option key={o} value={o} className="capitalize">{o.replace("_"," ")}</option>)}
            </select>
          </div>
          <Input label="Due Date" type="date" value={form.due_date} onChange={e => s("due_date", e.target.value)} />
        </div>
        <Textarea label="Description" value={form.description} onChange={e => s("description", e.target.value)} rows={2} />
      </div>
    </Modal>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
//  PAGE
// ═════════════════════════════════════════════════════════════════════════════
export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id }   = use(params)
  const { user } = useAuth()
  const isAdmin  = ["admin","md","ceo","cto","coo","super_admin"].includes(user?.role ?? "")

  const [activeTab,  setActiveTab]  = React.useState<TabKey>("overview")
  const [project,    setProject]    = React.useState<ERPProject | null>(null)
  const [members,    setMembers]    = React.useState<Member[]>([])
  const [risks,      setRisks]      = React.useState<ProjectRisk[]>([])
  const [changes,    setChanges]    = React.useState<ChangeRequest[]>([])
  const [actions,    setActions]    = React.useState<ActionItem[]>([])
  const [loading,    setLoading]    = React.useState(true)
  const [notFound,   setNotFound]   = React.useState(false)

  // Modal state
  const [riskModal,    setRiskModal]    = React.useState(false)
  const [changeModal,  setChangeModal]  = React.useState(false)
  const [actionModal,  setActionModal]  = React.useState(false)
  const [editingRisk,   setEditingRisk]   = React.useState<ProjectRisk | null>(null)
  const [editingChange, setEditingChange] = React.useState<ChangeRequest | null>(null)
  const [editingAction, setEditingAction] = React.useState<ActionItem | null>(null)

  // ── Load ──────────────────────────────────────────────────────────────────
  React.useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const r = await apiFetch<{
          project: ERPProject; members: Member[]
          risks: ProjectRisk[]; changes: ChangeRequest[]; actions: ActionItem[]
        }>(`/api/projects/${id}`)
        setProject(r.project)
        setMembers(r.members  ?? [])
        setRisks(r.risks      ?? [])
        setChanges(r.changes  ?? [])
        setActions(r.actions  ?? [])
      } catch (e: unknown) {
        if (e instanceof Error && e.message.includes("404")) setNotFound(true)
        else toast.error("Failed to load project")
      } finally { setLoading(false) }
    }
    load()
  }, [id])

  const tabs: { key: TabKey; label: string; count?: number }[] = [
    { key: "overview", label: "Overview" },
    { key: "risks",    label: "Risks",           count: risks.length },
    { key: "changes",  label: "Change Requests",  count: changes.length },
    { key: "actions",  label: "Action Items",     count: actions.length },
    { key: "team",     label: "Team",             count: members.length },
  ]

  // ── Risk columns ──────────────────────────────────────────────────────────
  const riskColumns: Column<ProjectRisk>[] = [
    { key: "title",      header: "Risk",       sortable: true },
    { key: "level",      header: "Level",      render: v => <StatusBadge status={v as string} /> },
    { key: "owner",      header: "Owner",      render: v => (v as string | null) ?? "—" },
    { key: "status",     header: "Status",     render: v => <StatusBadge status={v as string} /> },
    { key: "mitigation", header: "Mitigation", render: v => (v as string | null) ?? "—" },
    ...(isAdmin ? [{
      key: "id" as keyof ProjectRisk, header: "",
      render: (_v: unknown, row: ProjectRisk) => (
        <div className="flex items-center gap-1">
          <button onClick={() => { setEditingRisk(row); setRiskModal(true) }}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-[#EEF1F8]"
            style={{ color: "#1B2A5E" }}><Pencil size={12} /></button>
        </div>
      ),
    }] : []),
  ]

  const changeColumns: Column<ChangeRequest>[] = [
    { key: "title",      header: "Title",     sortable: true },
    { key: "requester",  header: "Requester" },
    { key: "status",     header: "Status",    render: v => <StatusBadge status={v as string} /> },
    { key: "impact",     header: "Impact",    render: v => <StatusBadge status={v as string} /> },
    { key: "created_at", header: "Submitted", render: v => formatDate(v as string) },
    ...(isAdmin ? [{
      key: "id" as keyof ChangeRequest, header: "",
      render: (_v: unknown, row: ChangeRequest) => (
        <button onClick={() => { setEditingChange(row); setChangeModal(true) }}
          className="w-6 h-6 flex items-center justify-center rounded hover:bg-[#EEF1F8]"
          style={{ color: "#1B2A5E" }}><Pencil size={12} /></button>
      ),
    }] : []),
  ]

  const actionColumns: Column<ActionItem>[] = [
    { key: "title",    header: "Action Item", sortable: true },
    { key: "due_date", header: "Due Date",    render: v => v ? formatDate(v as string) : "—" },
    { key: "status",   header: "Status",      render: v => <StatusBadge status={v as string} /> },
    ...(isAdmin ? [{
      key: "id" as keyof ActionItem, header: "",
      render: (_v: unknown, row: ActionItem) => (
        <button onClick={() => { setEditingAction(row); setActionModal(true) }}
          className="w-6 h-6 flex items-center justify-center rounded hover:bg-[#EEF1F8]"
          style={{ color: "#1B2A5E" }}><Pencil size={12} /></button>
      ),
    }] : []),
  ]

  function progressColor(p: number) {
    if (p >= 100) return "#059669"
    if (p >= 60)  return "#1B2A5E"
    if (p >= 30)  return "#D97706"
    return "#DC2626"
  }

  // ── Skeleton ──────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="flex flex-col gap-6">
      <div className="h-10 w-48 rounded-[var(--radius-md)] animate-pulse" style={{ background:"var(--surface-muted)" }}/>
      <div className="grid grid-cols-3 gap-6">
        {[1,2,3].map(i => <div key={i} className="h-40 rounded-[var(--radius-xl)] animate-pulse" style={{ background:"var(--surface-muted)" }}/>)}
      </div>
    </div>
  )

  if (notFound) return (
    <div className="flex flex-col gap-4">
      <Link href="/projects" className="flex items-center gap-1.5 text-sm hover:underline" style={{ color:"var(--text-muted)" }}>
        <ArrowLeft size={14}/> Back to Projects
      </Link>
      <EmptyState icon={<Warning size={32}/>} title="Project not found" description="This project doesn't exist or you don't have access." />
    </div>
  )

  const prog = project?.progress ?? 0

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={project?.name ?? "Project Details"}
        breadcrumb={
          <Link href="/projects" className="flex items-center gap-1.5 text-sm hover:underline" style={{ color:"var(--text-muted)" }}>
            <ArrowLeft size={14}/> Back to Projects
          </Link>
        }
        actions={project ? <StatusBadge status={project.status} /> : undefined}
      />

      {/* Tabs */}
      <div className="flex border-b" style={{ borderColor:"var(--surface-border)" }}>
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className="px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors"
            style={{
              borderColor: activeTab === tab.key ? "var(--brand-navy)" : "transparent",
              color:       activeTab === tab.key ? "var(--brand-navy)" : "var(--text-muted)",
            }}>
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className="ml-1.5 text-xs" style={{ color:"var(--text-disabled)" }}>({tab.count})</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Overview ─────────────────────────────────────────────────────── */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 flex flex-col gap-4">
            <Card>
              <CardHeader><CardTitle>Project Details</CardTitle></CardHeader>
              <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                {[
                  { label:"Section",    value: project?.section },
                  { label:"Status",     value: project?.status,     isBadge: true },
                  { label:"Priority",   value: project?.priority },
                  { label:"Department", value: project?.department_id ?? "—" },
                  { label:"Start Date", value: project?.start_date ? formatDate(project.start_date) : "—" },
                  { label:"End Date",   value: project?.end_date   ? formatDate(project.end_date)   : "—" },
                ].map(f => (
                  <div key={f.label} className="flex flex-col gap-0.5">
                    <span className="text-xs font-medium" style={{ color:"var(--text-muted)" }}>{f.label}</span>
                    {f.isBadge && f.value
                      ? <StatusBadge status={f.value} />
                      : <span className="text-sm capitalize" style={{ color:"var(--text-primary)" }}>{f.value ?? "—"}</span>}
                  </div>
                ))}
              </div>
              {project?.description && (
                <p className="mt-4 text-sm leading-relaxed" style={{ color:"var(--text-secondary)" }}>
                  {project.description}
                </p>
              )}
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Overall Progress</CardTitle>
                <span className="text-2xl font-bold tabular-nums" style={{ color: progressColor(prog) }}>{prog}%</span>
              </CardHeader>
              <div className="h-3 rounded-full overflow-hidden" style={{ background:"var(--surface-muted)" }}>
                <div className="h-full rounded-full transition-all duration-500"
                  style={{ width:`${prog}%`, background: progressColor(prog) }} />
              </div>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle>Summary</CardTitle></CardHeader>
            <div className="flex flex-col gap-3">
              {[
                { label:"Risks",           value: risks.length },
                { label:"Change Requests", value: changes.length },
                { label:"Action Items",    value: actions.length },
                { label:"Team Members",    value: members.length },
              ].map(s => (
                <div key={s.label} className="flex items-center justify-between py-2 border-b last:border-0"
                  style={{ borderColor:"var(--surface-border)" }}>
                  <span className="text-sm" style={{ color:"var(--text-secondary)" }}>{s.label}</span>
                  <span className="text-sm font-semibold" style={{ color:"var(--text-primary)" }}>{s.value}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ── Risks ────────────────────────────────────────────────────────── */}
      {activeTab === "risks" && (
        <div className="flex flex-col gap-4">
          {isAdmin && (
            <div className="flex justify-end">
              <Button variant="primary" size="sm" onClick={() => { setEditingRisk(null); setRiskModal(true) }}>
                <Plus size={14}/> Add Risk
              </Button>
            </div>
          )}
          <DataTable
            columns={riskColumns} data={risks}
            emptyIcon={<Warning size={28}/>}
            emptyTitle="No risks identified"
            emptyDescription="Add risks to track potential issues and mitigations."
            emptyAction={isAdmin ? <Button variant="primary" size="sm" onClick={() => { setEditingRisk(null); setRiskModal(true) }}><Plus size={14}/>Add Risk</Button> : undefined}
          />
        </div>
      )}

      {/* ── Change Requests ───────────────────────────────────────────────── */}
      {activeTab === "changes" && (
        <div className="flex flex-col gap-4">
          {isAdmin && (
            <div className="flex justify-end">
              <Button variant="primary" size="sm" onClick={() => { setEditingChange(null); setChangeModal(true) }}>
                <Plus size={14}/> New Change Request
              </Button>
            </div>
          )}
          <DataTable
            columns={changeColumns} data={changes}
            emptyIcon={<ArrowsClockwise size={28}/>}
            emptyTitle="No change requests"
            emptyDescription="Change requests for this project will appear here."
            emptyAction={isAdmin ? <Button variant="primary" size="sm" onClick={() => { setEditingChange(null); setChangeModal(true) }}><Plus size={14}/>New</Button> : undefined}
          />
        </div>
      )}

      {/* ── Action Items ──────────────────────────────────────────────────── */}
      {activeTab === "actions" && (
        <div className="flex flex-col gap-4">
          {isAdmin && (
            <div className="flex justify-end">
              <Button variant="primary" size="sm" onClick={() => { setEditingAction(null); setActionModal(true) }}>
                <Plus size={14}/> Add Action Item
              </Button>
            </div>
          )}
          <DataTable
            columns={actionColumns} data={actions}
            emptyIcon={<CheckSquare size={28}/>}
            emptyTitle="No action items"
            emptyDescription="Action items assigned in this project will appear here."
            emptyAction={isAdmin ? <Button variant="primary" size="sm" onClick={() => { setEditingAction(null); setActionModal(true) }}><Plus size={14}/>Add</Button> : undefined}
          />
        </div>
      )}

      {/* ── Team ─────────────────────────────────────────────────────────── */}
      {activeTab === "team" && (
        <Card>
          <CardHeader><CardTitle>Project Team</CardTitle></CardHeader>
          {members.length === 0 ? (
            <EmptyState icon={<Users size={28}/>} title="No team members" description="Assign team members to this project." />
          ) : (
            <div className="flex flex-col divide-y" style={{ borderColor:"var(--surface-border)" }}>
              {members.map(m => (
                <div key={m.id} className="flex items-center gap-3 py-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                    style={{ background:"#1B2A5E" }}>
                    {(m.profiles?.full_name ?? m.profiles?.email ?? "?")[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color:"var(--text-primary)" }}>
                      {m.profiles?.full_name ?? m.profiles?.email}
                    </p>
                    <p className="text-xs capitalize" style={{ color:"var(--text-muted)" }}>{m.role}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Modals */}
      <RiskModal
        open={riskModal} projectId={id} editing={editingRisk}
        onClose={() => { setRiskModal(false); setEditingRisk(null) }}
        onSaved={r => setRisks(prev => {
          const i = prev.findIndex(x => x.id === r.id)
          if (i >= 0) { const n = [...prev]; n[i] = r; return n }
          return [r, ...prev]
        })}
      />
      <ChangeModal
        open={changeModal} projectId={id} editing={editingChange}
        onClose={() => { setChangeModal(false); setEditingChange(null) }}
        onSaved={c => setChanges(prev => {
          const i = prev.findIndex(x => x.id === c.id)
          if (i >= 0) { const n = [...prev]; n[i] = c; return n }
          return [c, ...prev]
        })}
      />
      <ActionModal
        open={actionModal} projectId={id} editing={editingAction}
        onClose={() => { setActionModal(false); setEditingAction(null) }}
        onSaved={a => setActions(prev => {
          const i = prev.findIndex(x => x.id === a.id)
          if (i >= 0) { const n = [...prev]; n[i] = a; return n }
          return [a, ...prev]
        })}
      />
    </div>
  )
}
