import { useCallback, useEffect, useMemo, useState } from "react"
import { BarChart3, Flag, Printer, RotateCcw, Shuffle, Timer } from "lucide-react"
import { buildExam, examMinutes, formatClock, PAPER_SPECS, type Curve, type ExamPaper, type PaperCode } from "@/lib/exam"
import { isTypingTarget } from "@/lib/keyboard"
import { toggleDock, useStore } from "@/lib/store"
import { examHistoryStore, makeAttempt, MISTAKES, saveAttempt, type ExamAttempt, type Mistake } from "@/lib/insights"
import { pace, PACE_BG, PACE_TEXT, targetSeconds } from "@/lib/timing"
import type { Question } from "@/lib/questions"
import { cn } from "@/lib/utils"
import { Btn, Chip, Kbd, Segmented } from "@/components/app/primitives"
import { Markscheme, QuestionMeta, QuestionStatement } from "@/components/question/QuestionBody"
import { PinnedTray } from "@/components/dock/BookletPanel"
import { AttemptStats, HistoryView } from "@/components/exam/ExamStats"

type Phase = "build" | "sit" | "review" | "print" | "history"

const CURVES: { value: Curve; label: string; hint: string }[] = [
  { value: "ramp", label: "Ramp", hint: "Easy opening, hardest last — like a real paper" },
  { value: "flat", label: "Even", hint: "Mid difficulty throughout" },
  { value: "hard-finish", label: "Hard finish", hint: "Steady start, a demanding final third" },
]

