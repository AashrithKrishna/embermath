import { useMemo, useState } from "react"
import { navigate } from "@/lib/router"
import { bankFilterStore, practiceStore } from "@/lib/session"
import { emptyBankFilter } from "@/lib/bank"
import { progressStore, useStore } from "@/lib/store"
import type { Question } from "@/lib/questions"
import { questionFigures } from "@/lib/questions"
import { cn } from "@/lib/utils"
import { Btn, Kbd } from "@/components/app/primitives"
import { Markscheme, QuestionMeta, QuestionStatement } from "@/components/question/QuestionBody"
import { CHEATSHEETS } from "@/data/cheatsheets"

function dayIndex(n: number) {
  const d = new Date()
  const key = d.getFullYear() * 1000 + Math.floor((d.getTime() - new Date(d.getFullYear(), 0, 0).getTime()) / 86400000)
  return n ? (key * 2654435761) % n : 0
}

export function Home({ pool, course }: { pool: Question[]; course: string }) {
  const progress = useStore(progressStore)
  const [reveal, setReveal] = useState(false)

  const featured = useMemo(() => {
    const candidates = pool.filter((q) => q.marks >= 5 && q.statement.length < 900 && q.diagramMissing !== 1 && q.diagram_missing !== 1)
    return candidates.length ? candidates[Math.abs(dayIndex(candidates.length))] : null
  }, [pool])

  const topics = useMemo(() => {
    const map = new Map<string, number[]>()
    for (const q of pool) {
      const row = map.get(q.topic) ?? [0, 0, 0, 0, 0]
      row[q.difficulty - 1] += 1
      map.set(q.topic, row)
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [pool])
  const maxCell = Math.max(1, ...topics.flatMap(([, r]) => r))

  const attempted = pool.filter((q) => progress[q.id])
  const got = attempted.filter((q) => progress[q.id] === "got").length
  const papers = ["Paper 1", "Paper 2", "Paper 3"].map((p) => ({
    p,
    n: pool.filter((q) => q.paper === p).length,
    marks: pool.filter((q) => q.paper === p).reduce((s, q) => s + q.marks, 0),
  }))
  const figures = pool.filter((q) => questionFigures(q).length > 0).length

  const openTopic = (topic: string, difficulty?: number) => {
    bankFilterStore.set({ ...emptyBankFilter, topic, difficulties: difficulty ? [difficulty] : [] })
    navigate("bank")
  }

  const practiceFeatured = () => {
    if (!featured) return
    practiceStore.set({ ids: pool.map((q) => q.id), label: `All ${course}` })
    navigate("practice", { id: featured.id })
  }

  return (
    <div className="mx-auto grid max-w-[1320px] grid-cols-1 gap-5 p-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:p-6">
      {/* Question of the day: real mathematics is the first thing on the page. */}
      <section aria-labelledby="qotd" className="surface flex min-h-[340px] flex-col rounded-xl">
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3">
          <h1 id="qotd" className="text-[13px] font-semibold text-ink">
            Today’s question <span className="font-normal text-ink-faint">for {course}</span>
          </h1>
          <span className="num text-[11px] text-ink-faint">
            {new Date().toLocaleDateString(undefined, { day: "2-digit", month: "short" })}
          </span>
        </div>
        {featured ? (
          <div className="flex flex-1 flex-col px-5 py-4">
            <QuestionMeta question={featured} />
            <div className="mt-4 max-h-[420px] overflow-y-auto pr-1">
              <QuestionStatement question={featured} />
              {reveal ? (
                <div className="mt-5 border-t border-line pt-4">
                  <Markscheme question={featured} />
                </div>
              ) : null}
            </div>
            <div className="mt-auto flex flex-wrap items-center gap-2 pt-5">
              <Btn tone="primary" onClick={practiceFeatured}>
                Solve in Practice
              </Btn>
              <Btn onClick={() => setReveal((r) => !r)}>{reveal ? "Hide markscheme" : "Show markscheme"}</Btn>
            </div>
          </div>
        ) : (
          <div className="flex flex-1 flex-col gap-3 p-5">
            <div className="skeleton h-4 w-2/3" />
            <div className="skeleton h-4 w-full" />
            <div className="skeleton h-4 w-5/6" />
            <div className="skeleton mt-4 h-24 w-full" />
          </div>
        )}
      </section>

      {/* Coverage ledger: topic × difficulty, click any cell to open it. */}
      <section aria-labelledby="coverage" className="surface flex flex-col rounded-xl">
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <h2 id="coverage" className="text-[13px] font-semibold text-ink">
            Coverage
          </h2>
          <div className="flex items-center gap-2 text-[11px] text-ink-faint">
            <span>difficulty</span>
            <span className="num">1 → 5</span>
          </div>
        </div>
        <div className="max-h-[420px] overflow-y-auto px-5 py-3">
          <table className="w-full border-separate border-spacing-y-[3px]">
            <thead className="sr-only">
              <tr>
                <th>Topic</th>
                {[1, 2, 3, 4, 5].map((d) => (
                  <th key={d}>Difficulty {d}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {topics.map(([topic, row]) => (
                <tr key={topic}>
                  <th scope="row" className="w-full max-w-0 pr-3 text-left font-normal">
                    <button
                      type="button"
                      onClick={() => openTopic(topic)}
                      className="block w-full truncate text-left text-[12px] text-ink-muted hover:text-ink"
                    >
                      {topic}
                    </button>
                  </th>
                  {row.map((count, i) => (
                    <td key={i} className="p-0 pl-[3px]">
                      <button
                        type="button"
                        disabled={count === 0}
                        onClick={() => openTopic(topic, i + 1)}
                        aria-label={`${topic}, difficulty ${i + 1}: ${count} questions`}
                        title={`${count} question${count === 1 ? "" : "s"}`}
                        className="num grid h-6 w-8 place-items-center rounded-[4px] text-[10px] text-white/80 transition-[outline] hover:outline hover:outline-1 hover:outline-accent disabled:cursor-default disabled:text-transparent"
                        style={{
                          background:
                            count === 0
                              ? "rgba(255,255,255,0.025)"
                              : `rgba(240, 106, 42, ${0.1 + 0.5 * (count / maxCell)})`,
                        }}
                      >
                        {count || ""}
                      </button>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Module hub */}
      <section aria-label="Modules" className="grid gap-px overflow-hidden rounded-xl border border-line bg-line lg:col-span-2 sm:grid-cols-2 xl:grid-cols-4">
        <Module
          href="#/bank"
          keyHint="2"
          title="Question bank"
          body="Filter by topic, subtopic, paper, difficulty and marks. Every question carries its markscheme."
          figure={
            <>
              <Big n={pool.length} unit="questions" />
              <Small>{figures} with figures</Small>
            </>
          }
        />
        <Module
          href="#/practice"
          keyHint="3"
          title="Practice"
          body="One question at a time. J and K to move, M for the markscheme, a scratchpad on the side."
          figure={
            <>
              <Big n={attempted.length} unit="attempted" />
              <Small>
                {got} secure{attempted.length ? `, ${Math.round((got / attempted.length) * 100)}%` : ""}
              </Small>
            </>
          }
          extra={
            <div className="mt-3 flex h-1.5 overflow-hidden rounded-full bg-raised-2" aria-hidden="true">
              <div className="bg-easy" style={{ width: `${(got / Math.max(1, pool.length)) * 100}%` }} />
              <div
                className="bg-medium"
                style={{ width: `${(attempted.filter((q) => progress[q.id] === "partial").length / Math.max(1, pool.length)) * 100}%` }}
              />
              <div
                className="bg-hard"
                style={{ width: `${(attempted.filter((q) => progress[q.id] === "missed").length / Math.max(1, pool.length)) * 100}%` }}
              />
            </div>
          }
        />
        <Module
          href="#/exam"
          keyHint="4"
          title="Exam generator"
          body="Timed papers built to a mark target, topic weighting and difficulty curve. Print the paper and its markscheme."
          figure={
            <div className="flex gap-4">
              {papers.map(({ p, n }) => (
                <div key={p}>
                  <div className={cn("num text-[22px] leading-none", n ? "text-ink" : "text-ink-faint")}>{n}</div>
                  <div className="num mt-1 text-[11px] text-ink-faint">P{p.slice(-1)}</div>
                </div>
              ))}
            </div>
          }
        />
        <Module
          href="#/cheatsheets"
          keyHint="5"
          title="Tips and cheatsheets"
          body="Series shortcuts, tabular integration, De Moivre, GDC keystrokes and the traps examiners set."
          figure={
            <>
              <Big n={CHEATSHEETS.filter((s) => s.courses.includes(course as "AA HL" | "AI HL")).length} unit="sheets" />
              <Small>2 interactive visualizers</Small>
            </>
          }
        />
      </section>
    </div>
  )
}

function Module({
  href,
  keyHint,
  title,
  body,
  figure,
  extra,
}: {
  href: string
  keyHint: string
  title: string
  body: string
  figure: React.ReactNode
  extra?: React.ReactNode
}) {
  return (
    <a href={href} className="group flex flex-col bg-surface p-5 transition-colors hover:bg-raised">
      <div className="flex items-center justify-between">
        <h3 className="text-[13px] font-semibold text-ink group-hover:text-accent">{title}</h3>
        <Kbd>{keyHint}</Kbd>
      </div>
      <div className="mt-5">{figure}</div>
      {extra}
      <p className="mt-4 text-[12.5px] leading-relaxed text-ink-muted">{body}</p>
    </a>
  )
}

function Big({ n, unit }: { n: number; unit: string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="num text-[28px] leading-none tracking-tight text-ink">{n}</span>
      <span className="text-[12px] text-ink-faint">{unit}</span>
    </div>
  )
}
function Small({ children }: { children: React.ReactNode }) {
  return <div className="mt-1.5 text-[11.5px] text-ink-faint">{children}</div>
}
