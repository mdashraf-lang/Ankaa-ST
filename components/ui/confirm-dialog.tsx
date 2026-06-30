"use client"

import * as React from "react"
import * as Dialog from "@radix-ui/react-dialog"
import { Warning } from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"

// ── Types ─────────────────────────────────────────────────────────────────────

interface ConfirmOptions {
  title?: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  /** defaults to "destructive" */
  variant?: "destructive" | "primary"
}

interface ConfirmState extends ConfirmOptions {
  open: boolean
  resolve: ((confirmed: boolean) => void) | null
}

// ── Context ───────────────────────────────────────────────────────────────────

const ConfirmContext = React.createContext<
  ((options: ConfirmOptions) => Promise<boolean>) | null
>(null)

// ── Provider ──────────────────────────────────────────────────────────────────

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<ConfirmState>({
    open: false,
    message: "",
    resolve: null,
  })

  const confirm = React.useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({ ...options, open: true, resolve })
    })
  }, [])

  function handleConfirm() {
    state.resolve?.(true)
    setState((s) => ({ ...s, open: false, resolve: null }))
  }

  function handleCancel() {
    state.resolve?.(false)
    setState((s) => ({ ...s, open: false, resolve: null }))
  }

  const variant = state.variant ?? "destructive"

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}

      <Dialog.Root open={state.open} onOpenChange={(open) => { if (!open) handleCancel() }}>
        <Dialog.Portal>
          <Dialog.Overlay
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
          />
          <Dialog.Content
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 mx-4 rounded-[var(--radius-xl)] border shadow-lg p-0 overflow-hidden data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-1/2 data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-1/2"
            style={{ background: "var(--surface-base)", borderColor: "var(--surface-border)" }}
          >
            {/* Icon header strip */}
            <div
              className="flex items-center justify-center pt-6 pb-3"
            >
              <div
                className="w-11 h-11 rounded-full flex items-center justify-center"
                style={{
                  background: variant === "destructive" ? "var(--status-error-bg)" : "var(--status-info-bg)",
                }}
              >
                <Warning
                  size={22}
                  weight="fill"
                  style={{ color: variant === "destructive" ? "var(--status-error)" : "var(--status-info)" }}
                />
              </div>
            </div>

            {/* Body */}
            <div className="px-6 pb-2 text-center">
              {state.title && (
                <Dialog.Title
                  className="text-sm font-semibold mb-1"
                  style={{ color: "var(--text-primary)" }}
                >
                  {state.title}
                </Dialog.Title>
              )}
              <Dialog.Description
                className="text-sm leading-relaxed"
                style={{ color: "var(--text-secondary)" }}
              >
                {state.message}
              </Dialog.Description>
            </div>

            {/* Divider */}
            <div className="mx-6 mt-4 mb-0 h-px" style={{ background: "var(--surface-border)" }} />

            {/* Footer */}
            <div className="flex divide-x" style={{ borderColor: "var(--surface-border)" }}>
              <button
                onClick={handleCancel}
                className="flex-1 py-3.5 text-sm font-medium transition-colors"
                style={{ color: "var(--text-secondary)" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-muted)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                {state.cancelLabel ?? "Cancel"}
              </button>
              <div className="w-px" style={{ background: "var(--surface-border)" }} />
              <button
                onClick={handleConfirm}
                className="flex-1 py-3.5 text-sm font-semibold transition-colors"
                style={{
                  color: variant === "destructive" ? "var(--status-error)" : "var(--status-info)",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-muted)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                {state.confirmLabel ?? (variant === "destructive" ? "Delete" : "Confirm")}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </ConfirmContext.Provider>
  )
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useConfirm() {
  const ctx = React.useContext(ConfirmContext)
  if (!ctx) throw new Error("useConfirm must be used inside <ConfirmProvider>")
  return ctx
}
