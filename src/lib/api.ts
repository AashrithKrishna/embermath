import type { Question } from "./questions"

const isJson = (response: Response) =>
  response.ok && (response.headers.get("content-type") ?? "").includes("application/json")

// Static deployments (VITE_STATIC=1, e.g. Cloudflare Pages) have no /api, so
// they read the bundled snapshot directly instead of probing for a 404.
const STATIC = import.meta.env.VITE_STATIC === "1"

export async function fetchQuestions(): Promise<Question[]> {
  if (!STATIC) {
    const api = await fetch("/api/questions")
    if (isJson(api)) return (await api.json()) as Question[]
  }
  const bundled = await fetch("/questions.json")
  if (!bundled.ok) {
    throw new Error(`Failed to load questions (HTTP ${bundled.status})`)
  }
  return (await bundled.json()) as Question[]
}