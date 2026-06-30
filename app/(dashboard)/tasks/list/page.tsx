"use client"

import * as React from "react"
import { useSearchParams } from "next/navigation"
import {
  Plus, HouseSimple, FolderSimple, UserCirclePlus,
  ArrowLeft, X, Warning, Trash, ArrowRight,
  SquaresFour,
} from "@phosphor-icons/react"
import { toast }           from "sonner"
import { PageHeader }      from "@/components/ui/page-header"
import { Button }          from "@/components/ui/button"
import { Modal }           from "@/components/ui/modal"
import { Input, Textarea } from "@/components/ui/input"
import { KanbanBoard }     from "@/components/tasks/kanban-board"
import { apiFetch }        from "@/lib/api"
import { useAuth }         from "@/contexts/AuthContext"
import type { KanbanList, KanbanCard } from "@/lib/types"

// ── Types ─────────────────────────────────────────────────────────────────────
interface ProjectMemberRaw {
  user_id: string; role: string
  profiles: { id: string; full_name: string | null; email: string } | null
}
interface ApiProject {
  id: string; name: string; description: string | null
  section?: string; created_at: string; created_by?: string; member_role?: string
  project_members?: ProjectMemberRaw[]
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
interface AllUser { id: string; full_name: string | null; email: string }

type PageView = "grid" | "board"

const PRIORITY_OPTIONS = [
  { value: "low",    label: "Low"    },
  { value: "medium", label: "Medium" },
  { value: "high",   label: "High"   },
  { value: "urgent", label: "Urgent" },
]

// ── Helpers ───────────────────────────────────────────────────────────────────
function initials(name: string | null | undefined) {
  if (!name) return "?"
  return name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()
}

function MemberAvatar({ name, size = 28 }: { name: string | null | undefined; size?: number }) {
  return (
    <div
      title={name ?? undefined}
      className="rounded-full flex items-center justify-center font-bold flex-shrink-0"
      style={{
        width: size, height: size,
        fontSize: size * 0.33,
        background: "#1B2A5E",
        color: "#fff",
        border: "2px solid var(--surface-base)",
      }}
    >
      {initials(name)}
    </div>
  )
}

// ── Board Card (grid view) ────────────────────────────────────────────────────
function BoardCard({
  project,
  isPersonal,
  canDelete,
  onOpen,
  onDelete,
}: {
  project: ApiProject
  isPersonal: boolean
  canDelete: boolean
  onOpen: () => void
  onDelete: () => void
}) {
  const members = project.project_members ?? []
  const accent  = isPersonal ? "#1B2A5E" : "#2563EB"

  return (
    <div
      onClick={onOpen}
      className="group relative flex flex-col rounded-[var(--radius-xl)] border overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-[0_8px_24px_rgba(0,0,0,.10)] hover:-translate-y-0.5"
      style={{ background: "var(--surface-base)", borderColor: "var(--surface-border)" }}
    >
      {/* Colour strip */}
      <div className="h-1.5 flex-shrink-0" style={{ background: accent }} />

      <div className="flex flex-col flex-1 p-5 gap-3">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {isPersonal
              ? <HouseSimple size={16} weight="fill" style={{ color: accent }} />
              : <FolderSimple size={16} weight="fill" style={{ color: accent }} />
            }
            <h3 className="text-[14px] font-bold leading-tight truncate" style={{ color: "var(--text-primary)" }}>
              {project.name}
            </h3>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            {isPersonal && (
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider"
                style={{ background: "#EEF1F8", color: "#1B2A5E" }}>
                Personal
              </span>
            )}
            {!isPersonal && canDelete && (
              <button
                onClick={e => { e.stopPropagation(); onDelete() }}
                title="Delete board"
                className="w-6 h-6 rounded flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 hover:bg-[#FFF0F0]"
                style={{ color: "#DC2626" }}
              >
                <Trash size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Description */}
        {project.description && (
          <p className="text-xs leading-relaxed line-clamp-2" style={{ color: "var(--text-muted)" }}>
            {project.description}
          </p>
        )}

        {/* Members */}
        {!isPersonal && members.length > 0 ? (
          <div className="flex items-center gap-2">
            <div className="flex -space-x-2">
              {members.slice(0, 5).map(m => (
                <MemberAvatar key={m.user_id} name={m.profiles?.full_name} size={22} />
              ))}
            </div>
            <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
              {members.length} member{members.length !== 1 ? "s" : ""}
            </span>
          </div>
        ) : isPersonal ? (
          <p className="text-[11px]" style={{ color: "var(--text-disabled)" }}>Your individual tasks</p>
        ) : null}

        {/* Open CTA */}
        <div className="mt-auto flex items-center gap-1 text-[12px] font-semibold pt-2 border-t"
          style={{ borderColor: "var(--surface-border)", color: accent }}>
          Open Board <ArrowRight size={12} />
        </div>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function BoardPage() {
  const { user }     = useAuth()
  const searchParams = useSearchParams()

  // ── View state ─────────────────────────────────────────────────────────────
  const [pageView,      setPageView]      = React.useState<PageView>("grid")
  const [selectedId,    setSelectedId]    = React.useState<string | null>(null)

  // ── Data ───────────────────────────────────────────────────────────────────
  const [loading,       setLoading]       = React.useState(true)
  const [boardLoading,  setBoardLoading]  = React.useState(false)
  const [projects,      setProjects]      = React.useState<ApiProject[]>([])
  const [lists,         setLists]         = React.useState<KanbanList[]>([])
  const [cards,         setCards]         = React.useState<KanbanCard[]>([])
  const [members,       setMembers]       = React.useState<ProjectMemberRaw[]>([])
  const [allUsers,      setAllUsers]      = React.useState<AllUser[]>([])

  // ── New project modal ──────────────────────────────────────────────────────
  const [newProjModal,   setNewProjModal]   = React.useState(false)
  const [newProjName,    setNewProjName]    = React.useState("")
  const [newProjDesc,    setNewProjDesc]    = React.useState("")
  const [newProjSearch,  setNewProjSearch]  = React.useState("")
  const [newProjMembers, setNewProjMembers] = React.useState<string[]>([])
  const [creatingProj,   setCreatingProj]   = React.useState(false)

  // ── Invite modal ───────────────────────────────────────────────────────────
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

  // ── Delete board ───────────────────────────────────────────────────────────
  const [deleteTarget,   setDeleteTarget]   = React.useState<ApiProject | null>(null)
  const [deleting,       setDeleting]       = React.useState(false)

  // ── Edit / Delete task ─────────────────────────────────────────────────────
  const [editCard,       setEditCard]       = React.useState<KanbanCard | null>(null)
  const [editTitle,      setEditTitle]      = React.useState("")
  const [editDesc,       setEditDesc]       = React.useState("")
  const [editDue,        setEditDue]        = React.useState("")
  const [editPriority,   setEditPriority]   = React.useState("medium")
  const [editAssignee,   setEditAssignee]   = React.useState("")
  const [savingEdit,     setSavingEdit]     = React.useState(false)
  const [deleteCard,     setDeleteCard]     = React.useState<KanbanCard | null>(null)
  const [deletingCard,   setDeletingCard]   = React.useState(false)

  const selectedProject = projects.find(p => p.id === selectedId)
  const isPersonal      = selectedProject?.section === "personal"
  const isOwner         = selectedProject?.created_by === user?.id || selectedProject?.member_role === "owner"

  // ── Load projects ──────────────────────────────────────────────────────────
  const loadProjects = React.useCallback(async () => {
    setLoading(true)
    try {
      const [projRes, usersRes] = await Promise.allSettled([
        apiFetch<{ projects: ApiProject[] }>("/api/projects"),
        apiFetch<{ users: AllUser[] }>("/api/users"),
      ])

      let list: ApiProject[] = []
      if (projRes.status === "fulfilled")  list = projRes.value.projects ?? []
      if (usersRes.status === "fulfilled") setAllUsers(usersRes.value.users ?? [])

      // Auto-create personal board if missing
      let personal = list.find(p => p.section === "personal")
      if (!personal) {
        try {
          const d = await apiFetch<{ project: ApiProject }>("/api/projects", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: "My Board", description: "Personal tasks", section: "personal" }),
          })
          personal = d.project
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

      // Sort: personal first, then by created_at desc
      list = [
        ...list.filter(p => p.section === "personal"),
        ...list.filter(p => p.section !== "personal"),
      ]
      setProjects(list)

      // If ?board= param, open that board directly
      const preselect = searchParams.get("board")
      if (preselect) {
        const target = list.find(p => p.id === preselect)
        if (target) openBoard(target.id)
      }
    } catch {
      toast.error("Failed to load boards")
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  React.useEffect(() => { loadProjects() }, [loadProjects])

  // ── Open a board ───────────────────────────────────────────────────────────
  function openBoard(id: string) {
    setSelectedId(id)
    setPageView("board")
    setBoardLoading(true)

    Promise.allSettled([
      apiFetch<{ lists: ApiList[] }>(`/api/projects/${id}/lists`),
      apiFetch<{ members: ProjectMemberRaw[] }>(`/api/projects/${id}/members`),
    ]).then(([listsRes, membersRes]) => {
      if (listsRes.status === "fulfilled") {
        const ml: KanbanList[] = (listsRes.value.lists ?? []).map(l => ({
          id: l.id, project_id: l.project_id, title: l.title, position: l.position,
        }))
        const mc: KanbanCard[] = (listsRes.value.lists ?? []).flatMap(l =>
          (l.project_cards ?? []).map(c => ({
            id: c.id, list_id: c.list_id, project_id: c.project_id ?? id,
            title: c.title, description: c.description,
            position: c.position, completed: Boolean(c.completed),
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
      if (membersRes.status === "fulfilled") setMembers(membersRes.value.members ?? [])
    }).finally(() => setBoardLoading(false))
  }

  function goBack() {
    setPageView("grid")
    setSelectedId(null)
    setLists([]); setCards([]); setMembers([])
  }

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
      for (const [i, title] of ["Backlog", "To Do", "In Progress", "Done"].entries()) {
        await apiFetch(`/api/projects/${d.project.id}/lists`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, position: i }),
        })
      }
      // Reload to get full project_members data
      await loadProjects()
      toast.success(`"${d.project.name}" created`)
      setNewProjModal(false); setNewProjName(""); setNewProjDesc(""); setNewProjMembers([])
    } catch { toast.error("Failed to create project") }
    finally { setCreatingProj(false) }
  }

  // ── Delete board ───────────────────────────────────────────────────────────
  async function handleDeleteBoard() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await apiFetch(`/api/projects/${deleteTarget.id}`, { method: "DELETE" })
      setProjects(prev => prev.filter(p => p.id !== deleteTarget.id))
      if (selectedId === deleteTarget.id) goBack()
      toast.success(`"${deleteTarget.name}" deleted`)
      setDeleteTarget(null)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to delete board")
    } finally { setDeleting(false) }
  }

  // ── Open edit task modal ──────────────────────────────────────────────────
  function handleOpenEdit(card: KanbanCard) {
    setEditCard(card)
    setEditTitle(card.title)
    setEditDesc(card.description ?? "")
    setEditDue(card.due_date ?? "")
    setEditPriority(card.priority ?? "medium")
    setEditAssignee(card.assignees?.[0]?.user_id ?? "")
  }

  async function handleSaveEdit() {
    if (!editCard || !editTitle.trim()) return
    setSavingEdit(true)
    try {
      await apiFetch(`/api/cards/${editCard.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title:       editTitle.trim(),
          description: editDesc.trim() || null,
          due_date:    editDue || null,
          priority:    editPriority,
          assigned_to: editAssignee || null,
        }),
      })
      const assignee = editAssignee ? members.find(m => m.user_id === editAssignee) : null
      setCards(prev => prev.map(c => c.id === editCard.id ? {
        ...c,
        title:       editTitle.trim(),
        description: editDesc.trim() || null,
        due_date:    editDue || null,
        priority:    editPriority as KanbanCard["priority"],
        assignees:   assignee
          ? [{ user_id: assignee.user_id, full_name: assignee.profiles?.full_name ?? null }]
          : [],
      } : c))
      toast.success("Task updated")
      setEditCard(null)
    } catch { toast.error("Failed to update task") }
    finally { setSavingEdit(false) }
  }

  async function handleDeleteCard() {
    if (!deleteCard) return
    setDeletingCard(true)
    try {
      await apiFetch(`/api/cards/${deleteCard.id}`, { method: "DELETE" })
      setCards(prev => prev.filter(c => c.id !== deleteCard.id))
      toast.success("Task deleted")
      setDeleteCard(null)
    } catch { toast.error("Failed to delete task") }
    finally { setDeletingCard(false) }
  }

  // ── Invite member ──────────────────────────────────────────────────────────
  async function handleInvite(userId: string) {
    if (!selectedId) return
    setInviting(true)
    try {
      await apiFetch(`/api/projects/${selectedId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      })
      const u = allUsers.find(x => x.id === userId)
      const newMember: ProjectMemberRaw = {
        user_id: userId, role: "member",
        profiles: { id: userId, full_name: u?.full_name ?? null, email: u?.email ?? "" },
      }
      setMembers(prev => prev.some(m => m.user_id === userId) ? prev : [...prev, newMember])
      setProjects(prev => prev.map(p => p.id === selectedId
        ? { ...p, project_members: [...(p.project_members ?? []), newMember] }
        : p
      ))
      toast.success(`${u?.full_name ?? "User"} added`)
    } catch { toast.error("Failed to invite") }
    finally { setInviting(false) }
  }

  async function handleRemoveMember(userId: string) {
    if (!selectedId) return
    try {
      await apiFetch(`/api/projects/${selectedId}/members?userId=${userId}`, { method: "DELETE" })
      setMembers(prev => prev.filter(m => m.user_id !== userId))
      setProjects(prev => prev.map(p => p.id === selectedId
        ? { ...p, project_members: (p.project_members ?? []).filter(m => m.user_id !== userId) }
        : p
      ))
      toast.success("Member removed")
    } catch { toast.error("Failed to remove") }
  }

  // ── Board (kanban) actions ─────────────────────────────────────────────────
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
      const assignee = taskAssignee ? members.find(m => m.user_id === taskAssignee) : null
      setCards(prev => [...prev, {
        id: d.card.id, list_id: d.card.list_id,
        project_id: selectedId!, title: d.card.title,
        description: d.card.description, position: d.card.position,
        completed: false, due_date: d.card.due_date,
        priority: taskPriority as KanbanCard["priority"],
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

  // ── Derived ────────────────────────────────────────────────────────────────
  const memberIds = new Set(members.map(m => m.user_id))

  const filteredInviteUsers = React.useMemo(() => {
    const q = inviteSearch.toLowerCase()
    return allUsers.filter(u =>
      !memberIds.has(u.id) &&
      (!q || (u.full_name ?? "").toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
    )
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allUsers, members, inviteSearch])

  const filteredNewProjUsers = React.useMemo(() => {
    const q = newProjSearch.toLowerCase()
    return allUsers.filter(u =>
      u.id !== user?.id &&
      (!q || (u.full_name ?? "").toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
    )
  }, [allUsers, newProjSearch, user?.id])

  // ── Render ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 rounded-full border-2 animate-spin"
          style={{ borderColor: "var(--surface-border)", borderTopColor: "#1B2A5E" }} />
      </div>
    )
  }

  // ════════════════════════════════════════════════════════════════════════════
  //  GRID VIEW — all boards as cards
  // ════════════════════════════════════════════════════════════════════════════
  if (pageView === "grid") {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <PageHeader title="Board" subtitle="Your personal tasks and shared project boards" />
          <Button variant="primary" size="sm" onClick={() => { setNewProjName(""); setNewProjDesc(""); setNewProjSearch(""); setNewProjMembers([]); setNewProjModal(true) }}>
            <Plus size={14} /> New Project
          </Button>
        </div>

        {projects.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-20 rounded-[var(--radius-xl)] border border-dashed"
            style={{ borderColor: "var(--surface-border)" }}>
            <SquaresFour size={32} style={{ color: "var(--text-disabled)" }} />
            <p className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>No boards yet</p>
            <Button variant="primary" size="sm" onClick={() => setNewProjModal(true)}>
              <Plus size={13} /> Create your first board
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map(p => (
              <BoardCard
                key={p.id}
                project={p}
                isPersonal={p.section === "personal"}
                canDelete={p.created_by === user?.id || p.member_role === "owner"}
                onOpen={() => openBoard(p.id)}
                onDelete={() => setDeleteTarget(p)}
              />
            ))}

            {/* Add new project card */}
            <button
              onClick={() => { setNewProjName(""); setNewProjDesc(""); setNewProjSearch(""); setNewProjMembers([]); setNewProjModal(true) }}
              className="flex flex-col items-center justify-center gap-2 rounded-[var(--radius-xl)] border-2 border-dashed min-h-[140px] transition-all hover:border-[#1B2A5E] hover:bg-[#F8F9FC]"
              style={{ borderColor: "var(--surface-border)", color: "var(--text-disabled)" }}
            >
              <Plus size={22} />
              <span className="text-xs font-medium">New Project</span>
            </button>
          </div>
        )}

        {/* Modals (shared below) */}
        {modals()}
      </div>
    )
  }

  // ════════════════════════════════════════════════════════════════════════════
  //  BOARD DETAIL VIEW — kanban for selected project
  // ════════════════════════════════════════════════════════════════════════════
  return (
    <div className="flex flex-col gap-0 h-full">

      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 mb-5 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={goBack}
            className="flex items-center gap-1.5 text-xs font-medium px-3 h-8 rounded-[var(--radius-md)] border transition-all hover:bg-[#EEF1F8] flex-shrink-0"
            style={{ borderColor: "var(--surface-border)", color: "var(--text-secondary)" }}
          >
            <ArrowLeft size={13} /> All Boards
          </button>

          <div className="w-px h-5 flex-shrink-0" style={{ background: "var(--surface-border)" }} />

          <div className="flex items-center gap-2 min-w-0">
            {isPersonal
              ? <HouseSimple size={16} weight="fill" style={{ color: "#1B2A5E", flexShrink: 0 }} />
              : <FolderSimple size={16} weight="fill" style={{ color: "#2563EB", flexShrink: 0 }} />
            }
            <div className="min-w-0">
              <h1 className="text-[15px] font-bold leading-none truncate" style={{ color: "var(--text-primary)" }}>
                {selectedProject?.name ?? "Board"}
              </h1>
              {selectedProject?.description && (
                <p className="text-[11px] mt-0.5 truncate" style={{ color: "var(--text-muted)" }}>
                  {selectedProject.description}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Right: members + invite */}
        {!isPersonal && (
          <div className="flex items-center gap-3 flex-shrink-0">
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
            <button
              onClick={() => { setInviteSearch(""); setInviteModal(true) }}
              className="flex items-center gap-1.5 h-8 px-3 rounded-[var(--radius-md)] text-xs font-semibold border transition-all hover:shadow-sm"
              style={{ background: "var(--surface-base)", borderColor: "var(--surface-border)", color: "#1B2A5E" }}
            >
              <UserCirclePlus size={14} /> Invite
            </button>
          </div>
        )}
      </div>

      {/* ── Kanban ───────────────────────────────────────────────────────── */}
      {boardLoading ? (
        <div className="flex items-center justify-center flex-1 py-24">
          <div className="w-8 h-8 rounded-full border-2 animate-spin"
            style={{ borderColor: "var(--surface-border)", borderTopColor: "#1B2A5E" }} />
        </div>
      ) : lists.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-20 rounded-[var(--radius-xl)] border border-dashed"
          style={{ borderColor: "var(--surface-border)" }}>
          <SquaresFour size={28} style={{ color: "var(--text-disabled)" }} />
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>This board has no columns yet</p>
        </div>
      ) : (
        <KanbanBoard
          lists={lists}
          cards={cards.filter(c => c.project_id === selectedId)}
          onCardMove={handleCardMove}
          onAddCard={handleAddCard}
          onCardComplete={handleCardComplete}
          onCardEdit={handleOpenEdit}
          onCardDelete={setDeleteCard}
        />
      )}

      {modals()}
    </div>
  )

  // ── All modals (shared between views) ─────────────────────────────────────
  function modals() {
    return (
      <>
        {/* New Project */}
        <Modal
          open={newProjModal}
          onOpenChange={v => !v && setNewProjModal(false)}
          title="New Project Board"
          description="Create a shared project board and invite your team."
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
              {newProjMembers.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {newProjMembers.map(uid => {
                    const u = allUsers.find(x => x.id === uid)
                    return (
                      <span key={uid} className="flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-full"
                        style={{ background: "#EEF1F8", color: "#1B2A5E" }}>
                        {u?.full_name ?? u?.email ?? uid}
                        <button onClick={() => setNewProjMembers(p => p.filter(id => id !== uid))}><X size={10} /></button>
                      </span>
                    )
                  })}
                </div>
              )}
              <div className="flex flex-col max-h-[140px] overflow-y-auto rounded-[var(--radius-md)] border"
                style={{ borderColor: "var(--surface-border)" }}>
                {filteredNewProjUsers.length === 0
                  ? <p className="text-xs text-center py-3" style={{ color: "var(--text-disabled)" }}>No matches</p>
                  : filteredNewProjUsers.map(u => {
                    const sel = newProjMembers.includes(u.id)
                    return (
                      <button key={u.id}
                        onClick={() => setNewProjMembers(prev => sel ? prev.filter(id => id !== u.id) : [...prev, u.id])}
                        className="flex items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-[#F1F3F7]"
                      >
                        <MemberAvatar name={u.full_name} size={22} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate" style={{ color: "var(--text-primary)" }}>{u.full_name ?? u.email}</p>
                          {u.full_name && <p className="text-[10px] truncate" style={{ color: "var(--text-disabled)" }}>{u.email}</p>}
                        </div>
                        <div className="w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0"
                          style={{ borderColor: sel ? "#1B2A5E" : "var(--surface-border)", background: sel ? "#1B2A5E" : "transparent" }}>
                          {sel && <span className="text-white text-[8px] font-bold">✓</span>}
                        </div>
                      </button>
                    )
                  })
                }
              </div>
            </div>
          </div>
        </Modal>

        {/* Invite to existing project */}
        <Modal
          open={inviteModal}
          onOpenChange={v => !v && setInviteModal(false)}
          title={`Invite to ${selectedProject?.name ?? "Project"}`}
          description="Add team members so they can view and contribute to this board."
          footer={<Button variant="secondary" size="sm" onClick={() => setInviteModal(false)}>Close</Button>}
        >
          <div className="flex flex-col gap-3">
            {members.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Current Members</p>
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
                      <button onClick={() => handleRemoveMember(m.user_id)}
                        className="w-6 h-6 flex items-center justify-center rounded transition-colors hover:bg-[#FFF0F0]"
                        style={{ color: "#DC2626" }}>
                        <Trash size={12} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Add Members</p>
              <input type="text" value={inviteSearch} onChange={e => setInviteSearch(e.target.value)}
                placeholder="Search by name or email…"
                className="h-8 px-3 text-xs rounded-[var(--radius-md)] border"
                style={{ background: "var(--surface-base)", borderColor: "var(--surface-border)", color: "var(--text-primary)", outline: "none" }}
              />
              <div className="flex flex-col max-h-[200px] overflow-y-auto rounded-[var(--radius-md)] border"
                style={{ borderColor: "var(--surface-border)" }}>
                {filteredInviteUsers.length === 0
                  ? <p className="text-xs text-center py-3" style={{ color: "var(--text-disabled)" }}>
                      {inviteSearch ? "No matches" : "All team members already added"}
                    </p>
                  : filteredInviteUsers.map(u => (
                    <button key={u.id} onClick={() => handleInvite(u.id)} disabled={inviting}
                      className="flex items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-[#F1F3F7]">
                      <MemberAvatar name={u.full_name} size={24} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate" style={{ color: "var(--text-primary)" }}>{u.full_name ?? u.email}</p>
                        {u.full_name && <p className="text-[10px] truncate" style={{ color: "var(--text-disabled)" }}>{u.email}</p>}
                      </div>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
                        style={{ background: "#EEF1F8", color: "#1B2A5E" }}>+ Add</span>
                    </button>
                  ))
                }
              </div>
            </div>
          </div>
        </Modal>

        {/* Add Task */}
        <Modal
          open={taskModal.open}
          onOpenChange={open => !open && setTaskModal({ open: false, listId: null })}
          title={isPersonal ? "Add Personal Task" : "Add Task"}
          description={isPersonal ? "Add a task to your personal board." : `Add a task to ${selectedProject?.name ?? "this project"}.`}
          footer={
            <>
              <Button variant="secondary" size="sm" onClick={() => setTaskModal({ open: false, listId: null })}>Cancel</Button>
              <Button variant="primary" size="sm" loading={addingTask} onClick={submitAddTask}>Add Task</Button>
            </>
          }
        >
          <div className="flex flex-col gap-3">
            <Input label="Task title *" value={taskTitle} onChange={e => setTaskTitle(e.target.value)}
              placeholder="What needs to be done?" autoFocus />
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Due Date</label>
                <input type="date" value={taskDue} onChange={e => setTaskDue(e.target.value)}
                  className="h-10 px-3 text-sm rounded-[var(--radius-md)] border"
                  style={{ background: "var(--surface-base)", borderColor: "var(--surface-border)", color: "var(--text-primary)", outline: "none" }} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Priority</label>
                <select value={taskPriority} onChange={e => setTaskPriority(e.target.value)}
                  className="h-10 px-3 text-sm rounded-[var(--radius-md)] border"
                  style={{ background: "var(--surface-base)", borderColor: "var(--surface-border)", color: "var(--text-primary)", outline: "none" }}>
                  {PRIORITY_OPTIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
            </div>
            {!isPersonal && members.length > 1 && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Assign To</label>
                <select value={taskAssignee} onChange={e => setTaskAssignee(e.target.value)}
                  className="h-10 px-3 text-sm rounded-[var(--radius-md)] border"
                  style={{ background: "var(--surface-base)", borderColor: "var(--surface-border)", color: "var(--text-primary)", outline: "none" }}>
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
            {!isPersonal && members.length <= 1 && (
              <div className="flex items-start gap-2 px-3 py-2 rounded-[var(--radius-md)] text-xs"
                style={{ background: "#FFF8E6", color: "#D97706", border: "1px solid #FDE68A" }}>
                <Warning size={13} className="flex-shrink-0 mt-0.5" />
                No contributors yet — click <strong className="mx-0.5">Invite</strong> to add teammates.
              </div>
            )}
          </div>
        </Modal>

        {/* Delete confirmation */}
        <Modal
          open={!!deleteTarget}
          onOpenChange={v => !v && setDeleteTarget(null)}
          title="Delete Board"
          description={`Delete "${deleteTarget?.name}"? All tasks and columns will be permanently removed.`}
          footer={
            <>
              <Button variant="secondary" size="sm" onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancel</Button>
              <Button size="sm" loading={deleting} onClick={handleDeleteBoard}
                style={{ background: "#DC2626", color: "#fff", border: "none" }}>
                Delete Board
              </Button>
            </>
          }
        >{null}</Modal>

        {/* Edit Task */}
        <Modal
          open={!!editCard}
          onOpenChange={v => !v && setEditCard(null)}
          title="Edit Task"
          description="Update this task's details."
          footer={
            <>
              <Button variant="secondary" size="sm" onClick={() => setEditCard(null)} disabled={savingEdit}>Cancel</Button>
              <Button variant="primary" size="sm" loading={savingEdit} onClick={handleSaveEdit}>Save Changes</Button>
            </>
          }
        >
          <div className="flex flex-col gap-3">
            <Input label="Task title *" value={editTitle} onChange={e => setEditTitle(e.target.value)}
              placeholder="What needs to be done?" autoFocus />
            <Textarea label="Description" value={editDesc} onChange={e => setEditDesc(e.target.value)}
              placeholder="Add more details…" rows={2} />
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Due Date</label>
                <input type="date" value={editDue} onChange={e => setEditDue(e.target.value)}
                  className="h-10 px-3 text-sm rounded-[var(--radius-md)] border"
                  style={{ background: "var(--surface-base)", borderColor: "var(--surface-border)", color: "var(--text-primary)", outline: "none" }} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Priority</label>
                <select value={editPriority} onChange={e => setEditPriority(e.target.value)}
                  className="h-10 px-3 text-sm rounded-[var(--radius-md)] border"
                  style={{ background: "var(--surface-base)", borderColor: "var(--surface-border)", color: "var(--text-primary)", outline: "none" }}>
                  {PRIORITY_OPTIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
            </div>
            {!isPersonal && members.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Assign To</label>
                <select value={editAssignee} onChange={e => setEditAssignee(e.target.value)}
                  className="h-10 px-3 text-sm rounded-[var(--radius-md)] border"
                  style={{ background: "var(--surface-base)", borderColor: "var(--surface-border)", color: "var(--text-primary)", outline: "none" }}>
                  <option value="">— Unassigned —</option>
                  {members.map(m => (
                    <option key={m.user_id} value={m.user_id}>
                      {m.profiles?.full_name ?? m.profiles?.email ?? m.user_id}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </Modal>

        {/* Delete Task */}
        <Modal
          open={!!deleteCard}
          onOpenChange={v => !v && setDeleteCard(null)}
          title="Delete Task"
          description={`Delete "${deleteCard?.title}"? This cannot be undone.`}
          footer={
            <>
              <Button variant="secondary" size="sm" onClick={() => setDeleteCard(null)} disabled={deletingCard}>Cancel</Button>
              <Button size="sm" loading={deletingCard} onClick={handleDeleteCard}
                style={{ background: "#DC2626", color: "#fff", border: "none" }}>
                Delete Task
              </Button>
            </>
          }
        >{null}</Modal>
      </>
    )
  }
}
