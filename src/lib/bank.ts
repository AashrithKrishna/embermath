import { questionFigures, type Question } from "./questions"

export interface BankFilter {
  search: string
  topic: string | null
  subtopic: string | null
  papers: string[]
  difficulties: number[]
  marksMin: number | null
  marksMax: number | null
  figures: "any" | "with"
}

export const emptyBankFilter: BankFilter = {
  search: "",
  topic: null,
  subtopic: null,
  papers: [],
  difficulties: [],
  marksMin: null,
  marksMax: null,
  figures: "any",
}

export function applyBankFilter(pool: Question[], f: BankFilter): Question[] {
  const terms = f.search.trim().toLowerCase().split(/\s+/).filter(Boolean)
  return pool.filter((q) => {
    if (f.topic && q.topic !== f.topic) return false
    if (f.subtopic && q.subtopic !== f.subtopic) return false
    if (f.papers.length && !f.papers.includes(q.paper ?? "")) return false
    if (f.difficulties.length && !f.difficulties.includes(q.difficulty)) return false
    if (f.marksMin !== null && q.marks < f.marksMin) return false
    if (f.marksMax !== null && q.marks > f.marksMax) return false
    if (f.figures === "with" && questionFigures(q).length === 0) return false
    if (terms.length) {
      const hay = `${q.topic} ${q.subtopic ?? ""} ${q.paper ?? ""} ${q.statement} ${shortId(q)}`.toLowerCase()
      if (!terms.every((t) => hay.includes(t))) return false
    }
    return true
  })
}

export function activeBankFilters(f: BankFilter): number {
  return (
    (f.topic ? 1 : 0) +
    (f.subtopic ? 1 : 0) +
    f.papers.length +
    f.difficulties.length +
    (f.marksMin !== null ? 1 : 0) +
    (f.marksMax !== null ? 1 : 0) +
    (f.figures === "with" ? 1 : 0)
  )
}

/** Compact human ID such as "AA-P1-3f9c". */
export function shortId(q: Question): string {
  const course = q.course.startsWith("AI") ? "AI" : "AA"
  const paper = q.paper ? `P${q.paper.slice(-1)}` : "PX"
  return `${course}-${paper}-${q.id.slice(0, 4).toUpperCase()}`
}

export function topicTree(pool: Question[]): { topic: string; count: number; subtopics: { name: string; count: number }[] }[] {
  const map = new Map<string, Map<string, number>>()
  for (const q of pool) {
    const subs = map.get(q.topic) ?? new Map<string, number>()
    const sub = q.subtopic ?? "General"
    subs.set(sub, (subs.get(sub) ?? 0) + 1)
    map.set(q.topic, subs)
  }
  return [...map.entries()]
    .map(([topic, subs]) => ({
      topic,
      count: [...subs.values()].reduce((a, b) => a + b, 0),
      subtopics: [...subs.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => a.name.localeCompare(b.name)),
    }))
    .sort((a, b) => a.topic.localeCompare(b.topic))
}

export const DIFFICULTY_LABEL = ["", "Very easy", "Easy", "Medium", "Hard", "Very hard"]
export function difficultyTone(d: number): "easy" | "medium" | "hard" {
  return d <= 2 ? "easy" : d === 3 ? "medium" : "hard"
}
