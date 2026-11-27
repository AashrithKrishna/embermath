import { Bookmark, ImageOff, Lightbulb } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { difficultyBand } from "@/lib/filter"
import {
  examLabel,
  isDiagramMissing,
  questionImage,
  questionTips,
  type Question,
} from "@/lib/questions"
import { cn } from "@/lib/utils"
import { DifficultyPill } from "./DifficultyPill"
import { MarkschemePanel } from "./MarkschemePanel"
import { MathDisplay } from "./MathDisplay"
import { TipPanel } from "./TipPanel"

interface QuestionDetailDialogProps {
  question: Question | null
  saved: boolean
  onToggleSaved: (id: string) => void
  onOpenChange: (open: boolean) => void
}

export function QuestionDetailDialog({
  question,
  saved,
  onToggleSaved,
  onOpenChange,
}: QuestionDetailDialogProps) {
  return (
    <Dialog open={question !== null} onOpenChange={onOpenChange}>
      <DialogContent className="gap-5 border border-line bg-surface/95 p-6 ring-0 backdrop-blur-xl sm:max-w-xl">
        {question && (
          <>
            <DialogHeader className="gap-2">
              <div className="flex flex-wrap items-center gap-2 text-[11px] tabular-nums text-ink-faint">
                {[examLabel(question), question.paper].filter(Boolean).join(" · ")}
              </div>
              <DialogTitle className="text-lg font-semibold tracking-tight text-ink">
                {question.subtopic ? `${question.topic} · ${question.subtopic}` : question.topic}
              </DialogTitle>
              <DialogDescription className="sr-only">
                Full statement, equation, and metadata for this question.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-wrap items-center gap-2">
              <DifficultyPill score={question.difficulty} />
              <Badge
                variant="outline"
                className="border-line bg-raised/40 font-normal text-ink-muted"
              >
                {question.topic}
              </Badge>
              {questionTips(question) && (
                <Badge
                  variant="outline"
                  className="border-accent-line bg-accent-wash font-normal text-accent"
                >
                  <Lightbulb className="size-3" aria-hidden="true" /> Method
                </Badge>
              )}
              <span className="text-xs text-ink-faint">{question.marks} marks</span>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => onToggleSaved(question.id)}
                aria-pressed={saved}
                aria-label={saved ? "Remove bookmark" : "Bookmark question"}
                className="ml-auto text-ink-faint hover:bg-accent-wash hover:text-ink"
              >
                <Bookmark className={cn("size-4", saved && "fill-verdigris-bright text-verdigris-bright")} />
              </Button>
            </div>

            {isDiagramMissing(question) && (
              <div className="flex items-center gap-2.5 rounded-lg border border-amber-400/25 bg-amber-400/10 px-3 py-2 text-xs text-amber-300">
                <ImageOff className="size-4 shrink-0" aria-hidden="true" />
                The figure for this question is unavailable.
              </div>
            )}

            <div className="rounded-lg border border-line bg-page/50 px-4 py-5 text-sm leading-relaxed text-ink">
              <MathDisplay statement={question.statement} latex={question.latex} />
            </div>

            {questionImage(question) && (
              <figure className="grid place-items-center overflow-x-auto rounded-lg border border-line bg-page/40 p-3">
                <img
                  loading="lazy"
                  src={questionImage(question) ?? undefined}
                  alt="Question figure"
                  className="max-h-[400px] w-auto rounded-md object-contain"
                />
              </figure>
            )}

            {questionTips(question) && <TipPanel tips={questionTips(question)} />}

            <dl className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
              {[
                ["Session", examLabel(question) || "—"],
                ["Paper", question.paper ?? "—"],
                ["Marks", String(question.marks)],
                ["Difficulty", `${question.difficulty}/5 · ${difficultyBand(question.difficulty)}`],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-lg border border-line bg-raised/30 px-3 py-2"
                >
                  <dt className="text-[10px] uppercase tracking-[0.12em] text-ink-faint">{label}</dt>
                  <dd className="mt-1 text-ink-muted">{value}</dd>
                </div>
              ))}
            </dl>

            {question.source && (
              <p className="text-[11px] text-ink-faint">Source: {question.source}</p>
            )}

            <MarkschemePanel key={question.id} markscheme={question.markscheme} />
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}