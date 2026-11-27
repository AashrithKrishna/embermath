import { useMemo, useState } from "react"
import { Search } from "lucide-react"
import { CHEATSHEETS, type Cheatsheet } from "@/data/cheatsheets"
import { MathRenderer } from "@/components/math/MathRenderer"
import { DeMoivreVisualizer, MaclaurinVisualizer } from "@/components/sheets/Visualizers"
import { Chip } from "@/components/app/primitives"
import { cn } from "@/lib/utils"

const KIND_LABEL: Record<Cheatsheet["kind"], string> = {
  shortcut: "Shortcut",
  method: "Method",
  gdc: "Calculator",
  traps: "Exam traps",
}

export function Cheatsheets({ course }: { course: string }) {
  const [query, setQuery] = useState("")
  const [kind, setKind] = useState<Cheatsheet["kind"] | null>(null)
  const sheets = useMemo(() => {
    const q = query.trim().toLowerCase()
    return CHEATSHEETS.filter((s) => s.courses.includes(course as "AA HL" | "AI HL"))
      .filter((s) => !kind || s.kind === kind)
      .filter(
        (s) =>
          !q ||
          s.title.toLowerCase().includes(q) ||
          s.items.some((i) => i.title.toLowerCase().includes(q) || i.body.toLowerCase().includes(q)),
      )
  }, [course, query, kind])
  const [activeId, setActiveId] = useState<string | null>(null)
  const active = sheets.find((s) => s.id === activeId) ?? sheets[0]

  return (
    <div className="mx-auto grid max-w-[1320px] grid-cols-1 gap-0 lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="min-w-0 border-b border-line p-4 lg:sticky lg:top-12 lg:h-[calc(100dvh-48px)] lg:overflow-y-auto lg:border-b-0 lg:border-r">
        <label className="mb-3 flex h-8 items-center gap-2 rounded-lg border border-line bg-surface px-2.5 focus-within:border-accent-line">
          <Search className="size-3.5 text-ink-faint" aria-hidden="true" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search sheets"
            aria-label="Search cheatsheets"
            className="h-full flex-1 bg-transparent text-[13px] outline-none placeholder:text-ink-faint"
          />
        </label>
        <div className="mb-4 flex flex-wrap gap-1.5">
          {(Object.keys(KIND_LABEL) as Cheatsheet["kind"][]).map((k) => (
            <Chip key={k} active={kind === k} onClick={() => setKind(kind === k ? null : k)}>
              {KIND_LABEL[k]}
            </Chip>
          ))}
        </div>
        <ul className="-mx-2 flex gap-1 overflow-x-auto lg:flex-col">
          {sheets.map((s) => (
            <li key={s.id} className="shrink-0">
              <button
                type="button"
                onClick={() => setActiveId(s.id)}
                aria-current={active?.id === s.id}
                className={cn(
                  "w-full rounded-lg px-2 py-2 text-left transition-colors",
                  active?.id === s.id ? "bg-accent-wash" : "hover:bg-surface",
                )}
              >
                <div className={cn("text-[13px]", active?.id === s.id ? "text-accent" : "text-ink")}>{s.title}</div>
                <div className="mt-0.5 hidden text-[11.5px] text-ink-faint lg:block">{s.summary}</div>
              </button>
            </li>
          ))}
          {sheets.length === 0 ? <li className="px-2 text-[12px] text-ink-faint">No sheet mentions “{query}”.</li> : null}
        </ul>
      </aside>

      {active ? (
        <article key={active.id} className="animate-enter min-w-0 p-4 lg:p-6" aria-labelledby="sheet-title">
          <header className="mb-5 max-w-[72ch]">
            <div className="text-[11.5px] text-ink-faint">
              {KIND_LABEL[active.kind]} for {active.courses.join(" and ")}
            </div>
            <h1 id="sheet-title" className="mt-1 text-[20px] font-semibold tracking-[-0.015em] text-ink">
              {active.title}
            </h1>
            <p className="mt-1 text-[13px] text-ink-muted">{active.summary}</p>
          </header>

          {active.visualizer ? (
            <section className="surface mb-5 rounded-xl p-4" aria-label="Interactive visualizer">
              {active.visualizer === "demoivre" ? <DeMoivreVisualizer /> : <MaclaurinVisualizer />}
            </section>
          ) : null}

          <div className="grid gap-px overflow-hidden rounded-xl border border-line bg-line xl:grid-cols-2">
            {active.items.map((item) => (
              <section key={item.title} className="bg-surface p-4">
                <h2 className="mb-2 text-[13px] font-semibold text-ink">{item.title}</h2>
                <MathRenderer text={item.body} parts={false} className="text-[13.5px] text-ink-muted" />
              </section>
            ))}
            {active.items.length % 2 === 1 ? <div className="hidden bg-surface xl:block" /> : null}
          </div>
        </article>
      ) : null}
    </div>
  )
}
