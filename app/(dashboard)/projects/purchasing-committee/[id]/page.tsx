"use client"

import * as React from "react"
import Link from "next/link"
import { use } from "react"
import {
  ArrowLeft, Warning, FileArrowDown, ArrowRight,
  CheckCircle, XCircle, Clock, Gavel, Users,
} from "@phosphor-icons/react"
import { toast }             from "sonner"
import { PageHeader }        from "@/components/ui/page-header"
import { Button }            from "@/components/ui/button"
import { Modal }             from "@/components/ui/modal"
import { Textarea }          from "@/components/ui/input"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { EmptyState }        from "@/components/ui/empty-state"
import { apiFetch }          from "@/lib/api"
import { formatDate, formatCurrency } from "@/lib/utils"
import { useAuth }           from "@/contexts/AuthContext"
import type { PCEntry, PCReviewer, PCReview, PCFinalReview } from "@/lib/types"

// ── Constants ─────────────────────────────────────────────────────────────────
const ADMIN_ROLES = ["admin","md","ceo","cto","coo","super_admin","tender_icv_manager"]

const REVIEWER_ROLE_LABELS: Record<string, string> = {
  tender_icv_manager: "Tender & ICV Manager",
  cto:     "CTO",
  hr:      "HR",
  finance: "Finance",
  coo:     "COO",
}

const STATUS_COLORS: Record<string, { bg: string; color: string; label: string }> = {
  pending_review:   { bg:"#F3F4F6", color:"#6B7280", label:"Pending Review" },
  under_review:     { bg:"#EFF6FF", color:"#2563EB", label:"Under Review" },
  review_completed: { bg:"#EEF2FF", color:"#4F46E5", label:"Review Completed" },
  pending_final:    { bg:"#FFF8E6", color:"#D97706", label:"Pending Final" },
  approved:         { bg:"#ECFDF5", color:"#059669", label:"Approved" },
  rejected:         { bg:"#FFF0F0", color:"#DC2626", label:"Rejected" },
}

const DECISION_STYLES: Record<string, { bg: string; color: string; icon: React.ReactNode; label: string }> = {
  pending:  { bg:"#F3F4F6", color:"#6B7280", icon:<Clock size={13}/>,        label:"Pending" },
  approved: { bg:"#ECFDF5", color:"#059669", icon:<CheckCircle size={13}/>, label:"Approved" },
  rejected: { bg:"#FFF0F0", color:"#DC2626", icon:<XCircle size={13}/>,     label:"Rejected" },
}

// ── Small helpers ─────────────────────────────────────────────────────────────
function PCStatusBadge({ status }: { status: string }) {
  const s = STATUS_COLORS[status] ?? { bg:"#F3F4F6", color:"#6B7280", label: status }
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold"
      style={{ background: s.bg, color: s.color }}>
      {s.label}
    </span>
  )
}

function DecisionBadge({ status }: { status: string }) {
  const d = DECISION_STYLES[status] ?? DECISION_STYLES.pending
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
      style={{ background: d.bg, color: d.color }}>
      {d.icon} {d.label}
    </span>
  )
}

function AvatarCircle({ name }: { name: string | null | undefined }) {
  const letter = (name ?? "?")[0].toUpperCase()
  return (
    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
      style={{ background:"#1B2A5E" }}>
      {letter}
    </div>
  )
}

