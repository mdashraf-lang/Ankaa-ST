"use client"

import * as React from "react"
import * as RadixAvatar from "@radix-ui/react-avatar"
import { cn } from "@/lib/utils"
import { getInitials } from "@/lib/utils"

interface AvatarProps {
  src?: string | null
  name?: string | null
  size?: "xs" | "sm" | "md" | "lg" | "xl"
  className?: string
}

const sizeClasses = {
  xs: "w-6 h-6 text-[10px]",
  sm: "w-8 h-8 text-xs",
  md: "w-9 h-9 text-sm",
  lg: "w-12 h-12 text-base",
  xl: "w-16 h-16 text-lg",
}

export function Avatar({ src, name, size = "md", className }: AvatarProps) {
  const initials = name ? getInitials(name) : "?"

  return (
    <RadixAvatar.Root
      className={cn(
        "relative flex shrink-0 overflow-hidden rounded-full",
        sizeClasses[size],
        className
      )}
    >
      {src && (
        <RadixAvatar.Image
          src={src}
          alt={name ?? "Avatar"}
          className="aspect-square h-full w-full object-cover"
        />
      )}
      <RadixAvatar.Fallback
        className="flex h-full w-full items-center justify-center rounded-full font-semibold text-white"
        style={{ background: "var(--brand-navy)" }}
      >
        {initials}
      </RadixAvatar.Fallback>
    </RadixAvatar.Root>
  )
}

interface AvatarGroupProps {
  avatars: Array<{ src?: string | null; name?: string | null }>
  max?: number
  size?: "xs" | "sm" | "md"
}

export function AvatarGroup({ avatars, max = 4, size = "sm" }: AvatarGroupProps) {
  const visible = avatars.slice(0, max)
  const overflow = avatars.length - max

  return (
    <div className="flex -space-x-2">
      {visible.map((av, i) => (
        <Avatar
          key={i}
          src={av.src}
          name={av.name}
          size={size}
          className="ring-2 ring-white"
        />
      ))}
      {overflow > 0 && (
        <div
          className={cn(
            "flex items-center justify-center rounded-full ring-2 ring-white text-xs font-semibold",
            sizeClasses[size]
          )}
          style={{
            background: "var(--surface-muted)",
            color: "var(--text-secondary)",
          }}
        >
          +{overflow}
        </div>
      )}
    </div>
  )
}
