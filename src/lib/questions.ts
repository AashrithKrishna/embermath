export type Session = "May" | "November"
export type Timezone = "TZ1" | "TZ2"
export type Paper = "Paper 1" | "Paper 2" | "Paper 3"

export interface Question {
  id: string
  course: string
  year: number | null
  session: Session | null
  timezone: Timezone | null
  paper: Paper | null
  topic: string
  subtopic: string | null
  /** Textbook chapter, when the source provides one. */
  chapter?: string | null
  difficulty: number
  marks: number
  statement: string
  latex: string | null
  markscheme: string | null
  /** Study tip / method hint in $...$ LaTeX-flavored prose. */
  tips?: string | null
  /** Attribution such as "Edunade" or "Christos Nikolaidis". */
  source?: string | null
  imageUrl: string | null
  /** Alternate name used by newer API payloads (site-relative path). */
  image_url?: string | null
  /** 1 when the question's figure is missing from the source material. */
  diagram_missing?: number | null
  diagramMissing?: number | null
  /** Statement figure URLs (hotlinked or data URIs). */
  images?: string[] | null
  /** Figures that belong to the worked solution. */
  markschemeImages?: string[] | null
}

/** All statement figures for a question, de-duplicated. */
export function questionFigures(question: Question): string[] {
  const list = [...(Array.isArray(question.images) ? question.images : [])]
  const single = question.imageUrl ?? question.image_url
  if (single && !list.includes(single)) list.unshift(single)
  return list.filter((src) => typeof src === "string" && src.length > 0)
}

export function markschemeFigures(question: Question): string[] {
  return Array.isArray(question.markschemeImages) ? question.markschemeImages.filter(Boolean) : []
}

/** Returns the question's figure URL, whichever field the payload uses. */
export function questionImage(question: Question): string | null {
  return question.imageUrl ?? question.image_url ?? null
}

/** Returns trimmed tips text, or null when there is nothing useful. */
export function questionTips(question: Question): string | null {
  if (typeof question.tips !== "string") return null
  const trimmed = question.tips.trim()
  return trimmed ? trimmed : null
}

/** True when the source flagged the question's figure as unavailable. */
export function isDiagramMissing(question: Question): boolean {
  return question.diagram_missing === 1 || question.diagramMissing === 1
}

export function deriveCourses(questions: Question[]): string[] {
  return [...new Set(questions.map((question) => question.course))].sort((left, right) =>
    left.localeCompare(right),
  )
}

export function questionsForCourse(questions: Question[], course: string): Question[] {
  return questions.filter((question) => question.course === course)
}

export function deriveTopics(questions: Question[]): string[] {
  return [...new Set(questions.map((question) => question.topic))].sort((left, right) =>
    left.localeCompare(right),
  )
}

export function deriveYears(questions: Question[]): number[] {
  const years = new Set<number>()
  for (const question of questions) {
    if (question.year !== null) years.add(question.year)
  }
  return [...years].sort((left, right) => right - left)
}

export function examLabel(question: Question): string {
  const parts: string[] = []
  if (question.session) parts.push(question.session)
  if (question.year !== null) parts.push(String(question.year))
  const left = parts.join(" ")
  if (question.timezone) return left ? `${left} · ${question.timezone}` : question.timezone
  return left
}