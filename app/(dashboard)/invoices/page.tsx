"use client"

import * as React from "react"
import {
  Plus, Receipt, MagnifyingGlass, Pencil, Trash, X,
  CheckCircle, Clock, CurrencyDollar, ArrowsDownUp,
  Warning, FileText, Sparkle, UploadSimple, FilePdf,
  Bank, Eye, Download, Check,
} from "@phosphor-icons/react"
import { toast }         from "sonner"
import { PageHeader }    from "@/components/ui/page-header"
import { Button }        from "@/components/ui/button"
import { Input, Textarea } from "@/components/ui/input"
import { apiFetch }      from "@/lib/api"
import { useAuth }       from "@/contexts/AuthContext"
import { formatDate }    from "@/lib/utils"
import type { Invoice, CostCenter } from "@/lib/types"

// ── Constants ─────────────────────────────────────────────────────────────────
const CURRENCIES = [
  "OMR","USD","EUR","GBP","SAR","AED","INR","PKR","BHD","KWD",
  "QAR","JOD","EGP","TRY","JPY","CNY","AUD","CAD","CHF","SGD",
]
const CURRENCY_RATES: Record<string,number> = {
  USD:0.385, EUR:0.420, GBP:0.490, SAR:0.103, AED:0.105,
  INR:0.0046,PKR:0.00138,BHD:2.65,KWD:1.25,QAR:0.106,
  JOD:1.41,EGP:0.0081,TRY:0.0117,JPY:0.0026,CNY:0.053,
  AUD:0.250,CAD:0.285,CHF:0.432,SGD:0.286,OMR:1.0,
}
const PAID_BY_OPTIONS = ["Office card","CEO","IT department","Personal","Company account"]

type FilterTab = "all"|"paid"|"unpaid"

function toOMR(amount:number,currency:string,rate?:number):string {
  if(!amount||currency==="OMR") return amount?.toFixed(3)??"0.000"
  return (amount*(rate??CURRENCY_RATES[currency]??1)).toFixed(3)
}
function fmtAmt(amount:number|null|undefined,currency="OMR") {
  if(!amount) return "—"
  return `${currency} ${Number(amount).toFixed(3)}`
}

// ── Extracted invoice from AI ─────────────────────────────────────────────────
interface AIInvoice {
  invoice_name:  string
  bill_number:   string
  date:          string
  currency:      string
  total_amount:  number
  exchange_rate: number|null
  cost_center:   string
  description:   string
  paid_by:       string
  status:        "paid"|"unpaid"
}

// ── Invoice form shape ────────────────────────────────────────────────────────
interface InvoiceForm {
  name:             string
  paid_by:          string
  status:           "paid"|"unpaid"
  bill_number:      string
  transaction_date: string
  currency:         string
  amount:           string
  exchange_rate:    string
  cost_center:      string
  description:      string
}

const BLANK_FORM: InvoiceForm = {
  name:"",paid_by:"Office card",status:"unpaid",bill_number:"",
  transaction_date:"",currency:"OMR",amount:"",exchange_rate:"",
  cost_center:"",description:"",
}

function aiToForm(ai: AIInvoice): InvoiceForm {
  return {
    name:             ai.invoice_name ?? "",
    paid_by:          ai.paid_by      ?? "Office card",
    status:           ai.status       ?? "unpaid",
    bill_number:      ai.bill_number  ?? "",
    transaction_date: ai.date         ?? "",
    currency:         ai.currency     ?? "OMR",
    amount:           String(ai.total_amount ?? ""),
    exchange_rate:    ai.exchange_rate != null ? String(ai.exchange_rate) : "",
    cost_center:      ai.cost_center  ?? "",
    description:      ai.description  ?? "",
  }
}

// ═════════════════════════════════════════════════════════════════════════════
//  INVOICE UPLOAD MODAL
// ═════════════════════════════════════════════════════════════════════════════
interface InvoiceUploadModalProps {
  open:         boolean
  editing:      Invoice|null
  costCenters:  CostCenter[]
  onClose:      ()=>void
  onSaved:      (inv:Invoice)=>void
}

