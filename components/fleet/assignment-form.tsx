"use client"

import * as React from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

interface AssignmentFormProps {
  onSubmit: (data: { driverId: string; vehicleId: string; startDate: string; notes: string }) => void
  onCancel?: () => void
  loading?: boolean
}

export function AssignmentForm({ onSubmit, onCancel, loading }: AssignmentFormProps) {
  const [form, setForm] = React.useState({
    driverId: "",
    vehicleId: "",
    startDate: "",
    notes: "",
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(form)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input
        label="Driver"
        value={form.driverId}
        onChange={(e) => setForm((f) => ({ ...f, driverId: e.target.value }))}
        placeholder="Select driver ID"
      />
      <Input
        label="Vehicle"
        value={form.vehicleId}
        onChange={(e) => setForm((f) => ({ ...f, vehicleId: e.target.value }))}
        placeholder="Select vehicle ID"
      />
      <Input
        label="Start Date"
        type="date"
        value={form.startDate}
        onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
      />
      <Input
        label="Notes (optional)"
        value={form.notes}
        onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
        placeholder="Any additional notes"
      />
      <div className="flex gap-2 pt-2">
        <Button type="submit" variant="primary" loading={loading}>
          Assign Vehicle
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