// ── Review Modal (reviewer submits decision) ───────────────────────────────────
function ReviewModal({
  open, entryId, entryName, reviewerRole, onClose, onSubmitted,
}: {
  open: boolean; entryId: string; entryName: string; reviewerRole: string
  onClose: () => void; onSubmitted: () => void
}) {
  const [decision, setDecision] = React.useState<"approved"|"rejected"|"">("")
  const [comment,  setComment]  = React.useState("")
  const [saving,   setSaving]   = React.useState(false)
  const [error,    setError]    = React.useState<string|null>(null)

  React.useEffect(() => {
    if (open) { setDecision(""); setComment(""); setError(null) }
  }, [open])

  async function submit() {
    if (!decision) { setError("Please select Approve or Reject"); return }
    setSaving(true); setError(null)
    try {
      const r = await apiFetch<{ all_reviews_completed: boolean }>(`/api/purchasing-committee/${entryId}/review`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: decision, comment: comment || undefined }),
      })
      toast.success(
        r.all_reviews_completed
          ? "Decision recorded — all reviews complete! Admin can now assign final review."
          : "Decision recorded successfully."
      )
      onSubmitted()
      onClose()
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed") }
    finally { setSaving(false) }
  }

  return (
    <Modal open={open} onOpenChange={v => !v && onClose()}
      title="Submit Review Decision"
      footer={<>
        <Button variant="secondary" size="sm" onClick={onClose} disabled={saving}>Cancel</Button>
        <Button variant="primary"   size="sm" loading={saving}  onClick={submit}>Submit Decision</Button>
      </>}>
      <div className="flex flex-col gap-4">
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-[var(--radius-md)] text-sm"
            style={{ background:"#FFF0F0", color:"#DC2626", border:"1px solid #FECACA" }}>
            <Warning size={14}/> {error}
          </div>
        )}

        {/* Context */}
        <div className="p-3 rounded-[var(--radius-md)]" style={{ background:"var(--surface-muted)" }}>
          <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color:"var(--text-muted)" }}>Reviewing as</p>
          <p className="text-sm font-bold" style={{ color:"var(--text-primary)" }}>
            {REVIEWER_ROLE_LABELS[reviewerRole] ?? reviewerRole}
          </p>
          <p className="text-xs mt-0.5 truncate" style={{ color:"var(--text-muted)" }}>{entryName}</p>
        </div>

        {/* Decision radios */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold uppercase tracking-wider" style={{ color:"var(--text-muted)" }}>Decision *</label>
          {(["approved","rejected"] as const).map(opt => (
            <label key={opt} className="flex items-center gap-3 p-3 rounded-[var(--radius-md)] border cursor-pointer transition-colors"
              style={{
                borderColor: decision === opt
                  ? (opt === "approved" ? "#059669" : "#DC2626")
                  : "var(--surface-border)",
                background: decision === opt
                  ? (opt === "approved" ? "#ECFDF5" : "#FFF0F0")
                  : "var(--surface-base)",
              }}>
              <input type="radio" name="decision" value={opt}
                checked={decision === opt}
                onChange={() => setDecision(opt)}
                className="accent-current" />
              <span className="text-sm font-semibold capitalize"
                style={{ color: opt === "approved" ? "#059669" : "#DC2626" }}>
                {opt === "approved" ? "✓ Approve" : "✗ Reject"}
              </span>
            </label>
          ))}
        </div>

        <Textarea label="Comment (optional)" value={comment}
          onChange={e => setComment(e.target.value)} rows={3}
          placeholder="Add any notes or reasoning for your decision…" />
      </div>
    </Modal>
  )
}

