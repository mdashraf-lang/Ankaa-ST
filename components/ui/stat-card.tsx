import * as React from "react"
import { ArrowUp, ArrowDown } from "@phosphor-icons/react/dist/ssr"
import { cn } from "@/lib/utils"

interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ReactNode
  trend?: { value: number; label: string }
  color?: string
  iconBg?: string
  className?: string
}

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  color = "#1B2A5E",
  iconBg,
  className,
}: StatCardProps) {
  const bg = iconBg ?? `${color}15`

  return (
    <div
      className={cn(
        "rounded-[var(--radius-lg)] border p-5 transition-all duration-[220ms] hover:shadow-md",
        className
      )}
      style={{
        background: "var(--surface-base)",
        borderColor: "var(--surface-border)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <div className="flex items-start justify-between mb-3">
        <p
          className="text-sm font-medium"
          style={{ color: "var(--text-muted)" }}
        >
          {title}
        </p>
        <div
          className="flex items-center justify-center w-9 h-9 rounded-[var(--radius-md)]"
          style={{ background: bg, color }}
        >
          {icon}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <p
          className="text-2xl font-bold tracking-tight"
          style={{ color: "var(--text-primary)" }}
        >
          {value}
        </p>

        {subtitle && (
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            {subtitle}
          </p>
        )}

        {trend && (
          <div className="flex items-center gap-1 mt-1">
            <span
              className="flex items-center gap-0.5 text-xs font-medium"
              style={{
                color: trend.value >= 0 ? "var(--status-success)" : "var(--status-error)",
              }}
            >
              {trend.value >= 0 ? (
                <ArrowUp size={12} weight="bold" />
              ) : (
                <ArrowDown size={12} weight="bold" />
              )}
              {Math.abs(trend.value)}%
            </span>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              {trend.label}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
