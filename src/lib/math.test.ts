import { describe, expect, it } from "vitest"
import {
  decodeMathEntities,
  normalizeLatex,
  parseMathSegments,
  renderMathToHtml,
} from "./math"

describe("parseMathSegments", () => {
  it("returns [] for empty or whitespace input", () => {
    expect(parseMathSegments("")).toEqual([])
    expect(parseMathSegments("   ")).toEqual([])
  })

  it("parses balanced inline math", () => {
    expect(parseMathSegments("solve $x^2$ now")).toEqual([
      { kind: "text", value: "solve " },
      { kind: "inline", value: "x^2" },
      { kind: "text", value: " now" },
    ])
  })

  it("parses balanced display math", () => {
    expect(parseMathSegments("$$\\frac{a}{b}$$")).toEqual([
      { kind: "display", value: "\\frac{a}{b}" },
    ])
  })

  it("treats currency dollars as text", () => {
    expect(parseMathSegments("costs $30,000 and $20,000")).toEqual([
      { kind: "text", value: "costs $30,000 and $20,000" },
    ])
  })

  it("separates currency from real math", () => {
    expect(parseMathSegments("for $5, solve $x=2$")).toEqual([
      { kind: "text", value: "for $5, solve " },
      { kind: "inline", value: "x=2" },
    ])
  })

  it("recovers an unbalanced opener (user example)", () => {
    expect(parseMathSegments("Solve the inequality $x^2 - 9 + \\frac{5}{x} .")).toEqual([
      { kind: "text", value: "Solve the inequality " },
      { kind: "inline", value: "x^2 - 9 + \\frac{5}{x}" },
    ])
  })

  it("does not close math on a currency dollar", () => {
    expect(parseMathSegments("$x=2$ then $30")).toEqual([
      { kind: "inline", value: "x=2" },
      { kind: "text", value: " then $30" },
    ])
  })

  it("treats dollar-decimal math as math", () => {
    expect(parseMathSegments("Express $5.7777 \\ldots$ as a fraction.")).toEqual([
      { kind: "text", value: "Express " },
      { kind: "inline", value: "5.7777 \\ldots" },
      { kind: "text", value: " as a fraction." },
    ])
  })

  it("treats dollar-integer math followed by a command as math", () => {
    expect(parseMathSegments("where $100 \\leq a")).toEqual([
      { kind: "text", value: "where " },
      { kind: "inline", value: "100 \\leq a" },
    ])
  })

  it("parses adjacent dollar math like $42$", () => {
    expect(parseMathSegments("mean $42$ hours")).toEqual([
      { kind: "text", value: "mean " },
      { kind: "inline", value: "42" },
      { kind: "text", value: " hours" },
    ])
  })

  it("treats scientific notation dollars as math", () => {
    expect(parseMathSegments("value $2.5 \\times 10^{-3}$ m")).toEqual([
      { kind: "text", value: "value " },
      { kind: "inline", value: "2.5 \\times 10^{-3}" },
      { kind: "text", value: " m" },
    ])
  })

  it("keeps money-style decimals as text", () => {
    expect(parseMathSegments("costs $5.50 now")).toEqual([
      { kind: "text", value: "costs $5.50 now" },
    ])
  })

  it("decodes entities in text segments", () => {
    expect(parseMathSegments("Angle 45&deg; and 3&times;4")).toEqual([
      { kind: "text", value: "Angle 45° and 3×4" },
    ])
  })

  it("maps the less-equal entity to latex inside math", () => {
    expect(parseMathSegments("$x &le; 5$")).toEqual([
      { kind: "inline", value: "x \\leq 5" },
    ])
  })

  it("treats a dollar-digit followed by latex as math", () => {
    expect(parseMathSegments("a) $3 + \\sqrt{3}i")).toEqual([
      { kind: "text", value: "a) " },
      { kind: "inline", value: "3 + \\sqrt{3}i" },
    ])
  })

  it("treats dollar-comma sequences containing latex as math", () => {
    expect(parseMathSegments("Consider a sequence: $80, 20, 5, \\frac{5}{4}...$")).toEqual([
      { kind: "text", value: "Consider a sequence: " },
      { kind: "inline", value: "80, 20, 5, \\frac{5}{4}..." },
    ])
  })

  it("drops a non-mathy unbalanced dollar", () => {
    expect(parseMathSegments("$ Round your answer to two decimal points")).toEqual([
      { kind: "text", value: " Round your answer to two decimal points" },
    ])
  })

  it("drops a non-mathy unbalanced display", () => {
    expect(parseMathSegments("$$Sam must be after Taylor, so no multiply")).toEqual([
      { kind: "text", value: "Sam must be after Taylor, so no multiply" },
    ])
  })

  it("treats dollar-numbers followed by comparisons as math", () => {
    expect(parseMathSegments("in the interval $0<t<1$ seconds")).toEqual([
      { kind: "text", value: "in the interval " },
      { kind: "inline", value: "0<t<1" },
      { kind: "text", value: " seconds" },
    ])
  })

  it("treats dollar-numbers followed by equals as math", () => {
    expect(parseMathSegments("Recall that $25 = 5^2")).toEqual([
      { kind: "text", value: "Recall that " },
      { kind: "inline", value: "25 = 5^2" },
    ])
  })

  it("treats dollar-integers with mathy windows as math", () => {
    expect(parseMathSegments("the number is $2 + 3i")).toEqual([
      { kind: "text", value: "the number is " },
      { kind: "inline", value: "2 + 3i" },
    ])
    expect(parseMathSegments("so $15 p^2 q^4 = 30$ gives")).toEqual([
      { kind: "text", value: "so " },
      { kind: "inline", value: "15 p^2 q^4 = 30" },
      { kind: "text", value: " gives" },
    ])
    expect(parseMathSegments("Setting $14-3r = 5$, we get")).toEqual([
      { kind: "text", value: "Setting " },
      { kind: "inline", value: "14-3r = 5" },
      { kind: "text", value: ", we get" },
    ])
  })

  it("keeps plain currency in prose", () => {
    expect(parseMathSegments("costs $30,000 and $20,000 today")).toEqual([
      { kind: "text", value: "costs $30,000 and $20,000 today" },
    ])
    expect(parseMathSegments("Sam invests $40,000 into a fund which pays 5.5% monthly")).toEqual([
      { kind: "text", value: "Sam invests $40,000 into a fund which pays 5.5% monthly" },
    ])
  })

  it("drops stray dollars mid-word before digits", () => {
    expect(parseMathSegments("b$ 8 b) Use the graph above")).toEqual([
      { kind: "text", value: "b 8 b) Use the graph above" },
    ])
    expect(parseMathSegments("x$ 0 1 2 3 4 5")).toEqual([
      { kind: "text", value: "x 0 1 2 3 4 5" },
    ])
  })

  it("wraps bare latex runs in prose as inline math", () => {
    expect(parseMathSegments("the sum is 6 + \\log_7 2")).toEqual([
      { kind: "text", value: "the sum is " },
      { kind: "inline", value: "6 + \\log_7 2" },
    ])
    expect(parseMathSegments("terms u_1,u_2,u_3,\\ldots")).toEqual([
      { kind: "text", value: "terms " },
      { kind: "inline", value: "u_1,u_2,u_3,\\ldots" },
    ])
    expect(parseMathSegments("\\sqrt{3} + i")).toEqual([
      { kind: "inline", value: "\\sqrt{3} + i" },
    ])
  })

  it("stops bare latex runs at prose boundaries", () => {
    expect(parseMathSegments("15*(\\frac{1}{3})^{(n-1)} - 1 This can be plugged into the GDC")).toEqual([
      { kind: "inline", value: "15*(\\frac{1}{3})^{(n-1)} - 1" },
      { kind: "text", value: " This can be plugged into the GDC" },
    ])
  })

  it("keeps escaped dollars inside math", () => {
    expect(parseMathSegments("Cost per chair: $\\$25$ each")).toEqual([
      { kind: "text", value: "Cost per chair: " },
      { kind: "inline", value: "\\$25" },
      { kind: "text", value: " each" },
    ])
  })

  it("unescapes escaped dollars and percents in text", () => {
    expect(parseMathSegments("bought for \\$30,000 at 2\\%")).toEqual([
      { kind: "text", value: "bought for $30,000 at 2%" },
    ])
  })

  it("demotes prose wrapped in balanced dollars to text", () => {
    expect(parseMathSegments("pay $at the end of the first month and $ then")).toEqual([
      { kind: "text", value: "pay at the end of the first month and  then" },
    ])
  })

  it("demotes prose wrapped in balanced display to text", () => {
    expect(parseMathSegments("$$Now solve the inequality:$$")).toEqual([
      { kind: "text", value: "Now solve the inequality:" },
    ])
  })

  it("keeps wordy math with sigils as math", () => {
    expect(parseMathSegments("$u_n$ and $k = 1$")).toEqual([
      { kind: "inline", value: "u_n" },
      { kind: "text", value: " and " },
      { kind: "inline", value: "k = 1" },
    ])
  })

  it("bails on display recovery that contains inner dollars", () => {
    expect(parseMathSegments("$$Equate parts: the equation $3p + 3iq = 2q$ can be split")).toEqual([
      { kind: "text", value: "Equate parts: the equation " },
      { kind: "inline", value: "3p + 3iq = 2q" },
      { kind: "text", value: " can be split" },
    ])
  })

  it("unescapes latex spaces in text", () => {
    expect(parseMathSegments("Area \\ of \\ the \\ triangle * length")).toEqual([
      { kind: "text", value: "Area of the triangle * length" },
    ])
  })

  it("reparses display content that contains inner dollars", () => {
    expect(parseMathSegments("$$Equate parts: $3p = 2q$ and so$$")).toEqual([
      { kind: "text", value: "Equate parts: " },
      { kind: "inline", value: "3p = 2q" },
      { kind: "text", value: " and so" },
    ])
  })

  it("keeps displays with only escaped dollars as math", () => {
    expect(parseMathSegments("$$FV = \\$2000$$")).toEqual([
      { kind: "display", value: "FV = \\$2000" },
    ])
  })

  it("treats factorial dollars as math", () => {
    expect(parseMathSegments("there are $2! ways")).toEqual([
      { kind: "text", value: "there are " },
      { kind: "inline", value: "2!" },
      { kind: "text", value: " ways" },
    ])
    expect(parseMathSegments("$9!$:")).toEqual([
      { kind: "inline", value: "9!" },
      { kind: "text", value: ":" },
    ])
    expect(parseMathSegments("costs $30! Amazing")).toEqual([
      { kind: "text", value: "costs $30! Amazing" },
    ])
  })

  it("treats dollar-numbers followed by +-* operators as math", () => {
    expect(parseMathSegments("$140.9 + 15 = 155.9")).toEqual([
      { kind: "inline", value: "140.9 + 15 = 155.9" },
    ])
    expect(parseMathSegments("$2 - 2 = 0")).toEqual([
      { kind: "inline", value: "2 - 2 = 0" },
    ])
    expect(parseMathSegments("$0.3 * 0.98 = 0.294")).toEqual([
      { kind: "inline", value: "0.3 * 0.98 = 0.294" },
    ])
  })

  it("treats dollar-decimals followed by ellipsis as math", () => {
    expect(parseMathSegments("so $21.5... - 2.6... = 18.8...cm^3")).toEqual([
      { kind: "text", value: "so " },
      { kind: "inline", value: "21.5... - 2.6... = 18.8...cm^3" },
    ])
  })

  it("treats dollar-comma lists that are not 3-digit groups as math", () => {
    expect(parseMathSegments("the values are $1,1,3.5,3.5,3.5,7,7...$")).toEqual([
      { kind: "text", value: "the values are " },
      { kind: "inline", value: "1,1,3.5,3.5,3.5,7,7..." },
    ])
    expect(parseMathSegments("costs $30,000 today")).toEqual([
      { kind: "text", value: "costs $30,000 today" },
    ])
  })

  it("does not close math on a currency dollar (far-close bug)", () => {
    expect(parseMathSegments("$L$ 0 4000 60000 i) The maximum value of $F$")).toEqual([
      { kind: "text", value: "L 0 4000 60000 i) The maximum value of " },
      { kind: "inline", value: "F" },
    ])
    expect(parseMathSegments("Calories burned, $y$ 180 210 225 and mean $\\bar{x}$")).toEqual([
      { kind: "text", value: "Calories burned, y 180 210 225 and mean " },
      { kind: "inline", value: "\\bar{x}" },
    ])
  })

  it("demotes mixed prose-and-math content to text", () => {
    expect(
      parseMathSegments(
        "Volume of the top part: $21.5... - 2.6... = 18.8...cm^3 Volume of the diamond: $16 + 18.8... = 34.8... = 35cm^3$",
      ),
    ).toEqual([
      { kind: "text", value: "Volume of the top part: 21.5... - 2.6... = 18.8...cm^3 Volume of the diamond: " },
      { kind: "inline", value: "16 + 18.8... = 34.8... = 35cm^3" },
    ])
  })

  it("treats a currency dollar after mathy content as the real closer", () => {
    expect(parseMathSegments("are: 1. $k = 0, m = 1$ 2. $k = 1, m = 0$")).toEqual([
      { kind: "text", value: "are: 1. " },
      { kind: "inline", value: "k = 0, m = 1" },
      { kind: "text", value: " 2. " },
      { kind: "inline", value: "k = 1, m = 0" },
    ])
  })

  it("drops a currency dollar glued after a closing bracket", () => {
    expect(parseMathSegments("$f(x)$ 0 66 148")).toEqual([
      { kind: "text", value: "f(x) 0 66 148" },
    ])
  })
})

