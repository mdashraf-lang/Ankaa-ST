"use client"

import * as React from "react"
import * as d3 from "d3"
import {
  MagnifyingGlass, Plus, Minus, PencilSimple, Trash, X,
  UserCircle, Envelope, Phone, Buildings, IdentificationCard,
  CalendarBlank, Printer, UsersThree, Crown, Star, Briefcase,
  ArrowLeft, ArrowsOut, ShieldStar, SlidersHorizontal,
} from "@phosphor-icons/react"
import { toast } from "sonner"
import { Modal } from "@/components/ui/modal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar } from "@/components/ui/avatar"
import { apiFetch } from "@/lib/api"
import { useAuth } from "@/contexts/AuthContext"
import { formatDate } from "@/lib/utils"

// ── Types ─────────────────────────────────────────────────────────────────────
interface OrgNode {
  id: string
  title: string | null
  user_id: string | null
  parent_id: string | null
  department: string | null
  color: string | null
  order: number
  is_c_level: number
  is_head_of_department: number
  can_direct_approve: number
  level: string | null
  full_name: string | null
  email: string | null
  role: string | null
  phone_number: string | null
  employee_id: string | null
  position_title: string | null
  status: string | null
  avatar_url: string | null
  joining_date: string | null
  basic_salary: number | null
  contract_type: string | null
  gender: string | null
  emergency_number: string | null
}

interface TreeDatum extends OrgNode {
  _children: TreeDatum[]
}

interface ProfileOption {
  id: string
  full_name: string | null
  email: string
  role: string
  employee_id: string | null
  position_title: string | null
  department_id: string | null
}

// ── Design tokens ─────────────────────────────────────────────────────────────
const DEPT: Record<string, { solid: string; soft: string; text: string; border: string }> = {
  'Executive':              { solid: '#1B2A5E', soft: '#EEF1FB', text: '#1B2A5E', border: '#C7D0F0' },
  'Technology':             { solid: '#1D4ED8', soft: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE' },
  'Operations':             { solid: '#047857', soft: '#ECFDF5', text: '#047857', border: '#A7F3D0' },
  'Marketing':              { solid: '#BE185D', soft: '#FDF2F8', text: '#BE185D', border: '#FBCFE8' },
  'Finance':                { solid: '#0369A1', soft: '#F0F9FF', text: '#0369A1', border: '#BAE6FD' },
  'HR & Administration':    { solid: '#6D28D9', soft: '#F5F3FF', text: '#6D28D9', border: '#DDD6FE' },
  'Research & Development': { solid: '#0C4A6E', soft: '#F0F9FF', text: '#0C4A6E', border: '#7DD3FC' },
  'Tenders & Contracts':    { solid: '#92400E', soft: '#FFFBEB', text: '#92400E', border: '#FDE68A' },
  'External':               { solid: '#374151', soft: '#F9FAFB', text: '#374151', border: '#D1D5DB' },
}
const DEFAULT_DEPT = { solid: '#1B2A5E', soft: '#EEF1FB', text: '#1B2A5E', border: '#C7D0F0' }
const getDept = (d?: string | null) => d ? (DEPT[d] ?? DEFAULT_DEPT) : DEFAULT_DEPT

const LEVEL: Record<string, { bg: string; fg: string; icon?: React.ReactNode }> = {
  'MD':       { bg: '#FEF3C7', fg: '#92400E', icon: <Crown size={8} weight="fill" /> },
  'CEO':      { bg: '#FEE2E2', fg: '#991B1B', icon: <Crown size={8} weight="fill" /> },
  'C-Level':  { bg: '#EDE9FE', fg: '#5B21B6', icon: <Star size={8} weight="fill" /> },
  'Manager':  { bg: '#DBEAFE', fg: '#1D4ED8', icon: <Briefcase size={8} weight="fill" /> },
  'Lead':     { bg: '#D1FAE5', fg: '#065F46', icon: <UsersThree size={8} weight="fill" /> },
  'Staff':    { bg: '#F1F5F9', fg: '#475569' },
  'Trainee':  { bg: '#FFEDD5', fg: '#9A3412' },
  'External': { bg: '#F3F4F6', fg: '#4B5563' },
}
const getLevel = (l?: string | null) => l ? (LEVEL[l] ?? LEVEL['Staff']) : LEVEL['Staff']

const DEPT_ORDER = [
  'Executive', 'Technology', 'Operations', 'Marketing',
  'Finance', 'HR & Administration', 'Research & Development',
  'Tenders & Contracts', 'External',
]
const ROLE_LABEL: Record<string, string> = {
  admin: 'Admin', md: 'MD', cto: 'CTO', coo: 'COO',
  hr: 'HR', finance: 'Finance', hod: 'HoD', team_member: 'Team Member',
  collaborator: 'Collaborator', trainee: 'Trainee',
}
const CONTRACT_LABEL: Record<string, string> = {
  full_time: 'Full-time', part_time: 'Part-time', contractor: 'Contractor', intern: 'Intern',
}

// ── Card dimensions (must match rendered card height) ─────────────────────────
const CARD_W  = 196   // card pixel width
const CARD_H  = 118   // card pixel height (measured)
const H_GAP   = 40    // min horizontal gap between siblings
const V_GAP   = 88    // vertical gap between levels (for connector lines)

// ── Helpers ───────────────────────────────────────────────────────────────────
function initials(name: string | null) {
  if (!name) return '?'
  const p = name.trim().split(/\s+/)
  return p.length === 1 ? (p[0][0] ?? '?').toUpperCase()
    : ((p[0][0] ?? '') + (p[p.length - 1][0] ?? '')).toUpperCase()
}

function OrgAvatar({ name, src, dept, size = 40 }: { name: string | null; src?: string; dept?: string | null; size?: number }) {
  const d = getDept(dept)
  if (src) return <Avatar name={name ?? '?'} src={src} size={size >= 48 ? 'lg' : 'md'} />
  const fs = size >= 48 ? 16 : size >= 40 ? 13 : 11
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: d.solid, color: '#fff', flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: fs, fontWeight: 700, letterSpacing: '0.04em',
    }}>
      {initials(name)}
    </div>
  )
}

