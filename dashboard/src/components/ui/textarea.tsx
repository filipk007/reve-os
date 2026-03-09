import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-16 w-full rounded-md border border-clay-500 bg-clay-900 px-3 py-2 text-base text-clay-100 shadow-[inset_0_1px_3px_rgba(0,0,0,0.4)] transition-[color,box-shadow] duration-150 outline-none placeholder:text-clay-300 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:border-kiln-teal focus-visible:shadow-[0_0_0_3px_rgba(74,158,173,0.2),inset_0_1px_3px_rgba(0,0,0,0.4)]",
        "aria-invalid:border-destructive aria-invalid:ring-destructive/20",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
