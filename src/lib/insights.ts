import { formatClock, type ExamPaper, type PaperCode } from "./exam"
import { createStore } from "./store"
import { targetSeconds } from "./timing"

/** Why marks were lost on a question, tagged by the student while self-marking. */
export type Mistake = "careless" | "concept" | "misread" | "time" | "blank"

export const MISTAKES: { value: Mistake; label: string; advice: string }[] = [
  { value: "careless", label: "Careless slip", advice: "Re-check signs, arithmetic and copied values; keep five minutes at the end to re-read your working." },
  { value: "concept", label: "Didn't know how", advice: "Read the matching cheatsheet, then redo the question without the markscheme." },
  { value: "misread", label: "Misread", advice: "Underline the command term (show, hence, exact) and the required form before you start." },
  { value: "time", label: "Ran out of time", advice: "Leave a question once its time budget runs out and come back at the end." },
  { value: "blank", label: "Didn't attempt", advice: "Write down the first method mark you can see; partial working still earns M1." },
]

export interface AttemptItem {
  id: string
  topic: string
  difficulty: number
  marks: number
  /** Seconds the question was on screen during the sitting. */
  seconds: number
  /** Time budget from the paper's minutes-per-mark ratio. */
  target: number
  flagged: boolean
  score?: number
  mistakes: Mistake[]
}

export interface ExamAttempt {
  id: string
  at: number
  course: string
  paper: PaperCode
  minutes: number
  totalMarks: number
  seed: number
  items: AttemptItem[]
}

export const examHistoryStore = createStore<ExamAttempt[]>("mhqb.examHistory", [], (v): v is ExamAttempt[] => Array.isArray(v))

export function makeAttempt(exam: ExamPaper, course: string, times: Record<string, number> = {}, flags: Set<string> = new Set()): ExamAttempt {
  return {
    id: `x${Date.now().toString(36)}`,
    at: Date.now(),
    course,
    paper: exam.config.paper,
    minutes: exam.minutes,
    totalMarks: exam.totalMarks,
    seed: exam.config.seed,
    items: exam.questions.map((q) => ({
      id: q.id,
      topic: q.topic,
      difficulty: q.difficulty,
      marks: q.marks,
      seconds: times[q.id] ?? 0,
      target: targetSeconds(q.marks, exam.config.paper),
      flagged: flags.has(q.id),
      mistakes: [],
    })),
  }
}

export function saveAttempt(a: ExamAttempt) {
  examHistoryStore.set((h) => [a, ...h.filter((x) => x.id !== a.id)].slice(0, 60))
}

export const usedSeconds = (items: AttemptItem[]) => items.reduce((s, i) => s + i.seconds, 0)
const scoredItems = (items: AttemptItem[]) => items.filter((i) => typeof i.score === "number")
const lost = (i: AttemptItem) => i.marks - (i.score ?? 0)

export interface Row {
  key: string
  n: number
  earned: number
  possible: number
  seconds: number
  target: number
}

function group(items: AttemptItem[], by: (i: AttemptItem) => string): Row[] {
  const m = new Map<string, Row>()
  for (const i of items) {
    const k = by(i)
    const r = m.get(k) ?? { key: k, n: 0, earned: 0, possible: 0, seconds: 0, target: 0 }
    r.n += 1
    r.seconds += i.seconds
    r.target += i.target
    if (typeof i.score === "number") {
      r.earned += i.score
      r.possible += i.marks
    }
    m.set(k, r)
  }
  return [...m.values()]
}

export const ratio = (a: number, b: number) => (b > 0 ? a / b : 0)

export interface Summary {
  scored: number
  earned: number
  possible: number
  used: number
  budget: number
  /** Budget of the questions that were actually opened (seconds > 0). */
  budgetSeen: number
  byTopic: Row[]
  byDifficulty: Row[]
  /** Marks lost per mistake type (a question tagged twice counts for both). */
  mistakeMarks: Record<Mistake, number>
  mistakeCount: Record<Mistake, number>
}

export function summarize(items: AttemptItem[]): Summary {
  const s = scoredItems(items)
  const mistakeMarks = { careless: 0, concept: 0, misread: 0, time: 0, blank: 0 }
  const mistakeCount = { ...mistakeMarks }
  for (const i of s)
    for (const m of i.mistakes) {
      mistakeMarks[m] += lost(i)
      mistakeCount[m] += 1
    }
  return {
    scored: s.length,
    earned: s.reduce((a, i) => a + (i.score ?? 0), 0),
    possible: s.reduce((a, i) => a + i.marks, 0),
    used: usedSeconds(items),
    budget: items.reduce((a, i) => a + i.target, 0),
    budgetSeen: items.reduce((a, i) => a + (i.seconds > 0 ? i.target : 0), 0),
    byTopic: group(items, (i) => i.topic).sort((a, b) => ratio(a.earned, a.possible) - ratio(b.earned, b.possible)),
    byDifficulty: group(items, (i) => String(i.difficulty)).sort((a, b) => Number(a.key) - Number(b.key)),
    mistakeMarks,
    mistakeCount,
  }
}

export type FeedbackTone = "hard" | "medium" | "easy"
export interface Feedback {
  tone: FeedbackTone
  title: string
  detail: string
  /** Topic to drill, offered as a practice set. */
  topic?: string
}

const pct = (a: number, b: number) => `${Math.round(ratio(a, b) * 100)}%`

/**
 * The feedback loop: turns self-marked scores, mistake tags and per-question
 * timing into a ranked list of what to work on. `perQuestion` names individual
 * questions (one sitting); otherwise it reasons at topic level (history).
 */
