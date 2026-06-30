import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-[#F1F3F7] text-[#4A5366]",
        success: "bg-[#EDFBF3] text-[#10A854]",
        warning: "bg-[#FFF8E6] text-[#E89B1A]",
        error: "bg-[#FFF0F0] text-[#D63C3C]",
        info: "bg-[#EFF4FF] text-[#2563EB]",
        pending: "bg-[#FFF8E6] text-[#E89B1A]",
        navy: "bg-[#1B2A5E] text-white",
        gold: "bg-[#C9A227] text-white",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props}>
      {children}
    </span>
  )
}

export { Badge, badgeVariants }
