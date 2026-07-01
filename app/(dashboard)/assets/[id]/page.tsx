"use client"

import * as React from "react"
import { use } from "react"
import Link from "next/link"
import { ArrowLeft, UploadSimple, Package, ArrowsLeftRight } from "@phosphor-icons/react"
import { PageHeader } from "@/components/ui/page-header"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { StatusBadge } from "@/components/ui/status-badge"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/ui/data-table"
import { EmptyState } from "@/components/ui/empty-state"
import { formatDate, formatCurrency } from "@/lib/utils"
import { apiFetch } from "@/lib/api"
import { toast } from "sonner"
import type { Asset, AssetMovement } from "@/lib/types"
import type { Column } from "@/components/ui/data-table"

type TabKey = "overview" | "movement" | "attachments" | "depreciation"

type AssetDetail = Asset & {
  category_name?: string | null
  company_name?: string | null
  location_name?: string | null
  vendor_name?: string | null
  assigned_to_name?: string | null
}

type MovementRow = AssetMovement & { moved_by_name?: string | null }

export default function AssetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const [activeTab, setActiveTab] = React.useState<TabKey>("overview")
  const [asset, setAsset] = React.useState<AssetDetail | null>(null)
  const [movements, setMovements] = React.useState<MovementRow[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const [assetRes, movRes] = await Promise.all([
          apiFetch<{ asset: AssetDetail }>(`/api/assets/${id}`),
          apiFetch<{ movements: MovementRow[] }>('/api/assets/movements'),
        ])
        setAsset(assetRes.asset)
        // Filter movements for this asset
        setMovements((movRes.movements ?? []).filter((m) => m.asset_id === id))
      } catch {
        toast.error('Failed to load asset details')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  const tabs: { key: TabKey; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "movement", label: "Movement History" },
    { key: "attachments", label: "Attachments" },
    { key: "depreciation", label: "Depreciation" },
  ]

  const movementColumns: Column<MovementRow>[] = [
    {
      key: "moved_at",
      header: "Date",
      render: (v) => formatDate(v as string),
    },
    { key: "from_location", header: "From", render: (v) => (v as string | null) ?? "—" },
    { key: "to_location", header: "To", render: (v) => (v as string | null) ?? "—" },
    {
      key: "moved_by_name",
      header: "Moved By",
      render: (v, row) => (v as string | null) ?? row.moved_by ?? "—",
    },
    { key: "notes", header: "Notes", render: (v) => (v as string | null) ?? "—" },
  ]

  const depreciation = asset?.purchase_price && asset?.current_value
    ? {
        amount: asset.purchase_price - asset.current_value,
        percent: ((asset.purchase_price - asset.current_value) / asset.purchase_price) * 100,
      }
    : null

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <span className="text-sm" style={{ color: "var(--text-muted)" }}>Loading…</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 max-w-5xl">
      <PageHeader
        title={asset?.name ?? "Asset Details"}
        breadcrumb={
          <Link
            href="/assets"
            className="flex items-center gap-1.5 text-sm hover:underline"
            style={{ color: "var(--text-muted)" }}
          >
            <ArrowLeft size={14} />
            Back to Assets
          </Link>
        }
        actions={asset ? <StatusBadge status={asset.status} /> : undefined}
      />

      {/* Tabs */}
      <div className="flex border-b" style={{ borderColor: "var(--surface-border)" }}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors"
            style={{
              borderColor: activeTab === tab.key ? "var(--brand-navy)" : "transparent",
              color: activeTab === tab.key ? "var(--brand-navy)" : "var(--text-muted)",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Asset Information</CardTitle>
            </CardHeader>
            <div className="grid grid-cols-2 gap-x-8 gap-y-4">
              {[
                { label: "Asset ID", value: asset?.asset_id },
                { label: "Name", value: asset?.name },
                { label: "Category", value: asset?.category_name ?? asset?.category_id },
                { label: "Company", value: asset?.company_name ?? asset?.company_id },
                { label: "Location", value: asset?.location_name ?? asset?.location_id },
                { label: "Vendor", value: asset?.vendor_name ?? asset?.vendor_id },
                { label: "Assigned To", value: asset?.assigned_to_name },
                { label: "Serial Number", value: asset?.serial_number },
                { label: "Status", value: asset?.status, isBadge: true },
                { label: "Condition", value: asset?.condition?.replace("_", " ") },
                { label: "Purchase Date", value: asset?.purchase_date ? formatDate(asset.purchase_date) : undefined },
                { label: "Purchase Price", value: asset?.purchase_price != null ? formatCurrency(asset.purchase_price) : undefined },
                { label: "Current Value", value: asset?.current_value != null ? formatCurrency(asset.current_value) : undefined },
              ].map((f) => (
                <div key={f.label} className="flex flex-col gap-0.5">
                  <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
                    {f.label}
                  </span>
                  {f.isBadge && f.value ? (
                    <StatusBadge status={f.value} />
                  ) : (
                    <span className="text-sm capitalize" style={{ color: "var(--text-primary)" }}>
                      {f.value ?? "—"}
                    </span>
                  )}
                </div>
              ))}
            </div>
            {asset?.notes && (
              <div className="mt-4 pt-4 border-t" style={{ borderColor: "var(--surface-border)" }}>
                <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Notes</span>
                <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>{asset.notes}</p>
              </div>
            )}
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <div className="flex flex-col gap-2">
              <Button variant="secondary" size="md" className="w-full justify-start">
                Assign Asset
              </Button>
              <Button variant="secondary" size="md" className="w-full justify-start">
                Schedule Maintenance
              </Button>
              <Button variant="secondary" size="md" className="w-full justify-start">
                <UploadSimple size={16} />
                Upload Document
              </Button>
            </div>
          </Card>
        </div>
      )}

      {activeTab === "movement" && (
        <DataTable
          columns={movementColumns}
          data={movements}
          emptyIcon={<ArrowsLeftRight size={28} />}
          emptyTitle="No movement history"
          emptyDescription="Asset movements and transfers will be tracked here."
        />
      )}

      {activeTab === "attachments" && (
        <Card>
          <CardHeader>
            <CardTitle>Attachments</CardTitle>
            <Button variant="secondary" size="sm">
              <UploadSimple size={14} />
              Upload File
            </Button>
          </CardHeader>
          <EmptyState
            icon={<Package size={28} />}
            title="No attachments"
            description="Upload documents, warranties, or receipts for this asset."
            action={
              <Button variant="secondary" size="sm">
                <UploadSimple size={14} />
                Upload File
              </Button>
            }
          />
        </Card>
      )}

      {activeTab === "depreciation" && (
        <Card>
          <CardHeader>
            <CardTitle>Depreciation</CardTitle>
          </CardHeader>
          {!asset?.purchase_price ? (
            <EmptyState
              icon={<Package size={28} />}
              title="No purchase data"
              description="Add purchase price to calculate depreciation."
            />
          ) : (
            <div className="flex flex-col gap-6">
              <div className="grid grid-cols-3 gap-6">
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
                    Purchase Price
                  </span>
                  <span className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
                    {formatCurrency(asset.purchase_price)}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
                    Current Value
                  </span>
                  <span className="text-xl font-bold" style={{ color: "var(--status-success)" }}>
                    {asset.current_value != null ? formatCurrency(asset.current_value) : "—"}
                  </span>
                </div>
                {depreciation && (
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
                      Total Depreciation
                    </span>
                    <span className="text-xl font-bold" style={{ color: "var(--status-error)" }}>
                      -{formatCurrency(depreciation.amount)}
                    </span>
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                      {depreciation.percent.toFixed(1)}% of purchase price
                    </span>
                  </div>
                )}
              </div>

              {depreciation && (
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between text-xs" style={{ color: "var(--text-muted)" }}>
                    <span>Current value</span>
                    <span>{(100 - depreciation.percent).toFixed(1)}% retained</span>
                  </div>
                  <div
                    className="h-3 rounded-full overflow-hidden"
                    style={{ background: "var(--surface-muted)" }}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${100 - depreciation.percent}%`,
                        background: "var(--status-success)",
                      }}
                    />
                  </div>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    Calculation method: Straight-line depreciation based on purchase price and current value.
                  </p>
                </div>
              )}
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
