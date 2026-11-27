import type { Question } from "./questions"

export type PaperCode = "Paper 1" | "Paper 2" | "Paper 3"
export type Curve = "ramp" | "flat" | "hard-finish"

export interface PaperSpec {
  code: PaperCode
  label: string
  calculator: boolean
  defaultMarks: number
  minutes: number
}

/** HL paper conventions (both AA and AI). */
export const PAPER_SPECS: Record<PaperCode, PaperSpec> = {
  "Paper 1": { code: "Paper 1", label: "No calculator", calculator: false, defaultMarks: 110, minutes: 120 },
  "Paper 2": { code: "Paper 2", label: "Calculator", calculator: true, defaultMarks: 110, minutes: 120 },
  "Paper 3": { code: "Paper 3", label: "HL investigation", calculator: true, defaultMarks: 55, minutes: 75 },
}

/** Minutes for a given mark target, scaled from the paper's official ratio. */
export function examMinutes(paper: PaperCode, marks: number): number {
  const spec = PAPER_SPECS[paper]
  return Math.max(10, Math.round((spec.minutes * marks) / spec.defaultMarks / 5) * 5)
}

export interface ExamConfig {
  paper: PaperCode
  targetMarks: number
  /** Relative topic weight, 0 excludes a topic. Missing topics default to 1. */
  weights: Record<string, number>
  curve: Curve
  seed: number
}

export interface ExamPaper {
  config: ExamConfig
  questions: Question[]
  totalMarks: number
  minutes: number
  sectionBreak: number
}

/** Mulberry32 — small deterministic PRNG so a seed reproduces a paper. */
export function rng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Target difficulty (1–5) at fractional position p∈[0,1] of the paper. */
export function curveDifficulty(curve: Curve, p: number): number {
  if (curve === "flat") return 3
  if (curve === "hard-finish") return p < 0.6 ? 2.5 : 4.5
  return 1.5 + 3 * p
}

export function buildExam(pool: Question[], config: ExamConfig): ExamPaper {
  const random = rng(config.seed)
  const weightOf = (q: Question) => config.weights[q.topic] ?? 1
  const candidates = pool.filter(
    (q) => q.paper === config.paper && q.marks > 0 && weightOf(q) > 0 && q.diagram_missing !== 1 && q.diagramMissing !== 1,
  )

  const chosen: Question[] = []
  const used = new Set<string>()
  const topicUse: Record<string, number> = {}
  let total = 0
  const target = Math.max(1, config.targetMarks)

  while (total < target) {
    const remaining = target - total
    const p = total / target
    const want = curveDifficulty(config.curve, p)
    let best: Question | null = null
    let bestScore = -Infinity
    for (const q of candidates) {
      if (used.has(q.id)) continue
      // Allow a small overshoot only when nothing fits.
      const overshoot = Math.max(0, q.marks - remaining)
      const score =
        Math.log(weightOf(q) + 0.01) * 1.5 -
        Math.abs(q.difficulty - want) * 0.9 -
        overshoot * 0.6 -
        (topicUse[q.topic] ?? 0) * 0.7 +
        random() * 1.2
      if (score > bestScore) {
        bestScore = score
        best = q
      }
    }
    if (!best) break
    if (best.marks - remaining > Math.max(4, remaining)) break
    chosen.push(best)
    used.add(best.id)
    topicUse[best.topic] = (topicUse[best.topic] ?? 0) + 1
    total += best.marks
  }

  // IB layout: short-response section A first, extended section B after,
  // each ordered by the requested difficulty curve.
  const byCurve = (a: Question, b: Question) =>
    config.curve === "flat" ? a.marks - b.marks : a.difficulty - b.difficulty || a.marks - b.marks
  const sectionA = chosen.filter((q) => q.marks <= 8).sort(byCurve)
  const sectionB = chosen.filter((q) => q.marks > 8).sort(byCurve)
  const questions = config.paper === "Paper 3" ? [...chosen].sort(byCurve) : [...sectionA, ...sectionB]

  return {
    config,
    questions,
    totalMarks: total,
    minutes: examMinutes(config.paper, total),
    sectionBreak: config.paper === "Paper 3" ? -1 : sectionA.length,
  }
}

export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const pad = (n: number) => String(n).padStart(2, "0")
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`
}
