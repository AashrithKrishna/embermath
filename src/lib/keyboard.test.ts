import { describe, expect, it } from "vitest"
import { isTypingTarget } from "./keyboard"

describe("isTypingTarget", () => {
  it("returns false for null or non-element targets", () => {
    expect(isTypingTarget(null)).toBe(false)
    expect(isTypingTarget(undefined)).toBe(false)
    expect(isTypingTarget({} as unknown as EventTarget)).toBe(false)
  })

  it("detects form fields regardless of case", () => {
    expect(isTypingTarget({ tagName: "INPUT" } as unknown as EventTarget)).toBe(true)
    expect(isTypingTarget({ tagName: "textarea" } as unknown as EventTarget)).toBe(true)
    expect(isTypingTarget({ tagName: "SELECT" } as unknown as EventTarget)).toBe(true)
  })

  it("detects contenteditable elements", () => {
    expect(isTypingTarget({ isContentEditable: true } as unknown as EventTarget)).toBe(true)
  })

  it("ignores buttons and plain elements", () => {
    expect(isTypingTarget({ tagName: "BUTTON" } as unknown as EventTarget)).toBe(false)
    expect(isTypingTarget({ tagName: "DIV" } as unknown as EventTarget)).toBe(false)
  })
})
