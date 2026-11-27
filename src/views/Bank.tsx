import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react"
import { ChevronDown, ChevronRight, Image as ImageIcon, Play, Search, SlidersHorizontal, X } from "lucide-react"
import { activeBankFilters, applyBankFilter, emptyBankFilter, shortId, topicTree, type BankFilter } from "@/lib/bank"
import { bankFilterStore, practiceStore } from "@/lib/session"
import { progressStore, useStore } from "@/lib/store"
import { navigate } from "@/lib/router"
import { isTypingTarget } from "@/lib/keyboard"
import { questionFigures, type Question } from "@/lib/questions"
import { cn } from "@/lib/utils"
import { Btn, Chip, DifficultyMeter, Kbd, Marks, PaperTag } from "@/components/app/primitives"
import { MathRenderer } from "@/components/math/MathRenderer"
import { Markscheme, QuestionStatement } from "@/components/question/QuestionBody"

const PAGE = 30

export function Bank({ pool, course }: { pool: Question[]; course: string }) {
  const filter = useStore(bankFilterStore)
  const set = (patch: Partial<BankFilter>) => bankFilterStore.set((f) => ({ ...f, ...patch }))
  const deferred = useDeferredValue(filter)
  const results = useMemo(() => applyBankFilter(pool, deferred), [pool, deferred])
  const tree = useMemo(() => topicTree(pool), [pool])
  const [limit, setLimit] = useState(PAGE)
  const [openId, setOpenId] = useState<string | null>(null)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)
  const progress = useStore(progressStore)
  const active = activeBankFilters(filter)

  useEffect(() => setLimit(PAGE), [deferred, course])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "/" && !isTypingTarget(e.target)) {
        e.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  const practiceAll = (startId?: string) => {
    practiceStore.set({ ids: results.map((q) => q.id), label: describe(filter) || `All ${course}` })
    navigate("practice", { id: startId ?? results[0]?.id })
  }

  const filters = (
    <FilterPanel filter={filter} set={set} tree={tree} pool={pool} />
  )

  return (
    <div className="mx-auto grid max-w-[1440px] grid-cols-1 gap-0 lg:grid-cols-[260px_minmax(0,1fr)]">
      <aside className="hidden border-r border-line lg:block">
        <div className="sticky top-12 h-[calc(100dvh-48px)] overflow-y-auto p-4">{filters}</div>
      </aside>

      {filtersOpen ? (
        <div className="fixed inset-0 z-50 flex flex-col bg-page lg:hidden" role="dialog" aria-label="Filters">
          <div className="flex h-12 items-center justify-between border-b border-line px-4">
            <span className="text-[13px] font-semibold">Filters</span>
            <Btn tone="ghost" onClick={() => setFiltersOpen(false)} aria-label="Close filters">
              <X className="size-4" />
            </Btn>
          </div>
          <div className="flex-1 overflow-y-auto p-4">{filters}</div>
          <div className="border-t border-line p-3">
            <Btn tone="primary" className="w-full" onClick={() => setFiltersOpen(false)}>
              Show {results.length} questions
            </Btn>
          </div>
        </div>
      ) : null}

      <section className="min-w-0 p-4 lg:p-5" aria-label="Results">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <label className="flex h-9 min-w-[220px] flex-1 items-center gap-2 rounded-lg border border-line bg-surface px-3 focus-within:border-accent-line">
            <Search className="size-4 text-ink-faint" aria-hidden="true" />
            <input
              ref={searchRef}
              value={filter.search}
              onChange={(e) => set({ search: e.target.value })}
              placeholder="Search statements, topics, IDs"
              aria-label="Search questions"
              className="h-full flex-1 bg-transparent text-[13px] outline-none placeholder:text-ink-faint"
            />
            {filter.search ? (
              <button type="button" onClick={() => set({ search: "" })} aria-label="Clear search" className="text-ink-faint hover:text-ink">
                <X className="size-3.5" />
              </button>
            ) : (
              <Kbd>/</Kbd>
            )}
          </label>
          <Btn className="lg:hidden" onClick={() => setFiltersOpen(true)}>
            <SlidersHorizontal className="size-3.5" />
            Filters{active ? <span className="num text-accent">{active}</span> : null}
          </Btn>
          <Btn tone="primary" onClick={() => practiceAll()} disabled={results.length === 0} hint="Work through these results one at a time in Practice">
            <Play className="size-3.5" />
            Practice {results.length}
          </Btn>
        </div>

        <div className="mb-2 flex items-center justify-between text-[12px] text-ink-faint">
          <span>
            <span className="num text-ink">{results.length}</span> of <span className="num">{pool.length}</span> {course} questions
            {active ? (
              <button type="button" onClick={() => bankFilterStore.set(emptyBankFilter)} className="ml-3 text-accent hover:underline">
                Clear filters
              </button>
            ) : null}
          </span>
        </div>

        {results.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line px-6 py-16 text-center">
            <p className="text-[13px] text-ink">No questions match these filters.</p>
            <p className="mt-1 text-[12px] text-ink-faint">Remove a filter or search for a broader term.</p>
            <Btn className="mt-4" onClick={() => bankFilterStore.set(emptyBankFilter)}>
              Clear filters
            </Btn>
          </div>
        ) : (
          <ol className="overflow-hidden rounded-xl border border-line">
            {results.slice(0, limit).map((q) => {
              const open = openId === q.id
              const outcome = progress[q.id]
              return (
                <li key={q.id} className={cn("border-b border-line last:border-b-0", open ? "bg-surface" : "bg-page")}>
                  <button
                    type="button"
                    onClick={() => setOpenId(open ? null : q.id)}
                    aria-expanded={open}
                    className="grid w-full grid-cols-[18px_minmax(0,1fr)] gap-3 px-4 py-3 text-left transition-colors hover:bg-surface sm:grid-cols-[18px_120px_minmax(0,1fr)_auto]"
                  >
                    <span className="pt-0.5 text-ink-faint">
                      {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                    </span>
                    <span className="hidden flex-col gap-1.5 sm:flex">
                      <span className="num text-[11px] text-ink-faint">{shortId(q)}</span>
                      <span className="flex items-center gap-2">
                        <PaperTag paper={q.paper} />
                        {questionFigures(q).length ? <ImageIcon className="size-3.5 text-accent" aria-label="Has figure" /> : null}
                        {outcome ? (
                          <span
                            className={cn(
                              "size-1.5 rounded-full",
                              outcome === "got" ? "bg-easy" : outcome === "partial" ? "bg-medium" : "bg-hard",
                            )}
                            title={`Self-marked: ${outcome}`}
                          />
                        ) : null}
                      </span>
                    </span>
                    <span className="min-w-0">
                      <span className="mb-1 block truncate text-[11.5px] text-ink-faint">
                        {q.topic}
                        {q.subtopic && q.subtopic !== q.topic ? ` / ${q.subtopic}` : ""}
                      </span>
                      {open ? null : (
                        <span className="line-clamp-2 block text-[13.5px] text-ink">
                          <MathRenderer text={q.statement} preview className="text-[13.5px] leading-[1.6]" />
                        </span>
                      )}
                    </span>
                    <span className="col-start-2 flex items-center gap-3 sm:col-start-auto sm:flex-col sm:items-end sm:gap-2">
                      <Marks value={q.marks} />
                      <DifficultyMeter value={q.difficulty} />
                    </span>
                  </button>
                  {open ? (
                    <div className="animate-enter px-4 pb-5 sm:pl-[170px]">
                      <QuestionStatement question={q} />
                      <Reveal question={q} />
                      <div className="mt-4 flex gap-2">
                        <Btn tone="primary" size="sm" onClick={() => practiceAll(q.id)}>
                          Open in Practice
                        </Btn>
                      </div>
                    </div>
                  ) : null}
                </li>
              )
            })}
          </ol>
        )}
        {results.length > limit ? (
          <div className="mt-4 flex justify-center">
            <Btn onClick={() => setLimit((l) => l + PAGE * 2)}>
              Show {Math.min(PAGE * 2, results.length - limit)} more
            </Btn>
          </div>
        ) : null}
      </section>
    </div>
  )
}

