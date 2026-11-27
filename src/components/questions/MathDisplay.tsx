import { useMemo } from "react"
import { parseMathSegments, renderMathToHtml } from "@/lib/math"
import { cn } from "@/lib/utils"

interface MathDisplayProps {
  statement?: string | null
  latex?: string | null
  imageUrl?: string | null
  className?: string
  clamp?: boolean
}

// KaTeX runs with trust disabled (the default), so math cannot inject links or
// raw HTML; prose segments are rendered as React text and escaped automatically.
export function MathDisplay({ statement, latex, imageUrl, className, clamp }: MathDisplayProps) {
  const segments = useMemo(
    () => (statement && statement.trim() ? parseMathSegments(statement) : null),
    [statement],
  )
  const fallbackHtml = useMemo(
    () => (!segments && latex ? renderMathToHtml(latex, true) : null),
    [segments, latex],
  )

  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt="Question diagram"
        className={cn("max-h-64 w-auto rounded-md object-contain", className)}
      />
    )
  }

  if (segments) {
    return (
      <div className={cn("katex-host", clamp && "line-clamp-4", className)}>
        {segments.map((segment, index) => {
          if (segment.kind === "text") return <span key={index}>{segment.value}</span>
          const html = renderMathToHtml(segment.value, segment.kind === "display")
          if (segment.kind === "display") {
            return (
              <div
                key={index}
                className="my-2 overflow-x-auto text-center"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            )
          }
          return <span key={index} dangerouslySetInnerHTML={{ __html: html }} />
        })}
      </div>
    )
  }

  if (fallbackHtml) {
    return (
      <div className={cn("katex-host", className)} dangerouslySetInnerHTML={{ __html: fallbackHtml }} />
    )
  }

  return null
}