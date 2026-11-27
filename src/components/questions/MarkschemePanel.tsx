import { useState } from "react"
import { Eye, EyeOff } from "lucide-react"
import { cn } from "@/lib/utils"
import { MathDisplay } from "./MathDisplay"

interface MarkschemePanelProps {
  markscheme: string | null
  className?: string
  defaultOpen?: boolean
  /** Controlled mode: when provided, the parent owns the open state. */
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function MarkschemePanel({
  markscheme,
  className,
  defaultOpen = false,
  open: controlledOpen,
  onOpenChange,
}: MarkschemePanelProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen)
  const open = controlledOpen ?? internalOpen
  const setOpen = (next: boolean) => {
    if (controlledOpen === undefined) setInternalOpen(next)
    onOpenChange?.(next)
  }
  const available = Boolean(markscheme && markscheme.trim())

  return (
    <div className={cn("pointer-events-auto relative z-20", className)}>
      <button
        type="button"
        disabled={!available}
        aria-expanded={open}
        onClick={(event) => {
          event.stopPropagation()
          if (available) setOpen(!open)
        }}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-verdigris/50",
          available
            ? "border-line bg-raised/40 text-ink-muted hover:border-verdigris/40 hover:text-verdigris-bright"
            : "cursor-not-allowed border-line bg-page/40 text-ink-faint",
        )}
      >
        {open ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
        {open ? "Hide markscheme" : "Show markscheme"}
      </button>

      {!available && (
        <p className="mt-2 text-[11px] text-ink-faint">Markscheme not available for this question.</p>
      )}

      {available && open && (
        <div className="mt-2 rounded-lg border border-verdigris/25 bg-verdigris/[0.06] px-3 py-3">
          <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.14em] text-verdigris-bright">
            Markscheme
          </p>
          <div className="text-sm leading-relaxed text-ink-muted">
            <MathDisplay statement={markscheme} />
          </div>
        </div>
      )}
    </div>
  )
}
