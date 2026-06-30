"use client"

import * as React from "react"
import {
  GraduationCap, BookOpen, Code, Database, GitBranch,
  Rocket, CheckCircle, Clock, Lock, Play, ArrowUpRight,
  CalendarBlank, Users, Envelope, Phone, Star, Bell,
  FileText, Globe, Wrench, Question, CaretRight,
  Megaphone, Info, Warning, CheckSquare, Monitor,
  ArrowLeft, ArrowRight, Browsers, Terminal, Table,
} from "@phosphor-icons/react"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { PageHeader } from "@/components/ui/page-header"
import { Avatar } from "@/components/ui/avatar"
import { useAuth } from "@/contexts/AuthContext"
import { apiFetch } from "@/lib/api"
import type { Profile } from "@/lib/types"

// ── Types ─────────────────────────────────────────────────────────────────────
type Tab = "overview" | "modules" | "resources" | "schedule" | "announcements"

type ModuleStatus = "completed" | "in_progress" | "upcoming"

interface TrainingModule {
  id: string
  title: string
  description: string
  icon: React.ElementType
  color: string
  bg: string
  status: ModuleStatus
  progress: number        // 0-100
  duration: string
  topics: string[]
  startDay: number        // day in program when this starts
  endDay: number
}

interface ScheduleItem {
  id: string
  title: string
  type: "standup" | "oneone" | "training" | "team" | "review"
  day: string             // "Sun" | "Mon" | ... or specific date string
  time: string
  duration: string
  with?: string
  location: string
  recurring: boolean
}

interface Resource {
  id: string
  title: string
  description: string
  category: string
  icon: React.ElementType
  color: string
  url: string
  internal: boolean
}

