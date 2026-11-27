import type { ButtonHTMLAttributes, ReactNode } from "react"
import { cn } from "@/lib/utils"
import { DIFFICULTY_LABEL, difficultyTone } from "@/lib/bank"

export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        "num inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-[4px] border border-hair bg-raised-2 px-1 text-[10px] leading-none text-ink-muted",
        className,
      )}
    >
      {children}
    </kbd>
  )
}

type Tone = "default" | "primary" | "ghost" | "danger"

export function Btn({
  tone = "default",
  size = "md",
  hint,
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: Tone; size?: "sm" | "md"; hint?: string }) {
  const button = (
    <button
      type="button"
      className={cn(
        "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg font-medium transition-[transform,background-color,border-color,color,box-shadow] duration-150 ease-out motion-safe:hover:scale-[1.04] motion-safe:active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40",
        size === "sm" ? "h-7 px-2.5 text-[12px]" : "h-8 px-3 text-[13px]",
        tone === "primary" &&
          "bg-accent text-accent-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] hover:bg-accent-bright hover:shadow-[0_8px_26px_-8px_rgba(240,106,42,0.9)]",
        tone === "default" &&
          "border border-line bg-raised text-ink hover:border-accent-line hover:bg-raised-2 hover:text-accent hover:shadow-[0_6px_22px_-10px_rgba(240,106,42,0.8)]",
        tone === "ghost" && "text-ink-muted hover:bg-accent-wash hover:text-accent",
        tone === "danger" && "border border-hard/30 bg-hard/10 text-hard hover:bg-hard/15",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
  if (!hint) return button
  return (
    <span className="group/hint relative inline-flex">
      {button}
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-[calc(100%+8px)] hidden sm:block left-1/2 z-[70] w-max max-w-[220px] -translate-x-1/2 translate-y-1 rounded-lg border border-accent-line bg-surface/95 px-2.5 py-1.5 text-[11.5px] leading-snug text-ink-muted opacity-0 shadow-[0_12px_30px_-10px_rgba(0,0,0,0.8)] backdrop-blur transition-[opacity,transform] duration-150 group-focus-within/hint:translate-y-0 group-focus-within/hint:opacity-100 group-hover/hint:translate-y-0 group-hover/hint:opacity-100"
      >
        {hint}
      </span>
    </span>
  )
}

export function Chip({
  active,
  children,
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(
        "inline-flex h-7 items-center gap-1.5 rounded-md border px-2 text-[12px] transition-colors",
        "transition-[transform,background-color,border-color,color] motion-safe:hover:scale-[1.05]",
        active
          ? "border-accent-line bg-accent-wash text-accent"
          : "border-line bg-transparent text-ink-muted hover:border-accent-line hover:text-accent",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
}

const TONE_CLASS = {
  easy: "bg-easy",
  medium: "bg-medium",
  hard: "bg-hard",
} as const

/** Five ticks; filled ticks take the semantic color of the band. */
export function DifficultyMeter({ value, className }: { value: number; className?: string }) {
  const tone = difficultyTone(value)
  return (
    <span
      className={cn("inline-flex items-center gap-[3px]", className)}
      title={`Difficulty ${value} of 5 — ${DIFFICULTY_LABEL[value] ?? ""}`}
      aria-label={`Difficulty ${value} of 5`}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={cn("h-2.5 w-[3px] rounded-[1px]", n <= value ? TONE_CLASS[tone] : "bg-raised-2")} />
      ))}
    </span>
  )
}

export function PaperTag({ paper }: { paper: string | null }) {
  const code = paper ? `P${paper.slice(-1)}` : "P?"
  return (
    <span
      className={cn(
        "num inline-flex h-5 items-center rounded-[4px] border px-1.5 text-[10.5px] font-medium",
        code === "P3" ? "border-hard/40 text-hard" : "border-line-strong text-ink",
      )}
      title={paper ?? "Unknown paper"}
    >
      {code}
    </span>
  )
}

export function Marks({ value, className }: { value: number; className?: string }) {
  return (
    <span className={cn("num text-[11px] text-ink-muted", className)}>
      [{value}
      <span className="text-ink-faint"> mk</span>]
    </span>
  )
}

export function SectionTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3">
      <h2 className="text-[13px] font-semibold text-ink">{children}</h2>
      {aside ? <div className="text-[12px] text-ink-faint">{aside}</div> : null}
    </div>
  )
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T
  options: { value: T; label: ReactNode }[]
  onChange: (v: T) => void
  label: string
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-lg border border-line bg-surface p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "h-7 rounded-md px-2.5 text-[12px] font-medium transition-colors",
            value === o.value
              ? "bg-raised-2 text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
              : "text-ink-faint hover:text-ink",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
