import katex from "katex"

export type MathSegment =
  | { kind: "text"; value: string }
  | { kind: "inline"; value: string }
  | { kind: "display"; value: string }

// LaTeX renderings of entities that appear inside math delimiters.
const ENTITY_MAP: Record<string, string> = {
  theta: "\\theta", alpha: "\\alpha", beta: "\\beta", gamma: "\\gamma",
  delta: "\\delta", pi: "\\pi", mu: "\\mu", sigma: "\\sigma", lambda: "\\lambda",
  omega: "\\omega", phi: "\\phi", rho: "\\rho", tau: "\\tau", epsilon: "\\epsilon",
  zeta: "\\zeta", eta: "\\eta", iota: "\\iota", kappa: "\\kappa", nu: "\\nu",
  xi: "\\xi", omicron: "o", upsilon: "\\upsilon", chi: "\\chi", psi: "\\psi",
  deg: "^\\circ", times: "\\times", div: "\\div", pm: "\\pm", mp: "\\mp",
  le: "\\leq", leq: "\\leq", ge: "\\geq", geq: "\\geq", ne: "\\neq", neq: "\\neq",
  approx: "\\approx", infty: "\\infty",
  sum: "\\sum", prod: "\\prod", int: "\\int", sqrt: "\\sqrt", cdot: "\\cdot",
  ldots: "\\ldots", cdots: "\\cdots", dots: "\\dots", rightarrow: "\\rightarrow",
  leftarrow: "\\leftarrow", Rightarrow: "\\Rightarrow", Leftarrow: "\\Leftarrow",
  partial: "\\partial", nabla: "\\nabla", in: "\\in", notin: "\\notin",
  cup: "\\cup", cap: "\\cap", subset: "\\subset", supset: "\\supset",
  equiv: "\\equiv", sim: "\\sim", simeq: "\\simeq", propto: "\\propto",
  circ: "\\circ", bullet: "\\bullet", ast: "\\ast", star: "\\star",
  prime: "\\prime", ell: "\\ell", hbar: "\\hbar", angle: "\\angle",
  perp: "\\perp", parallel: "\\parallel", forall: "\\forall", exists: "\\exists",
  emptyset: "\\emptyset", varnothing: "\\varnothing", land: "\\land", lor: "\\lor",
  neg: "\\neg", oplus: "\\oplus", otimes: "\\otimes", sin: "\\sin", cos: "\\cos",
  tan: "\\tan", log: "\\log", ln: "\\ln", lim: "\\lim", exp: "\\exp",
  min: "\\min", max: "\\max", det: "\\det", dim: "\\dim", gcd: "\\gcd",
}

// Unicode renderings of entities that appear in plain prose (outside math).
const TEXT_ENTITY_MAP: Record<string, string> = {
  theta: "θ", alpha: "α", beta: "β", gamma: "γ", delta: "δ", epsilon: "ε",
  zeta: "ζ", eta: "η", iota: "ι", kappa: "κ", lambda: "λ", mu: "μ", nu: "ν",
  xi: "ξ", omicron: "ο", pi: "π", rho: "ρ", sigma: "σ", tau: "τ", upsilon: "υ",
  phi: "φ", chi: "χ", psi: "ψ", omega: "ω",
  deg: "°", times: "×", div: "÷", divide: "÷", pm: "±", plusmn: "±", mp: "∓",
  minus: "−", le: "≤", leq: "≤", ge: "≥", geq: "≥", ne: "≠", neq: "≠",
  approx: "≈", asymp: "≈", infty: "∞", infin: "∞", sum: "∑", prod: "∏",
  int: "∫", radic: "√", sqrt: "√", cdot: "·", middot: "·", sdot: "⋅",
  ldots: "…", hellip: "…", cdots: "⋯", dots: "…", rightarrow: "→", rarr: "→",
  leftarrow: "←", larr: "←", harr: "↔", cap: "∩", cup: "∪", sub: "⊂", sup: "⊃",
  perp: "⊥", parallel: "∥", angle: "∠", nabla: "∇", partial: "∂",
  forall: "∀", exist: "∃", empty: "∅", emptyset: "∅", isin: "∈",
  notin: "∉", and: "∧", or: "∨", not: "¬", oplus: "⊕", otimes: "⊗",
  prime: "′", Prime: "″", micro: "µ", mdash: "—", ndash: "–",
  ldquo: "\u201c", rdquo: "\u201d", lsquo: "\u2018", rsquo: "\u2019",
  laquo: "«", raquo: "»", bull: "•", star: "⋆", lowast: "∗",
  ensp: " ", emsp: " ", thinsp: " ",
}

