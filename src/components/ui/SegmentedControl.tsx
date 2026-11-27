import { cn } from "@/lib/utils"

interface SegmentedControlProps<T extends string> {
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
  ariaLabel: string
  className?: string
}

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-verdigris/50 focus-visible:ring-offset-2 focus-visible:ring-offset-page"

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  className,
}: SegmentedControlProps<T>) {
  if (options.length === 0) return null
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex items-center gap-1 rounded-lg border border-zinc-800 bg-white/[0.03] p-1",
        className,
      )}
    >
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "rounded-md border px-3 py-1.5 text-sm font-medium transition",
              focusRing,
              active
                ? "border-emerald-400/30 bg-emerald-400/15 text-emerald-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                : "border-transparent text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200",
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}