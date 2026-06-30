"use client"

import * as React from "react"
import {
  PencilSimple, Camera, Lock, IdentificationCard, Briefcase,
  UserCircle, FloppyDisk, CheckCircle, Clock, Star, BookOpen,
  GraduationCap, Trophy, Rocket, Code, Users, Envelope,
  Phone, CalendarBlank, IdentificationBadge, ArrowRight,
} from "@phosphor-icons/react"
import Link from "next/link"
import { PageHeader } from "@/components/ui/page-header"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar } from "@/components/ui/avatar"
import { StatusBadge } from "@/components/ui/status-badge"
import { useAuth } from "@/contexts/AuthContext"
import { apiFetch } from "@/lib/api"
import type { Profile, LeaveBalance, LeaveRequest } from "@/lib/types"

// ── Shared helpers ────────────────────────────────────────────────────────────
function fmt(d?: string | null) {
  if (!d) return null
  try { return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) }
  catch { return d }
}

function InfoField({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>{label}</span>
      <span className="text-sm" style={{ color: value ? "var(--text-primary)" : "var(--text-disabled)" }}>
        {value ?? "—"}
      </span>
    </div>
  )
}

const CONTRACT_LABEL: Record<string, string> = {
  full_time: "Full Time", part_time: "Part Time", contractor: "Contractor", intern: "Intern / Trainee",
}

const LEAVE_TYPE: Record<string, string> = {
  annual: "Annual", sick: "Sick", emergency: "Emergency", remote_work: "Remote Work",
  official_trip: "Official Trip", official_meeting: "Meeting", unpaid: "Unpaid", other: "Other",
}

// ── ═══════════════════════════════════════════════════════════════════ ───────
//   TRAINEE PROFILE
// ── ═══════════════════════════════════════════════════════════════════ ───────

// Compute days / weeks / months since joining
function programStats(joiningDate?: string | null) {
  if (!joiningDate) return { days: 0, weeks: 0, months: 0, pct: 0 }
  const start    = new Date(joiningDate)
  const now      = new Date()
  const days     = Math.max(0, Math.floor((now.getTime() - start.getTime()) / 86_400_000))
  const weeks    = Math.floor(days / 7)
  const months   = Math.floor(days / 30)
  // 12-month trainee program → pct capped at 100
  const pct      = Math.min(100, Math.round((days / 365) * 100))
  return { days, weeks, months, pct }
}

// Milestones unlocked by elapsed time
function getMilestones(joiningDate?: string | null) {
  const { days } = programStats(joiningDate)
  return [
    { label: "Company Orientation",       icon: Star,        days: 2,   desc: "First-day induction & office tour" },
    { label: "Team Introductions",        icon: Users,       days: 7,   desc: "Meet your team and supervisor" },
    { label: "Dev Environment Setup",     icon: Code,        days: 14,  desc: "Tools, repos, access & local setup" },
    { label: "First Task Assigned",       icon: Rocket,      days: 30,  desc: "Contribute to a real project card" },
    { label: "Code Review Participation", icon: BookOpen,    days: 60,  desc: "Review and be reviewed by peers" },
    { label: "Mid-term Review",           icon: Trophy,      days: 182, desc: "Performance check with supervisor" },
    { label: "Final Evaluation",          icon: GraduationCap, days: 365, desc: "Program completion assessment" },
  ].map(m => ({ ...m, done: days >= m.days }))
}

const TRAINEE_SKILLS = [
  { name: "JavaScript",  color: "#F7DF1E", bg: "#FEF9C3" },
  { name: "TypeScript",  color: "#3178C6", bg: "#EFF6FF" },
  { name: "React",       color: "#61DAFB", bg: "#F0FFFE" },
  { name: "Next.js",     color: "#000000", bg: "#F3F4F6" },
  { name: "PostgreSQL",  color: "#336791", bg: "#EFF4FF" },
  { name: "Git",         color: "#F05032", bg: "#FFF1F0" },
  { name: "Node.js",     color: "#339933", bg: "#F0FFF4" },
  { name: "Tailwind CSS",color: "#0EA5E9", bg: "#F0F9FF" },
]

// SVG progress arc
function ProgressRing({ pct, size = 96 }: { pct: number; size?: number }) {
  const r   = (size - 16) / 2
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ

  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={8}
        stroke="var(--surface-muted)" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={8}
        stroke="#0891B2" strokeLinecap="round"
        strokeDasharray={`${dash} ${circ}`}
        style={{ transition: "stroke-dasharray 1s ease" }} />
    </svg>
  )
}

interface TraineeProfileProps {
  profile: Profile
  balance: LeaveBalance | null
  recentLeave: LeaveRequest[]
  todos: { id: number; task: string; due_date: string | null; priority: string }[]
  onEdit: () => void
  onChangePassword: () => void
}