function InvoiceUploadModal({open,editing,costCenters,onClose,onSaved}:InvoiceUploadModalProps) {
  // ── PDF / file state ───────────────────────────────────────────────────────
  const [pdfFile,       setPdfFile]       = React.useState<File|null>(null)
  const [pdfPreviewUrl, setPdfPreviewUrl] = React.useState<string|null>(null)
  const [bankFile,      setBankFile]      = React.useState<File|null>(null)
  const [bankPreviewUrl,setBankPreviewUrl]= React.useState<string|null>(null)
  const pdfInputRef  = React.useRef<HTMLInputElement>(null)
  const bankInputRef = React.useRef<HTMLInputElement>(null)
  const [dragging,      setDragging]      = React.useState(false)

  // ── AI extraction state ────────────────────────────────────────────────────
  type ExtractStep = "idle"|"reading"|"analysing"|"filling"|"done"|"error"
  const [extractStep,   setExtractStep]   = React.useState<ExtractStep>("idle")
  const [extractError,  setExtractError]  = React.useState<string|null>(null)
  const [aiInvoices,    setAiInvoices]    = React.useState<AIInvoice[]>([])
  const [selectedIdxs,  setSelectedIdxs]  = React.useState<Set<number>>(new Set())
  const [expandedIdx,   setExpandedIdx]   = React.useState<number|null>(0)

  // ── Active form (for single invoice or currently edited multi-invoice) ──────
  const [forms,         setForms]         = React.useState<InvoiceForm[]>([BLANK_FORM])
  const [activeFormIdx, setActiveFormIdx] = React.useState(0)
  const [submitting,    setSubmitting]    = React.useState(false)
  const [formError,     setFormError]     = React.useState<string|null>(null)

  const isMulti = aiInvoices.length > 1
  const isEdit  = !!editing

  // ── Reset on open ──────────────────────────────────────────────────────────
  React.useEffect(() => {
    if (!open) return
    setPdfFile(null); setPdfPreviewUrl(null)
    setBankFile(null); setBankPreviewUrl(null)
    setExtractStep("idle"); setExtractError(null)
    setAiInvoices([]); setSelectedIdxs(new Set()); setExpandedIdx(0)
    setFormError(null); setSubmitting(false)

    if (editing) {
      setForms([{
        name:             editing.name ?? "",
        paid_by:          editing.paid_by ?? "Office card",
        status:           (editing.status as "paid"|"unpaid") ?? "unpaid",
        bill_number:      editing.bill_number ?? "",
        transaction_date: editing.transaction_date ?? "",
        currency:         editing.currency ?? "OMR",
        amount:           String(editing.amount ?? ""),
        exchange_rate:    String((editing as Record<string,unknown>).exchange_rate ?? ""),
        cost_center:      editing.cost_center ?? "",
        description:      editing.description ?? "",
      }])
      // Load existing PDF preview if stored path exists
      const rcpt = (editing as Record<string,unknown>).invoice_receipt_path as string|null
      if (rcpt) setPdfPreviewUrl(rcpt)
      const bank = (editing as Record<string,unknown>).bank_screenshot_path as string|null
      if (bank) setBankPreviewUrl(bank)
    } else {
      setForms([BLANK_FORM])
    }
    setActiveFormIdx(0)
  }, [open, editing])

  // ── Cleanup blob URLs ──────────────────────────────────────────────────────
  React.useEffect(() => {
    return () => {
      if (pdfPreviewUrl?.startsWith("blob:")) URL.revokeObjectURL(pdfPreviewUrl)
      if (bankPreviewUrl?.startsWith("blob:")) URL.revokeObjectURL(bankPreviewUrl)
    }
  }, [pdfPreviewUrl, bankPreviewUrl])

  // ── PDF selection — auto-triggers AI extraction ────────────────────────────
  function handlePdfSelect(file: File) {
    if (!file.type.includes("pdf")) { toast.error("Please upload a PDF file"); return }
    if (file.size > 20 * 1024 * 1024) { toast.error("PDF must be under 20 MB"); return }
    setPdfFile(file)
    if (pdfPreviewUrl?.startsWith("blob:")) URL.revokeObjectURL(pdfPreviewUrl)
    setPdfPreviewUrl(URL.createObjectURL(file))
    setAiInvoices([]); setSelectedIdxs(new Set()); setExpandedIdx(0)
    handleExtract(file) // start immediately — don't wait for state update
  }

  function handleBankSelect(file: File) {
    setBankFile(file)
    if (bankPreviewUrl?.startsWith("blob:")) URL.revokeObjectURL(bankPreviewUrl)
    setBankPreviewUrl(URL.createObjectURL(file))
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault(); setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handlePdfSelect(file)
  }

  // ── AI extraction (accepts file directly so it can be called before state settles) ──
  async function handleExtract(file?: File) {
    const target = file ?? pdfFile
    if (!target) return
    setExtractError(null)

    const steps: ExtractStep[] = ["reading","analysing","filling"]
    for (const s of steps) {
      setExtractStep(s)
      await new Promise(r => setTimeout(r, s === "reading" ? 600 : s === "analysing" ? 800 : 400))
    }

    const fd = new FormData()
    fd.append("pdf", target)

    try {
      const res  = await fetch("/api/invoices/extract", { method:"POST", body:fd })
      const json = await res.json()
      if (!res.ok || json.error) {
        setExtractStep("error")
        setExtractError(json.error ?? "AI extraction failed")
        return
      }

      const invoices: AIInvoice[] = json.invoices ?? []
      setAiInvoices(invoices)
      setSelectedIdxs(new Set(invoices.map((_,i) => i)))
      setForms(invoices.map(aiToForm))
      setActiveFormIdx(0); setExpandedIdx(0)
      setExtractStep("done")
      toast.success(invoices.length > 1
        ? `Found ${invoices.length} invoices — review and save`
        : "Fields filled ✓")
    } catch {
      setExtractStep("error")
      setExtractError("Network error — check your connection")
    }
  }

  // ── Form helpers ───────────────────────────────────────────────────────────
  function setForm(idx: number, patch: Partial<InvoiceForm>) {
    setForms(prev => prev.map((f,i) => i === idx ? {...f,...patch} : f))
  }

  // ── Upload file to storage ─────────────────────────────────────────────────
  async function uploadFile(file:File, type:"receipt"|"bank") {
    const fd = new FormData()
    fd.append("file", file)
    fd.append("type", type)
    try {
      const res  = await fetch("/api/invoices/upload-file",{method:"POST",body:fd})
      const json = await res.json()
      return json as {url:string|null;path:string|null;warning?:string}
    } catch { return {url:null,path:null} }
  }

  // ── Save invoices ──────────────────────────────────────────────────────────
  async function handleSave() {
    const toSave = isMulti
      ? forms.filter((_,i) => selectedIdxs.has(i))
      : forms.slice(0,1)

    if (toSave.length === 0) { toast.error("Select at least one invoice"); return }
    if (!toSave[0].name.trim()) { setFormError("Invoice name is required"); return }
    const hasReceipt = !!pdfFile || !!(editing && (editing as Record<string,unknown>).invoice_receipt_path)
    const hasBank    = !!bankFile || !!(editing && (editing as Record<string,unknown>).bank_screenshot_path)
    if (!hasReceipt) { setFormError("Invoice Receipt PDF is required"); return }
    if (!hasBank)    { setFormError("Bank Statement is required"); return }
    setFormError(null); setSubmitting(true)

    try {
      // Upload files once (shared across all invoices in the batch)
      let receiptPath: string|null = null
      let bankPath:    string|null = null
      if (pdfFile) {
        const r = await uploadFile(pdfFile,"receipt")
        receiptPath = r.path ?? null
      } else if (editing && (editing as Record<string,unknown>).invoice_receipt_path) {
        receiptPath = (editing as Record<string,unknown>).invoice_receipt_path as string
      }
      if (bankFile) {
        const r = await uploadFile(bankFile,"bank")
        bankPath = r.path ?? null
      } else if (editing && (editing as Record<string,unknown>).bank_screenshot_path) {
        bankPath = (editing as Record<string,unknown>).bank_screenshot_path as string
      }

      const saved: Invoice[] = []
      for (const form of toSave) {
        const payload = {
          name:             form.name.trim(),
          paid_by:          form.paid_by,
          status:           form.status,
          bill_number:      form.bill_number || null,
          transaction_date: form.transaction_date || null,
          currency:         form.currency,
          amount:           form.amount ? parseFloat(form.amount) : null,
          exchange_rate:    form.exchange_rate ? parseFloat(form.exchange_rate) : null,
          cost_center:      form.cost_center || null,
          description:      form.description || null,
          invoice_receipt_path: receiptPath,
          bank_screenshot_path: bankPath,
        }
        let result: Invoice
        if (isEdit && !isMulti) {
          const r = await apiFetch<{invoice:Invoice}>(`/api/invoices/${editing!.id}`,{
            method:"PATCH",headers:{"Content-Type":"application/json"},
            body:JSON.stringify(payload),
          })
          result = r.invoice
        } else {
          const r = await apiFetch<{invoice:Invoice;invoices?:Invoice[]}>("/api/invoices",{
            method:"POST",headers:{"Content-Type":"application/json"},
            body:JSON.stringify(payload),
          })
          result = r.invoice ?? (r.invoices?.[0] as Invoice)
        }
        saved.push(result)
      }

      saved.forEach(onSaved)
      toast.success(saved.length>1 ? `${saved.length} invoices saved` : isEdit ? "Invoice updated" : "Invoice saved")
      onClose()
    } catch(e:unknown) {
      setFormError(e instanceof Error ? e.message : "Failed to save")
    } finally { setSubmitting(false) }
  }

  if (!open) return null

  const form = forms[activeFormIdx] ?? forms[0] ?? BLANK_FORM
  const omrEq = form.currency!=="OMR"&&form.amount
    ? toOMR(parseFloat(form.amount)||0,form.currency,form.exchange_rate?parseFloat(form.exchange_rate):undefined)
    : null

  const extractBusy   = ["reading","analysing","filling"].includes(extractStep)
  const stepLabel: Record<ExtractStep,string> = {
    idle:"",reading:"Reading PDF…",analysing:"Analysing with AI…",
    filling:"Filling fields…",done:"Fields filled ✓",error:"",
  }
  const stepPct: Record<ExtractStep,number> = {
    idle:0,reading:30,analysing:65,filling:90,done:100,error:0,
  }

  return (
    <div className="fixed inset-0 z-50 flex items-stretch" style={{background:"rgba(0,0,0,0.55)"}}>
      <div
        className="relative flex flex-col w-full max-w-6xl mx-auto my-4 rounded-[var(--radius-xl)] overflow-hidden shadow-2xl"
        style={{background:"var(--surface-base)"}}
      >
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0"
          style={{borderColor:"var(--surface-border)"}}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-[var(--radius-md)] flex items-center justify-center"
              style={{background:"#EEF1F8"}}>
              <Receipt size={16} style={{color:"#1B2A5E"}} />
            </div>
            <div>
              <h2 className="text-[15px] font-bold" style={{color:"var(--text-primary)"}}>
                {isEdit ? "Edit Invoice" : "New Invoice"}
              </h2>
              <p className="text-xs" style={{color:"var(--text-muted)"}}>
                {isEdit ? "Update invoice details" : "Upload PDF — AI fills all fields automatically"}
              </p>
            </div>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full transition-colors hover:bg-[#F1F3F7]"
            style={{color:"var(--text-muted)"}}>
            <X size={16}/>
          </button>
        </div>

        {/* ── Body: two columns ──────────────────────────────────────────── */}
        <div className="flex flex-1 overflow-hidden">

          {/* ── LEFT: Documents panel ────────────────────────────────────── */}
          <div className="w-[42%] flex-shrink-0 flex flex-col border-r overflow-hidden"
            style={{borderColor:"var(--surface-border)",background:"var(--surface-subtle)"}}>

            {/* ── Invoice Receipt (top, mandatory) ─────────────────────────── */}
            <div className="flex flex-col flex-1 overflow-hidden border-b" style={{borderColor:"var(--surface-border)"}}>
              {/* Label */}
              <div className="flex items-center gap-2 px-3 pt-3 pb-2 flex-shrink-0">
                <FilePdf size={14} style={{color:"#1B2A5E"}}/>
                <span className="text-xs font-bold" style={{color:"var(--text-primary)"}}>Invoice Receipt</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{background:"#FFF0F0",color:"#DC2626"}}>Required</span>
                {pdfPreviewUrl && (
                  <div className="ml-auto flex items-center gap-1">
                    <button onClick={()=>pdfInputRef.current?.click()}
                      className="text-[10px] font-medium px-2 py-0.5 rounded hover:bg-[#EEF1F8]"
                      style={{color:"var(--text-muted)"}}>Change</button>
                    <button onClick={()=>{setPdfFile(null);setPdfPreviewUrl(null);setExtractStep("idle");setAiInvoices([])}}
                      className="w-5 h-5 flex items-center justify-center rounded hover:bg-[#FFF0F0]"
                      style={{color:"#DC2626"}}><X size={11}/></button>
                  </div>
                )}
              </div>

              {/* Preview or drop zone */}
              <div className="flex-1 overflow-hidden relative mx-3 mb-2 rounded-[var(--radius-lg)]"
                style={{minHeight:0}}>
                {pdfPreviewUrl ? (
                  <iframe src={pdfPreviewUrl} className="w-full h-full border-0 rounded-[var(--radius-lg)]"
                    title="Invoice PDF"/>
                ) : (
                  <div
                    className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-[var(--radius-lg)] border-2 border-dashed transition-all cursor-pointer"
                    style={{borderColor:dragging?"#1B2A5E":"#CBD5E1",background:dragging?"#EEF1F8":"var(--surface-base)"}}
                    onClick={()=>pdfInputRef.current?.click()}
                    onDragOver={e=>{e.preventDefault();setDragging(true)}}
                    onDragLeave={()=>setDragging(false)}
                    onDrop={handleDrop}
                  >
                    <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{background:"#EEF1F8"}}>
                      <FilePdf size={24} style={{color:"#1B2A5E"}}/>
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-semibold" style={{color:"var(--text-primary)"}}>Drop PDF here or click to browse</p>
                      <p className="text-[10px] mt-0.5" style={{color:"var(--text-muted)"}}>PDF only · max 20 MB</p>
                    </div>
                    <button type="button"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-md)] text-xs font-semibold"
                      style={{background:"#1B2A5E",color:"#fff"}}>
                      <UploadSimple size={12}/> Browse PDF
                    </button>
                  </div>
                )}
              </div>

              {/* AI status — shows automatically after upload */}
              {pdfFile && (
                <div className="px-3 pb-2 flex-shrink-0">
                  {extractBusy ? (
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-2">
                        <Sparkle size={12} weight="fill" style={{color:"#7C3AED",flexShrink:0}}/>
                        <span className="text-[11px] font-medium flex-1" style={{color:"#7C3AED"}}>{stepLabel[extractStep]}</span>
                        <span className="text-[11px]" style={{color:"var(--text-disabled)"}}>{stepPct[extractStep]}%</span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{background:"#EDE9FE"}}>
                        <div className="h-full rounded-full transition-all duration-700"
                          style={{width:`${stepPct[extractStep]}%`,background:"#7C3AED"}}/>
                      </div>
                    </div>
                  ) : extractStep === "done" ? (
                    <div className="flex items-center gap-2 py-1.5 px-2.5 rounded-[var(--radius-md)] text-xs font-semibold"
                      style={{background:"#ECFDF5",color:"#059669",border:"1px solid #A7F3D0"}}>
                      <Check size={12}/> AI extraction complete
                      <button onClick={()=>handleExtract()}
                        className="ml-auto text-[10px] underline opacity-60 hover:opacity-100">Re-run</button>
                    </div>
                  ) : extractStep === "error" ? (
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-start gap-1.5 p-2 rounded text-[11px]"
                        style={{background:"#FFF0F0",color:"#DC2626"}}>
                        <Warning size={11} className="flex-shrink-0 mt-0.5"/> {extractError}
                      </div>
                      <button onClick={()=>handleExtract()}
                        className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-[var(--radius-md)] text-[11px] font-semibold border transition-all hover:bg-[#FFF0F0]"
                        style={{borderColor:"#FECACA",color:"#DC2626"}}>
                        Retry AI Extraction
                      </button>
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            {/* ── Bank Statement (bottom, mandatory) ───────────────────────── */}
            <div className="flex flex-col flex-shrink-0" style={{height:"38%",minHeight:"160px"}}>
              {/* Label */}
              <div className="flex items-center gap-2 px-3 pt-3 pb-2">
                <Bank size={14} style={{color:"#059669"}}/>
                <span className="text-xs font-bold" style={{color:"var(--text-primary)"}}>Bank Statement</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{background:"#FFF0F0",color:"#DC2626"}}>Required</span>
                {bankPreviewUrl && (
                  <div className="ml-auto flex items-center gap-1">
                    <a href={bankPreviewUrl} target="_blank" rel="noreferrer"
                      className="text-[10px] font-medium px-2 py-0.5 rounded hover:bg-[#ECFDF5]"
                      style={{color:"#059669"}}>Preview</a>
                    <button onClick={()=>{setBankFile(null);setBankPreviewUrl(null)}}
                      className="w-5 h-5 flex items-center justify-center rounded hover:bg-[#FFF0F0]"
                      style={{color:"#DC2626"}}><X size={11}/></button>
                  </div>
                )}
              </div>

              {/* Preview or drop zone */}
              <div className="flex-1 overflow-hidden mx-3 mb-3">
                {bankPreviewUrl ? (
                  <div className="h-full flex flex-col items-center justify-center gap-2 rounded-[var(--radius-lg)] border"
                    style={{background:"var(--surface-base)",borderColor:"#A7F3D0"}}>
                    <Bank size={20} style={{color:"#059669"}}/>
                    <p className="text-xs font-medium truncate max-w-[90%]" style={{color:"var(--text-secondary)"}}>
                      {bankFile?.name ?? "Bank Statement uploaded"}
                    </p>
                    <button onClick={()=>bankInputRef.current?.click()}
                      className="text-[11px] font-medium px-2.5 py-1 rounded-[var(--radius-md)]"
                      style={{background:"#ECFDF5",color:"#059669"}}>Change file</button>
                  </div>
                ) : (
                  <div
                    className="h-full flex flex-col items-center justify-center gap-2 rounded-[var(--radius-lg)] border-2 border-dashed cursor-pointer transition-all hover:border-[#059669] hover:bg-[#ECFDF5]"
                    style={{borderColor:"#CBD5E1",background:"var(--surface-base)"}}
                    onClick={()=>bankInputRef.current?.click()}
                  >
                    <Bank size={20} style={{color:"#059669"}}/>
                    <div className="text-center">
                      <p className="text-xs font-semibold" style={{color:"var(--text-primary)"}}>Upload bank statement</p>
                      <p className="text-[10px] mt-0.5" style={{color:"var(--text-muted)"}}>PDF, PNG, JPG accepted</p>
                    </div>
                    <button type="button"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-md)] text-xs font-semibold"
                      style={{background:"#059669",color:"#fff"}}>
                      <UploadSimple size={12}/> Browse
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Hidden file inputs */}
            <input ref={pdfInputRef} type="file" accept=".pdf,application/pdf"
              className="hidden" onChange={e=>{const f=e.target.files?.[0];if(f)handlePdfSelect(f);e.target.value=""}}/>
            <input ref={bankInputRef} type="file" accept=".pdf,.png,.jpg,.jpeg,image/*"
              className="hidden" onChange={e=>{const f=e.target.files?.[0];if(f)handleBankSelect(f);e.target.value=""}}/>
          </div>

          {/* ── RIGHT: Form panel ─────────────────────────────────────────── */}
          <div className="flex-1 flex flex-col overflow-hidden">

            {/* Multi-invoice tabs */}
            {isMulti && (
              <div className="flex items-center gap-0 border-b px-4 overflow-x-auto flex-shrink-0"
                style={{borderColor:"var(--surface-border)",background:"var(--surface-subtle)"}}>
                <span className="text-[10px] font-bold uppercase tracking-wider mr-3 flex-shrink-0"
                  style={{color:"var(--text-muted)"}}>
                  {aiInvoices.length} invoices found
                </span>
                {aiInvoices.map((_,i)=>(
                  <button key={i}
                    onClick={()=>setActiveFormIdx(i)}
                    className="relative flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 flex-shrink-0 transition-colors"
                    style={{
                      borderColor: activeFormIdx===i?"#1B2A5E":"transparent",
                      color:       activeFormIdx===i?"#1B2A5E":"var(--text-muted)",
                    }}>
                    <span className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${selectedIdxs.has(i)?"border-[#1B2A5E] bg-[#1B2A5E]":"border-[var(--surface-border)]"}`}
                      onClick={e=>{e.stopPropagation();setSelectedIdxs(prev=>{const n=new Set(prev);n.has(i)?n.delete(i):n.add(i);return n})}}>
                      {selectedIdxs.has(i)&&<Check size={9} color="#fff"/>}
                    </span>
                    INV {i+1}
                  </button>
                ))}
                <button
                  className="ml-auto text-[10px] font-medium px-2 py-1 flex-shrink-0"
                  style={{color:"var(--text-muted)"}}
                  onClick={()=>setSelectedIdxs(
                    selectedIdxs.size===aiInvoices.length ? new Set() : new Set(aiInvoices.map((_,i)=>i))
                  )}>
                  {selectedIdxs.size===aiInvoices.length?"Deselect all":"Select all"}
                </button>
              </div>
            )}

            {/* Scrollable form */}
            <div className="flex-1 overflow-y-auto p-5">
              <div className="flex flex-col gap-4 max-w-xl">

                {formError&&(
                  <div className="flex items-start gap-2 p-3 rounded-[var(--radius-md)] text-sm"
                    style={{background:"#FFF0F0",color:"#DC2626",border:"1px solid #FECACA"}}>
                    <Warning size={15} className="flex-shrink-0 mt-0.5"/> {formError}
                  </div>
                )}

                {/* Name */}
                <Input label="Invoice / Expense Name *" value={form.name}
                  onChange={e=>setForm(activeFormIdx,{name:e.target.value})}
                  placeholder="e.g. Shell Fuel, Office Supplies, OIFC Materials"/>

                {/* Paid By + Status */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider" style={{color:"var(--text-muted)"}}>
                      Paid By
                    </label>
                    <select value={form.paid_by} onChange={e=>setForm(activeFormIdx,{paid_by:e.target.value})}
                      className="h-10 px-3 text-sm rounded-[var(--radius-md)] border"
                      style={{background:"var(--surface-base)",borderColor:"var(--surface-border)",color:"var(--text-primary)",outline:"none"}}>
                      {PAID_BY_OPTIONS.map(o=><option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider" style={{color:"var(--text-muted)"}}>Status</label>
                    <div className="flex gap-2 h-10 items-center">
                      {(["paid","unpaid"] as const).map(s=>(
                        <button key={s} type="button"
                          onClick={()=>setForm(activeFormIdx,{status:s})}
                          className="flex-1 h-9 rounded-[var(--radius-md)] text-xs font-semibold border transition-all capitalize"
                          style={{
                            background:  form.status===s?(s==="paid"?"#059669":"#DC2626"):"var(--surface-base)",
                            borderColor: form.status===s?(s==="paid"?"#059669":"#DC2626"):"var(--surface-border)",
                            color:       form.status===s?"#fff":"var(--text-muted)",
                          }}>{s}</button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Bill # + Date */}
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Bill / Invoice Number"
                    value={form.bill_number}
                    onChange={e=>setForm(activeFormIdx,{bill_number:e.target.value})}
                    placeholder="INV-0001"/>
                  <Input label="Date" type="date"
                    value={form.transaction_date}
                    onChange={e=>setForm(activeFormIdx,{transaction_date:e.target.value})}/>
                </div>

                {/* Currency + Amount + Exchange Rate */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider" style={{color:"var(--text-muted)"}}>Currency</label>
                    <select value={form.currency} onChange={e=>setForm(activeFormIdx,{currency:e.target.value})}
                      className="h-10 px-3 text-sm rounded-[var(--radius-md)] border"
                      style={{background:"var(--surface-base)",borderColor:"var(--surface-border)",color:"var(--text-primary)",outline:"none"}}>
                      {CURRENCIES.map(c=><option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider" style={{color:"var(--text-muted)"}}>Amount</label>
                    <input type="number" step="0.001" min="0"
                      value={form.amount}
                      onChange={e=>setForm(activeFormIdx,{amount:e.target.value})}
                      placeholder="0.000"
                      className="h-10 px-3 text-sm rounded-[var(--radius-md)] border"
                      style={{background:"var(--surface-base)",borderColor:"var(--surface-border)",color:"var(--text-primary)",outline:"none"}}/>
                  </div>
                  {form.currency!=="OMR"&&(
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wider" style={{color:"var(--text-muted)"}}>Rate→OMR</label>
                      <input type="number" step="0.0001" min="0"
                        value={form.exchange_rate}
                        onChange={e=>setForm(activeFormIdx,{exchange_rate:e.target.value})}
                        placeholder={String(CURRENCY_RATES[form.currency]??"")}
                        className="h-10 px-3 text-sm rounded-[var(--radius-md)] border"
                        style={{background:"var(--surface-base)",borderColor:"var(--surface-border)",color:"var(--text-primary)",outline:"none"}}/>
                    </div>
                  )}
                </div>

                {/* OMR equivalent */}
                {omrEq&&(
                  <div className="flex items-center gap-2 px-3 py-2 rounded-[var(--radius-md)] text-xs font-semibold"
                    style={{background:"#EFF4FF",color:"#2563EB",border:"1px solid #BFDBFE"}}>
                    💱 ≈ OMR {omrEq}
                    <span className="font-normal opacity-70">
                      (rate: {form.exchange_rate||CURRENCY_RATES[form.currency]||"?"} per {form.currency})
                    </span>
                  </div>
                )}

                {/* Cost center */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider" style={{color:"var(--text-muted)"}}>Cost Center</label>
                  <select value={form.cost_center} onChange={e=>setForm(activeFormIdx,{cost_center:e.target.value})}
                    className="h-10 px-3 text-sm rounded-[var(--radius-md)] border"
                    style={{background:"var(--surface-base)",borderColor:"var(--surface-border)",color:"var(--text-primary)",outline:"none"}}>
                    <option value="">— Select cost center —</option>
                    {costCenters.map(cc=><option key={cc.id} value={cc.name}>{cc.name}</option>)}
                  </select>
                </div>

                {/* Description */}
                <Textarea label="Description" value={form.description}
                  onChange={e=>setForm(activeFormIdx,{description:e.target.value})}
                  placeholder="What was this expense for?" rows={2}/>
              </div>
            </div>

            {/* ── Footer ───────────────────────────────────────────────────── */}
            <div className="flex items-center justify-between gap-3 px-5 py-3 border-t flex-shrink-0"
              style={{borderColor:"var(--surface-border)",background:"var(--surface-subtle)"}}>
              <div className="text-xs" style={{color:"var(--text-muted)"}}>
                {isMulti&&`${selectedIdxs.size} of ${aiInvoices.length} selected`}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm" onClick={onClose} disabled={submitting}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" loading={submitting} onClick={handleSave}>
                  {submitting
                    ? "Saving…"
                    : isMulti
                      ? `Save ${selectedIdxs.size} Invoice${selectedIdxs.size!==1?"s":""}`
                      : isEdit ? "Update Invoice" : "Save Invoice"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
//  PAGE
// ═════════════════════════════════════════════════════════════════════════════
function Skeleton({h=20}:{h?:number}) {
  return <div className="animate-pulse rounded" style={{height:h,background:"var(--surface-muted)"}}/>
}

export default function MyInvoicesPage() {
  const {user}  = useAuth()
  const isManager = ["admin","hr","finance","md","cto","coo"].includes(user?.role??"")

  const [invoices,    setInvoices]    = React.useState<Invoice[]>([])
  const [costCenters, setCostCenters] = React.useState<CostCenter[]>([])
  const [loading,     setLoading]     = React.useState(true)
  const [search,      setSearch]      = React.useState("")
  const [filterTab,   setFilterTab]   = React.useState<FilterTab>("all")
  const [filterMonth, setFilterMonth] = React.useState("")
  const [sortDesc,    setSortDesc]    = React.useState(true)
  const [modal,       setModal]       = React.useState(false)
  const [editing,     setEditing]     = React.useState<Invoice|null>(null)
  const [deleting,    setDeleting]    = React.useState<Invoice|null>(null)
  const [delBusy,     setDelBusy]     = React.useState(false)
  const [previewUrl,  setPreviewUrl]  = React.useState<string|null>(null)

  const load = React.useCallback(async()=>{
    setLoading(true)
    try {
      const [invR,ccR]=await Promise.allSettled([
        apiFetch<{invoices:Invoice[]}>("/api/invoices"),
        apiFetch<{cost_centers:CostCenter[]}>("/api/cost-centers"),
      ])
      if(invR.status==="fulfilled") setInvoices(invR.value.invoices??[])
      if(ccR.status==="fulfilled")  setCostCenters(ccR.value.cost_centers??[])
    } finally { setLoading(false) }
  },[])

  React.useEffect(()=>{load()},[load])

  const myInvoices=React.useMemo(()=>
    isManager?invoices:invoices.filter(i=>i.user_id===user?.id)
  ,[invoices,isManager,user?.id])

  const stats=React.useMemo(()=>{
    const paid  =myInvoices.filter(i=>i.status==="paid")
    const unpaid=myInvoices.filter(i=>i.status==="unpaid")
    const totalOMR=myInvoices.reduce((s,i)=>{
      const amt=i.amount??0,cur=i.currency??"OMR"
      return s+(cur==="OMR"?amt:amt*(CURRENCY_RATES[cur]??1))
    },0)
    return{total:myInvoices.length,paid:paid.length,unpaid:unpaid.length,totalOMR}
  },[myInvoices])

  const filtered=React.useMemo(()=>
    myInvoices
      .filter(i=>filterTab==="all"||i.status===filterTab)
      .filter(i=>!filterMonth||(i.transaction_date??i.created_at??"").startsWith(filterMonth))
      .filter(i=>{
        if(!search) return true
        const q=search.toLowerCase()
        return(
          (i.name??"").toLowerCase().includes(q)||
          (i.bill_number??"").toLowerCase().includes(q)||
          (i.description??"").toLowerCase().includes(q)||
          (i.cost_center??"").toLowerCase().includes(q)
        )
      })
      .sort((a,b)=>{
        const da=new Date(a.created_at??0).getTime()
        const db=new Date(b.created_at??0).getTime()
        return sortDesc?db-da:da-db
      })
  ,[myInvoices,filterTab,filterMonth,search,sortDesc])

  async function handleDelete(){
    if(!deleting) return
    setDelBusy(true)
    try {
      await apiFetch(`/api/invoices/${deleting.id}`,{method:"DELETE"})
      setInvoices(prev=>prev.filter(i=>i.id!==deleting.id))
      toast.success("Invoice deleted"); setDeleting(null)
    } catch(e:unknown){
      toast.error(e instanceof Error?e.message:"Delete failed")
    } finally { setDelBusy(false) }
  }

  function onSaved(inv:Invoice){
    setInvoices(prev=>{
      const idx=prev.findIndex(i=>i.id===inv.id)
      if(idx>=0){const n=[...prev];n[idx]=inv;return n}
      return[inv,...prev]
    })
  }

  const months=React.useMemo(()=>{
    const s=new Set<string>()
    myInvoices.forEach(i=>{
      const d=i.transaction_date??i.created_at??""
      const m=d.slice(0,7)
      if(m) s.add(m)
    })
    return Array.from(s).sort().reverse()
  },[myInvoices])

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <PageHeader title="My Invoices" subtitle="Upload receipts — AI extracts all fields automatically"/>
        <Button variant="primary" size="md" onClick={()=>{setEditing(null);setModal(true)}}>
          <Plus size={16}/> New Invoice
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {label:"Total Invoices",value:stats.total,              color:"#1B2A5E",bg:"#EEF1F8",icon:FileText},
          {label:"Paid",          value:stats.paid,               color:"#059669",bg:"#ECFDF5",icon:CheckCircle},
          {label:"Unpaid",        value:stats.unpaid,             color:"#DC2626",bg:"#FFF0F0",icon:Clock},
          {label:"Total (OMR)",   value:`${stats.totalOMR.toFixed(3)}`,color:"#D97706",bg:"#FFF8E6",icon:CurrencyDollar,text:true},
        ].map(s=>(
          <div key={s.label} className="flex items-center gap-3 p-4 rounded-[var(--radius-lg)] border"
            style={{background:s.bg,borderColor:`${s.color}25`}}>
            <div className="w-10 h-10 rounded-[var(--radius-md)] flex items-center justify-center flex-shrink-0"
              style={{background:`${s.color}20`}}>
              <s.icon size={20} style={{color:s.color}}/>
            </div>
            <div>
              <p className="text-xl font-bold leading-none" style={{color:s.color}}>
                {s.text?s.value:Number(s.value)}
              </p>
              <p className="text-xs mt-0.5 font-medium" style={{color:s.color,opacity:0.7}}>{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center rounded-[var(--radius-md)] border p-0.5 gap-0.5"
          style={{background:"var(--surface-subtle)",borderColor:"var(--surface-border)"}}>
          {(["all","paid","unpaid"] as FilterTab[]).map(t=>(
            <button key={t} onClick={()=>setFilterTab(t)}
              className="px-3 py-1.5 rounded-[var(--radius-md)] text-xs font-semibold capitalize transition-all"
              style={{
                background:filterTab===t?"#1B2A5E":"transparent",
                color:     filterTab===t?"#fff":"var(--text-muted)",
                boxShadow: filterTab===t?"0 1px 3px rgba(0,0,0,.12)":"none",
              }}>
              {t} {t!=="all"&&<span className="ml-1 opacity-70">({t==="paid"?stats.paid:stats.unpaid})</span>}
            </button>
          ))}
        </div>
        <select value={filterMonth} onChange={e=>setFilterMonth(e.target.value)}
          className="h-8 px-2 text-xs rounded-[var(--radius-md)] border"
          style={{background:"var(--surface-base)",borderColor:"var(--surface-border)",color:"var(--text-secondary)",outline:"none"}}>
          <option value="">All months</option>
          {months.map(m=><option key={m} value={m}>{m}</option>)}
        </select>
        <div className="relative flex-1 min-w-[180px]">
          <MagnifyingGlass size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{color:"var(--text-muted)"}}/>
          <input type="text" value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="Search invoices…"
            className="w-full h-8 pl-7 pr-2 text-xs rounded-[var(--radius-md)] border"
            style={{background:"var(--surface-base)",borderColor:"var(--surface-border)",color:"var(--text-primary)",outline:"none"}}/>
        </div>
        <button onClick={()=>setSortDesc(d=>!d)}
          className="flex items-center gap-1 h-8 px-2.5 rounded-[var(--radius-md)] border text-xs font-medium transition-colors hover:bg-[#F1F3F7]"
          style={{borderColor:"var(--surface-border)",color:"var(--text-secondary)"}}>
          <ArrowsDownUp size={12}/> {sortDesc?"Newest":"Oldest"}
        </button>
      </div>

      {/* Invoice list */}
      {loading?(
        <div className="flex flex-col gap-3">
          {Array.from({length:5}).map((_,i)=><Skeleton key={i} h={76}/>)}
        </div>
      ):filtered.length===0?(
        <div className="flex flex-col items-center gap-3 py-16 rounded-[var(--radius-xl)] border border-dashed"
          style={{borderColor:"var(--surface-border)"}}>
          <Receipt size={32} style={{color:"var(--text-disabled)"}}/>
          <p className="text-sm font-medium" style={{color:"var(--text-muted)"}}>
            {search||filterTab!=="all"||filterMonth
              ?"No invoices match your filters"
              :"No invoices yet — upload your first receipt"}
          </p>
          {!search&&filterTab==="all"&&!filterMonth&&(
            <Button variant="primary" size="sm" onClick={()=>{setEditing(null);setModal(true)}}>
              <Plus size={13}/> New Invoice
            </Button>
          )}
        </div>
      ):(
        <div className="flex flex-col gap-2">
          {filtered.map(inv=>{
            const isPaid=inv.status==="paid"
            const omrAmt=inv.currency&&inv.currency!=="OMR"&&inv.amount
              ?`≈ OMR ${toOMR(inv.amount,inv.currency)}`
              :null
            const hasFile=(inv as Record<string,unknown>).invoice_receipt_path

            return(
              <div key={inv.id}
                className="group flex items-center gap-4 px-4 py-3 rounded-[var(--radius-lg)] border transition-all hover:shadow-sm"
                style={{background:"var(--surface-base)",borderColor:"var(--surface-border)",borderLeft:`3px solid ${isPaid?"#059669":"#DC2626"}`}}>
                <div className="w-9 h-9 rounded-[var(--radius-md)] flex items-center justify-center flex-shrink-0"
                  style={{background:"#EEF1F8"}}>
                  <Receipt size={18} style={{color:"#1B2A5E"}}/>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold truncate" style={{color:"var(--text-primary)"}}>{inv.name}</p>
                    {inv.bill_number&&(
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                        style={{background:"var(--surface-muted)",color:"var(--text-disabled)"}}>
                        #{inv.bill_number}
                      </span>
                    )}
                    {hasFile&&(
                      <span className="flex items-center gap-0.5 text-[10px]" style={{color:"#7C3AED"}}>
                        <FilePdf size={10}/> PDF
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {inv.transaction_date&&<span className="text-xs" style={{color:"var(--text-muted)"}}>{formatDate(inv.transaction_date)}</span>}
                    {inv.cost_center&&<span className="text-xs" style={{color:"var(--text-disabled)"}}>· {inv.cost_center}</span>}
                    {inv.paid_by&&<span className="text-xs" style={{color:"var(--text-disabled)"}}>· {inv.paid_by}</span>}
                  </div>
                </div>
                <div className="flex flex-col items-end flex-shrink-0 gap-1">
                  <p className="text-sm font-bold" style={{color:"var(--text-primary)"}}>{fmtAmt(inv.amount,inv.currency??"OMR")}</p>
                  {omrAmt&&<p className="text-[10px]" style={{color:"var(--text-muted)"}}>{omrAmt}</p>}
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                    style={{background:isPaid?"#ECFDF5":"#FFF0F0",color:isPaid?"#059669":"#DC2626"}}>
                    {isPaid?"✓ Paid":"⏳ Unpaid"}
                  </span>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  {hasFile&&(
                    <button
                      onClick={()=>setPreviewUrl((inv as Record<string,unknown>).invoice_receipt_path as string)}
                      className="w-7 h-7 flex items-center justify-center rounded-[var(--radius-md)] transition-colors hover:bg-[#F5F3FF]"
                      style={{color:"#7C3AED"}} title="View PDF">
                      <Eye size={13}/>
                    </button>
                  )}
                  <button onClick={()=>{setEditing(inv);setModal(true)}}
                    className="w-7 h-7 flex items-center justify-center rounded-[var(--radius-md)] transition-colors hover:bg-[#EEF1F8]"
                    style={{color:"#1B2A5E"}} title="Edit">
                    <Pencil size={13}/>
                  </button>
                  <button onClick={()=>setDeleting(inv)}
                    className="w-7 h-7 flex items-center justify-center rounded-[var(--radius-md)] transition-colors hover:bg-[#FFF0F0]"
                    style={{color:"#DC2626"}} title="Delete">
                    <Trash size={13}/>
                  </button>
                </div>
              </div>
            )
          })}
          <p className="text-xs text-center py-2" style={{color:"var(--text-disabled)"}}>
            Showing {filtered.length} of {myInvoices.length} invoice{myInvoices.length!==1?"s":""}
          </p>
        </div>
      )}

      {/* Invoice upload modal */}
      <InvoiceUploadModal
        open={modal}
        editing={editing}
        costCenters={costCenters}
        onClose={()=>{setModal(false);setEditing(null)}}
        onSaved={onSaved}
      />

      {/* PDF preview overlay */}
      {previewUrl&&(
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{background:"rgba(0,0,0,0.7)"}}>
          <div className="relative w-[90vw] max-w-4xl h-[90vh] bg-white rounded-[var(--radius-xl)] overflow-hidden shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b" style={{borderColor:"var(--surface-border)"}}>
              <span className="text-sm font-semibold" style={{color:"var(--text-primary)"}}>Invoice PDF</span>
              <div className="flex items-center gap-2">
                <a href={previewUrl} download className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-[var(--radius-md)]"
                  style={{background:"#EEF1F8",color:"#1B2A5E"}}>
                  <Download size={12}/> Download
                </a>
                <button onClick={()=>setPreviewUrl(null)}
                  className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-[#F1F3F7]"
                  style={{color:"var(--text-muted)"}}>
                  <X size={15}/>
                </button>
              </div>
            </div>
            <iframe src={previewUrl} className="flex-1 w-full border-0" title="Invoice PDF"/>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deleting&&(
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{background:"rgba(0,0,0,0.5)"}}>
          <div className="w-full max-w-sm mx-4 p-6 rounded-[var(--radius-xl)] shadow-2xl"
            style={{background:"var(--surface-base)"}}>
            <h3 className="text-base font-bold mb-1" style={{color:"var(--text-primary)"}}>Delete Invoice</h3>
            <p className="text-sm mb-5" style={{color:"var(--text-muted)"}}>
              Delete &quot;{deleting.name}&quot;? This cannot be undone.
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="secondary" size="sm" onClick={()=>setDeleting(null)} disabled={delBusy}>Cancel</Button>
              <Button size="sm" loading={delBusy} onClick={handleDelete}
                style={{background:"#DC2626",color:"#fff",border:"none"}}>Delete</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
