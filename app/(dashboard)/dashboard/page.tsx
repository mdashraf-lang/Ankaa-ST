"use client"

import * as React from "react"
import Link from "next/link"
import {
  Umbrella, Receipt, Plus, ArrowRight, CheckCircle,
  ClockCountdown, Users, Briefcase, CurrencyDollar,
  ChartBar, ShieldCheck, BookOpen, Star, TrendUp,
  Warning, Bell, UserCircle, CalendarCheck,
} from "@phosphor-icons/react"
import { useAuth } from "@/contexts/AuthContext"
import { apiFetch } from "@/lib/api"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/ui/status-badge"
import { Avatar } from "@/components/ui/avatar"
import type { LeaveBalance, LeaveRequest } from "@/lib/types"

// ── Data types ────────────────────────────────────────────────────────────────
interface DashStats {
  leave_pending: number
  active_projects: number
  employees_present: number
  pending_for_me: number
}

interface DashData {
  stats: DashStats
  my_balance: LeaveBalance | null
  upcoming_leave: LeaveRequest[]
  my_todos: { id: number; task: string; due_date: string | null; priority: string }[]
  recent_leave: (LeaveRequest & { created_at: string })[]
}

interface AdminStats {
  total_users: number
  pending_approvals: number
  invoices_unpaid: number
  active_projects: number
  pending_invoices: { id: string; name: string; amount: number; user_id: string }[]
  pending_leaves: (LeaveRequest & { profiles?: { full_name: string | null; email: string } })[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const LEAVE_LABEL: Record<string, string> = {
  annual: 'Annual', sick: 'Sick', emergency: 'Emergency',
  remote_work: 'Remote', official_trip: 'Trip', official_meeting: 'Meeting',
  maternity: 'Maternity', unpaid: 'Unpaid', other: 'Other',
}

const STAGE_COLOR: Record<string, string> = {
  pending_ghassani: '#E89B1A', pending_ramimi: '#2563EB',
  pending_hr: '#9333ea', approved: '#10A854', rejected: '#D63C3C',
}

const PRIORITY_DOT: Record<string, string> = {
  high: '#D63C3C', medium: '#E89B1A', low: '#10A854',
}

function fmt(d?: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
}

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening'
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`rounded animate-pulse ${className ?? 'h-5 w-full'}`}
    style={{ background: 'var(--surface-muted)' }} />
}

