"use client"

import * as React from "react"
import { Plus, UsersThree, MagnifyingGlass } from "@phosphor-icons/react"
import { toast } from "sonner"
import { PageHeader } from "@/components/ui/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Modal } from "@/components/ui/modal"
import { StatCard } from "@/components/ui/stat-card"
import { DataTable } from "@/components/ui/data-table"
import { StatusBadge } from "@/components/ui/status-badge"
import { Avatar } from "@/components/ui/avatar"
import { formatDate } from "@/lib/utils"
import { Users, CheckCircle, XCircle } from "@phosphor-icons/react/dist/ssr"
import { apiFetch } from "@/lib/api"
import { ALLOWED_ROLES, ROLE_LABELS } from "@/lib/roles"
import type { Profile } from "@/lib/types"
import type { Column } from "@/components/ui/data-table"

const EMPTY_FORM = { full_name: '', email: '', password: '', role: 'team_member', phone_number: '', department_id: '', employee_id: '' }

export default function UsersPage() {
  const [users,      setUsers]      = React.useState<Profile[]>([])
  const [loading,    setLoading]    = React.useState(true)
  const [search,     setSearch]     = React.useState("")
  const [roleFilter, setRoleFilter] = React.useState("all")
  const [addOpen,    setAddOpen]    = React.useState(false)
  const [addForm,    setAddForm]    = React.useState(EMPTY_FORM)
  const [addLoading, setAddLoading] = React.useState(false)

  function loadUsers() {
    setLoading(true)
    apiFetch<{ users: Profile[] }>('/api/users')
      .then(res => setUsers(res.users ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  React.useEffect(() => { loadUsers() }, [])

  async function handleAddUser() {
    if (!addForm.email || !addForm.password) {
      toast.error('Email and password are required')
      return
    }
    setAddLoading(true)
    try {
      await apiFetch('/api/users', {
        method: 'POST',
        body: JSON.stringify(addForm),
      })
      toast.success(`${addForm.full_name || addForm.email} added successfully`)
      setAddOpen(false)
      setAddForm(EMPTY_FORM)
      loadUsers()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to add user')
    } finally {
      setAddLoading(false)
    }
  }

  const setField = (k: keyof typeof EMPTY_FORM) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setAddForm(f => ({ ...f, [k]: e.target.value }))

  const filtered = React.useMemo(() => {
    const q = search.toLowerCase()
    return users.filter(u => {
      const matchSearch = !q ||
        (u.full_name?.toLowerCase().includes(q)) ||
        u.email.toLowerCase().includes(q) ||
        (u.department_id?.toLowerCase().includes(q)) ||
        (u.employee_id?.toLowerCase().includes(q))
      const matchRole = roleFilter === "all" || u.role === roleFilter
      return matchSearch && matchRole
    })
  }, [users, search, roleFilter])

  const stats = {
    total:    users.length,
    active:   users.filter(u => u.status === "active").length,
    inactive: users.filter(u => u.status === "inactive" || u.status === "terminated").length,
  }

  const roles = React.useMemo(() => {
    const set = new Set(users.map(u => u.role))
    return Array.from(set).sort()
  }, [users])

  const columns: Column<Profile>[] = [
    {
      key: "employee_id",
      header: "Emp. ID",
      render: (v) => (
        <span className="font-mono text-xs" style={{ color: "var(--text-muted)" }}>
          {(v as string | null) ?? "—"}
        </span>
      ),
    },
    {
      key: "full_name",
      header: "Name",
      sortable: true,
      render: (v, row) => (
        <div className="flex items-center gap-2.5">
          <Avatar src={row.avatar_url as string | null} name={v as string | null} size="sm" />
          <div className="min-w-0">
            <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
              {(v as string | null) ?? "—"}
            </p>
            <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
              {(row.position_title as string | null) ?? ""}
            </p>
          </div>
        </div>
      ),
    },
    { key: "email", header: "Email" },
    {
      key: "role",
      header: "Role",
      render: (v) => (
        <span className="text-xs px-2 py-0.5 rounded-full capitalize"
          style={{ background: "var(--surface-muted)", color: "var(--text-secondary)" }}>
          {(v as string).replace("_", " ")}
        </span>
      ),
    },
    {
      key: "department_id",
      header: "Department",
      render: (v) => <span className="text-sm" style={{ color: "var(--text-secondary)" }}>{(v as string | null) ?? "—"}</span>,
    },
    {
      key: "joining_date",
      header: "Joined",
      sortable: true,
      render: (v) => v ? formatDate(v as string) : "—",
    },
    {
      key: "status",
      header: "Status",
      render: (v) => <StatusBadge status={(v as string) ?? "active"} />,
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="User Management"
        subtitle={`${stats.total} employees across ${new Set(users.map(u => u.department_id).filter(Boolean)).size} departments`}
        actions={
          <Button variant="primary" size="md" onClick={() => setAddOpen(true)}>
            <Plus size={16} />
            Add User
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Total Users"  value={stats.total}    icon={<Users size={18} />}       color="#1B2A5E" iconBg="#EEF1F8" />
        <StatCard title="Active"       value={stats.active}   icon={<CheckCircle size={18} />} color="#10A854" iconBg="#EDFBF3" />
        <StatCard title="Inactive"     value={stats.inactive} icon={<XCircle size={18} />}     color="#D63C3C" iconBg="#FFF0F0" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
          <input
            className="w-full h-9 pl-8 pr-3 rounded-[var(--radius-md)] border text-sm"
            style={{ borderColor: "var(--surface-border)", background: "white", color: "var(--text-primary)" }}
            placeholder="Search by name, email, department…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="h-9 px-3 rounded-[var(--radius-md)] border text-sm"
          style={{ borderColor: "var(--surface-border)", background: "white", color: "var(--text-primary)" }}
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value)}
        >
          <option value="all">All roles</option>
          {roles.map(r => (
            <option key={r} value={r}>{r.replace("_", " ")}</option>
          ))}
        </select>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        loading={loading}
        emptyIcon={<UsersThree size={28} />}
        emptyTitle="No users found"
        emptyDescription={search ? "Try adjusting your search." : "Add users to grant access to Ankaa ERP."}
      />

      {/* ── Add User Modal ───────────────────────────────────────────────── */}
      <Modal
        open={addOpen}
        onOpenChange={v => { if (!v) { setAddOpen(false); setAddForm(EMPTY_FORM) } }}
        title="Add New User"
        description="Create a new employee account. They can log in immediately."
        size="lg"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => { setAddOpen(false); setAddForm(EMPTY_FORM) }}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" loading={addLoading} onClick={handleAddUser}>
              <Plus size={14} /> Add User
            </Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input label="Full Name" placeholder="Ahmed Al Kharusi" value={addForm.full_name} onChange={setField('full_name')} />
            <Input label="Email *" type="email" placeholder="ahmed@ankaa.om" value={addForm.email} onChange={setField('email')} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input label="Password *" type="password" placeholder="Min 8 characters" value={addForm.password} onChange={setField('password')} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>Role *</label>
              <select
                className="h-9 px-3 rounded-[var(--radius-md)] border text-sm"
                style={{ borderColor: 'var(--surface-border)', background: 'white' }}
                value={addForm.role}
                onChange={setField('role')}
              >
                {ALLOWED_ROLES.map(r => (
                  <option key={r} value={r}>{ROLE_LABELS[r] ?? r}</option>
                ))}
              </select>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input label="Employee ID" placeholder="ANK-001" value={addForm.employee_id} onChange={setField('employee_id')} />
            <Input label="Department" placeholder="Technology" value={addForm.department_id} onChange={setField('department_id')} />
          </div>
          <Input label="Phone Number" placeholder="+968 9123 4567" value={addForm.phone_number} onChange={setField('phone_number')} />
        </div>
      </Modal>
    </div>
  )
}
