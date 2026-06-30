import * as React from "react"
import { Car, Gauge, WarningCircle } from "@phosphor-icons/react/dist/ssr"
import { StatusBadge } from "@/components/ui/status-badge"
import { formatDate } from "@/lib/utils"
import type { FleetVehicle } from "@/lib/types"

interface VehicleCardProps {
  vehicle: FleetVehicle
}

export function VehicleCard({ vehicle }: VehicleCardProps) {
  const isExpiringSOon =
    vehicle.registration_expiry_date &&
    new Date(vehicle.registration_expiry_date) <
      new Date(Date.now() + 30 * 86400000)

  return (
    <div
      className="rounded-[var(--radius-lg)] border p-4 flex flex-col gap-3 transition-all duration-[220ms] hover:shadow-md"
      style={{
        background: "var(--surface-base)",
        borderColor: "var(--surface-border)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div
          className="w-10 h-10 rounded-[var(--radius-md)] flex items-center justify-center flex-shrink-0"
          style={{ background: "var(--surface-muted)", color: "var(--text-secondary)" }}
        >
          <Car size={20} />
        </div>
        <StatusBadge status={vehicle.status} />
      </div>

      {/* Name + model */}
      <div>
        <h3
          className="text-sm font-semibold"
          style={{ color: "var(--text-primary)" }}
        >
          {vehicle.vehicle_name}
        </h3>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          {vehicle.model}
        </p>
      </div>

      {/* Plate */}
      <div
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[var(--radius-sm)] self-start font-mono text-xs font-bold"
        style={{
          background: "var(--brand-navy)",
          color: "white",
        }}
      >
        {vehicle.license_plate_alphabets} {vehicle.license_plate_number}
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 pt-1">
        <div className="flex items-center gap-1">
          <Gauge size={13} style={{ color: "var(--text-muted)" }} />
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            {vehicle.mileage.toLocaleString()} km
          </span>
        </div>
        <span
          className="text-xs px-1.5 py-0.5 rounded-full capitalize"
          style={{
            background:
              vehicle.category === "ankaa"
                ? "#EEF1F8"
                : vehicle.category === "gis"
                ? "#EFF4FF"
                : "#FFF8E6",
            color:
              vehicle.category === "ankaa"
                ? "#1B2A5E"
                : vehicle.category === "gis"
                ? "#2563EB"
                : "#E89B1A",
          }}
        >
          {vehicle.category.toUpperCase()}
        </span>
      </div>

      {/* Expiry warning */}
      {isExpiringSOon && (
        <div
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[var(--radius-md)] text-xs"
          style={{
            background: "var(--status-warning-bg)",
            color: "var(--status-warning)",
          }}
        >
          <WarningCircle size={13} />
          Reg. expires {formatDate(vehicle.registration_expiry_date!)}
        </div>
      )}
    </div>
  )
}
