import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { BookOpen, ChevronLeft, ChevronRight, Eraser, LineChart, ScrollText, Star, Timer } from "lucide-react"
import { practiceStore } from "@/lib/session"
import { notesStore, progressStore, starredStore, toggleDock, useStore, type Outcome } from "@/lib/store"
import { useRoute } from "@/lib/router"
import { isTypingTarget } from "@/lib/keyboard"
import { formatClock } from "@/lib/exam"
import { pace, PACE_BG, PACE_TEXT, practiceTimeStore, recordPracticeTime, targetSeconds, useStopwatch } from "@/lib/timing"
import type { Question } from "@/lib/questions"
import { cn } from "@/lib/utils"
import { Btn, Kbd, Segmented } from "@/components/app/primitives"
import { Markscheme, QuestionMeta, QuestionStatement } from "@/components/question/QuestionBody"
import { PinnedTray } from "@/components/dock/BookletPanel"

const OUTCOMES: { value: Outcome; label: string; key: string; tone: string }[] = [
  { value: "got", label: "Got it", key: "Y", tone: "border-easy/40 text-easy data-[on=true]:bg-easy/15" },
  { value: "partial", label: "Partly", key: "P", tone: "border-medium/40 text-medium data-[on=true]:bg-medium/15" },
  { value: "missed", label: "Missed", key: "N", tone: "border-hard/40 text-hard data-[on=true]:bg-hard/15" },
]

export function Practice({
  pool,
  course,
  onActive,
}: {
  pool: Question[]
  course: string
  onActive: (q: Question | null) => void
}) {
  const queue = useStore(practiceStore)
  const route = useRoute()
  const progress = useStore(progressStore)
  const starred = useStore(starredStore)

  const list = useMemo(() => {
    const byId = new Map(pool.map((q) => [q.id, q]))
    const picked = queue.ids.map((id) => byId.get(id)).filter((q): q is Question => Boolean(q))
    return picked.length ? picked : pool
  }, [pool, queue.ids])
  const label = list === pool ? `All ${course} questions` : queue.label || "Custom set"

  const [index, setIndex] = useState(0)
  const [direction, setDirection] = useState<"next" | "prev">("next")
  const [showMs, setShowMs] = useState(false)
  const routeId = route.params.get("id")

  useEffect(() => {
    if (!routeId) return
    const i = list.findIndex((q) => q.id === routeId)
    if (i >= 0) setIndex(i)
  }, [routeId, list])

  const safeIndex = Math.min(index, Math.max(0, list.length - 1))
  const question = list[safeIndex] ?? null

  useEffect(() => {
    onActive(question)
    setShowMs(false)
    if (question) window.history.replaceState(null, "", `#/practice?id=${question.id}`)
  }, [question, onActive])
  useEffect(() => () => onActive(null), [onActive])

  const go = useCallback(
    (delta: number) => {
      setDirection(delta > 0 ? "next" : "prev")
      setIndex((i) => Math.min(Math.max(0, i + delta), list.length - 1))
    },
    [list.length],
  )

  const mark = useCallback(
    (o: Outcome) => {
      if (!question) return
      progressStore.set((p) => ({ ...p, [question.id]: o }))
    },
    [question],
  )

  const toggleStar = useCallback(() => {
    if (!question) return
    starredStore.set((s) => (s.includes(question.id) ? s.filter((x) => x !== question.id) : [...s, question.id]))
  }, [question])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target) || e.metaKey || e.ctrlKey || e.altKey) return
      const k = e.key.toLowerCase()
      if (k === "j" || e.key === "ArrowRight") go(1)
      else if (k === "k" || e.key === "ArrowLeft") go(-1)
      else if (k === "m") setShowMs((s) => !s)
      else if (k === "s") toggleStar()
      else if (k === "y") mark("got")
      else if (k === "p") mark("partial")
      else if (k === "n") mark("missed")
      else return
      e.preventDefault()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [go, mark, toggleStar])

  if (!question) {
    return (
      <div className="grid min-h-[60vh] place-items-center p-6 text-center">
        <div>
          <p className="text-[13px] text-ink">There are no questions to practice yet.</p>
          <p className="mt-1 text-[12px] text-ink-faint">Pick a set in the Question bank, then choose Practice.</p>
          <a href="#/bank" className="mt-4 inline-block text-[13px] text-accent hover:underline">
            Open the question bank
          </a>
        </div>
      </div>
    )
  }

  const done = list.filter((q) => progress[q.id]).length
  const outcome = progress[question.id]
  const isStarred = starred.includes(question.id)

  return (
    <div className="mx-auto grid max-w-[1440px] grid-cols-1 gap-4 p-4 lg:p-5 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="min-w-0">
        {/* Set header + progress */}
        <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2">
          <div className="min-w-0">
            <div className="truncate text-[12px] text-ink-faint">{label}</div>
            <div className="num text-[13px] text-ink">
              {String(safeIndex + 1).padStart(String(list.length).length, "0")}
              <span className="text-ink-faint"> / {list.length}</span>
            </div>
          </div>
          <ProgressStrip list={list} progress={progress} current={safeIndex} onJump={(i) => setIndex(i)} />
          <span className="num ml-auto text-[11.5px] text-ink-faint">{done} marked</span>
        </div>

        <PinnedTray />

        <article
          key={question.id}
          className={cn("surface mt-3 rounded-xl", direction === "next" ? "animate-slide-next" : "animate-slide-prev")}
          aria-label="Current question"
        >
          <div className="flex items-center gap-3 border-b border-line px-5 py-3">
            <div className="min-w-0 flex-1">
              <QuestionMeta question={question} />
            </div>
            <QuestionTimer question={question} running={!showMs} />
            <button
              type="button"
              onClick={toggleStar}
              aria-pressed={isStarred}
              aria-label={isStarred ? "Unstar question" : "Star question"}
              title="Star (S)"
              className={cn("grid size-7 place-items-center rounded-md hover:bg-raised", isStarred ? "text-gold" : "text-ink-faint")}
            >
              <Star className="size-4" fill={isStarred ? "currentColor" : "none"} />
            </button>
          </div>
          <div className="px-5 py-5">
            <QuestionStatement question={question} />
          </div>
          <div className="border-t border-line px-5 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <Btn onClick={() => setShowMs((s) => !s)} aria-expanded={showMs} hint="Worked solution with IB mark allocations (M1, A1, R1)">
                <ScrollText className="size-3.5" />
                {showMs ? "Hide markscheme" : "Show markscheme"} <Kbd>M</Kbd>
              </Btn>
              <Btn tone="ghost" onClick={() => toggleDock("desmos")} hint="Open Desmos beside this question; its function can be plotted in one click">
                <LineChart className="size-3.5" />
                Desmos <Kbd>G</Kbd>
              </Btn>
              <Btn tone="ghost" onClick={() => toggleDock("booklet")} hint="Searchable formula booklet; pin formulas above the question">
                <BookOpen className="size-3.5" />
                Booklet <Kbd>B</Kbd>
              </Btn>
              <div className="ml-auto flex items-center gap-1.5" role="group" aria-label="Self-mark this question">
                {OUTCOMES.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    data-on={outcome === o.value}
                    aria-pressed={outcome === o.value}
                    onClick={() => mark(o.value)}
                    className={cn("inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[12px] font-medium", o.tone)}
                  >
                    {o.label} <Kbd>{o.key}</Kbd>
                  </button>
                ))}
              </div>
            </div>
            {showMs ? (
              <div className="mt-4 rounded-lg border border-line bg-page p-4">
                <Markscheme question={question} />
              </div>
            ) : null}
          </div>
        </article>

        <div className="mt-3 flex items-center justify-between">
          <Btn onClick={() => go(-1)} disabled={safeIndex === 0} hint="Previous question (K or ←)">
            <ChevronLeft className="size-4" /> Previous <Kbd>K</Kbd>
          </Btn>
          <span className="hidden text-[11.5px] text-ink-faint sm:inline">
            <Kbd>J</Kbd> <Kbd>K</Kbd> or arrow keys to move
          </span>
          <Btn tone="primary" onClick={() => go(1)} disabled={safeIndex === list.length - 1} hint="Next question (J or →)">
            Next <Kbd className="border-accent-ink/25 bg-accent-ink/10 text-accent-ink">J</Kbd> <ChevronRight className="size-4" />
          </Btn>
        </div>
      </div>

      <Scratchpad questionId={question.id} />
    </div>
  )
}

