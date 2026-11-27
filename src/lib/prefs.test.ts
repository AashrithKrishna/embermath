import { describe, expect, it } from "vitest"
import { loadPrefs, PREFS_KEY, sanitizePrefs, savePrefs } from "./prefs"

function makeStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial))
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value)
    },
    removeItem: (key: string) => {
      data.delete(key)
    },
    dump: () => Object.fromEntries(data),
  }
}

describe("loadPrefs", () => {
  it("returns an empty object when nothing is stored", () => {
    expect(loadPrefs(makeStorage())).toEqual({})
  })

  it("returns an empty object for corrupt JSON", () => {
    expect(loadPrefs(makeStorage({ [PREFS_KEY]: "{not json" }))).toEqual({})
  })

  it("round-trips valid preferences", () => {
    const prefs = {
      course: "AI HL",
      view: "practice" as const,
      filters: { search: "sin", difficulty: [2, 4] as [number, number], topics: ["Calculus"], years: [2024] },
      sortKey: "marks" as const,
    }
    const storage = makeStorage()
    savePrefs(prefs, storage)
    expect(loadPrefs(storage)).toEqual(prefs)
  })
})

describe("sanitizePrefs", () => {
  it("drops unknown keys and malformed values", () => {
    const result = sanitizePrefs({
      course: 42,
      view: "sideways",
      sortKey: "alphabetical",
      filters: { search: 7, difficulty: [0, 99], topics: "nope", years: [2024] },
      junk: true,
    })
    expect(result).toEqual({
      filters: { search: "", difficulty: [1, 5], topics: [], years: [2024] },
    })
  })

  it("rejects non-object input", () => {
    expect(sanitizePrefs(null)).toEqual({})
    expect(sanitizePrefs("practice")).toEqual({})
    expect(sanitizePrefs(42)).toEqual({})
  })

  it("clamps the difficulty range back into 1–5", () => {
    const result = sanitizePrefs({ filters: { difficulty: [0, 99] } })
    expect(result.filters?.difficulty).toEqual([1, 5])
  })
})

describe("savePrefs", () => {
  it("writes under the namespaced key as JSON", () => {
    const storage = makeStorage()
    savePrefs({ course: "AA HL" }, storage)
    expect(JSON.parse(storage.dump()[PREFS_KEY] ?? "{}")).toEqual({ course: "AA HL" })
  })

  it("swallows storage write failures", () => {
    const broken = {
      getItem: () => null,
      setItem: () => {
        throw new Error("quota exceeded")
      },
    }
    expect(() => savePrefs({ course: "AA HL" }, broken)).not.toThrow()
  })
})
