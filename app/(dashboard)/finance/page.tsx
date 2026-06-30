"use client"

import * as React from "react"
import { Plus, Receipt } from "@phosphor-icons/react"
import { toast } from "sonner"
import { PageHeader } from "@/components/ui/page-header"
import { Button } from "@/components/ui/button"
import { StatCard } from "@/components/ui/stat-card"
import { DataTable } from "@/components/ui/data-table"
import { StatusBadge } from "@/components/ui/status-badge"
import { Modal } from "@/components/ui/modal"
import { Input, Textarea } from "@/components/ui/input"
import { formatDate, formatCurrency } from "@/lib/utils"
import { CheckCircle, Clock, XCircle, Buildings } from "@phosphor-icons/react/dist/ssr"
import { apiFetch } from "@/lib/api"
import type { Invoice, CostCenter } from "@/lib/types"
import type { Column } from "@/components/ui/data-table"

type TabKey = "expenses" | "cost_centers"

export default function FinancePage() {
  const [activeTab, setActiveTab] = React.useState<TabKey>("expenses")
  const [invoices, setInvoices] = React.useState<Invoice[]>([])
  const [costCenters, setCostCenters] = React.useState<CostCenter[]>([])
  const [loading, setLoading] = React.useState(true)
  const [expenseModal, setExpenseModal] = React.useState(false)
  const [submitting, setSubmitting] = React.useState(false)
  const [expenseForm, setExpenseForm] = React.useState({
    name: "",
    amount: "",
    expense_category: "",
    cost_center: "",
    description: "",
    transaction_date: "",
  })

  const fetchData = React.useCallback(async () => {
    setLoading(true)
    try {
      const [invData, ccData] = await Promise.allSettled([
        apiFetch<{ invoices: Invoice[] }>('/api/invoices'),
        apiFetch<{ cost_centers: CostCenter[] }>('/api/cost-centers'),
      ])
      if (invData.status === 'fulfilled') setInvoices(invData.value.invoices)
      if (ccData.status === 'fulfilled') setCostCenters(ccData.value.cost_centers)
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    fetchData()
  }, [fetchData])

  const stats = {
    total: invoices.length,
    approved: invoices.filter((i) => i.status === "paid").length,
    pending: invoices.filter((i) => i.status === "unpaid").length,
    rejected: 0,
  }

  const handleSubmitExpense = async () => {
    if (!expenseForm.name.trim()) {
      toast.error('Description is required')
      return
    }
    setSubmitting(true)
    try {
      await apiFetch('/api/invoices', {
        method: 'POST',
        body: JSON.stringify({
          name: expenseForm.name.trim(),
          amount: expenseForm.amount ? parseFloat(expenseForm.amount) : null,
          transaction_date: expenseForm.transaction_date || null,
          expense_category: expenseForm.expense_category || null,
          cost_center: expenseForm.cost_center || null,
          description: expenseForm.description || null,
        }),
      })
      toast.success("Expense submitted successfully")
      setExpenseModal(false)
      setExpenseForm({ name: "", amount: "", expense_category: "", cost_center: "", description: "", transaction_date: "" })
      await fetchData()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to submit expense'
      toast.error(message)
    } finally {
      setSubmitting(false)
    }
  }

  const expenseColumns: Column<Invoice>[] = [
    {
      key: "name",
      header: "Description",
      sortable: true,
      render: (v) => (
        <span className="font-medium" style={{ color: "var(--text-primary)" }}>
          {v as string}
        </span>
      ),
    },
    {
      key: "expense_category",
      header: "Category",
      render: (v) =>
        v ? (
          <span
            className="text-xs px-2 py-0.5 rounded-full capitalize"
            style={{
              background: "var(--surface-muted)",
              color: "var(--text-secondary)",
            }}
          >
            {(v as string).replace("_", " ")}
          </span>
        ) : (
          "—"
        ),
    },
    {
      key: "amount",
      header: "Amount",
      sortable: true,
      render: (v) => (v != null ? formatCurrency(v as number) : "—"),
    },
    {
      key: "transaction_date",
      header: "Date",
      sortable: true,
      render: (v) => (v ? formatDate(v as string) : "—"),
    },
    {
      key: "cost_center",
      header: "Cost Center",
      render: (v) => (v as string | null) ?? "—",
    },
    {
      key: "status",
      header: "Status",
      render: (v) => <StatusBadge status={v as string} />,
    },
  ]

  const ccColumns: Column<CostCenter>[] = [
    {
      key: "name",
      header: "Name",
      sortable: true,
      render: (v) => (
        <span className="font-medium" style={{ color: "var(--text-primary)" }}>
          {v as string}
        </span>
      ),
    },
    {
      key: "code",
      header: "Code",
      render: (v) => (
        <span className="font-mono text-xs" style={{ color: "var(--text-muted)" }}>
          {(v as string | null) ?? "—"}
        </span>
      ),
    },
    {
      key: "description",
      header: "Description",
      render: (v) => (v as string | null) ?? "—",
    },
    {
      key: "active",
      header: "Status",
      render: (v) => (
        <StatusBadge status={v ? "active" : "inactive"} />
      ),
    },
  ]

  const tabs: { key: TabKey; label: string }[] = [
    { key: "expenses", label: "Expenses" },
    { key: "cost_centers", label: "Cost Centers" },
  ]

  const selectClass =
    "h-9 px-3 rounded-[var(--radius-md)] border text-sm w-full focus:outline-none focus:ring-2 focus:ring-[#1B2A5E]"

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Finance"
        subtitle="Manage expenses, invoices, and cost centers"
        actions={
          <Button variant="primary" size="md" onClick={() => setExpenseModal(true)}>
            <Plus size={16} />
            Submit Expense
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Submitted"
          value={stats.total}
          icon={<Receipt size={18} />}
          color="#1B2A5E"
          iconBg="#EEF1F8"
        />
        <StatCard
          title="Paid"
          value={stats.approved}
          icon={<CheckCircle size={18} />}
          color="#10A854"
          iconBg="#EDFBF3"
        />
        <StatCard
          title="Pending"
          value={stats.pending}
          icon={<Clock size={18} />}
          color="#E89B1A"
          iconBg="#FFF8E6"
        />
        <StatCard
          title="Rejected"
          value={stats.rejected}
          icon={<XCircle size={18} />}
          color="#D63C3C"
          iconBg="#FFF0F0"
        />
      </div>

      {/* Tabs */}
      <div
        className="rounded-[var(--radius-lg)] border overflow-hidden"
        style={{
          background: "var(--surface-base)",
          borderColor: "var(--surface-border)",
        }}
      >
        <div
          className="flex border-b px-4"
          style={{ borderColor: "var(--surface-border)" }}
        >
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="px-4 py-3.5 text-sm font-medium border-b-2 -mb-px transition-colors"
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

        <div className="p-4">
          {activeTab === "expenses" ? (
            <DataTable
              columns={expenseColumns}
              data={invoices}
              loading={loading}
              emptyIcon={<Receipt size={28} />}
              emptyTitle="No expenses found"
              emptyDescription="Submit an expense to get started."
              emptyAction={
                <Button variant="primary" size="sm" onClick={() => setExpenseModal(true)}>
                  <Plus size={14} />
                  Submit Expense
                </Button>
              }
            />
          ) : (
            <DataTable
              columns={ccColumns}
              data={costCenters}
              loading={loading}
              emptyIcon={<Buildings size={28} />}
              emptyTitle="No cost centers"
              emptyDescription="Cost centers will be displayed here once configured."
            />
          )}
        </div>
      </div>

      {/* Expense Modal */}
      <Modal
        open={expenseModal}
        onOpenChange={setExpenseModal}
        title="Submit Expense"
        description="Log a new expense or invoice for approval."
        size="md"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setExpenseModal(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              loading={submitting}
              onClick={handleSubmitExpense}
            >
              Submit Expense
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Input
            label="Description"
            value={expenseForm.name}
            onChange={(e) => setExpenseForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="What is this expense for?"
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Amount (OMR)"
              type="number"
              step="0.001"
              min="0"
              value={expenseForm.amount}
              onChange={(e) =>
                setExpenseForm((f) => ({ ...f, amount: e.target.value }))
              }
            />
            <Input
              label="Date"
              type="date"
              value={expenseForm.transaction_date}
              onChange={(e) =>
                setExpenseForm((f) => ({
                  ...f,
                  transaction_date: e.target.value,
                }))
              }
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
              Category
            </label>
            <select
              className={selectClass}
              style={{
                borderColor: "var(--surface-border)",
                background: "white",
                color: "var(--text-primary)",
              }}
              value={expenseForm.expense_category}
              onChange={(e) =>
                setExpenseForm((f) => ({ ...f, expense_category: e.target.value }))
              }
            >
              <option value="">Select category</option>
              <option value="fuel">Fuel</option>
              <option value="materials">Materials</option>
              <option value="transportation">Transportation</option>
              <option value="food">Food</option>
              <option value="others">Others</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
              Cost Center (optional)
            </label>
            <select
              className={selectClass}
              style={{
                borderColor: "var(--surface-border)",
                background: "white",
                color: "var(--text-primary)",
              }}
              value={expenseForm.cost_center}
              onChange={(e) =>
                setExpenseForm((f) => ({ ...f, cost_center: e.target.value }))
              }
            >
              <option value="">Select cost center</option>
              {costCenters.map((cc) => (
                <option key={cc.id} value={cc.name}>
                  {cc.name}
                  {cc.code ? ` (${cc.code})` : ''}
                </option>
              ))}
            </select>
          </div>
          <Textarea
            label="Notes (optional)"
            value={expenseForm.description}
            onChange={(e) =>
              setExpenseForm((f) => ({ ...f, description: e.target.value }))
            }
            rows={2}
          />
        </div>
      </Modal>
    </div>
  )
}
