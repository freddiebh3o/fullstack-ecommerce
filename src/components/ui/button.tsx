// src/components/ui/button.tsx
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils/misc"

const buttonVariants = cva(
  // base
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-[var(--ring)] focus-visible:ring-[color-mix(in_oklab,var(--ring),transparent_50%)] focus-visible:ring-[3px] aria-invalid:ring-[color-mix(in_oklab,var(--destructive),transparent_80%)] dark:aria-invalid:ring-[color-mix(in_oklab,var(--destructive),transparent_60%)] aria-invalid:border-[var(--destructive)]",
  {
    variants: {
      variant: {
        // use brand tokens (mapped in admin-theme.css and at :root fallback)
        default:
          "bg-[var(--primary)] text-[var(--header-title)] shadow-xs hover:bg-[var(--primary-hover)]",
        destructive:
          "bg-[var(--destructive)] text-white shadow-xs hover:bg-[color-mix(in_oklab,var(--destructive),black_10%)] focus-visible:ring-[color-mix(in_oklab,var(--destructive),transparent_80%)] dark:focus-visible:ring-[color-mix(in_oklab,var(--destructive),transparent_60%)]",
        outline:
          "border bg-[var(--background)] text-[var(--foreground)] shadow-xs hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)] dark:bg-[color-mix(in_oklab,var(--background),var(--input)_30%)] dark:border-[var(--input)] dark:hover:bg-[color-mix(in_oklab,var(--background),var(--input)_50%)]",
        secondary:
          "bg-[var(--secondary)] text-[var(--secondary-foreground)] shadow-xs hover:bg-[var(--secondary-hover)]",
        ghost:
          "hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)] dark:hover:bg-[color-mix(in_oklab,var(--accent),transparent_50%)]",
        link:
          "text-[var(--primary)] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
