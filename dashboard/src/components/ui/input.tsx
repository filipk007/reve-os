import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-9 w-full min-w-0 rounded-md border border-clay-500 bg-clay-900 px-3 py-1 text-base text-clay-100 shadow-[inset_0_1px_3px_rgba(0,0,0,0.4)] transition-[color,box-shadow] duration-150 outline-none selection:bg-primary/30 selection:text-primary-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-clay-300 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:border-kiln-teal focus-visible:shadow-[0_0_0_3px_rgba(74,158,173,0.2),inset_0_1px_3px_rgba(0,0,0,0.4)]",
        "aria-invalid:border-destructive aria-invalid:ring-destructive/20",
        className
      )}
      {...props}
    />
  )
}

export { Input }
