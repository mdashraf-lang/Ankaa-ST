"use client"

import * as React from "react"
import { CaretDown } from "@phosphor-icons/react"
import { cn } from "@/lib/utils"

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  hint?: string
  required?: boolean
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, hint, required, id, children, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-")
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium"
            style={{ color: "var(--text-primary)" }}
          >
            {label}
            {required && (
              <span className="ml-0.5" style={{ color: "var(--status-error)" }}>*</span>
            )}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={inputId}
            className={cn(
              "w-full h-9 rounded-[var(--radius-md)] border text-sm transition-all duration-[220ms]",
              "appearance-none pl-3 pr-8",
              "focus:outline-none focus:ring-2 focus:ring-[#1B2A5E] focus:ring-offset-0 focus:border-[#1B2A5E]",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              error
                ? "border-[#D63C3C] bg-[#FFF0F0]"
                : "border-[#E4E7ED] bg-white",
              className
            )}
            style={{ color: "var(--text-primary)" }}
            aria-invalid={error ? true : undefined}
            aria-describedby={
              error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined
            }
            {...props}
          >
            {children}
          </select>
          <CaretDown
            size={12}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: "var(--text-muted)" }}
          />
        </div>
        {error && (
          <p id={`${inputId}-error`} className="text-xs" style={{ color: "var(--status-error)" }}>
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={`${inputId}-hint`} className="text-xs" style={{ color: "var(--text-muted)" }}>
            {hint}
          </p>
        )}
      </div>
    )
  }
)
Select.displayName = "Select"

export { Select }
