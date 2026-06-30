"use client"

import * as React from "react"
import { Plus, Buildings, Users, WifiHigh, Desktop, Coffee } from "@phosphor-icons/react"
import { toast } from "sonner"
import { PageHeader } from "@/components/ui/page-header"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { Modal } from "@/components/ui/modal"
import { Input } from "@/components/ui/input"
import { StatusBadge } from "@/components/ui/status-badge"
import { EmptyState } from "@/components/ui/empty-state"
import { DataTable } from "@/components/ui/data-table"
import { formatDate } from "@/lib/utils"
import type { MeetingRoom, RoomBooking } from "@/lib/types"
import type { Column } from "@/components/ui/data-table"

const amenityIcons: Record<string, React.ReactNode> = {
  wifi: <WifiHigh size={13} />,
  projector: <Desktop size={13} />,
  coffee: <Coffee size={13} />,
}

function RoomCard({
  room,
  onBook,
}: {
  room: MeetingRoom
  onBook: (roomId: string) => void
}) {
  return (
    <div
      className="rounded-[var(--radius-lg)] border p-4 flex flex-col gap-3 transition-all duration-[220ms] hover:shadow-md"
      style={{
        background: "var(--surface-base)",
        borderColor: "var(--surface-border)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            {room.name}
          </h3>
          {room.floor && (
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Floor {room.floor}
            </p>
          )}
        </div>
        <StatusBadge status={room.is_active ? "active" : "inactive"} />
      </div>

      <div className="flex items-center gap-1.5">
        <Users size={13} style={{ color: "var(--text-muted)" }} />
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
          Capacity: {room.capacity}
        </span>
      </div>

      {room.amenities.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {room.amenities.map((a) => (
            <span
              key={a}
              className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs"
              style={{
                background: "var(--surface-muted)",
                color: "var(--text-secondary)",
              }}
            >
              {amenityIcons[a.toLowerCase()] ?? null}
              {a}
            </span>
          ))}
        </div>
      )}

      <Button
        variant="primary"
        size="sm"
        onClick={() => onBook(room.id)}
        disabled={!room.is_active}
        className="w-full mt-1"
      >
        Book Room
      </Button>
    </div>
  )
}

export default function FacilitiesPage() {
  const [rooms] = React.useState<MeetingRoom[]>([])
  const [bookings] = React.useState<RoomBooking[]>([])
  const [bookingModal, setBookingModal] = React.useState(false)
  const [selectedRoomId, setSelectedRoomId] = React.useState<string | null>(null)
  const [bookingForm, setBookingForm] = React.useState({
    title: "",
    start_time: "",
    end_time: "",
    attendees_count: "",
  })

  const handleBookRoom = (roomId: string) => {
    setSelectedRoomId(roomId)
    setBookingModal(true)
  }

  const handleSubmitBooking = async () => {
    try {
      await new Promise((r) => setTimeout(r, 500))
      toast.success("Room booked successfully")
      setBookingModal(false)
    } catch {
      toast.error("Failed to book room")
    }
  }

  const myUpcoming = bookings.filter(
    (b) => b.status !== "cancelled" && new Date(b.start_time) > new Date()
  )

  const bookingColumns: Column<RoomBooking>[] = [
    {
      key: "title",
      header: "Meeting Title",
      render: (v) => (
        <span className="font-medium" style={{ color: "var(--text-primary)" }}>
          {v as string}
        </span>
      ),
    },
    {
      key: "room_id",
      header: "Room",
      render: (v) => {
        const room = rooms.find((r) => r.id === v)
        return room?.name ?? (v as string)
      },
    },
    {
      key: "start_time",
      header: "Start",
      render: (v) => formatDate(v as string),
    },
    {
      key: "end_time",
      header: "End",
      render: (v) => formatDate(v as string),
    },
    {
      key: "attendees_count",
      header: "Attendees",
    },
    {
      key: "status",
      header: "Status",
      render: (v) => <StatusBadge status={v as string} />,
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Facilities"
        subtitle="Book meeting rooms and manage facility reservations"
        actions={
          <Button variant="primary" size="md" onClick={() => setBookingModal(true)}>
            <Plus size={16} />
            Book a Room
          </Button>
        }
      />

      {/* Room Cards */}
      <div>
        <h2
          className="text-sm font-semibold mb-3"
          style={{ color: "var(--text-secondary)" }}
        >
          Available Rooms
        </h2>
        {rooms.length === 0 ? (
          <EmptyState
            icon={<Buildings size={32} />}
            title="No rooms configured"
            description="Meeting rooms will appear here once added by an administrator."
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {rooms.map((room) => (
              <RoomCard key={room.id} room={room} onBook={handleBookRoom} />
            ))}
          </div>
        )}
      </div>

      {/* My upcoming bookings */}
      <Card>
        <CardHeader>
          <CardTitle>My Upcoming Bookings</CardTitle>
        </CardHeader>
        <DataTable
          columns={bookingColumns}
          data={myUpcoming}
          emptyIcon={<Buildings size={28} />}
          emptyTitle="No upcoming bookings"
          emptyDescription="Your confirmed room bookings will appear here."
        />
      </Card>

      {/* Booking Modal */}
      <Modal
        open={bookingModal}
        onOpenChange={setBookingModal}
        title="Book a Room"
        description="Reserve a meeting room for your event."
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setBookingModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleSubmitBooking}>
              Confirm Booking
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          {!selectedRoomId && rooms.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                Room
              </label>
              <select
                className="h-9 px-3 rounded-[var(--radius-md)] border text-sm w-full"
                style={{
                  borderColor: "var(--surface-border)",
                  background: "white",
                  color: "var(--text-primary)",
                }}
                value={selectedRoomId ?? ""}
                onChange={(e) => setSelectedRoomId(e.target.value)}
              >
                <option value="">Select a roomâ€¦</option>
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} (capacity: {r.capacity})
                  </option>
                ))}
              </select>
            </div>
          )}
          <Input
            label="Meeting Title"
            value={bookingForm.title}
            onChange={(e) => setBookingForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="e.g. Weekly stand-up"
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Start Time"
              type="datetime-local"
              value={bookingForm.start_time}
              onChange={(e) =>
                setBookingForm((f) => ({ ...f, start_time: e.target.value }))
              }
            />
            <Input
              label="End Time"
              type="datetime-local"
              value={bookingForm.end_time}
              onChange={(e) =>
                setBookingForm((f) => ({ ...f, end_time: e.target.value }))
              }
            />
          </div>
          <Input
            label="Number of Attendees"
            type="number"
            min="1"
            value={bookingForm.attendees_count}
            onChange={(e) =>
              setBookingForm((f) => ({ ...f, attendees_count: e.target.value }))
            }
          />
        </div>
      </Modal>
    </div>
  )
}