describe("decodeMathEntities", () => {
  it("decodes Greek and symbol entities to LaTeX", () => {
    expect(decodeMathEntities("8cos(&theta;)")).toBe("8cos(\\theta)")
    expect(decodeMathEntities("45&deg;")).toBe("45^\\circ")
  })
  it("decodes general and numeric entities", () => {
    expect(decodeMathEntities("a&amp;b")).toBe("a&b")
    expect(decodeMathEntities("&#945;")).toBe("α")
  })
})

describe("normalizeLatex", () => {
  it("trims and strips a dangling trailing backslash", () => {
    expect(normalizeLatex("  x^2 \\")).toBe("x^2")
    expect(normalizeLatex("\\frac{5}{x}")).toBe("\\frac{5}{x}")
  })
})

describe("renderMathToHtml", () => {
  it("renders valid math without throwing", () => {
    expect(renderMathToHtml("x^2", false)).toContain("katex")
  })
  it("does not throw on malformed math", () => {
    expect(() => renderMathToHtml("\\frac{", true)).not.toThrow()
  })
})
describe("environment display blocks", () => {
  it("keeps $$\\begin{array}$$ blocks as display math", () => {
    const segs = parseMathSegments(
      "has the distribution. $$\\begin{array}{c|ccc} x & 2 & 3 \\\\ \\hline P(X=x) & 0.5-a & 2a \\end{array}$$ a) Find a.",
    )
    expect(segs.some((s) => s.kind === "display" && s.value.includes("\\begin{array}"))).toBe(true)
  })
  it("keeps $$\\begin{align*}$$ blocks with \\text words as display math", () => {
    const segs = parseMathSegments(
      "so: $$\\begin{align*} \\frac{1}{\\sqrt[3]{A}} dA &= k \\, dt \\\\ \\text{Number of households} &= kt + C \\end{align*}$$ done",
    )
    expect(segs.some((s) => s.kind === "display" && s.value.includes("align*"))).toBe(true)
  })
})