const BASIC_ENTITIES: Record<string, string> = {
  nbsp: " ", amp: "&", lt: "<", gt: ">", quot: '"', apos: "'",
}

const NUMERIC_PATTERNS: [RegExp, (digits: string) => string][] = [
  [/&#(\d+);/g, (n) => String.fromCodePoint(Number(n))],
  [/&#x([0-9a-fA-F]+);/g, (n) => String.fromCodePoint(parseInt(n, 16))],
]

function decodeEntities(input: string, math: boolean): string {
  let out = input.replace(/&([a-zA-Z]+);/g, (whole, name: string) => {
    if (math) {
      const latex = ENTITY_MAP[name] ?? ENTITY_MAP[name.toLowerCase()]
      if (latex !== undefined) return latex
    }
    const unicode = TEXT_ENTITY_MAP[name] ?? TEXT_ENTITY_MAP[name.toLowerCase()]
    if (unicode !== undefined) return unicode
    const basic = BASIC_ENTITIES[name.toLowerCase()]
    return basic !== undefined ? basic : whole
  })
  for (const [pattern, convert] of NUMERIC_PATTERNS) {
    out = out.replace(pattern, (_, digits: string) => convert(digits))
  }
  return out
}

export function decodeMathEntities(input: string): string {
  return decodeEntities(input, true)
}

export function decodeTextEntities(input: string): string {
  return decodeEntities(input, false)
    .replace(/\\\$/g, "$")
    .replace(/\\%/g, "%")
    .replace(/ ?\\ /g, " ")
}

export function normalizeLatex(input: string): string {
  return input.trim().replace(/\\+$/, "").trim()
}

const cleanMath = (s: string) => normalizeLatex(decodeMathEntities(s))

const isMathIntentAt = (text: string, index: number) => {
  let i = index
  while (i < text.length && text[i] === " ") i++
  return i < text.length && /[$^_\\=<>+\-*]/.test(text[i])
}

// True when a backslash appears before the next '$' within a short window —
// evidence that a '$' before a number opens math, not currency.
const hasBackslashWindow = (text: string, from: number) => {
  const limit = Math.min(text.length, from + 120)
  for (let i = from; i < limit; i++) {
    if (text[i] === "$") return false
    if (text[i] === "\\") return true
  }
  return false
}

// Scans a short window after a '$'-number for math evidence: LaTeX sigils,
// comparison operators or juxtaposed digit-letter factors (3i, 20z). Stops at
// the next '$' so currency followed by another amount stays currency.
const hasMathWindow = (text: string, from: number) => {
  const limit = Math.min(text.length, from + 40)
  for (let i = from; i < limit; i++) {
    if (text[i] === "$") return false
    if (/[\\^_{}=<>]/.test(text[i])) return true
    if (/[0-9]/.test(text[i]) && /[a-zA-Z]/.test(text[i + 1] ?? "")) return true
  }
  return false
}

// A '$' followed by digits starts a currency amount unless the number is part
// of math: a decimal with 3+ places, a letter or math sigil right after the
// digits, or a LaTeX command within a short lookahead window.
const isCurrencyAt = (text: string, index: number) => {
  let j = index + 1
  while (j < text.length && text[j] === " ") j++
  if (j >= text.length || !/[0-9]/.test(text[j])) return false
  let k = j
  while (k < text.length && /[0-9]/.test(text[k])) k++
  if (text[k] === "!") {
    // "$9!" / "$2!" are factorials; "$30! Amazing" is a sentence exclamation.
    let e = k + 1
    while (e < text.length && text[e] === " ") e++
    const next = text[e] ?? ""
    return next !== "" && /[A-Z0-9]/.test(next)
  }
  if (text[k] === ",") {
    // Digit groups after a comma: 3-digit groups are thousands separators
    // (currency); anything else is a math list like "1,1,3.5".
    let p = k
    for (let g = 0; g < 4; g++) {
      let m = p + 1
      while (m < text.length && /[0-9]/.test(text[m])) m++
      const groupLen = m - (p + 1)
      if (groupLen === 0) return !hasMathWindow(text, p + 1)
      if (groupLen !== 3) return false
      p = m
      if (text[p] !== ",") break
    }
    if (/[a-zA-Z]/.test(text[p] ?? "")) return false
    if (isMathIntentAt(text, p)) return false
    return !hasMathWindow(text, p)
  }
  if (text[k] === ".") {
    let m = k + 1
    while (m < text.length && /[0-9]/.test(text[m])) m++
    const decimals = m - (k + 1)
    if (text[m] === "." && text[m + 1] === ".") return false
    if (decimals === 0) return !hasBackslashWindow(text, m)
    if (decimals <= 2) {
      if (/[a-zA-Z]/.test(text[m] ?? "")) return false
      if (isMathIntentAt(text, m)) return false
      return !hasBackslashWindow(text, m)
    }
    return false
  }
  if (/[a-zA-Z]/.test(text[k] ?? "")) return false
  if (isMathIntentAt(text, k)) return false
  return !hasMathWindow(text, k)
}

// Unbalanced '$'/'$$' recovery swallows the rest of the string, so the
// remainder must look like math; otherwise the delimiter stays literal text.
const hasLongWord = (s: string) => (s.match(/[A-Za-z]{5,}/g) ?? []).length > 0

const looksLikeMathRemainder = (s: string, maxLength: number) => {
  const t = s.trim()
  if (!t) return false
  if (/[\\^_{}]/.test(t)) return true
  if (t.length > maxLength) return false
  if (hasLongWord(t)) return false
  return /[0-9=+*()\/.,-]/.test(t)
}

// Balanced $ pairs sometimes wrap plain prose in the source data
// (e.g. "$at the end of the month$"); demote those to text.
const isProseWrapped = (s: string) => /[a-z]{3,}/i.test(s) && !/[\\^_{}=]/.test(s)

// Content that mixes prose sentences with equation fragments (long words,
// a '='/'+'/'*', letter-space-letter phrasing) demotes to text instead of
// being rendered as one ugly math blob.
// Environment names (\begin{array}) and \text{...} labels are legitimate
// words inside math, so they are removed before looking for prose.
const stripMathWords = (s: string) =>
  s
    .replace(/\\(?:begin|end|text|textbf|mathrm|operatorname|mathbf|mbox)\s*\{[^}]*\}/g, "")
    .replace(/\\[a-zA-Z]+/g, "")

const isMixedJunk = (s: string) =>
  !/\\begin\{/.test(s) &&
  /[=+*]/.test(s) &&
  /[a-z]\s+[a-z]/i.test(s) &&
  hasLongWord(stripMathWords(s))

const MATH_RUN_CHARS = /[0-9a-zA-Z+\-*/=<>^_.,)\]}|]/
const LEFT_RUN_CHARS = /[0-9+\-*/=<>^_.,()\[\]}|]/
const PEEK_OPERATORS = /[+\-*/=<>]/

