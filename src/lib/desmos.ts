// Heuristics for turning question text into Desmos expressions.
//
// Questions are prose with embedded LaTeX ($...$ / $$...$$), so we look for
// the first "y = ..." or "f(x) = ..." (or general "g(t) = ...") fragment and
// tidy it into something Desmos can plot. This is intentionally simple: the
// expression is a starting point for the student, not a parser.

const SPACING_COMMANDS = /\\(?:quad|qquad|,|;|!|~| )/g
const SENTENCE_BREAK = /[.!?]\s+[A-Z].*$/
const PROSE_TAIL = /\s+(?:such that|given that|and|where|for|with|when)\s+[a-z].*$/i
const TRAILING_PUNCTUATION = /[.,;:!?]+\s*$/
const TRAILING_OPERATORS = /[+\-*/=<>^]+\s*$/
const TRAILING_BACKSLASHES = /\\+\s*$/

const Y_PATTERN = /(?<![a-zA-Z])y\s*=\s*([^;$\n]+)/g
const FX_PATTERN = /f\s*\(\s*x\s*\)\s*=\s*([^;$\n]+)/gi
const FUNCTION_PATTERN = /(?<![a-zA-Z])([a-z])\s*\(\s*([a-z])\s*\)\s*=\s*([^;$\n]+)/gi

function tidyRightHandSide(raw: string): string | null {
  const cleaned = raw
    .replace(/\\left|\\right/g, "")
    .replace(SPACING_COMMANDS, " ")
    .replace(/\s+/g, " ")
    .trim()

  const withoutProse = cleaned.replace(SENTENCE_BREAK, "").replace(PROSE_TAIL, "")
  const trimmed = withoutProse
    .replace(TRAILING_PUNCTUATION, "")
    .replace(TRAILING_OPERATORS, "")
    .replace(TRAILING_BACKSLASHES, "")
    .trim()

  if (!trimmed || !/[0-9a-zA-Z]/.test(trimmed)) return null
  return trimmed
}

/**
 * Scans question text for a graphable equation and returns it in Desmos
 * LaTeX form (e.g. "y=2x + 3" or "f(x)=x^2 - 4"), or null when none is found.
 */
export function extractGraphableExpression(text: string): string | null {
  if (!text) return null

  for (const match of text.matchAll(Y_PATTERN)) {
    const rhs = tidyRightHandSide(match[1] ?? "")
    if (rhs) return `y=${rhs}`
  }

  for (const match of text.matchAll(FX_PATTERN)) {
    const rhs = tidyRightHandSide(match[1] ?? "")
    if (rhs) return `f(x)=${rhs}`
  }

  for (const match of text.matchAll(FUNCTION_PATTERN)) {
    const name = match[1] ?? ""
    const argument = match[2] ?? ""
    const rhs = tidyRightHandSide(match[3] ?? "")
    if (rhs) return `${name}(${argument})=${rhs}`
  }

  return null
}
