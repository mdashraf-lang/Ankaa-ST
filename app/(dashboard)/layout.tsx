"use client"

import * as React from "react"
import { Sidebar } from "@/components/layout/sidebar"
import { Topbar } from "@/components/layout/topbar"
import { ConfirmProvider } from "@/components/ui/confirm-dialog"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [collapsed, setCollapsed] = React.useState(false)

  // Persist sidebar state
  React.useEffect(() => {
    const stored = localStorage.getItem("sidebar-collapsed")
    if (stored !== null) setCollapsed(stored === "true")
  }, [])

  const handleToggle = () => {
    setCollapsed((prev) => {
      localStorage.setItem("sidebar-collapsed", String(!prev))
      return !prev
    })
  }

  return (
    <ConfirmProvider>
      <div
        className="flex h-screen overflow-hidden"
        style={{ background: "var(--surface-subtle)" }}
      >
        <Sidebar collapsed={collapsed} onToggle={handleToggle} />
        <div
          className="flex flex-col flex-1 overflow-hidden"
          style={{
            marginLeft: collapsed ? "56px" : "240px",
            transition: "margin 220ms cubic-bezier(0.16,1,0.3,1)",
          }}
        >
          <Topbar />
          <main
            className="flex-1 overflow-y-auto"
            style={{ padding: "24px 32px" }}
          >
            {children}
          </main>
        </div>
      </div>
    </ConfirmProvider>
  )
}
