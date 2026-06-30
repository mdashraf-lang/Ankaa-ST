"use client"

import * as React from "react"
import { Input, Textarea } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import type { LeaveRequest } from "@/lib/types"

type LeaveType = LeaveRequest["leave_type"]

interface LeaveRequestFormProps {
  onSubmit: (data: Partial<LeaveRequest>) => void
  onCancel?: () => void
  loading?: boolean
}

const leaveTypeOptions: { value: LeaveType; label: string }[] = [
  { value: "annual", label: "Annual Leave" },
  { value: "sick", label: "Sick Leave" },
  { value: "maternity", label: "Maternity Leave" },
  { value: "paternity", label: "Paternity Leave" },
  { value: "emergency", label: "Emergency Leave" },
  { value: "unpaid", label: "Unpaid Leave" },
  { value: "remote_work", label: "Remote Work" },
  { value: "official_trip", label: "Official Trip" },
  { value: "official_meeting", label: "Official Meeting" },
  { value: "other", label: "Other" },
]

export function LeaveRequestForm({
  onSubmit,
  onCancel,
  loading = false,
}: LeaveRequestFormProps) {
  const [form, setForm] = React.useState<{
    leave_type: LeaveType
    start_date: string
    end_date: string
    reason: string
    description: string
    half_day: boolean
    half_day_period: "am" | "pm"
  }>({
    leave_type: "annual",
    start_date: "",
    end_date: "",
    reason: "",
    description: "",
    half_day: false,
    half_day_period: "am",
  })

  const [errors, setErrors] = React.useState<Record<string, string>>({})
  const [file, setFile] = React.useState<File | null>(null)

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!form.start_date) errs.start_date = "Start date is required"
    if (!form.end_date) errs.end_date = "End date is required"
    if (form.start_date && form.end_date && form.start_date > form.end_date)
      errs.end_date = "End date must be after start date"
    if (!form.reason.trim()) errs.reason = "Reason is required"
    return errs
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    setErrors({})
    onSubmit({
      leave_type: form.leave_type,
      start_date: form.start_date,
      end_date: form.end_date,
      reason: form.reason,
      description: form.description || null,
    })
  }

  const selectClass =
    "h-9 px-3 rounded-[var(--radius-md)] border text-sm w-full focus:outline-none focus:ring-2 focus:ring-[#1B2A5E]"

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
      {/* Leave Type */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
          Leave Type
        </label>
        <select
          className={selectClass}
          style={{
            borderColor: "var(--surface-border)",
            background: "white",
            color: "var(--text-primary)",
          }}
          value={form.leave_type}
          onChange={(e) =>
            setForm((f) => ({ ...f, leave_type: e.target.value as LeaveType }))
          }
        >
          {leaveTypeOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {/* Dates */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Start Date"
          type="date"
          value={form.start_date}
          onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
          error={errors.start_date}
        />
        <Input
          label="End Date"
          type="date"
          value={form.end_date}
          onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))}
          error={errors.end_date}
          min={form.start_date}
        />
      </div>

      {/* Half day toggle */}
      <label className="flex items-center gap-3 cursor-pointer">
        <div
          className="relative w-10 h-5 rounded-full transition-colors duration-200 cursor-pointer"
          style={{
            background: form.half_day ? "var(--brand-navy)" : "var(--surface-border-strong)",
          }}
          onClick={() => setForm((f) => ({ ...f, half_day: !f.half_day }))}
          role="switch"
          aria-checked={form.half_day}
          tabIndex={0}
        >
          <span
            className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform duration-200"
            style={{ transform: form.half_day ? "translateX(20px)" : "translateX(0)" }}
          />
        </div>
        <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Half day
        </span>
        {form.half_day && (
          <div className="flex items-center gap-1 ml-2">
            {(["am", "pm"] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setForm((f) => ({ ...f, half_day_period: p }))}
                className="px-2.5 py-1 text-xs rounded-[var(--radius-sm)] font-medium transition-colors"
                style={{
                  background:
                    form.half_day_period === p
                      ? "var(--brand-navy)"
                      : "var(--surface-muted)",
                  color:
                    form.half_day_period === p ? "white" : "var(--text-secondary)",
                }}
              >
                {p.toUpperCase()}
              </button>
            ))}
          </div>
        )}
      </label>

      {/* Reason */}
      <Input
        label="Reason"
        type="text"
        value={form.reason}
        onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
        error={errors.reason}
        placeholder="Brief reason for leave"
      />

      {/* Description */}
      <Textarea
        label="Additional Details (optional)"
        value={form.description}
        onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
        placeholder="Provide any additional context or information"
        rows={3}
      />

      {/* Document upload for sick leave */}
      {form.leave_type === "sick" && (
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
            Supporting Document
          </label>
          <div
            className="border-2 border-dashed rounded-[var(--radius-lg)] p-6 text-center cursor-pointer transition-colors hover:border-[#1B2A5E]"
            style={{ borderColor: "var(--surface-border)" }}
            onClick={() => document.getElementById("doc-upload")?.click()}
          >
            <input
              id="doc-upload"
              type="file"
              className="hidden"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            {file ? (
              <p className="text-sm" style={{ color: "var(--text-primary)" }}>
                {file.name}
              </p>
            ) : (
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                Click to upload medical certificate (PDF, JPG, PNG)
              </p>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <Button type="submit" variant="primary" loading={loading}>
          Submit Request
        </Button>
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  )
}
