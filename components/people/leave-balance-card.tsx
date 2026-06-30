import * as React from "react"
import {
  Umbrella,
  Heartbeat,
  Warning,
  Baby,
  PersonSimpleRun,
  Dot,
} from "@phosphor-icons/react/dist/ssr"
import type { LeaveBalance } from "@/lib/types"

interface LeaveBalanceCardProps {
  balance: LeaveBalance | null
}

const leaveTypes = [
  {
    key: "annual_leave_days" as keyof LeaveBalance,
    label: "Annual Leave",
    icon: Umbrella,
    color: "#2563EB",
    bg: "#EFF4FF",
    max: 21,
  },
  {
    key: "sick_leave_days" as keyof LeaveBalance,
    label: "Sick Leave",
    icon: Heartbeat,
    color: "#10A854",
    bg: "#EDFBF3",
    max: 10,
  },
  {
    key: "emergency_leave_days" as keyof LeaveBalance,
    label: "Emergency",
    icon: Warning,
    color: "#D63C3C",
    bg: "#FFF0F0",
    max: 3,
  },
  {
    key: "maternity_leave_days" as keyof LeaveBalance,
    label: "Maternity",
    icon: Baby,
    color: "#C9A227",
    bg: "#FFF8E6",
    max: 90,
  },
  {
    key: "paternity_leave_days" as keyof LeaveBalance,
    label: "Paternity",
    icon: PersonSimpleRun,
    color: "#7C3AED",
    bg: "#F5F3FF",
    max: 15,
  },
  {
    key: "other_leave_days" as keyof LeaveBalance,
    label: "Other",
    icon: Dot,
    color: "#4A5366",
    bg: "#F1F3F7",
    max: 5,
  },
]

export function LeaveBalanceCards({ balance }: LeaveBalanceCardProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {leaveTypes.map((type) => {
        const days = balance ? (balance[type.key] as number) : 0

        return (
          <div
            key={type.key}
            className="rounded-[var(--radius-lg)] border p-4 flex flex-col gap-3"
            style={{
              background: "var(--surface-base)",
              borderColor: "var(--surface-border)",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            <div
              className="w-9 h-9 rounded-[var(--radius-md)] flex items-center justify-center"
              style={{ background: type.bg, color: type.color }}
            >
              <type.icon size={18} />
            </div>
            <div>
              <p
                className="text-2xl font-bold"
                style={{ color: "var(--text-primary)" }}
              >
                {days}
              </p>
              <p
                className="text-xs"
                style={{ color: "var(--text-muted)" }}
              >
                {type.label}
              </p>
            </div>
            {/* Progress bar */}
            <div
              className="h-1 rounded-full overflow-hidden"
              style={{ background: "var(--surface-muted)" }}
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.min((days / type.max) * 100, 100)}%`,
                  background: type.color,
                }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
