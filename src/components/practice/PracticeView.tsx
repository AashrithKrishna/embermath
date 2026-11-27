import { useCallback, useEffect, useState } from "react"
import { Bookmark, ChevronLeft, ChevronRight, ImageOff, LineChart } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Kbd } from "@/components/ui/kbd"
import { difficultyBand } from "@/lib/filter"
import { isTypingTarget } from "@/lib/keyboard"
import {
  examLabel,
  isDiagramMissing,
  questionImage,
  questionTips,
  type Question,
} from "@/lib/questions"
import { cn } from "@/lib/utils"
import { DifficultyPill } from "@/components/questions/DifficultyPill"
import { MathDisplay } from "@/components/questions/MathDisplay"
import { MarkschemePanel } from "@/components/questions/MarkschemePanel"
import { TipPanel } from "@/components/questions/TipPanel"

interface PracticeViewProps {
  questions: Question[]
  savedIds: Set<string>
  onToggleSaved: (id: string) => void
  onToggleDesmos: () => void
  onActiveChange: (question: Question | null) => void
  /** Number of matching questions skipped because their figure is unavailable. */
  excludedCount: number
}

export function PracticeView({
  questions,
  savedIds,
  onToggleSaved,
  onToggleDesmos,
  onActiveChange,
  excludedCount,
}: PracticeViewProps) {
  const [index, setIndex] = useState(0)
  const [showMarkscheme, setShowMarkscheme] = useState(false)

  useEffect(() => {
    setIndex(0)
  }, [questions])

  const total = questions.length
  const safeIndex = Math.min(index, Math.max(0, total - 1))
  const question = questions[safeIndex]
  const image = question ? questionImage(question) : null
  const tips = question ? questionTips(question) : null
  const missing = question ? isDiagramMissing(question) : false

  useEffect(() => {
    onActiveChange(question ?? null)
  }, [question, onActiveChange])

  useEffect(() => {
    setShowMarkscheme(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question?.id])

  const goPrevious = useCallback(() => setIndex((i) => Math.max(0, i - 1)), [])
  const goNext = useCallback(() => setIndex((i) => Math.min(total - 1, i + 1)), [total])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return
      if (event.metaKey || event.ctrlKey || event.altKey) return
      if (event.key === "ArrowLeft") {
        event.preventDefault()
        goPrevious()
      } else if (event.key === "ArrowRight") {
        event.preventDefault()
        goNext()
      } else if (event.key === "m" || event.key === "M") {
        if (question?.markscheme?.trim()) setShowMarkscheme((open) => !open)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [goPrevious, goNext, question?.markscheme])

  if (!question) {
    return (
      <div className="glass-panel animate-rise grid place-items-center rounded-xl px-6 py-16 text-center">
        <p className="text-sm text-ink-muted">No practice questions match the current filters.</p>
        {excludedCount > 0 && (
          <p className="mt-1.5 text-xs text-ink-faint">
            {excludedCount} question{excludedCount === 1 ? "" : "s"} with unavailable figures{" "}
            {excludedCount === 1 ? "was" : "were"} skipped.
          </p>
        )}
      </div>
    )
  }

  const saved = savedIds.has(question.id)
  const header = [examLabel(question), question.paper].filter(Boolean).join(" · ")

  return (
    <div className="glass-panel animate-rise flex flex-col rounded-xl p-6 sm:p-8">
      <div className="flex items-center justify-between gap-3 text-[11px] text-ink-faint">
        <span className="truncate tabular-nums">{header || "Question"}</span>
        <span className="shrink-0 tabular-nums">
          Question {safeIndex + 1} of {total}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <DifficultyPill score={question.difficulty} />
        <Badge variant="outline" className="border-line bg-raised/40 font-normal text-ink-muted">
          {question.topic}
        </Badge>
        {missing && (
          <Badge
            variant="outline"
            className="border-amber-400/25 bg-amber-400/10 font-normal text-amber-300"
          >
            <ImageOff className="size-3" aria-hidden="true" /> Figure unavailable
          </Badge>
        )}
        <span className="text-xs text-ink-faint">
          {question.marks} marks · {difficultyBand(question.difficulty)}
        </span>
        <button
          type="button"
          onClick={onToggleDesmos}
          aria-label="Open graphing calculator"
          className="ml-auto grid size-7 place-items-center rounded-md text-ink-faint transition hover:bg-accent-wash hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-verdigris/50"
        >
          <LineChart className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => onToggleSaved(question.id)}
          aria-pressed={saved}
          aria-label={saved ? "Remove bookmark" : "Bookmark question"}
          className="grid size-7 place-items-center rounded-md text-ink-faint transition hover:bg-accent-wash hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-verdigris/50"
        >
          <Bookmark className={cn("size-4", saved && "fill-verdigris-bright text-verdigris-bright")} />
        </button>
      </div>

      {question.subtopic && <p className="mt-2 text-xs text-ink-faint">{question.subtopic}</p>}

      <div key={question.id} className="animate-question-in motion-reduce:animate-none">
        <div className="mt-5 rounded-lg border border-line bg-page/50 px-5 py-6 text-[15px] leading-relaxed text-ink">
          <MathDisplay statement={question.statement} latex={question.latex} />
        </div>

        {image && (
          <figure className="mt-4 grid place-items-center overflow-x-auto rounded-lg border border-line bg-page/40 p-3">
            <img
              loading="lazy"
              src={image}
              alt="Question figure"
              className="max-h-[400px] w-auto rounded-md object-contain"
            />
          </figure>
        )}

        {tips && <TipPanel tips={tips} className="mt-4" />}

        {question.source && (
          <p className="mt-4 text-[11px] text-ink-faint">Source: {question.source}</p>
        )}

        <MarkschemePanel
          key={question.id}
          markscheme={question.markscheme}
          className="mt-4"
          open={showMarkscheme}
          onOpenChange={setShowMarkscheme}
        />
      </div>

      <div className="sticky bottom-0 z-10 -mx-6 -mb-6 mt-6 flex items-center justify-between gap-3 rounded-b-xl border-t border-line bg-surface/95 px-6 py-3 backdrop-blur-md sm:-mx-8 sm:-mb-8 sm:px-8">
        <Button
          variant="outline"
          onClick={goPrevious}
          disabled={safeIndex === 0}
          className="h-11 min-w-[108px] gap-1.5 border-line bg-raised/50 text-ink-muted hover:bg-accent-wash hover:text-ink disabled:opacity-40 sm:h-9"
        >
          <ChevronLeft className="size-4" /> Previous
        </Button>
        <span className="hidden items-center gap-2 text-[11px] text-ink-faint md:flex">
          <Kbd>←</Kbd>
          <Kbd>→</Kbd> navigate
          <span className="mx-1 text-line-strong">·</span>
          <Kbd>M</Kbd> markscheme
          <span className="mx-1 text-line-strong">·</span>
          <Kbd>D</Kbd> graph
        </span>
        <Button
          variant="outline"
          onClick={goNext}
          disabled={safeIndex === total - 1}
          className="h-11 min-w-[108px] gap-1.5 border-line bg-raised/50 text-ink-muted hover:border-accent-line hover:bg-accent-wash hover:text-ink disabled:opacity-40 sm:h-9"
        >
          Next <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  )
}