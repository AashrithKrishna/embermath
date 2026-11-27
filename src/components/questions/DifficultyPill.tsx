import { difficultyBand, type DifficultyBand } from "@/lib/filter"
import { cn } from "@/lib/utils"

const bandStyles: Record<DifficultyBand, string> = {
  Easy: "border-emerald-400/25 bg-emerald-400/10 text-emerald-300 shadow-[0_0_18px_-6px_rgba(52,211,153,0.55)]",
  Medium: "border-amber-400/25 bg-amber-400/10 text-amber-300 shadow-[0_0_18px_-6px_rgba(251,191,36,0.55)]",
  Hard: "border-rose-400/25 bg-rose-400/10 text-rose-300 shadow-[0_0_18px_-6px_rgba(251,113,133,0.55)]",
}

interface DifficultyPillProps {
  score: number
  className?: string
}

export function DifficultyPill({ score, className }: DifficultyPillProps) {
  const band = difficultyBand(score)

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium tracking-wide",
        bandStyles[band],
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
      {band}
    </span>
  )
}