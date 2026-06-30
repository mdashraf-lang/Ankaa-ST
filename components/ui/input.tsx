import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  required?: boolean
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, leftIcon, rightIcon, required, id, ...props }, ref) => {
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
        <div className="relative flex items-center">
          {leftIcon && (
            <span
              className="absolute left-3 flex items-center pointer-events-none"
              style={{ color: "var(--text-muted)" }}
            >
              {leftIcon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              "w-full h-9 rounded-[var(--radius-md)] border text-sm transition-all duration-[220ms]",
              "focus:outline-none focus:ring-2 focus:ring-[#1B2A5E] focus:ring-offset-0 focus:border-[#1B2A5E]",
              "placeholder:text-[#A8B0BF]",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              leftIcon ? "pl-9" : "pl-3",
              rightIcon ? "pr-9" : "pr-3",
              error
                ? "border-[#D63C3C] bg-[#FFF0F0]"
                : "border-[#E4E7ED] bg-white",
              className
            )}
            style={{ color: "var(--text-primary)" }}
            aria-describedby={
              error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined
            }
            aria-invalid={error ? true : undefined}
            {...props}
          />
          {rightIcon && (
            <span
              className="absolute right-3 flex items-center"
              style={{ color: "var(--text-muted)" }}
            >
              {rightIcon}
            </span>
          )}
        </div>
        {error && (
          <p
            id={`${inputId}-error`}
            className="text-xs"
            style={{ color: "var(--status-error)" }}
          >
            {error}
          </p>
        )}
        {hint && !error && (
          <p
            id={`${inputId}-hint`}
            className="text-xs"
            style={{ color: "var(--text-muted)" }}
          >
            {hint}
          </p>
        )}
      </div>
    )
  }
)
Input.displayName = "Input"

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  hint?: string
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, hint, id, ...props }, ref) => {
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
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          className={cn(
            "w-full rounded-[var(--radius-md)] border text-sm p-3 transition-all duration-[220ms] resize-y min-h-[80px]",
            "focus:outline-none focus:ring-2 focus:ring-[#1B2A5E] focus:ring-offset-0 focus:border-[#1B2A5E]",
            "placeholder:text-[#A8B0BF]",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            error
              ? "border-[#D63C3C] bg-[#FFF0F0]"
              : "border-[#E4E7ED] bg-white",
            className
          )}
          style={{ color: "var(--text-primary)" }}
          aria-invalid={error ? true : undefined}
          {...props}
        />
        {error && (
          <p className="text-xs" style={{ color: "var(--status-error)" }}>
            {error}
          </p>
        )}
        {hint && !error && (
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            {hint}
          </p>
        )}
      </div>
    )
  }
)
Textarea.displayName = "Textarea"

export { Input, Textarea }
