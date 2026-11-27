import { Fragment, memo, useMemo, useState } from "react"
import { ImageOff } from "lucide-react"
import { parseMathSegments } from "@/lib/math"
import { normalizeDelimiters, renderLatexSafe, rescueBareLatex, tokenizeProse } from "@/lib/latex"
import { cn } from "@/lib/utils"

interface MathRendererProps {
  text: string | null | undefined
  /** Render IB mark annotations ([M1], [A1] …) as tags. */
  marks?: boolean
  /** Split "a)", "b)" sub-parts onto their own lines. */
  parts?: boolean
  /** One-line preview: span root, display math rendered inline, no part breaks. */
  preview?: boolean
  className?: string
}

function MathHtml({ tex, display }: { tex: string; display: boolean }) {
  const html = renderLatexSafe(tex, display)
  if (html === null) {
    return display ? (
      <span className="math-fallback my-2 block overflow-x-auto">{tex}</span>
    ) : (
      <span className="math-fallback">{tex}</span>
    )
  }
  return display ? (
    <span className="block" dangerouslySetInnerHTML={{ __html: html }} />
  ) : (
    <span dangerouslySetInnerHTML={{ __html: html }} />
  )
}

/**
 * Renders mixed prose + LaTeX. Handles $..$, $$..$$, \(..\), \[..\] and bare
 * LaTeX runs (via parseMathSegments). KaTeX errors never reach the screen:
 * broken fragments are repaired, or shown as quiet monospace source.
 */
export const MathRenderer = memo(function MathRenderer({
  text,
  marks = false,
  parts: partsProp = true,
  preview = false,
  className,
}: MathRendererProps) {
  const parts = partsProp && !preview
  const Root = preview ? "span" : "div"
  const segments = useMemo(() => parseMathSegments(normalizeDelimiters(text ?? "")), [text])
  return (
    <Root className={cn("math-prose", className)}>
      {segments.map((segment, i) => {
        if (segment.kind === "inline") return <MathHtml key={i} tex={segment.value} display={false} />
        if (segment.kind === "display") return <MathHtml key={i} tex={segment.value} display={!preview} />
        const tokens = tokenizeProse(segment.value, marks)

        return (
          <Fragment key={i}>
            {tokens.map((token, j) => {
              if (token.kind === "text")
                return (
                  <Fragment key={j}>
                    {rescueBareLatex(token.value).map((r, k) =>
                      r.kind === "math" ? <MathHtml key={k} tex={r.value} display={false} /> : <Fragment key={k}>{r.value}</Fragment>,
                    )}
                  </Fragment>
                )
              if (token.kind === "mark")
                return (
                  <span key={j} className="mark-tag" data-kind={token.type}>
                    {token.label}
                  </span>
                )
              if (!parts) return <Fragment key={j}>({token.label}) </Fragment>
              return (
                <Fragment key={j}>
                  <span className="math-part" aria-hidden="true" />
                  <span className="math-part-label">({token.label})</span>
                </Fragment>
              )
            })}
          </Fragment>
        )
      })}
    </Root>
  )
})

/** Plain inline LaTeX (no prose parsing) — for formula booklet entries. */
export function Tex({ tex, display = false, className }: { tex: string; display?: boolean; className?: string }) {
  return (
    <span className={cn(display && "block overflow-x-auto", className)}>
      <MathHtml tex={tex} display={display} />
    </span>
  )
}

interface FigureProps {
  src: string
  alt: string
}

function Figure({ src, alt }: FigureProps) {
  const [failed, setFailed] = useState(false)
  const [loaded, setLoaded] = useState(false)
  if (failed) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-dashed border-line px-3 py-4 text-xs text-ink-faint">
        <ImageOff className="size-4" aria-hidden="true" />
        Figure could not be loaded from its source.
      </div>
    )
  }
  return (
    <figure className="figure-well relative">
      {loaded ? null : <div className="skeleton h-48 w-full !bg-[linear-gradient(90deg,#e7e5ef_0%,#f6f5fa_50%,#e7e5ef_100%)] [background-size:200%_100%]" aria-label="Loading figure" />}
      <img
        src={src}
        alt={alt}
        referrerPolicy="no-referrer"
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
        className={loaded ? undefined : "absolute h-0 w-0 opacity-0"}
      />
    </figure>
  )
}

/** Light-well framed figures so black-ink diagrams stay legible on obsidian. */
export function FigureList({ images, label }: { images: string[]; label: string }) {
  if (images.length === 0) return null
  return (
    <div className={cn("mt-4 grid gap-3", images.length > 1 && "sm:grid-cols-2")}>
      {images.map((src, i) => (
        <Figure key={src + i} src={src} alt={`${label} figure ${i + 1}`} />
      ))}
    </div>
  )
}
