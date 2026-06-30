"use client"

import * as React from "react"
import {
  Plus, Receipt, MagnifyingGlass, Pencil, Trash, X,
  CheckCircle, Clock, CurrencyDollar, Funnel,
  ArrowsDownUp, CaretDown, Warning, FileText,
  Sparkle,
} from "@phosphor-icons/react"
import { toast }         from "sonner"
import { PageHeader }    from "@/components/ui/page-header"
import { Button }        from "@/components/ui/button"
import { Modal }         from "@/components/ui/modal"
import { Input, Textarea } from "@/components/ui/input"
import { Avatar }        from "@/components/ui/avatar"
import { apiFetch }      from "@/lib/api"
import { useAuth }       from "@/contexts/AuthContext"
import { formatDate }    from "@/lib/utils"
import type { Invoice, CostCenter } from "@/lib/types"

// ── Constants ─────────────────────────────────────────────────────────────────
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

type FilterTab = "all" | "paid" | "unpaid"

// ── Helpers ───────────────────────────────────────────────────────────────────
function toOMR(amount: number, currency: string, rate?: number): string {
  if (!amount || currency === "OMR") return amount?.toFixed(3) ?? "0.000"
  const r = rate ?? CURRENCY_RATES[currency] ?? 1
  return (amount * r).toFixed(3)
}

function fmtAmt(amount: number | null | undefined, currency = "OMR") {
  if (!amount) return "—"
  return `${currency} ${Number(amount).toFixed(3)}`
}

const CATEGORY_COLOR: Record<string, { bg: string; color: string }> = {
  fuel:           { bg: "#FFF8E6", color: "#D97706" },
  materials:      { bg: "#EFF4FF", color: "#2563EB" },
  transportation: { bg: "#ECFDF5", color: "#059669" },
  food:           { bg: "#FFF0F0", color: "#DC2626" },
  others:         { bg: "#F5F3FF", color: "#7C3AED" },
}

function Skeleton({ h = 20 }: { h?: number }) {
  return <div className="animate-pulse rounded" style={{ height: h, background: "var(--surface-muted)" }} />
}

// ── Invoice Form ──────────────────────────────────────────────────────────────
interface InvoiceForm {
  name:             string
  paid_by:          string
  status:           "paid" | "unpaid"
  bill_number:      string
  transaction_date: string
  currency:         string
  amount:           string
  expense_category: string
  cost_center:      string
  description:      string
  // breakdown
  fuel_amount:           string
  materials_amount:      string
  transportation_amount: string
  food_amount:           string
  others_amount:         string
}

const BLANK_FORM: InvoiceForm = {
  name:"", paid_by:"Office card", status:"unpaid", bill_number:"",
  transaction_date:"", currency:"OMR", amount:"", expense_category:"others",
  cost_center:"", description:"",
  fuel_amount:"0", materials_amount:"0", transportation_amount:"0",
  food_amount:"0", others_amount:"0",
}

interface InvoiceModalProps {
  open:       boolean
  editing:    Invoice | null
  costCenters:CostCenter[]
  onClose:    () => void
  onSaved:    (inv: Invoice) => void
}