// ── Final Review Modal (CEO / MD) ─────────────────────────────────────────────
function FinalReviewModal({
  open, entryId, reviewers, reviews, onClose, onSubmitted,
}: {
  open: boolean; entryId: string
  reviewers: PCReviewer[]; reviews: PCReview[]
  onClose: () => void; onSubmitted: () => void
}) {
  const [decision, setDecision] = React.useState<"approved"|"rejected"|"">("")
  const [comment,  setComment]  = React.useState("")
  const [saving,   setSaving]   = React.useState(false)
  const [error,    setError]    = React.useState<string|null>(null)

  React.useEffect(() => {
    if (open) { setDecision(""); setComment(""); setError(null) }
  }, [open])

  function getReview(reviewerId: string) {
    return reviews.find(rv => rv.reviewer_id === reviewerId)
  }

  async function submit() {
    if (!decision) { setError("Please select Approve or Reject"); return }
    setSaving(true); setError(null)
    try {
      const r = await apiFetch<{ entry_status: string | null }>(`/api/purchasing-committee/${entryId}/final-review`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: decision, comment: comment || undefined }),
      })
      const finalStatus = r.entry_status
      toast.success(
        finalStatus
          ? `Decision recorded. Entry is now ${STATUS_COLORS[finalStatus]?.label ?? finalStatus}.`
          : "Decision recorded."
      )
      onSubmitted()
      onClose()
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed") }
    finally { setSaving(false) }
  }

  return (
    <Modal open={open} onOpenChange={v => !v && onClose()}
      title="Submit Final Decision"
      footer={<>
        <Button variant="secondary" size="sm" onClick={onClose} disabled={saving}>Cancel</Button>
        <Button variant="primary"   size="sm" loading={saving}  onClick={submit}>Submit Final Decision</Button>
      </>}>
      <div className="flex flex-col gap-4">
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-[var(--radius-md)] text-sm"
            style={{ background:"#FFF0F0", color:"#DC2626", border:"1px solid #FECACA" }}>
            <Warning size={14}/> {error}
          </div>
        )}

        {/* Previous reviewer decisions */}
        {reviewers.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color:"var(--text-muted)" }}>
              Committee Review Summary
            </p>
            <div className="rounded-[var(--radius-md)] border divide-y overflow-hidden"
              style={{ borderColor:"var(--surface-border)" }}>
              {reviewers.map(rev => {
                const rv = getReview(rev.id)
                return (
                  <div key={rev.id} className="flex items-center gap-3 px-3 py-2.5"
                    style={{ background:"var(--surface-base)" }}>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate" style={{ color:"var(--text-primary)" }}>
                        {REVIEWER_ROLE_LABELS[rev.role] ?? rev.role}
                      </p>
                      <p className="text-xs truncate" style={{ color:"var(--text-muted)" }}>
                        {rev.profiles?.full_name ?? rev.profiles?.email ?? "—"}
                      </p>
                      {rv?.comment && (
                        <p className="text-xs mt-0.5 italic truncate" style={{ color:"var(--text-muted)" }}>
                          "{rv.comment}"
                        </p>
                      )}
                    </div>
                    <DecisionBadge status={rv?.status ?? "pending"} />
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Decision radios */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold uppercase tracking-wider" style={{ color:"var(--text-muted)" }}>Your Final Decision *</label>
          {(["approved","rejected"] as const).map(opt => (
            <label key={opt} className="flex items-center gap-3 p-3 rounded-[var(--radius-md)] border cursor-pointer transition-colors"
              style={{
                borderColor: decision === opt
                  ? (opt === "approved" ? "#059669" : "#DC2626")
                  : "var(--surface-border)",
                background: decision === opt
                  ? (opt === "approved" ? "#ECFDF5" : "#FFF0F0")
                  : "var(--surface-base)",
              }}>
              <input type="radio" name="final-decision" value={opt}
                checked={decision === opt}
                onChange={() => setDecision(opt)}
                className="accent-current" />
              <span className="text-sm font-semibold capitalize"
                style={{ color: opt === "approved" ? "#059669" : "#DC2626" }}>
                {opt === "approved" ? "✓ Approve" : "✗ Reject"}
              </span>
            </label>
          ))}
        </div>

        <Textarea label="Comment (optional)" value={comment}
          onChange={e => setComment(e.target.value)} rows={3}
          placeholder="Add any notes or reasoning for your final decision…" />
      </div>
    </Modal>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
//  PAGE
// ═════════════════════════════════════════════════════════════════════════════
export default function PCEntryDetailPage({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id }   = use(params)
  const { user } = useAuth()
  const isAdmin  = ADMIN_ROLES.includes(user?.role ?? "")

  const [entry,       setEntry]       = React.useState<PCEntry | null>(null)
  const [reviewers,   setReviewers]   = React.useState<PCReviewer[]>([])
  const [reviews,     setReviews]     = React.useState<PCReview[]>([])
  const [finalReview, setFinalReview] = React.useState<PCFinalReview | null>(null)
  const [creator,     setCreator]     = React.useState<{ full_name: string | null; email: string } | null>(null)
  const [loading,     setLoading]     = React.useState(true)
  const [notFound,    setNotFound]    = React.useState(false)

  // Modal state
  const [reviewModal,      setReviewModal]      = React.useState(false)
  const [finalReviewModal, setFinalReviewModal] = React.useState(false)
  const [myReviewerRecord, setMyReviewerRecord] = React.useState<PCReviewer | null>(null)
  const [assigningFinal,   setAssigningFinal]   = React.useState(false)

  const load = React.useCallback(async () => {
    try {
      const r = await apiFetch<{
        entry: PCEntry; reviewers: PCReviewer[]; reviews: PCReview[]
        final_review: PCFinalReview | null
        creator: { full_name: string | null; email: string } | null
      }>(`/api/purchasing-committee/${id}`)
      setEntry(r.entry)
      setReviewers(r.reviewers  ?? [])
      setReviews(r.reviews      ?? [])
      setFinalReview(r.final_review ?? null)
      setCreator(r.creator ?? null)
    } catch (e: unknown) {
      if (e instanceof Error && e.message.includes("404")) setNotFound(true)
      else toast.error("Failed to load entry")
    } finally { setLoading(false) }
  }, [id])

  React.useEffect(() => { load() }, [load])

  // Determine if current user is a reviewer (and which one)
  const myReviewer = React.useMemo(
    () => reviewers.find(r => r.user_id === user?.id) ?? null,
    [reviewers, user?.id]
  )
  const myReview = React.useMemo(
    () => myReviewer ? reviews.find(rv => rv.reviewer_id === myReviewer.id) ?? null : null,
    [myReviewer, reviews]
  )

  // Can I submit final review?
  const isCEO = finalReview?.ceo_user_id === user?.id
  const isMD  = finalReview?.md_user_id  === user?.id
  const myFinalStatus = isCEO ? finalReview?.ceo_status : isMD ? finalReview?.md_status : null

  // Summary counts
  const summary = React.useMemo(() => {
    let approved = 0, rejected = 0, pending = 0
    reviewers.forEach(rev => {
      const rv = reviews.find(r => r.reviewer_id === rev.id)
      if (!rv || rv.status === "pending") pending++
      else if (rv.status === "approved")  approved++
      else                                rejected++
    })
    return { approved, rejected, pending, total: reviewers.length }
  }, [reviewers, reviews])

  // Can admin assign final review?
  const canAssignFinal = isAdmin
    && entry?.status === "review_completed"
    && !finalReview

  async function assignFinal() {
    setAssigningFinal(true)
    try {
      await apiFetch(`/api/purchasing-committee/${id}/assign-final`, { method: "POST" })
      toast.success("Final review assigned to CEO and MD")
      load()
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Failed") }
    finally { setAssigningFinal(false) }
  }

  // ── Loading / Not found ────────────────────────────────────────────────────
  if (loading) return (
    <div className="flex flex-col gap-6">
      <div className="h-10 w-64 rounded animate-pulse" style={{ background:"var(--surface-muted)" }}/>
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 flex flex-col gap-4">
          {[1,2,3].map(i => <div key={i} className="h-40 rounded-[var(--radius-xl)] animate-pulse" style={{ background:"var(--surface-muted)" }}/>)}
        </div>
        <div className="flex flex-col gap-4">
          {[1,2,3].map(i => <div key={i} className="h-32 rounded-[var(--radius-xl)] animate-pulse" style={{ background:"var(--surface-muted)" }}/>)}
        </div>
      </div>
    </div>
  )

  if (notFound || !entry) return (
    <div className="flex flex-col gap-4">
      <Link href="/projects/purchasing-committee"
        className="flex items-center gap-1.5 text-sm hover:underline" style={{ color:"var(--text-muted)" }}>
        <ArrowLeft size={14}/> Back to Purchasing Committee
      </Link>
      <EmptyState icon={<Warning size={32}/>} title="Entry not found" description="This entry doesn't exist or you don't have access." />
    </div>
  )

  // Final banner
  function FinalBanner() {
    if (!finalReview) return null
    const bothDecided = finalReview.ceo_status !== "pending" && finalReview.md_status !== "pending"
    const anyRejected = finalReview.ceo_status === "rejected" || finalReview.md_status === "rejected"
    const bothApproved = finalReview.ceo_status === "approved" && finalReview.md_status === "approved"
    if (!bothDecided) return null
    const { bg, color, label } = anyRejected
      ? { bg:"#FFF0F0", color:"#DC2626", label:"REJECTED" }
      : bothApproved
      ? { bg:"#ECFDF5", color:"#059669", label:"APPROVED" }
      : { bg:"#FFF8E6", color:"#D97706", label:"PENDING" }
    return (
      <div className="flex items-center justify-center gap-2 p-4 rounded-[var(--radius-lg)] font-bold text-lg tracking-widest mb-4"
        style={{ background: bg, color }}>
        {anyRejected ? <XCircle size={24}/> : <CheckCircle size={24}/>}
        FINAL DECISION: {label}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={entry.name}
        breadcrumb={
          <Link href="/projects/purchasing-committee"
            className="flex items-center gap-1.5 text-sm hover:underline" style={{ color:"var(--text-muted)" }}>
            <ArrowLeft size={14}/> Back to Purchasing Committee
          </Link>
        }
        actions={<PCStatusBadge status={entry.status} />}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Main column ─────────────────────────────────────────────────── */}
        <div className="lg:col-span-2 flex flex-col gap-4">

          {/* Card 1: Tender Details */}
          <Card>
            <CardHeader><CardTitle>Tender Details</CardTitle></CardHeader>
            <div className="grid grid-cols-2 gap-x-8 gap-y-4 mb-4">
              {[
                { label:"Tender Number", value: entry.tender_number, mono: true },
                { label:"Price",         value: formatCurrency(entry.price, entry.currency) },
                {
                  label:"Submission Deadline",
                  value: (() => {
                    const daysLeft = Math.ceil((new Date(entry.submission_end_date).getTime() - Date.now()) / 86400000)
                    return (
                      <span>
                        {formatDate(entry.submission_end_date)}
                        {daysLeft > 0 && daysLeft <= 7 && <span className="ml-2 text-xs" style={{ color:"#D97706" }}>({daysLeft}d left)</span>}
                        {daysLeft <= 0 && <span className="ml-2 text-xs" style={{ color:"#DC2626" }}>(Overdue)</span>}
                      </span>
                    )
                  })(),
                  isNode: true,
                },
                { label:"Status", value: <PCStatusBadge status={entry.status}/>, isNode: true },
              ].map((f, i) => (
                <div key={i} className="flex flex-col gap-1">
                  <span className="text-xs font-medium" style={{ color:"var(--text-muted)" }}>{f.label}</span>
                  {f.isNode
                    ? <div>{f.value}</div>
                    : <span className={`text-sm ${f.mono ? "font-mono" : ""}`} style={{ color:"var(--text-primary)" }}>{f.value as string}</span>
                  }
                </div>
              ))}
            </div>
            <div className="pt-4 border-t" style={{ borderColor:"var(--surface-border)" }}>
              <p className="text-xs font-medium mb-1.5" style={{ color:"var(--text-muted)" }}>Description</p>
              <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color:"var(--text-secondary)" }}>
                {entry.description}
              </p>
            </div>
            {entry.document_url && (
              <a href={entry.document_url} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 mt-4 text-sm font-medium hover:opacity-80 transition-opacity"
                style={{ color:"#1B2A5E" }}>
                <FileArrowDown size={15}/> Download Document
              </a>
            )}
          </Card>

          {/* Card 2: Reviewer Decisions */}
          <Card>
            <CardHeader><CardTitle>Reviewer Decisions</CardTitle></CardHeader>
            {reviewers.length === 0 ? (
              <EmptyState icon={<Users size={24}/>} title="No reviewers assigned"
                description="No reviewers have been assigned to this entry." />
            ) : (
              <div className="flex flex-col divide-y" style={{ borderColor:"var(--surface-border)" }}>
                {reviewers.map(rev => {
                  const rv     = reviews.find(r => r.reviewer_id === rev.id)
                  const isMe   = rev.user_id === user?.id
                  const isPending = !rv || rv.status === "pending"
                  return (
                    <div key={rev.id} className="flex items-start gap-3 py-4 first:pt-0 last:pb-0">
                      <AvatarCircle name={rev.profiles?.full_name} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                            style={{ background:"#EEF1F8", color:"#1B2A5E" }}>
                            {REVIEWER_ROLE_LABELS[rev.role] ?? rev.role}
                          </span>
                          <DecisionBadge status={rv?.status ?? "pending"} />
                        </div>
                        <p className="text-sm font-medium" style={{ color:"var(--text-primary)" }}>
                          {rev.profiles?.full_name ?? rev.profiles?.email ?? "—"}
                        </p>
                        {rv?.comment && (
                          <p className="text-xs mt-1 italic" style={{ color:"var(--text-muted)" }}>
                            "{rv.comment}"
                          </p>
                        )}
                        {rv?.reviewed_at && (
                          <p className="text-xs mt-1" style={{ color:"var(--text-disabled)" }}>
                            Reviewed {formatDate(rv.reviewed_at)}
                          </p>
                        )}
                        {isMe && isPending && (
                          <button
                            onClick={() => { setMyReviewerRecord(rev); setReviewModal(true) }}
                            className="mt-2 flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-[var(--radius-md)] transition-colors hover:opacity-80"
                            style={{ background:"#1B2A5E", color:"white" }}>
                            Review Now <ArrowRight size={11}/>
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>

          {/* Card 3: Final Review — only when assigned */}
          {finalReview && (
            <Card>
              <CardHeader><CardTitle>Final Review (CEO &amp; MD)</CardTitle></CardHeader>
              <FinalBanner />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  {
                    label: "CEO Decision",
                    name:   finalReview.ceo_profile?.full_name ?? finalReview.ceo_profile?.email ?? "CEO",
                    status: finalReview.ceo_status,
                    comment: finalReview.ceo_comment,
                    reviewedAt: finalReview.ceo_reviewed_at,
                    isMe: isCEO,
                  },
                  {
                    label: "MD Decision",
                    name:   finalReview.md_profile?.full_name  ?? finalReview.md_profile?.email  ?? "MD",
                    status: finalReview.md_status,
                    comment: finalReview.md_comment,
                    reviewedAt: finalReview.md_reviewed_at,
                    isMe: isMD,
                  },
                ].map(block => (
                  <div key={block.label} className="p-4 rounded-[var(--radius-md)] border"
                    style={{ borderColor:"var(--surface-border)", background:"var(--surface-muted)" }}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold uppercase tracking-wider" style={{ color:"var(--text-muted)" }}>{block.label}</span>
                      <DecisionBadge status={block.status} />
                    </div>
                    <p className="text-sm font-semibold mb-1" style={{ color:"var(--text-primary)" }}>{block.name}</p>
                    {block.comment && (
                      <p className="text-xs italic mb-2" style={{ color:"var(--text-muted)" }}>"{block.comment}"</p>
                    )}
                    {block.reviewedAt && (
                      <p className="text-xs" style={{ color:"var(--text-disabled)" }}>
                        Decided {formatDate(block.reviewedAt)}
                      </p>
                    )}
                    {block.isMe && block.status === "pending" && (
                      <button
                        onClick={() => setFinalReviewModal(true)}
                        className="mt-3 w-full flex items-center justify-center gap-1.5 py-2 rounded-[var(--radius-md)] text-sm font-semibold transition-opacity hover:opacity-80"
                        style={{ background:"#1B2A5E", color:"white" }}>
                        Submit Your Decision <ArrowRight size={13}/>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* ── Sidebar ─────────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-4">

          {/* Admin Actions */}
          {isAdmin && (
            <Card>
              <CardHeader><CardTitle>Admin Actions</CardTitle></CardHeader>
              <div className="flex flex-col gap-3">
                <Button
                  variant="primary" size="sm"
                  disabled={!canAssignFinal || assigningFinal}
                  loading={assigningFinal}
                  onClick={assignFinal}
                  style={{ width:"100%", justifyContent:"center" }}>
                  <Gavel size={14}/> Assign to Final Review
                </Button>
                {!canAssignFinal && (
                  <p className="text-xs" style={{ color:"var(--text-muted)" }}>
                    {finalReview
                      ? "Final review already assigned."
                      : entry.status !== "review_completed"
                      ? `All reviewers must complete before final review. Current status: ${STATUS_COLORS[entry.status]?.label ?? entry.status}.`
                      : ""}
                  </p>
                )}
              </div>
            </Card>
          )}

          {/* Review Summary */}
          <Card>
            <CardHeader><CardTitle>Review Summary</CardTitle></CardHeader>
            <div className="flex flex-col gap-3">
              {[
                { label:"Approved",   value: summary.approved, bg:"#ECFDF5", color:"#059669" },
                { label:"Rejected",   value: summary.rejected, bg:"#FFF0F0", color:"#DC2626" },
                { label:"Pending",    value: summary.pending,  bg:"#F3F4F6", color:"#6B7280" },
                { label:"Total",      value: summary.total,    bg:"#EEF1F8", color:"#1B2A5E" },
              ].map(s => (
                <div key={s.label} className="flex items-center justify-between py-2 border-b last:border-0"
                  style={{ borderColor:"var(--surface-border)" }}>
                  <span className="text-sm" style={{ color:"var(--text-secondary)" }}>{s.label}</span>
                  <span className="text-sm font-bold w-7 h-7 rounded-full flex items-center justify-center"
                    style={{ background: s.bg, color: s.color }}>
                    {s.value}
                  </span>
                </div>
              ))}
            </div>
            {summary.total > 0 && (
              <div className="mt-3 h-2 rounded-full overflow-hidden" style={{ background:"var(--surface-muted)" }}>
                <div className="h-full rounded-full transition-all duration-500"
                  style={{ width:`${(summary.approved / summary.total) * 100}%`, background:"#059669" }}/>
              </div>
            )}
          </Card>

          {/* Entry Info */}
          <Card>
            <CardHeader><CardTitle>Entry Info</CardTitle></CardHeader>
            <div className="flex flex-col gap-3">
              <div>
                <p className="text-xs font-medium mb-0.5" style={{ color:"var(--text-muted)" }}>Created by</p>
                <p className="text-sm" style={{ color:"var(--text-primary)" }}>
                  {creator?.full_name ?? creator?.email ?? "—"}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium mb-0.5" style={{ color:"var(--text-muted)" }}>Created at</p>
                <p className="text-sm" style={{ color:"var(--text-primary)" }}>
                  {formatDate(entry.created_at)}
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* ── Modals ────────────────────────────────────────────────────────── */}
      {myReviewerRecord && (
        <ReviewModal
          open={reviewModal}
          entryId={id}
          entryName={entry.name}
          reviewerRole={myReviewerRecord.role}
          onClose={() => { setReviewModal(false); setMyReviewerRecord(null) }}
          onSubmitted={load}
        />
      )}
      <FinalReviewModal
        open={finalReviewModal}
        entryId={id}
        reviewers={reviewers}
        reviews={reviews}
        onClose={() => setFinalReviewModal(false)}
        onSubmitted={load}
      />
    </div>
  )
}