export function Exam({ pool, course, onActive }: { pool: Question[]; course: string; onActive: (q: Question | null) => void }) {
  const [paper, setPaper] = useState<PaperCode>("Paper 1")
  const [marks, setMarks] = useState(PAPER_SPECS["Paper 1"].defaultMarks)
  const [curve, setCurve] = useState<Curve>("ramp")
  const [weights, setWeights] = useState<Record<string, number>>({})
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1e6))
  const [exam, setExam] = useState<ExamPaper | null>(null)
  const [phase, setPhase] = useState<Phase>("build")
  const [attempt, setAttempt] = useState<ExamAttempt | null>(null)
  const history = useStore(examHistoryStore)

  useEffect(() => {
    setWeights({})
    setExam(null)
    setAttempt(null)
    setPhase("build")
  }, [course])

  const paperPool = useMemo(() => pool.filter((q) => q.paper === paper), [pool, paper])
  const topics = useMemo(() => {
    const m = new Map<string, number>()
    for (const q of paperPool) m.set(q.topic, (m.get(q.topic) ?? 0) + 1)
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [paperPool])
  const available = paperPool.reduce((s, q) => s + q.marks, 0)

  const preview = useMemo(
    () => buildExam(pool, { paper, targetMarks: marks, weights, curve, seed }),
    [pool, paper, marks, weights, curve, seed],
  )

  const choosePaper = (p: PaperCode) => {
    setPaper(p)
    setMarks(PAPER_SPECS[p].defaultMarks)
    setWeights({})
  }

  const start = () => {
    setExam(preview)
    setPhase("sit")
  }

  const backToBuilder = () => {
    setPhase("build")
    setExam(null)
    setAttempt(null)
  }

  if (exam && phase === "sit")
    return (
      <ExamSitting
        exam={exam}
        course={course}
        onActive={onActive}
        onFinish={(times, flags) => {
          const a = makeAttempt(exam, course, times, flags)
          saveAttempt(a)
          setAttempt(a)
          setPhase("review")
        }}
      />
    )
  if (attempt && (phase === "review" || phase === "print"))
    return (
      <ExamReview
        key={attempt.id}
        initial={attempt}
        pool={pool}
        course={course}
        printMode={phase === "print"}
        onPrint={() => setPhase("print")}
        onBack={backToBuilder}
        onHistory={() => setPhase("history")}
      />
    )
  if (phase === "history")
    return (
      <HistoryView
        course={course}
        pool={pool}
        onBack={backToBuilder}
        onOpen={(a) => {
          setAttempt(a)
          setPhase("review")
        }}
      />
    )

  return (
    <div className="mx-auto grid max-w-[1320px] grid-cols-1 gap-5 p-4 lg:grid-cols-[minmax(0,1fr)_380px] lg:p-6">
      <section className="surface rounded-xl" aria-labelledby="build-title">
        <div className="border-b border-line px-5 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h1 id="build-title" className="text-[13px] font-semibold text-ink">
                Build a {course} paper
              </h1>
              <p className="mt-0.5 text-[12px] text-ink-faint">Questions are drawn from the bank to hit your mark target, weighted by topic.</p>
            </div>
            <Btn size="sm" onClick={() => setPhase("history")} hint="Your scores, pace and weak spots across every paper you have sat">
              <BarChart3 className="size-3.5" /> Your statistics
              <span className="num text-ink-faint">{history.filter((h) => h.course === course).length}</span>
            </Btn>
          </div>
        </div>

        <div className="grid gap-6 p-5">
          <Field label="Paper">
            <div className="grid gap-2 sm:grid-cols-3">
              {(Object.keys(PAPER_SPECS) as PaperCode[]).map((p) => {
                const spec = PAPER_SPECS[p]
                const n = pool.filter((q) => q.paper === p).length
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => choosePaper(p)}
                    aria-pressed={paper === p}
                    disabled={n === 0}
                    className={cn(
                      "rounded-lg border p-3 text-left transition-colors disabled:opacity-40",
                      paper === p ? "border-accent-line bg-accent-wash" : "border-line bg-raised hover:border-line-strong",
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] font-medium text-ink">{p}</span>
                      <span className="num text-[11px] text-ink-faint">{n} q</span>
                    </div>
                    <div className="mt-1 text-[12px] text-ink-muted">{spec.label}</div>
                    <div className="num mt-2 text-[11px] text-ink-faint">
                      {spec.defaultMarks} mk / {spec.minutes} min
                    </div>
                  </button>
                )
              })}
            </div>
          </Field>

          <Field label="Target marks" hint={`${available} marks available in ${paper}`}>
            <div className="flex flex-wrap items-center gap-2">
              {[30, 55, 80, 110].map((m) => (
                <Chip key={m} active={marks === m} onClick={() => setMarks(m)}>
                  <span className="num">{m}</span>
                </Chip>
              ))}
              <input
                type="number"
                min={5}
                max={220}
                value={marks}
                onChange={(e) => setMarks(Math.max(5, Math.min(220, Number(e.target.value) || 5)))}
                aria-label="Custom mark target"
                className="num h-7 w-20 rounded-md border border-line bg-page px-2 text-[12px] outline-none focus:border-accent-line"
              />
              <span className="num text-[12px] text-ink-faint">≈ {examMinutes(paper, marks)} min</span>
            </div>
          </Field>

          <Field label="Difficulty curve">
            <div className="flex flex-wrap items-center gap-3">
              <Segmented label="Difficulty curve" value={curve} onChange={setCurve} options={CURVES.map((c) => ({ value: c.value, label: c.label }))} />
              <span className="text-[12px] text-ink-faint">{CURVES.find((c) => c.value === curve)?.hint}</span>
            </div>
          </Field>

          <Field
            label="Topic weighting"
            hint={
              <button type="button" className="text-accent hover:underline" onClick={() => setWeights({})}>
                Reset
              </button>
            }
          >
            <ul className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
              {topics.map(([topic, n]) => {
                const w = weights[topic] ?? 1
                return (
                  <li key={topic} className="flex items-center gap-3 py-1">
                    <span className={cn("min-w-0 flex-1 truncate text-[12px]", w === 0 ? "text-ink-faint line-through" : "text-ink-muted")}>
                      {topic} <span className="num text-ink-faint">{n}</span>
                    </span>
                    <div className="flex rounded-md border border-line" role="radiogroup" aria-label={`${topic} weight`}>
                      {[0, 1, 2, 3].map((v) => (
                        <button
                          key={v}
                          type="button"
                          role="radio"
                          aria-checked={w === v}
                          onClick={() => setWeights((ws) => ({ ...ws, [topic]: v }))}
                          className={cn(
                            "num h-6 w-7 text-[11px] first:rounded-l-md last:rounded-r-md",
                            w === v ? "bg-accent text-accent-ink" : "text-ink-faint hover:text-ink",
                          )}
                          title={v === 0 ? "Exclude" : `Weight ×${v}`}
                        >
                          {v === 0 ? "–" : `×${v}`}
                        </button>
                      ))}
                    </div>
                  </li>
                )
              })}
              {topics.length === 0 ? <li className="text-[12px] text-ink-faint">No {paper} questions in {course} yet.</li> : null}
            </ul>
          </Field>
        </div>
      </section>

      {/* Live preview of the paper that will be generated */}
      <aside className="surface flex flex-col rounded-xl lg:sticky lg:top-[64px] lg:max-h-[calc(100dvh-88px)]" aria-label="Paper preview">
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <h2 className="text-[13px] font-semibold text-ink">Paper preview</h2>
          <Btn size="sm" tone="ghost" onClick={() => setSeed(Math.floor(Math.random() * 1e6))} hint="Draw a different set of questions with the same settings">
            <Shuffle className="size-3.5" /> Reshuffle
          </Btn>
        </div>
        <div className="grid grid-cols-3 gap-px border-b border-line bg-line">
          <Stat label="questions" value={preview.questions.length} />
          <Stat label="marks" value={preview.totalMarks} />
          <Stat label="minutes" value={preview.minutes} />
        </div>
        <ol className="min-h-0 flex-1 overflow-y-auto px-5 py-3">
          {preview.questions.map((q, i) => (
            <li key={q.id}>
              {i === preview.sectionBreak && preview.sectionBreak > 0 ? (
                <div className="my-2 border-t border-dashed border-line pt-2 text-[11px] text-ink-faint">Section B</div>
              ) : i === 0 && preview.sectionBreak > 0 ? (
                <div className="mb-2 text-[11px] text-ink-faint">Section A</div>
              ) : null}
              <div className="flex items-center gap-3 py-1 text-[12px]">
                <span className="num w-6 text-ink-faint">{i + 1}</span>
                <span className="min-w-0 flex-1 truncate text-ink-muted">{q.topic}</span>
                <span className="num text-ink-faint">d{q.difficulty}</span>
                <span className="num w-10 text-right text-ink">{q.marks}</span>
              </div>
            </li>
          ))}
          {preview.questions.length === 0 ? (
            <li className="py-8 text-center text-[12px] text-ink-faint">Nothing to draw — choose another paper or add topic weight.</li>
          ) : null}
        </ol>
        <div className="border-t border-line p-4">
          <Btn tone="primary" className="w-full" onClick={start} disabled={preview.questions.length === 0}>
            <Timer className="size-3.5" />
            Start timed paper
          </Btn>
          <Btn
            tone="ghost"
            className="mt-2 w-full"
            disabled={preview.questions.length === 0}
            onClick={() => {
              setExam(preview)
              setAttempt(makeAttempt(preview, course))
              setPhase("print")
            }}
          >
            <Printer className="size-3.5" /> Print paper and markscheme
          </Btn>
        </div>
      </aside>
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-[12px] font-medium text-ink">{label}</span>
        {hint ? <span className="text-[11.5px] text-ink-faint">{hint}</span> : null}
      </div>
      {children}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-surface px-4 py-3">
      <div className="num text-[20px] leading-none text-ink">{value}</div>
      <div className="mt-1 text-[11px] text-ink-faint">{label}</div>
    </div>
  )
}