function TraineeProfile({ profile, balance, recentLeave, todos, onEdit, onChangePassword }: TraineeProfileProps) {
  const stats      = programStats(profile.joining_date)
  const milestones = getMilestones(profile.joining_date)
  const done       = milestones.filter(m => m.done).length

  return (
    <div className="flex flex-col gap-5 max-w-4xl">

      {/* ── Hero card ──────────────────────────────────────────────────────── */}
      <div className="rounded-2xl overflow-hidden border" style={{ borderColor: "var(--surface-border)" }}>
        {/* Banner */}
        <div className="h-28 relative"
          style={{ background: "linear-gradient(135deg, #0891B2 0%, #0E7490 40%, #1B2A5E 100%)" }}>
          {/* Decorative circles */}
          <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full opacity-10"
            style={{ background: "white" }} />
          <div className="absolute top-4 right-16 w-16 h-16 rounded-full opacity-10"
            style={{ background: "white" }} />
          {/* Trainee badge */}
          <span className="absolute top-4 left-4 text-xs font-bold px-3 py-1 rounded-full"
            style={{ background: "rgba(255,255,255,0.2)", color: "white", backdropFilter: "blur(4px)" }}>
            🎓 TRAINEE PROGRAM
          </span>
          {/* Edit button */}
          <button onClick={onEdit}
            className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-md)] text-xs font-medium transition-colors hover:bg-white/30"
            style={{ background: "rgba(255,255,255,0.15)", color: "white" }}>
            <PencilSimple size={12} /> Edit Profile
          </button>
        </div>

        {/* Body */}
        <div style={{ background: "var(--surface-base)" }}>
          <div className="px-6 pb-6">
            {/* Avatar overlapping the banner */}
            <div className="relative -mt-12 mb-4 flex items-end justify-between">
              <div className="relative">
                <Avatar
                  name={profile.full_name ?? "Trainee"}
                  src={profile.avatar_url ?? undefined}
                  size="xl"
                  className="ring-4 ring-white"
                />
                <button
                  className="absolute bottom-0 right-0 w-7 h-7 rounded-full flex items-center justify-center text-white shadow-md border-2 border-white"
                  style={{ background: "#0891B2" }}>
                  <Camera size={12} />
                </button>
              </div>
              {/* Status chip */}
              <div className="mb-1 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ background: "#10B981" }} />
                <span className="text-xs font-medium" style={{ color: "#10B981" }}>Active Trainee</span>
              </div>
            </div>

            {/* Name + role */}
            <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
              {profile.full_name}
            </h1>
            <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
              {profile.position_title ?? "Software Engineering Trainee"} · {profile.department_id ?? "Software Engineering"}
            </p>

            {/* Quick stats row */}
            <div className="flex flex-wrap gap-6 mt-5 pt-5 border-t" style={{ borderColor: "var(--surface-border)" }}>
              {[
                { label: "Employee ID",     value: profile.employee_id ?? "—",     icon: IdentificationBadge },
                { label: "Email",           value: profile.email,                   icon: Envelope },
                { label: "Phone",           value: profile.phone_number ?? "—",    icon: Phone },
                { label: "Joined",          value: fmt(profile.joining_date) ?? "—",icon: CalendarBlank },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-[var(--radius-md)] flex items-center justify-center flex-shrink-0"
                    style={{ background: "#ECFEFF" }}>
                    <Icon size={14} style={{ color: "#0891B2" }} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{label}</p>
                    <p className="text-xs font-semibold truncate" style={{ color: "var(--text-primary)" }}>{value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Program progress + milestones ─────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Progress ring */}
        <Card>
          <CardHeader><CardTitle>Program Progress</CardTitle></CardHeader>
          <div className="flex flex-col items-center gap-4 pb-4">
            <div className="relative">
              <ProgressRing pct={stats.pct} size={112} />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold" style={{ color: "#0891B2" }}>{stats.pct}%</span>
                <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>Complete</span>
              </div>
            </div>
            <div className="grid grid-cols-3 w-full gap-2 text-center">
              {[
                { label: "Days",   value: stats.days   },
                { label: "Weeks",  value: stats.weeks  },
                { label: "Months", value: stats.months },
              ].map(s => (
                <div key={s.label} className="flex flex-col gap-0.5 p-2 rounded-[var(--radius-md)]"
                  style={{ background: "#ECFEFF" }}>
                  <span className="text-lg font-bold" style={{ color: "#0891B2" }}>{s.value}</span>
                  <span className="text-[10px]" style={{ color: "#0E7490" }}>{s.label}</span>
                </div>
              ))}
            </div>
            <div className="w-full text-center">
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                Cohort 2026 · 12-Month Program
              </span>
            </div>
          </div>
        </Card>

        {/* Milestones */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Training Milestones</CardTitle>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{ background: "#ECFEFF", color: "#0891B2" }}>
                {done}/{milestones.length} complete
              </span>
            </CardHeader>
            <div className="flex flex-col gap-0 pb-2">
              {milestones.map((m, i) => (
                <div key={m.label} className="flex items-start gap-3 px-4 py-2.5 relative">
                  {/* Vertical connector */}
                  {i < milestones.length - 1 && (
                    <div className="absolute left-[27px] top-10 bottom-0 w-px"
                      style={{ background: m.done ? "#0891B2" : "var(--surface-border)" }} />
                  )}
                  {/* Icon circle */}
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 z-10 transition-colors duration-300 ${
                    m.done
                      ? "bg-[#0891B2]"
                      : "bg-[var(--surface-muted)] border-2 border-dashed border-[var(--surface-border)]"
                  }`}>
                    {m.done
                      ? <CheckCircle size={14} weight="fill" style={{ color: "white" }} />
                      : <Clock size={12} style={{ color: "var(--text-disabled)" }} />}
                  </div>
                  <div className="flex-1 min-w-0 pt-0.5">
                    <p className={`text-sm font-semibold ${m.done ? "" : "opacity-50"}`}
                      style={{ color: "var(--text-primary)" }}>
                      {m.label}
                    </p>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>{m.desc}</p>
                  </div>
                  {m.done && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 mt-0.5"
                      style={{ background: "#ECFEFF", color: "#0891B2" }}>
                      ✓ Done
                    </span>
                  )}
                  {!m.done && stats.days < m.days && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0 mt-0.5"
                      style={{ background: "var(--surface-muted)", color: "var(--text-disabled)" }}>
                      Day {m.days}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* ── Skills ───────────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Code size={16} style={{ color: "#0891B2" }} />
            <CardTitle>Skills & Technologies</CardTitle>
          </div>
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>Being trained in</span>
        </CardHeader>
        <div className="flex flex-wrap gap-2 pb-4 px-4">
          {TRAINEE_SKILLS.map(s => (
            <span key={s.name}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-transform hover:scale-105"
              style={{ background: s.bg, color: s.color, borderColor: `${s.color}30` }}>
              <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />
              {s.name}
            </span>
          ))}
        </div>
      </Card>

      {/* ── Personal info (editable) ─────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <IdentificationCard size={16} style={{ color: "#0891B2" }} />
            <CardTitle>Personal Information</CardTitle>
          </div>
          <Button variant="ghost" size="sm" onClick={onEdit}>
            <PencilSimple size={14} /> Edit
          </Button>
        </CardHeader>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-8 gap-y-4 pb-4">
          <InfoField label="Full Name"         value={profile.full_name} />
          <InfoField label="Email"             value={profile.email} />
          <InfoField label="Phone"             value={profile.phone_number} />
          <InfoField label="Emergency Contact" value={profile.emergency_number} />
          <InfoField label="Gender"            value={profile.gender} />
          <InfoField label="Date of Birth"     value={fmt(profile.date_of_birth)} />
          <InfoField label="Username"          value={profile.username} />
        </div>
      </Card>

      {/* ── Leave balance (compact) ────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CalendarBlank size={16} style={{ color: "#0891B2" }} />
            <CardTitle>Leave Balance</CardTitle>
          </div>
          <Link href="/people/leave">
            <Button variant="ghost" size="sm" style={{ color: "var(--text-muted)" }}>
              Apply <ArrowRight size={13} />
            </Button>
          </Link>
        </CardHeader>
        {balance ? (
          <div className="grid grid-cols-3 gap-4 pb-4">
            {[
              { label: "Annual",    days: balance.annual_leave_days,    max: 30, color: "#2563EB", bg: "#EFF4FF" },
              { label: "Sick",      days: balance.sick_leave_days,      max: 21, color: "#10A854", bg: "#EDFBF3" },
              { label: "Emergency", days: balance.emergency_leave_days, max:  6, color: "#E89B1A", bg: "#FFF8E6" },
            ].map(b => (
              <div key={b.label} className="flex flex-col gap-2 p-4 rounded-[var(--radius-lg)]"
                style={{ background: b.bg }}>
                <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>{b.label}</span>
                <span className="text-2xl font-bold" style={{ color: b.color }}>{b.days}</span>
                <div className="h-1.5 rounded-full overflow-hidden bg-white/50">
                  <div className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min((b.days / b.max) * 100, 100)}%`, background: b.color }} />
                </div>
                <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>of {b.max} days</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm pb-4" style={{ color: "var(--text-muted)" }}>No leave balance data.</p>
        )}
      </Card>

      {/* ── My open tasks ─────────────────────────────────────────────────── */}
      {todos.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Rocket size={16} style={{ color: "#0891B2" }} />
              <CardTitle>My Current Tasks</CardTitle>
            </div>
            <Link href="/tasks">
              <Button variant="ghost" size="sm" style={{ color: "var(--text-muted)" }}>Board</Button>
            </Link>
          </CardHeader>
          <div className="flex flex-col divide-y pb-2" style={{ borderColor: "var(--surface-border)" }}>
            {todos.map(t => {
              const dotColor = t.priority === "high" ? "#DC2626" : t.priority === "medium" ? "#E89B1A" : "#10A854"
              return (
                <div key={t.id} className="flex items-center gap-3 px-4 py-2.5">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: dotColor }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate" style={{ color: "var(--text-primary)" }}>{t.task}</p>
                    {t.due_date && (
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                        Due {fmt(t.due_date)}
                      </p>
                    )}
                  </div>
                  <span className="text-[10px] capitalize px-2 py-0.5 rounded-full font-medium"
                    style={{ background: `${dotColor}15`, color: dotColor }}>
                    {t.priority}
                  </span>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* ── Recent leave ──────────────────────────────────────────────────── */}
      {recentLeave.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Leave Requests</CardTitle>
            <Link href="/people/leave">
              <Button variant="ghost" size="sm" style={{ color: "var(--text-muted)" }}>All</Button>
            </Link>
          </CardHeader>
          <div className="flex flex-col divide-y pb-2" style={{ borderColor: "var(--surface-border)" }}>
            {recentLeave.map(lr => (
              <div key={lr.id} className="flex items-center justify-between gap-4 px-4 py-3">
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-sm font-medium capitalize" style={{ color: "var(--text-primary)" }}>
                    {LEAVE_TYPE[lr.leave_type] ?? lr.leave_type}
                  </span>
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {fmt(lr.start_date)} – {fmt(lr.end_date)}
                    {lr.total_working_days ? ` · ${lr.total_working_days}d` : ""}
                  </span>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-semibold flex-shrink-0 ${
                  lr.status === "approved"              ? "bg-green-50 text-green-700" :
                  lr.status.startsWith("pending")       ? "bg-yellow-50 text-yellow-700" :
                  lr.status === "rejected"              ? "bg-red-50 text-red-700"
                                                        : "bg-gray-100 text-gray-600"
                }`}>
                  {lr.status === "approved" ? "Approved" :
                   lr.status.startsWith("pending") ? "Pending" :
                   lr.status === "rejected" ? "Rejected" : lr.status}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── Change password ───────────────────────────────────────────────── */}
      <button onClick={onChangePassword}
        className="flex items-center gap-3 px-4 py-3 rounded-[var(--radius-lg)] border transition-colors hover:bg-[#F1F3F7] text-left"
        style={{ borderColor: "var(--surface-border)", background: "var(--surface-base)" }}>
        <div className="w-8 h-8 rounded-[var(--radius-md)] flex items-center justify-center"
          style={{ background: "#F3F4F6" }}>
          <Lock size={15} style={{ color: "var(--text-secondary)" }} />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Change Password</p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>Update your account password</p>
        </div>
        <ArrowRight size={14} style={{ color: "var(--text-muted)" }} />
      </button>
    </div>
  )
}

// ── ═══════════════════════════════════════════════════════════════════ ───────
//   REGULAR PROFILE (all other roles)
// ── ═══════════════════════════════════════════════════════════════════ ───────
interface RegularProfileProps {
  profile: Profile
  balance: LeaveBalance | null
  recentLeave: LeaveRequest[]
  editingSection: string | null
  setEditingSection: (s: string | null) => void
  personalForm: { full_name: string; phone_number: string; emergency_number: string; gender: string; date_of_birth: string }
  setPersonalForm: React.Dispatch<React.SetStateAction<{ full_name: string; phone_number: string; emergency_number: string; gender: string; date_of_birth: string }>>
  savePersonal: () => void
  saving: boolean
  changingPassword: boolean
  setChangingPassword: (v: boolean) => void
  passwordData: { current: string; new: string; confirm: string }
  setPasswordData: React.Dispatch<React.SetStateAction<{ current: string; new: string; confirm: string }>>
  changePassword: () => void
  pwError: string | null
  pwSuccess: boolean
  setPwError: (v: string | null) => void
  setPwSuccess: (v: boolean) => void
}

function RegularProfile({
  profile, balance, recentLeave,
  editingSection, setEditingSection,
  personalForm, setPersonalForm, savePersonal, saving,
  changingPassword, setChangingPassword,
  passwordData, setPasswordData, changePassword,
  pwError, pwSuccess, setPwError, setPwSuccess,
}: RegularProfileProps) {
  return (
    <div className="flex flex-col gap-6 max-w-4xl">

      {/* Avatar + quick info */}
      <Card>
        <div className="flex items-start gap-5">
          <div className="relative flex-shrink-0">
            <Avatar src={profile.avatar_url} name={profile.full_name ?? "User"} size="xl" />
            <button className="absolute bottom-0 right-0 w-7 h-7 rounded-full flex items-center justify-center text-white shadow-md border-2 border-white"
              style={{ background: "var(--brand-navy)" }}>
              <Camera size={13} />
            </button>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
                  {profile.full_name ?? "—"}
                </h2>
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>{profile.position_title ?? "—"}</p>
                <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>{profile.email}</p>
              </div>
              <StatusBadge status={(profile.status as "active"|"inactive"|"on_leave"|"terminated") ?? "active"} />
            </div>
            <div className="flex items-center gap-4 mt-3 flex-wrap">
              {[
                { label: "Employee ID", value: profile.employee_id },
                { label: "Role",        value: profile.role?.replace(/_/g, " ") },
                { label: "Contract",    value: profile.contract_type ? CONTRACT_LABEL[profile.contract_type] : null },
              ].map(({ label, value }, i) => (
                <React.Fragment key={label}>
                  {i > 0 && <div className="w-px h-8" style={{ background: "var(--surface-border)" }} />}
                  <div className="flex flex-col">
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>{label}</span>
                    <span className="text-sm font-medium capitalize" style={{ color: "var(--text-primary)" }}>{value ?? "—"}</span>
                  </div>
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Personal Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2"><IdentificationCard size={18} style={{ color: "var(--brand-navy)" }} /><CardTitle>Personal Information</CardTitle></div>
          <Button variant="ghost" size="sm" onClick={() => setEditingSection(editingSection === "personal" ? null : "personal")}>
            <PencilSimple size={14} />{editingSection === "personal" ? "Cancel" : "Edit"}
          </Button>
        </CardHeader>
        {editingSection === "personal" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Full Name"         value={personalForm.full_name}         onChange={e => setPersonalForm(p => ({ ...p, full_name: e.target.value }))} />
            <Input label="Phone Number"      value={personalForm.phone_number}      onChange={e => setPersonalForm(p => ({ ...p, phone_number: e.target.value }))} />
            <Input label="Emergency Contact" value={personalForm.emergency_number}  onChange={e => setPersonalForm(p => ({ ...p, emergency_number: e.target.value }))} />
            <Input label="Date of Birth" type="date" value={personalForm.date_of_birth} onChange={e => setPersonalForm(p => ({ ...p, date_of_birth: e.target.value }))} />
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Gender</label>
              <select className="h-9 px-3 rounded-[var(--radius-md)] border text-sm"
                style={{ borderColor: "var(--surface-border)", background: "white", color: "var(--text-primary)" }}
                value={personalForm.gender} onChange={e => setPersonalForm(p => ({ ...p, gender: e.target.value }))}>
                <option value="">Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
            <div className="sm:col-span-2 flex gap-2 justify-end">
              <Button variant="secondary" size="sm" onClick={() => setEditingSection(null)}>Cancel</Button>
              <Button variant="primary" size="sm" onClick={savePersonal} disabled={saving}>
                <FloppyDisk size={14} />{saving ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4">
            <InfoField label="Full Name" value={profile.full_name} />
            <InfoField label="Email" value={profile.email} />
            <InfoField label="Phone" value={profile.phone_number} />
            <InfoField label="Emergency Contact" value={profile.emergency_number} />
            <InfoField label="Gender" value={profile.gender} />
            <InfoField label="Date of Birth" value={fmt(profile.date_of_birth)} />
            <InfoField label="Username" value={profile.username} />
          </div>
        )}
      </Card>

      {/* Employment */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2"><Briefcase size={18} style={{ color: "var(--brand-navy)" }} /><CardTitle>Employment Information</CardTitle></div>
        </CardHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4">
          <InfoField label="Employee ID"    value={profile.employee_id} />
          <InfoField label="Position Title" value={profile.position_title} />
          <InfoField label="Department"     value={profile.department_id} />
          <InfoField label="Contract Type"  value={profile.contract_type ? CONTRACT_LABEL[profile.contract_type] : null} />
          <InfoField label="Joining Date"   value={fmt(profile.joining_date)} />
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Status</span>
            <StatusBadge status={(profile.status as "active"|"inactive"|"on_leave"|"terminated") ?? "active"} />
          </div>
        </div>
      </Card>

      {/* Account */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2"><UserCircle size={18} style={{ color: "var(--brand-navy)" }} /><CardTitle>Account Information</CardTitle></div>
        </CardHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4">
          <InfoField label="Username" value={profile.username} />
          <InfoField label="Email" value={profile.email} />
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Role</span>
            <span className="text-sm font-medium px-2 py-0.5 rounded-full w-fit capitalize"
              style={{ background: "var(--surface-muted)", color: "var(--text-secondary)" }}>
              {profile.role?.replace(/_/g, " ") ?? "—"}
            </span>
          </div>
          <InfoField label="Member Since" value={fmt(profile.created_at)} />
          <InfoField label="Last Sign In"  value={fmt(profile.last_sign_in_at)} />
        </div>
      </Card>

      {/* Leave Balance */}
      {balance && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2"><IdentificationCard size={18} style={{ color: "var(--brand-navy)" }} /><CardTitle>Leave Balance</CardTitle></div>
            <Link href="/people/leave" className="text-sm" style={{ color: "var(--brand-navy)" }}>View all →</Link>
          </CardHeader>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[
              { label: "Annual",    days: balance.annual_leave_days,    max: 30, color: "#2563EB" },
              { label: "Sick",      days: balance.sick_leave_days,      max: 21, color: "#10A854" },
              { label: "Emergency", days: balance.emergency_leave_days, max:  6, color: "#E89B1A" },
              { label: "Maternity", days: balance.maternity_leave_days, max: 98, color: "#9333ea" },
              { label: "Paternity", days: balance.paternity_leave_days, max:  7, color: "#0ea5e9" },
              { label: "Other",     days: balance.other_leave_days,     max: 15, color: "#64748b" },
            ].map(b => (
              <div key={b.label} className="flex flex-col gap-1.5">
                <div className="flex justify-between">
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>{b.label}</span>
                  <span className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
                    {b.days}<span style={{ color: "var(--text-muted)", fontWeight: 400 }}>/{b.max}</span>
                  </span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--surface-muted)" }}>
                  <div className="h-full rounded-full" style={{ width: `${Math.min((b.days / b.max) * 100, 100)}%`, background: b.color }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Recent leave */}
      {recentLeave.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2"><Briefcase size={18} style={{ color: "var(--brand-navy)" }} /><CardTitle>Recent Leave Requests</CardTitle></div>
            <Link href="/people/leave" className="text-sm" style={{ color: "var(--brand-navy)" }}>All →</Link>
          </CardHeader>
          <div className="flex flex-col divide-y" style={{ borderColor: "var(--surface-border)" }}>
            {recentLeave.map(lr => (
              <div key={lr.id} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-sm font-medium capitalize" style={{ color: "var(--text-primary)" }}>
                    {LEAVE_TYPE[lr.leave_type] ?? lr.leave_type}
                  </span>
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {fmt(lr.start_date)} – {fmt(lr.end_date)}
                    {lr.total_working_days ? ` · ${lr.total_working_days}d` : ""}
                  </span>
                </div>
                <StatusBadge status={lr.status} />
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Change password */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2"><Lock size={18} style={{ color: "var(--brand-navy)" }} /><CardTitle>Change Password</CardTitle></div>
          <Button variant="ghost" size="sm" onClick={() => { setChangingPassword(!changingPassword); setPwError(null); setPwSuccess(false) }}>
            {changingPassword ? "Cancel" : "Change"}
          </Button>
        </CardHeader>
        {pwSuccess && <p className="text-sm pb-2" style={{ color: "#10A854" }}>Password updated.</p>}
        {changingPassword ? (
          <div className="flex flex-col gap-4 max-w-sm">
            {pwError && <p className="text-sm" style={{ color: "#DC2626" }}>{pwError}</p>}
            <Input label="Current Password" type="password" value={passwordData.current} onChange={e => setPasswordData(p => ({ ...p, current: e.target.value }))} />
            <Input label="New Password"     type="password" value={passwordData.new}     onChange={e => setPasswordData(p => ({ ...p, new: e.target.value }))} hint="Min 8 characters" />
            <Input label="Confirm Password" type="password" value={passwordData.confirm} onChange={e => setPasswordData(p => ({ ...p, confirm: e.target.value }))} />
            <div className="flex gap-2">
              <Button variant="primary" size="sm" onClick={changePassword} disabled={saving}>{saving ? "Updating…" : "Update password"}</Button>
              <Button variant="secondary" size="sm" onClick={() => setChangingPassword(false)}>Cancel</Button>
            </div>
          </div>
        ) : (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Keep your account secure with a strong password.</p>
        )}
      </Card>
    </div>
  )
}

// ── ═══════════════════════════════════════════════════════════════════ ───────
//   PAGE — fetches data, routes to correct view
// ── ═══════════════════════════════════════════════════════════════════ ───────
export default function ProfilePage() {
  const { user, refreshUser } = useAuth()

  const [profile,       setProfile]       = React.useState<Profile | null>(null)
  const [balance,       setBalance]       = React.useState<LeaveBalance | null>(null)
  const [recentLeave,   setRecentLeave]   = React.useState<LeaveRequest[]>([])
  const [todos,         setTodos]         = React.useState<{ id: number; task: string; due_date: string | null; priority: string }[]>([])
  const [loading,       setLoading]       = React.useState(true)
  const [editingSection,setEditingSection]= React.useState<string | null>(null)
  const [changingPw,    setChangingPw]    = React.useState(false)
  const [saving,        setSaving]        = React.useState(false)
  const [pwError,       setPwError]       = React.useState<string | null>(null)
  const [pwSuccess,     setPwSuccess]     = React.useState(false)
  const [error,         setError]         = React.useState<string | null>(null)

  const [personalForm, setPersonalForm] = React.useState({
    full_name: "", phone_number: "", emergency_number: "", gender: "", date_of_birth: "",
  })
  const [passwordData, setPasswordData] = React.useState({ current: "", new: "", confirm: "" })

  React.useEffect(() => {
    if (!user?.id) return
    Promise.all([
      apiFetch<{ user: Profile }>(`/api/users/${user.id}`),
      apiFetch<{ balance: LeaveBalance }>('/api/leave-balances').catch(() => ({ balance: null })),
      apiFetch<{ leave_requests: LeaveRequest[] }>('/api/leave-requests').catch(() => ({ leave_requests: [] })),
      apiFetch<{ my_todos: { id: number; task: string; due_date: string | null; priority: string }[] }>('/api/dashboard/stats').catch(() => ({ my_todos: [] })),
    ]).then(([profileRes, balRes, leaveRes, dashRes]) => {
      setProfile(profileRes.user)
      setPersonalForm({
        full_name:        profileRes.user.full_name        ?? "",
        phone_number:     profileRes.user.phone_number     ?? "",
        emergency_number: profileRes.user.emergency_number ?? "",
        gender:           profileRes.user.gender           ?? "",
        date_of_birth:    profileRes.user.date_of_birth    ?? "",
      })
      if (balRes.balance) setBalance(balRes.balance)
      setRecentLeave((leaveRes.leave_requests ?? []).filter((r: LeaveRequest) => r.user_id === user.id).slice(0, 5))
      setTodos(dashRes.my_todos ?? [])
    }).catch(() => setError("Failed to load profile"))
      .finally(() => setLoading(false))
  }, [user?.id])

  async function savePersonal() {
    if (!user?.id) return
    setSaving(true); setError(null)
    try {
      const res = await apiFetch<{ user: Profile }>(`/api/users/${user.id}`, {
        method: "PATCH", body: JSON.stringify(personalForm),
      })
      setProfile(res.user); setEditingSection(null); await refreshUser()
    } catch { setError("Failed to save changes") }
    finally { setSaving(false) }
  }

  async function changePassword() {
    setPwError(null); setPwSuccess(false)
    if (passwordData.new.length < 8) { setPwError("Min 8 characters"); return }
    if (passwordData.new !== passwordData.confirm) { setPwError("Passwords do not match"); return }
    setSaving(true)
    try {
      await apiFetch('/api/auth/change-password', {
        method: "POST",
        body: JSON.stringify({ current_password: passwordData.current, new_password: passwordData.new }),
      })
      setPwSuccess(true); setPasswordData({ current: "", new: "", confirm: "" }); setChangingPw(false)
    } catch (e: unknown) { setPwError(e instanceof Error ? e.message : "Failed") }
    finally { setSaving(false) }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-6 max-w-4xl">
        <PageHeader title="My Profile" subtitle="Loading your profile…" />
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-2 border-t-[#0891B2] rounded-full animate-spin"
            style={{ borderColor: "var(--surface-border)", borderTopColor: "#0891B2" }} />
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="max-w-4xl">
        <PageHeader title="My Profile" subtitle="" />
        <p className="text-sm mt-4" style={{ color: "var(--text-muted)" }}>
          {error ?? "Profile not found."}
        </p>
      </div>
    )
  }

  // ── Route to right view ───────────────────────────────────────────────────
  if (profile.role === "trainee") {
    return (
      <>
        <PageHeader
          title="My Profile"
          subtitle="Trainee Program 2026 · Ankaa S&T"
        />
        {error && (
          <p className="text-sm mb-4 px-4 py-2 rounded-lg" style={{ background: "#FFF0F0", color: "#DC2626" }}>{error}</p>
        )}
        <TraineeProfile
          profile={profile}
          balance={balance}
          recentLeave={recentLeave}
          todos={todos}
          onEdit={() => setEditingSection("personal")}
          onChangePassword={() => setChangingPw(v => !v)}
        />
        {/* Edit modal (shared) */}
        {editingSection === "personal" && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl border p-6 shadow-2xl"
              style={{ background: "var(--surface-base)", borderColor: "var(--surface-border)" }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>Edit Personal Info</h3>
                <button onClick={() => setEditingSection(null)} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-[#F1F3F7]" style={{ color: "var(--text-muted)" }}>✕</button>
              </div>
              <div className="flex flex-col gap-3">
                <Input label="Full Name"         value={personalForm.full_name}         onChange={e => setPersonalForm(p => ({ ...p, full_name: e.target.value }))} />
                <Input label="Phone Number"      value={personalForm.phone_number}      onChange={e => setPersonalForm(p => ({ ...p, phone_number: e.target.value }))} />
                <Input label="Emergency Contact" value={personalForm.emergency_number}  onChange={e => setPersonalForm(p => ({ ...p, emergency_number: e.target.value }))} />
                <Input label="Date of Birth" type="date" value={personalForm.date_of_birth} onChange={e => setPersonalForm(p => ({ ...p, date_of_birth: e.target.value }))} />
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Gender</label>
                  <select className="h-9 px-3 rounded-[var(--radius-md)] border text-sm"
                    style={{ borderColor: "var(--surface-border)", background: "white", color: "var(--text-primary)" }}
                    value={personalForm.gender} onChange={e => setPersonalForm(p => ({ ...p, gender: e.target.value }))}>
                    <option value="">Select</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>
                {error && <p className="text-sm" style={{ color: "#DC2626" }}>{error}</p>}
                <div className="flex gap-2 justify-end pt-1">
                  <Button variant="secondary" size="sm" onClick={() => setEditingSection(null)}>Cancel</Button>
                  <Button variant="primary" size="sm" onClick={savePersonal} disabled={saving}>
                    <FloppyDisk size={14} />{saving ? "Saving…" : "Save"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
        {/* Change password modal */}
        {changingPw && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-2xl border p-6 shadow-2xl"
              style={{ background: "var(--surface-base)", borderColor: "var(--surface-border)" }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>Change Password</h3>
                <button onClick={() => setChangingPw(false)} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-[#F1F3F7]" style={{ color: "var(--text-muted)" }}>✕</button>
              </div>
              {pwError   && <p className="text-sm mb-3" style={{ color: "#DC2626" }}>{pwError}</p>}
              {pwSuccess && <p className="text-sm mb-3" style={{ color: "#10A854" }}>Password updated!</p>}
              <div className="flex flex-col gap-3">
                <Input label="Current Password" type="password" value={passwordData.current} onChange={e => setPasswordData(p => ({ ...p, current: e.target.value }))} />
                <Input label="New Password"     type="password" value={passwordData.new}     onChange={e => setPasswordData(p => ({ ...p, new: e.target.value }))} hint="Min 8 characters" />
                <Input label="Confirm Password" type="password" value={passwordData.confirm} onChange={e => setPasswordData(p => ({ ...p, confirm: e.target.value }))} />
                <div className="flex gap-2 justify-end pt-1">
                  <Button variant="secondary" size="sm" onClick={() => setChangingPw(false)}>Cancel</Button>
                  <Button variant="primary" size="sm" onClick={changePassword} disabled={saving}>{saving ? "Updating…" : "Update"}</Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </>
    )
  }

  // ── Regular profile ────────────────────────────────────────────────────────
  return (
    <>
      <PageHeader title="My Profile" subtitle="Manage your personal information and account settings" />
      {error && <p className="text-sm mb-4 px-4 py-2 rounded-lg" style={{ background: "#FFF0F0", color: "#DC2626" }}>{error}</p>}
      <RegularProfile
        profile={profile}
        balance={balance}
        recentLeave={recentLeave}
        editingSection={editingSection}
        setEditingSection={setEditingSection}
        personalForm={personalForm}
        setPersonalForm={setPersonalForm}
        savePersonal={savePersonal}
        saving={saving}
        changingPassword={changingPw}
        setChangingPassword={setChangingPw}
        passwordData={passwordData}
        setPasswordData={setPasswordData}
        changePassword={changePassword}
        pwError={pwError}
        pwSuccess={pwSuccess}
        setPwError={setPwError}
        setPwSuccess={setPwSuccess}
      />
    </>
  )
}
