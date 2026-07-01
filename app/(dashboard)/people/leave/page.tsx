"use client"

import * as React from "react"
import Link from "next/link"
import { Plus, Umbrella, X } from "@phosphor-icons/react"
import { toast } from "sonner"
import { PageHeader } from "@/components/ui/page-header"
import { Button } from "@/components/ui/button"
import { LeaveBalanceCards } from "@/components/people/leave-balance-card"
import { Avatar } from "@/components/ui/avatar"
import { formatDate } from "@/lib/utils"
import { apiFetch } from "@/lib/api"
import { useAuth } from "@/contexts/AuthContext"
import type { LeaveRequest, LeaveBalance } from "@/lib/types"

const STAGE_LABEL: Record<string, string> = {
  pending_ghassani: 'Awaiting HOD Approval',
  pending_yousuf:   'Awaiting Yousuf (HOD)',
  pending_sultan:   'Awaiting Sultan (HOD)',
  pending_ramimi:   'Awaiting Management Approval',
  pending_hr:       'Awaiting HR Final Approval',
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

const LEAVE_TYPE_LABEL: Record<string, string> = {
  annual: 'Annual Leave', sick: 'Sick Leave', maternity: 'Maternity', paternity: 'Paternity',
  emergency: 'Emergency', unpaid: 'Unpaid', remote_work: 'Remote Work',
  official_trip: 'Official Trip', other: 'Other', official_meeting: 'Official Meeting',
}

interface LRRow extends LeaveRequest {
  profiles?: { id: string; full_name: string | null; email: string; role: string; position_title?: string | null }
}

type TabType = 'my' | 'team'

export default function LeavePage() {
  const { user }   = useAuth()
  const [tab,      setTab]      = React.useState<TabType>('my')
  const [balance,  setBalance]  = React.useState<LeaveBalance | null>(null)
  const [my,       setMy]       = React.useState<LRRow[]>([])
  const [team,     setTeam]     = React.useState<LRRow[]>([])
  const [loading,  setLoading]  = React.useState(true)
  const [canceling,setCanceling]= React.useState<string | null>(null)

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const [balRes, myRes, teamRes] = await Promise.allSettled([
        apiFetch<{ balance: LeaveBalance }>('/api/leave-balances'),
        apiFetch<{ leave_requests: LRRow[] }>('/api/leave-requests'),
        apiFetch<{ leave_requests: LRRow[] }>('/api/leave-requests?pending_approval=true'),
      ])
      if (balRes.status  === 'fulfilled') setBalance(balRes.value.balance)
      if (myRes.status   === 'fulfilled') setMy(myRes.value.leave_requests ?? [])
      if (teamRes.status === 'fulfilled') setTeam(teamRes.value.leave_requests ?? [])
    } finally { setLoading(false) }
  }, [])

  React.useEffect(() => { load() }, [load])

  async function cancelRequest(id: string) {
    setCanceling(id)
    try {
      await apiFetch(`/api/leave-requests/${id}`, { method: 'DELETE' })
      toast.success('Leave request cancelled')
      load()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to cancel')
    } finally { setCanceling(null) }
  }

  const displayData = tab === 'my' ? my : team

  // Approval progress bar  — how many stages completed
  function approvalProgress(lr: LRRow): { done: number; total: number } {
    const chain = ['pending_ghassani', 'pending_ramimi', 'pending_hr', 'approved']
    const idx = chain.indexOf(lr.status)
    if (lr.status === 'approved') return { done: 3, total: 3 }
    if (lr.status === 'rejected' || lr.status === 'canceled') return { done: 0, total: 3 }
    return { done: Math.max(idx, 0), total: 3 }
  }

  const TABS = [
    { key: 'my'   as TabType, label: 'My Requests',   count: my.length },
    { key: 'team' as TabType, label: 'Pending for Me', count: team.filter(r => r.status.startsWith('pending_')).length },
  ]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Leave Management"
        actions={
          <Link href="/people/leave/apply">
            <Button variant="primary" size="md"><Plus size={16} /> Apply for Leave</Button>
          </Link>
        }
      />

      <LeaveBalanceCards balance={balance} />

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
              {t.count > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold"
                  style={{ background: 'var(--surface-muted)', color: 'var(--text-muted)' }}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="p-4">
          {loading ? (
            <div className="flex flex-col gap-3 animate-pulse">
              {[1,2,3].map(i => <div key={i} className="h-16 rounded" style={{ background: 'var(--surface-muted)' }} />)}
            </div>
          ) : displayData.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-14">
              <Umbrella size={30} style={{ color: 'var(--text-disabled)' }} />
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                {tab === 'my' ? "You haven't submitted any leave requests yet." : "No pending requests for your approval."}
              </p>
              {tab === 'my' && (
                <Link href="/people/leave/apply">
                  <Button variant="primary" size="sm"><Plus size={14} /> Apply for Leave</Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {displayData.map(lr => {
                const progress = approvalProgress(lr)
                const isPending = lr.status.startsWith('pending_')
                const isOwn = lr.user_id === user?.id

                return (
                  <div key={lr.id} className="rounded-[var(--radius-lg)] border p-4"
                    style={{ borderColor: 'var(--surface-border)', background: 'var(--surface-subtle)' }}>
                    <div className="flex items-start justify-between gap-4">
                      {/* Left: type + dates */}
                      <div className="flex flex-col gap-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {tab === 'team' && lr.profiles && (
                            <div className="flex items-center gap-1.5">
                              <Avatar name={lr.profiles.full_name} size="xs" />
                              <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                                {lr.profiles.full_name}
                              </span>
                            </div>
                          )}
                          <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                            {LEAVE_TYPE_LABEL[lr.leave_type] ?? lr.leave_type}
                          </span>
                          {lr.total_working_days != null && (
                            <span className="text-xs px-1.5 py-0.5 rounded"
                              style={{ background: 'var(--surface-muted)', color: 'var(--text-muted)' }}>
                              {lr.total_working_days} day{lr.total_working_days !== 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                          {formatDate(lr.start_date)} – {formatDate(lr.end_date)}
                        </p>
                        {lr.reason && (
                          <p className="text-xs truncate max-w-sm" style={{ color: 'var(--text-muted)' }}>{lr.reason}</p>
                        )}
                      </div>

                      {/* Right: status + cancel */}
                      <div className="flex flex-col items-end gap-2 flex-shrink-0">
                        <span className="text-xs font-medium px-2.5 py-1 rounded-full"
                          style={{
                            background: `${STAGE_COLOR[lr.status] ?? '#ccc'}18`,
                            color: STAGE_COLOR[lr.status] ?? '#777',
                          }}>
                          {STAGE_LABEL[lr.status] ?? lr.status}
                        </span>
                        {isPending && isOwn && (
                          <button
                            className="flex items-center gap-1 text-xs px-2 py-0.5 rounded transition-colors hover:bg-red-50"
                            style={{ color: 'var(--text-muted)' }}
                            disabled={canceling === lr.id}
                            onClick={() => cancelRequest(lr.id)}
                          >
                            <X size={11} />
                            {canceling === lr.id ? 'Cancelling…' : 'Cancel'}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Approval progress bar */}
                    {lr.status !== 'rejected' && lr.status !== 'canceled' && (
                      <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--surface-border)' }}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] font-semibold tracking-wider" style={{ color: 'var(--text-muted)' }}>
                            APPROVAL PROGRESS
                          </span>
                          <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                            {progress.done}/{progress.total} stages
                          </span>
                        </div>
                        <div className="flex gap-1.5">
                          {['HOD', 'Management', 'HR'].map((stage, i) => (
                            <div key={stage} className="flex-1 flex flex-col gap-1">
                              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--surface-muted)' }}>
                                <div className="h-full rounded-full transition-all duration-500"
                                  style={{
                                    width: i < progress.done ? '100%' : '0%',
                                    background: lr.status === 'approved' ? '#10A854' : 'var(--brand-navy)',
                                  }} />
                              </div>
                              <span className="text-[10px] text-center" style={{ color: 'var(--text-muted)' }}>{stage}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Submitted date */}
                    <p className="text-[10px] mt-2" style={{ color: 'var(--text-disabled)' }}>
                      Submitted {formatDate(lr.created_at)}
                    </p>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Link to approvals page */}
      <div className="flex justify-end">
        <Link href="/people/leave/approvals">
          <Button variant="ghost" size="sm" style={{ color: 'var(--text-muted)' }}>
            Go to Approvals page →
          </Button>
        </Link>
      </div>
    </div>
  )
}
