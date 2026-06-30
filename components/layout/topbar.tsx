"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import { Bell, MagnifyingGlass, UserCircle, Gear, SignOut } from "@phosphor-icons/react"
import { ThemeToggle } from "./theme-toggle"
import { Avatar } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown"
import Link from "next/link"
import { useAuth } from "@/contexts/AuthContext"
import { apiFetch } from "@/lib/api"

const routeTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/people/profile": "My Profile",
  "/people/attendance": "Attendance",
  "/people/leave": "Leave Management",
  "/people/leave/apply": "Apply for Leave",
  "/people/leave/approvals": "Leave Approvals",
  "/people/payroll": "Payroll",
  "/people/roster": "Attendance Roster",
  "/people/org-chart": "Organization Chart",
  "/projects": "Projects",
  "/projects/tenders": "Tenders",
  "/tasks": "Task Board",
  "/tasks/list": "My Tasks",
  "/assets": "Asset Registry",
  "/fleet/vehicles": "Vehicles",
  "/fleet/drivers": "Drivers",
  "/fleet/drones": "Drones",
  "/fleet/pilots": "Pilots",
  "/finance": "Finance",
  "/facilities": "Facilities",
  "/admin": "Admin Settings",
  "/admin/users": "User Management",
}

function getPageTitle(pathname: string): string {
  if (routeTitles[pathname]) return routeTitles[pathname]
  const parts = pathname.split("/")
  if (parts[1] === "projects" && parts[2] && parts[2] !== "tenders") return "Project Details"
  if (parts[1] === "projects" && parts[2] === "tenders" && parts[3]) return "Tender Details"
  if (parts[1] === "assets" && parts[2]) return "Asset Details"
  return "Ankaa ERP"
}

export function Topbar() {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const [unreadCount, setUnreadCount] = React.useState(0)
  const title = getPageTitle(pathname)

  React.useEffect(() => {
    if (!user) return
    apiFetch<{ notifications: { id: number }[] }>('/api/notifications?unread=true')
      .then((d) => setUnreadCount(d.notifications.length))
      .catch(() => {})
  }, [user])

  return (
    <header
      className="flex items-center h-[60px] px-6 gap-4 flex-shrink-0 border-b sticky top-0 z-30"
      style={{
        background: "var(--surface-base)",
        borderColor: "var(--surface-border)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      {/* Page Title */}
      <div className="flex-shrink-0">
        <h2
          className="text-base font-semibold"
          style={{ color: "var(--text-primary)" }}
        >
          {title}
        </h2>
      </div>

      {/* Search */}
      <div className="flex-1 max-w-md mx-auto">
        <div
          className="flex items-center gap-2 h-9 px-3 rounded-[var(--radius-md)] border cursor-text transition-all hover:border-[#C8CDD8]"
          style={{
            background: "var(--surface-muted)",
            borderColor: "var(--surface-border)",
          }}
        >
          <MagnifyingGlass size={16} style={{ color: "var(--text-muted)" }} />
          <span className="text-sm flex-1" style={{ color: "var(--text-disabled)" }}>
            Search…
          </span>
          <kbd
            className="hidden md:flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-mono border"
            style={{
              background: "var(--surface-base)",
              borderColor: "var(--surface-border)",
              color: "var(--text-muted)",
            }}
          >
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {/* Notifications */}
        <button
          className="relative flex items-center justify-center w-9 h-9 rounded-[var(--radius-md)] transition-colors hover:bg-[#F1F3F7]"
          style={{ color: "var(--text-secondary)" }}
          aria-label="Notifications"
        >
          <Bell size={18} />
          {unreadCount > 0 && (
            <span
              className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
              style={{ background: "var(--status-error)" }}
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>

        <ThemeToggle />

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex items-center gap-2 px-2 py-1.5 rounded-[var(--radius-md)] transition-colors hover:bg-[#F1F3F7] ml-1"
              aria-label="User menu"
            >
              <Avatar size="sm" name={user?.full_name ?? user?.email} src={user?.avatar_url ?? undefined} />
              <span
                className="text-sm font-medium hidden md:block"
                style={{ color: "var(--text-primary)" }}
              >
                {user?.full_name ?? user?.email ?? "Account"}
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>
              <div>
                <p className="font-medium">{user?.full_name ?? "My Account"}</p>
                {user?.email && (
                  <p className="text-xs font-normal" style={{ color: "var(--text-muted)" }}>
                    {user.email}
                  </p>
                )}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <Link href="/people/profile">
              <DropdownMenuItem>
                <UserCircle size={16} />
                Profile
              </DropdownMenuItem>
            </Link>
            <Link href="/admin">
              <DropdownMenuItem>
                <Gear size={16} />
                Settings
              </DropdownMenuItem>
            </Link>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              style={{ color: "var(--status-error)" }}
              onClick={() => logout()}
            >
              <SignOut size={16} />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
