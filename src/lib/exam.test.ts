import { describe, expect, it } from "vitest"
import { buildExam, curveDifficulty, examMinutes, formatClock } from "./exam"
import type { Question } from "./questions"

function q(id: number, over: Partial<Question> = {}): Question {
  return {
    id: `q${id}`,
    course: "AA HL",
    year: null,
    session: null,
    timezone: null,
    paper: "Paper 1",
    topic: ["Algebra", "Calculus", "Vectors"][id % 3],
    subtopic: null,
    difficulty: (id % 5) + 1,
    marks: [4, 6, 7, 12, 15][id % 5],
    statement: `Question ${id}`,
    latex: null,
    markscheme: null,
    imageUrl: null,
    ...over,
  }
}

const pool = Array.from({ length: 120 }, (_, i) => q(i))

describe("buildExam", () => {
  const base = { paper: "Paper 1" as const, targetMarks: 110, weights: {}, curve: "ramp" as const, seed: 7 }

  it("lands close to the target marks", () => {
    const exam = buildExam(pool, base)
    expect(exam.totalMarks).toBeGreaterThanOrEqual(104)
    expect(exam.totalMarks).toBeLessThanOrEqual(124)
  })

  it("is deterministic for a seed", () => {
    expect(buildExam(pool, base).questions.map((x) => x.id)).toEqual(
      buildExam(pool, base).questions.map((x) => x.id),
    )
  })

  it("only uses the requested paper and excludes zero-weight topics", () => {
    const mixed = [...pool, ...pool.map((x) => ({ ...x, id: `${x.id}b`, paper: "Paper 2" as const }))]
    const exam = buildExam(mixed, { ...base, weights: { Vectors: 0 } })
    expect(exam.questions.every((x) => x.paper === "Paper 1")).toBe(true)
    expect(exam.questions.some((x) => x.topic === "Vectors")).toBe(false)
  })

  it("puts short questions in section A before long ones", () => {
    const exam = buildExam(pool, base)
    const a = exam.questions.slice(0, exam.sectionBreak)
    const b = exam.questions.slice(exam.sectionBreak)
    expect(a.every((x) => x.marks <= 8)).toBe(true)
    expect(b.every((x) => x.marks > 8)).toBe(true)
  })

  it("never repeats a question", () => {
    const ids = buildExam(pool, { ...base, targetMarks: 400 }).questions.map((x) => x.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it("returns an empty paper when nothing matches", () => {
    expect(buildExam(pool, { ...base, paper: "Paper 3" }).questions).toEqual([])
  })
})

describe("helpers", () => {
  it("scales minutes with marks", () => {
    expect(examMinutes("Paper 1", 110)).toBe(120)
    expect(examMinutes("Paper 1", 55)).toBe(60)
    expect(examMinutes("Paper 3", 55)).toBe(75)
  })
  it("ramps difficulty", () => {
    expect(curveDifficulty("ramp", 0)).toBeLessThan(curveDifficulty("ramp", 1))
  })
  it("formats clock", () => {
    expect(formatClock(3725)).toBe("1:02:05")
    expect(formatClock(65)).toBe("01:05")
  })
})