// Consumes a {...}, (...) or [...] group starting at p, including nesting of
// the same delimiter. Returns the index after the group or text.length.
const consumeBalancedGroup = (text: string, p: number): number => {
  const open = text[p]
  const close = open === "{" ? "}" : open === "(" ? ")" : "]"
  let depth = 0
  for (let q = p; q < text.length; q++) {
    if (text[q] === open) depth++
    else if (text[q] === close && --depth === 0) return q + 1
  }
  return text.length
}

// Consumes a \command with optional _/^ arguments (e.g. \log_7, \sqrt{3}).
const consumeCommand = (text: string, p: number): number => {
  let q = p + 1
  while (q < text.length && /[a-zA-Z]/.test(text[q])) q++
  while (q < text.length && (text[q] === "_" || text[q] === "^")) {
    q++
    if (text[q] === "{") q = consumeBalancedGroup(text, q)
    else if (q < text.length && text[q] !== " ") q++
  }
  return q
}

// Decides whether a bare-latex run may continue past spaces up to index q.
const isMathyPeek = (text: string, q: number): boolean => {
  const c = text[q]
  if (/[0-9\\{(]/.test(c)) return true
  if (/[a-zA-Z]/.test(c)) {
    const next = text[q + 1] ?? ""
    if (next === "_" || next === "^") return true
    return next === "" || next === " " || /[.,;:!?)\]}]/.test(next)
  }
  if (PEEK_OPERATORS.test(c)) {
    let r = q + 1
    while (r < text.length && text[r] === " ") r++
    return /[0-9\\{(a-zA-Z]/.test(text[r] ?? "")
  }
  return false
}

// Extends a bare-latex run rightwards from a command at p.
const extendRunRight = (text: string, p: number): number => {
  while (p < text.length) {
    const c = text[p]
    if (c === "\\") p = consumeCommand(text, p)
    else if (c === "{" || c === "(" || c === "[") p = consumeBalancedGroup(text, p)
    else if (c === " ") {
      let q = p
      while (q < text.length && text[q] === " ") q++
      if (q >= text.length || !isMathyPeek(text, q)) break
      p = q
    } else if (MATH_RUN_CHARS.test(c)) p++
    else break
  }
  return p
}

// Extends a bare-latex run leftwards to include digits, operators and
// subscripted letters (u_1) or juxtaposed factors (2a) before the command.
const extendRunLeft = (text: string, p: number): number => {
  let q = p - 1
  while (q >= 0) {
    const c = text[q]
    if (/[a-zA-Z]/.test(c)) {
      const next = text[q + 1] ?? ""
      const prev = text[q - 1] ?? ""
      if (next === "_" || next === "^") { q--; continue }
      if (next === "\\" && (q === 0 || /[0-9]/.test(prev))) { q--; continue }
      if (/[()[\]]/.test(next) && (q === 0 || LEFT_RUN_CHARS.test(prev))) { q--; continue }
      break
    }
    if (c === " " || LEFT_RUN_CHARS.test(c)) { q--; continue }
    break
  }
  return q + 1
}

// Splits a text chunk into prose and bare-latex runs that appear without
// dollar delimiters (e.g. "the sum is 6 + \log_7 2").
const splitBareLatex = (text: string): MathSegment[] => {
  const segments: MathSegment[] = []
  let start = 0
  let i = 0
  while (i < text.length) {
    if (text[i] !== "\\") { i++; continue }
    let runStart = Math.max(extendRunLeft(text, i), start)
    while (runStart < i && (text[runStart] === " " || ".,;:".includes(text[runStart]))) runStart++
    const runEnd = extendRunRight(text, i)
    if (runEnd <= i + 1) { i++; continue }
    if (runStart > start) segments.push({ kind: "text", value: text.slice(start, runStart) })
    segments.push({ kind: "inline", value: cleanMath(text.slice(runStart, runEnd)) })
    start = runEnd
    i = runEnd
  }
  if (start < text.length) segments.push({ kind: "text", value: text.slice(start) })
  return segments
}

export function parseMathSegments(text: string): MathSegment[] {
  if (!text || !text.trim()) return []
  const segments: MathSegment[] = []
  const n = text.length
  let textStart = 0
  let i = 0

  const flushText = (end: number) => {
    if (end > textStart) {
      const chunk = text.slice(textStart, end)
      for (const segment of splitBareLatex(chunk)) {
        if (segment.kind === "text") {
          segments.push({ kind: "text", value: decodeTextEntities(segment.value) })
        } else {
          segments.push(segment)
        }
      }
    }
  }

  while (i < n) {
    if (text[i] !== "$" || text[i - 1] === "\\") { i++; continue } // \$ never opens math

    if (text[i + 1] === "$") {
      const close = text.indexOf("$$", i + 2)
      flushText(i)
      if (close === -1) {
        const remainder = text.slice(i + 2)
        if (!remainder.includes("$") && looksLikeMathRemainder(remainder, 40)) {
          segments.push({ kind: "display", value: cleanMath(remainder) })
          i = n
          textStart = i
        } else {
          textStart = i + 2
          i += 2
        }
      } else {
        const content = text.slice(i + 2, close)
        if (/(^|[^\\])\$/.test(content)) {
          segments.push(...parseMathSegments(content))
        } else if (isProseWrapped(content) || isMixedJunk(content)) {
          segments.push({ kind: "text", value: decodeTextEntities(content).replace(/\$/g, "") })
        } else {
          segments.push({ kind: "display", value: cleanMath(content) })
        }
        i = close + 2
        textStart = i
      }
      continue
    }

    // "$2, 3, 5$" / "$1.618$": a purely numeric run closed by '$' and not
    // followed by another amount is math, not a currency sign.
    const numeric = /^(\d[\d.,\s+\-=]*?)\$(?![\d.])/.exec(text.slice(i + 1))
    if (numeric && /[^\d.]/.test(numeric[1].trim()) === /,/.test(numeric[1]) && !/\$\s*\d/.test(text.slice(i + 1 + numeric[0].length, i + 3 + numeric[0].length))) {
      flushText(i)
      segments.push({ kind: "inline", value: cleanMath(numeric[1].trim()) })
      i += 1 + numeric[0].length
      textStart = i
      continue
    }

    if (isCurrencyAt(text, i)) {
      // A currency '$' glued to the previous token (e.g. "b$ 8",
      // "f(x)$ 0") is source-data noise; drop it.
      if (/[a-zA-Z0-9)\]]/.test(text[i - 1] ?? "")) {
        flushText(i)
        textStart = i + 1
      }
      i++
      continue
    }

    let close = -1
    for (let k = i + 1; k < n; k++) {
      if (text[k] !== "$" || text[k - 1] === "\\") continue
      if (isCurrencyAt(text, k)) {
        // A currency amount right after the opener is usually far-close
        // data noise ("$y$ 180 ..."), unless the content so far already
        // looks like real math ("$k = 0, m = 1$ 2.").
        if (/[\\^_{}=<>+\-*]/.test(text.slice(i + 1, k))) close = k
        break
      }
      close = k
      break
    }
    flushText(i)
    if (close === -1) {
      const remainder = text.slice(i + 1)
      const factorial = !remainder.includes("$")
        ? remainder.match(/^(\d+(?:\.\d+)?!)([\s\S]*)$/)
        : null
      if (factorial) {
        const rest = factorial[2] ?? ""
        if (/[a-zA-Z]/.test(rest) || !rest.trim()) {
          segments.push({ kind: "inline", value: factorial[1] })
          if (rest) segments.push({ kind: "text", value: decodeTextEntities(rest) })
        } else {
          segments.push({ kind: "inline", value: cleanMath(remainder.replace(/[\s.,;:!?]+$/, "")) })
        }
        i = n
        textStart = i
      } else if (!remainder.includes("$") && looksLikeMathRemainder(remainder, 120)) {
        segments.push({ kind: "inline", value: cleanMath(remainder.replace(/[\s.,;:!?]+$/, "")) })
        i = n
        textStart = i
      } else {
        textStart = i + 1
        i += 1
      }
    } else {
      const content = text.slice(i + 1, close)
      if (isMixedJunk(content) && /^\s*\d/.test(text.slice(close + 1))) {
        // The closer '$' actually opens the math that follows; this
        // opener was stray (e.g. "$21.5... - 2.6... = 18.8...cm^3 Volume
        // of the diamond: $16 + 18.8..."). Drop the opener and let the
        // next '$' start the real math.
        textStart = i + 1
        i += 1
      } else if (isProseWrapped(content) || isMixedJunk(content)) {
        segments.push({ kind: "text", value: decodeTextEntities(content).replace(/\$/g, "") })
        i = close + 1
        textStart = i
      } else {
        segments.push({ kind: "inline", value: cleanMath(content) })
        i = close + 1
        textStart = i
      }
    }
  }
  flushText(n)
  const merged: MathSegment[] = []
  for (const segment of segments) {
    const last = merged[merged.length - 1]
    if (segment.kind === "text" && last?.kind === "text") {
      last.value += segment.value
    } else {
      merged.push(segment)
    }
  }
  return merged
}

export function renderMathToHtml(value: string, displayMode: boolean): string {
  return katex.renderToString(value, {
    displayMode,
    throwOnError: false,
    strict: false,
    output: "html",
  })
}