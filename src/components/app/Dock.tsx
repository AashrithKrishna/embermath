import { useCallback, useRef, useState, type ReactNode } from "react"
import { cn } from "@/lib/utils"
import { Kbd } from "./primitives"

export interface DockItem {
  id: string
  label: string
  icon: ReactNode
  href?: string
  onClick?: () => void
  active?: boolean
  /** Shows a small "running" dot, like an open app in the macOS dock. */
  running?: boolean
  keyHint?: string
  preview: { title: string; body: string; stat?: ReactNode; art?: ReactNode }
}

const RANGE = 120 // px of pointer influence
const MAX_GROW = 0.5 // +50% at the pointer

/**
 * macOS-style magnifying dock. Items scale with pointer proximity along the
 * dock's axis; hovering or focusing an item shows a preview card.
 */
export function Dock({ items, orientation }: { items: DockItem[]; orientation: "vertical" | "horizontal" }) {
  const refs = useRef<(HTMLElement | null)[]>([])
  const [scales, setScales] = useState<number[]>(() => items.map(() => 1))
  const [hover, setHover] = useState<number | null>(null)
  const vertical = orientation === "vertical"

  const onMove = useCallback(
    (e: React.PointerEvent) => {
      if (e.pointerType === "touch") return
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
      const pos = vertical ? e.clientY : e.clientX
      setScales(
        refs.current.map((el) => {
          if (!el) return 1
          const r = el.getBoundingClientRect()
          const center = vertical ? r.top + r.height / 2 : r.left + r.width / 2
          const d = Math.abs(pos - center)
          const t = Math.max(0, 1 - d / RANGE)
          return 1 + MAX_GROW * t * t * (3 - 2 * t)
        }),
      )
    },
    [vertical],
  )
  const onLeave = useCallback(() => {
    setScales(items.map(() => 1))
    setHover(null)
  }, [items])

  return (
    <ul
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      className={cn("flex items-center", vertical ? "flex-col gap-1.5" : "w-full justify-around gap-1")}
    >
      {items.map((item, i) => {
        const s = scales[i] ?? 1
        const shown = hover === i
        const inner = (
          <>
            <span
              className={cn(
                "relative grid size-10 place-items-center rounded-xl border transition-[background,border-color,box-shadow,transform] duration-150 ease-out will-change-transform",
                item.active
                  ? "border-accent-line bg-accent-wash text-accent shadow-[0_0_18px_-4px_rgba(240,106,42,0.55)]"
                  : "border-hair bg-raised text-ink-muted group-hover:border-accent-line group-hover:text-accent group-hover:shadow-[0_0_22px_-6px_rgba(240,106,42,0.7)] group-focus-visible:border-accent-line",
              )}
              style={{ transform: `scale(${s})`, transformOrigin: vertical ? "left center" : "center bottom" }}
            >
              {item.icon}
            </span>
            <span className={cn("mt-1 text-[10px] font-medium leading-none", item.active ? "text-accent" : "text-ink-faint group-hover:text-ink")}>
              {item.label}
            </span>
            {item.running ? (
              <span
                className={cn(
                  "absolute rounded-full bg-teal",
                  vertical ? "-left-[7px] top-[17px] h-[6px] w-[3px]" : "-bottom-[5px] left-1/2 size-[4px] -translate-x-1/2",
                )}
              />
            ) : null}
            <Preview item={item} shown={shown} vertical={vertical} />
          </>
        )
        const common = {
          ref: (el: HTMLElement | null) => {
            refs.current[i] = el
          },
          onPointerEnter: () => setHover(i),
          onFocus: () => setHover(i),
          onBlur: () => setHover((h) => (h === i ? null : h)),
          className: "group relative flex w-14 flex-col items-center rounded-xl py-1 outline-none",
          "aria-label": `${item.label}${item.keyHint ? ` (${item.keyHint})` : ""}`,
        }
        return (
          <li
            key={item.id}
            className="relative"
            style={{ marginBlock: vertical ? `${(s - 1) * 14}px` : undefined, marginInline: vertical ? undefined : `${(s - 1) * 10}px` }}
          >
            {item.href ? (
              <a href={item.href} aria-current={item.active ? "page" : undefined} {...common}>
                {inner}
              </a>
            ) : (
              <button type="button" onClick={item.onClick} aria-pressed={item.active} {...common}>
                {inner}
              </button>
            )}
          </li>
        )
      })}
    </ul>
  )
}

function Preview({ item, shown, vertical }: { item: DockItem; shown: boolean; vertical: boolean }) {
  return (
    <span
      role="tooltip"
      className={cn(
        "pointer-events-none absolute z-[70] w-60 rounded-xl border border-accent-line bg-surface/95 p-3 text-left shadow-[0_18px_40px_-12px_rgba(0,0,0,0.8)] backdrop-blur transition-[opacity,transform] duration-150",
        vertical ? "left-[78px] top-1/2 -translate-y-1/2" : "bottom-[68px] left-1/2 -translate-x-1/2",
        shown ? "opacity-100" : "translate-x-[-4px] opacity-0",
        !vertical && "hidden sm:block",
      )}
    >
      {item.preview.art ? <span className="mb-2.5 block overflow-hidden rounded-lg border border-hair bg-page">{item.preview.art}</span> : null}
      <span className="flex items-center justify-between gap-2">
        <span className="text-[12.5px] font-semibold text-ink">{item.preview.title}</span>
        {item.keyHint ? <Kbd>{item.keyHint}</Kbd> : null}
      </span>
      <span className="mt-1 block text-[11.5px] leading-snug text-ink-muted">{item.preview.body}</span>
      {item.preview.stat ? <span className="num mt-2 block text-[11px] text-accent">{item.preview.stat}</span> : null}
    </span>
  )
}