/**
 * Time on the current question against its exam budget. It runs until the
 * markscheme is opened (that is your attempt time), pauses in background tabs,
 * and the attempt is saved when you move to another question.
 */
function QuestionTimer({ question, running }: { question: Question; running: boolean }) {
  const seconds = useStopwatch(question.id, running, recordPracticeTime)
  const history = useStore(practiceTimeStore)[question.id]
  const target = targetSeconds(question.marks, question.paper)
  const p = pace(seconds, target)
  const previous = history ? `Last attempt ${formatClock(history.last)}, ${history.attempts} attempt${history.attempts === 1 ? "" : "s"} in total.` : "First attempt."
  return (
    <div
      className="group relative flex items-center gap-2 rounded-md border border-line bg-page px-2 py-1"
      role="timer"
      aria-label={`Time on this question ${formatClock(seconds)} of a ${formatClock(target)} budget`}
    >
      <Timer className={cn("size-3.5", running ? "text-accent" : "text-ink-faint")} />
      <span className={cn("num text-[12px]", PACE_TEXT[p])}>{formatClock(seconds)}</span>
      <span className="num hidden text-[11px] text-ink-faint sm:inline">/ {formatClock(target)}</span>
      <span className="absolute inset-x-1 bottom-0 h-[2px] overflow-hidden rounded-full bg-raised-2">
        <span className={cn("block h-full transition-[width]", PACE_BG[p])} style={{ width: `${Math.min(100, (seconds / target) * 100)}%` }} />
      </span>
      <span className="pointer-events-none absolute right-0 top-full z-30 mt-2 hidden w-56 rounded-lg border border-line bg-raised p-2.5 text-[11.5px] leading-snug text-ink-muted group-hover:block sm:w-64">
        Budget is {formatClock(target)} for {question.marks} marks at exam pace. {running ? "The clock stops when you open the markscheme." : "Stopped: markscheme open."} {previous}
      </span>
    </div>
  )
}

