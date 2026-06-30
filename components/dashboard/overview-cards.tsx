import * as React from "react"
import { Users, ClockCountdown, Briefcase, Car } from "@phosphor-icons/react/dist/ssr"
import { StatCard } from "@/components/ui/stat-card"

interface OverviewStats {
  employeesPresent: number
  leavePending: number
  activeProjects: number
  vehiclesInUse: number
}

interface OverviewCardsProps {
  stats: OverviewStats
}

export function OverviewCards({ stats }: OverviewCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      <StatCard
        title="Employees Present"
        value={stats.employeesPresent}
        subtitle="Today's attendance"
        icon={<Users size={18} />}
        color="#2563EB"
        iconBg="#EFF4FF"
      />
      <StatCard
        title="Leave Requests Pending"
        value={stats.leavePending}
        subtitle="Awaiting approval"
        icon={<ClockCountdown size={18} />}
        color="#E89B1A"
        iconBg="#FFF8E6"
      />
      <StatCard
        title="Active Projects"
        value={stats.activeProjects}
        subtitle="Currently in progress"
        icon={<Briefcase size={18} />}
        color="#1B2A5E"
        iconBg="#EEF1F8"
      />
      <StatCard
        title="Vehicles in Use"
        value={stats.vehiclesInUse}
        subtitle="Fleet utilization"
        icon={<Car size={18} />}
        color="#D97706"
        iconBg="#FFFBEB"
      />
    </div>
  )
}
