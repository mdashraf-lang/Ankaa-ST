"use client"

import * as React from "react"
import * as Dialog from "@radix-ui/react-dialog"
import { X } from "@phosphor-icons/react"
import { cn } from "@/lib/utils"

interface ModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children: React.ReactNode
  footer?: React.ReactNode
  size?: "sm" | "md" | "lg" | "xl"
}

const sizeClasses = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-2xl",
}

export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  size = "md",
}: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-50 w-full -translate-x-1/2 -translate-y-1/2 rounded-[var(--radius-xl)] border p-6 shadow-lg",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
            "data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-1/2",
            "data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-1/2",
            sizeClasses[size],
            "mx-4"
          )}
          style={{
            background: "var(--surface-base)",
            borderColor: "var(--surface-border)",
          }}
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <Dialog.Title
                className="text-base font-semibold"
                style={{ color: "var(--text-primary)" }}
              >
                {title}
              </Dialog.Title>
              {description && (
                <Dialog.Description
                  className="text-sm mt-0.5"
                  style={{ color: "var(--text-muted)" }}
                >
                  {description}
                </Dialog.Description>
              )}
            </div>
            <Dialog.Close
              className="flex items-center justify-center w-8 h-8 rounded-[var(--radius-md)] transition-colors hover:bg-[#F1F3F7]"
              style={{ color: "var(--text-muted)" }}
            >
              <X size={16} />
              <span className="sr-only">Close</span>
            </Dialog.Close>
          </div>

          <div className="overflow-y-auto max-h-[70vh]">{children}</div>

          {footer && (
            <div
              className="flex items-center justify-end gap-2 mt-5 pt-4 border-t"
              style={{ borderColor: "var(--surface-border)" }}
            >
              {footer}
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
