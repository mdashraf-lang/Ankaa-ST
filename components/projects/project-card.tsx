import * as React from "react"
import Link from "next/link"
import { CalendarBlank } from "@phosphor-icons/react/dist/ssr"
import { StatusBadge } from "@/components/ui/status-badge"
import { formatDate } from "@/lib/utils"
import type { ERPProject } from "@/lib/types"

interface ProjectCardProps {
  project: ERPProject
}

export function ProjectCard({ project }: ProjectCardProps) {
  return (
    <Link href={`/projects/${project.id}`}>
      <div
        className="rounded-[var(--radius-lg)] border p-4 flex flex-col gap-3 transition-all duration-[220ms] hover:shadow-md cursor-pointer"
        style={{
          background: "var(--surface-base)",
          borderColor: "var(--surface-border)",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        <div className="flex items-start justify-between gap-2">
          <h3
            className="text-sm font-semibold line-clamp-2"
            style={{ color: "var(--text-primary)" }}
          >
            {project.name}
          </h3>
          <StatusBadge status={project.status} />
        </div>

        {project.description && (
          <p
            className="text-xs line-clamp-2"
            style={{ color: "var(--text-muted)" }}
          >
            {project.description}
          </p>
        )}

        {/* Progress bar */}
        <div className="flex flex-col gap-1">
          <div className="flex justify-between">
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              Progress
            </span>
            <span className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>
              {project.progress}%
            </span>
          </div>
          <div
            className="h-1.5 rounded-full overflow-hidden"
            style={{ background: "var(--surface-muted)" }}
          >
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${project.progress}%`,
                background:
                  project.progress === 100
                    ? "var(--status-success)"
                    : project.progress > 50
                    ? "var(--brand-navy)"
                    : "var(--brand-gold)",
              }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 pt-1">
          <CalendarBlank size={12} style={{ color: "var(--text-muted)" }} />
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            {project.end_date ? formatDate(project.end_date) : "No end date"}
          </span>
        </div>
      </div>
    </Link>
  )
}