function ExamSitting({
  exam,
  course,
  onFinish,
  onActive,
}: {
  exam: ExamPaper
  course: string
  onFinish: (times: Record<string, number>, flags: Set<string>) => void
  onActive: (q: Question | null) => void
}) {
  const [index, setIndex] = useState(0)
  const [flags, setFlags] = useState<Set<string>>(new Set())
  const [visited, setVisited] = useState<Set<string>>(new Set())
  const [remaining, setRemaining] = useState(exam.minutes * 60)
  const [paused, setPaused] = useState(false)
  const [times, setTimes] = useState<Record<string, number>>({})
  const q = exam.questions[index]

  // One clock drives both the paper countdown and the time charged to the
  // question on screen.
  useEffect(() => {
    if (paused) return
    const t = window.setInterval(() => {
      setRemaining((r) => r - 1)
      setTimes((ts) => ({ ...ts, [q.id]: (ts[q.id] ?? 0) + 1 }))
    }, 1000)
    return () => window.clearInterval(t)
  }, [paused, q.id])

  useEffect(() => {
    onActive(q)
    setVisited((v) => new Set(v).add(q.id))
  }, [q, onActive])
  useEffect(() => () => onActive(null), [onActive])

  const go = useCallback((d: number) => setIndex((i) => Math.min(Math.max(0, i + d), exam.questions.length - 1)), [exam.questions.length])
  const toggleFlag = useCallback(
    () =>
      setFlags((f) => {
        const n = new Set(f)
        if (n.has(q.id)) n.delete(q.id)
        else n.add(q.id)
        return n
      }),
    [q.id],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target) || e.metaKey || e.ctrlKey || e.altKey) return
      const k = e.key.toLowerCase()
      if (k === "j" || e.key === "ArrowRight") go(1)
      else if (k === "k" || e.key === "ArrowLeft") go(-1)
      else if (k === "f") toggleFlag()
      else return
      e.preventDefault()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [go, toggleFlag])

  const over = remaining <= 0
  const low = remaining < 300
  const elapsedRatio = 1 - remaining / (exam.minutes * 60)

  return (
    <div className="mx-auto grid max-w-[1440px] grid-cols-1 gap-4 p-4 lg:grid-cols-[240px_minmax(0,1fr)] lg:p-5">
      <aside className="surface flex flex-col rounded-xl lg:sticky lg:top-[64px] lg:h-[calc(100dvh-88px)]" aria-label="Exam navigation">
        <div className="border-b border-line p-4">
          <div className="text-[11.5px] text-ink-faint">
            {course} {exam.config.paper}
          </div>
          <div
            className={cn("num mt-1 text-[32px] leading-none tracking-tight", over ? "text-hard" : low ? "text-medium" : "text-ink")}
            role="timer"
            aria-live="off"
          >
            {over ? `+${formatClock(-remaining)}` : formatClock(remaining)}
          </div>
          <div className="mt-3 h-1 overflow-hidden rounded-full bg-raised-2">
            <div className={cn("h-full", over ? "bg-hard" : "bg-accent")} style={{ width: `${Math.min(100, elapsedRatio * 100)}%` }} />
          </div>
          <div className="mt-3 flex gap-2">
            <Btn size="sm" onClick={() => setPaused((p) => !p)}>
              {paused ? "Resume" : "Pause"}
            </Btn>
            <Btn size="sm" tone="primary" onClick={() => onFinish(times, flags)} hint="Stop the clock, self-mark, and see your statistics">
              Finish
            </Btn>
          </div>
        </div>
        <div className="p-4">
          <div className="mb-2 flex justify-between text-[11.5px] text-ink-faint">
            <span>Questions</span>
            <span className="num">{exam.totalMarks} mk</span>
          </div>
          <div className="grid grid-cols-5 gap-1.5">
            {exam.questions.map((x, i) => (
              <button
                key={x.id}
                type="button"
                onClick={() => setIndex(i)}
                aria-current={i === index}
                aria-label={`Question ${i + 1}, ${x.marks} marks${flags.has(x.id) ? ", flagged" : ""}`}
                className={cn(
                  "num relative grid h-9 place-items-center rounded-md border text-[12px]",
                  i === index
                    ? "border-accent bg-accent text-accent-ink"
                    : visited.has(x.id)
                      ? "border-line-strong bg-raised text-ink"
                      : "border-line text-ink-faint hover:text-ink",
                )}
              >
                {i + 1}
                {flags.has(x.id) ? <span className="absolute right-0.5 top-0.5 size-1.5 rounded-full bg-medium" /> : null}
                <CellTime seconds={times[x.id] ?? 0} target={targetSeconds(x.marks, exam.config.paper)} />
              </button>
            ))}
          </div>
          <div className="mt-4 grid gap-1 text-[11px] text-ink-faint">
            <span className="flex items-center gap-2">
              <span className="size-2 rounded-sm bg-raised ring-1 ring-line-strong" /> seen
            </span>
            <span className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-medium" /> flagged <Kbd>F</Kbd>
            </span>
            <span className="flex items-center gap-2">
              <span className="h-0.5 w-2 rounded-full bg-accent" /> time used of each question's budget
            </span>
          </div>
        </div>
      </aside>

      <div className="min-w-0">
        <PinnedTray />
        {paused ? (
          <div className="surface mt-3 grid min-h-[50vh] place-items-center rounded-xl text-center">
            <div>
              <p className="text-[13px] text-ink">Paused</p>
              <p className="mt-1 text-[12px] text-ink-faint">The question is hidden while the clock is stopped.</p>
              <Btn tone="primary" className="mt-4" onClick={() => setPaused(false)}>
                Resume
              </Btn>
            </div>
          </div>
        ) : (
          <article key={q.id} className="surface animate-enter mt-3 rounded-xl">
            <div className="flex items-center gap-3 border-b border-line px-5 py-3">
              <div className="min-w-0 flex-1">
                <QuestionMeta question={q} index={`Q${index + 1}`} />
              </div>
              <QuestionClock seconds={times[q.id] ?? 0} target={targetSeconds(q.marks, exam.config.paper)} />
              <Btn size="sm" tone={flags.has(q.id) ? "default" : "ghost"} onClick={toggleFlag} aria-pressed={flags.has(q.id)}>
                <Flag className={cn("size-3.5", flags.has(q.id) && "text-medium")} /> Flag
              </Btn>
            </div>
            <div className="px-5 py-5">
              <QuestionStatement question={q} />
            </div>
            <div className="flex flex-wrap items-center gap-2 border-t border-line px-5 py-3">
              <Btn onClick={() => go(-1)} disabled={index === 0}>
                Previous <Kbd>K</Kbd>
              </Btn>
              <Btn tone="primary" onClick={() => go(1)} disabled={index === exam.questions.length - 1}>
                Next <Kbd className="border-accent-ink/25 bg-accent-ink/10 text-accent-ink">J</Kbd>
              </Btn>
              <span className="ml-auto flex gap-2">
                {exam.config.paper !== "Paper 1" ? (
                  <Btn tone="ghost" onClick={() => toggleDock("desmos")}>
                    Desmos <Kbd>G</Kbd>
                  </Btn>
                ) : (
                  <span className="self-center text-[11.5px] text-ink-faint">No calculator on Paper 1</span>
                )}
                <Btn tone="ghost" onClick={() => toggleDock("booklet")}>
                  Booklet <Kbd>B</Kbd>
                </Btn>
              </span>
            </div>
          </article>
        )}
      </div>
    </div>
  )
}

