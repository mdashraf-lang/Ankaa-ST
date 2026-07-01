"use client"

import * as React from "react"
import {
  Plus, Receipt, Buildings, CheckCircle, Clock, XCircle,
  Warning, Sparkle,
} from "@phosphor-icons/react"
import { toast }         from "sonner"
import { PageHeader }    from "@/components/ui/page-header"
import { Button }        from "@/components/ui/button"
import { StatCard }      from "@/components/ui/stat-card"
import { DataTable }     from "@/components/ui/data-table"
import { StatusBadge }   from "@/components/ui/status-badge"
import { Modal }         from "@/components/ui/modal"
import { Input, Textarea } from "@/components/ui/input"
import { formatDate } from "@/lib/utils"
import { apiFetch }      from "@/lib/api"
import type { Invoice, CostCenter } from "@/lib/types"
import type { Column }   from "@/components/ui/data-table"

// ── Constants (mirror invoices/page.tsx) ──────────────────────────────────────
const CURRENCIES = [
  "OMR","USD","EUR","GBP","SAR","AED","INR","PKR","BHD","KWD",
  "QAR","JOD","EGP","TRY","JPY","CNY","AUD","CAD","CHF","SGD",
]
const CURRENCY_RATES: Record<string, number> = {
  USD:0.385, EUR:0.420, GBP:0.490, SAR:0.103, AED:0.105,
  INR:0.0046, PKR:0.00138, BHD:2.65, KWD:1.25, QAR:0.106,
  JOD:1.41, EGP:0.0081, TRY:0.0117, JPY:0.0026, CNY:0.053,
  AUD:0.250, CAD:0.285, CHF:0.432, SGD:0.286, OMR:1.0,
}
const CATEGORIES = [
  { key:"fuel",           label:"Fuel",           icon:"⛽" },
  { key:"materials",      label:"Materials",       icon:"📦" },
  { key:"transportation", label:"Transportation",  icon:"🚚" },
  { key:"food",           label:"Food",            icon:"🍽️" },
  { key:"others",         label:"Others",          icon:"📋" },
]
const PAID_BY_OPTIONS = ["Office card","CEO","IT department","Personal","Company account"]
const CATEGORY_COLOR: Record<string, { bg: string; color: string }> = {
  fuel:           { bg:"#FFF8E6", color:"#D97706" },
  materials:      { bg:"#EFF4FF", color:"#2563EB" },
  transportation: { bg:"#ECFDF5", color:"#059669" },
  food:           { bg:"#FFF0F0", color:"#DC2626" },
  others:         { bg:"#F5F3FF", color:"#7C3AED" },
}

function toOMR(amount: number, currency: string): string {
  if (!amount || currency === "OMR") return amount?.toFixed(3) ?? "0.000"
  return (amount * (CURRENCY_RATES[currency] ?? 1)).toFixed(3)
}

// ── Form type ─────────────────────────────────────────────────────────────────
interface ExpenseForm {
  name: string; paid_by: string; status: "paid"|"unpaid"
  bill_number: string; transaction_date: string; currency: string
  amount: string; expense_category: string; cost_center: string; description: string
  fuel_amount: string; materials_amount: string; transportation_amount: string
  food_amount: string; others_amount: string
}

const BLANK: ExpenseForm = {
  name:"", paid_by:"Office card", status:"unpaid", bill_number:"",
  transaction_date:"", currency:"OMR", amount:"", expense_category:"others",
  cost_center:"", description:"",
  fuel_amount:"0", materials_amount:"0", transportation_amount:"0",
  food_amount:"0", others_amount:"0",
}

