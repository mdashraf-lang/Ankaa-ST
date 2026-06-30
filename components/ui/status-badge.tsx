import * as React from "react"
import { Badge } from "./badge"
import type { BadgeProps } from "./badge"

const statusConfig: Record<
  string,
  { label: string; variant: BadgeProps["variant"] }
> = {
  // General statuses
  pending: { label: "Pending", variant: "pending" },
  active: { label: "Active", variant: "success" },
  inactive: { label: "Inactive", variant: "default" },
  completed: { label: "Completed", variant: "success" },
  rejected: { label: "Rejected", variant: "error" },
  cancelled: { label: "Cancelled", variant: "error" },
  draft: { label: "Draft", variant: "default" },
  approved: { label: "Approved", variant: "success" },
  in_progress: { label: "In Progress", variant: "info" },
  on_leave: { label: "On Leave", variant: "warning" },
  terminated: { label: "Terminated", variant: "error" },

  // Asset / Vehicle statuses
  available: { label: "Available", variant: "success" },
  assigned: { label: "Assigned", variant: "info" },
  maintenance: { label: "Maintenance", variant: "warning" },
  retired: { label: "Retired", variant: "default" },
  in_use: { label: "In Use", variant: "info" },

  // Financial statuses
  paid: { label: "Paid", variant: "success" },
  processing: { label: "Processing", variant: "info" },

  // Tender statuses
  open: { label: "Open", variant: "info" },
  submitted: { label: "Submitted", variant: "success" },
  under_review: { label: "Under Review", variant: "warning" },
  awarded: { label: "Awarded", variant: "success" },

  // Driver / Pilot statuses
  on_trip: { label: "On Trip", variant: "info" },
  off_duty: { label: "Off Duty", variant: "default" },
  on_mission: { label: "On Mission", variant: "info" },

  // Attendance statuses
  present: { label: "Present", variant: "success" },
  absent: { label: "Absent", variant: "error" },
  late: { label: "Late", variant: "warning" },
  remote: { label: "Remote", variant: "info" },
  holiday: { label: "Holiday", variant: "default" },

  // Leave types (for display)
  annual: { label: "Annual Leave", variant: "info" },
  sick: { label: "Sick Leave", variant: "warning" },
  maternity: { label: "Maternity", variant: "info" },
  paternity: { label: "Paternity", variant: "info" },
  emergency: { label: "Emergency", variant: "error" },
  unpaid: { label: "Unpaid", variant: "default" },
  remote_work: { label: "Remote Work", variant: "info" },
  unpaid_leave: { label: "Unpaid Leave", variant: "default" },
  official_trip: { label: "Official Trip", variant: "navy" },
  official_meeting: { label: "Official Meeting", variant: "navy" },
  other: { label: "Other", variant: "default" },

  // Booking
  confirmed: { label: "Confirmed", variant: "success" },

  // Priorities
  low: { label: "Low", variant: "default" },
  medium: { label: "Medium", variant: "warning" },
  high: { label: "High", variant: "error" },
  critical: { label: "Critical", variant: "error" },
  urgent: { label: "Urgent", variant: "error" },

  // Contract types
  full_time: { label: "Full Time", variant: "success" },
  part_time: { label: "Part Time", variant: "info" },
  contractor: { label: "Contractor", variant: "warning" },
  intern: { label: "Intern", variant: "default" },
}

interface StatusBadgeProps {
  status: string
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] ?? { label: status, variant: "default" as const }
  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  )
}
