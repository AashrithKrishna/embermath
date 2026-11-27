import type { Question } from "./questions"

export type DifficultyBand = "Easy" | "Medium" | "Hard"
export type SortKey = "newest" | "oldest" | "marks" | "difficulty"

export interface FilterState {
  search: string
  difficulty: [number, number]
  topics: string[]
  years: number[]
}

export const defaultFilters: FilterState = {
  search: "",
  difficulty: [1, 5],
  topics: [],
  years: [],
}

export function difficultyBand(score: number): DifficultyBand {
  if (score <= 2) return "Easy"
  if (score === 3) return "Medium"
  return "Hard"
}

export function applyFilters(questions: Question[], filters: FilterState): Question[] {
  const query = filters.search.trim().toLowerCase()
  const [min, max] = filters.difficulty

  return questions.filter((question) => {
    if (question.difficulty < min || question.difficulty > max) return false
    if (filters.topics.length > 0 && !filters.topics.includes(question.topic)) return false
    if (filters.years.length > 0) {
      if (question.year === null || !filters.years.includes(question.year)) return false
    }
    if (query.length === 0) return true

    const haystack = [
      question.year ?? "",
      question.session ?? "",
      question.timezone ?? "",
      question.paper ?? "",
      question.topic,
      question.subtopic ?? "",
      question.statement,
      question.source ?? "",
      difficultyBand(question.difficulty),
    ]
      .join(" ")
      .toLowerCase()

    return haystack.includes(query)
  })
}

export function topicCounts(
  questions: Question[],
  filters: FilterState,
  topics: readonly string[],
): Record<string, number> {
  const pool = applyFilters(questions, { ...filters, topics: [] })
  const counts: Record<string, number> = {}

  for (const topic of topics) {
    counts[topic] = pool.filter((question) => question.topic === topic).length
  }

  return counts
}

export function samplePaper(
  questions: Question[],
  count: number,
  rng: () => number = Math.random,
): Question[] {
  const pool = [...questions]

  for (let index = pool.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(rng() * (index + 1))
    const current = pool[index]
    pool[index] = pool[swapIndex]
    pool[swapIndex] = current
  }

  return pool.slice(0, Math.max(0, Math.min(count, pool.length)))
}

export function activeFilterCount(filters: FilterState): number {
  const difficultyChanged = filters.difficulty[0] !== 1 || filters.difficulty[1] !== 5
  return (difficultyChanged ? 1 : 0) + filters.topics.length + filters.years.length
}

export function hasActiveFilters(filters: FilterState): boolean {
  return activeFilterCount(filters) > 0
}

export function describeFilters(filters: FilterState): string {
  const parts: string[] = []
  const query = filters.search.trim()

  if (query) parts.push(`"${query}"`)

  if (filters.difficulty[0] !== 1 || filters.difficulty[1] !== 5) {
    parts.push(`difficulty ${filters.difficulty[0]}–${filters.difficulty[1]}`)
  }

  if (filters.topics.length > 0) parts.push(filters.topics.join(", "))

  if (filters.years.length > 0) {
    parts.push([...filters.years].sort((left, right) => left - right).join(", "))
  }

  return parts.join(" · ")
}

function byNewest(left: Question, right: Question): number {
  const leftYear = left.year ?? Number.NEGATIVE_INFINITY
  const rightYear = right.year ?? Number.NEGATIVE_INFINITY
  if (leftYear !== rightYear) return rightYear - leftYear
  const leftSession = left.session === "November" ? 1 : 0
  const rightSession = right.session === "November" ? 1 : 0
  if (leftSession !== rightSession) return rightSession - leftSession
  return left.id.localeCompare(right.id)
}

const comparators: Record<SortKey, (left: Question, right: Question) => number> = {
  newest: byNewest,
  oldest: (left, right) => byNewest(right, left),
  marks: (left, right) => right.marks - left.marks || byNewest(left, right),
  difficulty: (left, right) => right.difficulty - left.difficulty || byNewest(left, right),
}

export function sortQuestions(questions: Question[], key: SortKey): Question[] {
  return [...questions].sort(comparators[key])
}