function Reveal({ question }: { question: Question }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="mt-4">
      <Btn size="sm" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        {open ? "Hide markscheme" : "Show markscheme"}
      </Btn>
      {open ? (
        <div className="mt-3 rounded-lg border border-line bg-page p-4">
          <Markscheme question={question} />
        </div>
      ) : null}
    </div>
  )
}

function describe(f: BankFilter) {
  return [f.topic, f.subtopic, f.papers.join("/"), f.difficulties.length ? `difficulty ${f.difficulties.join(",")}` : "", f.search && `“${f.search}”`]
    .filter(Boolean)
    .join(", ")
}

function FilterPanel({
  filter,
  set,
  tree,
  pool,
}: {
  filter: BankFilter
  set: (p: Partial<BankFilter>) => void
  tree: ReturnType<typeof topicTree>
  pool: Question[]
}) {
  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v])
  const paperCounts = (p: string) => pool.filter((q) => q.paper === p).length
  return (
    <div className="flex flex-col gap-6 text-[12px]">
      <Group title="Paper">
        <div className="flex flex-wrap gap-1.5">
          {["Paper 1", "Paper 2", "Paper 3"].map((p) => (
            <Chip key={p} active={filter.papers.includes(p)} onClick={() => set({ papers: toggle(filter.papers, p) })}>
              <span className="num">P{p.slice(-1)}</span>
              <span className="num text-ink-faint">{paperCounts(p)}</span>
            </Chip>
          ))}
        </div>
      </Group>
      <Group title="Difficulty">
        <div className="flex gap-1.5">
          {[1, 2, 3, 4, 5].map((d) => (
            <Chip
              key={d}
              active={filter.difficulties.includes(d)}
              onClick={() => set({ difficulties: toggle(filter.difficulties, d) })}
              className="w-9 justify-center"
              aria-label={`Difficulty ${d}`}
            >
              <span className="num">{d}</span>
            </Chip>
          ))}
        </div>
      </Group>
      <Group title="Marks">
        <div className="flex items-center gap-2">
          <NumField label="Minimum marks" value={filter.marksMin} onChange={(v) => set({ marksMin: v })} placeholder="min" />
          <span className="text-ink-faint">to</span>
          <NumField label="Maximum marks" value={filter.marksMax} onChange={(v) => set({ marksMax: v })} placeholder="max" />
        </div>
      </Group>
      <Group title="Figures">
        <Chip active={filter.figures === "with"} onClick={() => set({ figures: filter.figures === "with" ? "any" : "with" })}>
          <ImageIcon className="size-3.5" />
          Only questions with figures
        </Chip>
      </Group>
      <Group
        title="Topic"
        aside={
          filter.topic ? (
            <button type="button" className="text-accent hover:underline" onClick={() => set({ topic: null, subtopic: null })}>
              All
            </button>
          ) : null
        }
      >
        <ul className="-mx-2 flex flex-col">
          {tree.map((t) => {
            const active = filter.topic === t.topic
            return (
              <li key={t.topic}>
                <button
                  type="button"
                  onClick={() => set({ topic: active ? null : t.topic, subtopic: null })}
                  aria-pressed={active}
                  className={cn(
                    "flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left transition-colors",
                    active ? "bg-accent-wash text-accent" : "text-ink-muted hover:bg-surface hover:text-ink",
                  )}
                >
                  <span className="truncate">{t.topic}</span>
                  <span className="num text-[11px] text-ink-faint">{t.count}</span>
                </button>
                {active && t.subtopics.length > 1 ? (
                  <ul className="my-1 ml-3 border-l border-line pl-2">
                    {t.subtopics.map((s) => (
                      <li key={s.name}>
                        <button
                          type="button"
                          onClick={() => set({ subtopic: filter.subtopic === s.name ? null : s.name })}
                          aria-pressed={filter.subtopic === s.name}
                          className={cn(
                            "flex w-full justify-between rounded px-2 py-1 text-left",
                            filter.subtopic === s.name ? "text-accent" : "text-ink-faint hover:text-ink",
                          )}
                        >
                          <span className="truncate">{s.name}</span>
                          <span className="num text-[11px]">{s.count}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            )
          })}
        </ul>
      </Group>
    </div>
  )
}

function Group({ title, aside, children }: { title: string; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <fieldset>
      <legend className="mb-2 flex w-full items-center justify-between text-[12px] font-medium text-ink">
        {title}
        {aside}
      </legend>
      {children}
    </fieldset>
  )
}

function NumField({
  value,
  onChange,
  placeholder,
  label,
}: {
  value: number | null
  onChange: (v: number | null) => void
  placeholder: string
  label: string
}) {
  return (
    <input
      type="number"
      inputMode="numeric"
      min={0}
      max={40}
      aria-label={label}
      value={value ?? ""}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
      className="num h-8 w-16 rounded-md border border-line bg-surface px-2 text-[12px] outline-none focus:border-accent-line"
    />
  )
}