describe("delimited bare numbers", () => {
  it("treats $1.618$ as math, not currency, and keeps later math paired", () => {
    const segs = parseMathSegments("converge to $1.618$ [R1] (c) $r_{n+1}=\\dfrac{u_{n+2}}{u_{n+1}}$ [M1]")
    expect(segs.filter((s) => s.kind === "inline").map((s) => s.value)).toEqual([
      "1.618",
      "r_{n+1}=\\dfrac{u_{n+2}}{u_{n+1}}",
    ])
  })
  it("still treats a lone $200 as currency", () => {
    expect(parseMathSegments("It costs $200 per month.").every((s) => s.kind === "text")).toBe(true)
  })
})

describe("numeric math that starts with a digit", () => {
  it("treats $2, 3, 5, 8$ as math and keeps following pairs aligned", () => {
    const segs = parseMathSegments("(a) $2, 3, 5, 8$ [A2] (b) $r_1=1,\\ r_2=2$ [A2]")
    expect(segs.filter((s) => s.kind === "inline").map((s) => s.value)).toEqual(["2, 3, 5, 8", "r_1=1,\\ r_2=2"])
  })
  it("does not pair two currency amounts", () => {
    expect(parseMathSegments("Tickets cost $5, $10 or $15.").every((s) => s.kind === "text")).toBe(true)
  })
})