interface Announcement {
  id: string
  title: string
  body: string
  from: string
  date: string
  type: "info" | "success" | "warning" | "hr"
  read: boolean
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function daysSince(dateStr?: string | null): number {
  if (!dateStr) return 0
  return Math.max(0, Math.floor(
    (Date.now() - new Date(dateStr).getTime()) / 86_400_000
  ))
}

function fmt(d: string) {
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
}

function addMonths(dateStr: string, months: number): string {
  const d = new Date(dateStr)
  d.setMonth(d.getMonth() + months)
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
}

// Resolve module status + progress from elapsed days
function resolveModules(elapsed: number): TrainingModule[] {
  const RAW: Omit<TrainingModule, "status" | "progress">[] = [
    {
      id: "onboarding",
      title: "Company Onboarding",
      description: "Company culture, policies, tools, and team introductions",
      icon: Star, color: "#7C3AED", bg: "#F5F3FF",
      duration: "1 week", startDay: 0, endDay: 7,
      topics: ["Company values & culture", "IT setup & access", "HR policies", "Team introductions", "ERP system overview"],
    },
    {
      id: "git",
      title: "Version Control with Git",
      description: "Git workflow, branching strategy, pull requests and code review",
      icon: GitBranch, color: "#DC2626", bg: "#FFF1F0",
      duration: "1 week", startDay: 7, endDay: 14,
      topics: ["Git basics & commands", "Branching strategy", "Pull requests", "Code review process", "GitHub / CI workflow"],
    },
    {
      id: "javascript",
      title: "JavaScript Essentials",
      description: "Modern JavaScript (ES6+), async programming, and DOM fundamentals",
      icon: Code, color: "#D97706", bg: "#FFFBEB",
      duration: "4 weeks", startDay: 14, endDay: 42,
      topics: ["ES6+ syntax", "Async / Await", "Modules & imports", "DOM manipulation", "Event handling"],
    },
    {
      id: "typescript",
      title: "TypeScript Fundamentals",
      description: "Type-safe JavaScript: types, interfaces, generics, and utility types",
      icon: Terminal, color: "#2563EB", bg: "#EFF4FF",
      duration: "3 weeks", startDay: 42, endDay: 63,
      topics: ["Type annotations", "Interfaces & types", "Generics", "Utility types", "tsconfig & tooling"],
    },
    {
      id: "react",
      title: "React Development",
      description: "Component architecture, hooks, state management and best practices",
      icon: Browsers, color: "#0891B2", bg: "#ECFEFF",
      duration: "5 weeks", startDay: 63, endDay: 98,
      topics: ["JSX & components", "useState / useEffect", "Context API", "Custom hooks", "Performance optimisation"],
    },
    {
      id: "nextjs",
      title: "Next.js & Full-Stack",
      description: "Server-side rendering, API routes, middleware, and deployment",
      icon: Rocket, color: "#0F172A", bg: "#F8FAFC",
      duration: "4 weeks", startDay: 98, endDay: 126,
      topics: ["App Router", "Server components", "API routes", "Auth & sessions", "Deployment pipeline"],
    },
    {
      id: "database",
      title: "Database & PostgreSQL",
      description: "SQL, schema design, query optimisation, and Supabase integration",
      icon: Database, color: "#059669", bg: "#ECFDF5",
      duration: "3 weeks", startDay: 126, endDay: 147,
      topics: ["SQL fundamentals", "Schema design", "Indexes & performance", "Joins & aggregates", "Supabase / PGlite"],
    },
    {
      id: "outsystems",
      title: "OutSystems Platform",
      description: "Low-code development, integrations, and enterprise application delivery",
      icon: Monitor, color: "#EA580C", bg: "#FFF7ED",
      duration: "6 weeks", startDay: 147, endDay: 189,
      topics: ["Service Studio basics", "UI flows & logic", "REST integrations", "Timers & processes", "Deployment & ALM"],
    },
    {
      id: "testing",
      title: "Testing & Quality Assurance",
      description: "Unit testing, integration testing, and QA best practices",
      icon: CheckSquare, color: "#7C3AED", bg: "#F5F3FF",
      duration: "2 weeks", startDay: 189, endDay: 203,
      topics: ["Unit testing (Vitest)", "Integration tests", "API testing", "QA workflows", "Test reporting"],
    },
    {
      id: "pm",
      title: "Project Management & Agile",
      description: "Agile methodology, sprint planning, and collaborative delivery",
      icon: Table, color: "#0369A1", bg: "#F0F9FF",
      duration: "2 weeks", startDay: 203, endDay: 217,
      topics: ["Agile & Scrum", "Sprint planning", "Task estimation", "Retrospectives", "Stakeholder communication"],
    },
  ]

  return RAW.map(m => {
    let status: ModuleStatus = "upcoming"
    let progress = 0

    if (elapsed >= m.endDay) {
      status = "completed"; progress = 100
    } else if (elapsed >= m.startDay) {
      status = "in_progress"
      const span = m.endDay - m.startDay
      const done = elapsed - m.startDay
      progress = Math.round(Math.min((done / span) * 100, 99))
    }

    return { ...m, status, progress }
  })
}

// ── Static data tied to Ankaa S&T context ─────────────────────────────────────

const SCHEDULE: ScheduleItem[] = [
  { id: "standup", title: "Daily Standup",          type: "standup",  day: "Sun–Thu", time: "09:00",  duration: "15 min", with: "Omar Al Ghaithy",    location: "Google Meet", recurring: true },
  { id: "oneone",  title: "1-on-1 with Mentor",     type: "oneone",   day: "Wed",     time: "14:00",  duration: "30 min", with: "Omar Al Ghaithy",    location: "Omar's Office / Meet", recurring: true },
  { id: "team",    title: "SE Team Weekly",          type: "team",     day: "Sun",     time: "10:00",  duration: "45 min", with: "SE Team",            location: "Conference Room B", recurring: true },
  { id: "outsys",  title: "OutSystems Training",     type: "training", day: "Tue/Thu", time: "15:00",  duration: "1 hr",   with: "Ahmed Al Kharusi",   location: "Tech Lab", recurring: true },
  { id: "codereview","title": "Code Review Session", type: "training", day: "Mon",     time: "11:00",  duration: "1 hr",   with: "Palwasha Asif",      location: "Google Meet", recurring: true },
  { id: "sprint",  title: "Sprint Planning",         type: "team",     day: "Sun",     time: "11:00",  duration: "1 hr",   with: "Omar Al Ghaithy",    location: "Conference Room B", recurring: true },
]

const RESOURCES: Resource[] = [
  { id: "erp",      title: "Ankaa ERP User Guide",      description: "How to use leave, invoices, tasks and org chart in this ERP",       category: "Internal",      icon: FileText,  color: "#1B2A5E", url: "/dashboard",     internal: true  },
  { id: "git",      title: "Git Workflow Guide",         description: "Ankaa's branching strategy, commit conventions, and PR process",    category: "Development",   icon: GitBranch, color: "#DC2626", url: "#",              internal: true  },
  { id: "react",    title: "React Documentation",        description: "Official React docs — components, hooks, and patterns",             category: "Development",   icon: Browsers,  color: "#0891B2", url: "https://react.dev",                internal: false },
  { id: "nextjs",   title: "Next.js Documentation",      description: "App Router, API routes, server components",                         category: "Development",   icon: Rocket,    color: "#0F172A", url: "https://nextjs.org/docs",          internal: false },
  { id: "ts",       title: "TypeScript Handbook",        description: "Types, interfaces, generics, and best practices",                   category: "Development",   icon: Code,      color: "#2563EB", url: "https://www.typescriptlang.org/docs", internal: false },
  { id: "supabase", title: "Supabase Documentation",     description: "Database, auth, storage, and real-time subscriptions",             category: "Development",   icon: Database,  color: "#3ECF8E", url: "https://supabase.com/docs",        internal: false },
  { id: "outsys",   title: "OutSystems Developer Guide", description: "Service Studio, logic flows, integrations, and ALM",               category: "Platform",      icon: Monitor,   color: "#EA580C", url: "https://www.outsystems.com/learn",  internal: false },
  { id: "handbook", title: "Ankaa Company Handbook",     description: "Policies, leave rules, code of conduct, and IT guidelines",        category: "Internal",      icon: BookOpen,  color: "#7C3AED", url: "#",              internal: true  },
  { id: "omanlaw",  title: "Oman Labour Law",            description: "Employee rights, contract law, and working conditions in Oman",    category: "HR / Legal",    icon: Wrench,    color: "#059669", url: "#",              internal: true  },
  { id: "team",     title: "SE Team Contacts",           description: "Emails, phones, and Telegram handles for the Software Eng. team",  category: "Internal",      icon: Users,     color: "#D97706", url: "/people/org-chart", internal: true },
]

const ANNOUNCEMENTS: Announcement[] = [
  {
    id: "a1", type: "success", read: false,
    title: "Welcome to the 2026 Trainee Cohort! 🎉",
    body: "On behalf of everyone at Ankaa S&T, we're delighted to welcome you to the Software Engineering Trainee Program. Your journey starts now — ask questions, be curious, and make the most of every session.",
    from: "HR Department", date: "2026-01-01",
  },
  {
    id: "a2", type: "info", read: false,
    title: "New Ankaa ERP System is Live",
    body: "The Ankaa ERP system is now live for all staff. As a trainee, you'll use it to submit leave requests, log expenses, and track your tasks. Your credentials are in your welcome email.",
    from: "IT Department", date: "2026-06-28",
  },
  {
    id: "a3", type: "hr", read: true,
    title: "Mid-Term Review — Scheduling Now",
    body: "Your 6-month mid-term review is coming up. HR will be in touch to schedule a 1-on-1 with your supervisor Omar Al Ghaithy. Please prepare a short self-assessment covering your progress and goals for H2.",
    from: "Huria Al Lawati (HR)", date: "2026-06-20",
  },
  {
    id: "a4", type: "info", read: true,
    title: "OutSystems Training Schedule Updated",
    body: "The OutSystems training sessions have moved to Tuesday and Thursday afternoons (3 PM) in the Tech Lab. Ahmed Al Kharusi will be leading. Please bring your laptop and ensure OutSystems Service Studio is installed.",
    from: "Ahmed Al Kharusi", date: "2026-06-15",
  },
  {
    id: "a5", type: "warning", read: true,
    title: "Q3 Leave Freeze — Project Deadline",
    body: "There is a soft leave freeze from 1–15 August due to the MoH Legal Services delivery deadline. Emergency leave is still approved as normal. Please plan personal leave for before or after this window.",
    from: "Omar Al Ghaithy", date: "2026-06-10",
  },
]

// ── Sub-components ─────────────────────────────────────────────────────────────

function ProgressBar({ value, color = "#0891B2", className = "" }: { value: number; color?: string; className?: string }) {
  return (
    <div className={`h-1.5 rounded-full overflow-hidden ${className}`} style={{ background: "var(--surface-muted)" }}>
      <div className="h-full rounded-full transition-all duration-700"
        style={{ width: `${value}%`, background: color }} />
    </div>
  )
}

function StatusPill({ status }: { status: ModuleStatus }) {
  const map = {
    completed:   { label: "Completed",   bg: "#ECFDF5", color: "#059669" },
    in_progress: { label: "In Progress", bg: "#ECFEFF", color: "#0891B2" },
    upcoming:    { label: "Upcoming",    bg: "#F3F4F6", color: "#6B7280" },
  }
  const s = map[status]
  return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
      style={{ background: s.bg, color: s.color }}>
      {s.label}
    </span>
  )
}

