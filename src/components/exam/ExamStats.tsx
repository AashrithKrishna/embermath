import { useMemo } from "react"
import { ArrowLeft, Dumbbell, Trash2 } from "lucide-react"
import { formatClock } from "@/lib/exam"
import { examHistoryStore, feedback, MISTAKES, ratio, summarize, type AttemptItem, type ExamAttempt, type Feedback, type Row } from "@/lib/insights"
import { practiceStore } from "@/lib/session"
import { navigate } from "@/lib/router"
import { progressStore, useStore } from "@/lib/store"
import { pace, PACE_BG, PACE_TEXT } from "@/lib/timing"
import type { Question } from "@/lib/questions"
import { cn } from "@/lib/utils"
import { Btn } from "@/components/app/primitives"

const pct = (a: number, b: number) => (b > 0 ? `${Math.round((a / b) * 100)}%` : "–")

/** Load a focused practice set for a topic: missed first, then unseen, then the rest. */
function practiceTopic(pool: Question[], topic: string) {
  const progress = progressStore.get()
  const rank = (q: Question) => (progress[q.id] === "missed" ? 0 : progress[q.id] === "partial" ? 1 : !progress[q.id] ? 2 : 3)
  const ids = pool
    .filter((q) => q.topic === topic)
    .sort((a, b) => rank(a) - rank(b) || a.difficulty - b.difficulty)
    .slice(0, 15)
    .map((q) => q.id)
  practiceStore.set({ ids, label: `${topic}: weak-spot drill` })
  navigate("practice")
}

/** Score readouts are the one gold figure in a row; an unmarked "–" stays ink. */
const scoreTone = (scored: number) => (scored ? "text-gold" : "text-ink")

function Kpis({ items }: { items: { label: string; value: React.ReactNode; note?: React.ReactNode; tone?: string }[] }) {
  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line lg:grid-cols-4">
      {items.map((k) => (
        <div key={k.label} className="bg-surface px-4 py-3">
          <div className={cn("num text-[22px] leading-none", k.tone ?? "text-ink")}>{k.value}</div>
          <div className="mt-1.5 text-[11.5px] text-ink-faint">{k.label}</div>
          {k.note ? <div className="num mt-0.5 text-[11px] text-ink-muted">{k.note}</div> : null}
        </div>
      ))}
    </div>
  )
}

const TONE_DOT = { hard: "bg-hard", medium: "bg-medium", easy: "bg-easy" } as const

