import { useCallback, useRef } from "react"
import { BookOpen, LineChart, X } from "lucide-react"
import { dockStore, useStore, type DockTab } from "@/lib/store"
import type { Question } from "@/lib/questions"
import { cn } from "@/lib/utils"
import { Kbd } from "@/components/app/primitives"
import { BookletPanel } from "./BookletPanel"
import { DesmosPanel } from "./DesmosPanel"

const TABS: { id: DockTab; label: string; icon: typeof LineChart; key: string }[] = [
  { id: "desmos", label: "Desmos", icon: LineChart, key: "G" },
  { id: "booklet", label: "Formula booklet", icon: BookOpen, key: "B" },
]

/**
 * Split-screen reference dock. Desktop: a resizable right column beside the
 * workspace. Mobile: a full-height sheet over the content.
 */
export function ReferenceDock({ course, question }: { course: string; question: Question | null }) {
  const dock = useStore(dockStore)
  const dragging = useRef(false)

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    dragging.current = true
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }, [])
  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return
    const width = Math.min(Math.max(window.innerWidth - e.clientX, 340), Math.min(900, window.innerWidth - 420))
    dockStore.set((d) => ({ ...d, width }))
  }, [])
  const onPointerUp = useCallback(() => {
    dragging.current = false
  }, [])

  return (
    <aside
      aria-label="Reference dock"
      aria-hidden={!dock.open}
      style={{ "--dock-w": `${dock.width}px` } as React.CSSProperties}
      className={cn(
        "no-print z-40 flex min-h-0 flex-col border-line bg-surface",
        "fixed inset-x-0 bottom-0 top-12 border-t lg:sticky lg:top-12 lg:h-[calc(100dvh-48px)] lg:w-[var(--dock-w)] lg:border-l lg:border-t-0",
        !dock.open && "hidden",
      )}
    >
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize reference dock"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        className="absolute inset-y-0 -left-1 z-20 hidden w-2 cursor-col-resize hover:bg-accent/30 lg:block"
      />
      <div className="flex h-10 shrink-0 items-center gap-1 border-b border-line px-2">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => dockStore.set((d) => ({ ...d, tab: tab.id }))}
            aria-pressed={dock.tab === tab.id}
            className={cn(
              "inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-[12px] font-medium transition-colors",
              dock.tab === tab.id ? "bg-raised-2 text-ink" : "text-ink-faint hover:text-ink",
            )}
          >
            <tab.icon className="size-3.5" aria-hidden="true" />
            {tab.label}
            <Kbd className="ml-0.5">{tab.key}</Kbd>
          </button>
        ))}
        <button
          type="button"
          onClick={() => dockStore.set((d) => ({ ...d, open: false }))}
          className="ml-auto grid size-7 place-items-center rounded-md text-ink-faint hover:bg-raised hover:text-ink"
          aria-label="Close reference dock"
        >
          <X className="size-4" />
        </button>
      </div>
      <div className="relative min-h-0 flex-1">
        {/* Desmos stays mounted (so graphs persist) but is clipped to zero
            size and inert when inactive: its canvas forces visibility:visible,
            so `invisible` alone lets the graph paper bleed through. */}
        <div
          aria-hidden={dock.tab !== "desmos"}
          inert={dock.tab !== "desmos"}
          className={cn(
            "absolute inset-0 overflow-hidden",
            dock.tab !== "desmos" && "pointer-events-none opacity-0 [clip-path:inset(50%)]",
          )}
        >
          <DesmosPanel visible={dock.open && dock.tab === "desmos"} question={question} />
        </div>
        <div className={cn("absolute inset-0 z-10 bg-surface", dock.tab !== "booklet" && "hidden")}>
          <BookletPanel course={course} />
        </div>
      </div>
    </aside>
  )
}