function CellTime({ seconds, target }: { seconds: number; target: number }) {
  if (!seconds) return null
  return (
    <span className="absolute inset-x-1 bottom-0.5 h-[2px] overflow-hidden rounded-full bg-raised-2">
      <span className={cn("block h-full", PACE_BG[pace(seconds, target)])} style={{ width: `${Math.min(100, (seconds / target) * 100)}%` }} />
    </span>
  )
}

function QuestionClock({ seconds, target }: { seconds: number; target: number }) {
  const p = pace(seconds, target)
  return (
    <div className="relative flex items-center gap-1.5 rounded-md border border-line bg-page px-2 py-1" role="timer" aria-label={`Time on this question ${formatClock(seconds)} of ${formatClock(target)}`}>
      <Timer className="size-3.5 text-accent" />
      <span className={cn("num text-[12px]", PACE_TEXT[p])}>{formatClock(seconds)}</span>
      <span className="num hidden text-[11px] text-ink-faint sm:inline">/ {formatClock(target)}</span>
      {p === "way-over" ? <span className="hidden text-[11px] text-hard md:inline">move on?</span> : null}
      <span className="absolute inset-x-1 bottom-0 h-[2px] overflow-hidden rounded-full bg-raised-2">
        <span className={cn("block h-full", PACE_BG[p])} style={{ width: `${Math.min(100, (seconds / target) * 100)}%` }} />
      </span>
    </div>
  )
}