// ── Connector path (elbow with rounded corners) ───────────────────────────────
function elbowPath(sx: number, sy: number, tx: number, ty: number): string {
  const midY = sy + (ty - sy) * 0.5
  const r    = 8
  const dx   = tx - sx
  if (Math.abs(dx) < 2) return `M${sx},${sy} V${ty}`
  const xDir = dx > 0 ? 1 : -1
  const clampedR = Math.min(r, Math.abs(dx) / 2, Math.abs(ty - midY) / 2)
  return [
    `M${sx},${sy}`,
    `V${midY - clampedR}`,
    `Q${sx},${midY} ${sx + clampedR * xDir},${midY}`,
    `H${tx - clampedR * xDir}`,
    `Q${tx},${midY} ${tx},${midY + clampedR}`,
    `V${ty}`,
  ].join(' ')
}

// ── Build D3 tree from flat nodes ─────────────────────────────────────────────
function buildHierarchy(nodes: OrgNode[], collapsedIds: Set<string>): TreeDatum | null {
  if (!nodes.length) return null

  const map = new Map<string, TreeDatum>()
  for (const n of nodes) {
    map.set(n.id, { ...n, _children: [] })
  }

  const roots: TreeDatum[] = []
  for (const n of nodes) {
    const self = map.get(n.id)!
    if (n.parent_id && map.has(n.parent_id)) {
      map.get(n.parent_id)!._children.push(self)
    } else {
      roots.push(self)
    }
  }

  // Sort by order
  const sort = (node: TreeDatum) => {
    node._children.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    node._children.forEach(sort)
  }
  roots.forEach(sort)

  if (roots.length === 0) return null
  if (roots.length === 1) return roots[0]

  // Virtual root for multi-root trees
  return {
    id: '__root__', title: null, user_id: null, parent_id: null,
    department: null, color: null, order: 0,
    is_c_level: 0, is_head_of_department: 0, can_direct_approve: 0,
    level: null, full_name: null, email: null, role: null,
    phone_number: null, employee_id: null, position_title: null,
    status: null, avatar_url: null, joining_date: null,
    basic_salary: null, contract_type: null, gender: null,
    emergency_number: null, _children: roots,
  }
}

interface LayoutResult {
  nodes: Array<{ id: string; x: number; y: number; data: TreeDatum; depth: number }>
  links: Array<{ id: string; path: string }>
  width: number
  height: number
  offsetX: number
  offsetY: number
}

function computeLayout(root: TreeDatum, collapsedIds: Set<string>): LayoutResult {
  const PAD = 80

  const hier = d3.hierarchy<TreeDatum>(root, d =>
    collapsedIds.has(d.id) ? [] : d._children
  )

  const treeLayout = d3.tree<TreeDatum>()
    .nodeSize([CARD_W + H_GAP, CARD_H + V_GAP])
    .separation((a, b) => a.parent === b.parent ? 1.1 : 1.5)

  treeLayout(hier)

  const descendants = hier.descendants()
  const xs = descendants.map(d => d.x ?? 0)
  const ys = descendants.map(d => d.y ?? 0)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)

  const offsetX = -minX + CARD_W / 2 + PAD
  const offsetY = -minY + PAD

  const visibleNodes = descendants.filter(d => d.data.id !== '__root__').map(d => ({
    id: d.data.id,
    x:  (d.x ?? 0) + offsetX - CARD_W / 2,
    y:  (d.y ?? 0) + offsetY,
    data: d.data,
    depth: d.depth,
  }))

  const visibleLinks = hier.links()
    .filter(l => l.source.data.id !== '__root__' && l.target.data.id !== '__root__')
    .map(l => {
      const sx = (l.source.x ?? 0) + offsetX
      const sy = (l.source.y ?? 0) + offsetY + CARD_H
      const tx = (l.target.x ?? 0) + offsetX
      const ty = (l.target.y ?? 0) + offsetY
      return {
        id: `${l.source.data.id}--${l.target.data.id}`,
        path: elbowPath(sx, sy, tx, ty),
      }
    })

  // Draw links from virtual root to real roots (multi-root case)
  if (root.id === '__root__') {
    const vRoot = hier.descendants().find(d => d.data.id === '__root__')
    if (vRoot) {
      vRoot.children?.forEach(child => {
        if (child.data.id === '__root__') return
        const sx = (vRoot.x ?? 0) + offsetX
        const sy = (vRoot.y ?? 0) + offsetY + CARD_H / 2
        const tx = (child.x ?? 0) + offsetX
        const ty = (child.y ?? 0) + offsetY
        visibleLinks.push({
          id: `__root__--${child.data.id}`,
          path: elbowPath(sx, sy, tx, ty),
        })
      })
    }
  }

  return {
    nodes: visibleNodes,
    links: visibleLinks,
    width:  maxX - minX + CARD_W + PAD * 2,
    height: maxY - minY + CARD_H + PAD * 2,
    offsetX,
    offsetY,
  }
}

// ── Node Card (HTML, absolutely positioned) ───────────────────────────────────
interface NodeCardProps {
  node: TreeDatum
  selected: boolean
  highlighted: boolean
  isAdmin: boolean
  collapsed: boolean
  hasChildren: boolean
  onSelect: (n: TreeDatum) => void
  onEdit:   (n: TreeDatum) => void
  onDelete: (n: TreeDatum) => void
  onAddChild: (n: TreeDatum) => void
  onToggle: (id: string) => void
}

