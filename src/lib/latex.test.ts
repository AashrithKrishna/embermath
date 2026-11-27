import { describe, expect, it } from "vitest"
import { normalizeDelimiters, renderLatexSafe, repairLatex, tokenizeProse } from "./latex"

describe("normalizeDelimiters", () => {
  it("converts \\( \\) and \\[ \\] to dollar delimiters", () => {
    expect(normalizeDelimiters("Let \\(x^2\\) and \\[y=1\\]")).toBe("Let $x^2$ and $$y=1$$")
  })
  it("leaves plain text alone", () => {
    expect(normalizeDelimiters("cost is 5 dollars")).toBe("cost is 5 dollars")
  })
})

describe("repairLatex", () => {
  it("adds missing closing braces", () => {
    expect(repairLatex("\\frac{1}{2")).toBe("\\frac{1}{2}")
  })
  it("drops surplus closing braces", () => {
    expect(repairLatex("x^{2}}")).toBe("x^{2}")
  })
  it("closes open environments", () => {
    expect(repairLatex("\\begin{pmatrix}1&2")).toBe("\\begin{pmatrix}1&2\\end{pmatrix}")
  })
  it("removes unpaired \\left", () => {
    expect(repairLatex("\\left( x+1 )")).toBe("( x+1 )")
  })
})

describe("renderLatexSafe", () => {
  it("renders valid latex", () => {
    expect(renderLatexSafe("\\int_0^1 x\\,dx", false)).toContain("katex")
  })
  it("repairs broken latex instead of erroring", () => {
    const html = renderLatexSafe("\\frac{1}{2", false)
    expect(html).not.toBeNull()
    expect(html).not.toContain("katex-error")
  })
  it("returns null for unrepairable input", () => {
    expect(renderLatexSafe("\\notacommand{", false)).toBeNull()
  })
})

describe("tokenizeProse", () => {
  it("splits part labels", () => {
    const t = tokenizeProse("Consider f. a) Find x. b) Hence find y.", false)
    expect(t.filter((x) => x.kind === "part").map((x) => (x as { label: string }).label)).toEqual([
      "a",
      "b",
    ])
  })
  it("does not split mid-sentence letters", () => {
    const t = tokenizeProse("the value of a) is not a label", false)
    expect(t.some((x) => x.kind === "part")).toBe(false)
  })
  it("extracts mark annotations", () => {
    const t = tokenizeProse("so x = 2 [A1] using rule (M1) [AG]", true)
    expect(t.filter((x) => x.kind === "mark").map((x) => (x as { label: string }).label)).toEqual([
      "A1",
      "M1",
      "AG",
    ])
  })
})

import { rescueBareLatex } from "./latex"
describe("rescueBareLatex", () => {
  it("lifts a bare LaTeX run into math", () => {
    const t = rescueBareLatex("Now, calculate the coefficient: \\text{Coefficient of } x^{16} = \\binom{9}{4} * 4^4")
    expect(t[0]).toEqual({ kind: "text", value: "Now, calculate the coefficient: " })
    expect(t[1].kind).toBe("math")
    expect(t[1].value).toContain("\\binom{9}{4}")
  })
  it("leaves plain prose untouched", () => {
    expect(rescueBareLatex("Find the area of the triangle.")).toEqual([
      { kind: "text", value: "Find the area of the triangle." },
    ])
  })
  it("keeps the following sentence as prose", () => {
    const t = rescueBareLatex("so \\frac{1}{2} x. Then find y.")
    expect(t.map((x) => x.kind)).toEqual(["text", "math", "text"])
    expect(t[2].value).toContain("Then find y")
  })
})

import { wrapBareEnvironments } from "./latex"
describe("wrapBareEnvironments", () => {
  it("wraps bare environments in display math", () => {
    expect(wrapBareEnvironments("so \\begin{aligned} a &= b \\end{aligned} done")).toBe(
      "so $$\\begin{aligned} a &= b \\end{aligned}$$ done",
    )
  })
  it("leaves environments already inside math alone", () => {
    const s = "$$\\begin{pmatrix}1\\\\2\\end{pmatrix}$$"
    expect(wrapBareEnvironments(s)).toBe(s)
  })
})
