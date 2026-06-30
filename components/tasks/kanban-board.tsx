"use client"

import * as React from "react"
import {
  DndContext, DragOverlay, closestCorners,
  KeyboardSensor, PointerSensor,
  useSensor, useSensors,
  type DragEndEvent, type DragStartEvent,
} from "@dnd-kit/core"
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable"
import { ArrowRight, CheckCircle } from "@phosphor-icons/react"
import { KanbanColumn } from "./kanban-column"
import { TaskCard }     from "./task-card"
import type { KanbanList, KanbanCard } from "@/lib/types"

// ── Pipeline flow colour by stage ─────────────────────────────────────────────
function stageColor(title: string) {
  const t = title.toLowerCase()
  if (t.includes("done") || t.includes("complet")) return "#059669"
  if (t.includes("review") || t.includes("qa"))    return "#7C3AED"
  if (t.includes("progress"))                      return "#D97706"
  if (t.includes("todo") || t.includes("to do"))   return "#2563EB"
  return "#64748B"
}

interface KanbanBoardProps {
  lists:           KanbanList[]
  cards:           KanbanCard[]
  onCardMove?:     (cardId: string, newListId: string) => void
  onAddCard?:      (listId: string) => void
  onCardComplete?: (cardId: string, done: boolean) => void
  onCardEdit?:     (card: KanbanCard) => void
  onCardDelete?:   (card: KanbanCard) => void
}

export function KanbanBoard({ lists, cards, onCardMove, onAddCard, onCardComplete, onCardEdit, onCardDelete }: KanbanBoardProps) {
  const [activeCard, setActiveCard] = React.useState<KanbanCard | null>(null)
  const [localCards, setLocalCards] = React.useState(cards)

  React.useEffect(() => { setLocalCards(cards) }, [cards])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  // ── Drag handlers ──────────────────────────────────────────────────────────
  const handleDragStart = (event: DragStartEvent) => {
    setActiveCard(localCards.find(c => c.id === event.active.id) ?? null)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveCard(null)
    if (!over || active.id === over.id) return
    const targetListId =
      lists.find(l => l.id === over.id)?.id ??
      localCards.find(c => c.id === over.id)?.list_id
    if (!targetListId) return
    setLocalCards(prev => prev.map(c => c.id === active.id ? { ...c, list_id: targetListId } : c))
    onCardMove?.(active.id as string, targetListId)
  }

  // ── Move to next stage ─────────────────────────────────────────────────────
  const handleMoveNext = (cardId: string, fromListId: string) => {
    const idx = lists.findIndex(l => l.id === fromListId)
    if (idx === -1 || idx >= lists.length - 1) return
    const nextListId = lists[idx + 1].id
    setLocalCards(prev => prev.map(c => c.id === cardId ? { ...c, list_id: nextListId } : c))
    onCardMove?.(cardId, nextListId)
  }

  // ── Complete toggle ────────────────────────────────────────────────────────
  const handleComplete = (cardId: string, done: boolean) => {
    setLocalCards(prev => prev.map(c => c.id === cardId ? { ...c, completed: done } : c))
    onCardComplete?.(cardId, done)
  }

  const getCards = (listId: string) => localCards.filter(c => c.list_id === listId)

  // ── Pipeline stats ─────────────────────────────────────────────────────────
  const total     = localCards.length
  const completed = localCards.filter(c => c.completed).length
  const pct       = total > 0 ? Math.round((completed / total) * 100) : 0

  return (
    <div className="flex flex-col gap-4 h-full">

      {/* ── Pipeline progress bar ────────────────────────────────────────── */}
      <div className="flex flex-col gap-2">
        {/* Stage flow indicator */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1">
          {lists.map((list, idx) => {
            const color   = stageColor(list.title)
            const count   = getCards(list.id).length
            const isLast  = idx === lists.length - 1
            const isDone  = list.title.toLowerCase().includes("done") || list.title.toLowerCase().includes("complet")
            return (
              <React.Fragment key={list.id}>
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border flex-shrink-0"
                  style={{
                    borderColor: `${color}40`,
                    background:  `${color}10`,
                  }}>
                  {isDone && <CheckCircle size={12} style={{ color }} />}
                  <span className="text-[11px] font-semibold" style={{ color }}>
                    {list.title}
                  </span>
                  <span className="text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: `${color}20`, color }}>
                    {count}
                  </span>
                </div>
                {!isLast && (
                  <ArrowRight size={12} className="flex-shrink-0" style={{ color: "var(--text-disabled)" }} />
                )}
              </React.Fragment>
            )
          })}

          {/* Overall progress */}
          {total > 0 && (
            <div className="ml-auto flex items-center gap-2 flex-shrink-0 pl-3 border-l" style={{ borderColor: "var(--surface-border)" }}>
              <div className="w-20 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--surface-muted)" }}>
                <div className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, background: "#059669" }} />
              </div>
              <span className="text-[11px] font-semibold" style={{ color: "var(--text-muted)" }}>
                {pct}%
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Kanban columns ───────────────────────────────────────────────── */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4 flex-1">
          {lists.map((list, idx) => (
            <KanbanColumn
              key={list.id}
              list={list}
              cards={getCards(list.id)}
              hasNext={idx < lists.length - 1}
              onAddCard={onAddCard}
              onComplete={handleComplete}
              onMoveNext={handleMoveNext}
              onEdit={onCardEdit}
              onDelete={onCardDelete}
            />
          ))}
        </div>

        <DragOverlay dropAnimation={{ duration: 200, easing: "cubic-bezier(0.18,0.67,0.6,1.22)" }}>
          {activeCard ? (
            <div style={{ transform: "rotate(2deg)", boxShadow: "0 20px 40px rgba(0,0,0,.15)", borderRadius: 12 }}>
              <TaskCard card={activeCard} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  )
}
