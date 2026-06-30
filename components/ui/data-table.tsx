"use client"

import * as React from "react"
import { ArrowUp, ArrowDown } from "@phosphor-icons/react"
import { cn } from "@/lib/utils"
import { SkeletonTableRow } from "./loading-skeleton"
import { EmptyState } from "./empty-state"
import { Button } from "./button"
import { Package } from "@phosphor-icons/react"

export interface Column<T = Record<string, unknown>> {
  key: string
  header: string
  sortable?: boolean
  width?: string
  render?: (value: unknown, row: T) => React.ReactNode
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  loading?: boolean
  emptyIcon?: React.ReactNode
  emptyTitle?: string
  emptyDescription?: string
  emptyAction?: React.ReactNode
  pagination?: {
    page: number
    pageSize: number
    total: number
    onPageChange: (page: number) => void
  }
  onRowClick?: (row: T) => void
  className?: string
}

type SortDirection = "asc" | "desc" | null

export function DataTable<T>({
  columns,
  data,
  loading = false,
  emptyIcon,
  emptyTitle = "No data found",
  emptyDescription = "There are no records to display.",
  emptyAction,
  pagination,
  onRowClick,
  className,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = React.useState<string | null>(null)
  const [sortDir, setSortDir] = React.useState<SortDirection>(null)

  const handleSort = (key: string) => {
    if (sortKey === key) {
      if (sortDir === "asc") setSortDir("desc")
      else if (sortDir === "desc") {
        setSortDir(null)
        setSortKey(null)
      } else setSortDir("asc")
    } else {
      setSortKey(key)
      setSortDir("asc")
    }
  }

  const sortedData = React.useMemo(() => {
    if (!sortKey || !sortDir) return data
    return [...data].sort((a, b) => {
      const av = (a as Record<string, unknown>)[sortKey]
      const bv = (b as Record<string, unknown>)[sortKey]
      if (av == null) return 1
      if (bv == null) return -1
      const cmp =
        typeof av === "string" && typeof bv === "string"
          ? av.localeCompare(bv)
          : Number(av) - Number(bv)
      return sortDir === "asc" ? cmp : -cmp
    })
  }, [data, sortKey, sortDir])

  const totalPages = pagination
    ? Math.ceil(pagination.total / pagination.pageSize)
    : 1

  return (
    <div className={cn("flex flex-col", className)}>
      <div
        className="rounded-[var(--radius-lg)] border overflow-hidden"
        style={{ borderColor: "var(--surface-border)" }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "var(--surface-muted)" }}>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={cn(
                      "px-4 py-3 text-left text-xs font-medium whitespace-nowrap",
                      col.sortable &&
                        "cursor-pointer select-none hover:bg-[#E4E7ED] transition-colors"
                    )}
                    style={{ color: "var(--text-muted)", width: col.width }}
                    onClick={col.sortable ? () => handleSort(col.key) : undefined}
                  >
                    <span className="flex items-center gap-1">
                      {col.header}
                      {col.sortable && (
                        <span
                          className="flex flex-col"
                          style={{
                            color:
                              sortKey === col.key
                                ? "var(--brand-navy)"
                                : "var(--text-disabled)",
                          }}
                        >
                          {sortKey === col.key && sortDir === "asc" ? (
                            <ArrowUp size={12} weight="bold" />
                          ) : sortKey === col.key && sortDir === "desc" ? (
                            <ArrowDown size={12} weight="bold" />
                          ) : (
                            <ArrowUp size={12} />
                          )}
                        </span>
                      )}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody
              className="divide-y"
              style={{
                background: "var(--surface-base)",
                borderColor: "var(--surface-border)",
              }}
            >
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <SkeletonTableRow key={i} cols={columns.length} />
                ))
              ) : sortedData.length === 0 ? (
                <tr>
                  <td colSpan={columns.length}>
                    <EmptyState
                      icon={
                        emptyIcon ?? (
                          <Package size={28} style={{ color: "var(--text-muted)" }} />
                        )
                      }
                      title={emptyTitle}
                      description={emptyDescription}
                      action={emptyAction}
                    />
                  </td>
                </tr>
              ) : (
                sortedData.map((row, i) => (
                  <tr
                    key={i}
                    className={cn(
                      "transition-colors",
                      onRowClick &&
                        "cursor-pointer hover:bg-[#F8F9FB]"
                    )}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                  >
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className="px-4 py-3 whitespace-nowrap"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {col.render
                          ? col.render((row as Record<string, unknown>)[col.key], row)
                          : ((row as Record<string, unknown>)[col.key] as React.ReactNode) ?? (
                              <span style={{ color: "var(--text-disabled)" }}>
                                —
                              </span>
                            )}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {pagination && totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 px-1">
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Showing{" "}
            {Math.min(
              (pagination.page - 1) * pagination.pageSize + 1,
              pagination.total
            )}{" "}
            –{" "}
            {Math.min(pagination.page * pagination.pageSize, pagination.total)}{" "}
            of {pagination.total} records
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              disabled={pagination.page === 1}
              onClick={() => pagination.onPageChange(pagination.page - 1)}
            >
              Previous
            </Button>
            {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
              const p = i + 1
              return (
                <Button
                  key={p}
                  variant={pagination.page === p ? "primary" : "ghost"}
                  size="icon-sm"
                  onClick={() => pagination.onPageChange(p)}
                >
                  {p}
                </Button>
              )
            })}
            <Button
              variant="ghost"
              size="sm"
              disabled={pagination.page === totalPages}
              onClick={() => pagination.onPageChange(pagination.page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
