import { describe, expect, it } from "vitest"
import {
  deriveCourses,
  deriveTopics,
  deriveYears,
  examLabel,
  questionsForCourse,
  type Question,
} from "./questions"

function makeQuestion(overrides: Partial<Question> = {}): Question {
  return {
    id: "q",
    course: "AA HL",
    year: null,
    session: null,
    timezone: null,
    paper: "Paper 1",
    topic: "Calculus",
    subtopic: "Limits",
    difficulty: 3,
    marks: 5,
    statement: "Evaluate the limit.",
    latex: null,
    imageUrl: null,
    markscheme: null,
    ...overrides,
  }
}

describe("deriveCourses", () => {
  it("returns unique courses sorted alphabetically", () => {
    const bank = [
      makeQuestion({ course: "AI HL" }),
      makeQuestion({ course: "AA HL" }),
      makeQuestion({ course: "AI HL" }),
    ]
    expect(deriveCourses(bank)).toEqual(["AA HL", "AI HL"])
  })

  it("returns an empty list for an empty bank", () => {
    expect(deriveCourses([])).toEqual([])
  })
})

describe("questionsForCourse", () => {
  const bank = [
    makeQuestion({ id: "aa-1", course: "AA HL" }),
    makeQuestion({ id: "ai-1", course: "AI HL" }),
    makeQuestion({ id: "aa-2", course: "AA HL" }),
  ]

  it("keeps only questions belonging to the course", () => {
    expect(questionsForCourse(bank, "AA HL").map((q) => q.id)).toEqual(["aa-1", "aa-2"])
    expect(questionsForCourse(bank, "AI HL").map((q) => q.id)).toEqual(["ai-1"])
  })

  it("returns an empty list when no question matches the course", () => {
    expect(questionsForCourse(bank, "SL")).toEqual([])
  })

  it("does not mutate the input array", () => {
    const before = bank.map((q) => q.id)
    questionsForCourse(bank, "AA HL")
    expect(bank.map((q) => q.id)).toEqual(before)
  })
})

describe("deriveTopics", () => {
  it("returns unique topics sorted alphabetically", () => {
    const bank = [
      makeQuestion({ topic: "Vectors" }),
      makeQuestion({ topic: "Algebra" }),
      makeQuestion({ topic: "Calculus" }),
      makeQuestion({ topic: "Algebra" }),
    ]
    expect(deriveTopics(bank)).toEqual(["Algebra", "Calculus", "Vectors"])
  })

  it("returns an empty list for an empty bank", () => {
    expect(deriveTopics([])).toEqual([])
  })
})

describe("deriveYears", () => {
  it("returns unique non-null years newest first", () => {
    const bank = [
      makeQuestion({ year: 2021 }),
      makeQuestion({ year: 2024 }),
      makeQuestion({ year: null }),
      makeQuestion({ year: 2021 }),
    ]
    expect(deriveYears(bank)).toEqual([2024, 2021])
  })

  it("returns an empty list when every year is null", () => {
    expect(deriveYears([makeQuestion(), makeQuestion()])).toEqual([])
  })
})

describe("examLabel", () => {
  it("joins session, year, and timezone when present", () => {
    expect(examLabel(makeQuestion({ session: "May", year: 2024, timezone: "TZ1" }))).toBe(
      "May 2024 · TZ1",
    )
  })

  it("omits missing parts", () => {
    expect(examLabel(makeQuestion({ session: "November", year: 2023, timezone: null }))).toBe(
      "November 2023",
    )
    expect(examLabel(makeQuestion({ session: null, year: null, timezone: "TZ2" }))).toBe("TZ2")
  })

  it("returns an empty string when no exam metadata exists", () => {
    expect(examLabel(makeQuestion())).toBe("")
  })
})