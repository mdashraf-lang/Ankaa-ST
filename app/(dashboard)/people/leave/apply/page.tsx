"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "@phosphor-icons/react"
import { toast } from "sonner"
import { PageHeader } from "@/components/ui/page-header"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { LeaveRequestForm } from "@/components/people/leave-request-form"
import { apiFetch } from "@/lib/api"
import type { LeaveRequest } from "@/lib/types"
import Link from "next/link"

export default function ApplyLeavePage() {
  const router = useRouter()
  const [loading, setLoading] = React.useState(false)

  const handleSubmit = async (data: Partial<LeaveRequest>) => {
    setLoading(true)
    try {
      await apiFetch('/api/leave-requests', {
        method: 'POST',
        body: JSON.stringify(data),
      })
      toast.success("Leave request submitted successfully")
      router.push("/people/leave")
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to submit leave request'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <PageHeader
        title="Apply for Leave"
        breadcrumb={
          <Link
            href="/people/leave"
            className="flex items-center gap-1.5 text-sm hover:underline"
            style={{ color: "var(--text-muted)" }}
          >
            <ArrowLeft size={14} />
            Back to Leave
          </Link>
        }
      />

      <Card>
        <LeaveRequestForm
          onSubmit={handleSubmit}
          onCancel={() => router.push("/people/leave")}
          loading={loading}
        />
      </Card>
    </div>
  )
}
