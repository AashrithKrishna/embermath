import { afterEach, describe, expect, it, vi } from "vitest"
import type { Question } from "./questions"
import { fetchQuestions } from "./api"

const sample: Question[] = [
  {
    id: "q1",
    course: "AA HL",
    year: 2021,
    session: "May",
    timezone: "TZ1",
    paper: "Paper 1",
    topic: "Algebra",
    subtopic: "Logarithms",
    difficulty: 3,
    marks: 4,
    statement: "Solve $x^2 = 4$",
    latex: null,
    imageUrl: null,
    markscheme: "A1",
  },
]

const jsonResponse = (body: unknown) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  })

const html404 = () => new Response("<html>not found</html>", { status: 404 })

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("fetchQuestions", () => {
  it("loads from the API when it returns JSON", async () => {
    const calls: string[] = []
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        calls.push(String(url))
        return url === "/api/questions" ? jsonResponse(sample) : html404()
      }),
    )

    await expect(fetchQuestions()).resolves.toEqual(sample)
    expect(calls).toEqual(["/api/questions"])
  })

  it("falls back to the bundled questions.json when the API is unavailable", async () => {
    const calls: string[] = []
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        calls.push(String(url))
        if (url === "/api/questions") return html404()
        return jsonResponse(sample)
      }),
    )

    await expect(fetchQuestions()).resolves.toEqual(sample)
    expect(calls).toEqual(["/api/questions", "/questions.json"])
  })

  it("throws when both sources fail", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => html404()),
    )

    await expect(fetchQuestions()).rejects.toThrow("Failed to load questions")
  })
})
