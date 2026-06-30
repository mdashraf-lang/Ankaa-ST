import * as React from "react"
import { cn } from "@/lib/utils"

interface EmptyStateProps {
  icon: React.ReactNode
  title: string
  description: string
  action?: React.ReactNode
  className?: string
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-16 px-6 text-center",
        className
      )}
    >
      <div
        className="flex items-center justify-center w-16 h-16 rounded-[var(--radius-xl)] mb-4"
        style={{
          background: "var(--surface-muted)",
          color: "var(--text-muted)",
        }}
      >
        {icon}
      </div>
      <h3
        className="text-base font-semibold mb-1"
        style={{ color: "var(--text-primary)" }}
      >
        {title}
      </h3>
      <p
        className="text-sm max-w-sm mb-5"
        style={{ color: "var(--text-muted)" }}
      >
        {description}
      </p>
      {action && <div>{action}</div>}
    </div>
  )
}
