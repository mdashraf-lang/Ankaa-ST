"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  House, Users, UserCircle, CalendarCheck, Umbrella, Money, Table,
  TreeStructure, Briefcase, FileText, CheckSquare, SquaresFour,
  ListChecks, Package, Car, User, Airplane, CurrencyDollar, Buildings,
  Gear, UsersThree, Sliders, CaretDown, CaretRight, SignOut,
  ArrowLeft, ArrowRight, ClockCountdown, BookOpen,
  Wrench, MapPin, Wind, Storefront,
} from "@phosphor-icons/react"
import { cn } from "@/lib/utils"
import { Avatar } from "@/components/ui/avatar"
import { useAuth } from "@/contexts/AuthContext"

// ── Role groups ───────────────────────────────────────────────────────────────
const EXECUTIVES   = ['super_admin', 'admin', 'md', 'cto', 'coo']
const APPROVERS    = ['super_admin', 'admin', 'md', 'cto', 'coo', 'hr', 'hod']
const FINANCE_ROLES= ['super_admin', 'admin', 'finance', 'hr', 'md', 'coo', 'cto']
const ADMIN_ROLES  = ['super_admin', 'admin', 'hr']
const STAFF        = ['super_admin', 'admin', 'md', 'cto', 'coo', 'hr', 'finance', 'hod', 'team_member']
// Roles that see the full People section (payroll, roster, org chart)
const PEOPLE_MGMT  = ['super_admin', 'admin', 'hr', 'md', 'cto', 'coo', 'hod', 'finance']

interface NavItem {
  label: string
  href?: string
  icon: React.ElementType
  children?: NavItem[]
  badge?: string        // small count badge
  allowedRoles?: string[]
}

const navItems: NavItem[] = [
  {
    label: "Dashboard",
    href:  "/dashboard",
    icon:  House,
    // all roles
  },

  // ── People ──────────────────────────────────────────────────────────────────
  {
    label: "People",
    icon:  Users,
    children: [
      { label: "My Profile",   href: "/people/profile",    icon: UserCircle  },
      { label: "Attendance",   href: "/people/attendance",  icon: CalendarCheck },
      { label: "Leave",        href: "/people/leave",       icon: Umbrella    },
      { label: "Approvals",    href: "/people/leave/approvals", icon: ClockCountdown, allowedRoles: APPROVERS },
      { label: "Payroll",      href: "/people/payroll",    icon: Money,       allowedRoles: PEOPLE_MGMT },
      { label: "Roster",       href: "/people/roster",     icon: Table,       allowedRoles: PEOPLE_MGMT },
      { label: "Org Chart",    href: "/people/org-chart",  icon: TreeStructure },
    ],
  },

  // ── Projects ─────────────────────────────────────────────────────────────────
  {
    label: "Projects",
    icon:  Briefcase,
    allowedRoles: STAFF,
    children: [
      { label: "All Projects", href: "/projects",          icon: Briefcase   },
      { label: "Tenders",      href: "/projects/tenders",  icon: FileText, allowedRoles: EXECUTIVES },
    ],
  },

  // ── Tasks ────────────────────────────────────────────────────────────────────
  {
    label: "Tasks",
    icon:  CheckSquare,
    children: [
      { label: "My Board",  href: "/tasks",       icon: SquaresFour },
      { label: "My List",   href: "/tasks/list",  icon: ListChecks  },
    ],
  },

  // ── Trainee-only ─────────────────────────────────────────────────────────────
  {
    label: "Training",
    href:  "/training",
    icon:  BookOpen,
    allowedRoles: ['trainee'],
  },

  // ── Management ───────────────────────────────────────────────────────────────
  {
    label: "Assets",
    icon:  Package,
    allowedRoles: PEOPLE_MGMT,
    children: [
      { label: "Registry",   href: "/assets",            icon: Package   },
      { label: "Companies",  href: "/assets/companies",  icon: Buildings },
      { label: "Vendors",    href: "/assets/vendors",    icon: Storefront},
      { label: "Movements",  href: "/assets/movements",  icon: ArrowRight},
    ],
  },
  {
    label: "Fleet",
    icon:  Car,
    allowedRoles: PEOPLE_MGMT,
    children: [
      { label: "Vehicles",     href: "/fleet/vehicles",    icon: Car      },
      { label: "Assignments",  href: "/fleet/assignments", icon: User     },
      { label: "Maintenance",  href: "/fleet/maintenance", icon: Wrench   },
      { label: "Trips",        href: "/fleet/trips",       icon: MapPin   },
      { label: "Drivers",      href: "/fleet/drivers",     icon: Users    },
      { label: "Drones",       href: "/fleet/drones",      icon: Airplane },
      { label: "Pilots",       href: "/fleet/pilots",      icon: User     },
      { label: "Flight Logs",  href: "/fleet/flight-logs", icon: Wind     },
    ],
  },
  {
    label:        "Finance",
    href:         "/finance",
    icon:         CurrencyDollar,
    allowedRoles: FINANCE_ROLES,
  },
  {
    label:        "Facilities",
    href:         "/facilities",
    icon:         Buildings,
    allowedRoles: STAFF,
  },
  {
    label:        "Admin",
    icon:         Gear,
    allowedRoles: ADMIN_ROLES,
    children: [
      { label: "Users",    href: "/admin/users", icon: UsersThree },
      { label: "Settings", href: "/admin",       icon: Sliders    },
    ],
  },
]

