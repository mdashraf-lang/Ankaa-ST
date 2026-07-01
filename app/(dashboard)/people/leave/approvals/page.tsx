"use client"

import * as React from "react"
import { CheckCircle, XCircle, Umbrella, ClockCountdown, CaretDown, CaretUp } from "@phosphor-icons/react"
import { toast } from "sonner"
import { PageHeader } from "@/components/ui/page-header"
import { Modal } from "@/components/ui/modal"
import { Textarea } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar } from "@/components/ui/avatar"
import { formatDate } from "@/lib/utils"
import { apiFetch } from "@/lib/api"
import { useAuth } from "@/contexts/AuthContext"
import type { LeaveRequest } from "@/lib/types"

// ── Stage metadata ────────────────────────────────────────────────────────────
const STAGE_LABEL: Record<string, string> = {
  pending_ghassani: 'Awaiting HOD',
  pending_yousuf:   'Awaiting Yousuf',
  pending_sultan:   'Awaiting Sultan',
  pending_ramimi:   'Awaiting Management',
  pending_hr:       'Awaiting HR',
  approved:         'Approved',
  rejected:         'Rejected',
  canceled:         'Cancelled',
}

const STAGE_COLOR: Record<string, string> = {
  pending_ghassani: '#E89B1A',
  pending_yousuf:   '#E89B1A',
  pending_sultan:   '#E89B1A',
  pending_ramimi:   '#2563EB',
  pending_hr:       '#9333ea',
  approved:         '#10A854',
  rejected:         '#D63C3C',
  canceled:         '#7A849A',
}

const ROLE_STAGES: Record<string, string[]> = {
  hod:   ['pending_ghassani', 'pending_yousuf', 'pending_sultan'],
  admin: ['pending_ghassani', 'pending_yousuf', 'pending_sultan', 'pending_ramimi', 'pending_hr'],
  hr:    ['pending_hr'],
  md:    ['pending_ghassani', 'pending_yousuf', 'pending_sultan', 'pending_ramimi', 'pending_hr'],
  cto:   ['pending_ghassani', 'pending_yousuf', 'pending_sultan', 'pending_ramimi', 'pending_hr'],
  coo:   ['pending_ghassani', 'pending_yousuf', 'pending_sultan', 'pending_ramimi', 'pending_hr'],
}

const LEAVE_TYPE_LABEL: Record<string, string> = {
  annual: 'Annual', sick: 'Sick', maternity: 'Maternity', paternity: 'Paternity',
  emergency: 'Emergency', unpaid: 'Unpaid', remote_work: 'Remote Work',
  official_trip: 'Official Trip', other: 'Other', official_meeting: 'Meeting',
}

interface ProfileSnap {
  id: string; full_name: string | null; email: string
  role: string; employee_id: string | null; position_title: string | null; department_id: string | null
}

interface LRRow extends LeaveRequest {
  profiles?: ProfileSnap
  approval_history?: string
}

type Tab = 'mine' | 'all' | 'approved' | 'rejected'

function parseHistory(raw?: string) {
  try { return JSON.parse(raw ?? '[]') as { stage: string; action: string; approved_at: string; comments?: string | null }[] }
  catch { return [] }
}