// ── ═══════════════════════════════════════════════════════════════════ ───────
//    ADMIN DASHBOARD
// ── ═══════════════════════════════════════════════════════════════════ ───────
function AdminDashboard() {
  const { user }  = useAuth()
  const [data,    setData]    = React.useState<DashData | null>(null)
  const [admin,   setAdmin]   = React.useState<AdminStats | null>(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    Promise.all([
      apiFetch<DashData>('/api/dashboard/stats'),
      apiFetch<{ users: { id: string }[] }>('/api/users'),
      apiFetch<{ leave_requests: (LeaveRequest & { profiles?: { full_name: string | null; email: string } })[] }>('/api/leave-requests?pending_approval=true'),
      apiFetch<{ invoices: { id: string; name: string; amount: number; user_id: string; status: string }[] }>('/api/invoices'),
    ]).then(([d, usersRes, leaveRes, invRes]) => {
      setData(d)
      const unpaidInv = (invRes.invoices ?? []).filter(i => i.status === 'unpaid')
      setAdmin({
        total_users:       usersRes.users?.length ?? 0,
        pending_approvals: leaveRes.leave_requests?.length ?? 0,
        invoices_unpaid:   unpaidInv.length,
        active_projects:   d.stats.active_projects,
        pending_invoices:  unpaidInv.slice(0, 4),
        pending_leaves:    (leaveRes.leave_requests ?? []).slice(0, 4),
      })
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold px-2 py-0.5 rounded-full"
              style={{ background: '#FFFBEB', color: '#D97706' }}>
              ADMIN
            </span>
          </div>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
            Good {greeting()}, {user?.full_name?.split(' ')[0]} 👋
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Full system access · {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/users"><Button variant="secondary" size="sm"><Users size={14} /> Manage Users</Button></Link>
          <Link href="/people/leave/approvals"><Button variant="primary" size="sm"><ClockCountdown size={14} /> Approvals</Button></Link>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Employees',   value: admin?.total_users       ?? 0, icon: Users,          color: '#1B2A5E', bg: '#EEF1F8' },
          { label: 'Pending Approvals', value: admin?.pending_approvals ?? 0, icon: ClockCountdown, color: '#E89B1A', bg: '#FFF8E6' },
          { label: 'Active Projects',   value: admin?.active_projects   ?? 0, icon: Briefcase,      color: '#2563EB', bg: '#EFF4FF' },
          { label: 'Unpaid Invoices',   value: admin?.invoices_unpaid   ?? 0, icon: CurrencyDollar, color: '#DC2626', bg: '#FFF0F0' },
        ].map(kpi => (
          <div key={kpi.label} className="flex flex-col gap-3 p-4 rounded-[var(--radius-lg)] border"
            style={{ background: 'var(--surface-base)', borderColor: 'var(--surface-border)' }}>
            <div className="flex items-center justify-between">
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{kpi.label}</span>
              <div className="w-8 h-8 rounded-[var(--radius-md)] flex items-center justify-center"
                style={{ background: kpi.bg }}>
                <kpi.icon size={16} style={{ color: kpi.color }} />
              </div>
            </div>
            {loading
              ? <Skeleton className="h-8 w-16" />
              : <span className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{kpi.value}</span>}
          </div>
        ))}
      </div>

      {/* Main panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pending leave approvals */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <ClockCountdown size={16} style={{ color: '#E89B1A' }} />
                <CardTitle>Pending Leave Approvals</CardTitle>
                {admin?.pending_approvals ? (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{ background: '#FFF8E6', color: '#E89B1A' }}>
                    {admin.pending_approvals}
                  </span>
                ) : null}
              </div>
              <Link href="/people/leave/approvals">
                <Button variant="ghost" size="sm" style={{ color: 'var(--text-muted)' }}>
                  View all <ArrowRight size={13} />
                </Button>
              </Link>
            </CardHeader>
            {loading ? <Skeleton className="h-32 mx-4 mb-4" /> :
              (admin?.pending_leaves ?? []).length === 0 ? (
                <div className="flex items-center justify-center py-10">
                  <div className="flex flex-col items-center gap-1">
                    <CheckCircle size={24} style={{ color: '#10A854' }} />
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>All clear — no pending approvals</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col divide-y" style={{ borderColor: 'var(--surface-border)' }}>
                  {(admin?.pending_leaves ?? []).map(lr => (
                    <div key={lr.id} className="flex items-center gap-3 px-4 py-3">
                      <Avatar name={lr.profiles?.full_name ?? lr.profiles?.email} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                          {lr.profiles?.full_name ?? lr.profiles?.email ?? '—'}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          {LEAVE_LABEL[lr.leave_type] ?? lr.leave_type} · {fmt(lr.start_date)} – {fmt(lr.end_date)}
                        </p>
                      </div>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
                        style={{ background: `${STAGE_COLOR[lr.status] ?? '#ccc'}18`, color: STAGE_COLOR[lr.status] ?? '#777' }}>
                        {lr.status.replace('pending_', '').toUpperCase()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
          </Card>
        </div>

        {/* System management links */}
        <Card>
          <CardHeader><CardTitle>System Management</CardTitle></CardHeader>
          <div className="flex flex-col gap-2 pb-2">
            {[
              { label: 'User Management',    href: '/admin/users',          icon: Users,          color: '#1B2A5E' },
              { label: 'Org Chart Editor',   href: '/people/org-chart',     icon: ShieldCheck,    color: '#2563EB' },
              { label: 'Payroll Overview',   href: '/people/payroll',       icon: CurrencyDollar, color: '#059669' },
              { label: 'Finance & Invoices', href: '/finance',              icon: ChartBar,       color: '#D97706' },
              { label: 'Roster',             href: '/people/roster',        icon: CalendarCheck,  color: '#7C3AED' },
              { label: 'System Settings',    href: '/admin',                icon: ShieldCheck,    color: '#6B7280' },
            ].map(({ label, href, icon: Icon, color }) => (
              <Link key={href} href={href}
                className="flex items-center gap-3 px-4 py-2.5 rounded-[var(--radius-md)] transition-colors hover:bg-[#F1F3F7]">
                <div className="w-7 h-7 rounded-[var(--radius-md)] flex items-center justify-center flex-shrink-0"
                  style={{ background: `${color}15` }}>
                  <Icon size={14} style={{ color }} />
                </div>
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{label}</span>
                <ArrowRight size={12} className="ml-auto" style={{ color: 'var(--text-disabled)' }} />
              </Link>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}

// ── ═══════════════════════════════════════════════════════════════════ ───────
//    TRAINEE DASHBOARD
// ── ═══════════════════════════════════════════════════════════════════ ───────
function TraineeDashboard() {
  const { user }  = useAuth()
  const [data,    setData]    = React.useState<DashData | null>(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    apiFetch<DashData>('/api/dashboard/stats')
      .then(setData).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const bal = data?.my_balance

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-bold px-2 py-0.5 rounded-full"
            style={{ background: '#ECFEFF', color: '#0891B2' }}>
            TRAINEE
          </span>
        </div>
        <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
          Good {greeting()}, {user?.full_name?.split(' ')[0]} 🎓
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
          {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Welcome card */}
      <div className="p-5 rounded-[var(--radius-xl)] border"
        style={{ background: 'linear-gradient(135deg, #1B2A5E, #2D4A9A)', borderColor: 'transparent' }}>
        <div className="flex items-center gap-4">
          <Avatar name={user?.full_name ?? 'Trainee'} size="xl" />
          <div>
            <h2 className="text-base font-bold text-white">{user?.full_name}</h2>
            <p className="text-sm text-white/70">Software Engineering Trainee</p>
            <div className="flex items-center gap-1.5 mt-2">
              <Star size={12} style={{ color: '#F59E0B' }} weight="fill" />
              <span className="text-xs font-medium" style={{ color: '#FCD34D' }}>Trainee Program — Cohort 2026</span>
            </div>
          </div>
        </div>
      </div>

      {/* Leave balance summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Annual Leave',    days: bal?.annual_leave_days    ?? 30, max: 30, color: '#2563EB', bg: '#EFF4FF' },
          { label: 'Sick Leave',      days: bal?.sick_leave_days      ?? 21, max: 21, color: '#10A854', bg: '#EDFBF3' },
          { label: 'Emergency Leave', days: bal?.emergency_leave_days ??  6, max:  6, color: '#E89B1A', bg: '#FFF8E6' },
        ].map(b => (
          <div key={b.label} className="flex flex-col gap-2 p-4 rounded-[var(--radius-lg)] border"
            style={{ background: 'var(--surface-base)', borderColor: 'var(--surface-border)' }}>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{b.label}</span>
            {loading ? <Skeleton className="h-6 w-12" /> : (
              <span className="text-xl font-bold" style={{ color: b.color }}>{b.days}</span>
            )}
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--surface-muted)' }}>
              <div className="h-full rounded-full" style={{ width: `${(b.days / b.max) * 100}%`, background: b.color }} />
            </div>
            <span className="text-[10px]" style={{ color: 'var(--text-disabled)' }}>of {b.max} days</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* My open tasks */}
        <Card>
          <CardHeader>
            <CardTitle>My Open Tasks</CardTitle>
            <Link href="/tasks"><Button variant="ghost" size="sm" style={{ color: 'var(--text-muted)' }}>Board</Button></Link>
          </CardHeader>
          {loading ? <Skeleton className="h-24 mx-4 mb-4" /> :
            (data?.my_todos ?? []).length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8">
                <CheckCircle size={22} style={{ color: '#10A854' }} />
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No open tasks — great work!</p>
              </div>
            ) : (
              <div className="flex flex-col divide-y pb-2" style={{ borderColor: 'var(--surface-border)' }}>
                {data?.my_todos.map(t => (
                  <div key={t.id} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: PRIORITY_DOT[t.priority] ?? '#ccc' }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate" style={{ color: 'var(--text-primary)' }}>{t.task}</p>
                      {t.due_date && (
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Due {fmt(t.due_date)}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
        </Card>

        {/* Quick actions for trainee */}
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader><CardTitle>Quick Actions</CardTitle></CardHeader>
            <div className="grid grid-cols-2 gap-2 px-4 pb-4">
              {[
                { label: 'Apply for Leave', href: '/people/leave/apply', icon: Umbrella,     color: '#E89B1A', bg: '#FFF8E6' },
                { label: 'View My Leave',   href: '/people/leave',       icon: CalendarCheck,color: '#2563EB', bg: '#EFF4FF' },
                { label: 'My Profile',      href: '/people/profile',     icon: UserCircle,   color: '#7C3AED', bg: '#F5F3FF' },
                { label: 'My Tasks',        href: '/tasks',              icon: TrendUp,      color: '#10A854', bg: '#EDFBF3' },
              ].map(a => (
                <Link key={a.href} href={a.href}>
                  <div className="flex flex-col gap-2 p-3 rounded-[var(--radius-lg)] border cursor-pointer transition-all hover:shadow-md"
                    style={{ borderColor: 'var(--surface-border)', background: 'var(--surface-subtle)' }}>
                    <div className="w-8 h-8 rounded-[var(--radius-md)] flex items-center justify-center"
                      style={{ background: a.bg }}>
                      <a.icon size={15} style={{ color: a.color }} />
                    </div>
                    <p className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{a.label}</p>
                  </div>
                </Link>
              ))}
            </div>
          </Card>

          {/* My recent leave */}
          <Card>
            <CardHeader>
              <CardTitle>My Leave History</CardTitle>
              <Link href="/people/leave"><Button variant="ghost" size="sm" style={{ color: 'var(--text-muted)' }}>All</Button></Link>
            </CardHeader>
            {loading ? <Skeleton className="h-16 mx-4 mb-4" /> :
              (data?.recent_leave ?? []).length === 0 ? (
                <p className="text-sm text-center py-6" style={{ color: 'var(--text-muted)' }}>No leave requests yet.</p>
              ) : (
                <div className="flex flex-col divide-y pb-2" style={{ borderColor: 'var(--surface-border)' }}>
                  {data?.recent_leave.slice(0, 3).map(lr => (
                    <div key={lr.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                      <div>
                        <p className="text-sm capitalize" style={{ color: 'var(--text-primary)' }}>
                          {LEAVE_LABEL[lr.leave_type] ?? lr.leave_type}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          {fmt(lr.start_date)} – {fmt(lr.end_date)}
                        </p>
                      </div>
                      <StatusBadge status={lr.status} />
                    </div>
                  ))}
                </div>
              )}
          </Card>
        </div>
      </div>

      {/* Training tip */}
      <div className="flex items-start gap-3 p-4 rounded-[var(--radius-lg)] border"
        style={{ background: '#ECFEFF', borderColor: '#0891B220' }}>
        <div className="w-8 h-8 rounded-[var(--radius-md)] flex items-center justify-center flex-shrink-0"
          style={{ background: '#0891B220' }}>
          <BookOpen size={16} style={{ color: '#0891B2' }} />
        </div>
        <div>
          <p className="text-sm font-semibold" style={{ color: '#0E7490' }}>Trainee Resources</p>
          <p className="text-xs mt-0.5" style={{ color: '#0E7490' }}>
            Access your onboarding materials, training guides, and team contacts through the Training section in the sidebar.
          </p>
        </div>
        <Bell size={14} style={{ color: '#0891B2' }} className="flex-shrink-0 mt-0.5" />
      </div>
    </div>
  )
}

// ── ═══════════════════════════════════════════════════════════════════ ───────
//    REGULAR EMPLOYEE / HOD / HR / FINANCE DASHBOARD
// ── ═══════════════════════════════════════════════════════════════════ ───────
function EmployeeDashboard() {
  const { user }  = useAuth()
  const [data,    setData]    = React.useState<DashData | null>(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    apiFetch<DashData>('/api/dashboard/stats')
      .then(setData).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const bal = data?.my_balance

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
            Good {greeting()}, {user?.full_name?.split(' ')[0] ?? 'there'} 👋
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Link href="/people/leave/apply">
            <Button variant="secondary" size="sm"><Umbrella size={14} /> Apply Leave</Button>
          </Link>
          <Link href="/finance">
            <Button variant="secondary" size="sm"><Receipt size={14} /> Expense</Button>
          </Link>
        </div>
      </div>

      {/* Leave balance */}
      <Card>
        <CardHeader>
          <CardTitle>My Leave Balance</CardTitle>
          <Link href="/people/leave"><Button variant="ghost" size="sm" style={{ color: 'var(--text-muted)' }}>Details <ArrowRight size={13} /></Button></Link>
        </CardHeader>
        {loading ? <Skeleton className="h-20 mx-4 mb-4" /> : (
          <div className="flex flex-col gap-3 px-4 pb-4">
            {[
              { label: 'Annual Leave',    days: bal?.annual_leave_days    ?? 30, max: 30, color: '#2563EB' },
              { label: 'Sick Leave',      days: bal?.sick_leave_days      ?? 21, max: 21, color: '#10A854' },
              { label: 'Emergency Leave', days: bal?.emergency_leave_days ??  6, max:  6, color: '#E89B1A' },
            ].map(b => (
              <div key={b.label} className="flex items-center gap-3">
                <span className="text-sm w-28 flex-shrink-0" style={{ color: 'var(--text-secondary)' }}>{b.label}</span>
                <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--surface-muted)' }}>
                  <div className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min((b.days / b.max) * 100, 100)}%`, background: b.color }} />
                </div>
                <span className="text-sm font-semibold w-14 text-right" style={{ color: 'var(--text-primary)' }}>
                  {b.days} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>/ {b.max}</span>
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* My tasks */}
        <Card>
          <CardHeader><CardTitle>Open Tasks</CardTitle><Link href="/tasks"><Button variant="ghost" size="sm" style={{ color: 'var(--text-muted)' }}>Board</Button></Link></CardHeader>
          {loading ? <Skeleton className="h-24 mx-4 mb-4" /> :
            (data?.my_todos ?? []).length === 0 ? (
              <p className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>No open tasks</p>
            ) : (
              <div className="flex flex-col divide-y pb-2" style={{ borderColor: 'var(--surface-border)' }}>
                {data?.my_todos.map(t => (
                  <div key={t.id} className="flex items-center gap-2.5 px-4 py-2.5">
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: PRIORITY_DOT[t.priority] ?? '#ccc' }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate" style={{ color: 'var(--text-primary)' }}>{t.task}</p>
                      {t.due_date && <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Due {fmt(t.due_date)}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
        </Card>

        {/* Upcoming leave */}
        <Card>
          <CardHeader><CardTitle>Upcoming Leave</CardTitle><Link href="/people/leave"><Button variant="ghost" size="sm" style={{ color: 'var(--text-muted)' }}>All</Button></Link></CardHeader>
          {loading ? <Skeleton className="h-24 mx-4 mb-4" /> :
            (data?.upcoming_leave ?? []).length === 0 ? (
              <p className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>No upcoming leave</p>
            ) : (
              <div className="flex flex-col divide-y pb-2" style={{ borderColor: 'var(--surface-border)' }}>
                {data?.upcoming_leave.map(lr => (
                  <div key={lr.id} className="flex flex-col gap-0.5 px-4 py-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium capitalize" style={{ color: 'var(--text-primary)' }}>
                        {LEAVE_LABEL[lr.leave_type] ?? lr.leave_type}
                      </span>
                      <StatusBadge status={lr.status} />
                    </div>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {fmt(lr.start_date)} – {fmt(lr.end_date)} {lr.total_working_days ? `· ${lr.total_working_days}d` : ''}
                    </p>
                  </div>
                ))}
              </div>
            )}
        </Card>

        {/* Quick actions */}
        <Card>
          <CardHeader><CardTitle>Quick Actions</CardTitle></CardHeader>
          <div className="grid grid-cols-2 gap-2 px-4 pb-4">
            {[
              { label: 'Apply Leave',  href: '/people/leave/apply', icon: Umbrella,     color: '#E89B1A', bg: '#FFF8E6' },
              { label: 'Expense',      href: '/finance',            icon: Receipt,      color: '#10A854', bg: '#EDFBF3' },
              { label: 'New Task',     href: '/tasks',              icon: Plus,         color: '#1B2A5E', bg: '#EEF1F8' },
              { label: 'Org Chart',    href: '/people/org-chart',   icon: Users,        color: '#7C3AED', bg: '#F5F3FF' },
            ].map(a => (
              <Link key={a.href} href={a.href}>
                <div className="flex flex-col gap-2 p-3 rounded-[var(--radius-lg)] border cursor-pointer transition-all hover:shadow-md"
                  style={{ borderColor: 'var(--surface-border)', background: 'var(--surface-subtle)' }}>
                  <div className="w-8 h-8 rounded-[var(--radius-md)] flex items-center justify-center" style={{ background: a.bg }}>
                    <a.icon size={15} style={{ color: a.color }} />
                  </div>
                  <p className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{a.label}</p>
                </div>
              </Link>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}

// ── ═══════════════════════════════════════════════════════════════════ ───────
//    ROUTER — pick dashboard by role
// ── ═══════════════════════════════════════════════════════════════════ ───────
export default function DashboardPage() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-t-[#1B2A5E] rounded-full animate-spin"
            style={{ borderColor: 'var(--surface-border)', borderTopColor: '#1B2A5E' }} />
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading…</p>
        </div>
      </div>
    )
  }

  const role = user?.role ?? ''

  if (role === 'admin')        return <AdminDashboard />
  if (role === 'trainee')      return <TraineeDashboard />

  return <EmployeeDashboard />
}