function NodeCard({ node, selected, highlighted, isAdmin, collapsed, hasChildren, onSelect, onEdit, onDelete, onAddChild, onToggle }: NodeCardProps) {
  const [hov, setHov] = React.useState(false)
  const d   = getDept(node.department)
  const lv  = getLevel(node.level)
  const isExec = ['MD', 'CEO', 'C-Level'].includes(node.level ?? '')

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{ position: 'relative', width: CARD_W }}
    >
      {/* Admin floating buttons */}
      {isAdmin && hov && (
        <div style={{ position: 'absolute', top: -9, right: -9, display: 'flex', gap: 4, zIndex: 40 }}>
          <FabBtn title="Edit"   bg="#1B2A5E" onClick={e => { e.stopPropagation(); onEdit(node)   }}><PencilSimple size={9} weight="bold" /></FabBtn>
          <FabBtn title="Delete" bg="#EF4444" onClick={e => { e.stopPropagation(); onDelete(node) }}><Trash        size={9} weight="bold" /></FabBtn>
        </div>
      )}

      {/* Card */}
      <div
        id={`org-node-${node.id}`}
        onClick={() => onSelect(node)}
        style={{
          width: CARD_W,
          background: selected ? d.soft : '#ffffff',
          borderRadius: 14,
          borderTop:    `1.5px solid ${selected ? d.solid : highlighted ? d.border : '#E8EDF5'}`,
          borderRight:  `1.5px solid ${selected ? d.solid : highlighted ? d.border : '#E8EDF5'}`,
          borderBottom: `1.5px solid ${selected ? d.solid : highlighted ? d.border : '#E8EDF5'}`,
          borderLeft:   `4px solid ${node.color ?? d.solid}`,
          boxShadow: hov || selected
            ? `0 10px 30px rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.06), 0 0 0 3px ${(node.color ?? d.solid)}22`
            : '0 2px 8px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
          transform: hov ? 'translateY(-4px) scale(1.015)' : 'none',
          transition: 'transform 200ms cubic-bezier(0.16,1,0.3,1), box-shadow 200ms ease, border-color 150ms ease',
          cursor: 'pointer', userSelect: 'none', overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Executive shimmer bar */}
        {isExec && (
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 3,
            background: `linear-gradient(90deg, ${node.color ?? d.solid}, ${node.color ?? d.solid}77, transparent)`,
          }} />
        )}

        <div style={{ padding: isExec ? '16px 14px 13px' : '13px 14px 11px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 9 }}>
          {/* Avatar + status dot */}
          <div style={{ position: 'relative' }}>
            <div style={{ padding: 2, borderRadius: '50%', border: `2px solid ${selected ? (node.color ?? d.solid) : d.border}` }}>
              <OrgAvatar name={node.full_name} src={node.avatar_url ?? undefined} dept={node.department} size={isExec ? 44 : 36} />
            </div>
            <span style={{
              position: 'absolute', bottom: 1, right: 1,
              width: 10, height: 10, borderRadius: '50%',
              background: node.status === 'active' ? '#22C55E' : '#94A3B8',
              border: '2px solid white',
            }} />
          </div>

          {/* Name */}
          <div style={{ textAlign: 'center', width: '100%' }}>
            <p style={{
              fontSize: isExec ? 12.5 : 11.5, fontWeight: 700, color: '#0F172A',
              margin: 0, lineHeight: 1.3,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', padding: '0 4px',
            }}>
              {node.full_name ?? (node.title ?? 'Vacant')}
            </p>
            {node.title && node.full_name && (
              <p style={{
                fontSize: 9.5, fontWeight: 400, color: '#64748B',
                margin: '2px 0 0', lineHeight: 1.4, padding: '0 4px',
                overflow: 'hidden', display: '-webkit-box',
                WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
              }}>
                {node.title}
              </p>
            )}
          </div>

          {/* Badges */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, justifyContent: 'center', width: '100%' }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 3,
              padding: '2px 7px', borderRadius: 20,
              background: lv.bg, color: lv.fg, fontSize: 8.5, fontWeight: 700,
            }}>
              {lv.icon}{node.level ?? 'Staff'}
            </span>
            {node.department && (
              <span style={{
                padding: '2px 7px', borderRadius: 20,
                background: d.soft, color: d.text, fontSize: 8, fontWeight: 600,
                border: `1px solid ${d.border}`,
                maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                display: 'inline-block',
              }}>
                {node.department.split(' & ')[0]}
              </span>
            )}
          </div>

          {/* Permission flags */}
          {(node.is_c_level === 1 || node.is_head_of_department === 1 || node.can_direct_approve === 1) && (
            <div style={{ display: 'flex', gap: 3, justifyContent: 'center', flexWrap: 'wrap' }}>
              {node.is_c_level === 1           && <MiniFlag color="#7C3AED" label="C-Level"  />}
              {node.is_head_of_department === 1 && <MiniFlag color="#1D4ED8" label="HoD"      />}
              {node.can_direct_approve === 1    && <MiniFlag color="#047857" label="Approver" />}
            </div>
          )}
        </div>
      </div>

      {/* Admin: add child */}
      {isAdmin && hov && (
        <button
          title="Add direct report"
          onClick={e => { e.stopPropagation(); onAddChild(node) }}
          style={{
            position: 'absolute', bottom: hasChildren ? -13 : -11, left: '50%',
            transform: 'translateX(-50%)',
            width: 22, height: 22, borderRadius: '50%',
            background: '#22C55E', color: 'white', border: '2px solid white',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 3px 10px rgba(34,197,94,0.45)', zIndex: 40,
            transition: 'transform 150ms ease-out',
          }}
          onMouseEnter={e => (e.currentTarget.style.transform = 'translateX(-50%) scale(1.25)')}
          onMouseLeave={e => (e.currentTarget.style.transform = 'translateX(-50%) scale(1)')}
        >
          <Plus size={11} weight="bold" />
        </button>
      )}

      {/* Collapse / expand toggle */}
      {hasChildren && (
        <button
          title={collapsed ? 'Expand branch' : 'Collapse branch'}
          onClick={e => { e.stopPropagation(); onToggle(node.id) }}
          style={{
            position: 'absolute', bottom: -10, left: '50%',
            transform: 'translateX(-50%)',
            width: 19, height: 19, borderRadius: '50%',
            background: collapsed ? (node.color ?? d.solid) : 'white',
            border: `1.5px solid ${node.color ?? d.solid}`,
            color:  collapsed ? 'white' : (node.color ?? d.solid),
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 6px rgba(0,0,0,0.12)', zIndex: 30,
            opacity: hov || selected ? 1 : 0.55,
            transition: 'opacity 150ms, background 150ms, color 150ms',
          }}
        >
          <SlidersHorizontal
            size={9} weight="bold"
            style={{
              transform: collapsed ? 'rotate(-90deg)' : 'none',
              transition: 'transform 200ms cubic-bezier(0.16,1,0.3,1)',
            }}
          />
        </button>
      )}
    </div>
  )
}

function FabBtn({ title, bg, onClick, children }: {
  title: string; bg: string; onClick: (e: React.MouseEvent) => void; children: React.ReactNode
}) {
  const [h, setH] = React.useState(false)
  return (
    <button title={title} onClick={onClick}
      onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{
        width: 22, height: 22, borderRadius: '50%', border: '2px solid white',
        background: bg, color: 'white', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: `0 3px 10px ${bg}55`,
        transform: h ? 'scale(1.25)' : 'scale(1)',
        transition: 'transform 150ms ease-out',
      }}>
      {children}
    </button>
  )
}

function MiniFlag({ color, label }: { color: string; label: string }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      padding: '1px 5px', borderRadius: 20,
      background: `${color}14`, color, fontSize: 7.5, fontWeight: 600,
      border: `1px solid ${color}30`,
    }}>
      <ShieldStar size={6} weight="fill" />
      {label}
    </span>
  )
}

