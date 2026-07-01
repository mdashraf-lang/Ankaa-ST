"use client"

import * as React from "react"
import {
  Plus, Rows, SquaresFour, Briefcase, ListChecks,
  Pencil, Trash, X, Warning, ArrowRight,
} from "@phosphor-icons/react"
import Link from "next/link"
import { toast }           from "sonner"
import { PageHeader }      from "@/components/ui/page-header"
import { Button }          from "@/components/ui/button"
import { Modal }           from "@/components/ui/modal"
import { Input, Textarea } from "@/components/ui/input"
import { DataTable }       from "@/components/ui/data-table"
import { StatusBadge }     from "@/components/ui/status-badge"
import { apiFetch }        from "@/lib/api"
import { formatDate }      from "@/lib/utils"
import { useAuth }         from "@/contexts/AuthContext"
import type { ERPProject } from "@/lib/types"
import type { Column }     from "@/components/ui/data-table"

// ── Constants ─────────────────────────────────────────────────────────────────
type Section  = "all" | ERPProject["section"]
type ViewMode = "kanban" | "list"

const SECTION_LABELS: Record<ERPProject["section"], string> = {
  current:  "Current",
  expected: "Expected",
  research: "R&D",
  closing:  "Closing",
}
const SECTION_COLORS: Record<ERPProject["section"], { bg: string; color: string; border: string }> = {
  current:  { bg: "#EFF6FF", color: "#2563EB", border: "#BFDBFE" },
  expected: { bg: "#FFF8E6", color: "#D97706", border: "#FDE68A" },
  research: { bg: "#F5F3FF", color: "#7C3AED", border: "#DDD6FE" },
  closing:  { bg: "#ECFDF5", color: "#059669", border: "#A7F3D0" },
}
const STATUS_OPTS  = ["pending","in_progress","completed"]
const SECTION_OPTS = ["current","expected","research","closing"]
const PRIORITY_OPTS= ["low","medium","high","critical"]

