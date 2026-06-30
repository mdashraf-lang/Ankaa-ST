"use client"

import * as React from "react"
import { useSearchParams } from "next/navigation"
import {
  Plus, HouseSimple, FolderSimple, UserCirclePlus,
  SquaresFour, X, Warning, Users, Trash,
} from "@phosphor-icons/react"
import { toast }         from "sonner"
import { PageHeader }    from "@/components/ui/page-header"
import { Button }        from "@/components/ui/button"
import { Modal }         from "@/components/ui/modal"
import { Input, Textarea } from "@/components/ui/input"
import { KanbanBoard }   from "@/components/tasks/kanban-board"
import { apiFetch }      from "@/lib/api"
import { useAuth }       from "@/contexts/AuthContext"
import type { KanbanList, KanbanCard } from "@/lib/types"

// ── Types ─────────────────────────────────────────────────────────────────────
interface ApiProject {
  id: string; name: string; description: string | null
  section?: string; status?: string; created_at: string
  created_by?: string; member_role?: string
}
interface ApiList {
  id: string; project_id: string; title: string; position: number
  project_cards: ApiCard[]
}
interface ApiCard {
  id: string; list_id: string; project_id: string; title: string
  description: string | null; position: number; completed: boolean
  due_date: string | null; labels: string[] | null; priority?: string | null
  project_card_members?: { user_id: string; profiles: { id: string; full_name: string | null } | null }[]
}
interface ProjectMember {
  user_id: string; role: string
  profiles: { id: string; full_name: string | null; email: string } | null
}
interface AllUser {
  id: string; full_name: string | null; email: string
}

const PRIORITY_OPTIONS = [
  { value: "low",    label: "Low",    color: "#2563EB" },
  { value: "medium", label: "Medium", color: "#D97706" },
  { value: "high",   label: "High",   color: "#EA580C" },
  { value: "urgent", label: "Urgent", color: "#DC2626" },
]

function initials(name: string | null | undefined) {
  if (!name) return "?"
  return name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()
}