// ── Detail Card Modal (centered overlay) ─────────────────────────────────────
function DetailPanel({ node, parentNode, directReports, isAdmin, onClose, onEdit, onDelete }: {
  node: TreeDatum | null; parentNode: TreeDatum | null; directReports: TreeDatum[]
  isAdmin: boolean; onClose: () => void; onEdit: (n: TreeDatum) => void; onDelete: (n: TreeDatum) => void
}) {
  // Close on Escape
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!node) return null
  const d  = getDept(node.department)
  const lv = getLevel(node.level)

  return (
    // Backdrop
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 60,
        background: 'rgba(15,23,42,0.45)',
        backdropFilter: 'blur(3px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px 16px',
      }}
    >
      {/* Card — stop click propagation so clicking inside doesn't close */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 560,
          maxHeight: '90vh',
          background: 'var(--surface-base)',
          borderRadius: 20,
          boxShadow: '0 24px 80px rgba(0,0,0,0.22), 0 4px 16px rgba(0,0,0,0.10)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
          border: `1px solid var(--surface-border)`,
        }}
      >
        {/* Dept colour bar */}
        <div style={{ height: 5, background: `linear-gradient(90deg, ${d.solid}, ${d.solid}88, transparent)`, flexShrink: 0 }} />

        {/* Header */}
        <div style={{ padding: '22px 24px 20px', background: d.soft, borderBottom: `1px solid ${d.border}`, flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            {/* Left: avatar + name */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ padding: 3, borderRadius: '50%', background: `linear-gradient(135deg, ${d.solid}, ${d.solid}77)`, flexShrink: 0 }}>
                <div style={{ padding: 2, borderRadius: '50%', background: d.soft }}>
                  <OrgAvatar name={node.full_name} src={node.avatar_url ?? undefined} dept={node.department} size={64} />
                </div>
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#0F172A', lineHeight: 1.25 }}>
                  {node.full_name ?? '-'}
                </p>
                <p style={{ margin: '4px 0 10px', fontSize: 13, color: '#64748B' }}>{node.title ?? '-'}</p>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    padding: '3px 10px', borderRadius: 20,
                    background: lv.bg, color: lv.fg, fontSize: 11, fontWeight: 600,
                  }}>
                    {lv.icon}{node.level ?? 'Staff'}
                  </span>
                  <span style={{
                    padding: '3px 10px', borderRadius: 20,
                    background: d.soft, color: d.text, fontSize: 11, fontWeight: 600,
                    border: `1px solid ${d.border}`,
                  }}>
                    {node.department ?? '-'}
                  </span>
                  {node.status === 'active' && (
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      padding: '3px 10px', borderRadius: 20,
                      background: '#F0FDF4', color: '#15803D', fontSize: 11, fontWeight: 600,
                    }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22C55E' }} />
                      Active
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Close */}
            <button onClick={onClose} style={{
              width: 30, height: 30, borderRadius: '50%', border: 'none', flexShrink: 0,
              background: 'rgba(0,0,0,0.07)', color: '#64748B', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 150ms', marginLeft: 12,
            }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.14)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.07)')}>
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Body — two columns */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 32px' }}>
            {/* Column 1 */}
            <div>
              <CardSection title="Contact">
                <CardField icon={<Envelope size={13} />}        label="Email"       value={node.email}        isEmail />
                <CardField icon={<Phone size={13} />}           label="Phone"       value={node.phone_number} isPhone />
                <CardField icon={<Phone size={13} />}           label="Emergency"   value={node.emergency_number} />
              </CardSection>
              <CardSection title="Organisation">
                <CardField icon={<ArrowLeft size={13} />}  label="Reports To"     value={parentNode ? (parentNode.full_name ?? parentNode.title) : 'Top Level'} />
                <CardField icon={<UsersThree size={13} />} label="Direct Reports" value={directReports.length > 0 ? `${directReports.length} person${directReports.length !== 1 ? 's' : ''}` : 'None'} />
              </CardSection>
              {directReports.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: -8, marginBottom: 16 }}>
                  {directReports.slice(0, 8).map(r => (
                    <span key={r.id} style={{
                      fontSize: 10.5, padding: '2px 8px', borderRadius: 20,
                      background: 'var(--surface-muted)', color: 'var(--text-secondary)',
                    }}>
                      {r.full_name?.split(' ')[0] ?? '?'}
                    </span>
                  ))}
                  {directReports.length > 8 && (
                    <span style={{ fontSize: 10.5, padding: '2px 8px', borderRadius: 20, background: 'var(--surface-muted)', color: 'var(--text-muted)' }}>
                      +{directReports.length - 8}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Column 2 */}
            <div>
              <CardSection title="Employment">
                <CardField icon={<IdentificationCard size={13} />} label="Employee ID" value={node.employee_id} mono />
                <CardField icon={<CalendarBlank size={13} />}      label="Joined"      value={node.joining_date ? formatDate(node.joining_date) : null} />
                <CardField icon={<Buildings size={13} />}          label="Contract"    value={node.contract_type ? CONTRACT_LABEL[node.contract_type] ?? node.contract_type : null} />
                <CardField icon={<Buildings size={13} />}          label="System Role" value={node.role ? ROLE_LABEL[node.role] ?? node.role : null} />
              </CardSection>

              {(node.is_c_level === 1 || node.is_head_of_department === 1 || node.can_direct_approve === 1) && (
                <CardSection title="Permissions">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {node.is_c_level === 1            && <PFlag label="C-Level Executive"   color="#7C3AED" />}
                    {node.is_head_of_department === 1 && <PFlag label="Head of Department"  color="#1D4ED8" />}
                    {node.can_direct_approve === 1    && <PFlag label="Can Direct Approve"  color="#047857" />}
                  </div>
                </CardSection>
              )}
            </div>
          </div>
        </div>

        {/* Footer actions (admin only) */}
        {isAdmin && (
          <div style={{
            display: 'flex', gap: 10, padding: '14px 24px',
            borderTop: '1px solid var(--surface-border)', flexShrink: 0,
          }}>
            <Button variant="secondary"   size="sm" style={{ flex: 1 }} onClick={() => { onEdit(node); onClose() }}>
              <PencilSimple size={13} /> Edit Position
            </Button>
            <Button variant="destructive" size="sm" style={{ flex: 1 }} onClick={() => { onDelete(node); onClose() }}>
              <Trash size={13} /> Remove
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

function CardSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <p style={{
        margin: '0 0 8px', fontSize: 9.5, fontWeight: 700,
        letterSpacing: '0.1em', textTransform: 'uppercase',
        color: 'var(--text-disabled)',
      }}>
        {title}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {children}
      </div>
    </div>
  )
}

function CardField({ icon, label, value, isEmail, isPhone, mono }: {
  icon: React.ReactNode; label: string; value?: string | null
  isEmail?: boolean; isPhone?: boolean; mono?: boolean
}) {
  if (!value) return null
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
      <span style={{ marginTop: 1, color: 'var(--text-muted)', flexShrink: 0 }}>{icon}</span>
      <div style={{ minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 9.5, color: 'var(--text-muted)' }}>{label}</p>
        {isEmail ? (
          <a href={`mailto:${value}`} style={{ fontSize: 12, fontWeight: 500, color: '#1D4ED8', textDecoration: 'none' }}>{value}</a>
        ) : isPhone ? (
          <a href={`tel:${value}`} style={{ fontSize: 12, fontWeight: 500, color: '#1D4ED8', textDecoration: 'none' }}>{value}</a>
        ) : (
          <p style={{
            margin: 0, fontSize: 12, fontWeight: 500,
            color: 'var(--text-primary)',
            fontFamily: mono ? 'monospace' : undefined,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {value}
          </p>
        )}
      </div>
    </div>
  )
}

function PFlag({ label, color }: { label: string; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0 }} />
      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{label}</span>
    </div>
  )
}

