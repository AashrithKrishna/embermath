import { describe, expect, it } from "vitest"
import { isDiagramMissing, questionImage, questionTips, type Question } from "./questions"

const base: Question = {
  id: "q",
  course: "AA HL",
  year: null,
  session: null,
  timezone: null,
  paper: "Paper 1",
  topic: "Calculus",
  subtopic: null,
  difficulty: 3,
  marks: 5,
  statement: "x",
  latex: null,
  imageUrl: null,
  markscheme: null,
}

describe("questionImage", () => {
  it("prefers imageUrl and falls back to image_url", () => {
    expect(questionImage(base)).toBeNull()
    expect(questionImage({ ...base, imageUrl: "/a.png" })).toBe("/a.png")
    expect(questionImage({ ...base, image_url: "/b.png" })).toBe("/b.png")
    expect(questionImage({ ...base, imageUrl: "/a.png", image_url: "/b.png" })).toBe("/a.png")
  })
})

describe("questionTips", () => {
  it("returns trimmed tips only when non-empty", () => {
    expect(questionTips(base)).toBeNull()
    expect(questionTips({ ...base, tips: "   " })).toBeNull()
    expect(questionTips({ ...base, tips: " try $x=1$ " })).toBe("try $x=1$")
  })
})

describe("isDiagramMissing", () => {
  it("flags questions whose diagram is unavailable", () => {
    expect(isDiagramMissing(base)).toBe(false)
    expect(isDiagramMissing({ ...base, diagram_missing: 0 })).toBe(false)
    expect(isDiagramMissing({ ...base, diagram_missing: 1 })).toBe(true)
  })
})
