import { describe, expect, it } from "vitest"
import {
  activeFilterCount,
  applyFilters,
  defaultFilters,
  describeFilters,
  difficultyBand,
  hasActiveFilters,
  samplePaper,
  sortQuestions,
  topicCounts,
} from "./filter"
import type { Question } from "./questions"

const TOPICS = ["Calculus", "Algebra", "Vectors"]

function makeQuestion(overrides: Partial<Question> = {}): Question {
  return {
    id: "q",
    course: "AA HL",
    year: 2024,
    session: "May",
    timezone: "TZ1",
    paper: "Paper 1",
    topic: "Calculus",
    subtopic: "Limits",
    difficulty: 3,
    marks: 5,
    latex: "x^2",
    statement: "Evaluate the limit.",
    imageUrl: null,
    markscheme: null,
    ...overrides,
  }
}

const bank: Question[] = [
  makeQuestion({ id: "calc-easy", topic: "Calculus", difficulty: 1, year: 2024, marks: 4, statement: "Find a derivative." }),
  makeQuestion({ id: "calc-hard", topic: "Calculus", difficulty: 5, year: 2022, marks: 12, statement: "Evaluate an integral." }),
  makeQuestion({ id: "algebra-mid", topic: "Algebra", difficulty: 3, year: 2023, marks: 6, statement: "Solve for x using logarithms." }),
  makeQuestion({ id: "vectors-easy", topic: "Vectors", difficulty: 2, year: 2020, marks: 6, session: "November", statement: "Find the scalar product." }),
]

const ids = (questions: Question[]) => questions.map((question) => question.id)

describe("difficultyBand", () => {
  it("maps scores to difficulty bands", () => {
    expect(difficultyBand(1)).toBe("Easy")
    expect(difficultyBand(2)).toBe("Easy")
    expect(difficultyBand(3)).toBe("Medium")
    expect(difficultyBand(4)).toBe("Hard")
    expect(difficultyBand(5)).toBe("Hard")
  })
})

describe("applyFilters", () => {
  it("returns every question when filters are at their defaults", () => {
    expect(applyFilters(bank, defaultFilters)).toEqual(bank)
  })

  it("matches search against the statement, case-insensitively", () => {
    expect(ids(applyFilters(bank, { ...defaultFilters, search: "INTEGRAL" }))).toEqual(["calc-hard"])
  })

  it("matches search against the topic", () => {
    expect(ids(applyFilters(bank, { ...defaultFilters, search: "vector" }))).toEqual(["vectors-easy"])
  })

  it("matches search against the year", () => {
    expect(ids(applyFilters(bank, { ...defaultFilters, search: "2023" }))).toEqual(["algebra-mid"])
  })

  it("ignores surrounding whitespace in search", () => {
    expect(ids(applyFilters(bank, { ...defaultFilters, search: "  integral  " }))).toEqual(["calc-hard"])
  })

  it("applies inclusive difficulty bounds", () => {
    expect(ids(applyFilters(bank, { ...defaultFilters, difficulty: [3, 5] }))).toEqual([
      "calc-hard",
      "algebra-mid",
    ])
  })

  it("treats selected topics as OR", () => {
    expect(ids(applyFilters(bank, { ...defaultFilters, topics: ["Calculus", "Vectors"] }))).toEqual([
      "calc-easy",
      "calc-hard",
      "vectors-easy",
    ])
  })

  it("filters by selected years", () => {
    expect(ids(applyFilters(bank, { ...defaultFilters, years: [2020, 2024] }))).toEqual([
      "calc-easy",
      "vectors-easy",
    ])
  })

  it("combines facets with AND", () => {
    expect(
      ids(applyFilters(bank, { ...defaultFilters, topics: ["Calculus"], difficulty: [4, 5] })),
    ).toEqual(["calc-hard"])
  })

  it("returns an empty list when nothing matches", () => {
    expect(applyFilters(bank, { ...defaultFilters, search: "nonexistent" })).toEqual([])
  })
})

describe("topicCounts", () => {
  it("ignores the topic selection when counting", () => {
    const counts = topicCounts(bank, { ...defaultFilters, topics: ["Algebra"] }, TOPICS)
    expect(counts).toEqual({ Calculus: 2, Algebra: 1, Vectors: 1 })
  })

  it("reflects the active search when counting", () => {
    const counts = topicCounts(bank, { ...defaultFilters, search: "integral" }, TOPICS)
    expect(counts).toEqual({ Calculus: 1, Algebra: 0, Vectors: 0 })
  })
})