function FeedbackList({ items, pool, empty }: { items: Feedback[]; pool: Question[]; empty: React.ReactNode }) {
  return (
    <section className="surface rounded-xl" aria-labelledby="fb-title">
      <div className="border-b border-line px-5 py-3">
        <h2 id="fb-title" className="text-[13px] font-semibold text-ink">
          What to work on
        </h2>
        <p className="mt-0.5 text-[12px] text-ink-faint">Ranked from your marks, your mistake tags and the time each question took.</p>
      </div>
      {items.length ? (
        <ul className="divide-y divide-line">
          {items.map((f, i) => (
            <li key={i} className="flex flex-wrap items-start gap-3 px-5 py-3.5">
              <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", TONE_DOT[f.tone])} aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] text-ink">{f.title}</p>
                <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-muted">{f.detail}</p>
              </div>
              {f.topic && f.tone !== "easy" ? (
                <Btn size="sm" onClick={() => practiceTopic(pool, f.topic!)} hint={`Up to 15 ${f.topic} questions, the ones you missed first`}>
                  <Dumbbell className="size-3.5" /> Drill topic
                </Btn>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <div className="px-5 py-8 text-center text-[12.5px] text-ink-faint">{empty}</div>
      )}
    </section>
  )
}

function TimeChart({ items }: { items: AttemptItem[] }) {
  const max = Math.max(1, ...items.map((i) => Math.max(i.seconds, i.target)))
  return (
    <section className="surface rounded-xl" aria-labelledby="time-title">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line px-5 py-3">
        <h2 id="time-title" className="text-[13px] font-semibold text-ink">
          Time per question
        </h2>
        <span className="flex items-center gap-3 text-[11px] text-ink-faint">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-px bg-ink-muted" /> budget
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-sm bg-accent" /> on budget
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-sm bg-medium" /> up to 1.5×
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-sm bg-hard" /> beyond
          </span>
        </span>
      </div>
      <ol className="grid gap-1.5 px-5 py-4">
        {items.map((i, n) => {
          const p = pace(i.seconds, i.target)
          return (
            <li key={i.id} className="grid grid-cols-[34px_minmax(0,1fr)_64px_52px] items-center gap-3 text-[12px] sm:grid-cols-[34px_150px_minmax(0,1fr)_64px_52px]">
              <span className="num text-ink-faint">Q{n + 1}</span>
              <span className="hidden truncate text-ink-muted sm:block" title={i.topic}>
                {i.topic}
              </span>
              <span className="relative h-3 rounded-sm bg-raised-2" aria-label={`${formatClock(i.seconds)} of ${formatClock(i.target)}`}>
                <span className={cn("absolute inset-y-0 left-0 rounded-sm", PACE_BG[p])} style={{ width: `${(i.seconds / max) * 100}%` }} />
                <span className="absolute -inset-y-0.5 w-px bg-ink-muted" style={{ left: `${(i.target / max) * 100}%` }} />
              </span>
              <span className={cn("num text-right", PACE_TEXT[p])}>{formatClock(i.seconds)}</span>
              <span className="num text-right text-ink">{typeof i.score === "number" ? `${i.score}/${i.marks}` : <span className="text-ink-faint">–/{i.marks}</span>}</span>
            </li>
          )
        })}
      </ol>
    </section>
  )
}

function TopicTable({ rows, title }: { rows: Row[]; title: string }) {
  return (
    <section className="surface rounded-xl" aria-label={title}>
      <div className="border-b border-line px-5 py-3">
        <h2 className="text-[13px] font-semibold text-ink">{title}</h2>
      </div>
      <table className="w-full text-[12px]">
        <thead>
          <tr className="text-left text-[11px] text-ink-faint">
            <th className="px-5 py-2 font-normal">Topic</th>
            <th className="px-2 py-2 font-normal">Marks</th>
            <th className="hidden px-2 py-2 font-normal sm:table-cell">Time vs budget</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const acc = ratio(r.earned, r.possible)
            const t = ratio(r.seconds, r.target)
            return (
              <tr key={r.key} className="border-t border-line">
                <td className="max-w-0 truncate px-5 py-2 text-ink-muted" title={r.key}>
                  {r.key}
                </td>
                <td className="w-[44%] px-2 py-2 sm:w-[34%]">
                  <div className="flex items-center gap-2">
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-raised-2">
                      <span className={cn("block h-full", acc >= 0.7 ? "bg-easy" : acc >= 0.45 ? "bg-medium" : "bg-hard")} style={{ width: `${acc * 100}%` }} />
                    </span>
                    <span className="num w-16 text-right text-ink">{r.possible ? `${r.earned}/${r.possible}` : "–"}</span>
                  </div>
                </td>
                <td className={cn("num hidden w-[22%] px-2 py-2 sm:table-cell", r.seconds ? PACE_TEXT[pace(r.seconds, r.target)] : "text-ink-faint")}>
                  {r.seconds ? `${t.toFixed(1)}×` : "–"}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </section>
  )
}

function MistakeTally({ marks, count }: { marks: Record<string, number>; count: Record<string, number> }) {
  const any = MISTAKES.some((m) => count[m.value])
  return (
    <section className="surface rounded-xl" aria-labelledby="mk-title">
      <div className="border-b border-line px-5 py-3">
        <h2 id="mk-title" className="text-[13px] font-semibold text-ink">
          Where marks went
        </h2>
      </div>
      {any ? (
        <ul className="grid gap-2 px-5 py-4">
          {MISTAKES.map((m) => (
            <li key={m.value} className="flex items-center justify-between text-[12.5px]">
              <span className={count[m.value] ? "text-ink" : "text-ink-faint"}>{m.label}</span>
              <span className="num text-ink-muted">
                {marks[m.value]} mk <span className="text-ink-faint">on {count[m.value]} q</span>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="px-5 py-6 text-[12px] text-ink-faint">Tag why marks were lost while self-marking, and the cost of each kind of mistake shows here.</p>
      )}
    </section>
  )
}

/** Statistics for one sitting. */
export function AttemptStats({ attempt, pool, onMark }: { attempt: ExamAttempt; pool: Question[]; onMark: () => void }) {
  const sum = useMemo(() => summarize(attempt.items), [attempt])
  const fb = useMemo(() => feedback(attempt.items, { perQuestion: true, allowedSeconds: attempt.minutes * 60 }), [attempt])
  const allowed = attempt.minutes * 60
  const lostToMistakes = attempt.items.filter((i) => i.mistakes.length).reduce((a, i) => a + i.marks - (i.score ?? 0), 0)
  const unscored = attempt.items.length - sum.scored

  return (
    <div className="grid gap-4">
      {unscored ? (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-accent-line bg-accent-wash px-4 py-3 text-[12.5px] text-ink">
          <span className="flex-1">
            {unscored} of {attempt.items.length} questions are not self-marked yet. Scores and mistake tags make the feedback specific.
          </span>
          <Btn size="sm" onClick={onMark}>
            Self-mark now
          </Btn>
        </div>
      ) : null}
      <Kpis
        items={[
          { label: "Score", value: sum.scored ? pct(sum.earned, sum.possible) : "–", note: sum.scored ? `${sum.earned} of ${sum.possible} marks` : "not marked yet", tone: scoreTone(sum.scored) },
          {
            label: "Time used",
            value: formatClock(sum.used),
            note: `of ${formatClock(allowed)}`,
            tone: sum.used > allowed ? "text-hard" : "text-ink",
          },
          {
            label: "Marks per minute",
            value: sum.scored && sum.used ? (sum.earned / (sum.used / 60)).toFixed(2) : "–",
            note: `exam pace ${(attempt.totalMarks / attempt.minutes).toFixed(2)}`,
          },
          { label: "Lost to tagged mistakes", value: lostToMistakes, note: "marks", tone: lostToMistakes ? "text-medium" : "text-ink" },
        ]}
      />
      <FeedbackList items={fb} pool={pool} empty="Self-mark at least one question to get feedback." />
      <TimeChart items={attempt.items} />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <TopicTable rows={sum.byTopic} title="By topic" />
        <MistakeTally marks={sum.mistakeMarks} count={sum.mistakeCount} />
      </div>
    </div>
  )
}

function Trend({ attempts }: { attempts: ExamAttempt[] }) {
  const points = attempts
    .map((a) => ({ a, s: summarize(a.items) }))
    .filter((p) => p.s.scored)
    .map((p) => ({ at: p.a.at, v: ratio(p.s.earned, p.s.possible), pace: ratio(p.s.used, p.s.budgetSeen) }))
  if (points.length < 2) return <p className="px-5 py-8 text-center text-[12px] text-ink-faint">Self-mark two or more papers to see your trend.</p>
  const W = 600
  const H = 140
  const x = (i: number) => 16 + (i * (W - 32)) / (points.length - 1)
  const y = (v: number) => H - 16 - v * (H - 32)
  const line = (key: "v" | "pace") => points.map((p, i) => `${x(i)},${y(Math.min(1.5, p[key]) / (key === "pace" ? 1.5 : 1))}`).join(" ")
  return (
    <div className="px-5 py-4">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-36 w-full" role="img" aria-label="Score per paper over time">
        {[0, 0.5, 1].map((g) => (
          <line key={g} x1={16} x2={W - 16} y1={y(g)} y2={y(g)} stroke="var(--color-line)" />
        ))}
        <polyline points={line("pace")} fill="none" stroke="var(--color-ink-muted)" strokeWidth={1.5} strokeDasharray="4 4" opacity={0.7} />
        <polyline points={line("v")} fill="none" stroke="var(--color-gold)" strokeWidth={2} />
        {points.map((p, i) => (
          <circle key={i} cx={x(i)} cy={y(p.v)} r={3.5} fill="var(--color-gold)">
            <title>{`${new Date(p.at).toLocaleDateString()}: ${Math.round(p.v * 100)}%`}</title>
          </circle>
        ))}
      </svg>
      <div className="mt-1 flex gap-4 text-[11px] text-ink-faint">
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-3 bg-gold" /> score
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-3 bg-ink-muted" /> time used of budget (lower is faster)
        </span>
      </div>
    </div>
  )
}

/** Statistics across every paper sat in this course: the long-run feedback loop. */
export function HistoryView({ course, pool, onBack, onOpen }: { course: string; pool: Question[]; onBack: () => void; onOpen: (a: ExamAttempt) => void }) {
  const all = useStore(examHistoryStore)
  const attempts = useMemo(() => all.filter((a) => a.course === course), [all, course])
  const chrono = useMemo(() => [...attempts].sort((a, b) => a.at - b.at), [attempts])
  const items = useMemo(() => attempts.flatMap((a) => a.items), [attempts])
  const sum = useMemo(() => summarize(items), [items])
  const fb = useMemo(() => feedback(items), [items])

  return (
    <div className="mx-auto grid max-w-[1180px] gap-4 p-4 lg:p-6">
      <div className="flex flex-wrap items-center gap-3">
        <Btn onClick={onBack}>
          <ArrowLeft className="size-3.5" /> Exam builder
        </Btn>
        <div>
          <h1 className="text-[16px] font-semibold text-ink">Your {course} statistics</h1>
          <p className="text-[12px] text-ink-faint">Every timed paper you sit is saved on this device and feeds this page.</p>
        </div>
      </div>

      {attempts.length === 0 ? (
        <div className="surface grid min-h-[40vh] place-items-center rounded-xl p-6 text-center">
          <div>
            <p className="text-[13px] text-ink">No papers sat yet.</p>
            <p className="mt-1 text-[12px] text-ink-faint">Build a paper, sit it against the clock, then self-mark it. Your statistics start there.</p>
            <Btn tone="primary" className="mt-4" onClick={onBack}>
              Build a paper
            </Btn>
          </div>
        </div>
      ) : (
        <>
          <Kpis
            items={[
              { label: "Papers sat", value: attempts.length, note: `${items.length} questions` },
              { label: "Average score", value: sum.scored ? pct(sum.earned, sum.possible) : "–", note: `${sum.earned} of ${sum.possible} marks`, tone: scoreTone(sum.scored) },
              {
                label: "Pace",
                value: sum.budgetSeen ? `${ratio(sum.used, sum.budgetSeen).toFixed(2)}×` : "–",
                note: "time used of budget, questions opened",
                tone: sum.used > sum.budgetSeen ? "text-medium" : "text-ink",
              },
              { label: "Time practiced", value: formatClock(sum.used), note: "under exam conditions" },
            ]}
          />
          <FeedbackList items={fb} pool={pool} empty="Self-mark a paper to get feedback across your history." />
          <section className="surface rounded-xl" aria-labelledby="trend-title">
            <div className="border-b border-line px-5 py-3">
              <h2 id="trend-title" className="text-[13px] font-semibold text-ink">
                Trend
              </h2>
            </div>
            <Trend attempts={chrono} />
          </section>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <TopicTable rows={sum.byTopic} title="By topic, all papers" />
            <MistakeTally marks={sum.mistakeMarks} count={sum.mistakeCount} />
          </div>
          <section className="surface rounded-xl" aria-labelledby="papers-title">
            <div className="border-b border-line px-5 py-3">
              <h2 id="papers-title" className="text-[13px] font-semibold text-ink">
                Papers
              </h2>
            </div>
            <ul className="divide-y divide-line">
              {attempts.map((a) => {
                const s = summarize(a.items)
                return (
                  <li key={a.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 text-[12.5px]">
                    <span className="num w-36 text-ink-faint">{new Date(a.at).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</span>
                    <span className="text-ink">{a.paper}</span>
                    <span className="num text-ink-muted">{s.scored ? `${s.earned}/${s.possible} (${pct(s.earned, s.possible)})` : "not marked"}</span>
                    <span className={cn("num", s.used > a.minutes * 60 ? "text-hard" : "text-ink-faint")}>
                      {formatClock(s.used)} of {formatClock(a.minutes * 60)}
                    </span>
                    <span className="ml-auto flex gap-1.5">
                      <Btn size="sm" onClick={() => onOpen(a)}>
                        Review
                      </Btn>
                      <Btn
                        size="sm"
                        tone="ghost"
                        aria-label="Delete this paper from history"
                        onClick={() => {
                          if (window.confirm("Delete this paper and its marks from your history?")) examHistoryStore.set((h) => h.filter((x) => x.id !== a.id))
                        }}
                      >
                        <Trash2 className="size-3.5" />
                      </Btn>
                    </span>
                  </li>
                )
              })}
            </ul>
          </section>
        </>
      )}
    </div>
  )
}
