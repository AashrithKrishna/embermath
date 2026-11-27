import { describe, expect, it } from "vitest"
import type { BookletSection } from "../data/booklet"
import { countBookletEntries, searchBooklet } from "./bookletSearch"

const sections: BookletSection[] = [
  {
    id: "algebra",
    title: "Numbers & Algebra",
    entries: [
      {
        name: "Binomial theorem",
        latex: "(a+b)^n=\\sum_{r=0}^{n}\\binom{n}{r}a^{n-r}b^{r}",
        note: "Expansion in descending powers of a.",
      },
      { name: "Logarithm laws", latex: "\\log_a(xy)=\\log_a x+\\log_a y" },
    ],
  },
  {
    id: "calculus",
    title: "Calculus",
    entries: [{ name: "Power rule", latex: "\\frac{d}{dx}x^n=nx^{n-1}" }],
  },
]

describe("searchBooklet", () => {
  it("returns every section untouched when the query is empty", () => {
    expect(searchBooklet(sections, "")).toEqual(sections)
    expect(searchBooklet(sections, "   ")).toEqual(sections)
  })

  it("matches entry names case-insensitively", () => {
    const result = searchBooklet(sections, "BINOMIAL")
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe("algebra")
    expect(result[0].entries.map((entry) => entry.name)).toEqual(["Binomial theorem"])
  })

  it("matches against the latex source text", () => {
    const result = searchBooklet(sections, "log_a")
    expect(result).toHaveLength(1)
    expect(result[0].entries.map((entry) => entry.name)).toEqual(["Logarithm laws"])
  })

  it("matches against entry notes", () => {
    const result = searchBooklet(sections, "descending")
    expect(result[0].entries.map((entry) => entry.name)).toEqual(["Binomial theorem"])
  })

  it("drops sections with no matching entries", () => {
    const result = searchBooklet(sections, "nx")
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe("calculus")
  })

  it("returns an empty list when nothing matches", () => {
    expect(searchBooklet(sections, "quantum chromodynamics")).toEqual([])
  })
})

describe("countBookletEntries", () => {
  it("sums entries across sections", () => {
    expect(countBookletEntries(sections)).toBe(3)
    expect(countBookletEntries([])).toBe(0)
  })
})