function AnnouncementIcon({ type }: { type: Announcement["type"] }) {
  const map: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
    info:    { icon: Info,     color: "#0891B2", bg: "#ECFEFF" },
    success: { icon: Star,     color: "#059669", bg: "#ECFDF5" },
    warning: { icon: Warning,  color: "#D97706", bg: "#FFFBEB" },
    hr:      { icon: Users,    color: "#7C3AED", bg: "#F5F3FF" },
  }
  const m = map[type] ?? map.info
  return (
    <div className="w-8 h-8 rounded-[var(--radius-md)] flex items-center justify-center flex-shrink-0"
      style={{ background: m.bg }}>
      <m.icon size={15} style={{ color: m.color }} />
    </div>
  )
}

const SCHEDULE_COLORS: Record<ScheduleItem["type"], { bg: string; color: string }> = {
  standup:  { bg: "#EFF4FF", color: "#2563EB" },
  oneone:   { bg: "#ECFEFF", color: "#0891B2" },
  training: { bg: "#FFF7ED", color: "#EA580C" },
  team:     { bg: "#ECFDF5", color: "#059669" },
  review:   { bg: "#F5F3FF", color: "#7C3AED" },
}

// ── Tab views ─────────────────────────────────────────────────────────────────

function OverviewTab({ profile, elapsed, modules }: { profile: Profile; elapsed: number; modules: TrainingModule[] }) {
  const pct           = Math.min(100, Math.round((elapsed / 365) * 100))
  const done          = modules.filter(m => m.status === "completed").length
  const inProg        = modules.filter(m => m.status === "in_progress").length
  const currentMod    = modules.find(m => m.status === "in_progress")
  const endDate       = profile.joining_date ? addMonths(profile.joining_date, 12) : "Dec 2026"

  return (
    <div className="flex flex-col gap-5">
      {/* Program summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Stats */}
        <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Days in Program",  value: elapsed,          color: "#0891B2", bg: "#ECFEFF" },
            { label: "Modules Done",     value: `${done}/${modules.length}`, color: "#059669", bg: "#ECFDF5" },
            { label: "Currently Active", value: inProg,           color: "#EA580C", bg: "#FFF7ED" },
            { label: "Program Progress", value: `${pct}%`,        color: "#7C3AED", bg: "#F5F3FF" },
          ].map(s => (
            <div key={s.label} className="flex flex-col gap-2 p-4 rounded-2xl"
              style={{ background: s.bg }}>
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>{s.label}</span>
              <span className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</span>
            </div>
          ))}
        </div>

        {/* Mentor card */}
        <Card>
          <p className="text-[10px] font-bold tracking-widest mb-3" style={{ color: "var(--text-muted)" }}>YOUR MENTOR</p>
          <div className="flex items-center gap-3 mb-4">
            <Avatar name="Omar Al Ghaithy" size="lg" />
            <div>
              <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Omar Al Ghaithy</p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>Software Engineering Lead</p>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <a href="mailto:omar@ankaa.om"
              className="flex items-center gap-2 text-xs hover:underline" style={{ color: "#0891B2" }}>
              <Envelope size={12} /> omar@ankaa.om
            </a>
            <a href="tel:+96891234009"
              className="flex items-center gap-2 text-xs hover:underline" style={{ color: "#0891B2" }}>
              <Phone size={12} /> +968 9123 4009
            </a>
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
              1-on-1: every Wednesday 2:00 PM
            </p>
          </div>
        </Card>
      </div>

      {/* Current module spotlight */}
      {currentMod && (
        <div className="rounded-2xl border overflow-hidden"
          style={{ borderColor: "var(--surface-border)", background: "var(--surface-base)" }}>
          <div className="px-5 py-4 border-b flex items-center justify-between"
            style={{ borderColor: "var(--surface-border)", background: currentMod.bg }}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-[var(--radius-md)] flex items-center justify-center"
                style={{ background: "white" }}>
                <currentMod.icon size={18} style={{ color: currentMod.color }} />
              </div>
              <div>
                <p className="text-xs font-bold tracking-wide" style={{ color: currentMod.color }}>CURRENTLY LEARNING</p>
                <p className="text-base font-bold" style={{ color: "var(--text-primary)" }}>{currentMod.title}</p>
              </div>
            </div>
            <StatusPill status="in_progress" />
          </div>
          <div className="px-5 py-4">
            <p className="text-sm mb-3" style={{ color: "var(--text-muted)" }}>{currentMod.description}</p>
            <ProgressBar value={currentMod.progress} color={currentMod.color} />
            <div className="flex items-center justify-between mt-1.5">
              <span className="text-xs" style={{ color: "var(--text-muted)' "}}>{currentMod.progress}% complete</span>
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>{currentMod.duration}</span>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-3">
              {currentMod.topics.map(t => (
                <span key={t} className="text-xs px-2 py-0.5 rounded-full"
                  style={{ background: currentMod.bg, color: currentMod.color }}>
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Program timeline */}
      <Card>
        <CardHeader><CardTitle>Program Timeline</CardTitle>
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            {fmt(profile.joining_date ?? "2026-01-01")} → {endDate}
          </span>
        </CardHeader>
        <div className="flex flex-col gap-2">
          {modules.map((m, i) => (
            <div key={m.id} className="flex items-center gap-3">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                m.status === "completed" ? "" : m.status === "in_progress" ? "border-2" : "border-2 border-dashed"
              }`} style={{
                background: m.status === "completed" ? m.color : m.status === "in_progress" ? "white" : "transparent",
                borderColor: m.status !== "completed" ? m.color : undefined,
              }}>
                {m.status === "completed"
                  ? <CheckCircle size={12} weight="fill" style={{ color: "white" }} />
                  : m.status === "in_progress"
                  ? <Play size={9} weight="fill" style={{ color: m.color }} />
                  : <Lock size={9} style={{ color: "var(--text-disabled)" }} />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium" style={{
                    color: m.status === "upcoming" ? "var(--text-disabled)" : "var(--text-primary)"
                  }}>{m.title}</span>
                  {m.status === "in_progress" && <StatusPill status="in_progress" />}
                </div>
                {m.status === "in_progress" && (
                  <ProgressBar value={m.progress} color={m.color} className="mt-1 max-w-xs" />
                )}
              </div>
              <span className="text-xs flex-shrink-0" style={{ color: "var(--text-disabled)" }}>
                Day {m.startDay}
              </span>
            </div>
          ))}
        </div>
      </Card>

      {/* Program details */}
      <Card>
        <CardHeader><CardTitle>Program Details</CardTitle></CardHeader>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-8 gap-y-4">
          {[
            { label: "Program",        value: "Software Engineering Trainee" },
            { label: "Cohort",         value: "2026" },
            { label: "Department",     value: profile.department_id ?? "Software Engineering" },
            { label: "Start Date",     value: fmt(profile.joining_date ?? "2026-01-01") },
            { label: "End Date",       value: endDate },
            { label: "Contract",       value: "Internship / Trainee" },
            { label: "Supervisor",     value: "Omar Al Ghaithy" },
            { label: "HR Contact",     value: "Huria Al Lawati" },
            { label: "Duration",       value: "12 months" },
          ].map(({ label, value }) => (
            <div key={label} className="flex flex-col gap-0.5">
              <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>{label}</span>
              <span className="text-sm" style={{ color: "var(--text-primary)" }}>{value}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

function ModulesTab({ modules }: { modules: TrainingModule[] }) {
  const [expanded, setExpanded] = React.useState<string | null>(null)
  const done   = modules.filter(m => m.status === "completed").length
  const inProg = modules.filter(m => m.status === "in_progress").length

  return (
    <div className="flex flex-col gap-4">
      {/* Summary row */}
      <div className="flex gap-4 flex-wrap">
        {[
          { label: "Completed",   value: done,              color: "#059669", bg: "#ECFDF5" },
          { label: "In Progress", value: inProg,            color: "#0891B2", bg: "#ECFEFF" },
          { label: "Upcoming",    value: modules.length - done - inProg, color: "#6B7280", bg: "#F3F4F6" },
          { label: "Total",       value: modules.length,    color: "#1B2A5E", bg: "#EEF1F8" },
        ].map(s => (
          <div key={s.label} className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl"
            style={{ background: s.bg }}>
            <span className="text-xl font-bold" style={{ color: s.color }}>{s.value}</span>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Module cards */}
      {modules.map(m => (
        <div key={m.id} className="rounded-2xl border overflow-hidden transition-shadow hover:shadow-md"
          style={{ borderColor: "var(--surface-border)", background: "var(--surface-base)" }}>
          {/* Header */}
          <button
            className="w-full flex items-center gap-4 px-5 py-4 text-left"
            onClick={() => setExpanded(expanded === m.id ? null : m.id)}
          >
            <div className="w-10 h-10 rounded-[var(--radius-md)] flex items-center justify-center flex-shrink-0"
              style={{ background: m.bg }}>
              <m.icon size={20} style={{ color: m.color }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="text-sm font-semibold" style={{
                  color: m.status === "upcoming" ? "var(--text-muted)" : "var(--text-primary)"
                }}>{m.title}</span>
                <StatusPill status={m.status} />
                {m.status === "upcoming" && <Lock size={12} style={{ color: "var(--text-disabled)" }} />}
              </div>
              {m.status !== "upcoming" && (
                <ProgressBar value={m.progress} color={m.color} />
              )}
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <span className="text-xs hidden sm:block" style={{ color: "var(--text-muted)" }}>{m.duration}</span>
              {m.status !== "upcoming" && (
                <span className="text-sm font-bold" style={{ color: m.color }}>{m.progress}%</span>
              )}
              <CaretRight size={14} className={`transition-transform duration-200 ${expanded === m.id ? "rotate-90" : ""}`}
                style={{ color: "var(--text-muted)" }} />
            </div>
          </button>

          {/* Expanded details */}
          {expanded === m.id && (
            <div className="px-5 pb-5 border-t" style={{ borderColor: "var(--surface-border)" }}>
              <p className="text-sm mt-4 mb-4" style={{ color: "var(--text-muted)" }}>{m.description}</p>
              <p className="text-[10px] font-bold tracking-widest mb-2" style={{ color: "var(--text-muted)" }}>TOPICS COVERED</p>
              <div className="flex flex-col gap-1.5">
                {m.topics.map((t, i) => (
                  <div key={t} className="flex items-center gap-2.5">
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${
                      m.status === "completed" || (m.status === "in_progress" && i < Math.ceil(m.topics.length * m.progress / 100))
                        ? "" : ""
                    }`} style={{
                      background: (m.status === "completed" || (m.status === "in_progress" && i < Math.ceil(m.topics.length * m.progress / 100)))
                        ? m.color : "var(--surface-muted)"
                    }}>
                      {(m.status === "completed" || (m.status === "in_progress" && i < Math.ceil(m.topics.length * m.progress / 100)))
                        ? <CheckCircle size={10} weight="fill" style={{ color: "white" }} />
                        : <Clock size={8} style={{ color: "var(--text-disabled)" }} />}
                    </div>
                    <span className="text-sm" style={{
                      color: (m.status === "completed" || (m.status === "in_progress" && i < Math.ceil(m.topics.length * m.progress / 100)))
                        ? "var(--text-primary)" : "var(--text-disabled)"
                    }}>{t}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function ResourcesTab() {
  const categories = [...new Set(RESOURCES.map(r => r.category))]
  const [activeCategory, setActiveCategory] = React.useState("All")

  const filtered = activeCategory === "All"
    ? RESOURCES
    : RESOURCES.filter(r => r.category === activeCategory)

  return (
    <div className="flex flex-col gap-5">
      {/* Category filter */}
      <div className="flex flex-wrap gap-2">
        {["All", ...categories].map(c => (
          <button key={c} onClick={() => setActiveCategory(c)}
            className="px-3 py-1.5 rounded-full text-xs font-semibold transition-colors"
            style={{
              background: activeCategory === c ? "#0891B2" : "var(--surface-muted)",
              color:      activeCategory === c ? "white"    : "var(--text-secondary)",
            }}>
            {c}
          </button>
        ))}
      </div>

      {/* Resource grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {filtered.map(r => (
          <a key={r.id} href={r.url} target={r.internal ? "_self" : "_blank"} rel="noreferrer"
            className="flex items-start gap-3 p-4 rounded-2xl border transition-all hover:shadow-md cursor-pointer group"
            style={{ borderColor: "var(--surface-border)", background: "var(--surface-base)" }}>
            <div className="w-10 h-10 rounded-[var(--radius-md)] flex items-center justify-center flex-shrink-0"
              style={{ background: `${r.color}15` }}>
              <r.icon size={18} style={{ color: r.color }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold group-hover:underline" style={{ color: "var(--text-primary)" }}>
                  {r.title}
                </p>
                {r.internal
                  ? <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                      style={{ background: "#EEF1F8", color: "#1B2A5E" }}>INTERNAL</span>
                  : <ArrowUpRight size={13} className="flex-shrink-0 mt-0.5" style={{ color: "var(--text-muted)" }} />}
              </div>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{r.description}</p>
              <span className="text-[10px] mt-1.5 inline-block px-2 py-0.5 rounded-full"
                style={{ background: `${r.color}15`, color: r.color }}>
                {r.category}
              </span>
            </div>
          </a>
        ))}
      </div>

      {/* Help card */}
      <div className="flex items-start gap-3 p-4 rounded-2xl"
        style={{ background: "#ECFEFF", borderColor: "#0891B220" }}>
        <Question size={18} style={{ color: "#0891B2" }} />
        <div>
          <p className="text-sm font-semibold" style={{ color: "#0E7490" }}>Need access to a tool or resource?</p>
          <p className="text-xs mt-0.5" style={{ color: "#0891B2" }}>
            Contact IT at <span className="font-semibold">hr@ankaa.om</span> or ask your mentor Omar to submit an access request on your behalf.
          </p>
        </div>
      </div>
    </div>
  )
}

function ScheduleTab() {
  const typeColors = SCHEDULE_COLORS

  const ORDER = ["standup", "team", "training", "oneone", "review"] as const

  return (
    <div className="flex flex-col gap-5">
      {/* Week at a glance */}
      <Card>
        <CardHeader><CardTitle>Weekly Schedule</CardTitle>
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>Recurring sessions</span>
        </CardHeader>
        <div className="grid grid-cols-5 gap-2 text-center text-xs font-medium mb-3"
          style={{ color: "var(--text-muted)" }}>
          {["Sun", "Mon", "Tue", "Wed", "Thu"].map(d => (
            <div key={d} className="py-1.5 rounded-[var(--radius-md)]"
              style={{ background: "var(--surface-subtle)" }}>{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-5 gap-2 text-center text-[10px]">
          {(["Sun","Mon","Tue","Wed","Thu"] as const).map(day => (
            <div key={day} className="flex flex-col gap-1">
              {SCHEDULE.filter(s => s.day.includes(day) || s.day.includes("Sun–Thu")).map(s => (
                <div key={s.id} className="px-1.5 py-1 rounded text-left leading-tight"
                  style={{ background: typeColors[s.type].bg, color: typeColors[s.type].color }}>
                  <p className="font-semibold truncate">{s.time}</p>
                  <p className="opacity-80 truncate">{s.title.split(" ").slice(0, 2).join(" ")}</p>
                </div>
              ))}
            </div>
          ))}
        </div>
      </Card>

      {/* Session list */}
      <div className="flex flex-col gap-3">
        {SCHEDULE.map(s => {
          const tc = typeColors[s.type]
          return (
            <div key={s.id} className="flex items-start gap-4 p-4 rounded-2xl border"
              style={{ borderColor: "var(--surface-border)", background: "var(--surface-base)" }}>
              <div className="w-10 h-10 rounded-[var(--radius-md)] flex flex-col items-center justify-center flex-shrink-0"
                style={{ background: tc.bg }}>
                <CalendarBlank size={16} style={{ color: tc.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{s.title}</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                      {s.day} · {s.time} · {s.duration}
                    </p>
                  </div>
                  {s.recurring && (
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                      style={{ background: tc.bg, color: tc.color }}>
                      RECURRING
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-3 mt-2 text-xs" style={{ color: "var(--text-muted)" }}>
                  {s.with && (
                    <span className="flex items-center gap-1">
                      <Users size={11} /> {s.with}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Globe size={11} /> {s.location}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Important dates */}
      <Card>
        <CardHeader><CardTitle>Key Program Dates</CardTitle></CardHeader>
        <div className="flex flex-col gap-3">
          {[
            { label: "Program Start",         date: "01 Jan 2026", color: "#059669", done: true  },
            { label: "Q1 Check-in",           date: "01 Apr 2026", color: "#0891B2", done: true  },
            { label: "6-Month Mid-term Review",date: "01 Jul 2026", color: "#EA580C", done: false },
            { label: "MoH Project Deadline",  date: "15 Aug 2026", color: "#DC2626", done: false },
            { label: "Q3 Check-in",           date: "01 Oct 2026", color: "#7C3AED", done: false },
            { label: "Final Evaluation",       date: "15 Dec 2026", color: "#1B2A5E", done: false },
            { label: "Program Completion",     date: "31 Dec 2026", color: "#D97706", done: false },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: item.done ? "#10B981" : item.color }} />
              <span className="text-sm flex-1" style={{
                color: item.done ? "var(--text-muted)" : "var(--text-primary)",
                textDecoration: item.done ? "line-through" : undefined,
              }}>{item.label}</span>
              <span className="text-xs flex-shrink-0" style={{ color: "var(--text-muted)" }}>{item.date}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

function AnnouncementsTab() {
  const [read, setRead] = React.useState<Set<string>>(
    new Set(ANNOUNCEMENTS.filter(a => a.read).map(a => a.id))
  )

  const unread = ANNOUNCEMENTS.filter(a => !read.has(a.id)).length

  return (
    <div className="flex flex-col gap-4">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {unread > 0 && (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full"
              style={{ background: "#0891B215", color: "#0891B2" }}>
              {unread} unread
            </span>
          )}
        </div>
        <button className="text-xs font-medium" style={{ color: "var(--text-muted)" }}
          onClick={() => setRead(new Set(ANNOUNCEMENTS.map(a => a.id)))}>
          Mark all as read
        </button>
      </div>

      {/* Cards */}
      {ANNOUNCEMENTS.map(a => {
        const isRead = read.has(a.id)
        return (
          <div key={a.id}
            className="rounded-2xl border overflow-hidden transition-all"
            style={{
              borderColor: isRead ? "var(--surface-border)" : "#0891B230",
              background: isRead ? "var(--surface-base)" : "white",
              boxShadow: isRead ? "none" : "0 0 0 1px #0891B215",
            }}>
            <div className="flex items-start gap-3 p-4">
              <AnnouncementIcon type={a.type} />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{a.title}</p>
                  {!isRead && (
                    <span className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5" style={{ background: "#0891B2" }} />
                  )}
                </div>
                <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{a.body}</p>
                <div className="flex items-center gap-3 mt-2 text-xs" style={{ color: "var(--text-disabled)" }}>
                  <span className="flex items-center gap-1">
                    <Megaphone size={10} /> {a.from}
                  </span>
                  <span>{fmt(a.date)}</span>
                </div>
              </div>
            </div>
            {!isRead && (
              <div className="px-4 pb-3 flex justify-end">
                <button className="text-xs font-medium" style={{ color: "#0891B2" }}
                  onClick={() => setRead(prev => new Set([...prev, a.id]))}>
                  Mark as read
                </button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function TrainingPage() {
  const { user } = useAuth()
  const [profile,  setProfile]  = React.useState<Profile | null>(null)
  const [loading,  setLoading]  = React.useState(true)
  const [activeTab,setActiveTab]= React.useState<Tab>("overview")

  React.useEffect(() => {
    if (!user?.id) return
    apiFetch<{ user: Profile }>(`/api/users/${user.id}`)
      .then(r => setProfile(r.user))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [user?.id])

  const elapsed  = daysSince(profile?.joining_date)
  const modules  = React.useMemo(() => resolveModules(elapsed), [elapsed])
  const pct      = Math.min(100, Math.round((elapsed / 365) * 100))

  const TABS: { key: Tab; label: string; badge?: number }[] = [
    { key: "overview",      label: "Overview" },
    { key: "modules",       label: "Modules",       badge: modules.filter(m => m.status === "in_progress").length },
    { key: "resources",     label: "Resources" },
    { key: "schedule",      label: "Schedule" },
    { key: "announcements", label: "Announcements", badge: ANNOUNCEMENTS.filter(a => !a.read).length },
  ]

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Training Hub" subtitle="Loading your program…" />
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-2 border-t-[#0891B2] rounded-full animate-spin"
            style={{ borderColor: "var(--surface-border)", borderTopColor: "#0891B2" }} />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Hero banner */}
      <div className="rounded-2xl overflow-hidden">
        <div className="relative px-6 py-6"
          style={{ background: "linear-gradient(135deg, #0891B2, #0E7490 50%, #1B2A5E)" }}>
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-5"
            style={{ background: "white", transform: "translate(30%, -30%)" }} />
          <div className="absolute bottom-0 right-24 w-32 h-32 rounded-full opacity-5"
            style={{ background: "white", transform: "translateY(40%)" }} />

          <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(4px)" }}>
                <GraduationCap size={28} style={{ color: "white" }} weight="fill" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: "rgba(255,255,255,0.2)", color: "white" }}>
                    COHORT 2026
                  </span>
                </div>
                <h1 className="text-xl font-bold text-white">
                  Software Engineering Trainee Program
                </h1>
                <p className="text-sm mt-0.5" style={{ color: "rgba(255,255,255,0.7)" }}>
                  {profile?.full_name} · {elapsed} days in · {pct}% complete
                </p>
              </div>
            </div>

            {/* Mini progress arc */}
            <div className="flex items-center gap-3 bg-white/10 rounded-2xl px-4 py-3 backdrop-blur-sm">
              <svg width={48} height={48} style={{ transform: "rotate(-90deg)" }}>
                <circle cx={24} cy={24} r={18} fill="none" strokeWidth={5} stroke="rgba(255,255,255,0.2)" />
                <circle cx={24} cy={24} r={18} fill="none" strokeWidth={5} stroke="white"
                  strokeLinecap="round"
                  strokeDasharray={`${(pct / 100) * 2 * Math.PI * 18} ${2 * Math.PI * 18}`} />
              </svg>
              <div>
                <p className="text-xl font-bold text-white">{pct}%</p>
                <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.7)" }}>Program done</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-[var(--radius-lg)] border"
        style={{ background: "var(--surface-subtle)", borderColor: "var(--surface-border)" }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-[var(--radius-md)] text-sm font-medium transition-all duration-[220ms]"
            style={{
              background: activeTab === t.key ? "var(--surface-base)" : "transparent",
              color:      activeTab === t.key ? "var(--text-primary)" : "var(--text-muted)",
              boxShadow:  activeTab === t.key ? "var(--shadow-sm)" : "none",
            }}>
            <span className="hidden sm:inline">{t.label}</span>
            <span className="sm:hidden">{t.label.slice(0, 3)}</span>
            {t.badge != null && t.badge > 0 && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                style={{ background: "#0891B220", color: "#0891B2" }}>
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "overview"      && profile && <OverviewTab profile={profile} elapsed={elapsed} modules={modules} />}
      {activeTab === "modules"       && <ModulesTab modules={modules} />}
      {activeTab === "resources"     && <ResourcesTab />}
      {activeTab === "schedule"      && <ScheduleTab />}
      {activeTab === "announcements" && <AnnouncementsTab />}
    </div>
  )
}