function InvoiceModal({ open, editing, costCenters, onClose, onSaved }: InvoiceModalProps) {
  const [form,       setForm]       = React.useState<InvoiceForm>(BLANK_FORM)
  const [submitting, setSubmitting] = React.useState(false)
  const [error,      setError]      = React.useState<string | null>(null)

  // ── AI fill ────────────────────────────────────────────────────────────────
  const [aiText,     setAiText]     = React.useState("")
  const [aiLoading,  setAiLoading]  = React.useState(false)
  const [aiError,    setAiError]    = React.useState<string | null>(null)

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

  React.useEffect(() => {
    if (open) {
      if (editing) {
        setForm({
          name:             editing.name ?? "",
          paid_by:          editing.paid_by ?? "Office card",
          status:           (editing.status as "paid"|"unpaid") ?? "unpaid",
          bill_number:      editing.bill_number ?? "",
          transaction_date: editing.transaction_date ?? "",
          currency:         editing.currency ?? "OMR",
          amount:           String(editing.amount ?? ""),
          expense_category: editing.expense_category ?? "others",
          cost_center:      editing.cost_center ?? "",
          description:      editing.description ?? "",
          fuel_amount:           String(editing.fuel_amount ?? 0),
          materials_amount:      String(editing.materials_amount ?? 0),
          transportation_amount: String(editing.transportation_amount ?? 0),
          food_amount:           String(editing.food_amount ?? 0),
          others_amount:         String(editing.others_amount ?? 0),
        })
      } else {
        setForm(BLANK_FORM)
      }
      setError(null)
    }
  }, [open, editing])

  // Auto-split amount into category breakdown
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

  const omrEquivalent = form.currency !== "OMR" && form.amount
    ? toOMR(parseFloat(form.amount) || 0, form.currency)
    : null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setError("Invoice name is required"); return }
    setError(null); setSubmitting(true)
    try {
      const payload = {
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
      }
      let saved: Invoice
      if (editing) {
        const r = await apiFetch<{ invoice: Invoice }>(`/api/invoices/${editing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        saved = r.invoice
      } else {
        const r = await apiFetch<{ invoice: Invoice; invoices?: Invoice[] }>("/api/invoices", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        saved = r.invoice ?? (r.invoices?.[0] as Invoice)
      }
      onSaved(saved)
      onClose()
      toast.success(editing ? "Invoice updated" : "Invoice created")
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save invoice")
    } finally { setSubmitting(false) }
  }

  return (
    <Modal
      open={open}
      onOpenChange={v => !v && onClose()}
      title={editing ? "Edit Invoice" : "New Invoice"}
      description={editing ? "Update the invoice details below." : "Fill in the details for your new expense."}
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button variant="primary" size="sm" loading={submitting} onClick={(e: React.MouseEvent) => handleSubmit(e as unknown as React.FormEvent)}>
            {editing ? "Update Invoice" : "Create Invoice"}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">

        {/* ── AI Fill ──────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-2 p-3 rounded-[var(--radius-lg)] border-2"
          style={{ borderColor: "#7C3AED30", background: "linear-gradient(135deg,#FAF5FF 0%,#F5F3FF 100%)" }}>
          <div className="flex items-center gap-1.5 mb-0.5">
            <Sparkle size={14} weight="fill" style={{ color: "#7C3AED" }} />
            <span className="text-xs font-bold" style={{ color: "#7C3AED" }}>AI Auto-Fill</span>
            <span className="text-[10px] ml-1" style={{ color: "#A78BFA" }}>Describe your expense — AI fills the form</span>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={aiText}
              onChange={e => setAiText(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleAiFill()}
              placeholder="e.g. Paid 45 OMR for fuel at Shell on June 28, office card"
              className="flex-1 h-9 px-3 text-xs rounded-[var(--radius-md)] border"
              style={{ background: "white", borderColor: "#C4B5FD", color: "var(--text-primary)", outline: "none" }}
              disabled={aiLoading}
            />
            <button
              type="button"
              onClick={handleAiFill}
              disabled={aiLoading || !aiText.trim()}
              className="flex items-center gap-1.5 h-9 px-3 rounded-[var(--radius-md)] text-xs font-bold transition-all disabled:opacity-40"
              style={{ background: "#7C3AED", color: "#fff", flexShrink: 0 }}
            >
              {aiLoading
                ? <span className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
                : <><Sparkle size={12} /> Fill</>}
            </button>
          </div>
          {aiError && (
            <p className="text-[11px]" style={{ color: "#DC2626" }}>{aiError}</p>
          )}
        </div>

        {error && (
          <div className="flex items-start gap-2 p-3 rounded-[var(--radius-md)] text-sm"
            style={{ background: "#FFF0F0", color: "#DC2626", border: "1px solid #FECACA" }}>
            <Warning size={15} className="flex-shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        {/* Row 1: Name */}
        <Input
          label="Invoice / Expense Name *"
          value={form.name}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          placeholder="e.g. OIFC Fuel Receipt, Office Supplies"
          required
        />

        {/* Row 2: Paid By + Status */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              Paid By
            </label>
            <select
              value={form.paid_by}
              onChange={e => setForm(f => ({ ...f, paid_by: e.target.value }))}
              className="h-10 px-3 text-sm rounded-[var(--radius-md)] border"
              style={{ background: "var(--surface-base)", borderColor: "var(--surface-border)", color: "var(--text-primary)", outline: "none" }}
            >
              {PAID_BY_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              Payment Status
            </label>
            <div className="flex gap-2 h-10 items-center">
              {(["paid","unpaid"] as const).map(s => (
                <button
                  key={s} type="button"
                  onClick={() => setForm(f => ({ ...f, status: s }))}
                  className="flex-1 h-9 rounded-[var(--radius-md)] text-xs font-semibold border transition-all capitalize"
                  style={{
                    background:  form.status === s ? (s === "paid" ? "#059669" : "#DC2626") : "var(--surface-base)",
                    borderColor: form.status === s ? (s === "paid" ? "#059669" : "#DC2626") : "var(--surface-border)",
                    color:       form.status === s ? "#fff" : "var(--text-muted)",
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Row 3: Bill # + Date */}
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Bill / Invoice Number"
            value={form.bill_number}
            onChange={e => setForm(f => ({ ...f, bill_number: e.target.value }))}
            placeholder="INV-0001"
          />
          <Input
            label="Date"
            type="date"
            value={form.transaction_date}
            onChange={e => setForm(f => ({ ...f, transaction_date: e.target.value }))}
          />
        </div>

        {/* Row 4: Currency + Amount */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              Currency
            </label>
            <select
              value={form.currency}
              onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}
              className="h-10 px-3 text-sm rounded-[var(--radius-md)] border"
              style={{ background: "var(--surface-base)", borderColor: "var(--surface-border)", color: "var(--text-primary)", outline: "none" }}
            >
              {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              Total Amount
            </label>
            <input
              type="number" step="0.001" min="0"
              value={form.amount}
              onChange={e => handleAmountChange(e.target.value)}
              placeholder="0.000"
              className="h-10 px-3 text-sm rounded-[var(--radius-md)] border"
              style={{ background: "var(--surface-base)", borderColor: "var(--surface-border)", color: "var(--text-primary)", outline: "none" }}
            />
          </div>
        </div>

        {/* OMR equivalent */}
        {omrEquivalent && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-[var(--radius-md)] text-xs font-semibold"
            style={{ background: "#EFF4FF", color: "#2563EB", border: "1px solid #BFDBFE" }}>
            💱 ≈ OMR {omrEquivalent}
            <span className="font-normal opacity-70">(at {CURRENCY_RATES[form.currency] ?? "?"} per {form.currency})</span>
          </div>
        )}

        {/* Row 5: Category */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
            Expense Category
          </label>
          <div className="grid grid-cols-5 gap-1.5">
            {CATEGORIES.map(cat => {
              const c = CATEGORY_COLOR[cat.key]
              return (
                <button
                  key={cat.key} type="button"
                  onClick={() => handleCategoryChange(cat.key)}
                  className="flex flex-col items-center gap-1 px-1 py-2 rounded-[var(--radius-md)] text-[10px] font-semibold border transition-all"
                  style={{
                    background:  form.expense_category === cat.key ? c.bg : "var(--surface-base)",
                    borderColor: form.expense_category === cat.key ? c.color : "var(--surface-border)",
                    color:       form.expense_category === cat.key ? c.color : "var(--text-muted)",
                  }}
                >
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
            style={{ background: "var(--surface-subtle)", border: "1px solid var(--surface-border)" }}>
            <p className="text-xs font-semibold w-full mb-1" style={{ color: "var(--text-muted)" }}>
              Expense Breakdown
            </p>
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
              style={{ background: "#1B2A5E", color: "#fff" }}>
              Total: {form.currency} {parseFloat(form.amount || "0").toFixed(3)}
              {omrEquivalent && form.currency !== "OMR" && ` (OMR ${omrEquivalent})`}
            </span>
          </div>
        )}

        {/* Row 6: Cost center */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
            Cost Center
          </label>
          <select
            value={form.cost_center}
            onChange={e => setForm(f => ({ ...f, cost_center: e.target.value }))}
            className="h-10 px-3 text-sm rounded-[var(--radius-md)] border"
            style={{ background: "var(--surface-base)", borderColor: "var(--surface-border)", color: "var(--text-primary)", outline: "none" }}
          >
            <option value="">— Select cost center —</option>
            {costCenters.map(cc => <option key={cc.id} value={cc.name}>{cc.name}</option>)}
          </select>
        </div>

        {/* Row 7: Description */}
        <Textarea
          label="Description"
          value={form.description}
          onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          placeholder="What was this expense for?"
          rows={2}
        />
      </form>
    </Modal>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
//  PAGE
// ═════════════════════════════════════════════════════════════════════════════
export default function MyInvoicesPage() {
  const { user }   = useAuth()
  const isManager  = ["admin","hr","finance","md","cto","coo"].includes(user?.role ?? "")

  const [invoices,     setInvoices]     = React.useState<Invoice[]>([])
  const [costCenters,  setCostCenters]  = React.useState<CostCenter[]>([])
  const [loading,      setLoading]      = React.useState(true)
  const [search,       setSearch]       = React.useState("")
  const [filterTab,    setFilterTab]    = React.useState<FilterTab>("all")
  const [filterMonth,  setFilterMonth]  = React.useState("")
  const [filterCat,    setFilterCat]    = React.useState("")
  const [sortDesc,     setSortDesc]     = React.useState(true)

  // Modal
  const [modal,    setModal]    = React.useState(false)
  const [editing,  setEditing]  = React.useState<Invoice | null>(null)

  // Delete confirm
  const [deleting, setDeleting] = React.useState<Invoice | null>(null)
  const [delBusy,  setDelBusy]  = React.useState(false)

  // Load
  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const [invR, ccR] = await Promise.allSettled([
        apiFetch<{ invoices: Invoice[] }>("/api/invoices"),
        apiFetch<{ cost_centers: CostCenter[] }>("/api/cost-centers"),
      ])
      if (invR.status === "fulfilled") setInvoices(invR.value.invoices ?? [])
      if (ccR.status === "fulfilled")  setCostCenters(ccR.value.cost_centers ?? [])
    } finally { setLoading(false) }
  }, [])

  React.useEffect(() => { load() }, [load])

  // Stats
  const myInvoices = React.useMemo(
    () => isManager ? invoices : invoices.filter(i => i.user_id === user?.id),
    [invoices, isManager, user?.id]
  )
  const stats = React.useMemo(() => {
    const paid   = myInvoices.filter(i => i.status === "paid")
    const unpaid = myInvoices.filter(i => i.status === "unpaid")
    const totalOMR = myInvoices.reduce((s, i) => {
      const amt = i.amount ?? 0
      const cur = i.currency ?? "OMR"
      return s + (cur === "OMR" ? amt : amt * (CURRENCY_RATES[cur] ?? 1))
    }, 0)
    return { total: myInvoices.length, paid: paid.length, unpaid: unpaid.length, totalOMR }
  }, [myInvoices])

  // Filter + search
  const filtered = React.useMemo(() => {
    return myInvoices
      .filter(i => filterTab === "all" || i.status === filterTab)
      .filter(i => !filterMonth || (i.transaction_date ?? i.created_at ?? "").startsWith(filterMonth))
      .filter(i => !filterCat || i.expense_category === filterCat)
      .filter(i => {
        if (!search) return true
        const q = search.toLowerCase()
        return (
          (i.name ?? "").toLowerCase().includes(q) ||
          (i.bill_number ?? "").toLowerCase().includes(q) ||
          (i.description ?? "").toLowerCase().includes(q) ||
          (i.cost_center ?? "").toLowerCase().includes(q)
        )
      })
      .sort((a, b) => {
        const da = new Date(a.created_at ?? 0).getTime()
        const db = new Date(b.created_at ?? 0).getTime()
        return sortDesc ? db - da : da - db
      })
  }, [myInvoices, filterTab, filterMonth, filterCat, search, sortDesc])

  async function handleDelete() {
    if (!deleting) return
    setDelBusy(true)
    try {
      await apiFetch(`/api/invoices/${deleting.id}`, { method: "DELETE" })
      setInvoices(prev => prev.filter(i => i.id !== deleting.id))
      toast.success("Invoice deleted")
      setDeleting(null)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Delete failed")
    } finally { setDelBusy(false) }
  }

  function onSaved(inv: Invoice) {
    setInvoices(prev => {
      const idx = prev.findIndex(i => i.id === inv.id)
      if (idx >= 0) { const n = [...prev]; n[idx] = inv; return n }
      return [inv, ...prev]
    })
  }

  const months = React.useMemo(() => {
    const s = new Set<string>()
    myInvoices.forEach(i => {
      const d = i.transaction_date ?? i.created_at ?? ""
      const m = d.slice(0, 7)
      if (m) s.add(m)
    })
    return Array.from(s).sort().reverse()
  }, [myInvoices])

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <PageHeader
          title="My Invoices"
          subtitle="Track and manage your expenses and receipts"
        />
        <Button variant="primary" size="md" onClick={() => { setEditing(null); setModal(true) }}>
          <Plus size={16} /> New Invoice
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Invoices", value: stats.total,                     color: "#1B2A5E", bg: "#EEF1F8", icon: FileText    },
          { label: "Paid",           value: stats.paid,                      color: "#059669", bg: "#ECFDF5", icon: CheckCircle  },
          { label: "Unpaid",         value: stats.unpaid,                    color: "#DC2626", bg: "#FFF0F0", icon: Clock        },
          { label: "Total (OMR)",    value: `${stats.totalOMR.toFixed(3)}`, color: "#D97706", bg: "#FFF8E6", icon: CurrencyDollar, text: true },
        ].map(s => (
          <div key={s.label} className="flex items-center gap-3 p-4 rounded-[var(--radius-lg)] border"
            style={{ background: s.bg, borderColor: `${s.color}25` }}>
            <div className="w-10 h-10 rounded-[var(--radius-md)] flex items-center justify-center flex-shrink-0"
              style={{ background: `${s.color}20` }}>
              <s.icon size={20} style={{ color: s.color }} />
            </div>
            <div>
              <p className="text-xl font-bold leading-none" style={{ color: s.color }}>
                {s.text ? s.value : Number(s.value)}
              </p>
              <p className="text-xs mt-0.5 font-medium" style={{ color: s.color, opacity: 0.7 }}>{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters + search */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Status tabs */}
        <div className="flex items-center rounded-[var(--radius-md)] border p-0.5 gap-0.5"
          style={{ background: "var(--surface-subtle)", borderColor: "var(--surface-border)" }}>
          {(["all","paid","unpaid"] as FilterTab[]).map(t => (
            <button
              key={t}
              onClick={() => setFilterTab(t)}
              className="px-3 py-1.5 rounded-[var(--radius-md)] text-xs font-semibold capitalize transition-all"
              style={{
                background: filterTab === t ? "#1B2A5E" : "transparent",
                color:      filterTab === t ? "#fff"    : "var(--text-muted)",
                boxShadow:  filterTab === t ? "0 1px 3px rgba(0,0,0,.12)" : "none",
              }}
            >
              {t} {t !== "all" && <span className="ml-1 opacity-70">
                ({t === "paid" ? stats.paid : stats.unpaid})
              </span>}
            </button>
          ))}
        </div>

        {/* Month filter */}
        <select
          value={filterMonth}
          onChange={e => setFilterMonth(e.target.value)}
          className="h-8 px-2 text-xs rounded-[var(--radius-md)] border"
          style={{ background: "var(--surface-base)", borderColor: "var(--surface-border)", color: "var(--text-secondary)", outline: "none" }}
        >
          <option value="">All months</option>
          {months.map(m => <option key={m} value={m}>{m}</option>)}
        </select>

        {/* Category filter */}
        <select
          value={filterCat}
          onChange={e => setFilterCat(e.target.value)}
          className="h-8 px-2 text-xs rounded-[var(--radius-md)] border"
          style={{ background: "var(--surface-base)", borderColor: "var(--surface-border)", color: "var(--text-secondary)", outline: "none" }}
        >
          <option value="">All categories</option>
          {CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.icon} {c.label}</option>)}
        </select>

        {/* Search */}
        <div className="relative flex-1 min-w-[180px]">
          <MagnifyingGlass size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search invoices…"
            className="w-full h-8 pl-7 pr-2 text-xs rounded-[var(--radius-md)] border"
            style={{ background: "var(--surface-base)", borderColor: "var(--surface-border)", color: "var(--text-primary)", outline: "none" }}
          />
        </div>

        {/* Sort */}
        <button
          onClick={() => setSortDesc(d => !d)}
          className="flex items-center gap-1 h-8 px-2.5 rounded-[var(--radius-md)] border text-xs font-medium transition-colors hover:bg-[#F1F3F7]"
          style={{ borderColor: "var(--surface-border)", color: "var(--text-secondary)" }}
        >
          <ArrowsDownUp size={12} />
          {sortDesc ? "Newest" : "Oldest"}
        </button>
      </div>

      {/* Invoice list */}
      {loading ? (
        <div className="flex flex-col gap-3">
          {Array.from({length: 5}).map((_, i) => <Skeleton key={i} h={76} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 rounded-[var(--radius-xl)] border border-dashed"
          style={{ borderColor: "var(--surface-border)" }}>
          <Receipt size={32} style={{ color: "var(--text-disabled)" }} />
          <p className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>
            {search || filterTab !== "all" || filterMonth || filterCat
              ? "No invoices match your filters"
              : "No invoices yet — create your first one"}
          </p>
          {!search && filterTab === "all" && !filterMonth && !filterCat && (
            <Button variant="primary" size="sm" onClick={() => { setEditing(null); setModal(true) }}>
              <Plus size={13} /> New Invoice
            </Button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map(inv => {
            const cat    = CATEGORY_COLOR[inv.expense_category ?? "others"] ?? CATEGORY_COLOR.others
            const isPaid = inv.status === "paid"
            const omrAmt = inv.currency && inv.currency !== "OMR" && inv.amount
              ? `≈ OMR ${toOMR(inv.amount, inv.currency)}`
              : null

            return (
              <div
                key={inv.id}
                className="group flex items-center gap-4 px-4 py-3 rounded-[var(--radius-lg)] border transition-all hover:shadow-sm"
                style={{
                  background:   "var(--surface-base)",
                  borderColor:  "var(--surface-border)",
                  borderLeft:   `3px solid ${isPaid ? "#059669" : "#DC2626"}`,
                }}
              >
                {/* Category icon */}
                <div className="w-9 h-9 rounded-[var(--radius-md)] flex items-center justify-center flex-shrink-0 text-base"
                  style={{ background: cat.bg }}>
                  {CATEGORIES.find(c => c.key === inv.expense_category)?.icon ?? "📋"}
                </div>

                {/* Main info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>
                      {inv.name}
                    </p>
                    {inv.bill_number && (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                        style={{ background: "var(--surface-muted)", color: "var(--text-disabled)" }}>
                        #{inv.bill_number}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {inv.transaction_date && (
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                        {formatDate(inv.transaction_date)}
                      </span>
                    )}
                    {inv.cost_center && (
                      <span className="text-xs" style={{ color: "var(--text-disabled)" }}>· {inv.cost_center}</span>
                    )}
                    {inv.paid_by && (
                      <span className="text-xs" style={{ color: "var(--text-disabled)" }}>· {inv.paid_by}</span>
                    )}
                  </div>
                </div>

                {/* Amount + status */}
                <div className="flex flex-col items-end flex-shrink-0 gap-1">
                  <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
                    {fmtAmt(inv.amount, inv.currency ?? "OMR")}
                  </p>
                  {omrAmt && (
                    <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{omrAmt}</p>
                  )}
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                    style={{
                      background: isPaid ? "#ECFDF5" : "#FFF0F0",
                      color:      isPaid ? "#059669" : "#DC2626",
                    }}>
                    {isPaid ? "✓ Paid" : "⏳ Unpaid"}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  <button
                    onClick={() => { setEditing(inv); setModal(true) }}
                    className="w-7 h-7 flex items-center justify-center rounded-[var(--radius-md)] transition-colors hover:bg-[#EEF1F8]"
                    style={{ color: "#1B2A5E" }}
                    title="Edit"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    onClick={() => setDeleting(inv)}
                    className="w-7 h-7 flex items-center justify-center rounded-[var(--radius-md)] transition-colors hover:bg-[#FFF0F0]"
                    style={{ color: "#DC2626" }}
                    title="Delete"
                  >
                    <Trash size={13} />
                  </button>
                </div>
              </div>
            )
          })}

          {/* Footer count */}
          <p className="text-xs text-center py-2" style={{ color: "var(--text-disabled)" }}>
            Showing {filtered.length} of {myInvoices.length} invoice{myInvoices.length !== 1 ? "s" : ""}
          </p>
        </div>
      )}

      {/* Create / Edit modal */}
      <InvoiceModal
        open={modal}
        editing={editing}
        costCenters={costCenters}
        onClose={() => { setModal(false); setEditing(null) }}
        onSaved={onSaved}
      />

      {/* Delete confirmation */}
      <Modal
        open={!!deleting}
        onOpenChange={v => !v && setDeleting(null)}
        title="Delete Invoice"
        description={`Are you sure you want to delete "${deleting?.name}"? This cannot be undone.`}
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setDeleting(null)} disabled={delBusy}>Cancel</Button>
            <Button
              size="sm"
              loading={delBusy}
              onClick={handleDelete}
              style={{ background: "#DC2626", color: "#fff", border: "none" }}
            >
              Delete
            </Button>
          </>
        }
      >{null}</Modal>
    </div>
  )
}
