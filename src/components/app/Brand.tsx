import { cn } from "@/lib/utils"

/**
 * EmberMath mark: an integral sign drawn as a rising flame, in one solid
 * ember stroke. `glow` is accepted for existing callers and has no effect.
 */
export function EmberMark({ className }: { className?: string; glow?: boolean }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-8", className)} aria-hidden="true">
      <path
        d="M21 5.2c-2.3-1-4.4.3-4.9 3.1l-2.6 15.6c-.5 2.8-2.5 4-4.8 3.1"
        fill="none"
        stroke="#f06a2a"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <path d="M17.6 11.5c1.9.8 2.6 2.6 1.9 4.4" fill="none" stroke="#f06a2a" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("font-semibold tracking-[-0.02em]", className)}>
      <span className="text-ink">Ember</span>
      <span className="text-accent">Math</span>
    </span>
  )
}