function ProgressStrip({
  list,
  progress,
  current,
  onJump,
}: {
  list: Question[]
  progress: Record<string, Outcome>
  current: number
  onJump: (i: number) => void
}) {
  // Bucket long lists so the strip stays one line.
  const buckets = Math.min(list.length, 60)
  const size = list.length / buckets
  return (
    <div className="hidden h-5 min-w-[200px] flex-1 items-center gap-[2px] md:flex" aria-label="Set progress">
      {Array.from({ length: buckets }, (_, b) => {
        const start = Math.floor(b * size)
        const end = Math.max(start + 1, Math.floor((b + 1) * size))
        const slice = list.slice(start, end)
        const states = slice.map((q) => progress[q.id])
        const tone = states.includes("missed")
          ? "bg-hard"
          : states.includes("partial")
            ? "bg-medium"
            : states.length && states.every((s) => s === "got")
              ? "bg-easy"
              : states.some(Boolean)
                ? "bg-easy/50"
                : "bg-raised-2"
        const here = current >= start && current < end
        return (
          <button
            key={b}
            type="button"
            onClick={() => onJump(start)}
            aria-label={`Jump to question ${start + 1}`}
            className={cn("h-full flex-1 rounded-[2px] transition-opacity hover:opacity-80", tone, here && "outline outline-1 outline-accent")}
          />
        )
      })}
    </div>
  )
}

function Scratchpad({ questionId }: { questionId: string }) {
  const [tab, setTab] = useState<"notes" | "sketch">("notes")
  const notes = useStore(notesStore)
  return (
    <aside className="surface flex min-h-[320px] flex-col rounded-xl xl:sticky xl:top-[64px] xl:h-[calc(100dvh-88px)]" aria-label="Scratchpad">
      <div className="flex items-center justify-between border-b border-line px-3 py-2">
        <span className="text-[12px] font-semibold text-ink">Scratchpad</span>
        <Segmented
          label="Scratchpad mode"
          value={tab}
          onChange={setTab}
          options={[
            { value: "notes", label: "Notes" },
            { value: "sketch", label: "Sketch" },
          ]}
        />
      </div>
      {tab === "notes" ? (
        <textarea
          value={notes[questionId] ?? ""}
          onChange={(e) => notesStore.set((n) => ({ ...n, [questionId]: e.target.value }))}
          placeholder="Working, reminders, the step you got stuck on. Saved per question."
          aria-label="Notes for this question"
          className="num min-h-[240px] flex-1 resize-none bg-transparent p-3 text-[12.5px] leading-relaxed text-ink outline-none placeholder:font-sans placeholder:text-ink-faint"
        />
      ) : (
        <SketchPad key={questionId} />
      )}
    </aside>
  )
}

function SketchPad() {
  const canvas = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const last = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    const c = canvas.current
    if (!c) return
    const resize = () => {
      const r = c.getBoundingClientRect()
      const ratio = window.devicePixelRatio || 1
      c.width = r.width * ratio
      c.height = r.height * ratio
      const ctx = c.getContext("2d")
      ctx?.scale(ratio, ratio)
    }
    resize()
  }, [])

  const point = (e: React.PointerEvent) => {
    const r = canvas.current!.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }
  const down = (e: React.PointerEvent) => {
    drawing.current = true
    last.current = point(e)
    canvas.current?.setPointerCapture(e.pointerId)
  }
  const move = (e: React.PointerEvent) => {
    if (!drawing.current || !last.current) return
    const ctx = canvas.current?.getContext("2d")
    if (!ctx) return
    const p = point(e)
    ctx.strokeStyle = e.buttons === 32 ? "#081110" : "#e6efee"
    ctx.lineWidth = e.pressure ? 1 + e.pressure * 2 : 1.8
    ctx.lineCap = "round"
    ctx.beginPath()
    ctx.moveTo(last.current.x, last.current.y)
    ctx.lineTo(p.x, p.y)
    ctx.stroke()
    last.current = p
  }
  const up = () => {
    drawing.current = false
    last.current = null
  }
  const clear = () => {
    const c = canvas.current
    c?.getContext("2d")?.clearRect(0, 0, c.width, c.height)
  }
  return (
    <div className="relative flex-1">
      <canvas
        ref={canvas}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerLeave={up}
        className="absolute inset-0 h-full w-full touch-none rounded-b-xl bg-[radial-gradient(rgba(168,186,183,0.16)_1px,transparent_1px)] [background-size:16px_16px]"
        aria-label="Sketch area"
      />
      <Btn size="sm" tone="ghost" className="absolute bottom-2 right-2" onClick={clear}>
        <Eraser className="size-3.5" /> Clear
      </Btn>
    </div>
  )
}
