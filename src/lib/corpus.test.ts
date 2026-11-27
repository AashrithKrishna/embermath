import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { parseMathSegments } from "./math"
import { normalizeDelimiters, renderLatexSafe, rescueBareLatex } from "./latex"

interface Row { id: string; statement: string; markscheme: string | null }

/** Returns human-readable problems the renderer would show on screen. */
export function renderProblems(text: string): string[] {
  const problems: string[] = []
  for (const seg of parseMathSegments(normalizeDelimiters(text))) {
    if (seg.kind !== "text") {
      if (renderLatexSafe(seg.value, seg.kind === "display") === null) problems.push(`unrenderable: ${seg.value.slice(0, 80)}`)
      continue
    }
    for (const t of rescueBareLatex(seg.value)) {
      if (t.kind === "math") continue
      // A lone "$" next to an amount ("$200", "25$", "($)") is currency and
      // correct prose; a "$" touching LaTeX syntax is an unparsed delimiter.
      const leak = /\\[a-zA-Z]{2,}|\$\s*[\\^_{]|[\\^_}]\s*\$/.exec(t.value)
      if (leak) problems.push(`raw latex in prose: …${t.value.slice(Math.max(0, leak.index - 30), leak.index + 50)}…`)
    }
  }
  return problems
}

describe("question corpus renders without visible LaTeX errors", () => {
  const rows = JSON.parse(readFileSync("public/questions.json", "utf8")) as Row[]
  it("has no raw LaTeX or unrenderable math", () => {
    const failures: string[] = []
    for (const r of rows) {
      for (const field of ["statement", "markscheme"] as const) {
        const text = r[field]
        if (!text) continue
        for (const p of renderProblems(text)) failures.push(`${r.id.slice(0, 6)} ${field}: ${p}`)
      }
    }
    if (failures.length) console.log(`${failures.length} problems\n` + failures.slice(0, 25).join("\n"))
    expect(failures.length).toBe(0)
  })
})
