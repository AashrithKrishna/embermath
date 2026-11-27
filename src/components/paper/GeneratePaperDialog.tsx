import { Download, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { examLabel, type Question } from "@/lib/questions"
import { DifficultyPill } from "../questions/DifficultyPill"

interface GeneratePaperDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  paper: Question[]
  matchingCount: number
  onRegenerate: () => void
}

export function GeneratePaperDialog({
  open,
  onOpenChange,
  paper,
  matchingCount,
  onRegenerate,
}: GeneratePaperDialogProps) {
  const totalMarks = paper.reduce((sum, question) => sum + question.marks, 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-5 border border-line bg-surface/95 p-6 ring-0 backdrop-blur-xl sm:max-w-lg">
        <DialogHeader className="gap-1.5">
          <DialogTitle className="text-lg font-semibold tracking-tight text-zinc-100">
            Practice paper
          </DialogTitle>
          <DialogDescription className="text-sm text-zinc-500">
            Generated from {matchingCount} matching question{matchingCount === 1 ? "" : "s"}.
          </DialogDescription>
        </DialogHeader>

        {paper.length === 0 ? (
          <p className="py-8 text-center text-sm text-zinc-500">
            No questions match the current filters.
          </p>
        ) : (
          <ol className="space-y-2">
            {paper.map((question, index) => (
              <li
                key={question.id}
                className="flex items-center gap-3 rounded-lg border border-zinc-800/70 bg-white/[0.03] px-3 py-2.5"
              >
                <span className="w-6 shrink-0 text-xs tabular-nums text-zinc-500">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-zinc-200">
                    {question.subtopic
                      ? `${question.topic} · ${question.subtopic}`
                      : question.topic}
                  </p>
                  <p className="text-[11px] tabular-nums text-zinc-500">
                    {[examLabel(question), question.paper].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <DifficultyPill score={question.difficulty} />
                <span className="w-14 shrink-0 text-right text-xs tabular-nums text-zinc-400">
                  {question.marks} marks
                </span>
              </li>
            ))}
          </ol>
        )}

        <div className="flex items-center justify-between border-t border-zinc-800/70 pt-4 text-sm">
          <span className="text-zinc-500">Total</span>
          <span className="tabular-nums text-zinc-100">{totalMarks} marks</span>
        </div>

        {paper.length > 0 && paper.length < 4 && (
          <p className="text-xs text-amber-300/80">
            Only {paper.length} question{paper.length === 1 ? "" : "s"} match your filters.
          </p>
        )}

        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
          >
            Close
          </Button>
          <Button
            variant="outline"
            onClick={onRegenerate}
            className="gap-2 border-zinc-700 bg-transparent text-zinc-300 hover:bg-white/5 hover:text-zinc-100"
          >
            <RefreshCw className="size-4" aria-hidden="true" />
            Regenerate
          </Button>
          <Button
            variant="outline"
            disabled
            title="Coming soon"
            className="gap-2 border-zinc-800 text-zinc-500"
          >
            <Download className="size-4" aria-hidden="true" />
            Export PDF
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}