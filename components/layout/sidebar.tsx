"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  House, Users, UserCircle, CalendarCheck, Umbrella, Money, Table,
  TreeStructure, Briefcase, FileText, CheckSquare, SquaresFour,
  ListChecks, Package, Car, User, Airplane, CurrencyDollar, Buildings,
  Gear, UsersThree, Sliders, CaretDown, CaretRight, SignOut,
  ArrowLeft, ArrowRight, ClockCountdown, BookOpen, FolderOpen,
  Wrench, MapPin, Wind, Storefront, Receipt,
} from "@phosphor-icons/react"
import { cn } from "@/lib/utils"
import { Avatar } from "@/components/ui/avatar"
import { useAuth } from "@/contexts/AuthContext"

// ── Role groups ───────────────────────────────────────────────────────────────
const EXECUTIVES    = ['admin', 'md', 'cto', 'coo']
const APPROVERS     = ['admin', 'md', 'cto', 'coo', 'hr', 'hod']
const FINANCE_ROLES = ['admin', 'finance', 'hr', 'md', 'coo', 'cto']
const ADMIN_ROLES   = ['admin', 'hr']
const STAFF         = ['admin', 'md', 'cto', 'coo', 'hr', 'finance', 'hod', 'team_member']
const PEOPLE_MGMT   = ['admin', 'hr', 'md', 'cto', 'coo', 'hod', 'finance']
const NOT_TRAINEE   = ['admin', 'md', 'cto', 'coo', 'hr', 'finance', 'hod', 'team_member', 'collaborator']

// ── Nav item types ────────────────────────────────────────────────────────────
interface NavItem {
  type?:         'section' | 'group' | 'link'
  label:         string
  href?:         string
  icon?:         React.ElementType
  children?:     NavItem[]
  allowedRoles?: string[]
}

// ─────────────────────────────────────────────────────────────────────────────
// NAV TREE
// type: 'section' → renders as a labelled divider (no icon, no click)
// type: 'group'   → expandable section with children
// type: 'link'    → direct navigation link (default)
// ─────────────────────────────────────────────────────────────────────────────
const NAV: NavItem[] = [
  // ── Home ──────────────────────────────────────────────────────────────────
  { label: "Dashboard", href: "/dashboard", icon: House },

  // ── My Space ──────────────────────────────────────────────────────────────
  { type: "section", label: "My Space" },
  { label: "My Profile",   href: "/people/profile",  icon: UserCircle  },
  { label: "My Leave",     href: "/people/leave",    icon: Umbrella    },
  { label: "Board",         href: "/tasks/list",      icon: ListChecks  },
  { label: "My Invoices",  href: "/invoices",        icon: Receipt     },
  { label: "Training",     href: "/training",        icon: BookOpen,   allowedRoles: ['trainee'] },

  // ── People ────────────────────────────────────────────────────────────────
  { type: "section", label: "People", allowedRoles: NOT_TRAINEE },
  {
    type:  "group",
    label: "People",
    icon:  Users,
    allowedRoles: NOT_TRAINEE,
    children: [
      { label: "Org Chart",    href: "/people/org-chart",       icon: TreeStructure                        },
      { label: "Attendance",   href: "/people/attendance",      icon: CalendarCheck                        },
      { label: "Approvals",    href: "/people/leave/approvals", icon: ClockCountdown, allowedRoles: APPROVERS   },
      { label: "Payroll",      href: "/people/payroll",         icon: Money,          allowedRoles: PEOPLE_MGMT },
      { label: "Roster",       href: "/people/roster",          icon: Table,          allowedRoles: PEOPLE_MGMT },
    ],
  },

  // ── Work ──────────────────────────────────────────────────────────────────
  { type: "section", label: "Work", allowedRoles: NOT_TRAINEE },
  {
    type:  "group",
    label: "Projects",
    icon:  Briefcase,
    allowedRoles: STAFF,
    children: [
      { label: "All Projects", href: "/projects",         icon: FolderOpen                          },
      { label: "Tenders",      href: "/projects/tenders", icon: FileText,  allowedRoles: EXECUTIVES },
    ],
  },

  // ── Finance & Operations ──────────────────────────────────────────────────
  { type: "section", label: "Finance & Ops", allowedRoles: [...FINANCE_ROLES, ...PEOPLE_MGMT] },
  {
    label:        "Finance",
    href:         "/finance",
    icon:         CurrencyDollar,
    allowedRoles: FINANCE_ROLES,
  },
  {
    type:  "group",
    label: "Assets",
    icon:  Package,
    allowedRoles: PEOPLE_MGMT,
    children: [
      { label: "Registry",   href: "/assets",           icon: Package    },
      { label: "Companies",  href: "/assets/companies", icon: Buildings  },
      { label: "Vendors",    href: "/assets/vendors",   icon: Storefront },
      { label: "Movements",  href: "/assets/movements", icon: ArrowRight },
    ],
  },
  {
    type:  "group",
    label: "Fleet",
    icon:  Car,
    allowedRoles: PEOPLE_MGMT,
    children: [
      { label: "Vehicles",    href: "/fleet/vehicles",    icon: Car      },
      { label: "Assignments", href: "/fleet/assignments", icon: User     },
      { label: "Maintenance", href: "/fleet/maintenance", icon: Wrench   },
      { label: "Trips",       href: "/fleet/trips",       icon: MapPin   },
      { label: "Drivers",     href: "/fleet/drivers",     icon: Users    },
      { label: "Drones",      href: "/fleet/drones",      icon: Airplane },
      { label: "Pilots",      href: "/fleet/pilots",      icon: User     },
      { label: "Flight Logs", href: "/fleet/flight-logs", icon: Wind     },
    ],
  },
  {
    label:        "Facilities",
    href:         "/facilities",
    icon:         Buildings,
    allowedRoles: STAFF,
  },

  // ── System ────────────────────────────────────────────────────────────────
  { type: "section", label: "System", allowedRoles: ADMIN_ROLES },
  {
    type:  "group",
    label: "Admin",
    icon:  Gear,
    allowedRoles: ADMIN_ROLES,
    children: [
      { label: "Users",    href: "/admin/users", icon: UsersThree },
      { label: "Settings", href: "/admin",       icon: Sliders    },
    ],
  },
]