// ── Dept filter tab ───────────────────────────────────────────────────────────
function DeptTab({ dept, count, active, onClick }: { dept: string; count: number; active: boolean; onClick: () => void }) {
  const [h, setH] = React.useState(false)
  const cfg = getDept(dept === 'All' ? null : dept)
  return (
    <button onClick={onClick}
      onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        padding: '5px 12px', borderRadius: 20, flexShrink: 0,
        fontSize: 11.5, fontWeight: 500, cursor: 'pointer',
        background: active ? cfg.solid : h ? cfg.soft : 'transparent',
        color: active ? '#fff' : cfg.text,
        border: `1.5px solid ${active ? cfg.solid : h ? `${cfg.solid}60` : cfg.border}`,
        transition: 'all 150ms ease-out',
      }}>
      {dept !== 'All' && <span style={{ width: 6, height: 6, borderRadius: '50%', flexShrink: 0, background: active ? 'rgba(255,255,255,0.7)' : cfg.solid }} />}
      {dept === 'All' ? 'All' : dept.split(' & ')[0]}
      <span style={{ fontSize: 9.5, fontWeight: 700, padding: '0 4px', borderRadius: 10, background: active ? 'rgba(255,255,255,0.22)' : cfg.soft, color: active ? '#fff' : cfg.text }}>
        {count}
      </span>
    </button>
  )
}

// ── Toolbar buttons ───────────────────────────────────────────────────────────
function TBtn({ title, onClick, children }: { title: string; onClick: () => void; children: React.ReactNode }) {
  const [h, setH] = React.useState(false)
  return (
    <button title={title} onClick={onClick}
      onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{
        width: 32, height: 32, borderRadius: 8,
        border: '1px solid var(--surface-border)',
        background: h ? 'var(--surface-muted)' : 'var(--surface-base)',
        color: 'var(--text-secondary)', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 150ms ease-out', transform: h ? 'translateY(-1px)' : 'none',
        boxShadow: h ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
      }}>
      {children}
    </button>
  )
}

function TxtBtn({ label, onClick, borderLeft }: { label: string; onClick: () => void; borderLeft?: boolean }) {
  const [h, setH] = React.useState(false)
  return (
    <button onClick={onClick}
      onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{
        padding: '0 12px', height: 32, fontSize: 11.5, fontWeight: 500,
        border: 'none', cursor: 'pointer',
        background: h ? 'var(--surface-muted)' : 'var(--surface-base)',
        color: 'var(--text-secondary)',
        borderLeft: borderLeft ? '1px solid var(--surface-border)' : 'none',
        transition: 'background 150ms',
      }}>
      {label}
    </button>
  )
}

function ZBtn({ icon, onClick, borderLeft }: { icon: React.ReactNode; onClick: () => void; borderLeft?: boolean }) {
  const [h, setH] = React.useState(false)
  return (
    <button onClick={onClick}
      onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{
        width: 30, height: 32, border: 'none', cursor: 'pointer',
        background: h ? 'var(--surface-muted)' : 'var(--surface-base)',
        color: 'var(--text-secondary)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderLeft: borderLeft ? '1px solid var(--surface-border)' : 'none',
        transition: 'background 150ms',
      }}>
      {icon}
    </button>
  )
}

