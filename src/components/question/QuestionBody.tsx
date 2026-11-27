import { TriangleAlert } from "lucide-react"
import { FigureList, MathRenderer } from "@/components/math/MathRenderer"
import { DifficultyMeter, Marks, PaperTag } from "@/components/app/primitives"
import { shortId } from "@/lib/bank"
import { isDiagramMissing, markschemeFigures, questionFigures, questionTips, type Question } from "@/lib/questions"

export function QuestionMeta({ question, index }: { question: Question; index?: string }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[12px]">
      {index ? <span className="num text-[12px] text-ink">{index}</span> : null}
      <PaperTag paper={question.paper} />
      <span className="num text-[11px] text-ink-faint">{shortId(question)}</span>
      <span className="text-ink-muted">
        {question.topic}
        {question.subtopic && question.subtopic !== question.topic ? <span className="text-ink-faint"> / {question.subtopic}</span> : null}
      </span>
      <span className="ml-auto flex items-center gap-3">
        <DifficultyMeter value={question.difficulty} />
        <Marks value={question.marks} />
      </span>
    </div>
  )
}

export function QuestionStatement({ question }: { question: Question }) {
  const figures = questionFigures(question)
  return (
    <div>
      <MathRenderer text={question.statement} />
      <FigureList images={figures} label="Question" />
      {figures.length === 0 && isDiagramMissing(question) ? (
        <p className="mt-3 flex items-start gap-2 rounded-lg border border-medium/30 bg-medium/5 px-3 py-2 text-[12px] text-medium">
          <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          The source did not publish this question’s figure. Sketch it from the description, or plot it in Desmos with G.
        </p>
      ) : null}
    </div>
  )
}

export function Markscheme({ question }: { question: Question }) {
  const tips = questionTips(question)
  return (
    <div className="animate-enter">
      {question.markscheme ? (
        <MathRenderer text={question.markscheme} marks className="text-[14px]" />
      ) : (
        <p className="text-[13px] text-ink-faint">No markscheme is available for this question.</p>
      )}
      <FigureList images={markschemeFigures(question)} label="Markscheme" />
      {tips ? (
        <div className="mt-4 border-l-2 border-accent-line pl-3">
          <div className="mb-1 text-[11px] font-medium text-accent">Method note</div>
          <MathRenderer text={tips} className="text-[13px] text-ink-muted" />
        </div>
      ) : null}
    </div>
  )
}