export function feedback(items: AttemptItem[], opts: { allowedSeconds?: number; perQuestion?: boolean } = {}): Feedback[] {
  const out: Feedback[] = []
  const sum = summarize(items)
  if (sum.scored === 0) return out
  const label = (i: AttemptItem) => `Q${items.indexOf(i) + 1}`

  // 1. Topics where the most marks were lost.
  const weak = sum.byTopic.filter((r) => r.possible >= 4 && ratio(r.earned, r.possible) < 0.6).slice(0, 3)
  weak.forEach((r, n) =>
    out.push({
      tone: ratio(r.earned, r.possible) < 0.4 ? "hard" : "medium",
      title: `${r.key}: ${r.earned} of ${r.possible} marks (${pct(r.earned, r.possible)})`,
      detail:
        n === 0
          ? `Your weakest topic. A focused set of ${r.key} questions is the fastest way to raise your score.`
          : `Also costing marks. Drill it after ${weak[0].key}.`,
      topic: r.key,
    }),
  )

  // 2. Time: individual sinks in one sitting, slow topics across history.
  if (opts.perQuestion) {
    const sinks = items.filter((i) => i.seconds > i.target * 1.5).sort((a, b) => b.seconds - b.target - (a.seconds - a.target))
    for (const i of sinks.slice(0, 3)) {
      const lowReturn = typeof i.score === "number" && i.score < i.marks / 2
      out.push({
        tone: lowReturn ? "hard" : "medium",
        title: `${label(i)} took ${formatClock(i.seconds)} against a ${formatClock(i.target)} budget`,
        detail: lowReturn
          ? `${i.marks}-mark ${i.topic} question: well over time and under half the marks. In the real exam, move on when the budget runs out and return at the end.`
          : `You earned the marks, but the extra ${formatClock(i.seconds - i.target)} came out of later questions. More ${i.topic} practice will make this faster.`,
        topic: i.topic,
      })
    }
    const rushed = items.filter((i) => i.seconds > 0 && i.seconds < i.target * 0.35 && typeof i.score === "number" && i.score < i.marks / 2)
    if (rushed.length)
      out.push({
        tone: "medium",
        title: `Rushed ${rushed.map(label).join(", ")}`,
        detail: "Under a third of the time budget and under half the marks. Slowing down on these is likely worth more than speed elsewhere.",
      })
    const unseen = items.filter((i) => i.seconds < 10)
    if (unseen.length && unseen.length < items.length)
      out.push({
        tone: "medium",
        title: `Barely reached ${unseen.map(label).join(", ")}`,
        detail: "Less than ten seconds on screen. Skim the whole paper in the first two minutes so no easy marks are left unread.",
      })
  } else {
    const slow = sum.byTopic.filter((r) => r.n >= 2 && r.seconds > r.target * 1.3).sort((a, b) => ratio(b.seconds, b.target) - ratio(a.seconds, a.target))
    for (const r of slow.slice(0, 2))
      out.push({
        tone: "medium",
        title: `${r.key} runs ${ratio(r.seconds, r.target).toFixed(1)}× over its time budget`,
        detail: `Across ${r.n} questions you spent ${formatClock(r.seconds)} where ${formatClock(r.target)} was budgeted. Timed practice on this topic builds speed.`,
        topic: r.key,
      })
  }

  // 3. Whole-paper pacing.
  if (opts.allowedSeconds && sum.used > opts.allowedSeconds)
    out.push({
      tone: "hard",
      title: `Over time by ${formatClock(sum.used - opts.allowedSeconds)}`,
      detail: "The real exam stops at the time limit. Watch the per-question budget shown beside each question.",
    })

  // 4. The most expensive kind of mistake.
  const worst = MISTAKES.map((m) => ({ ...m, marks: sum.mistakeMarks[m.value], n: sum.mistakeCount[m.value] }))
    .filter((m) => m.n > 0)
    .sort((a, b) => b.marks - a.marks)
  for (const m of worst.slice(0, 2))
    out.push({
      tone: m.marks >= 6 ? "hard" : "medium",
      title: `${m.label}: ${m.marks} marks lost on ${m.n} question${m.n === 1 ? "" : "s"}`,
      detail: m.advice,
    })

  // 5. Difficulty drop-off.
  const easy = sum.byDifficulty.filter((r) => Number(r.key) <= 2)
  const hard = sum.byDifficulty.filter((r) => Number(r.key) >= 4)
  const total = (rows: Row[]) => rows.reduce((a, r) => ({ e: a.e + r.earned, p: a.p + r.possible }), { e: 0, p: 0 })
  const te = total(easy)
  const th = total(hard)
  if (te.p >= 4 && th.p >= 4 && ratio(te.e, te.p) >= 0.7 && ratio(th.e, th.p) < 0.4)
    out.push({
      tone: "medium",
      title: `Hard questions: ${pct(th.e, th.p)}, routine questions: ${pct(te.e, te.p)}`,
      detail: "The basics are secure; the lost marks are in the final parts of long questions. Practice difficulty 4 and 5 questions untimed first.",
    })
  else if (te.p >= 4 && ratio(te.e, te.p) < 0.6)
    out.push({
      tone: "hard",
      title: `Routine questions only ${pct(te.e, te.p)}`,
      detail: "Marks are slipping on the easiest questions, which should be the safest. Check them for careless slips before anything else.",
    })

  // 6. What is going well, so it is kept.
  const strong = [...sum.byTopic].reverse().find((r) => r.possible >= 4 && ratio(r.earned, r.possible) >= 0.85)
  if (strong)
    out.push({
      tone: "easy",
      title: `Strong: ${strong.key} (${pct(strong.earned, strong.possible)})`,
      detail: "Keep this sharp with an occasional mixed paper rather than more drilling.",
    })

  return out
}
