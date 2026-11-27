import { describe, expect, it } from "vitest"
import { applyBankFilter, emptyBankFilter, shortId, topicTree } from "./bank"
import type { Question } from "./questions"

const make = (id: string, o: Partial<Question>): Question => ({
  id, course: "AA HL", year: null, session: null, timezone: null, paper: "Paper 1", topic: "Vectors",
  subtopic: "Lines", difficulty: 3, marks: 6, statement: "Find the angle", latex: null, markscheme: null, imageUrl: null, ...o,
})
const pool = [
  make("a1", {}),
  make("b2", { paper: "Paper 2", difficulty: 5, marks: 14, topic: "Calculus", subtopic: "Integration", statement: "Integrate x" }),
  make("c3", { images: ["x.png"] }),
]

describe("applyBankFilter", () => {
  it("passes everything with the empty filter", () => {
    expect(applyBankFilter(pool, emptyBankFilter)).toHaveLength(3)
  })
  it("filters by paper, difficulty, marks, figures and search", () => {
    expect(applyBankFilter(pool, { ...emptyBankFilter, papers: ["Paper 2"] }).map((q) => q.id)).toEqual(["b2"])
    expect(applyBankFilter(pool, { ...emptyBankFilter, difficulties: [5] }).map((q) => q.id)).toEqual(["b2"])
    expect(applyBankFilter(pool, { ...emptyBankFilter, marksMin: 10 }).map((q) => q.id)).toEqual(["b2"])
    expect(applyBankFilter(pool, { ...emptyBankFilter, figures: "with" }).map((q) => q.id)).toEqual(["c3"])
    expect(applyBankFilter(pool, { ...emptyBankFilter, search: "integrate calculus" }).map((q) => q.id)).toEqual(["b2"])
  })
})

describe("helpers", () => {
  it("builds short ids", () => {
    expect(shortId(pool[1])).toBe("AA-P2-B2")
  })
  it("groups topics", () => {
    const tree = topicTree(pool)
    expect(tree.map((t) => t.topic)).toEqual(["Calculus", "Vectors"])
    expect(tree[1].count).toBe(2)
  })
})
