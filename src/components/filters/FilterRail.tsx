import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Slider } from "@/components/ui/slider"
import { difficultyBand, hasActiveFilters, type FilterState } from "@/lib/filter"
import { cn } from "@/lib/utils"

interface FilterRailProps {
  filters: FilterState
  onChange: (patch: Partial<FilterState>) => void
  onReset: () => void
  counts: Record<string, number>
  topics: string[]
  years: number[]
  resultCount: number
  total: number
}

const sectionLabel = "text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-500"
const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-verdigris/50 focus-visible:ring-offset-2 focus-visible:ring-offset-page"

export function FilterRail({ filters, onChange, onReset, counts, topics, years, resultCount, total }: FilterRailProps) {
  const [min, max] = filters.difficulty
  const minBand = difficultyBand(min)
  const maxBand = difficultyBand(max)

  const toggleTopic = (topic: string) => {
    const next = filters.topics.includes(topic)
      ? filters.topics.filter((item) => item !== topic)
      : [...filters.topics, topic]
    onChange({ topics: next })
  }

  const toggleYear = (year: number) => {
    const next = filters.years.includes(year)
      ? filters.years.filter((item) => item !== year)
      : [...filters.years, year]
    onChange({ years: next })
  }

  return (
    <div className="glass-panel rounded-xl p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-100">Filters</h2>
        {hasActiveFilters(filters) && (
          <button
            type="button"
            onClick={onReset}
            className={cn("rounded text-xs text-zinc-400 underline-offset-4 transition hover:text-zinc-100 hover:underline", focusRing)}
          >
            Reset
          </button>
        )}
      </div>

      <Separator className="my-5 bg-zinc-800/70" />

      <section>
        <div className="flex items-center justify-between gap-2">
          <h3 className={sectionLabel}>Difficulty</h3>
          <span className="rounded-full border border-zinc-700/70 bg-white/[0.04] px-2 py-0.5 text-[10px] text-zinc-300 tabular-nums">
            {min === max ? `${min} · ${minBand}` : `${min} – ${max} · ${minBand} → ${maxBand}`}
          </span>
        </div>
        <Slider
          className="mt-4"
          min={1}
          max={5}
          step={1}
          minStepsBetweenValues={0}
          value={filters.difficulty}
          onValueChange={(value) => {
            const range = Array.isArray(value) ? value : [value, value]
            onChange({ difficulty: [range[0], range[1]] })
          }}
          thumbLabels={["Minimum difficulty", "Maximum difficulty"]}
        />
        <div className="mt-2 flex justify-between text-[11px] text-zinc-500">
          <span>Easy</span>
          <span>Hard</span>
        </div>
      </section>

      <Separator className="my-5 bg-zinc-800/70" />

      <section>
        <h3 className={sectionLabel}>Topics</h3>
        <div className="mt-3 space-y-2.5">
          {topics.map((topic) => {
            const id = `topic-${topic.toLowerCase().replace(/\s+/g, "-")}`
            return (
              <div key={topic} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <Checkbox
                    id={id}
                    checked={filters.topics.includes(topic)}
                    onCheckedChange={() => toggleTopic(topic)}
                    className="border-zinc-700 data-checked:border-emerald-400/60 data-checked:bg-emerald-400/20 data-checked:text-emerald-200"
                  />
                  <Label
                    htmlFor={id}
                    className={cn(
                      "cursor-pointer text-sm font-normal",
                      counts[topic] === 0 ? "text-zinc-600" : "text-zinc-300",
                    )}
                  >
                    {topic}
                  </Label>
                </div>
                <span className="text-[11px] tabular-nums text-zinc-500">{counts[topic]}</span>
              </div>
            )
          })}
        </div>
      </section>

      {years.length > 0 && (
        <>
          <Separator className="my-5 bg-zinc-800/70" />

          <section>
            <h3 className={sectionLabel}>Year</h3>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {years.map((year) => {
                const active = filters.years.includes(year)
                return (
                  <button
                    key={year}
                    type="button"
                    aria-pressed={active}
                    onClick={() => toggleYear(year)}
                    className={cn(
                      "rounded-md border px-2.5 py-1 text-xs tabular-nums transition",
                      focusRing,
                      active
                        ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-200"
                        : "border-zinc-800 bg-white/[0.03] text-zinc-400 hover:border-zinc-700 hover:text-zinc-200",
                    )}
                  >
                    {year}
                  </button>
                )
              })}
            </div>
          </section>
        </>
      )}

      <Separator className="my-5 bg-zinc-800/70" />

      <p className="text-xs text-zinc-500">
        Showing <span className="text-zinc-200 tabular-nums">{resultCount}</span> of{" "}
        <span className="tabular-nums">{total}</span> questions
      </p>
    </div>
  )
}