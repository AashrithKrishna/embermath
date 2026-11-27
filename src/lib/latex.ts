import katex from "katex"

/**
 * Converts `\(..\)` and `\[..\]` delimiters into the `$..$` / `$$..$$` form
 * understood by parseMathSegments. Escaped dollars are left alone.
 */
export function normalizeDelimiters(text: string): string {
  if (!text) return ""
  const converted = text
    .replace(/\\\[([\s\S]+?)\\\]/g, (_m, body: string) => `$$${body}$$`)
    .replace(/\\\(([\s\S]+?)\\\)/g, (_m, body: string) => `$${body}$`)
  return wrapBareEnvironments(converted)
}

/**
 * Wraps \begin{env}…\end{env} blocks that sit outside any $-delimited math
 * in $$…$$ so they render as display math instead of being split apart.
 */
export function wrapBareEnvironments(text: string): string {
  if (!text.includes("\\begin{")) return text
  let out = ""
  let i = 0
  let inMath: "" | "$" | "$$" = ""
  while (i < text.length) {
    if (text[i] === "\\" && text[i + 1] === "$") {
      out += text.slice(i, i + 2)
      i += 2
      continue
    }
    if (text[i] === "$") {
      const tok = text[i + 1] === "$" ? "$$" : "$"
      if (!inMath) inMath = tok
      else if (inMath === tok) inMath = ""
      out += tok
      i += tok.length
      continue
    }
    if (!inMath && text.startsWith("\\begin{", i)) {
      const env = /^\\begin\{([a-zA-Z*]+)\}/.exec(text.slice(i))
      if (env) {
        const endTag = `\\end{${env[1]}}`
        const close = text.indexOf(endTag, i)
        if (close > 0) {
          out += `$$${text.slice(i, close + endTag.length)}$$`
          i = close + endTag.length
          continue
        }
      }
    }
    out += text[i]
    i += 1
  }
  return out
}

/** Counts unescaped `{` minus `}`. */
function braceBalance(tex: string): number {
  let depth = 0
  for (let i = 0; i < tex.length; i += 1) {
    const ch = tex[i]
    if (ch === "\\") {
      i += 1
      continue
    }
    if (ch === "{") depth += 1
    else if (ch === "}") depth -= 1
  }
  return depth
}

/**
 * Deterministic best-effort repair of a broken LaTeX fragment:
 * balances braces, pairs \left/\right, and closes open environments.
 */
export function repairLatex(input: string): string {
  let tex = input.trim()

  // Strip stray delimiters that leaked into a math body.
  tex = tex.replace(/^\$+|\$+$/g, "")

  // Remove surplus closing braces from the end, then add missing ones.
  let balance = braceBalance(tex)
  while (balance < 0 && tex.endsWith("}")) {
    tex = tex.slice(0, -1)
    balance += 1
  }
  if (balance < 0) {
    // surplus closers in the middle: drop unmatched ones left-to-right
    let depth = 0
    let out = ""
    for (let i = 0; i < tex.length; i += 1) {
      const ch = tex[i]
      if (ch === "\\" && i + 1 < tex.length) {
        out += ch + tex[i + 1]
        i += 1
        continue
      }
      if (ch === "{") depth += 1
      if (ch === "}") {
        if (depth === 0) continue
        depth -= 1
      }
      out += ch
    }
    tex = out
    balance = braceBalance(tex)
  }
  if (balance > 0) tex += "}".repeat(balance)

  // Pair \left / \right.
  const lefts = (tex.match(/\\left(?![a-zA-Z])/g) ?? []).length
  const rights = (tex.match(/\\right(?![a-zA-Z])/g) ?? []).length
  if (lefts !== rights) {
    tex = tex.replace(/\\left(?![a-zA-Z])\s*/g, "").replace(/\\right(?![a-zA-Z])\s*/g, "")
  }

  // Close environments that were opened but never ended.
  const opened = [...tex.matchAll(/\\begin\{([a-zA-Z*]+)\}/g)].map((m) => m[1])
  const closed = [...tex.matchAll(/\\end\{([a-zA-Z*]+)\}/g)].map((m) => m[1])
  for (const env of closed) {
    const idx = opened.indexOf(env)
    if (idx >= 0) opened.splice(idx, 1)
  }
  for (const env of opened.reverse()) tex += `\\end{${env}}`

  return tex
}

const cache = new Map<string, string | null>()

/**
 * Renders LaTeX to HTML, never showing a red KaTeX error: tries the source,
 * then the repaired source, and finally returns null so the caller can fall
 * back to a quiet monospace rendering of the original text.
 */