describe("samplePaper", () => {
  it("returns the requested count without duplicates", () => {
    const paper = samplePaper(bank, 3, () => 0.42)
    expect(paper).toHaveLength(3)
    expect(new Set(ids(paper)).size).toBe(3)
  })

  it("caps the result at the size of the pool", () => {
    expect(samplePaper(bank, 10)).toHaveLength(4)
  })

  it("returns an empty list for a non-positive count", () => {
    expect(samplePaper(bank, 0)).toEqual([])
  })

  it("does not mutate the input array", () => {
    const before = ids(bank)
    samplePaper(bank, 3, () => 0.1)
    expect(ids(bank)).toEqual(before)
  })
})

describe("activeFilterCount and hasActiveFilters", () => {
  it("reports zero for the default filters", () => {
    expect(activeFilterCount(defaultFilters)).toBe(0)
    expect(hasActiveFilters(defaultFilters)).toBe(false)
  })

  it("counts a changed difficulty range as one filter", () => {
    expect(activeFilterCount({ ...defaultFilters, difficulty: [2, 5] })).toBe(1)
  })

  it("counts each selected topic and year", () => {
    expect(
      activeFilterCount({ ...defaultFilters, topics: ["Calculus"], years: [2024, 2023] }),
    ).toBe(3)
  })

  it("does not count search as an active filter", () => {
    expect(activeFilterCount({ ...defaultFilters, search: "integral" })).toBe(0)
    expect(hasActiveFilters({ ...defaultFilters, search: "integral" })).toBe(false)
  })
})

describe("describeFilters", () => {
  it("returns an empty string for the defaults", () => {
    expect(describeFilters(defaultFilters)).toBe("")
  })

  it("summarizes the active constraints", () => {
    expect(
      describeFilters({
        search: "  integrals  ",
        difficulty: [2, 4],
        topics: ["Calculus"],
        years: [2024, 2020],
      }),
    ).toBe('"integrals" · difficulty 2–4 · Calculus · 2020, 2024')
  })
})

describe("sortQuestions", () => {
  const may2024 = makeQuestion({ id: "may-2024", year: 2024, session: "May" })
  const nov2024 = makeQuestion({ id: "nov-2024", year: 2024, session: "November" })
  const may2023 = makeQuestion({ id: "may-2023", year: 2023, session: "May" })

  it("sorts newest first, with November after May in the same year", () => {
    expect(ids(sortQuestions([may2024, may2023, nov2024], "newest"))).toEqual([
      "nov-2024",
      "may-2024",
      "may-2023",
    ])
  })

  it("sorts oldest first as the reverse of newest", () => {
    expect(ids(sortQuestions([may2024, may2023, nov2024], "oldest"))).toEqual([
      "may-2023",
      "may-2024",
      "nov-2024",
    ])
  })

  it("sorts by marks descending", () => {
    const sorted = sortQuestions(bank, "marks")
    expect(sorted[0].id).toBe("calc-hard")
    expect(sorted[sorted.length - 1].id).toBe("calc-easy")
  })

  it("sorts by difficulty descending", () => {
    const sorted = sortQuestions(bank, "difficulty")
    expect(sorted[0].id).toBe("calc-hard")
    expect(sorted[sorted.length - 1].id).toBe("calc-easy")
  })

  it("does not mutate the input array", () => {
    const input = [may2024, may2023, nov2024]
    const before = ids(input)
    sortQuestions(input, "newest")
    expect(ids(input)).toEqual(before)
  })
})

describe("null exam metadata", () => {
  const undated = makeQuestion({ id: "undated", year: null, session: null, timezone: null })
  const dated = makeQuestion({ id: "dated", year: 2024, session: "May", timezone: "TZ1" })

  it("keeps null-year questions when no year filter is active", () => {
    expect(ids(applyFilters([undated, dated], defaultFilters))).toEqual(["undated", "dated"])
  })

  it("excludes null-year questions when a year filter is active", () => {
    expect(ids(applyFilters([undated, dated], { ...defaultFilters, years: [2024] }))).toEqual([
      "dated",
    ])
  })

  it("does not match the literal text 'null' in search", () => {
    expect(applyFilters([undated], { ...defaultFilters, search: "null" })).toEqual([])
  })

  it("sorts null-year questions after dated ones for newest", () => {
    expect(ids(sortQuestions([undated, dated], "newest"))).toEqual(["dated", "undated"])
  })

  it("counts topics dynamically from the provided list", () => {
    const counts = topicCounts([undated, dated], defaultFilters, ["Calculus", "Algebra"])
    expect(counts).toEqual({ Calculus: 2, Algebra: 0 })
  })
})