"use client"

import * as React from "react"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { CalendarBlank, DotsSixVertical } from "@phosphor-icons/react"
import { StatusBadge } from "@/components/ui/status-badge"
import { formatDate } from "@/lib/utils"
import type { KanbanCard } from "@/lib/types"

interface TaskCardProps {
  card: KanbanCard
}

export function TaskCard({ card }: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      className="group rounded-[var(--radius-lg)] border p-3 cursor-grab active:cursor-grabbing transition-all duration-[220ms] hover:shadow-md"
      {...attributes}
      {...listeners}
      style={{
        ...style,
        background: "var(--surface-base)",
        borderColor: "var(--surface-border)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      {/* Labels */}
      {card.labels.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {card.labels.map((label, i) => (
            <span
              key={i}
              className="text-[10px] px-1.5 py-0.5 rounded-sm font-medium"
              style={{
                background: "var(--brand-navy)",
                color: "white",
              }}
            >
              {label}
            </span>
          ))}
        </div>
      )}

      {/* Title */}
      <p
        className="text-sm font-medium mb-2"
        style={{ color: "var(--text-primary)" }}
      >
        {card.title}
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {card.priority && <StatusBadge status={card.priority} />}
          {card.due_date && (
            <span
              className="flex items-center gap-1 text-[10px]"
              style={{ color: "var(--text-muted)" }}
            >
              <CalendarBlank size={10} />
              {formatDate(card.due_date)}
            </span>
          )}
        </div>
        <DotsSixVertical
          size={14}
          className="opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ color: "var(--text-muted)" }}
        />
      </div>
    </div>
  )
}