export function renderLatexSafe(tex: string, display: boolean): string | null {
  const key = `${display ? "D" : "I"}${tex}`
  const hit = cache.get(key)
  if (hit !== undefined) return hit
  const attempt = (source: string) =>
    katex.renderToString(source, {
      displayMode: display,
      throwOnError: true,
      strict: "ignore",
      output: "html",
      trust: false,
    })
  let html: string | null = null
  try {
    html = attempt(tex)
  } catch {
    try {
      html = attempt(repairLatex(tex))
    } catch {
      html = null
    }
  }
  if (cache.size > 4000) cache.clear()
  cache.set(key, html)
  return html
}

export type ProseToken =
  | { kind: "text"; value: string }
  | { kind: "part"; label: string }
  | { kind: "mark"; label: string; type: "M" | "A" | "R" | "AG" | "N" }

const PART_RE = /(^|\s)(\(?([a-h]|i{1,3}|iv|v|vi{0,3})\))\s+/g
const MARK_RE = /[[(]((?:M|A|R|N)\d|AG)[\])]/g

/**
 * Splits a prose run into text, sub-part labels ("a)", "(ii)") and IB mark
 * annotations ("[M1]", "(A1)", "[AG]").
 */
export function tokenizeProse(text: string, withMarks: boolean): ProseToken[] {
  const tokens: ProseToken[] = []
  const pushText = (value: string) => {
    if (!value) return
    if (!withMarks) {
      tokens.push({ kind: "text", value })
      return
    }
    let last = 0
    for (const m of value.matchAll(MARK_RE)) {
      const idx = m.index ?? 0
      if (idx > last) tokens.push({ kind: "text", value: value.slice(last, idx) })
      const label = m[1]
      const type = (label === "AG" ? "AG" : label[0]) as "M" | "A" | "R" | "N" | "AG"
      tokens.push({ kind: "mark", label, type })
      last = idx + m[0].length
    }
    if (last < value.length) tokens.push({ kind: "text", value: value.slice(last) })
  }

  let last = 0
  for (const m of text.matchAll(PART_RE)) {
    const idx = (m.index ?? 0) + m[1].length
    // Only treat as a part label when it begins the string or follows
    // sentence-ending punctuation / a math run boundary.
    const before = text.slice(0, idx).trimEnd()
    const ok = before === "" || /[.?!:)\]]$/.test(before) || /\d$/.test(before)
    if (!ok) continue
    pushText(text.slice(last, idx))
    tokens.push({ kind: "part", label: m[3] })
    last = idx + m[2].length
    // skip following whitespace
    while (last < text.length && /\s/.test(text[last])) last += 1
  }
  pushText(text.slice(last))
  return tokens
}

const BARE_CMD = /\\(?:text|mathrm|binom|d?frac|sqrt|int|iint|sum|prod|lim|times|cdot|div|pm|left|right|pi|theta|alpha|beta|gamma|delta|lambda|mu|sigma|omega|phi|infty|ln|log|sin|cos|tan|leq?|geq?|neq|approx|vec|overrightarrow|begin|mathbf|hat|bar|partial|to|Rightarrow)(?![a-zA-Z])/

export type RescueToken = { kind: "text"; value: string } | { kind: "math"; value: string }

/**
 * Last line of defense for LaTeX that reached prose without delimiters:
 * finds the run that contains a LaTeX command (back to the start of its
 * clause, forward to the end of its sentence) and returns it as math when it
 * renders cleanly. Prose that does not contain a command is untouched.
 */
export function rescueBareLatex(text: string): RescueToken[] {
  const m = BARE_CMD.exec(text)
  if (!m) return [{ kind: "text", value: text }]
  // Start: after the last clause boundary before the command.
  const before = text.slice(0, m.index)
  const boundary = Math.max(before.lastIndexOf(": "), before.lastIndexOf(". "), before.lastIndexOf(", "))
  let start = boundary >= 0 ? boundary + 2 : 0
  // Pull prose words (3+ letters with a following space, not part of math) out of the run.
  const lead = /^((?:[A-Za-z]{2,}[\s,]+)+)/.exec(text.slice(start, m.index))
  if (lead) start += lead[1].length
  // End: sentence end followed by a capital letter, else end of text.
  const after = text.slice(m.index)
  const stop = /\.\s+(?=[A-Z])|\s+(?=(?:and|so|then|which|where|hence|therefore)\s)/.exec(after)
  const end = stop ? m.index + stop.index : text.length
  let run = text.slice(start, end).trim()
  const trail = /[.,;:]$/.exec(run)
  if (trail) run = run.slice(0, -1)
  if (!run || renderLatexSafe(run, false) === null) return [{ kind: "text", value: text }]
  const runStart = text.indexOf(run, start)
  const head = text.slice(0, runStart)
  const tail = text.slice(runStart + run.length)
  return [
    ...(head ? [{ kind: "text" as const, value: head }] : []),
    { kind: "math" as const, value: run },
    ...rescueBareLatex(tail).filter((t) => t.value),
  ]
}
