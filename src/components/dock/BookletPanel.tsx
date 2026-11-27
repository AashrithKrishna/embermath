import { useMemo, useState } from "react"
import { Pin, PinOff, Search } from "lucide-react"
import { bookletFor } from "@/data/booklet"
import { PRIOR_LEARNING, TOPIC_PREFIX } from "@/data/priorLearning"
import { countBookletEntries, searchBooklet } from "@/lib/bookletSearch"
import { pinsStore, useStore } from "@/lib/store"
import { Tex } from "@/components/math/MathRenderer"
import { cn } from "@/lib/utils"

/** Searchable, KaTeX-rendered formula booklet laid out by IB topic. */
export function BookletPanel({ course }: { course: string }) {
  const [query, setQuery] = useState("")
  const pins = useStore(pinsStore)
  const sections = useMemo(() => [PRIOR_LEARNING, ...bookletFor(course)], [course])
  const results = useMemo(() => searchBooklet(sections, query), [sections, query])
  const total = countBookletEntries(results)
  const pinnedIds = new Set(pins.map((p) => p.id))

  const togglePin = (id: string, name: string, latex: string) =>
    pinsStore.set((list) =>
      list.some((p) => p.id === id) ? list.filter((p) => p.id !== id) : [...list, { id, name, latex }].slice(-12),
    )

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b border-line p-3">
        <label className="flex h-8 items-center gap-2 rounded-lg border border-line bg-page px-2.5 focus-within:border-accent-line">
          <Search className="size-3.5 text-ink-faint" aria-hidden="true" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${course} formulas`}
            aria-label="Search formula booklet"
            className="h-full flex-1 bg-transparent text-[13px] text-ink outline-none placeholder:text-ink-faint"
          />
          <span className="num text-[11px] text-ink-faint">{total}</span>
        </label>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-6">
        {results.length === 0 ? (
          <p className="py-10 text-center text-[12px] text-ink-faint">
            No formula matches “{query}”. Try a shorter word such as “sum” or “normal”.
          </p>
        ) : null}
        {results.map((section) => (
          <section key={section.id} className="pt-4">
            <h3 className="sticky top-0 z-10 -mx-3 mb-2 border-b border-hair bg-surface/95 px-3 py-1.5 text-[12px] font-semibold text-ink backdrop-blur">
              {TOPIC_PREFIX[section.id] ? (
                <span className="num mr-2 text-accent">{TOPIC_PREFIX[section.id]}</span>
              ) : null}
              {section.title}
            </h3>
            <ul className="grid gap-1.5">
              {section.entries.map((entry) => {
                const id = `${course}:${section.id}:${entry.name}`
                const pinned = pinnedIds.has(id)
                return (
                  <li key={id} className="group rounded-lg border border-transparent px-2 py-2 hover:border-line hover:bg-raised">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span className="text-[12px] text-ink-muted">{entry.name}</span>
                      <button
                        type="button"
                        onClick={() => togglePin(id, entry.name, entry.latex)}
                        aria-label={pinned ? `Unpin ${entry.name}` : `Pin ${entry.name} to workspace`}
                        title={pinned ? "Unpin" : "Pin to workspace"}
                        className={cn(
                          "grid size-6 place-items-center rounded-md transition-colors",
                          pinned
                            ? "text-accent hover:bg-raised-2"
                            : "text-ink-faint opacity-0 hover:bg-raised-2 hover:text-ink group-hover:opacity-100 focus-visible:opacity-100",
                        )}
                      >
                        {pinned ? <PinOff className="size-3.5" /> : <Pin className="size-3.5" />}
                      </button>
                    </div>
                    <Tex tex={entry.latex} display className="text-[14px] text-ink" />
                    {entry.note ? <p className="mt-1 text-[11.5px] text-ink-faint">{entry.note}</p> : null}
                  </li>
                )
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}

/** Horizontal tray of pinned formulas shown inside Practice and Exam. */
export function PinnedTray() {
  const pins = useStore(pinsStore)
  if (pins.length === 0) return null
  return (
    <div className="flex items-stretch gap-2 overflow-x-auto pb-1" aria-label="Pinned formulas">
      {pins.map((p) => (
        <div key={p.id} className="group relative shrink-0 rounded-lg border border-line bg-surface px-3 py-1.5">
          <div className="text-[10.5px] text-ink-faint">{p.name}</div>
          <Tex tex={p.latex} className="text-[13px]" />
          <button
            type="button"
            onClick={() => pinsStore.set((l) => l.filter((x) => x.id !== p.id))}
            className="absolute right-1 top-1 hidden size-5 place-items-center rounded text-ink-faint hover:text-ink group-hover:grid"
            aria-label={`Unpin ${p.name}`}
          >
            <PinOff className="size-3" />
          </button>
        </div>
      ))}
    </div>
  )
}
