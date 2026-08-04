import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground selection:bg-blue-500 selection:text-white h-12 w-full min-w-0 rounded-full border-0 bg-slate-100 px-5 py-3 text-base transition-colors outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "focus:bg-slate-50 focus:ring-2 focus:ring-blue-500/30",
        "aria-invalid:ring-red-500/20",
        className
      )}
      {...props}
    />
  )
}

export { Input }
