import { Bookmark, ChevronRight, Image as ImageIcon, ImageOff, Lightbulb } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { difficultyBand } from "@/lib/filter"
import { examLabel, isDiagramMissing, questionImage, questionTips, type Question } from "@/lib/questions"
import { cn } from "@/lib/utils"
import { DifficultyPill } from "./DifficultyPill"
import { MarkschemePanel } from "./MarkschemePanel"
import { MathDisplay } from "./MathDisplay"

interface QuestionCardProps {
  question: Question
  saved: boolean
  index?: number
  onToggleSaved: (id: string) => void
  onOpen: (question: Question) => void
}

export function QuestionCard({ question, saved, index = 0, onToggleSaved, onOpen }: QuestionCardProps) {
  const image = questionImage(question)
  const tips = questionTips(question)
  const missing = isDiagramMissing(question)

  return (
    <article
      className="glass-panel animate-rise group relative flex flex-col rounded-xl p-5 transition-transform duration-150 motion-safe:hover:scale-[1.01] hover:border-line-strong focus-within:border-line-strong motion-reduce:hover:scale-100"
      style={{ animationDelay: `${Math.min(index * 45, 400)}ms` }}
    >
      <button
        type="button"
        onClick={() => onOpen(question)}
        aria-label={`Open ${question.topic}, ${difficultyBand(question.difficulty)} difficulty, ${question.marks} marks`}
        className="absolute inset-0 z-0 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-verdigris/50 focus-visible:ring-offset-2 focus-visible:ring-offset-page"
      />

      <div className="pointer-events-none relative z-10 flex flex-1 flex-col">
        <div className="flex items-center justify-between gap-3 text-[11px] text-ink-faint">
          <span className="truncate tabular-nums">
            {examLabel(question) || question.paper || "Question"}
          </span>
          <span className="flex shrink-0 items-center gap-2 tabular-nums">
            {image && (
              <ImageIcon className="size-3.5 text-ink-faint" aria-label="Includes a figure" />
            )}
            {missing && (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/25 bg-amber-400/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-300">
                <ImageOff className="size-3" aria-hidden="true" /> Figure unavailable
              </span>
            )}
            <span>{question.marks} marks</span>
          </span>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <DifficultyPill score={question.difficulty} />
          <Badge
            variant="outline"
            className="border-line bg-raised/40 font-normal text-ink-muted"
          >
            {question.topic}
          </Badge>
          {tips && (
            <Badge
              variant="outline"
              className="border-accent-line bg-accent-wash font-normal text-accent"
            >
              <Lightbulb className="size-3" aria-hidden="true" /> Method
            </Badge>
          )}
          <button
            type="button"
            onClick={() => onToggleSaved(question.id)}
            aria-pressed={saved}
            aria-label={saved ? "Remove bookmark" : "Bookmark question"}
            className="pointer-events-auto relative z-20 ml-auto grid size-7 place-items-center rounded-md text-ink-faint transition hover:bg-accent-wash hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-verdigris/50"
          >
            <Bookmark className={cn("size-4", saved && "fill-verdigris-bright text-verdigris-bright")} />
          </button>
        </div>

        <div className="my-4 overflow-hidden rounded-lg border border-line bg-page/50 px-4 py-4">
          <div className="max-h-28 overflow-hidden text-sm leading-relaxed text-ink-muted">
            <MathDisplay statement={question.statement} latex={question.latex} clamp />
          </div>
          {image && (
            <img
              loading="lazy"
              src={image}
              alt="Question figure"
              className="mt-3 max-h-24 w-auto rounded-md border border-line object-contain"
            />
          )}
        </div>

        <MarkschemePanel markscheme={question.markscheme} className="mt-3" />

        <div className="mt-auto flex items-end justify-between gap-3 pt-4 text-xs text-ink-faint">
          <div className="min-w-0">
            <p className="truncate">{question.subtopic ?? question.topic}</p>
            {question.source && (
              <p className="mt-1 truncate text-[11px] text-ink-faint/80">
                Source: {question.source}
              </p>
            )}
          </div>
          <ChevronRight
            className="size-3.5 shrink-0 text-ink-faint transition group-hover:translate-x-0.5 group-hover:text-ink-muted"
            aria-hidden="true"
          />
        </div>
      </div>
    </article>
  )
}