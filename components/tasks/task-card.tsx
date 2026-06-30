"use client"

import * as React from "react"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { CalendarBlank, ArrowRight, CheckCircle, Circle, PencilSimple, Trash } from "@phosphor-icons/react"
import type { KanbanCard } from "@/lib/types"

function initials(name: string | null | undefined) {
  if (!name) return "?"
  return name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()
}

// ── Priority config ───────────────────────────────────────────────────────────
const PRIORITY: Record<string, { color: string; bg: string; label: string }> = {
  urgent: { color: "#DC2626", bg: "#FFF0F0", label: "Urgent" },
  high:   { color: "#EA580C", bg: "#FFF7ED", label: "High"   },
  medium: { color: "#D97706", bg: "#FFFBEB", label: "Medium" },
  low:    { color: "#2563EB", bg: "#EFF4FF", label: "Low"    },
}

// ── Label colour palette (cycles) ────────────────────────────────────────────
const LABEL_COLORS = [
  { bg: "#EFF4FF", color: "#2563EB" },
  { bg: "#F5F3FF", color: "#7C3AED" },
  { bg: "#ECFDF5", color: "#059669" },
  { bg: "#FFF8E6", color: "#D97706" },
  { bg: "#FFF0F0", color: "#DC2626" },
]

interface TaskCardProps {
  card:         KanbanCard
  canMoveNext?: boolean
  onComplete?:  (id: string, done: boolean) => void
  onMoveNext?:  (id: string) => void
  onEdit?:      (card: KanbanCard) => void
  onDelete?:    (card: KanbanCard) => void
}

export function TaskCard({ card, canMoveNext, onComplete, onMoveNext, onEdit, onDelete }: TaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: card.id })

  const prio     = PRIORITY[card.priority ?? "medium"] ?? PRIORITY.medium
  const isOverdue = card.due_date && !card.completed && new Date(card.due_date) < new Date()
  const isDueToday = card.due_date && !card.completed &&
    new Date(card.due_date).toDateString() === new Date().toDateString()

  function fmtDate(d: string) {
    return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })
  }

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity:   isDragging ? 0 : 1,
      }}
    >
      <div
        {...attributes}
        {...listeners}
        className={`
          group relative rounded-[var(--radius-lg)] border cursor-grab active:cursor-grabbing
          transition-all duration-150 select-none
          ${card.completed ? "opacity-60" : "hover:shadow-[0_4px_16px_rgba(0,0,0,.10)]"}
        `}
        style={{
          background:   "var(--surface-base)",
          borderColor:  "var(--surface-border)",
          borderLeft:   `3px solid ${card.completed ? "#10A854" : prio.color}`,
          boxShadow:    "0 1px 3px rgba(0,0,0,.06)",
        }}
      >
        {/* ── Body ───────────────────────────────────────────────────────── */}
        <div className="p-3 pb-2.5">

          {/* Labels */}
          {card.labels.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {card.labels.map((label, i) => {
                const lc = LABEL_COLORS[i % LABEL_COLORS.length]
                return (
                  <span key={i} className="text-[10px] px-1.5 py-0.5 rounded font-semibold tracking-wide"
                    style={{ background: lc.bg, color: lc.color }}>
                    {label}
                  </span>
                )
              })}
            </div>
          )}

          {/* Title row */}
          <div className="flex items-start gap-2">
            {/* Completion toggle */}
            <button
              className="flex-shrink-0 mt-0.5 transition-transform hover:scale-110 active:scale-95"
              onClick={e => { e.stopPropagation(); onComplete?.(card.id, !card.completed) }}
              title={card.completed ? "Mark incomplete" : "Mark complete"}
              style={{ pointerEvents: "auto" }}
            >
              {card.completed
                ? <CheckCircle size={16} weight="fill" style={{ color: "#10A854" }} />
                : <Circle size={16} style={{ color: "var(--text-disabled)" }} className="group-hover:text-[#10A854] transition-colors" />
              }
            </button>

            <p className="text-[13px] font-medium leading-snug flex-1" style={{
              color:          "var(--text-primary)",
              textDecoration: card.completed ? "line-through" : undefined,
            }}>
              {card.title}
            </p>

            {/* Edit / Delete actions */}
            <div className="flex items-center gap-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity -mt-0.5">
              {onEdit && (
                <button
                  onClick={e => { e.stopPropagation(); onEdit(card) }}
                  title="Edit task"
                  className="w-5 h-5 flex items-center justify-center rounded transition-colors hover:bg-[#EEF1F8]"
                  style={{ color: "#1B2A5E", pointerEvents: "auto" }}
                >
                  <PencilSimple size={11} />
                </button>
              )}
              {onDelete && (
                <button
                  onClick={e => { e.stopPropagation(); onDelete(card) }}
                  title="Delete task"
                  className="w-5 h-5 flex items-center justify-center rounded transition-colors hover:bg-[#FFF0F0]"
                  style={{ color: "#DC2626", pointerEvents: "auto" }}
                >
                  <Trash size={11} />
                </button>
              )}
            </div>
          </div>

          {/* Description preview */}
          {card.description && (
            <p className="text-xs mt-1.5 ml-6 line-clamp-2 leading-relaxed"
              style={{ color: "var(--text-muted)" }}>
              {card.description}
            </p>
          )}
        </div>

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-2 px-3 pb-2.5">
          <div className="flex items-center gap-2 min-w-0 flex-wrap">
            {/* Priority dot */}
            {card.priority && !card.completed && (
              <span className="flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0"
                style={{ background: prio.bg, color: prio.color }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: prio.color }} />
                {prio.label}
              </span>
            )}

            {/* Due date */}
            {card.due_date && (
              <span className="flex items-center gap-0.5 text-[10px] font-medium flex-shrink-0"
                style={{
                  color: isOverdue ? "#DC2626" : isDueToday ? "#D97706" : "var(--text-muted)",
                }}>
                <CalendarBlank size={10} />
                {isOverdue ? "Overdue" : isDueToday ? "Today" : fmtDate(card.due_date)}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* Assignee avatars */}
            {card.assignees && card.assignees.length > 0 && (
              <div className="flex -space-x-1.5">
                {card.assignees.slice(0, 3).map(a => (
                  <div
                    key={a.user_id}
                    title={a.full_name ?? a.user_id}
                    className="w-5 h-5 rounded-full border-2 border-white flex items-center justify-center text-[8px] font-bold flex-shrink-0"
                    style={{ background: "#1B2A5E", color: "#fff", borderColor: "var(--surface-base)" }}
                  >
                    {initials(a.full_name)}
                  </div>
                ))}
              </div>
            )}

            {/* Move-to-next action */}
            {canMoveNext && !card.completed && (
              <button
                className="flex items-center gap-0.5 text-[10px] font-semibold px-2 py-1 rounded-[var(--radius-md)] border transition-all
                  opacity-0 group-hover:opacity-100 hover:shadow-sm"
                style={{ borderColor: "#1B2A5E20", color: "#1B2A5E", background: "#EEF1F8" }}
                onClick={e => { e.stopPropagation(); onMoveNext?.(card.id) }}
                title="Move to next stage"
              >
                Move <ArrowRight size={10} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