function ExamReview({
  initial,
  pool,
  course,
  printMode,
  onPrint,
  onBack,
  onHistory,
}: {
  initial: ExamAttempt
  pool: Question[]
  course: string
  printMode: boolean
  onPrint: () => void
  onBack: () => void
  onHistory: () => void
}) {
  // Attempts from a sitting live in history (scores persist); a print-only
  // paper keeps its marks locally.
  const stored = useStore(examHistoryStore).find((a) => a.id === initial.id)
  const [local, setLocal] = useState(initial)
  const attempt = stored ?? local
  // Functional update against the live store so quick successive edits never
  // overwrite each other.
  const update = (fn: (a: ExamAttempt) => ExamAttempt) =>
    stored ? examHistoryStore.set((h) => h.map((x) => (x.id === initial.id ? fn(x) : x))) : setLocal(fn)
  const sat = attempt.items.some((i) => i.seconds > 0)

  const byId = useMemo(() => new Map(pool.map((q) => [q.id, q])), [pool])
  const questions = attempt.items.map((i) => byId.get(i.id)).filter((q): q is Question => Boolean(q))
  const scoredItems = attempt.items.filter((i) => typeof i.score === "number")
  const total = scoredItems.reduce((a, i) => a + (i.score ?? 0), 0)
  const [tab, setTab] = useState<"mark" | "stats">(scoredItems.length ? "stats" : "mark")

  const setScore = (id: string, v: string) =>
    update((a) => ({
      ...a,
      items: a.items.map((i) => {
        if (i.id !== id) return i
        if (v === "") return { ...i, score: undefined }
        const score = Math.max(0, Math.min(i.marks, Number(v)))
        return { ...i, score, mistakes: score >= i.marks ? [] : i.mistakes }
      }),
    }))
  const toggleMistake = (id: string, m: Mistake) =>
    update((a) => ({
      ...a,
      items: a.items.map((i) => (i.id !== id ? i : { ...i, mistakes: i.mistakes.includes(m) ? i.mistakes.filter((x) => x !== m) : [...i.mistakes, m] })),
    }))

  useEffect(() => {
    if (!printMode) return
    const t = window.setTimeout(() => window.print(), 400)
    return () => window.clearTimeout(t)
  }, [printMode])

  return (
    <div className="print-area mx-auto max-w-[1040px] p-4 lg:p-6">
      <div className="no-print mb-4 flex flex-wrap items-center gap-2">
        <Btn onClick={onBack}>
          <RotateCcw className="size-3.5" /> New paper
        </Btn>
        <Btn onClick={onPrint}>
          <Printer className="size-3.5" /> Print
        </Btn>
        {sat ? (
          <Btn tone="ghost" onClick={onHistory} hint="All your papers, trends and recurring weak spots">
            <BarChart3 className="size-3.5" /> All statistics
          </Btn>
        ) : null}
        {!printMode ? (
          <span className="num ml-auto text-[13px] text-ink">
            <span className={scoredItems.length ? "text-gold" : undefined}>{total}</span> / {attempt.totalMarks}
            <span className="text-ink-faint">
              {" "}
              self-marked ({scoredItems.length} of {attempt.items.length})
            </span>
          </span>
        ) : null}
      </div>

      <header className="mb-5 border-b border-line pb-4">
        <h1 className="text-[18px] font-semibold tracking-tight">
          IB Mathematics {course}, {attempt.paper}
        </h1>
        <p className="num mt-1 text-[12px] text-ink-faint">
          {attempt.totalMarks} marks in {attempt.minutes} minutes, {PAPER_SPECS[attempt.paper].label.toLowerCase()}, seed {attempt.seed}
          {sat ? `, sat ${new Date(attempt.at).toLocaleString()}` : ""}
        </p>
        {!printMode && sat ? (
          <div className="no-print mt-4">
            <Segmented
              label="Review section"
              value={tab}
              onChange={setTab}
              options={[
                { value: "mark", label: "Self-mark" },
                { value: "stats", label: "Statistics and feedback" },
              ]}
            />
          </div>
        ) : null}
      </header>

      {!printMode && sat && tab === "stats" ? (
        <AttemptStats attempt={attempt} pool={pool} onMark={() => setTab("mark")} />
      ) : (
        <>
          <ol className="grid gap-6">
            {questions.map((q, i) => (
              <li key={q.id} className="break-inside-avoid">
                <QuestionMeta question={q} index={`Q${i + 1}`} />
                <div className="mt-2">
                  <QuestionStatement question={q} />
                </div>
              </li>
            ))}
          </ol>

          <h2 className="mb-4 mt-10 border-t border-line pt-6 text-[16px] font-semibold" style={{ breakBefore: "page" }}>
            Markscheme
          </h2>
          <ol className="grid gap-6">
            {questions.map((q, i) => {
              const item = attempt.items.find((x) => x.id === q.id)!
              const p = pace(item.seconds, item.target)
              const lostMarks = typeof item.score === "number" && item.score < item.marks
              return (
                <li key={q.id} className="break-inside-avoid rounded-lg border border-line p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                    <span className="num text-[13px] text-ink">
                      Q{i + 1} <span className="text-ink-faint">[{q.marks}]</span>
                      {sat ? (
                        <span className={cn("ml-3 text-[12px]", PACE_TEXT[p])}>
                          {formatClock(item.seconds)} <span className="text-ink-faint">of {formatClock(item.target)}</span>
                        </span>
                      ) : null}
                    </span>
                    <label className="no-print flex items-center gap-2 text-[12px] text-ink-faint">
                      Your marks
                      <input
                        type="number"
                        min={0}
                        max={q.marks}
                        value={item.score ?? ""}
                        onChange={(e) => setScore(q.id, e.target.value)}
                        className="num h-7 w-14 rounded-md border border-line bg-page px-2 text-ink outline-none focus:border-accent-line"
                      />
                    </label>
                  </div>
                  {lostMarks ? (
                    <div className="no-print mb-3 flex flex-wrap items-center gap-1.5" role="group" aria-label={`Why marks were lost on question ${i + 1}`}>
                      <span className="mr-1 text-[11.5px] text-ink-faint">Why were marks lost?</span>
                      {MISTAKES.map((m) => (
                        <Chip key={m.value} active={item.mistakes.includes(m.value)} onClick={() => toggleMistake(q.id, m.value)}>
                          {m.label}
                        </Chip>
                      ))}
                    </div>
                  ) : null}
                  <Markscheme question={q} />
                </li>
              )
            })}
          </ol>
          {!printMode && sat ? (
            <div className="no-print mt-6 flex justify-end">
              <Btn tone="primary" onClick={() => setTab("stats")}>
                <BarChart3 className="size-3.5" /> See statistics and feedback
              </Btn>
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}