// ── Role display label + accent colour ────────────────────────────────────────
const ROLE_META: Record<string, { label: string; color: string; bg: string }> = {
  admin:       { label: 'Admin',        color: '#D97706', bg: '#FFFBEB' },
  md:          { label: 'MD',           color: '#1B2A5E', bg: '#EEF1F8' },
  cto:         { label: 'CTO',          color: '#1B2A5E', bg: '#EEF1F8' },
  coo:         { label: 'COO',          color: '#1B2A5E', bg: '#EEF1F8' },
  hr:          { label: 'HR Manager',   color: '#059669', bg: '#ECFDF5' },
  finance:     { label: 'Finance',      color: '#0052CC', bg: '#EFF4FF' },
  hod:         { label: 'Head of Dept', color: '#6D28D9', bg: '#F5F3FF' },
  team_member: { label: 'Team Member',  color: '#0369A1', bg: '#EFF6FF' },
  trainee:     { label: 'Trainee',      color: '#0891B2', bg: '#ECFEFF' },
  collaborator:{ label: 'Collaborator', color: '#6B7280', bg: '#F3F4F6' },
}

// ── Sidebar component ─────────────────────────────────────────────────────────
interface SidebarProps {
  collapsed: boolean
  onToggle:  () => void
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set())

  const userRole = user?.role ?? ''
  const roleMeta = ROLE_META[userRole] ?? { label: userRole, color: '#6B7280', bg: '#F3F4F6' }

  // ── visibility helpers ────────────────────────────────────────────────────
  function visible(item: NavItem): boolean {
    if (!item.allowedRoles) return true
    return item.allowedRoles.includes(userRole)
  }

  function visibleChildren(item: NavItem): NavItem[] {
    return (item.children ?? []).filter(c => !c.allowedRoles || c.allowedRoles.includes(userRole))
  }

  // Build final list (filter + inject visible children)
  const items = NAV
    .filter(visible)
    .map(item => ({ ...item, children: item.children ? visibleChildren(item) : undefined }))
    .filter(item => !item.children || item.children.length > 0)

  // Auto-expand the section whose child is active
  React.useEffect(() => {
    const opened = new Set<string>()
    NAV.forEach(item => {
      if (item.children) {
        const anyActive = item.children.some(c => c.href && pathname.startsWith(c.href))
        if (anyActive) opened.add(item.label)
      }
    })
    if (opened.size) setExpanded(prev => new Set([...prev, ...opened]))
  }, [pathname])

  const toggle = (label: string) =>
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(label) ? next.delete(label) : next.add(label)
      return next
    })

  // Most-specific-match: a link is only active if no sibling is a longer match
  function isActive(href: string, siblings?: string[]): boolean {
    if (href === '/dashboard') return pathname === '/dashboard'
    if (!pathname.startsWith(href)) return false
    if (siblings) {
      for (const s of siblings) {
        if (s !== href && s.length > href.length && pathname.startsWith(s)) return false
      }
    }
    return true
  }

  // All hrefs across the entire nav — used so every isActive call can find
  // a more-specific match anywhere in the tree, not just among siblings.
  const allHrefs = React.useMemo(() => {
    const out: string[] = []
    NAV.forEach(item => {
      if (item.href) out.push(item.href)
      item.children?.forEach(c => { if (c.href) out.push(c.href) })
    })
    return out
  }, [])

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <aside
      className={cn(
        "fixed top-0 left-0 h-screen flex flex-col z-40",
        "transition-all duration-[220ms] ease-[cubic-bezier(0.16,1,0.3,1)]",
        collapsed ? "w-[60px]" : "w-[240px]"
      )}
      style={{
        background:  "var(--surface-base)",
        borderRight: "1px solid var(--surface-border)",
        boxShadow:   "2px 0 12px rgba(0,0,0,.04)",
      }}
    >
      {/* ── Logo bar ───────────────────────────────────────────────────────── */}
      <div
        className={cn(
          "flex items-center h-[58px] flex-shrink-0 border-b select-none",
          collapsed ? "justify-center px-0" : "px-4 gap-3"
        )}
        style={{ borderColor: "var(--surface-border)" }}
      >
        {/* Icon mark */}
        <div
          className="w-8 h-8 rounded-[var(--radius-md)] flex items-center justify-center flex-shrink-0 text-white font-bold text-sm"
          style={{ background: "linear-gradient(135deg,#1B2A5E,#2563EB)" }}
        >
          A
        </div>
        {!collapsed && (
          <div className="flex flex-col leading-none">
            <span className="text-[15px] font-bold tracking-tight" style={{ color: "var(--brand-navy)" }}>
              Ankaa<span className="text-[#2563EB]">.</span>OM
            </span>
            <span className="text-[9px] font-medium tracking-[0.15em] uppercase mt-0.5" style={{ color: "var(--text-disabled)" }}>
              ERP Platform
            </span>
          </div>
        )}
      </div>

      {/* ── Role chip ──────────────────────────────────────────────────────── */}
      {!collapsed && (
        <div className="mx-3 mt-3 mb-1">
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-full"
            style={{ background: roleMeta.bg }}
          >
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: roleMeta.color }} />
            <span className="text-[11px] font-semibold" style={{ color: roleMeta.color }}>
              {roleMeta.label}
            </span>
          </div>
        </div>
      )}

      {/* ── Navigation ─────────────────────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-2 px-2 space-y-px">
        {items.map((item, idx) => {
          // ── Section header ──────────────────────────────────────────────
          if (item.type === 'section') {
            if (collapsed) {
              return (
                <div key={`sec-${idx}`} className="my-3 mx-2">
                  <div className="h-px rounded-full" style={{ background: "var(--surface-border)" }} />
                </div>
              )
            }
            return (
              <div key={`sec-${idx}`} className="px-1 pt-5 pb-1 first:pt-2">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-4 h-px rounded-full flex-shrink-0"
                    style={{ background: "#2563EB", opacity: 0.5 }}
                  />
                  <span
                    className="text-[10px] font-bold tracking-[0.14em] uppercase select-none"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {item.label}
                  </span>
                  <div
                    className="flex-1 h-px rounded-full"
                    style={{ background: "var(--surface-border)" }}
                  />
                </div>
              </div>
            )
          }

          // ── Expandable group ────────────────────────────────────────────
          if (item.children && item.children.length > 0) {
            const isOpen        = expanded.has(item.label)
            const siblingHrefs  = allHrefs
            const childIsActive = item.children.some(c => c.href && isActive(c.href, allHrefs))
            const Icon          = item.icon!

            return (
              <div key={item.label}>
                <button
                  onClick={() => !collapsed && toggle(item.label)}
                  className={cn(
                    "w-full flex items-center rounded-[var(--radius-md)] text-[13px] font-medium transition-all duration-150 select-none",
                    collapsed ? "justify-center px-0 py-2.5 h-10" : "gap-2.5 px-2.5 py-2 justify-between",
                    childIsActive
                      ? "bg-[#EEF1F8]"
                      : "hover:bg-[#F4F5F7]"
                  )}
                  style={{ color: childIsActive ? "#1B2A5E" : "var(--text-secondary)" }}
                  title={collapsed ? item.label : undefined}
                  aria-expanded={!collapsed && isOpen}
                >
                  <span className="flex items-center gap-2.5 min-w-0">
                    <Icon
                      size={17}
                      weight={childIsActive ? "fill" : "regular"}
                      className="flex-shrink-0"
                    />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </span>
                  {!collapsed && (
                    <span className="flex-shrink-0 opacity-40">
                      {isOpen ? <CaretDown size={11} /> : <CaretRight size={11} />}
                    </span>
                  )}
                </button>

                {/* Children */}
                {!collapsed && isOpen && (
                  <div
                    className="ml-[18px] mt-0.5 mb-1 pl-3.5 flex flex-col gap-0.5 border-l"
                    style={{ borderColor: "var(--surface-border)" }}
                  >
                    {item.children.map(child => {
                      const active = child.href ? isActive(child.href, siblingHrefs) : false
                      const CIcon  = child.icon!
                      return (
                        <Link
                          key={child.href}
                          href={child.href!}
                          className={cn(
                            "flex items-center gap-2 px-2.5 py-[7px] rounded-[var(--radius-md)] text-[12.5px] transition-all duration-150",
                            active
                              ? "font-semibold"
                              : "font-normal hover:bg-[#F4F5F7]"
                          )}
                          style={{
                            background: active ? "#1B2A5E" : undefined,
                            color:      active ? "#fff"    : "var(--text-secondary)",
                          }}
                        >
                          <CIcon size={14} className="flex-shrink-0" />
                          <span className="truncate">{child.label}</span>
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          }

          // ── Direct link ─────────────────────────────────────────────────
          if (!item.href || !item.icon) return null
          const active = isActive(item.href, allHrefs)
          const Icon   = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center rounded-[var(--radius-md)] text-[13px] font-medium transition-all duration-150 select-none",
                collapsed ? "justify-center px-0 py-2.5 h-10" : "gap-2.5 px-2.5 py-2",
                active ? "" : "hover:bg-[#F4F5F7]"
              )}
              style={{
                background: active ? "#1B2A5E" : undefined,
                color:      active ? "#fff"    : "var(--text-secondary)",
              }}
              title={collapsed ? item.label : undefined}
            >
              <Icon
                size={17}
                weight={active ? "fill" : "regular"}
                className="flex-shrink-0"
              />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* ── User footer ────────────────────────────────────────────────────── */}
      <div
        className="flex-shrink-0 border-t p-2"
        style={{ borderColor: "var(--surface-border)" }}
      >
        {!collapsed && (
          <div
            className="flex items-center gap-2.5 px-2.5 py-2 rounded-[var(--radius-md)] mb-1"
            style={{ background: "var(--surface-subtle)" }}
          >
            <Avatar
              size="sm"
              name={user?.full_name ?? user?.email}
              src={user?.avatar_url ?? undefined}
            />
            <div className="flex-1 min-w-0">
              <p className="text-[12.5px] font-semibold truncate" style={{ color: "var(--text-primary)" }}>
                {user?.full_name ?? user?.email ?? "My Account"}
              </p>
              <p className="text-[10px] truncate" style={{ color: roleMeta.color }}>
                {roleMeta.label}
              </p>
            </div>
          </div>
        )}

        <button
          onClick={() => logout()}
          className={cn(
            "w-full flex items-center gap-2.5 rounded-[var(--radius-md)] text-[13px] transition-all duration-150",
            "hover:bg-red-50",
            collapsed ? "justify-center px-0 py-2.5 h-10" : "px-2.5 py-2"
          )}
          style={{ color: "#DC2626" }}
          title={collapsed ? "Sign out" : undefined}
        >
          <SignOut size={16} className="flex-shrink-0" />
          {!collapsed && <span>Sign out</span>}
        </button>
      </div>

      {/* ── Collapse toggle ─────────────────────────────────────────────────── */}
      <button
        onClick={onToggle}
        className="absolute -right-[11px] top-[70px] w-[22px] h-[22px] rounded-full border flex items-center justify-center transition-all duration-150 hover:scale-110 z-10"
        style={{
          background:   "var(--surface-base)",
          borderColor:  "var(--surface-border)",
          color:        "var(--text-muted)",
          boxShadow:    "0 1px 4px rgba(0,0,0,.10)",
        }}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? <ArrowRight size={11} /> : <ArrowLeft size={11} />}
      </button>
    </aside>
  )
}