interface ProjectForm {
  name: string; section: string; status: string; priority: string
  description: string; start_date: string; end_date: string
}
const BLANK: ProjectForm = {
  name:"", section:"current", status:"in_progress", priority:"medium",
  description:"", start_date:"", end_date:"",
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function progressColor(p: number) {
  if (p >= 100) return "#059669"
  if (p >= 60)  return "#1B2A5E"
  if (p >= 30)  return "#D97706"
  return "#DC2626"
}

function Skeleton() {
  return (
    <div className="flex flex-col gap-3">
      {[1,2,3].map(i => (
        <div key={i} className="h-[140px] rounded-[var(--radius-xl)] animate-pulse"
          style={{ background: "var(--surface-muted)" }} />
      ))}
    </div>
  )
}

// ── Project Card ──────────────────────────────────────────────────────────────
function ProjectCard({
  project, canEdit, onEdit, onDelete,
}: {
  project: ERPProject
  canEdit: boolean
  onEdit: () => void
  onDelete: () => void
}) {
  const sc   = SECTION_COLORS[project.section]
  const prog = project.progress ?? 0

  return (
    <div
      className="group relative flex flex-col rounded-[var(--radius-xl)] border overflow-hidden transition-all duration-200 hover:shadow-[0_6px_20px_rgba(0,0,0,.09)] hover:-translate-y-0.5"
      style={{ background: "var(--surface-base)", borderColor: "var(--surface-border)" }}
    >
      {/* Top colour strip */}
      <div className="h-1 flex-shrink-0" style={{ background: sc.color }} />

      <div className="flex flex-col flex-1 p-4 gap-2.5">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full mr-1.5"
              style={{ background: sc.bg, color: sc.color }}>
              {SECTION_LABELS[project.section]}
            </span>
            <h3 className="text-[13px] font-bold mt-1.5 leading-snug line-clamp-2"
              style={{ color: "var(--text-primary)" }}>
              {project.name}
            </h3>
          </div>
          {canEdit && (
            <div className="flex items-center gap-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={e => { e.stopPropagation(); onEdit() }}
                className="w-6 h-6 flex items-center justify-center rounded transition-colors hover:bg-[#EEF1F8]"
                style={{ color: "#1B2A5E" }}>
                <Pencil size={12} />
              </button>
              <button onClick={e => { e.stopPropagation(); onDelete() }}
                className="w-6 h-6 flex items-center justify-center rounded transition-colors hover:bg-[#FFF0F0]"
                style={{ color: "#DC2626" }}>
                <Trash size={12} />
              </button>
            </div>
          )}
        </div>

        {/* Description */}
        {project.description && (
          <p className="text-[11px] leading-relaxed line-clamp-2" style={{ color: "var(--text-muted)" }}>
            {project.description}
          </p>
        )}

        {/* Progress */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <StatusBadge status={project.status} />
            <span className="text-[11px] font-bold tabular-nums" style={{ color: progressColor(prog) }}>
              {prog}%
            </span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--surface-muted)" }}>
            <div className="h-full rounded-full transition-all duration-500"
              style={{ width: `${prog}%`, background: progressColor(prog) }} />
          </div>
        </div>

        {/* Dates */}
        <div className="flex items-center justify-between text-[10px]" style={{ color: "var(--text-disabled)" }}>
          <span>{project.start_date ? formatDate(project.start_date) : "—"}</span>
          {project.end_date && <span>→ {formatDate(project.end_date)}</span>}
        </div>

        {/* CTA */}
        <div className="flex items-center gap-2 pt-1.5 border-t mt-auto"
          style={{ borderColor: "var(--surface-border)" }}>
          <Link href={`/projects/${project.id}`}
            className="flex items-center gap-1 text-[11px] font-semibold flex-1 hover:opacity-80 transition-opacity"
            style={{ color: "#1B2A5E" }}
            onClick={e => e.stopPropagation()}>
            View Project <ArrowRight size={10} />
          </Link>
          <Link href={`/tasks/list?board=${project.id}`}
            className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-[var(--radius-sm)] hover:opacity-80"
            style={{ background: "#EEF1F8", color: "#1B2A5E" }}
            onClick={e => e.stopPropagation()}>
            <ListChecks size={10} /> Tasks
          </Link>
        </div>
      </div>
    </div>
  )
}

// ── Project Form Modal ────────────────────────────────────────────────────────
function ProjectModal({
  open, editing, defaultSection, onClose, onSaved,
}: {
  open: boolean
  editing: ERPProject | null
  defaultSection?: ERPProject["section"]
  onClose: () => void
  onSaved: (p: ERPProject) => void
}) {
  const [form,    setForm]    = React.useState<ProjectForm>(BLANK)
  const [saving,  setSaving]  = React.useState(false)
  const [error,   setError]   = React.useState<string|null>(null)

  React.useEffect(() => {
    if (!open) return
    setError(null)
    if (editing) {
      setForm({
        name:        editing.name,
        section:     editing.section,
        status:      editing.status,
        priority:    editing.priority ?? "medium",
        description: editing.description ?? "",
        start_date:  editing.start_date ?? "",
        end_date:    editing.end_date ?? "",
      })
    } else {
      setForm({ ...BLANK, section: defaultSection ?? "current" })
    }
  }, [open, editing, defaultSection])

  async function handleSave() {
    if (!form.name.trim()) { setError("Project name is required"); return }
    setSaving(true); setError(null)
    try {
      const payload = {
        name:        form.name.trim(),
        section:     form.section,
        status:      form.status,
        priority:    form.priority,
        description: form.description.trim() || null,
        start_date:  form.start_date || null,
        end_date:    form.end_date   || null,
      }
      let result: ERPProject
      if (editing) {
        const r = await apiFetch<{ project: ERPProject }>(`/api/projects/${editing.id}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        result = r.project
      } else {
        const r = await apiFetch<{ project: ERPProject }>("/api/projects", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        result = r.project
      }
      onSaved(result)
      toast.success(editing ? "Project updated" : "Project created")
      onClose()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save")
    } finally { setSaving(false) }
  }

  const sel = (k: keyof ProjectForm, v: string) => setForm(f => ({ ...f, [k]: v }))

  return (
    <Modal
      open={open}
      onOpenChange={v => !v && onClose()}
      title={editing ? "Edit Project" : "New Project"}
      description={editing ? "Update project details." : "Create a new project to track tasks, risks, and milestones."}
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button variant="primary" size="sm" loading={saving} onClick={handleSave}>
            {editing ? "Save Changes" : "Create Project"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-[var(--radius-md)] text-sm"
            style={{ background: "#FFF0F0", color: "#DC2626", border: "1px solid #FECACA" }}>
            <Warning size={14} /> {error}
          </div>
        )}

        <Input label="Project Name *" value={form.name}
          onChange={e => sel("name", e.target.value)}
          placeholder="e.g. OIFC Survey, Website Redesign…" autoFocus />

        {/* Section + Status */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Section", key: "section" as const, opts: SECTION_OPTS,
              labels: { current:"Current", expected:"Expected", research:"R&D", closing:"Closing" } },
            { label: "Status",  key: "status" as const,  opts: STATUS_OPTS,
              labels: { pending:"Pending", in_progress:"In Progress", completed:"Completed" } },
          ].map(({ label, key, opts, labels }) => (
            <div key={key} className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{label}</label>
              <select value={form[key]} onChange={e => sel(key, e.target.value)}
                className="h-10 px-3 text-sm rounded-[var(--radius-md)] border"
                style={{ background: "var(--surface-base)", borderColor: "var(--surface-border)", color: "var(--text-primary)", outline: "none" }}>
                {opts.map(o => <option key={o} value={o}>{(labels as unknown as Record<string,string>)[o]}</option>)}
              </select>
            </div>
          ))}
        </div>

        {/* Priority + Start Date + End Date */}
        <div className="grid grid-cols-3 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Priority</label>
            <select value={form.priority} onChange={e => sel("priority", e.target.value)}
              className="h-10 px-3 text-sm rounded-[var(--radius-md)] border capitalize"
              style={{ background: "var(--surface-base)", borderColor: "var(--surface-border)", color: "var(--text-primary)", outline: "none" }}>
              {PRIORITY_OPTS.map(o => <option key={o} value={o} className="capitalize">{o}</option>)}
            </select>
          </div>
          <Input label="Start Date" type="date" value={form.start_date}
            onChange={e => sel("start_date", e.target.value)} />
          <Input label="End Date" type="date" value={form.end_date}
            onChange={e => sel("end_date", e.target.value)} />
        </div>

        <Textarea label="Description (optional)" value={form.description}
          onChange={e => sel("description", e.target.value)}
          placeholder="What is this project about?" rows={2} />
      </div>
    </Modal>
  )
}

// ── Delete Confirm ────────────────────────────────────────────────────────────
function DeleteConfirm({
  project, onCancel, onDeleted,
}: {
  project: ERPProject
  onCancel: () => void
  onDeleted: (id: string) => void
}) {
  const [busy, setBusy] = React.useState(false)
  async function go() {
    setBusy(true)
    try {
      await apiFetch(`/api/projects/${project.id}`, { method: "DELETE" })
      onDeleted(project.id)
      toast.success(`"${project.name}" deleted`)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Delete failed")
    } finally { setBusy(false) }
  }
  return (
    <Modal open onOpenChange={v => !v && onCancel()}
      title="Delete Project"
      description={`Delete "${project.name}"? All tasks, risks, and data will be permanently removed.`}
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onCancel} disabled={busy}>Cancel</Button>
          <Button size="sm" loading={busy} onClick={go}
            style={{ background: "#DC2626", color: "#fff", border: "none" }}>Delete</Button>
        </>
      }>{null}</Modal>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
//  PAGE
// ═════════════════════════════════════════════════════════════════════════════
export default function ProjectsPage() {
  const { user }  = useAuth()
  const isAdmin   = ["admin","md","ceo","cto","coo"].includes(user?.role ?? "")

  const [activeSection, setActiveSection] = React.useState<Section>("all")
  const [viewMode,      setViewMode]      = React.useState<ViewMode>("kanban")
  const [projects,      setProjects]      = React.useState<ERPProject[]>([])
  const [loading,       setLoading]       = React.useState(true)

  // Modals
  const [modal,          setModal]         = React.useState(false)
  const [editing,        setEditing]       = React.useState<ERPProject|null>(null)
  const [defaultSection, setDefaultSec]   = React.useState<ERPProject["section"]>("current")
  const [deleteTarget,   setDeleteTarget] = React.useState<ERPProject|null>(null)

  // ── Load ──────────────────────────────────────────────────────────────────
  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const r = await apiFetch<{ projects: ERPProject[] }>("/api/projects")
      setProjects(r.projects ?? [])
    } catch { toast.error("Failed to load projects") }
    finally { setLoading(false) }
  }, [])

  React.useEffect(() => { load() }, [load])

  // ── Derived ───────────────────────────────────────────────────────────────
  const grouped = React.useMemo(() => {
    const g: Record<ERPProject["section"], ERPProject[]> = {
      current: [], expected: [], research: [], closing: [],
    }
    projects.forEach(p => g[p.section]?.push(p))
    return g
  }, [projects])

  const filteredProjects = activeSection === "all"
    ? projects
    : projects.filter(p => p.section === activeSection)

  const tabs: { key: Section; label: string }[] = [
    { key: "all",      label: "All" },
    { key: "current",  label: "Current" },
    { key: "expected", label: "Expected" },
    { key: "research", label: "R&D" },
    { key: "closing",  label: "Closing" },
  ]

  // ── Handlers ──────────────────────────────────────────────────────────────
  function onSaved(p: ERPProject) {
    setProjects(prev => {
      const idx = prev.findIndex(x => x.id === p.id)
      if (idx >= 0) { const n = [...prev]; n[idx] = p; return n }
      return [p, ...prev]
    })
  }
  function onDeleted(id: string) {
    setProjects(prev => prev.filter(p => p.id !== id))
    setDeleteTarget(null)
  }
  function openNew(sec?: ERPProject["section"]) { setEditing(null); setDefaultSec(sec ?? "current"); setModal(true) }
  function openEdit(p: ERPProject)              { setEditing(p);    setModal(true) }

  // ── List columns ──────────────────────────────────────────────────────────
  const columns: Column<ERPProject>[] = [
    {
      key: "name", header: "Project Name", sortable: true,
      render: (v, row) => (
        <Link href={`/projects/${(row as ERPProject).id}`}
          className="font-semibold hover:underline" style={{ color: "var(--text-primary)" }}>
          {v as string}
        </Link>
      ),
    },
    {
      key: "section", header: "Section",
      render: v => {
        const sc = SECTION_COLORS[v as ERPProject["section"]]
        return (
          <span className="text-xs px-2 py-0.5 rounded-full font-medium"
            style={{ background: sc.bg, color: sc.color }}>
            {SECTION_LABELS[v as ERPProject["section"]]}
          </span>
        )
      },
    },
    { key: "status",   header: "Status",   render: v => <StatusBadge status={v as string} /> },
    {
      key: "progress", header: "Progress",
      render: v => (
        <div className="flex items-center gap-2 min-w-[100px]">
          <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--surface-muted)" }}>
            <div className="h-full rounded-full" style={{ width: `${v}%`, background: progressColor(v as number) }} />
          </div>
          <span className="text-xs tabular-nums w-8 text-right" style={{ color: "var(--text-muted)" }}>{v as number}%</span>
        </div>
      ),
    },
    { key: "start_date", header: "Start", render: v => v ? formatDate(v as string) : "—" },
    { key: "end_date",   header: "End",   render: v => v ? formatDate(v as string) : "—" },
    {
      key: "id", header: "",
      render: (v, row) => (
        <div className="flex items-center gap-1">
          <Link href={`/projects/${v}`}
            className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-[var(--radius-sm)] hover:bg-[#EEF1F8] transition-colors"
            style={{ color: "#1B2A5E" }}>
            View
          </Link>
          {isAdmin && (
            <>
              <button onClick={() => openEdit(row as ERPProject)}
                className="w-6 h-6 flex items-center justify-center rounded hover:bg-[#EEF1F8]"
                style={{ color: "#1B2A5E" }}>
                <Pencil size={12} />
              </button>
              <button onClick={() => setDeleteTarget(row as ERPProject)}
                className="w-6 h-6 flex items-center justify-center rounded hover:bg-[#FFF0F0]"
                style={{ color: "#DC2626" }}>
                <Trash size={12} />
              </button>
            </>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <PageHeader
        title="Projects"
        actions={
          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex items-center rounded-[var(--radius-md)] border p-0.5"
              style={{ borderColor: "var(--surface-border)" }}>
              {(["kanban","list"] as ViewMode[]).map(m => (
                <button key={m} onClick={() => setViewMode(m)}
                  className="flex items-center justify-center w-8 h-7 rounded-[var(--radius-sm)] transition-colors"
                  style={{
                    background: viewMode === m ? "var(--brand-navy)" : "transparent",
                    color:      viewMode === m ? "white" : "var(--text-muted)",
                  }}>
                  {m === "kanban" ? <SquaresFour size={15}/> : <Rows size={15}/>}
                </button>
              ))}
            </div>
            <Button variant="primary" size="md" onClick={() => openNew()}>
              <Plus size={16} /> New Project
            </Button>
          </div>
        }
      />

      {/* Section tabs */}
      <div className="flex border-b" style={{ borderColor: "var(--surface-border)" }}>
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => setActiveSection(tab.key)}
            className="px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors"
            style={{
              borderColor: activeSection === tab.key ? "var(--brand-navy)" : "transparent",
              color:       activeSection === tab.key ? "var(--brand-navy)" : "var(--text-muted)",
            }}>
            {tab.label}
            {tab.key !== "all" && (
              <span className="ml-1.5 text-xs" style={{ color: "var(--text-disabled)" }}>
                ({grouped[tab.key as ERPProject["section"]]?.length ?? 0})
              </span>
            )}
          </button>
        ))}
        <div className="ml-auto flex items-center pr-1 pb-px">
          <span className="text-xs" style={{ color: "var(--text-disabled)" }}>
            {filteredProjects.length} project{filteredProjects.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        viewMode === "kanban" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {(["current","expected","research","closing"] as const).map(s => (
              <div key={s} className="flex flex-col gap-3">
                <div className="h-5 w-20 rounded animate-pulse" style={{ background: "var(--surface-muted)" }}/>
                <Skeleton />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="h-12 rounded-[var(--radius-lg)] animate-pulse"
                style={{ background: "var(--surface-muted)" }}/>
            ))}
          </div>
        )
      ) : viewMode === "kanban" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {(["current","expected","research","closing"] as const).map(section => {
            if (activeSection !== "all" && section !== activeSection) return null
            const list = grouped[section]
            return (
              <div key={section} className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
                    {SECTION_LABELS[section]}
                  </h3>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs px-2 py-0.5 rounded-full"
                      style={{ background: "var(--surface-muted)", color: "var(--text-muted)" }}>
                      {list.length}
                    </span>
                    {isAdmin && (
                      <button onClick={() => openNew(section)}
                        title={`Add ${SECTION_LABELS[section]} project`}
                        className="w-5 h-5 flex items-center justify-center rounded hover:bg-[#EEF1F8] transition-colors"
                        style={{ color: "var(--text-muted)" }}>
                        <Plus size={12}/>
                      </button>
                    )}
                  </div>
                </div>
                <div className="rounded-[var(--radius-lg)] p-2 flex flex-col gap-2 min-h-[200px]"
                  style={{ background: "var(--surface-muted)" }}>
                  {list.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center py-8">
                      <p className="text-xs" style={{ color: "var(--text-disabled)" }}>No projects</p>
                    </div>
                  ) : (
                    list.map(p => (
                      <ProjectCard key={p.id} project={p}
                        canEdit={isAdmin}
                        onEdit={() => openEdit(p)}
                        onDelete={() => setDeleteTarget(p)} />
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={filteredProjects}
          loading={false}
          emptyIcon={<Briefcase size={28} />}
          emptyTitle="No projects found"
          emptyDescription="Create a new project to get started."
          emptyAction={<Button variant="primary" size="sm" onClick={() => openNew()}><Plus size={14}/>New Project</Button>}
        />
      )}

      {/* Modals */}
      <ProjectModal
        open={modal}
        editing={editing}
        defaultSection={defaultSection}
        onClose={() => { setModal(false); setEditing(null) }}
        onSaved={onSaved}
      />
      {deleteTarget && (
        <DeleteConfirm
          project={deleteTarget}
          onCancel={() => setDeleteTarget(null)}
          onDeleted={onDeleted}
        />
      )}
    </div>
  )
}
