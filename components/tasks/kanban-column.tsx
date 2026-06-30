"use client"

import * as React from "react"
import { useDroppable } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { Plus, DotsThree } from "@phosphor-icons/react"
import { TaskCard } from "./task-card"
import type { KanbanCard, KanbanList } from "@/lib/types"

// ── Column accent colour by stage name ───────────────────────────────────────
function colourFor(title: string): { accent: string; bg: string; headerBg: string; dotBg: string } {
  const t = title.toLowerCase()
  if (t.includes("done") || t.includes("complet"))
    return { accent: "#059669", bg: "#F0FDF4", headerBg: "#DCFCE7", dotBg: "#059669" }
  if (t.includes("review") || t.includes("test") || t.includes("qa"))
    return { accent: "#7C3AED", bg: "#FAF5FF", headerBg: "#EDE9FE", dotBg: "#7C3AED" }
  if (t.includes("progress") || t.includes("doing") || t.includes("active"))
    return { accent: "#D97706", bg: "#FFFBEB", headerBg: "#FEF3C7", dotBg: "#D97706" }
  if (t.includes("todo") || t.includes("to do") || t.includes("ready") || t.includes("to-do"))
    return { accent: "#2563EB", bg: "#EFF6FF", headerBg: "#DBEAFE", dotBg: "#2563EB" }
  // Backlog / default
  return { accent: "#64748B", bg: "#F8FAFC", headerBg: "#F1F5F9", dotBg: "#94A3B8" }
}

interface KanbanColumnProps {
  list:        KanbanList
  cards:       KanbanCard[]
  hasNext?:    boolean
  onAddCard?:  (listId: string) => void
  onComplete?: (cardId: string, done: boolean) => void
  onMoveNext?: (cardId: string, fromListId: string) => void
  onEdit?:     (card: KanbanCard) => void
  onDelete?:   (card: KanbanCard) => void
}

export function KanbanColumn({ list, cards, hasNext, onAddCard, onComplete, onMoveNext, onEdit, onDelete }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: list.id })
  const col = colourFor(list.title)
  const doneCount = cards.filter(c => c.completed).length

  return (
    <div className="flex flex-col w-[296px] flex-shrink-0">

      {/* ── Column header ──────────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-3 py-2.5 rounded-t-[var(--radius-lg)] border border-b-0"
        style={{
          background:  col.headerBg,
          borderColor: `${col.accent}30`,
        }}
      >
        <div className="flex items-center gap-2 min-w-0">
          {/* Accent dot */}
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: col.accent }} />

          <span className="text-[12px] font-bold uppercase tracking-wider truncate"
            style={{ color: col.accent }}>
            {list.title}
          </span>

          {/* Count badge */}
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
            style={{ background: `${col.accent}20`, color: col.accent }}>
            {cards.length}
          </span>
        </div>

        {/* Done counter if any */}
        {doneCount > 0 && (
          <span className="text-[10px]" style={{ color: "#059669" }}>
            ✓ {doneCount}
          </span>
        )}
      </div>

      {/* ── Drop zone ──────────────────────────────────────────────────────── */}
      <div
        ref={setNodeRef}
        className="flex flex-col gap-2 rounded-b-[var(--radius-lg)] border border-t-0 p-2 flex-1 min-h-[320px] transition-all duration-150"
        style={{
          background:  isOver ? col.headerBg : col.bg,
          borderColor: isOver ? col.accent   : `${col.accent}30`,
          boxShadow:   isOver ? `0 0 0 2px ${col.accent}40` : "none",
        }}
      >
        <SortableContext items={cards.map(c => c.id)} strategy={verticalListSortingStrategy}>
          {cards.map(card => (
            <TaskCard
              key={card.id}
              card={card}
              canMoveNext={hasNext}
              onComplete={onComplete}
              onMoveNext={id => onMoveNext?.(id, list.id)}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </SortableContext>

        {/* Empty state */}
        {cards.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center gap-1 py-8 rounded-[var(--radius-md)] border-2 border-dashed"
            style={{ borderColor: `${col.accent}25` }}>
            <span className="text-2xl" style={{ opacity: 0.25 }}>
              {list.title.toLowerCase().includes("done") ? "✓" : "·"}
            </span>
            <p className="text-[11px] font-medium" style={{ color: `${col.accent}80` }}>
              Drop tasks here
            </p>
          </div>
        )}

        {/* Add task button */}
        <button
          onClick={() => onAddCard?.(list.id)}
          className="flex items-center gap-1.5 w-full px-2.5 py-2 rounded-[var(--radius-md)] text-xs font-medium transition-all duration-150 mt-1"
          style={{ color: col.accent }}
          onMouseEnter={e => {
            e.currentTarget.style.background = `${col.accent}12`
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = "transparent"
          }}
        >
          <Plus size={13} />
          Add task
        </button>
      </div>
    </div>
  )
}