// ── Expense Modal (full form + AI fill) ───────────────────────────────────────
function ExpenseModal({
  open, costCenters, onClose, onSaved,
}: {
  open: boolean
  costCenters: CostCenter[]
  onClose: () => void
  onSaved: (inv: Invoice) => void
}) {
  const [form,      setForm]      = React.useState<ExpenseForm>(BLANK)
  const [saving,    setSaving]    = React.useState(false)
  const [formErr,   setFormErr]   = React.useState<string | null>(null)

  // AI state
  const [aiText,    setAiText]    = React.useState("")
  const [aiLoading, setAiLoading] = React.useState(false)
  const [aiError,   setAiError]   = React.useState<string | null>(null)

  React.useEffect(() => {
    if (open) { setForm(BLANK); setFormErr(null); setAiText(""); setAiError(null) }
  }, [open])

  function handleAmountChange(val: string) {
    const amt = parseFloat(val) || 0
    const cat = form.expense_category
    setForm(f => ({
      ...f, amount: val,
      fuel_amount:           cat === "fuel"           ? String(amt) : "0",
      materials_amount:      cat === "materials"      ? String(amt) : "0",
      transportation_amount: cat === "transportation"  ? String(amt) : "0",
      food_amount:           cat === "food"           ? String(amt) : "0",
      others_amount:         cat === "others"         ? String(amt) : "0",
    }))
  }
  function handleCategoryChange(cat: string) {
    const amt = parseFloat(form.amount) || 0
    setForm(f => ({
      ...f, expense_category: cat,
      fuel_amount:           cat === "fuel"           ? String(amt) : "0",
      materials_amount:      cat === "materials"      ? String(amt) : "0",
      transportation_amount: cat === "transportation"  ? String(amt) : "0",
      food_amount:           cat === "food"           ? String(amt) : "0",
      others_amount:         cat === "others"         ? String(amt) : "0",
    }))
  }

  async function handleAiFill() {
    if (!aiText.trim()) return
    setAiLoading(true); setAiError(null)
    try {
      const res = await fetch("/api/ai/extract-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: aiText,
          costCenters: costCenters.map(cc => cc.name),
        }),
      })
      const json = await res.json()
      if (!res.ok || json.error) { setAiError(json.error ?? "AI failed"); return }
      const r = json.result
      const amt = parseFloat(r.amount) || 0
      const cat = r.expense_category ?? "others"
      setForm(f => ({
        ...f,
        name:             r.name             || f.name,
        amount:           r.amount           || f.amount,
        currency:         r.currency         || f.currency,
        transaction_date: r.transaction_date || f.transaction_date,
        expense_category: cat,
        cost_center:      r.cost_center      || f.cost_center,
        paid_by:          r.paid_by          || f.paid_by,
        bill_number:      r.bill_number      || f.bill_number,
        description:      r.description      || f.description,
        status:           (r.status as "paid"|"unpaid") || f.status,
        fuel_amount:           cat === "fuel"           ? String(amt) : "0",
        materials_amount:      cat === "materials"      ? String(amt) : "0",
        transportation_amount: cat === "transportation"  ? String(amt) : "0",
        food_amount:           cat === "food"           ? String(amt) : "0",
        others_amount:         cat === "others"         ? String(amt) : "0",
      }))
      setAiText("")
    } catch { setAiError("Network error — try again") }
    finally { setAiLoading(false) }
  }

  async function handleSubmit() {
    if (!form.name.trim()) { setFormErr("Expense name is required"); return }
    setFormErr(null); setSaving(true)
    try {
      const r = await apiFetch<{ invoice: Invoice; invoices?: Invoice[] }>("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name:             form.name.trim(),
          paid_by:          form.paid_by,
          status:           form.status,
          bill_number:      form.bill_number || null,
          transaction_date: form.transaction_date || null,
          currency:         form.currency,
          amount:           form.amount ? parseFloat(form.amount) : null,
          expense_category: form.expense_category || null,
          cost_center:      form.cost_center || null,
          description:      form.description || null,
          fuel_amount:           parseFloat(form.fuel_amount) || 0,
          materials_amount:      parseFloat(form.materials_amount) || 0,
          transportation_amount: parseFloat(form.transportation_amount) || 0,
          food_amount:           parseFloat(form.food_amount) || 0,
          others_amount:         parseFloat(form.others_amount) || 0,
        }),
      })
      const saved = r.invoice ?? (r.invoices?.[0] as Invoice)
      onSaved(saved)
      onClose()
      toast.success("Expense submitted")
    } catch (e: unknown) {
      setFormErr(e instanceof Error ? e.message : "Failed to submit")
    } finally { setSaving(false) }
  }

  const omrEquivalent = form.currency !== "OMR" && form.amount
    ? toOMR(parseFloat(form.amount) || 0, form.currency)
    : null

  return (
    <Modal
      open={open}
      onOpenChange={v => !v && onClose()}
      title="Submit Expense"
      description="Use AI to auto-fill the form, or fill manually."
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button variant="primary" size="sm" loading={saving} onClick={handleSubmit}>
            Submit Expense
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">

        {/* ── AI Fill ──────────────────────────────────────────────── */}
        <div className="flex flex-col gap-2 p-3 rounded-[var(--radius-lg)] border-2"
          style={{ borderColor: "#7C3AED30", background: "linear-gradient(135deg,#FAF5FF 0%,#F5F3FF 100%)" }}>
          <div className="flex items-center gap-1.5 mb-0.5">
            <Sparkle size={14} weight="fill" style={{ color: "#7C3AED" }} />
            <span className="text-xs font-bold" style={{ color: "#7C3AED" }}>AI Auto-Fill</span>
            <span className="text-[10px] ml-1" style={{ color: "#A78BFA" }}>
              Describe your expense — AI fills all fields instantly
            </span>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={aiText}
              onChange={e => setAiText(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleAiFill()}
              placeholder='e.g. "Paid 45 OMR for fuel at Shell on June 28, office card"'
              className="flex-1 h-9 px-3 text-xs rounded-[var(--radius-md)] border"
              style={{ background:"white", borderColor:"#C4B5FD", color:"var(--text-primary)", outline:"none" }}
              disabled={aiLoading}
            />
            <button
              type="button"
              onClick={handleAiFill}
              disabled={aiLoading || !aiText.trim()}
              className="flex items-center gap-1.5 h-9 px-3 rounded-[var(--radius-md)] text-xs font-bold transition-all disabled:opacity-40"
              style={{ background:"#7C3AED", color:"#fff", flexShrink:0 }}
            >
              {aiLoading
                ? <span className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
                : <><Sparkle size={12} /> Fill</>}
            </button>
          </div>
          {aiError && <p className="text-[11px]" style={{ color:"#DC2626" }}>{aiError}</p>}
        </div>

        {formErr && (
          <div className="flex items-start gap-2 p-3 rounded-[var(--radius-md)] text-sm"
            style={{ background:"#FFF0F0", color:"#DC2626", border:"1px solid #FECACA" }}>
            <Warning size={15} className="flex-shrink-0 mt-0.5" /> {formErr}
          </div>
        )}

        {/* Name */}
        <Input label="Expense Name *" value={form.name}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          placeholder="e.g. OIFC Fuel Receipt, Office Supplies" />

        {/* Paid By + Status */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider" style={{ color:"var(--text-muted)" }}>Paid By</label>
            <select value={form.paid_by} onChange={e => setForm(f => ({ ...f, paid_by: e.target.value }))}
              className="h-10 px-3 text-sm rounded-[var(--radius-md)] border"
              style={{ background:"var(--surface-base)", borderColor:"var(--surface-border)", color:"var(--text-primary)", outline:"none" }}>
              {PAID_BY_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider" style={{ color:"var(--text-muted)" }}>Status</label>
            <div className="flex gap-2 h-10 items-center">
              {(["paid","unpaid"] as const).map(s => (
                <button key={s} type="button" onClick={() => setForm(f => ({ ...f, status: s }))}
                  className="flex-1 h-9 rounded-[var(--radius-md)] text-xs font-semibold border transition-all capitalize"
                  style={{
                    background:  form.status === s ? (s==="paid"?"#059669":"#DC2626") : "var(--surface-base)",
                    borderColor: form.status === s ? (s==="paid"?"#059669":"#DC2626") : "var(--surface-border)",
                    color:       form.status === s ? "#fff" : "var(--text-muted)",
                  }}>{s}</button>
              ))}
            </div>
          </div>
        </div>

        {/* Bill # + Date */}
        <div className="grid grid-cols-2 gap-3">
          <Input label="Bill / Invoice #" value={form.bill_number}
            onChange={e => setForm(f => ({ ...f, bill_number: e.target.value }))} placeholder="INV-0001" />
          <Input label="Date" type="date" value={form.transaction_date}
            onChange={e => setForm(f => ({ ...f, transaction_date: e.target.value }))} />
        </div>

        {/* Currency + Amount */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider" style={{ color:"var(--text-muted)" }}>Currency</label>
            <select value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}
              className="h-10 px-3 text-sm rounded-[var(--radius-md)] border"
              style={{ background:"var(--surface-base)", borderColor:"var(--surface-border)", color:"var(--text-primary)", outline:"none" }}>
              {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider" style={{ color:"var(--text-muted)" }}>Amount</label>
            <input type="number" step="0.001" min="0" value={form.amount}
              onChange={e => handleAmountChange(e.target.value)} placeholder="0.000"
              className="h-10 px-3 text-sm rounded-[var(--radius-md)] border"
              style={{ background:"var(--surface-base)", borderColor:"var(--surface-border)", color:"var(--text-primary)", outline:"none" }} />
          </div>
        </div>

        {omrEquivalent && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-[var(--radius-md)] text-xs font-semibold"
            style={{ background:"#EFF4FF", color:"#2563EB", border:"1px solid #BFDBFE" }}>
            💱 ≈ OMR {omrEquivalent}
            <span className="font-normal opacity-70">(at {CURRENCY_RATES[form.currency] ?? "?"} per {form.currency})</span>
          </div>
        )}

        {/* Category */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider" style={{ color:"var(--text-muted)" }}>Expense Category</label>
          <div className="grid grid-cols-5 gap-1.5">
            {CATEGORIES.map(cat => {
              const c = CATEGORY_COLOR[cat.key]
              return (
                <button key={cat.key} type="button" onClick={() => handleCategoryChange(cat.key)}
                  className="flex flex-col items-center gap-1 px-1 py-2 rounded-[var(--radius-md)] text-[10px] font-semibold border transition-all"
                  style={{
                    background:  form.expense_category === cat.key ? c.bg  : "var(--surface-base)",
                    borderColor: form.expense_category === cat.key ? c.color : "var(--surface-border)",
                    color:       form.expense_category === cat.key ? c.color : "var(--text-muted)",
                  }}>
                  <span className="text-base leading-none">{cat.icon}</span>
                  {cat.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Breakdown preview */}
        {form.amount && parseFloat(form.amount) > 0 && (
          <div className="flex flex-wrap gap-2 p-3 rounded-[var(--radius-lg)]"
            style={{ background:"var(--surface-subtle)", border:"1px solid var(--surface-border)" }}>
            <p className="text-xs font-semibold w-full mb-1" style={{ color:"var(--text-muted)" }}>Expense Breakdown</p>
            {CATEGORIES.map(cat => {
              const v = parseFloat((form as unknown as Record<string, string>)[`${cat.key}_amount`] || "0")
              if (!v) return null
              return (
                <span key={cat.key} className="text-xs px-2 py-1 rounded-full font-medium"
                  style={{ background: CATEGORY_COLOR[cat.key].bg, color: CATEGORY_COLOR[cat.key].color }}>
                  {cat.icon} {cat.label}: {form.currency} {v.toFixed(3)}
                </span>
              )
            })}
            <span className="text-xs px-2 py-1 rounded-full font-bold ml-auto"
              style={{ background:"#1B2A5E", color:"#fff" }}>
              Total: {form.currency} {parseFloat(form.amount || "0").toFixed(3)}
              {omrEquivalent && form.currency !== "OMR" && ` (OMR ${omrEquivalent})`}
            </span>
          </div>
        )}

        {/* Cost Center */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider" style={{ color:"var(--text-muted)" }}>Cost Center</label>
          <select value={form.cost_center} onChange={e => setForm(f => ({ ...f, cost_center: e.target.value }))}
            className="h-10 px-3 text-sm rounded-[var(--radius-md)] border"
            style={{ background:"var(--surface-base)", borderColor:"var(--surface-border)", color:"var(--text-primary)", outline:"none" }}>
            <option value="">— Select cost center —</option>
            {costCenters.map(cc => <option key={cc.id} value={cc.name}>{cc.name}</option>)}
          </select>
        </div>

        {/* Description */}
        <Textarea label="Notes (optional)" value={form.description}
          onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          placeholder="Any additional notes about this expense?" rows={2} />
      </div>
    </Modal>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
//  PAGE
// ═════════════════════════════════════════════════════════════════════════════
type TabKey = "expenses" | "cost_centers"

export default function FinancePage() {
  const [activeTab,    setActiveTab]    = React.useState<TabKey>("expenses")
  const [invoices,     setInvoices]     = React.useState<Invoice[]>([])
  const [costCenters,  setCostCenters]  = React.useState<CostCenter[]>([])
  const [loading,      setLoading]      = React.useState(true)
  const [expenseModal, setExpenseModal] = React.useState(false)

  const fetchData = React.useCallback(async () => {
    setLoading(true)
    try {
      const [invData, ccData] = await Promise.allSettled([
        apiFetch<{ invoices: Invoice[] }>('/api/invoices'),
        apiFetch<{ cost_centers: CostCenter[] }>('/api/cost-centers'),
      ])
      if (invData.status === 'fulfilled') setInvoices(invData.value.invoices)
      if (ccData.status === 'fulfilled')  setCostCenters(ccData.value.cost_centers)
    } finally { setLoading(false) }
  }, [])

  React.useEffect(() => { fetchData() }, [fetchData])

  const stats = {
    total:    invoices.length,
    paid:     invoices.filter(i => i.status === "paid").length,
    unpaid:   invoices.filter(i => i.status === "unpaid").length,
    rejected: 0,
  }

  function onSaved(inv: Invoice) {
    setInvoices(prev => [inv, ...prev])
  }

  const expenseColumns: Column<Invoice>[] = [
    {
      key: "name", header: "Description", sortable: true,
      render: v => <span className="font-medium" style={{ color:"var(--text-primary)" }}>{v as string}</span>,
    },
    {
      key: "expense_category", header: "Category",
      render: v => v ? (
        <span className="text-xs px-2 py-0.5 rounded-full capitalize"
          style={{ background:"var(--surface-muted)", color:"var(--text-secondary)" }}>
          {(v as string).replace("_"," ")}
        </span>
      ) : "—",
    },
    {
      key: "amount", header: "Amount", sortable: true,
      render: (v, row) => v != null
        ? `${(row as Invoice).currency ?? "OMR"} ${Number(v).toFixed(3)}`
        : "—",
    },
    {
      key: "transaction_date", header: "Date", sortable: true,
      render: v => v ? formatDate(v as string) : "—",
    },
    { key: "cost_center", header: "Cost Center", render: v => (v as string | null) ?? "—" },
    { key: "paid_by",     header: "Paid By",     render: v => (v as string | null) ?? "—" },
    { key: "status",      header: "Status",      render: v => <StatusBadge status={v as string} /> },
  ]

  const ccColumns: Column<CostCenter>[] = [
    {
      key: "name", header: "Name", sortable: true,
      render: v => <span className="font-medium" style={{ color:"var(--text-primary)" }}>{v as string}</span>,
    },
    { key: "code",        header: "Code",        render: v => <span className="font-mono text-xs" style={{ color:"var(--text-muted)" }}>{(v as string | null) ?? "—"}</span> },
    { key: "description", header: "Description", render: v => (v as string | null) ?? "—" },
    { key: "active",      header: "Status",      render: v => <StatusBadge status={v ? "active" : "inactive"} /> },
  ]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Finance"
        actions={
          <Button variant="primary" size="md" onClick={() => setExpenseModal(true)}>
            <Plus size={16} /> Submit Expense
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Submitted" value={stats.total}    icon={<Receipt size={18} />}      color="#1B2A5E" iconBg="#EEF1F8" />
        <StatCard title="Paid"            value={stats.paid}     icon={<CheckCircle size={18} />}  color="#10A854" iconBg="#EDFBF3" />
        <StatCard title="Unpaid"          value={stats.unpaid}   icon={<Clock size={18} />}        color="#E89B1A" iconBg="#FFF8E6" />
        <StatCard title="Rejected"        value={stats.rejected} icon={<XCircle size={18} />}      color="#D63C3C" iconBg="#FFF0F0" />
      </div>

      {/* Tabs */}
      <div className="rounded-[var(--radius-lg)] border overflow-hidden"
        style={{ background:"var(--surface-base)", borderColor:"var(--surface-border)" }}>
        <div className="flex border-b px-4" style={{ borderColor:"var(--surface-border)" }}>
          {(["expenses","cost_centers"] as TabKey[]).map(t => (
            <button key={t} onClick={() => setActiveTab(t)}
              className="px-4 py-3.5 text-sm font-medium border-b-2 -mb-px transition-colors capitalize"
              style={{
                borderColor: activeTab === t ? "var(--brand-navy)" : "transparent",
                color:       activeTab === t ? "var(--brand-navy)" : "var(--text-muted)",
              }}>
              {t.replace("_"," ")}
            </button>
          ))}
        </div>
        <div className="p-4">
          {activeTab === "expenses" ? (
            <DataTable columns={expenseColumns} data={invoices} loading={loading}
              emptyIcon={<Receipt size={28} />} emptyTitle="No expenses found"
              emptyDescription="Submit an expense to get started."
              emptyAction={<Button variant="primary" size="sm" onClick={() => setExpenseModal(true)}><Plus size={14} /> Submit Expense</Button>}
            />
          ) : (
            <DataTable columns={ccColumns} data={costCenters} loading={loading}
              emptyIcon={<Buildings size={28} />} emptyTitle="No cost centers"
              emptyDescription="Cost centers will appear here once configured." />
          )}
        </div>
      </div>

      <ExpenseModal
        open={expenseModal}
        costCenters={costCenters}
        onClose={() => setExpenseModal(false)}
        onSaved={onSaved}
      />
    </div>
  )
}