// ── Node Form Modal ───────────────────────────────────────────────────────────
function NodeFormModal({ open, mode, initial, parentNode, allNodes, profiles, onClose, onSave }: {
  open: boolean; mode: 'add' | 'edit'
  initial: Partial<OrgNode>; parentNode: OrgNode | null
  allNodes: OrgNode[]; profiles: ProfileOption[]
  onClose: () => void; onSave: (data: Partial<OrgNode>) => Promise<void>
}) {
  const [form, setForm] = React.useState<Partial<OrgNode>>(initial)
  const [saving, setSaving] = React.useState(false)
  React.useEffect(() => { setForm(initial) }, [initial, open])
  const set = (k: keyof OrgNode, v: unknown) => setForm(f => ({ ...f, [k]: v }))

  async function submit() {
    setSaving(true)
    try { await onSave(form); onClose() }
    catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Save failed') }
    finally { setSaving(false) }
  }

  return (
    <Modal open={open} onOpenChange={v => !v && onClose()}
      title={mode === 'add' ? `Add Position${parentNode ? ` under ${parentNode.full_name ?? parentNode.title}` : ''}` : 'Edit Position'}
      size="lg"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
          <Button variant="primary" size="sm" loading={saving} onClick={submit}>
            {mode === 'add' ? 'Add Position' : 'Save Changes'}
          </Button>
        </>
      }>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Input label="Full Name"      value={form.full_name ?? ''} onChange={e => set('full_name', e.target.value)}  placeholder="Ahmed Al Kharusi" />
          <Input label="Email"          value={form.email    ?? ''} onChange={e => set('email', e.target.value)}       placeholder="ahmed@ankaa.om"   />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Input label="Position Title" value={form.title ?? ''} onChange={e => set('title', e.target.value)} placeholder="Software Developer" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>Department</label>
            <select className="h-9 px-3 rounded-[var(--radius-md)] border text-sm"
              style={{ borderColor: 'var(--surface-border)', background: 'white' }}
              value={form.department ?? ''} onChange={e => set('department', e.target.value || null)}>
              <option value="">None</option>
              {DEPT_ORDER.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>Level</label>
            <select className="h-9 px-3 rounded-[var(--radius-md)] border text-sm"
              style={{ borderColor: 'var(--surface-border)', background: 'white' }}
              value={form.level ?? ''} onChange={e => set('level', e.target.value || null)}>
              <option value="">None</option>
              {Object.keys(LEVEL).map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>Reports To</label>
            <select className="h-9 px-3 rounded-[var(--radius-md)] border text-sm"
              style={{ borderColor: 'var(--surface-border)', background: 'white' }}
              value={form.parent_id ?? ''} onChange={e => set('parent_id', e.target.value || null)}>
              <option value="">Top Level</option>
              {allNodes.filter(n => n.id !== form.id).map(n => (
                <option key={n.id} value={n.id}>{n.full_name ?? n.title ?? n.id}</option>
              ))}
            </select>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>Link to Employee Profile (optional)</label>
          <select className="h-9 px-3 rounded-[var(--radius-md)] border text-sm"
            style={{ borderColor: 'var(--surface-border)', background: 'white' }}
            value={form.user_id ?? ''} onChange={e => set('user_id', e.target.value || null)}>
            <option value="">No profile linked</option>
            {profiles.map(p => <option key={p.id} value={p.id}>{p.full_name ?? p.email}{p.employee_id ? ` (${p.employee_id})` : ''}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', gap: 20 }}>
          {[
            { key: 'is_c_level',            label: 'C-Level'       },
            { key: 'is_head_of_department', label: 'Head of Dept'  },
            { key: 'can_direct_approve',    label: 'Can Approve'   },
          ].map(({ key, label }) => (
            <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', fontSize: 13 }}>
              <input type="checkbox" style={{ width: 14, height: 14 }}
                checked={!!(form[key as keyof OrgNode])}
                onChange={e => set(key as keyof OrgNode, e.target.checked ? 1 : 0)}
              />
              <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
            </label>
          ))}
        </div>
      </div>
    </Modal>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function OrgChartPage() {
  const { user }    = useAuth()
  const isAdmin     = user?.role === 'admin'

  const [nodes,      setNodes]      = React.useState<OrgNode[]>([])
  const [profiles,   setProfiles]   = React.useState<ProfileOption[]>([])
  const [loading,    setLoading]    = React.useState(true)
  const [search,     setSearch]     = React.useState('')
  const [selected,   setSelected]   = React.useState<TreeDatum | null>(null)
  const [editNode,   setEditNode]   = React.useState<OrgNode | null>(null)
  const [addParent,  setAddParent]  = React.useState<OrgNode | null>(null)
  const [deleteNode, setDeleteNode] = React.useState<OrgNode | null>(null)
  const [formOpen,   setFormOpen]   = React.useState(false)
  const [formMode,   setFormMode]   = React.useState<'add' | 'edit'>('add')
  const [deleting,   setDeleting]   = React.useState(false)
  const [deptFilter, setDeptFilter] = React.useState('All')
  const [collapsedIds, setCollapsedIds] = React.useState<Set<string>>(new Set())

  // D3 pan/zoom refs
  const canvasWrapRef = React.useRef<HTMLDivElement>(null)
  const innerRef      = React.useRef<HTMLDivElement>(null)
  const zoomBehavior  = React.useRef<d3.ZoomBehavior<HTMLDivElement, unknown> | null>(null)

  // ── Load data ───────────────────────────────────────────────────────────────
  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const [chart, prof] = await Promise.all([
        apiFetch<{ org_chart: OrgNode[] }>('/api/org-chart'),
        apiFetch<{ users: ProfileOption[] }>('/api/users'),
      ])
      setNodes(chart.org_chart ?? [])
      setProfiles(prof.users ?? [])
    } catch { toast.error('Failed to load org chart') }
    finally { setLoading(false) }
  }, [])

  React.useEffect(() => { load() }, [load])

  // ── D3 zoom setup ───────────────────────────────────────────────────────────
  React.useEffect(() => {
    if (!canvasWrapRef.current || !innerRef.current) return
    const zoom = d3.zoom<HTMLDivElement, unknown>()
      .scaleExtent([0.25, 2.5])
      .on('zoom', (event: d3.D3ZoomEvent<HTMLDivElement, unknown>) => {
        const { x, y, k } = event.transform
        if (innerRef.current) {
          innerRef.current.style.transform = `translate(${x}px, ${y}px) scale(${k})`
          innerRef.current.style.transformOrigin = '0 0'
        }
      })
    zoomBehavior.current = zoom
    const sel = d3.select(canvasWrapRef.current)
    sel.call(zoom)
    // Initial centering
    if (canvasWrapRef.current) {
      const { width, height } = canvasWrapRef.current.getBoundingClientRect()
      sel.call(zoom.transform, d3.zoomIdentity.translate(width / 2 - 400, 40).scale(0.85))
    }
    return () => { sel.on('.zoom', null) }
  }, [loading])

  function zoomBy(factor: number) {
    if (!canvasWrapRef.current || !zoomBehavior.current) return
    d3.select(canvasWrapRef.current).transition().duration(300).call(
      zoomBehavior.current.scaleBy, factor
    )
  }

  function resetZoom() {
    if (!canvasWrapRef.current || !zoomBehavior.current) return
    const { width } = canvasWrapRef.current.getBoundingClientRect()
    d3.select(canvasWrapRef.current).transition().duration(400).call(
      zoomBehavior.current.transform,
      d3.zoomIdentity.translate(width / 2 - 400, 40).scale(0.85)
    )
  }

  function collapseAll() {
    const parents = new Set(nodes.filter(n => nodes.some(c => c.parent_id === n.id)).map(n => n.id))
    setCollapsedIds(parents)
  }

  // ── Build tree + D3 layout ──────────────────────────────────────────────────
  const nodeMap  = React.useMemo(() => new Map(nodes.map(n => [n.id, n])), [nodes])
  const childMap = React.useMemo(() => {
    const m = new Map<string, OrgNode[]>()
    nodes.forEach(n => {
      const pid = n.parent_id ?? '__root__'
      if (!m.has(pid)) m.set(pid, [])
      m.get(pid)!.push(n)
    })
    return m
  }, [nodes])

  const deptCounts = React.useMemo(() => {
    const m: Record<string, number> = { All: nodes.length }
    nodes.forEach(n => { const d = n.department ?? 'Unknown'; m[d] = (m[d] ?? 0) + 1 })
    return m
  }, [nodes])

  const availableDepts = React.useMemo(() => {
    const s = new Set(nodes.map(n => n.department ?? 'Unknown'))
    return DEPT_ORDER.filter(d => s.has(d))
  }, [nodes])

  // Filter nodes by dept before building hierarchy
  const filteredNodes = React.useMemo(() => {
    if (deptFilter === 'All') return nodes
    // Keep a node if it is in the dept OR any of its descendants are
    const inDept = new Set(nodes.filter(n => n.department === deptFilter).map(n => n.id))
    function hasDescInDept(id: string): boolean {
      if (inDept.has(id)) return true
      return (childMap.get(id) ?? []).some(c => hasDescInDept(c.id))
    }
    return nodes.filter(n => hasDescInDept(n.id))
  }, [nodes, deptFilter, childMap])

  const hierarchyRoot = React.useMemo(() => buildHierarchy(filteredNodes, collapsedIds), [filteredNodes, collapsedIds])

  const layout = React.useMemo((): LayoutResult | null => {
    if (!hierarchyRoot) return null
    return computeLayout(hierarchyRoot, collapsedIds)
  }, [hierarchyRoot, collapsedIds])

  // ── Search highlight ────────────────────────────────────────────────────────
  const highlightedId = React.useMemo(() => {
    if (!search.trim()) return null
    const q = search.toLowerCase()
    return nodes.find(n =>
      n.full_name?.toLowerCase().includes(q) ||
      n.title?.toLowerCase().includes(q) ||
      n.email?.toLowerCase().includes(q) ||
      n.department?.toLowerCase().includes(q)
    )?.id ?? null
  }, [search, nodes])

  React.useEffect(() => {
    if (!highlightedId) return
    const el = document.getElementById(`org-node-${highlightedId}`)
    el?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' })
  }, [highlightedId])

  // ── CRUD ────────────────────────────────────────────────────────────────────
  const selectedParent  = selected ? (nodeMap.get(selected.parent_id ?? '') as TreeDatum | undefined ?? null) : null
  const selectedReports = selected ? (childMap.get(selected.id) ?? []).map(n => n as unknown as TreeDatum) : []

  function openAdd(parent: OrgNode | null) {
    setAddParent(parent); setEditNode(null); setFormMode('add'); setFormOpen(true)
  }
  function openEdit(node: OrgNode) {
    setEditNode(node); setAddParent(null); setFormMode('edit'); setFormOpen(true)
  }
  function toggleCollapse(id: string) {
    setCollapsedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  async function saveNode(data: Partial<OrgNode>) {
    if (formMode === 'edit' && editNode) {
      await apiFetch(`/api/org-chart/${editNode.id}`, { method: 'PATCH', body: JSON.stringify(data) })
      toast.success('Position updated')
    } else {
      await apiFetch('/api/org-chart', { method: 'POST', body: JSON.stringify({ node: { ...data, parent_id: addParent?.id ?? null } }) })
      toast.success('Position added')
    }
    await load(); setSelected(null)
  }

  async function confirmDelete() {
    if (!deleteNode) return
    setDeleting(true)
    try {
      await apiFetch(`/api/org-chart/${deleteNode.id}`, { method: 'DELETE' })
      toast.success(`${deleteNode.full_name ?? deleteNode.title} removed`)
      setDeleteNode(null); setSelected(null); await load()
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Delete failed') }
    finally { setDeleting(false) }
  }

  const formInitial: Partial<OrgNode> = formMode === 'edit' && editNode
    ? { ...editNode }
    : { parent_id: addParent?.id ?? null, is_c_level: 0, is_head_of_department: 0, can_direct_approve: 0, order: 0 }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', margin: '-24px -32px', height: 'calc(100vh - 60px)', position: 'relative' }}>

      {/* ── Toolbar ── */}
      <div style={{ flexShrink: 0, background: 'var(--surface-base)', borderBottom: '1px solid var(--surface-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px 12px', gap: 16 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>
              Organization Chart
            </h1>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
              Ankaa Science and Technology &mdash; {nodes.length} positions
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {isAdmin && (
              <Button variant="primary" size="sm" onClick={() => openAdd(null)}>
                <Plus size={14} /> Add Position
              </Button>
            )}
            <div style={{ display: 'flex', borderRadius: 8, border: '1px solid var(--surface-border)', overflow: 'hidden' }}>
              <TxtBtn label="Collapse All" onClick={collapseAll} />
              <TxtBtn label="Expand All"   onClick={() => setCollapsedIds(new Set())} borderLeft />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--surface-border)', borderRadius: 8, overflow: 'hidden' }}>
              <ZBtn icon={<Minus size={12} />} onClick={() => zoomBy(1 / 1.25)} />
              <ZBtn icon={<Plus  size={12} />} onClick={() => zoomBy(1.25)} borderLeft />
            </div>
            <TBtn title="Reset view"  onClick={resetZoom}><ArrowsOut size={14} /></TBtn>
            <TBtn title="Print chart" onClick={() => window.print()}><Printer size={14} /></TBtn>
          </div>
        </div>

        {/* Search + dept tabs */}
        <div style={{ padding: '0 24px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Input
            placeholder="Search by name, title, department..."
            value={search}
            onChange={e => { setSearch(e.target.value); setSelected(null) }}
            leftIcon={<MagnifyingGlass size={14} />}
            style={{ maxWidth: 300 }}
          />
          {!loading && availableDepts.length > 0 && (
            <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
              <DeptTab dept="All" count={deptCounts['All'] ?? 0} active={deptFilter === 'All'} onClick={() => setDeptFilter('All')} />
              {availableDepts.map(d => (
                <DeptTab key={d} dept={d} count={deptCounts[d] ?? 0} active={deptFilter === d} onClick={() => setDeptFilter(d)} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Canvas ── */}
      <div
        ref={canvasWrapRef}
        style={{
          flex: 1,
          overflow: 'hidden',
          cursor: 'grab',
          backgroundColor: '#F7F9FC',
          backgroundImage: 'radial-gradient(circle, #D1D9E6 1px, transparent 1px)',
          backgroundSize: '22px 22px',
          position: 'relative',
        }}
        onClick={e => { if (e.target === e.currentTarget) setSelected(null) }}
      >
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', border: '2.5px solid #E2E8F0', borderTopColor: '#1B2A5E', animation: 'spin 0.75s linear infinite' }} />
              <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>Loading org chart...</p>
            </div>
          </div>
        ) : !layout || layout.nodes.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 16 }}>
            <div style={{ width: 60, height: 60, borderRadius: 18, background: 'white', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(0,0,0,0.07)' }}>
              <UserCircle size={30} style={{ color: '#CBD5E1' }} />
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-secondary)', margin: 0 }}>No org chart yet</p>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '4px 0 0' }}>
                Run: <code style={{ background: '#F1F5F9', padding: '2px 6px', borderRadius: 4, fontSize: 11 }}>node scripts/seed-org-chart.js</code>
              </p>
            </div>
            {isAdmin && <Button variant="primary" size="md" onClick={() => openAdd(null)}><Plus size={14} /> Add First Position</Button>}
          </div>
        ) : (
          /* Inner canvas — transformed by D3 zoom */
          <div
            ref={innerRef}
            style={{ position: 'absolute', top: 0, left: 0, transformOrigin: '0 0', willChange: 'transform' }}
          >
            {/* SVG connector layer */}
            <svg
              style={{
                position: 'absolute', top: 0, left: 0, overflow: 'visible',
                width: layout.width, height: layout.height,
                pointerEvents: 'none', zIndex: 0,
              }}
            >
              <defs>
                <marker id="arrowhead" markerWidth="6" markerHeight="4" refX="6" refY="2" orient="auto">
                  <polygon points="0 0, 6 2, 0 4" fill="#CBD5E1" />
                </marker>
              </defs>
              {layout.links.map(link => (
                <path
                  key={link.id}
                  d={link.path}
                  fill="none"
                  stroke="#CBD5E1"
                  strokeWidth={1.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ))}
              {/* Highlight connector for selected node */}
              {selected && layout.links.filter(l => l.id.endsWith(`--${selected.id}`) || l.id.startsWith(`${selected.id}--`)).map(link => (
                <path
                  key={`hl-${link.id}`}
                  d={link.path}
                  fill="none"
                  stroke={getDept(selected.department).solid}
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={0.6}
                />
              ))}
            </svg>

            {/* HTML node layer */}
            <div style={{ position: 'relative', width: layout.width, height: layout.height, zIndex: 1 }}>
              {layout.nodes.map(pos => {
                const raw = nodes.find(n => n.id === pos.id)
                if (!raw) return null
                const datum: TreeDatum = { ...raw, _children: [] }
                const hasChildren = (childMap.get(pos.id) ?? []).length > 0

                return (
                  <div
                    key={pos.id}
                    style={{
                      position: 'absolute',
                      left: pos.x,
                      top:  pos.y,
                      width: CARD_W,
                      zIndex: selected?.id === pos.id ? 20 : 10,
                    }}
                  >
                    <NodeCard
                      node={datum}
                      selected={selected?.id === pos.id}
                      highlighted={highlightedId === pos.id}
                      collapsed={collapsedIds.has(pos.id)}
                      hasChildren={hasChildren}
                      isAdmin={isAdmin}
                      onSelect={n => setSelected(prev => prev?.id === n.id ? null : n)}
                      onEdit={openEdit}
                      onDelete={setDeleteNode}
                      onAddChild={openAdd}
                      onToggle={toggleCollapse}
                    />
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Detail Panel ── */}
      {selected && (
        <DetailPanel
          node={selected}
          parentNode={selectedParent}
          directReports={selectedReports}
          isAdmin={isAdmin}
          onClose={() => setSelected(null)}
          onEdit={openEdit}
          onDelete={setDeleteNode}
        />
      )}

      {/* ── Add / Edit Modal ── */}
      <NodeFormModal
        open={formOpen} mode={formMode}
        initial={formInitial}
        parentNode={formMode === 'add' ? addParent : null}
        allNodes={nodes} profiles={profiles}
        onClose={() => setFormOpen(false)}
        onSave={saveNode}
      />

      {/* ── Delete Confirm ── */}
      <Modal
        open={!!deleteNode} onOpenChange={v => !v && setDeleteNode(null)}
        title="Remove Position"
        description={deleteNode ? `Remove "${deleteNode.full_name ?? deleteNode.title}" from the org chart? Direct reports will be re-parented.` : ''}
        footer={
          <>
            <Button variant="secondary"   size="sm" onClick={() => setDeleteNode(null)}>Cancel</Button>
            <Button variant="destructive" size="sm" loading={deleting} onClick={confirmDelete}><Trash size={13} /> Remove</Button>
          </>
        }>
        {deleteNode && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 16, borderRadius: 12, background: '#FFF8F8', border: '1px solid #FEE2E2' }}>
            <OrgAvatar name={deleteNode.full_name} dept={deleteNode.department} size={44} />
            <div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#0F172A' }}>{deleteNode.full_name ?? deleteNode.title}</p>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748B' }}>{[deleteNode.title, deleteNode.department].filter(Boolean).join(' - ')}</p>
              {(childMap.get(deleteNode.id) ?? []).length > 0 && (
                <p style={{ margin: '6px 0 0', fontSize: 12, fontWeight: 500, color: '#B45309' }}>
                  {(childMap.get(deleteNode.id) ?? []).length} direct report(s) will be re-parented
                </p>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* ── Legend bar ── */}
      <div style={{
        flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12,
        padding: '8px 24px', background: 'var(--surface-base)',
        borderTop: '1px solid var(--surface-border)', overflowX: 'auto',
      }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-disabled)', letterSpacing: '0.1em', flexShrink: 0 }}>LEVELS</span>
        {Object.entries(LEVEL).map(([lv, cfg]) => (
          <span key={lv} style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 8px', borderRadius: 20, background: cfg.bg, color: cfg.fg, fontSize: 9, fontWeight: 600, flexShrink: 0 }}>
            {cfg.icon}{lv}
          </span>
        ))}
        <div style={{ width: 1, height: 16, background: 'var(--surface-border)', flexShrink: 0 }} />
        <svg width="40" height="16" style={{ flexShrink: 0 }}>
          <path d={elbowPath(20, 0, 20, 8) + ` H35 V16`} fill="none" stroke="#CBD5E1" strokeWidth={1.5} strokeLinecap="round" />
          <path d={elbowPath(20, 0, 5,  8) + ` V16`}     fill="none" stroke="#CBD5E1" strokeWidth={1.5} strokeLinecap="round" />
        </svg>
        <span style={{ fontSize: 10, color: 'var(--text-muted)', flexShrink: 0 }}>Reporting hierarchy</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 12, alignItems: 'center' }}>
          <span style={{ fontSize: 10, color: 'var(--text-disabled)' }}>
            {isAdmin ? 'Hover card to edit  ·  Click to view details' : 'Click a card to view employee details'}
          </span>
          <span style={{ fontSize: 10, color: 'var(--text-disabled)' }}>Scroll to pan  ·  Pinch or ctrl+scroll to zoom</span>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
