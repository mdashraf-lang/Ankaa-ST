"use client"

import * as React from "react"
import { Plus, Buildings, Gear, CalendarBlank, ClockCounterClockwise } from "@phosphor-icons/react"
import { PageHeader } from "@/components/ui/page-header"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { DataTable } from "@/components/ui/data-table"
import { StatusBadge } from "@/components/ui/status-badge"
import { EmptyState } from "@/components/ui/empty-state"
import { formatDate, formatDateTime } from "@/lib/utils"
import type { Department, AuditLog, Holiday } from "@/lib/types"
import type { Column } from "@/components/ui/data-table"

type TabKey = "general" | "departments" | "roles" | "holidays" | "audit"

const USER_ROLES = [
  "admin",
  "ceo",
  "md",
  "cto",
  "hr",
  "finance",
  "coo",
  "hod",
  "team_member",
  "collaborator",
]

const PERMISSIONS = [
  "view_dashboard",
  "manage_users",
  "approve_leave",
  "manage_payroll",
  "view_finance",
  "manage_assets",
  "manage_fleet",
  "manage_projects",
  "manage_tenders",
  "view_reports",
]

export default function AdminPage() {
  const [activeTab, setActiveTab] = React.useState<TabKey>("general")
  const [departments] = React.useState<Department[]>([])
  const [holidays] = React.useState<Holiday[]>([])
  const [auditLogs] = React.useState<AuditLog[]>([])
  const [loading] = React.useState(false)
  const [generalForm, setGeneralForm] = React.useState({
    company_name: "Al-Ankaa Space and Technology",
    timezone: "Asia/Muscat",
    currency: "OMR",
  })

  const tabs: { key: TabKey; label: string }[] = [
    { key: "general", label: "General" },
    { key: "departments", label: "Departments" },
    { key: "roles", label: "Roles & Permissions" },
    { key: "holidays", label: "Holidays" },
    { key: "audit", label: "Audit Log" },
  ]

  const deptColumns: Column<Department>[] = [
    {
      key: "name",
      header: "Department Name",
      sortable: true,
      render: (v) => (
        <span className="font-medium" style={{ color: "var(--text-primary)" }}>
          {v as string}
        </span>
      ),
    },
    {
      key: "company",
      header: "Company",
      render: (v) => (v as string | null) ?? "â€”",
    },
    {
      key: "id",
      header: "Actions",
      render: (v) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm">Edit</Button>
          <Button variant="ghost" size="sm" style={{ color: "var(--status-error)" }}>
            Delete
          </Button>
        </div>
      ),
    },
  ]

  const holidayColumns: Column<Holiday>[] = [
    {
      key: "name",
      header: "Holiday Name",
      render: (v) => (
        <span className="font-medium" style={{ color: "var(--text-primary)" }}>
          {v as string}
        </span>
      ),
    },
    {
      key: "date",
      header: "Date",
      sortable: true,
      render: (v) => formatDate(v as string),
    },
    {
      key: "type",
      header: "Type",
      render: (v) => (
        <span
          className="text-xs px-2 py-0.5 rounded-full capitalize"
          style={{
            background: "var(--surface-muted)",
            color: "var(--text-secondary)",
          }}
        >
          {v as string}
        </span>
      ),
    },
  ]

  const auditColumns: Column<AuditLog>[] = [
    {
      key: "created_at",
      header: "Time",
      render: (v) => (
        <span className="font-mono text-xs" style={{ color: "var(--text-muted)" }}>
          {formatDateTime(v as string)}
        </span>
      ),
    },
    { key: "user_id", header: "User", render: (v) => (v as string | null) ?? "System" },
    {
      key: "action",
      header: "Action",
      render: (v) => (
        <span className="font-medium" style={{ color: "var(--text-primary)" }}>
          {v as string}
        </span>
      ),
    },
    { key: "table_name", header: "Table", render: (v) => (v as string | null) ?? "â€”" },
    { key: "record_id", header: "Record ID", render: (v) => (v as string | null) ?? "â€”" },
  ]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Admin Settings" />

      <div
        className="rounded-[var(--radius-lg)] border overflow-hidden"
        style={{
          background: "var(--surface-base)",
          borderColor: "var(--surface-border)",
        }}
      >
        {/* Tabs */}
        <div
          className="flex border-b px-4 overflow-x-auto"
          style={{ borderColor: "var(--surface-border)" }}
        >
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="px-4 py-3.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap"
              style={{
                borderColor:
                  activeTab === tab.key ? "var(--brand-navy)" : "transparent",
                color:
                  activeTab === tab.key ? "var(--brand-navy)" : "var(--text-muted)",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {/* General */}
          {activeTab === "general" && (
            <div className="max-w-lg flex flex-col gap-5">
              <div className="flex items-center gap-2 mb-2">
                <Gear size={18} style={{ color: "var(--brand-navy)" }} />
                <h3 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
                  Company Settings
                </h3>
              </div>
              <Input
                label="Company Name"
                value={generalForm.company_name}
                onChange={(e) =>
                  setGeneralForm((f) => ({ ...f, company_name: e.target.value }))
                }
              />
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                  Timezone
                </label>
                <select
                  className="h-9 px-3 rounded-[var(--radius-md)] border text-sm"
                  style={{
                    borderColor: "var(--surface-border)",
                    background: "white",
                    color: "var(--text-primary)",
                  }}
                  value={generalForm.timezone}
                  onChange={(e) =>
                    setGeneralForm((f) => ({ ...f, timezone: e.target.value }))
                  }
                >
                  <option value="Asia/Muscat">Asia/Muscat (GMT+4)</option>
                  <option value="UTC">UTC</option>
                  <option value="Asia/Dubai">Asia/Dubai (GMT+4)</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                  Default Currency
                </label>
                <select
                  className="h-9 px-3 rounded-[var(--radius-md)] border text-sm"
                  style={{
                    borderColor: "var(--surface-border)",
                    background: "white",
                    color: "var(--text-primary)",
                  }}
                  value={generalForm.currency}
                  onChange={(e) =>
                    setGeneralForm((f) => ({ ...f, currency: e.target.value }))
                  }
                >
                  <option value="OMR">OMR â€” Omani Rial</option>
                  <option value="USD">USD â€” US Dollar</option>
                  <option value="AED">AED â€” UAE Dirham</option>
                </select>
              </div>
              <div className="pt-2">
                <Button variant="primary" size="md">
                  Save Settings
                </Button>
              </div>
            </div>
          )}

          {/* Departments */}
          {activeTab === "departments" && (
            <div className="flex flex-col gap-4">
              <div className="flex justify-end">
                <Button variant="primary" size="sm">
                  <Plus size={14} />
                  Add Department
                </Button>
              </div>
              <DataTable
                columns={deptColumns}
                data={departments}
                loading={loading}
                emptyIcon={<Buildings size={28} />}
                emptyTitle="No departments configured"
                emptyDescription="Add departments to organize your team structure."
              />
            </div>
          )}

          {/* Roles */}
          {activeTab === "roles" && (
            <div className="flex flex-col gap-4">
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                Configure which permissions are granted to each role.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr style={{ background: "var(--surface-muted)" }}>
                      <th
                        className="px-3 py-2 text-left font-medium sticky left-0"
                        style={{
                          color: "var(--text-muted)",
                          background: "var(--surface-muted)",
                          minWidth: 140,
                        }}
                      >
                        Permission
                      </th>
                      {USER_ROLES.map((role) => (
                        <th
                          key={role}
                          className="px-3 py-2 text-center font-medium whitespace-nowrap"
                          style={{ color: "var(--text-muted)", minWidth: 90 }}
                        >
                          {role.replace("_", " ")}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody
                    className="divide-y"
                    style={{ borderColor: "var(--surface-border)" }}
                  >
                    {PERMISSIONS.map((perm) => (
                      <tr key={perm} style={{ background: "var(--surface-base)" }}>
                        <td
                          className="px-3 py-2 font-medium sticky left-0"
                          style={{
                            color: "var(--text-secondary)",
                            background: "var(--surface-base)",
                            borderRight: "1px solid var(--surface-border)",
                          }}
                        >
                          {perm.replace(/_/g, " ")}
                        </td>
                        {USER_ROLES.map((role) => {
                          const granted =
                            role === "admin" ||
                            (role === "hr" &&
                              ["view_dashboard", "approve_leave", "manage_users"].includes(perm)) ||
                            (role === "finance" &&
                              ["view_dashboard", "view_finance", "manage_payroll"].includes(perm))
                          return (
                            <td key={role} className="px-3 py-2 text-center">
                              <input
                                type="checkbox"
                                defaultChecked={granted}
                                className="w-4 h-4 accent-[#1B2A5E] cursor-pointer"
                              />
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div>
                <Button variant="primary" size="sm">
                  Save Permissions
                </Button>
              </div>
            </div>
          )}

          {/* Holidays */}
          {activeTab === "holidays" && (
            <div className="flex flex-col gap-4">
              <div className="flex justify-end">
                <Button variant="primary" size="sm">
                  <Plus size={14} />
                  Add Holiday
                </Button>
              </div>
              <DataTable
                columns={holidayColumns}
                data={holidays}
                loading={loading}
                emptyIcon={<CalendarBlank size={28} />}
                emptyTitle="No holidays configured"
                emptyDescription="Add public and company holidays for attendance tracking."
              />
            </div>
          )}

          {/* Audit Log */}
          {activeTab === "audit" && (
            <DataTable
              columns={auditColumns}
              data={auditLogs}
              loading={loading}
              emptyIcon={<ClockCounterClockwise size={28} />}
              emptyTitle="No audit logs"
              emptyDescription="System audit logs will appear here as users perform actions."
            />
          )}
        </div>
      </div>
    </div>
  )
}

