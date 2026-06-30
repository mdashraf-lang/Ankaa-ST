"use client"

import * as React from "react"
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core"
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable"
import { KanbanColumn } from "./kanban-column"
import { TaskCard } from "./task-card"
import type { KanbanList, KanbanCard } from "@/lib/types"

interface KanbanBoardProps {
  lists: KanbanList[]
  cards: KanbanCard[]
  onCardMove?: (cardId: string, newListId: string) => void
  onAddCard?: (listId: string) => void
}

export function KanbanBoard({
  lists,
  cards,
  onCardMove,
  onAddCard,
}: KanbanBoardProps) {
  const [activeCard, setActiveCard] = React.useState<KanbanCard | null>(null)
  const [localCards, setLocalCards] = React.useState(cards)

  React.useEffect(() => {
    setLocalCards(cards)
  }, [cards])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragStart = (event: DragStartEvent) => {
    const card = localCards.find((c) => c.id === event.active.id)
    setActiveCard(card ?? null)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveCard(null)
    if (!over || active.id === over.id) return

    // Find which list the card was dropped on
    const targetListId = lists.find((l) => l.id === over.id)?.id
      ?? localCards.find((c) => c.id === over.id)?.list_id

    if (!targetListId) return

    setLocalCards((prev) =>
      prev.map((c) =>
        c.id === active.id ? { ...c, list_id: targetListId } : c
      )
    )

    onCardMove?.(active.id as string, targetListId)
  }

  const getCardsForList = (listId: string) =>
    localCards.filter((c) => c.list_id === listId)

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {lists.map((list) => (
          <KanbanColumn
            key={list.id}
            list={list}
            cards={getCardsForList(list.id)}
            onAddCard={onAddCard}
          />
        ))}
      </div>

      <DragOverlay>
        {activeCard ? <TaskCard card={activeCard} /> : null}
      </DragOverlay>
    </DndContext>
  )
}
