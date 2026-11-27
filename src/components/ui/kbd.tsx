import type { ComponentProps } from "react"
import { cn } from "@/lib/utils"

/** Small keyboard-hint chip used in footers and hints. */
export function Kbd({ className, ...props }: ComponentProps<"kbd">) {
  return (
    <kbd
      className={cn(
        "pointer-events-none inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-md border border-line-strong bg-raised-2 px-1 font-sans text-[10px] font-medium text-ink-muted",
        className,
      )}
      {...props}
    />
  )
}
