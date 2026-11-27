import { describe, expect, it } from "vitest"
import { extractGraphableExpression } from "./desmos"

describe("extractGraphableExpression", () => {
  it("extracts a plain y = equation from prose", () => {
    expect(
      extractGraphableExpression("The curve has equation y = 2x + 3. Find the intercepts."),
    ).toBe("y=2x + 3")
  })

  it("extracts an f(x) = equation", () => {
    expect(extractGraphableExpression("Consider f(x) = x^2 - 4 and sketch it.")).toBe(
      "f(x)=x^2 - 4",
    )
  })

  it("extracts general function notation such as h(t) =", () => {
    expect(
      extractGraphableExpression(
        "The height is modelled by $$h(t) = -t^2 + 6t + 20$$ in metres.",
      ),
    ).toBe("h(t)=-t^2 + 6t + 20")
  })

  it("stops the expression at semicolons and dollar delimiters", () => {
    expect(extractGraphableExpression("y = 3x + 1; find dy/dx")).toBe("y=3x + 1")
    expect(extractGraphableExpression("$$y = \\frac{1}{x}$$")).toBe("y=\\frac{1}{x}")
  })

  it("strips trailing punctuation and dangling backslashes", () => {
    expect(extractGraphableExpression("Solve y = 3x.")).toBe("y=3x")
    expect(extractGraphableExpression("y = x^2 \\")).toBe("y=x^2")
  })

  it("removes latex spacing and sizing commands", () => {
    expect(extractGraphableExpression("y = \\left(x + 1\\right)^2 \\quad")).toBe(
      "y=(x + 1)^2",
    )
  })

  it("prefers y = equations over function notation", () => {
    expect(extractGraphableExpression("f(x)=x^2 and y = 3x")).toBe("y=3x")
  })

  it("falls back to a later match when an earlier one is empty", () => {
    expect(extractGraphableExpression("y = $2 and f(x) = 2x")).toBe("f(x)=2x")
  })

  it("returns null when no graphable equation is present", () => {
    expect(extractGraphableExpression("Find the area of the triangle.")).toBeNull()
    expect(extractGraphableExpression("costs $5 and $7 in total")).toBeNull()
    expect(extractGraphableExpression("")).toBeNull()
  })
})
