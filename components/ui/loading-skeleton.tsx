import * as React from "react"
import { cn } from "@/lib/utils"

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  width?: string | number
  height?: string | number
}

export function Skeleton({ className, width, height, style, ...props }: SkeletonProps) {
  return (
    <div
      className={cn("skeleton rounded-[var(--radius-md)]", className)}
      style={{ width, height, ...style }}
      aria-hidden="true"
      {...props}
    />
  )
}

export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          height={14}
          style={{ width: i === lines - 1 ? "60%" : "100%" }}
        />
      ))}
    </div>
  )
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div
      className={cn("rounded-[var(--radius-lg)] border p-5", className)}
      style={{
        background: "var(--surface-base)",
        borderColor: "var(--surface-border)",
      }}
    >
      <div className="flex items-center gap-3 mb-4">
        <Skeleton width={40} height={40} className="rounded-[var(--radius-md)]" />
        <div className="flex-1 flex flex-col gap-2">
          <Skeleton height={14} style={{ width: "50%" }} />
          <Skeleton height={12} style={{ width: "30%" }} />
        </div>
      </div>
      <SkeletonText lines={2} />
    </div>
  )
}

export function SkeletonStatCard({ className }: { className?: string }) {
  return (
    <div
      className={cn("rounded-[var(--radius-lg)] border p-5", className)}
      style={{
        background: "var(--surface-base)",
        borderColor: "var(--surface-border)",
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <Skeleton height={12} style={{ width: "40%" }} />
        <Skeleton width={32} height={32} className="rounded-[var(--radius-md)]" />
      </div>
      <Skeleton height={32} style={{ width: "50%", marginBottom: 8 }} />
      <Skeleton height={12} style={{ width: "35%" }} />
    </div>
  )
}

export function SkeletonTableRow({ cols = 5 }: { cols?: number }) {
  return (
    <tr aria-hidden="true">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton height={14} style={{ width: i === 0 ? "60%" : "80%" }} />
        </td>
      ))}
    </tr>
  )
}

export function SkeletonTable({
  rows = 5,
  cols = 5,
  className,
}: {
  rows?: number
  cols?: number
  className?: string
}) {
  return (
    <div
      className={cn("rounded-[var(--radius-lg)] border overflow-hidden", className)}
      style={{ borderColor: "var(--surface-border)" }}
    >
      <table className="w-full">
        <thead>
          <tr style={{ background: "var(--surface-muted)" }}>
            {Array.from({ length: cols }).map((_, i) => (
              <th key={i} className="px-4 py-3 text-left">
                <Skeleton height={12} style={{ width: "60%" }} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody
          style={{ background: "var(--surface-base)" }}
          className="divide-y"
        >
          {Array.from({ length: rows }).map((_, i) => (
            <SkeletonTableRow key={i} cols={cols} />
          ))}
        </tbody>
      </table>
    </div>
  )
}