function MemberAvatar({ name, size = 28 }: { name: string | null | undefined; size?: number }) {
  return (
    <div
      className="rounded-full flex items-center justify-center font-bold flex-shrink-0 border-2"
      style={{
        width: size, height: size,
        fontSize: size * 0.32,
        background: "#1B2A5E",
        color: "#fff",
        borderColor: "var(--surface-base)",
      }}
      title={name ?? undefined}
    >
      {initials(name)}
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function MyTasksPage() {
  const { user }        = useAuth()
  const searchParams    = useSearchParams()

  // ── State ──────────────────────────────────────────────────────────────────
  const [loading,        setLoading]        = React.useState(true)
  const [boardLoading,   setBoardLoading]   = React.useState(false)
  const [projects,       setProjects]       = React.useState<ApiProject[]>([])
  const [selectedId,     setSelectedId]     = React.useState<string | null>(null)
  const [lists,          setLists]          = React.useState<KanbanList[]>([])
  const [cards,          setCards]          = React.useState<KanbanCard[]>([])
  const [members,        setMembers]        = React.useState<ProjectMember[]>([])
  const [allUsers,       setAllUsers]       = React.useState<AllUser[]>([])

  // ── New project modal ──────────────────────────────────────────────────────
  const [newProjModal,   setNewProjModal]   = React.useState(false)
  const [newProjName,    setNewProjName]    = React.useState("")
  const [newProjDesc,    setNewProjDesc]    = React.useState("")
  const [newProjMembers, setNewProjMembers] = React.useState<string[]>([])
  const [creatingProj,   setCreatingProj]   = React.useState(false)

  // ── Invite modal (add member to existing project) ──────────────────────────
  const [inviteModal,    setInviteModal]    = React.useState(false)
  const [inviteSearch,   setInviteSearch]   = React.useState("")
  const [inviting,       setInviting]       = React.useState(false)

  // ── Add task modal ─────────────────────────────────────────────────────────
  const [taskModal,      setTaskModal]      = React.useState<{ open: boolean; listId: string | null }>({ open: false, listId: null })
  const [taskTitle,      setTaskTitle]      = React.useState("")
  const [taskDue,        setTaskDue]        = React.useState("")
  const [taskPriority,   setTaskPriority]   = React.useState("medium")
  const [taskAssignee,   setTaskAssignee]   = React.useState("")
  const [addingTask,     setAddingTask]     = React.useState(false)

  const selectedProject = projects.find(p => p.id === selectedId)
  const isPersonal      = selectedProject?.section === "personal"
  const isOwner         = selectedProject?.created_by === user?.id || selectedProject?.member_role === "owner"

  // ── Load projects + personal board ────────────────────────────────────────
  const loadProjects = React.useCallback(async () => {
    setLoading(true)
    try {
      const [projRes, usersRes] = await Promise.allSettled([
        apiFetch<{ projects: ApiProject[] }>("/api/projects"),
        apiFetch<{ users: AllUser[] }>("/api/users"),
      ])

      let list: ApiProject[] = []
      if (projRes.status === "fulfilled") list = projRes.value.projects ?? []
      if (usersRes.status === "fulfilled") setAllUsers(usersRes.value.users ?? [])

      // Ensure personal board exists
      let personal = list.find(p => p.section === "personal")
      if (!personal) {
        try {
          const d = await apiFetch<{ project: ApiProject }>("/api/projects", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: "My Board", description: "Personal tasks", section: "personal" }),
          })
          personal = d.project
          // Create default lists for personal board
          for (const [i, title] of ["To Do", "In Progress", "Done"].entries()) {
            await apiFetch(`/api/projects/${personal.id}/lists`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ title, position: i }),
            })
          }
          list = [personal, ...list]
        } catch { /* ignore */ }
      }

      setProjects(list)

      // Honour ?board= param, otherwise go to personal board
      const preselect = searchParams.get("board")
      const target = preselect ? list.find(p => p.id === preselect) : personal
      if (target) setSelectedId(target.id)
      else if (list[0]) setSelectedId(list[0].id)
    } catch {
      toast.error("Failed to load projects")
    } finally {
      setLoading(false)
    }
  }, [searchParams])

  React.useEffect(() => { loadProjects() }, [loadProjects])

  // ── Load board when project changes ───────────────────────────────────────
  React.useEffect(() => {
    if (!selectedId) { setLists([]); setCards([]); setMembers([]); return }
    setBoardLoading(true)

    Promise.allSettled([
      apiFetch<{ lists: ApiList[] }>(`/api/projects/${selectedId}/lists`),
      apiFetch<{ members: ProjectMember[] }>(`/api/projects/${selectedId}/members`),
    ]).then(([listsRes, membersRes]) => {
      if (listsRes.status === "fulfilled") {
        const ml: KanbanList[] = (listsRes.value.lists ?? []).map(l => ({
          id: l.id, project_id: l.project_id, title: l.title, position: l.position,
        }))
        const mc: KanbanCard[] = (listsRes.value.lists ?? []).flatMap(l =>
          (l.project_cards ?? []).map(c => ({
            id: c.id, list_id: c.list_id,
            project_id: c.project_id ?? selectedId!,
            title: c.title, description: c.description,
            position: c.position,
            completed: Boolean(c.completed),
            due_date: c.due_date,
            priority: (c.priority ?? null) as KanbanCard["priority"],
            labels: Array.isArray(c.labels) ? c.labels
              : typeof c.labels === "string" ? JSON.parse(c.labels || "[]") : [],
            assignees: (c.project_card_members ?? []).map(m => ({
              user_id: m.user_id,
              full_name: m.profiles?.full_name ?? null,
            })),
          }))
        )
        setLists(ml); setCards(mc)
      }
      if (membersRes.status === "fulfilled") {
        setMembers(membersRes.value.members ?? [])
      }
    }).finally(() => setBoardLoading(false))
  }, [selectedId])

  // ── Create project ─────────────────────────────────────────────────────────
  async function handleCreateProject() {
    if (!newProjName.trim()) return
    setCreatingProj(true)
    try {
      const d = await apiFetch<{ project: ApiProject }>("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newProjName.trim(),
          description: newProjDesc.trim() || null,
          memberIds: newProjMembers,
        }),
      })
      // Create default Kanban lists
      for (const [i, title] of ["Backlog", "To Do", "In Progress", "Done"].entries()) {
        await apiFetch(`/api/projects/${d.project.id}/lists`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, position: i }),
        })
      }
      setProjects(prev => [...prev, d.project])
      setSelectedId(d.project.id)
      toast.success(`Project "${d.project.name}" created`)
      setNewProjModal(false); setNewProjName(""); setNewProjDesc(""); setNewProjMembers([])
    } catch { toast.error("Failed to create project") }
    finally { setCreatingProj(false) }
  }

  // ── Invite member ──────────────────────────────────────────────────────────
  async function handleInvite(userId: string) {
    if (!selectedId) return
    setInviting(true)
    try {
      const d = await apiFetch<{ member: ProjectMember }>(`/api/projects/${selectedId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      })
      setMembers(prev => {
        if (prev.some(m => m.user_id === userId)) return prev
        return [...prev, d.member]
      })
      const uname = allUsers.find(u => u.id === userId)?.full_name ?? "User"
      toast.success(`${uname} added to project`)
    } catch { toast.error("Failed to invite") }
    finally { setInviting(false) }
  }

  async function handleRemoveMember(userId: string) {
    if (!selectedId) return
    try {
      await apiFetch(`/api/projects/${selectedId}/members?userId=${userId}`, { method: "DELETE" })
      setMembers(prev => prev.filter(m => m.user_id !== userId))
      toast.success("Member removed")
    } catch { toast.error("Failed to remove member") }
  }

  // ── Board actions ──────────────────────────────────────────────────────────
  const handleCardMove = async (cardId: string, newListId: string) => {
    setCards(prev => prev.map(c => c.id === cardId ? { ...c, list_id: newListId } : c))
    try {
      await apiFetch(`/api/cards/${cardId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ list_id: newListId }),
      })
    } catch { toast.error("Failed to move card") }
  }

  const handleCardComplete = async (cardId: string, done: boolean) => {
    setCards(prev => prev.map(c => c.id === cardId ? { ...c, completed: done } : c))
    try {
      await apiFetch(`/api/cards/${cardId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: done ? 1 : 0 }),
      })
    } catch { toast.error("Failed to update task") }
  }

  const handleAddCard = (listId: string) => {
    setTaskTitle(""); setTaskDue(""); setTaskPriority("medium"); setTaskAssignee("")
    setTaskModal({ open: true, listId })
  }

  const submitAddTask = async () => {
    if (!taskModal.listId || !taskTitle.trim() || !selectedId) return
    setAddingTask(true)
    try {
      const d = await apiFetch<{ card: ApiCard }>(`/api/projects/${selectedId}/cards`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          list_id: taskModal.listId,
          title: taskTitle.trim(),
          position: cards.filter(c => c.list_id === taskModal.listId).length,
          assigned_to: taskAssignee || null,
          due_date: taskDue || null,
          priority: taskPriority,
        }),
      })
      const assignee = taskAssignee
        ? members.find(m => m.user_id === taskAssignee)
        : null
      setCards(prev => [...prev, {
        id: d.card.id, list_id: d.card.list_id,
        project_id: selectedId!, title: d.card.title,
        description: d.card.description, position: d.card.position,
        completed: false,
        due_date: d.card.due_date,
        priority: (taskPriority as KanbanCard["priority"]),
        labels: [],
        assignees: assignee
          ? [{ user_id: assignee.user_id, full_name: assignee.profiles?.full_name ?? null }]
          : [],
      }])
      toast.success("Task added")
      setTaskModal({ open: false, listId: null })
    } catch { toast.error("Failed to add task") }
    finally { setAddingTask(false) }
  }

  // ── Filtered members for invite search ────────────────────────────────────
  const memberIds = new Set(members.map(m => m.user_id))
  const filteredUsers = React.useMemo(() => {
    const q = inviteSearch.toLowerCase()
    return allUsers.filter(u =>
      u.id !== user?.id &&
      !memberIds.has(u.id) &&
      (!q || (u.full_name ?? "").toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allUsers, members, inviteSearch, user?.id])

  // ── Pick members for new project modal ────────────────────────────────────
  const [newProjSearch, setNewProjSearch] = React.useState("")
  const filteredNewProjUsers = React.useMemo(() => {
    const q = newProjSearch.toLowerCase()
    return allUsers.filter(u =>
      u.id !== user?.id &&
      (!q || (u.full_name ?? "").toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
    )
  }, [allUsers, newProjSearch, user?.id])

  const personalProject  = projects.find(p => p.section === "personal")
  const sharedProjects   = projects.filter(p => p.section !== "personal")

  // ── Render ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 rounded-full border-2 border-t-[#1B2A5E] animate-spin"
          style={{ borderColor: "var(--surface-border)", borderTopColor: "#1B2A5E" }} />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-0 h-full">

      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 mb-5 flex-wrap">
        <PageHeader
          title="Task Board"
          subtitle="Manage your personal tasks and collaborate on shared projects"
        />
        <Button variant="primary" size="sm" onClick={() => { setNewProjSearch(""); setNewProjMembers([]); setNewProjModal(true) }}>
          <Plus size={14} /> New Project
        </Button>
      </div>

      {/* ── Project tab bar ──────────────────────────────────────────────── */}
      <div className="overflow-x-auto mb-5 pb-1">
        <div className="flex items-center gap-1.5 min-w-max">

          {/* Personal / My Board tab */}
          {personalProject && (
            <button
              onClick={() => setSelectedId(personalProject.id)}
              className="flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-medium border flex-shrink-0 transition-all"
              style={{
                background:  selectedId === personalProject.id ? "#1B2A5E" : "var(--surface-base)",
                borderColor: selectedId === personalProject.id ? "#1B2A5E" : "var(--surface-border)",
                color:       selectedId === personalProject.id ? "#fff"    : "var(--text-secondary)",
              }}
            >
              <HouseSimple size={12} weight={selectedId === personalProject.id ? "fill" : "regular"} />
              My Board
            </button>
          )}

          {/* Divider */}
          {personalProject && sharedProjects.length > 0 && (
            <div className="w-px h-5 flex-shrink-0" style={{ background: "var(--surface-border)" }} />
          )}

          {/* Shared project tabs */}
          {sharedProjects.map(p => {
            const active = selectedId === p.id
            return (
              <button
                key={p.id}
                onClick={() => setSelectedId(p.id)}
                className="flex items-center gap-2 h-8 px-3 rounded-full text-xs font-medium border flex-shrink-0 transition-all max-w-[200px]"
                style={{
                  background:  active ? "#EEF1F8" : "var(--surface-base)",
                  borderColor: active ? "#1B2A5E" : "var(--surface-border)",
                  color:       active ? "#1B2A5E" : "var(--text-secondary)",
                  fontWeight:  active ? 600        : 400,
                }}
              >
                <FolderSimple size={12} weight={active ? "fill" : "regular"} />
                <span className="truncate">{p.name}</span>
              </button>
            )
          })}

          {/* Add project button */}
          <button
            onClick={() => { setNewProjSearch(""); setNewProjMembers([]); setNewProjModal(true) }}
            className="flex items-center gap-1 h-8 px-3 rounded-full text-[11px] font-medium border border-dashed flex-shrink-0 transition-all hover:border-[#1B2A5E] hover:text-[#1B2A5E]"
            style={{ borderColor: "var(--surface-border)", color: "var(--text-disabled)" }}
          >
            <Plus size={11} /> Add Project
          </button>
        </div>
      </div>

      {/* ── Project header (shared projects only) ────────────────────────── */}
      {selectedProject && !isPersonal && (
        <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <FolderSimple size={16} style={{ color: "#1B2A5E" }} weight="fill" />
              <h2 className="text-[15px] font-bold" style={{ color: "var(--text-primary)" }}>
                {selectedProject.name}
              </h2>
            </div>
            {selectedProject.description && (
              <p className="text-xs ml-6" style={{ color: "var(--text-muted)" }}>
                {selectedProject.description}
              </p>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Member avatars */}
            {members.length > 0 && (
              <div className="flex items-center gap-1.5">
                <div className="flex -space-x-2">
                  {members.slice(0, 5).map(m => (
                    <MemberAvatar key={m.user_id} name={m.profiles?.full_name} size={26} />
                  ))}
                </div>
                {members.length > 5 && (
                  <span className="text-[11px] font-semibold" style={{ color: "var(--text-muted)" }}>
                    +{members.length - 5}
                  </span>
                )}
              </div>
            )}

            {/* Invite button */}
            <button
              onClick={() => { setInviteSearch(""); setInviteModal(true) }}
              className="flex items-center gap-1.5 h-8 px-3 rounded-[var(--radius-md)] text-xs font-semibold border transition-all hover:shadow-sm"
              style={{ background: "var(--surface-base)", borderColor: "var(--surface-border)", color: "#1B2A5E" }}
            >
              <UserCirclePlus size={14} />
              Invite
            </button>
          </div>
        </div>
      )}

      {/* ── Board ────────────────────────────────────────────────────────── */}
      {!selectedId ? (
        <div className="flex flex-col items-center gap-3 py-20 rounded-[var(--radius-xl)] border border-dashed"
          style={{ borderColor: "var(--surface-border)" }}>
          <SquaresFour size={32} style={{ color: "var(--text-disabled)" }} />
          <p className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>Select a project to view its board</p>
        </div>
      ) : boardLoading ? (
        <div className="flex items-center justify-center flex-1 py-20">
          <div className="w-8 h-8 rounded-full border-2 border-t-[#1B2A5E] animate-spin"
            style={{ borderColor: "var(--surface-border)", borderTopColor: "#1B2A5E" }} />
        </div>
      ) : lists.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 rounded-[var(--radius-xl)] border border-dashed"
          style={{ borderColor: "var(--surface-border)" }}>
          <SquaresFour size={32} style={{ color: "var(--text-disabled)" }} />
          <p className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>
            This board has no columns yet
          </p>
        </div>
      ) : (
        <KanbanBoard
          lists={lists}
          cards={cards.filter(c => c.project_id === selectedId)}
          onCardMove={handleCardMove}
          onAddCard={handleAddCard}
          onCardComplete={handleCardComplete}
        />
      )}

      {/* ═══════════════════════ MODALS ══════════════════════════════════ */}

      {/* ── New Project ──────────────────────────────────────────────────── */}
      <Modal
        open={newProjModal}
        onOpenChange={v => !v && setNewProjModal(false)}
        title="Create New Project"
        description="Start a shared project board and invite your team to collaborate."
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setNewProjModal(false)}>Cancel</Button>
            <Button variant="primary" size="sm" loading={creatingProj} onClick={handleCreateProject}>
              Create Project
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Input
            label="Project name *"
            value={newProjName}
            onChange={e => setNewProjName(e.target.value)}
            placeholder="e.g. Website Redesign, OIFC Survey, Q3 Sprint…"
            autoFocus
          />
          <Textarea
            label="Description (optional)"
            value={newProjDesc}
            onChange={e => setNewProjDesc(e.target.value)}
            placeholder="What is this project for?"
            rows={2}
          />

          {/* Contributor picker */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              Invite Contributors
            </label>
            <input
              type="text" value={newProjSearch}
              onChange={e => setNewProjSearch(e.target.value)}
              placeholder="Search team members…"
              className="h-8 px-3 text-xs rounded-[var(--radius-md)] border"
              style={{ background: "var(--surface-base)", borderColor: "var(--surface-border)", color: "var(--text-primary)", outline: "none" }}
            />
            {/* Selected members chips */}
            {newProjMembers.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {newProjMembers.map(uid => {
                  const u = allUsers.find(x => x.id === uid)
                  return (
                    <span key={uid}
                      className="flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-full"
                      style={{ background: "#EEF1F8", color: "#1B2A5E" }}>
                      {u?.full_name ?? u?.email ?? uid}
                      <button onClick={() => setNewProjMembers(p => p.filter(id => id !== uid))}>
                        <X size={10} />
                      </button>
                    </span>
                  )
                })}
              </div>
            )}
            {/* User list */}
            <div className="flex flex-col max-h-[140px] overflow-y-auto rounded-[var(--radius-md)] border"
              style={{ borderColor: "var(--surface-border)" }}>
              {filteredNewProjUsers.length === 0 ? (
                <p className="text-xs text-center py-3" style={{ color: "var(--text-disabled)" }}>
                  {newProjSearch ? "No matches" : "No other team members"}
                </p>
              ) : filteredNewProjUsers.map(u => {
                const selected = newProjMembers.includes(u.id)
                return (
                  <button
                    key={u.id}
                    onClick={() => setNewProjMembers(prev =>
                      selected ? prev.filter(id => id !== u.id) : [...prev, u.id]
                    )}
                    className="flex items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-[#F1F3F7]"
                  >
                    <MemberAvatar name={u.full_name} size={24} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate" style={{ color: "var(--text-primary)" }}>
                        {u.full_name ?? u.email}
                      </p>
                      {u.full_name && (
                        <p className="text-[10px] truncate" style={{ color: "var(--text-disabled)" }}>{u.email}</p>
                      )}
                    </div>
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all`}
                      style={{
                        borderColor: selected ? "#1B2A5E" : "var(--surface-border)",
                        background:  selected ? "#1B2A5E" : "transparent",
                      }}>
                      {selected && <span className="text-white text-[8px] font-bold">✓</span>}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </Modal>

      {/* ── Invite member to existing project ────────────────────────────── */}
      <Modal
        open={inviteModal}
        onOpenChange={v => !v && setInviteModal(false)}
        title={`Invite to ${selectedProject?.name ?? "Project"}`}
        description="Add team members so they can view and contribute to this board."
        footer={
          <Button variant="secondary" size="sm" onClick={() => setInviteModal(false)}>Close</Button>
        }
      >
        <div className="flex flex-col gap-3">
          {/* Current members */}
          {members.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                Current Members
              </p>
              {members.map(m => (
                <div key={m.user_id} className="flex items-center gap-2.5 px-2 py-1.5 rounded-[var(--radius-md)]"
                  style={{ background: "var(--surface-subtle)" }}>
                  <MemberAvatar name={m.profiles?.full_name} size={24} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate" style={{ color: "var(--text-primary)" }}>
                      {m.profiles?.full_name ?? m.profiles?.email ?? m.user_id}
                    </p>
                    <p className="text-[10px] capitalize" style={{ color: "var(--text-disabled)" }}>{m.role}</p>
                  </div>
                  {m.role !== "owner" && isOwner && (
                    <button
                      onClick={() => handleRemoveMember(m.user_id)}
                      className="w-6 h-6 flex items-center justify-center rounded transition-colors hover:bg-[#FFF0F0]"
                      style={{ color: "#DC2626" }}
                      title="Remove"
                    >
                      <Trash size={12} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Add new members */}
          <div className="flex flex-col gap-1.5">
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              Add Members
            </p>
            <input
              type="text" value={inviteSearch}
              onChange={e => setInviteSearch(e.target.value)}
              placeholder="Search by name or email…"
              className="h-8 px-3 text-xs rounded-[var(--radius-md)] border"
              style={{ background: "var(--surface-base)", borderColor: "var(--surface-border)", color: "var(--text-primary)", outline: "none" }}
            />
            <div className="flex flex-col max-h-[200px] overflow-y-auto rounded-[var(--radius-md)] border"
              style={{ borderColor: "var(--surface-border)" }}>
              {filteredUsers.length === 0 ? (
                <p className="text-xs text-center py-3" style={{ color: "var(--text-disabled)" }}>
                  {inviteSearch ? "No matches" : "All team members are already added"}
                </p>
              ) : filteredUsers.map(u => (
                <button
                  key={u.id}
                  onClick={() => handleInvite(u.id)}
                  disabled={inviting}
                  className="flex items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-[#F1F3F7]"
                >
                  <MemberAvatar name={u.full_name} size={24} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate" style={{ color: "var(--text-primary)" }}>
                      {u.full_name ?? u.email}
                    </p>
                    {u.full_name && (
                      <p className="text-[10px] truncate" style={{ color: "var(--text-disabled)" }}>{u.email}</p>
                    )}
                  </div>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
                    style={{ background: "#EEF1F8", color: "#1B2A5E" }}>
                    + Add
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </Modal>

      {/* ── Add Task ─────────────────────────────────────────────────────── */}
      <Modal
        open={taskModal.open}
        onOpenChange={open => !open && setTaskModal({ open: false, listId: null })}
        title={isPersonal ? "Add Personal Task" : "Add Task"}
        description={isPersonal
          ? "Add a task to your personal board."
          : `Add a task to ${selectedProject?.name ?? "this project"}.`
        }
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setTaskModal({ open: false, listId: null })}>Cancel</Button>
            <Button variant="primary" size="sm" loading={addingTask} onClick={submitAddTask}>Add Task</Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <Input
            label="Task title *"
            value={taskTitle}
            onChange={e => setTaskTitle(e.target.value)}
            placeholder="What needs to be done?"
            autoFocus
          />

          <div className="grid grid-cols-2 gap-3">
            {/* Due date */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                Due Date
              </label>
              <input
                type="date" value={taskDue}
                onChange={e => setTaskDue(e.target.value)}
                className="h-10 px-3 text-sm rounded-[var(--radius-md)] border"
                style={{ background: "var(--surface-base)", borderColor: "var(--surface-border)", color: "var(--text-primary)", outline: "none" }}
              />
            </div>

            {/* Priority */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                Priority
              </label>
              <select
                value={taskPriority}
                onChange={e => setTaskPriority(e.target.value)}
                className="h-10 px-3 text-sm rounded-[var(--radius-md)] border"
                style={{ background: "var(--surface-base)", borderColor: "var(--surface-border)", color: "var(--text-primary)", outline: "none" }}
              >
                {PRIORITY_OPTIONS.map(p => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Assignee — only for shared projects with other members */}
          {!isPersonal && members.filter(m => m.user_id !== user?.id).length > 0 && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                Assign To
              </label>
              <select
                value={taskAssignee}
                onChange={e => setTaskAssignee(e.target.value)}
                className="h-10 px-3 text-sm rounded-[var(--radius-md)] border"
                style={{ background: "var(--surface-base)", borderColor: "var(--surface-border)", color: "var(--text-primary)", outline: "none" }}
              >
                <option value="">— Unassigned —</option>
                {members.map(m => (
                  <option key={m.user_id} value={m.user_id}>
                    {m.profiles?.full_name ?? m.profiles?.email ?? m.user_id}
                    {m.user_id === user?.id ? " (me)" : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Warning: only showing for shared projects */}
          {!isPersonal && members.length <= 1 && (
            <div className="flex items-start gap-2 px-3 py-2 rounded-[var(--radius-md)] text-xs"
              style={{ background: "#FFF8E6", color: "#D97706", border: "1px solid #FDE68A" }}>
              <Warning size={13} className="flex-shrink-0 mt-0.5" />
              No other contributors yet. Click <strong className="mx-0.5">Invite</strong> to add teammates.
            </div>
          )}
        </div>
      </Modal>

    </div>
  )
}