// Role display label + accent colour
const ROLE_META: Record<string, { label: string; color: string; bg: string }> = {
  super_admin: { label: 'Super Admin', color: '#DC2626', bg: '#FEF2F2' },
  admin:       { label: 'Admin',       color: '#D97706', bg: '#FFFBEB' },
  md:          { label: 'MD',          color: '#1B2A5E', bg: '#EEF1F8' },
  cto:         { label: 'CTO',         color: '#1B2A5E', bg: '#EEF1F8' },
  coo:         { label: 'COO',         color: '#1B2A5E', bg: '#EEF1F8' },
  hr:          { label: 'HR',          color: '#059669', bg: '#ECFDF5' },
  finance:     { label: 'Finance',     color: '#0052CC', bg: '#EFF4FF' },
  hod:         { label: 'HoD',         color: '#6D28D9', bg: '#F5F3FF' },
  team_member: { label: 'Team',        color: '#0369A1', bg: '#EFF6FF' },
  trainee:     { label: 'Trainee',     color: '#0891B2', bg: '#ECFEFF' },
  collaborator:{ label: 'Collaborator',color: '#6B7280', bg: '#F3F4F6' },
}

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const [expandedSections, setExpandedSections] = React.useState<string[]>([])

  const userRole  = user?.role ?? ''
  const roleMeta  = ROLE_META[userRole] ?? { label: userRole, color: '#6B7280', bg: '#F3F4F6' }

  // Filter helpers
  function itemVisible(item: NavItem): boolean {
    if (!item.allowedRoles) return true
    return item.allowedRoles.includes(userRole)
  }

  function filteredChildren(item: NavItem): NavItem[] {
    return (item.children ?? []).filter(c => !c.allowedRoles || c.allowedRoles.includes(userRole))
  }

  const visibleItems = navItems
    .filter(itemVisible)
    .map(item => ({ ...item, children: item.children ? filteredChildren(item) : undefined }))
    .filter(item => !item.children || item.children.length > 0)

  // Auto-expand active section
  React.useEffect(() => {
    navItems.forEach(item => {
      if (item.children) {
        const isActive = item.children.some(c => c.href && pathname.startsWith(c.href))
        if (isActive) {
          setExpandedSections(prev => prev.includes(item.label) ? prev : [...prev, item.label])
        }
      }
    })
  }, [pathname])

  const toggleSection = (label: string) =>
    setExpandedSections(prev =>
      prev.includes(label) ? prev.filter(s => s !== label) : [...prev, label]
    )

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href)

  return (
    <aside
      className={cn(
        "fixed top-0 left-0 h-screen flex flex-col z-40 transition-all duration-[220ms] ease-[cubic-bezier(0.16,1,0.3,1)]",
        collapsed ? "w-14" : "w-60"
      )}
      style={{
        background:  "var(--surface-base)",
        borderRight: "1px solid var(--surface-border)",
        boxShadow:   "var(--shadow-sm)",
      }}
    >
      {/* Logo */}
      <div
        className={cn("flex items-center h-[60px] flex-shrink-0 border-b", collapsed ? "justify-center px-3" : "px-4")}
        style={{ borderColor: "var(--surface-border)" }}
      >
        {collapsed ? (
          <div className="w-8 h-8 rounded-[var(--radius-md)] flex items-center justify-center font-bold text-white text-sm"
            style={{ background: "var(--brand-navy)" }}>A</div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-[var(--radius-md)] flex items-center justify-center font-bold text-white text-sm"
              style={{ background: "var(--brand-navy)" }}>A</div>
            <div className="flex items-center">
              <span className="text-base font-bold tracking-tight" style={{ color: "var(--brand-navy)" }}>Ankaa</span>
              <span className="w-1.5 h-1.5 rounded-full ml-0.5 mb-2" style={{ background: "var(--brand-gold)" }} />
            </div>
          </div>
        )}
      </div>

      {/* Role badge strip (when expanded) */}
      {!collapsed && (
        <div className="mx-2 mt-2 mb-1 px-3 py-1.5 rounded-[var(--radius-md)] flex items-center gap-2"
          style={{ background: roleMeta.bg }}>
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: roleMeta.color }} />
          <span className="text-xs font-semibold" style={{ color: roleMeta.color }}>
            {roleMeta.label} Access
          </span>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2 px-2">
        {visibleItems.map(item => {
          if (item.children && item.children.length > 0) {
            const isExpanded    = expandedSections.includes(item.label)
            const isChildActive = item.children.some(c => c.href && isActive(c.href))

            return (
              <div key={item.label} className="mb-0.5">
                <button
                  onClick={() => !collapsed && toggleSection(item.label)}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-[var(--radius-md)] text-sm font-medium transition-all duration-[220ms]",
                    collapsed ? "justify-center" : "justify-between",
                    isChildActive ? "bg-[#EEF1F8] text-[#1B2A5E]" : "text-[#4A5366] hover:bg-[#F1F3F7]"
                  )}
                  title={collapsed ? item.label : undefined}
                  aria-expanded={!collapsed && isExpanded}
                >
                  <span className="flex items-center gap-2.5">
                    <item.icon size={18} weight={isChildActive ? "fill" : "regular"} />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </span>
                  {!collapsed && (isExpanded ? <CaretDown size={12} /> : <CaretRight size={12} />)}
                </button>

                {!collapsed && isExpanded && (
                  <div className="ml-4 mt-0.5 pl-3 border-l flex flex-col gap-0.5"
                    style={{ borderColor: "var(--surface-border)" }}>
                    {item.children.map(child => (
                      <Link
                        key={child.href}
                        href={child.href!}
                        className={cn(
                          "flex items-center gap-2 px-2 py-1.5 rounded-[var(--radius-md)] text-sm transition-all duration-[220ms]",
                          child.href && isActive(child.href)
                            ? "bg-[#1B2A5E] text-white font-medium"
                            : "text-[#4A5366] hover:bg-[#F1F3F7]"
                        )}
                      >
                        <child.icon size={15} />
                        <span className="truncate">{child.label}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )
          }

          return (
            <Link
              key={item.href}
              href={item.href!}
              className={cn(
                "flex items-center gap-2.5 px-2.5 py-2 rounded-[var(--radius-md)] text-sm font-medium mb-0.5 transition-all duration-[220ms]",
                collapsed ? "justify-center" : "",
                item.href && isActive(item.href)
                  ? "bg-[#1B2A5E] text-white"
                  : "text-[#4A5366] hover:bg-[#F1F3F7]"
              )}
              title={collapsed ? item.label : undefined}
            >
              <item.icon size={18} weight={item.href && isActive(item.href) ? "fill" : "regular"} />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* User section */}
      <div className="border-t p-2 flex-shrink-0" style={{ borderColor: "var(--surface-border)" }}>
        {!collapsed && (
          <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-[var(--radius-md)] mb-1"
            style={{ background: "var(--surface-muted)" }}>
            <Avatar size="sm" name={user?.full_name ?? user?.email} src={user?.avatar_url ?? undefined} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate" style={{ color: "var(--text-primary)" }}>
                {user?.full_name ?? user?.email ?? "My Account"}
              </p>
              <p className="text-[10px] font-semibold truncate" style={{ color: roleMeta.color }}>
                {roleMeta.label}
              </p>
            </div>
          </div>
        )}
        <button
          onClick={() => logout()}
          className={cn(
            "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-[var(--radius-md)] text-sm transition-all duration-[220ms] hover:bg-[#FFF0F0]",
            collapsed ? "justify-center" : ""
          )}
          style={{ color: "var(--status-error)" }}
          title={collapsed ? "Sign out" : undefined}
        >
          <SignOut size={16} />
          {!collapsed && <span>Sign out</span>}
        </button>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={onToggle}
        className="absolute -right-3 top-16 w-6 h-6 rounded-full border flex items-center justify-center transition-all duration-[220ms] hover:shadow-md z-10"
        style={{
          background: "var(--surface-base)", borderColor: "var(--surface-border)",
          color: "var(--text-muted)", boxShadow: "var(--shadow-sm)",
        }}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? <ArrowRight size={12} /> : <ArrowLeft size={12} />}
      </button>
    </aside>
  )
}