export default function LeaveApprovalsPage() {
  const { user }  = useAuth()
  const role      = user?.role ?? ''
  const myStages  = ROLE_STAGES[role] ?? []

  const [tab,          setTab]          = React.useState<Tab>('mine')
  const [queue,        setQueue]        = React.useState<LRRow[]>([])
  const [all,          setAll]          = React.useState<LRRow[]>([])
  const [loading,      setLoading]      = React.useState(true)
  const [expanded,     setExpanded]     = React.useState<string | null>(null)
  const [actionLoading,setActionLoading]= React.useState(false)
  const [modal, setModal] = React.useState<{
    open: boolean; id: string | null; action: 'approve' | 'reject' | null; comment: string
  }>({ open: false, id: null, action: null, comment: '' })

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const [qRes, aRes] = await Promise.all([
        apiFetch<{ leave_requests: LRRow[] }>('/api/leave-requests?pending_approval=true'),
        apiFetch<{ leave_requests: LRRow[] }>('/api/leave-requests'),
      ])
      setQueue(qRes.leave_requests ?? [])
      setAll(aRes.leave_requests ?? [])
    } catch { toast.error('Failed to load requests') }
    finally { setLoading(false) }
  }, [])

  React.useEffect(() => { load() }, [load])

  async function act() {
    if (!modal.id || !modal.action) return
    setActionLoading(true)
    try {
      await apiFetch(`/api/leave-requests/${modal.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ action: modal.action, comments: modal.comment || undefined }),
      })
      toast.success(modal.action === 'approve' ? 'Request approved ✓' : 'Request rejected')
      setModal({ open: false, id: null, action: null, comment: '' })
      load()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Action failed')
    } finally { setActionLoading(false) }
  }

  const rows = React.useMemo(() => {
    if (tab === 'mine')     return queue
    if (tab === 'approved') return all.filter(r => r.status === 'approved')
    if (tab === 'rejected') return all.filter(r => r.status === 'rejected' || r.status === 'canceled')
    return all
  }, [tab, queue, all])

  const canAct = (r: LRRow) => r.status.startsWith('pending_') && myStages.includes(r.status)

  const TABS: { key: Tab; label: string; count?: number }[] = [
    { key: 'mine',     label: 'My Queue',  count: queue.length },
    { key: 'all',      label: 'All' },
    { key: 'approved', label: 'Approved' },
    { key: 'rejected', label: 'Rejected' },
  ]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Leave Approvals"
      />

      {/* Alert banner */}
      {queue.length > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-[var(--radius-lg)] border"
          style={{ background: '#FFF8E6', borderColor: '#E89B1A50' }}>
          <ClockCountdown size={18} style={{ color: '#E89B1A' }} />
          <p className="text-sm font-medium" style={{ color: '#92580A' }}>
            <strong>{queue.length}</strong> request{queue.length > 1 ? 's' : ''} waiting for your approval
          </p>
        </div>
      )}

      <div className="rounded-[var(--radius-lg)] border overflow-hidden"
        style={{ background: 'var(--surface-base)', borderColor: 'var(--surface-border)' }}>

        {/* Tabs */}
        <div className="flex border-b px-4" style={{ borderColor: 'var(--surface-border)' }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className="flex items-center gap-1.5 px-4 py-3.5 text-sm font-medium border-b-2 -mb-px transition-colors"
              style={{
                borderColor: tab === t.key ? 'var(--brand-navy)' : 'transparent',
                color: tab === t.key ? 'var(--brand-navy)' : 'var(--text-muted)',
              }}>
              {t.label}
              {t.count != null && t.count > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold"
                  style={{ background: '#E89B1A20', color: '#92580A' }}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex flex-col gap-3 p-6 animate-pulse">
            {[1,2,3].map(i => <div key={i} className="h-14 rounded" style={{ background: 'var(--surface-muted)' }} />)}
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16">
            <Umbrella size={32} style={{ color: 'var(--text-disabled)' }} />
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              {tab === 'mine' ? 'All caught up — no pending approvals' : 'No requests match this filter'}
            </p>
          </div>
        ) : (
          <div>
            {/* Header */}
            <div className="hidden md:grid items-center px-4 py-2 text-xs font-semibold border-b"
              style={{ color: 'var(--text-muted)', borderColor: 'var(--surface-border)',
                gridTemplateColumns: '1.8fr 0.7fr 1.1fr 1.2fr 0.9fr 0.8fr auto' }}>
              <span>Employee</span><span>Type</span><span>Dates</span>
              <span>Reason</span><span>Stage</span><span>Submitted</span><span />
            </div>

            {rows.map(r => {
              const history  = parseHistory(r.approval_history)
              const isExp    = expanded === r.id
              const myTurn   = canAct(r)

              return (
                <div key={r.id}>
                  {/* Row */}
                  <div
                    className="grid items-center px-4 py-3 border-b gap-3 transition-colors"
                    style={{
                      borderColor: 'var(--surface-border)',
                      background: myTurn ? '#FFF8E620' : undefined,
                      gridTemplateColumns: '1.8fr 0.7fr 1.1fr 1.2fr 0.9fr 0.8fr auto',
                    }}>
                    {/* Employee */}
                    <div className="flex items-center gap-2 min-w-0">
                      <Avatar name={r.profiles?.full_name} size="sm" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                          {r.profiles?.full_name ?? '—'}
                        </p>
                        <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                          {r.profiles?.position_title ?? r.profiles?.department_id ?? ''}
                        </p>
                      </div>
                    </div>
                    {/* Type */}
                    <span className="text-xs capitalize font-medium" style={{ color: 'var(--text-secondary)' }}>
                      {LEAVE_TYPE_LABEL[r.leave_type] ?? r.leave_type}
                    </span>
                    {/* Dates */}
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs" style={{ color: 'var(--text-primary)' }}>
                        {formatDate(r.start_date)} – {formatDate(r.end_date)}
                      </span>
                      {r.total_working_days != null && (
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{r.total_working_days}d</span>
                      )}
                    </div>
                    {/* Reason */}
                    <span className="text-xs truncate" style={{ color: 'var(--text-secondary)' }} title={r.reason}>
                      {r.reason}
                    </span>
                    {/* Stage */}
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full w-fit whitespace-nowrap"
                        style={{ background: `${STAGE_COLOR[r.status] ?? '#ccc'}20`, color: STAGE_COLOR[r.status] ?? '#777' }}>
                        {STAGE_LABEL[r.status] ?? r.status}
                      </span>
                      {myTurn && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full w-fit"
                          style={{ background: '#E89B1A20', color: '#92580A' }}>
                          Your turn
                        </span>
                      )}
                    </div>
                    {/* Date */}
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {formatDate(r.created_at)}
                    </span>
                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      {myTurn && (
                        <>
                          <button
                            className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium"
                            style={{ color: '#10A854', background: '#10A85415' }}
                            onClick={() => setModal({ open: true, id: r.id, action: 'approve', comment: '' })}
                          >
                            <CheckCircle size={12} weight="fill" /> Approve
                          </button>
                          <button
                            className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium"
                            style={{ color: '#D63C3C', background: '#D63C3C15' }}
                            onClick={() => setModal({ open: true, id: r.id, action: 'reject', comment: '' })}
                          >
                            <XCircle size={12} weight="fill" /> Reject
                          </button>
                        </>
                      )}
                      <button
                        className="w-6 h-6 flex items-center justify-center rounded hover:bg-[#F1F3F7] transition-colors"
                        style={{ color: 'var(--text-muted)' }}
                        onClick={() => setExpanded(isExp ? null : r.id)}
                        title="Show approval trail"
                      >
                        {isExp ? <CaretUp size={11} /> : <CaretDown size={11} />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded approval trail */}
                  {isExp && (
                    <div className="px-6 py-4 border-b" style={{ background: 'var(--surface-subtle)', borderColor: 'var(--surface-border)' }}>
                      <p className="text-[10px] font-bold tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
                        APPROVAL TRAIL
                      </p>
                      <div className="flex flex-col gap-2.5">
                        {history.length === 0 ? (
                          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No approvals recorded yet.</p>
                        ) : history.map((h, i) => (
                          <div key={i} className="flex items-start gap-3">
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${h.action === 'approve' ? 'bg-green-100' : 'bg-red-100'}`}>
                              {h.action === 'approve'
                                ? <CheckCircle size={11} weight="fill" style={{ color: '#10A854' }} />
                                : <XCircle size={11} weight="fill" style={{ color: '#D63C3C' }} />}
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                                  {STAGE_LABEL[h.stage] ?? h.stage}
                                </span>
                                <span className="text-xs capitalize" style={{ color: 'var(--text-muted)' }}>
                                  {h.action === 'approve' ? '✓ Approved' : '✗ Rejected'} · {formatDate(h.approved_at)}
                                </span>
                              </div>
                              {h.comments && (
                                <p className="text-xs mt-0.5 italic" style={{ color: 'var(--text-secondary)' }}>"{h.comments}"</p>
                              )}
                            </div>
                          </div>
                        ))}
                        {/* Next pending step */}
                        {r.status.startsWith('pending_') && (
                          <div className="flex items-center gap-3 opacity-40">
                            <div className="w-5 h-5 rounded-full border-2 border-dashed flex-shrink-0"
                              style={{ borderColor: STAGE_COLOR[r.status] }} />
                            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                              {STAGE_LABEL[r.status]} — pending
                            </span>
                          </div>
                        )}
                      </div>
                      {/* Reason/description */}
                      <div className="mt-3 pt-3 border-t flex flex-col gap-1" style={{ borderColor: 'var(--surface-border)' }}>
                        <p className="text-[10px] font-bold tracking-wider" style={{ color: 'var(--text-muted)' }}>REASON</p>
                        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{r.reason}</p>
                        {r.description && (
                          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{r.description}</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Confirm modal */}
      <Modal
        open={modal.open}
        onOpenChange={open => setModal(m => ({ ...m, open }))}
        title={modal.action === 'approve' ? 'Approve Leave Request' : 'Reject Leave Request'}
        description={modal.action === 'approve'
          ? 'The request will advance to the next approval stage.'
          : 'The request will be rejected. You can add a note for the employee.'}
        footer={
          <>
            <Button variant="secondary" size="sm"
              onClick={() => setModal({ open: false, id: null, action: null, comment: '' })}>
              Cancel
            </Button>
            <Button
              variant={modal.action === 'approve' ? 'primary' : 'destructive'}
              size="sm" loading={actionLoading} onClick={act}
            >
              {modal.action === 'approve'
                ? <><CheckCircle size={14} /> Confirm Approval</>
                : <><XCircle size={14} /> Confirm Rejection</>}
            </Button>
          </>
        }
      >
        <Textarea
          label="Comment (optional)"
          value={modal.comment}
          onChange={e => setModal(m => ({ ...m, comment: e.target.value }))}
          placeholder="Add a note visible to the employee and next approver…"
          rows={3}
        />
      </Modal>
    </div>
  )
}
