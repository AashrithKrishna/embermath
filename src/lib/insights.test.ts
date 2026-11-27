import { describe, expect, it } from "vitest"
import { feedback, summarize, type AttemptItem } from "./insights"
import { pace, targetSeconds } from "./timing"

const item = (over: Partial<AttemptItem>): AttemptItem => ({
  id: Math.random().toString(36),
  topic: "Calculus",
  difficulty: 3,
  marks: 6,
  seconds: 390,
  target: 390,
  flagged: false,
  mistakes: [],
  ...over,
})

describe("timing", () => {
  it("budgets from the paper's minutes-per-mark ratio", () => {
    expect(targetSeconds(110, "Paper 1")).toBe(7200)
    expect(targetSeconds(55, "Paper 3")).toBe(4500)
    expect(targetSeconds(5, null)).toBe(targetSeconds(5, "Paper 1"))
  })
  it("classifies pace", () => {
    expect(pace(0, 100)).toBe("idle")
    expect(pace(100, 100)).toBe("on")
    expect(pace(140, 100)).toBe("over")
    expect(pace(200, 100)).toBe("way-over")
  })
})

describe("insights", () => {
  it("returns nothing until something is self-marked", () => {
    expect(feedback([item({})], { perQuestion: true })).toEqual([])
  })

  it("summarizes marks, time and mistake cost", () => {
    const s = summarize([
      item({ score: 2, mistakes: ["careless"] }),
      item({ topic: "Vectors", score: 6 }),
      item({ topic: "Vectors", seconds: 50 }),
    ])
    expect(s).toMatchObject({ scored: 2, earned: 8, possible: 12, used: 830 })
    expect(s.mistakeMarks.careless).toBe(4)
    expect(s.byTopic[0].key).toBe("Calculus")
  })

  it("points out weak topics, time sinks and the costliest mistake", () => {
    const items = [
      item({ score: 1, seconds: 900, mistakes: ["concept"] }),
      item({ score: 2, mistakes: ["concept"] }),
      item({ topic: "Vectors", score: 6, seconds: 200 }),
      item({ topic: "Vectors", score: 6, seconds: 5 }),
    ]
    const titles = feedback(items, { perQuestion: true, allowedSeconds: 1000 }).map((f) => f.title)
    expect(titles.some((t) => t.startsWith("Calculus: 3 of 12"))).toBe(true)
    expect(titles.some((t) => t.startsWith("Q1 took 15:00"))).toBe(true)
    expect(titles.some((t) => t.startsWith("Barely reached Q4"))).toBe(true)
    expect(titles.some((t) => t.startsWith("Over time by"))).toBe(true)
    expect(titles.some((t) => t.startsWith("Didn't know how: 9 marks"))).toBe(true)
    expect(titles.some((t) => t.startsWith("Strong: Vectors"))).toBe(true)
  })

  it("reasons by topic across history", () => {
    const items = [item({ score: 6, seconds: 900 }), item({ score: 6, seconds: 900 })]
    const f = feedback(items)
    expect(f[0].title).toMatch(/Calculus runs 2\.3× over/)
    expect(f.every((x) => !x.title.startsWith("Q"))).toBe(true)
  })
})
