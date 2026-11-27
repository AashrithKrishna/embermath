// Deterministic LaTeX / content checks shared by validate-bank.mjs and repair-latex.mjs.
// Delimiter grammar matches the frontend (src/lib/math.ts): only $...$ and $$...$$
// open math, and an escaped \$ never does.
import katex from "katex";
import { detectMissingFigure } from "../../scraper/figureHeuristic.mjs";
import { figureSatisfiedInline } from "../../scraper/edunadeHtml.mjs";

export const LEVEL = {
  UNBALANCED_DOLLAR: "ERROR",
  LEGACY_DELIMITER: "ERROR",
  UNBALANCED_BRACES: "ERROR",
  UNMATCHED_ENV: "ERROR",
  KATEX_PARSE: "ERROR",
  BARE_LATEX: "ERROR",
  HTML_ENTITY: "ERROR",
  HTML_TAG: "ERROR",
  EMPTY_STATEMENT: "ERROR",
  EMPTY_MARKSCHEME: "ERROR",
  FIGURE_UNFLAGGED: "ERROR",
  FIGURE_MISSING: "WARN",
};

/**
 * Split text into {kind: "text"|"inline"|"display", value, start} segments.
 * Returns {segments, unclosed} where unclosed is the index of an opener with
 * no matching closer (or -1).
 */
export function splitMath(text) {
  const s = String(text ?? "");
  const segments = [];
  let i = 0;
  let textStart = 0;
  const pushText = (end) => {
    if (end > textStart) segments.push({ kind: "text", value: s.slice(textStart, end), start: textStart });
  };
  while (i < s.length) {
    const c = s[i];
    if (c === "\\") {
      i += 2; // skip any escaped char, including \$ and \\
      continue;
    }
    if (c !== "$") {
      i++;
      continue;
    }
    const display = s[i + 1] === "$";
    const open = display ? 2 : 1;
    let j = i + open;
    let close = -1;
    while (j < s.length) {
      if (s[j] === "\\") {
        j += 2;
        continue;
      }
      if (s[j] === "$") {
        // Inline closes at the next $; display needs $$ (a lone $ inside
        // display math is malformed and reported as unclosed).
        if (!display || s[j + 1] === "$") close = j;
        break;
      }
      j++;
    }
    if (close === -1) {
      pushText(i);
      return { segments, unclosed: i };
    }
    pushText(i);
    segments.push({ kind: display ? "display" : "inline", value: s.slice(i + open, close), start: i + open });
    i = close + open;
    textStart = i;
  }
  pushText(s.length);
  return { segments, unclosed: -1 };
}

export function braceBalance(math) {
  let depth = 0;
  for (let i = 0; i < math.length; i++) {
    if (math[i] === "\\") {
      i++;
      continue;
    }
    if (math[i] === "{") depth++;
    else if (math[i] === "}") {
      depth--;
      if (depth < 0) return -1;
    }
  }
  return depth;
}

export function envMismatch(math) {
  const stack = [];
  for (const m of math.matchAll(/\\(begin|end)\{([^}]*)\}/g)) {
    if (m[1] === "begin") stack.push(m[2]);
    else if (stack.pop() !== m[2]) return m[2];
  }
  return stack.length ? stack[stack.length - 1] : null;
}

export function katexError(math, displayMode) {
  try {
    katex.renderToString(math, { throwOnError: true, displayMode, strict: "ignore" });
    return null;
  } catch (e) {
    return String(e.message || e).replace(/^KaTeX parse error: /, "").slice(0, 160);
  }
}

const ENTITY = /&(#\d+|#x[0-9a-fA-F]+|[a-zA-Z]{2,8});/;
const TAG = /<\/?(p|br|span|div|table|thead|tbody|tr|td|th|img|strong|em|b|i|sup|sub|ul|ol|li|h[1-6])\b[^>]*>/i;
// A LaTeX command sitting in prose. \$ \% \  are text escapes the UI decodes.
const BARE = /\\[a-zA-Z]+/;

/** Check one text field. Returns [{code, detail}] (level via LEVEL[code]). */
export function lintText(text) {
  const issues = [];
  const s = String(text ?? "");
  if (!s) return issues;
  const add = (code, detail) => issues.push({ code, detail });
  const { segments, unclosed } = splitMath(s);
  if (unclosed !== -1) add("UNBALANCED_DOLLAR", `unclosed ${s[unclosed + 1] === "$" ? "$$" : "$"} at ${unclosed}: ${s.slice(unclosed, unclosed + 50)}`);
  for (const seg of segments) {
    if (seg.kind === "text") {
      const legacy = seg.value.match(/\\[()[\]]/);
      if (legacy) add("LEGACY_DELIMITER", `${legacy[0]} in prose: ${ctx(seg.value, legacy.index)}`);
      const bare = seg.value.match(BARE);
      if (bare) add("BARE_LATEX", `${bare[0]} outside math: ${ctx(seg.value, bare.index)}`);
      const ent = seg.value.match(ENTITY);
      if (ent) add("HTML_ENTITY", `${ent[0]}: ${ctx(seg.value, ent.index)}`);
      const tag = seg.value.match(TAG);
      if (tag) add("HTML_TAG", `${tag[0]}: ${ctx(seg.value, tag.index)}`);
      continue;
    }
    const math = seg.value;
    const display = seg.kind === "display";
    const ent = math.match(ENTITY);
    if (ent) add("HTML_ENTITY", `${ent[0]} in math: ${ctx(math, ent.index)}`);
    const tag = math.match(TAG);
    if (tag) add("HTML_TAG", `${tag[0]} in math: ${ctx(math, tag.index)}`);
    const bal = braceBalance(math);
    if (bal !== 0) add("UNBALANCED_BRACES", `${bal < 0 ? "extra }" : `${bal} unclosed {`}: ${math.slice(0, 60)}`);
    const env = envMismatch(math);
    if (env) add("UNMATCHED_ENV", `\\begin{${env}}/\\end{${env}} mismatch: ${math.slice(0, 60)}`);
    if (!math.trim()) continue;
    const err = katexError(math, display);
    if (err && bal === 0 && !env) add("KATEX_PARSE", `${err} :: ${math.slice(0, 80)}`);
  }
  return issues;
}

const ctx = (s, i) => s.slice(Math.max(0, i - 25), i + 35).replace(/\s+/g, " ");

/**
 * Lint one normalised record {statement, markscheme, tips, images[], diagramMissing}.
 * Returns [{code, level, field, detail}].
 */
export function lintRecord(rec) {
  const out = [];
  const push = (field, code, detail) => out.push({ code, level: LEVEL[code], field, detail });
  if (!String(rec.statement ?? "").trim()) push("statement", "EMPTY_STATEMENT", "");
  if (!String(rec.markscheme ?? "").trim()) push("markscheme", "EMPTY_MARKSCHEME", "");
  for (const field of ["statement", "markscheme", "tips"]) {
    for (const i of lintText(rec[field])) push(field, i.code, i.detail);
  }
  const hasImages = Array.isArray(rec.images) && rec.images.length > 0;
  // "Voronoi diagram" names a topic (sites given as coordinates), not a picture.
  const figureText = String(rec.statement ?? "").replace(/Voronoi diagram/gi, "Voronoi partition");
  if (
    detectMissingFigure(figureText) &&
    !hasImages &&
    !figureSatisfiedInline(figureText, detectMissingFigure)
  ) {
    if (rec.diagramMissing) push("statement", "FIGURE_MISSING", "references a figure; diagram_missing=1");
    else push("statement", "FIGURE_UNFLAGGED", "references a figure, no images, diagram_missing not set");
  }
  return out;
}
