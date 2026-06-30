"use client"

import * as React from "react"
import { Plus, Gear, SquaresFour } from "@phosphor-icons/react"
import { toast } from "sonner"
import { PageHeader } from "@/components/ui/page-header"
import { Button } from "@/components/ui/button"
import { KanbanBoard } from "@/components/tasks/kanban-board"
import { EmptyState } from "@/components/ui/empty-state"
import { Modal } from "@/components/ui/modal"
import { Input } from "@/components/ui/input"
import { apiFetch } from "@/lib/api"
import type { KanbanProject, KanbanList, KanbanCard } from "@/lib/types"

interface ApiProject {
  id: string
  name: string
  description: string | null
  created_at: string
  updated_at: string
  member_role?: string
}

interface ApiList {
  id: string
  project_id: string
  title: string
  position: number
  project_cards: ApiCard[]
}

interface ApiCard {
  id: string
  list_id: string
  project_id: string
  title: string
  description: string | null
  position: number
  completed: boolean
  due_date: string | null
  labels: string[] | null
}

export default function TaskBoardPage() {
  const [projects, setProjects] = React.useState<KanbanProject[]>([])
  const [selectedProjectId, setSelectedProjectId] = React.useState<string | null>(null)
  const [lists, setLists] = React.useState<KanbanList[]>([])
  const [cards, setCards] = React.useState<KanbanCard[]>([])
  const [loading, setLoading] = React.useState(true)

  // Modals
  const [createBoardModal, setCreateBoardModal] = React.useState(false)
  const [newBoardName, setNewBoardName] = React.useState("")
  const [newBoardDesc, setNewBoardDesc] = React.useState("")
  const [creating, setCreating] = React.useState(false)

  const [addCardModal, setAddCardModal] = React.useState<{ open: boolean; listId: string | null }>({
    open: false,
    listId: null,
  })
  const [newCardTitle, setNewCardTitle] = React.useState("")
  const [addingCard, setAddingCard] = React.useState(false)

  // Fetch projects on mount
  React.useEffect(() => {
    apiFetch<{ projects: ApiProject[] }>('/api/projects')
      .then((d) => {
        const mapped: KanbanProject[] = d.projects.map((p) => ({
          id: p.id,
          name: p.name,
          description: p.description,
        }))
        setProjects(mapped)
        if (mapped.length > 0 && !selectedProjectId) {
          setSelectedProjectId(mapped[0].id)
        }
      })
      .catch(() => toast.error('Failed to load projects'))
      .finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Fetch lists and cards when project changes
  React.useEffect(() => {
    if (!selectedProjectId) {
      setLists([])
      setCards([])
      return
    }

    apiFetch<{ lists: ApiList[] }>(`/api/projects/${selectedProjectId}/lists`)
      .then((d) => {
        const mappedLists: KanbanList[] = d.lists.map((l) => ({
          id: l.id,
          project_id: l.project_id,
          title: l.title,
          position: l.position,
        }))
        const mappedCards: KanbanCard[] = d.lists.flatMap((l) =>
          (l.project_cards || []).map((c) => ({
            id: c.id,
            list_id: c.list_id,
            project_id: c.project_id ?? selectedProjectId,
            title: c.title,
            description: c.description,
            position: c.position,
            completed: c.completed,
            due_date: c.due_date,
            priority: null,
            labels: c.labels ?? [],
          }))
        )
        setLists(mappedLists)
        setCards(mappedCards)
      })
      .catch(() => toast.error('Failed to load board'))
  }, [selectedProjectId])

  const handleCardMove = async (cardId: string, newListId: string) => {
    // Optimistic update
    setCards((prev) =>
      prev.map((c) => (c.id === cardId ? { ...c, list_id: newListId } : c))
    )
    try {
      await apiFetch(`/api/cards/${cardId}`, {
        method: 'PATCH',
        body: JSON.stringify({ list_id: newListId }),
      })
    } catch {
      toast.error('Failed to move card')
    }
  }

  const handleAddCard = (listId: string) => {
    setNewCardTitle("")
    setAddCardModal({ open: true, listId })
  }

  const submitAddCard = async () => {
    if (!addCardModal.listId || !newCardTitle.trim() || !selectedProjectId) return
    setAddingCard(true)
    try {
      const d = await apiFetch<{ card: ApiCard }>(
        `/api/projects/${selectedProjectId}/cards`,
        {
          method: 'POST',
          body: JSON.stringify({
            list_id: addCardModal.listId,
            title: newCardTitle.trim(),
            position: cards.filter((c) => c.list_id === addCardModal.listId).length,
          }),
        }
      )
      setCards((prev) => [
        ...prev,
        {
          id: d.card.id,
          list_id: d.card.list_id,
          project_id: selectedProjectId,
          title: d.card.title,
          description: d.card.description,
          position: d.card.position,
          completed: d.card.completed,
          due_date: d.card.due_date,
          priority: null,
          labels: d.card.labels ?? [],
        },
      ])
      toast.success('Card added')
      setAddCardModal({ open: false, listId: null })
    } catch {
      toast.error('Failed to add card')
    } finally {
      setAddingCard(false)
    }
  }

  const handleCreateBoard = async () => {
    if (!newBoardName.trim()) return
    setCreating(true)
    try {
      // 1. Create the project
      const d = await apiFetch<{ project: ApiProject }>('/api/projects', {
        method: 'POST',
        body: JSON.stringify({ name: newBoardName.trim(), description: newBoardDesc.trim() || null }),
      })
      const newProject: KanbanProject = {
        id: d.project.id,
        name: d.project.name,
        description: d.project.description,
      }

      // 2. Create all default lists first (awaited sequentially)
      const defaultLists = ['Backlog', 'To Do', 'In Progress', 'Done']
      for (let i = 0; i < defaultLists.length; i++) {
        await apiFetch(`/api/projects/${newProject.id}/lists`, {
          method: 'POST',
          body: JSON.stringify({ title: defaultLists[i], position: i }),
        })
      }

      // 3. Fetch the lists we just created
      const listsData = await apiFetch<{ lists: ApiList[] }>(
        `/api/projects/${newProject.id}/lists`
      )
      const mappedLists: KanbanList[] = (listsData.lists ?? []).map((l) => ({
        id: l.id,
        project_id: l.project_id,
        title: l.title,
        position: l.position,
      }))

      // 4. Set all state at once — no race with useEffect
      setProjects((prev) => [newProject, ...prev])
      setSelectedProjectId(newProject.id)
      setLists(mappedLists)
      setCards([])

      toast.success(`Board "${newProject.name}" created`)
      setCreateBoardModal(false)
      setNewBoardName("")
      setNewBoardDesc("")
    } catch {
      toast.error('Failed to create board')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="flex flex-col gap-5 h-full">
      <PageHeader
        title="Task Board"
        subtitle="Manage your tasks with drag-and-drop Kanban"
        actions={
          <div className="flex items-center gap-2">
            {projects.length > 0 && (
              <select
                className="h-9 px-3 rounded-[var(--radius-md)] border text-sm"
                style={{
                  borderColor: "var(--surface-border)",
                  background: "var(--surface-base)",
                  color: "var(--text-primary)",
                }}
                value={selectedProjectId ?? ""}
                onChange={(e) => setSelectedProjectId(e.target.value || null)}
              >
                <option value="">Select board…</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            )}
            <Button variant="ghost" size="icon">
              <Gear size={16} />
            </Button>
            <Button variant="primary" size="md" onClick={() => setCreateBoardModal(true)}>
              <Plus size={16} />
              New Board
            </Button>
          </div>
        }
      />

      {loading ? (
        <div className="flex items-center justify-center flex-1">
          <p style={{ color: "var(--text-muted)" }}>Loading boards…</p>
        </div>
      ) : projects.length === 0 ? (
        <EmptyState
          icon={<SquaresFour size={32} />}
          title="No task boards"
          description="Create a project or board to start organizing your tasks with Kanban."
          action={
            <Button variant="primary" size="md" onClick={() => setCreateBoardModal(true)}>
              <Plus size={14} />
              Create Board
            </Button>
          }
        />
      ) : selectedProjectId ? (
        <KanbanBoard
          lists={lists}
          cards={cards.filter((c) => c.project_id === selectedProjectId)}
          onCardMove={handleCardMove}
          onAddCard={handleAddCard}
        />
      ) : (
        <EmptyState
          icon={<SquaresFour size={32} />}
          title="Select a board"
          description="Choose a board from the dropdown to view and manage tasks."
        />
      )}

      {/* Create board modal */}
      <Modal
        open={createBoardModal}
        onOpenChange={setCreateBoardModal}
        title="Create New Board"
        description="Give your Kanban board a name. Default lists will be created automatically."
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setCreateBoardModal(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              loading={creating}
              onClick={handleCreateBoard}
            >
              Create Board
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <Input
            label="Board name"
            value={newBoardName}
            onChange={(e) => setNewBoardName(e.target.value)}
            placeholder="e.g. Sprint 1, Q3 Planning…"
            autoFocus
          />
          <Input
            label="Description (optional)"
            value={newBoardDesc}
            onChange={(e) => setNewBoardDesc(e.target.value)}
            placeholder="What is this board for?"
          />
        </div>
      </Modal>

      {/* Add card modal */}
      <Modal
        open={addCardModal.open}
        onOpenChange={(open) => setAddCardModal({ open, listId: null })}
        title="Add Card"
        description="Create a new task card in this list."
        footer={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setAddCardModal({ open: false, listId: null })}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              loading={addingCard}
              onClick={submitAddCard}
            >
              Add Card
            </Button>
          </>
        }
      >
        <Input
          label="Card title"
          value={newCardTitle}
          onChange={(e) => setNewCardTitle(e.target.value)}
          placeholder="What needs to be done?"
          autoFocus
        />
      </Modal>
    </div>
  )
}
