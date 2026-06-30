"use client"

import * as React from "react"
import { useDroppable } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { Plus } from "@phosphor-icons/react"
import { TaskCard } from "./task-card"
import type { KanbanCard, KanbanList } from "@/lib/types"

interface KanbanColumnProps {
  list: KanbanList
  cards: KanbanCard[]
  onAddCard?: (listId: string) => void
}

export function KanbanColumn({ list, cards, onAddCard }: KanbanColumnProps) {
  const { setNodeRef } = useDroppable({ id: list.id })

  return (
    <div className="flex flex-col w-72 flex-shrink-0">
      {/* Column header */}
      <div className="flex items-center justify-between mb-2 px-1">
        <div className="flex items-center gap-2">
          <h3
            className="text-sm font-semibold"
            style={{ color: "var(--text-secondary)" }}
          >
            {list.title}
          </h3>
          <span
            className="text-xs px-1.5 py-0.5 rounded-full font-medium"
            style={{
              background: "var(--surface-muted)",
              color: "var(--text-muted)",
            }}
          >
            {cards.length}
          </span>
        </div>
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className="flex flex-col gap-2 rounded-[var(--radius-lg)] p-2 flex-1 min-h-[200px] transition-colors"
        style={{ background: "var(--surface-muted)" }}
      >
        <SortableContext
          items={cards.map((c) => c.id)}
          strategy={verticalListSortingStrategy}
        >
          {cards.map((card) => (
            <TaskCard key={card.id} card={card} />
          ))}
        </SortableContext>

        {/* Add card button */}
        <button
          onClick={() => onAddCard?.(list.id)}
          className="flex items-center gap-1.5 px-2 py-1.5 rounded-[var(--radius-md)] text-xs font-medium transition-colors hover:bg-[#E4E7ED] w-full"
          style={{ color: "var(--text-muted)" }}
        >
          <Plus size={13} />
          Add card
        </button>
      </div>
    </div>
  )
}
