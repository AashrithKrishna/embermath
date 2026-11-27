import type { Question } from "@/lib/questions"
import { EmptyState } from "./EmptyState"
import { QuestionCard } from "./QuestionCard"

interface QuestionGridProps {
  questions: Question[]
  savedIds: Set<string>
  filterSummary: string
  onToggleSaved: (id: string) => void
  onOpen: (question: Question) => void
  onClear: () => void
}

export function QuestionGrid({
  questions,
  savedIds,
  filterSummary,
  onToggleSaved,
  onOpen,
  onClear,
}: QuestionGridProps) {
  if (questions.length === 0) {
    return <EmptyState summary={filterSummary} onClear={onClear} />
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {questions.map((question, index) => (
        <QuestionCard
          key={question.id}
          question={question}
          index={index}
          saved={savedIds.has(question.id)}
          onToggleSaved={onToggleSaved}
          onOpen={onOpen}
        />
      ))}
    </div>
  )
}