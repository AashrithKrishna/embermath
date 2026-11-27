import { Lightbulb } from "lucide-react"
import { cn } from "@/lib/utils"
import { MathDisplay } from "./MathDisplay"

interface TipPanelProps {
  tips: string | null
  className?: string
}

/**
 * Learning-aid panel for a question's method hint. Styled distinctly (accent tint,
 * lightbulb) so it reads as guidance rather than part of the question.
 */
export function TipPanel({ tips, className }: TipPanelProps) {
  if (!tips || !tips.trim()) return null

  return (
    <div
      className={cn(
        "rounded-lg border border-accent-line bg-accent-wash px-4 py-3",
        className,
      )}
    >
      <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-accent">
        <Lightbulb className="size-3.5" aria-hidden="true" />
        Method for this question
      </p>
      <div className="text-sm leading-relaxed text-ink-muted">
        <MathDisplay statement={tips} />
      </div>
    </div>
  )
}
