// Reconstructs readable text and LaTeX from per-character PDF geometry
// (produced by scraper/pdfextract.py). Word-generated question PDFs encode
// math as Times/Symbol runs with script-sized chars for super/subscripts and
// vertically stacked digits for fractions; this module reassembles them.

const PUA_OPERATORS = {
  "\uf03d": "=",
  "\uf02d": "-",
  "\uf02b": "+",
  "\uf03c": "<",
  "\uf03e": ">",
  "\uf0a2": "'",
  "\uf0b3": "\\geq",
  "\uf0a3": "\\leq",
  "\uf0b9": "\\neq",
  "\uf0b4": "\\times",
  "\uf0b8": "\\div",
  "\uf0b1": "\\pm",
  "\uf0a5": "\\infty",
  "\uf0ae": "\\rightarrow",
  "\uf0de": "\\Rightarrow",
  "\uf0db": "\\Leftrightarrow",
  "\uf0d6": "\\sqrt",
};

const UNICODE_MATH = {
  "\u2265": "\\geq",
  "\u2264": "\\leq",
  "\u00d7": "\\times",
  "\u00f7": "\\div",
  "\u21d2": "\\Rightarrow",
  "\u21d4": "\\Leftrightarrow",
  "\u222b": "\\int",
  "\u03c0": "\\pi",
  "\u00b0": "\\degree",
  "\u2013": "-",
};

const PUA_GREEK = {
  "\uf061": "\\alpha",
  "\uf062": "\\beta",
  "\uf071": "\\theta",
  "\uf067": "\\gamma",
  "\uf070": "\\pi",
  "\uf06d": "\\mu",
  "\uf044": "\\Delta",
};

export function mapSymbol(text) {
  if (text in PUA_OPERATORS) return PUA_OPERATORS[text];
  if (text in PUA_GREEK) return PUA_GREEK[text];
  if (text in UNICODE_MATH) return UNICODE_MATH[text];
  return text;
}

export function classifyFont(fontname) {
  if (/Arial/i.test(fontname)) return "body";
  if (/Times/i.test(fontname)) return "math";
  if (/Symbol/.test(fontname)) return "symbol";
  return "other";
}

// Chars whose vertical spans overlap by at least this fraction of the larger
// size belong to the same visual line. High enough to keep separate text lines
// apart, low enough to keep stacked fraction digits with their base line.
export const LINE_OVERLAP_RATIO = 0.18;

// Chars below this fraction of the line's largest size are scripts.
export const SCRIPT_SIZE_RATIO = 0.75;

const verticalOverlap = (a, b) =>
  Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);

const sameLine = (a, b) => {
  const ov = verticalOverlap(a, b);
  if (ov <= 0) return false;
  return ov / Math.max(a.size, b.size) >= LINE_OVERLAP_RATIO;
};

export function buildLines(chars) {
  const n = chars.length;
  const parent = Array.from({ length: n }, (_, i) => i);
  const find = (x) => {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]];
      x = parent[x];
    }
    return x;
  };
  const union = (a, b) => {
    parent[find(a)] = find(b);
  };
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (sameLine(chars[i], chars[j])) union(i, j);
    }
  }
  const groups = new Map();
  for (let i = 0; i < n; i++) {
    const root = find(i);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root).push(chars[i]);
  }
  return [...groups.values()]
    .map((cs) => ({ chars: cs.sort((a, b) => a.x0 - b.x0) }))
    .sort((a, b) => a.chars[0].top - b.chars[0].top);
}

// Spaces in LaTeX math mode are ignored, so only letter-to-letter gaps need
// insertion (implicit products like "sin t" merge otherwise). Body text runs
// carry real space glyphs and keep the conservative threshold.
export function insertSpaces(chars, threshold = 0.25) {
  const out = [];
  for (let i = 0; i < chars.length; i++) {
    const c = chars[i];
    out.push(c);
    const next = chars[i + 1];
    if (!next || c.text === " " || next.text === " ") continue;
    if (!isLetter(c.text) || !isLetter(next.text)) continue;
    if (next.x0 - c.x1 > threshold * c.size) {
      out.push({
        text: " ",
        x0: c.x1,
        x1: next.x0,
        top: c.top,
        bottom: c.bottom,
        size: c.size,
        fontname: c.fontname,
      });
    }
  }
  return out;
}

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

// A script char sits at least 30% of the dominant size above (or below) baseline.
const RAISED_RATIO = 0.3;

// Word-generated PDFs mix a dominant full-size with script sizes, but some
// lines are set entirely at the smaller size. The dominant (most common) size
// cluster is the base size; chars below 75% of it are scripts.
const dominantSize = (chars) => {
  const buckets = new Map();
  for (const c of chars) {
    const key = Math.round(c.size * 2) / 2;
    buckets.set(key, (buckets.get(key) || 0) + 1);
  }
  let best = -1;
  let bestCount = -1;
  for (const [size, count] of buckets) {
    if (count > bestCount || (count === bestCount && size > best)) {
      best = size;
      bestCount = count;
    }
  }
  return best;
};

const isLetter = (t) => /^[A-Za-z]$/.test(t);

// Base size of a line: the max size, unless smaller chars are the majority AND
// none of them sits displaced above/below the big chars' baseline (a line set
// entirely at the smaller size, e.g. an author's superscript-formatted answer).
// A uniform line has no scripts at all.
const resolveBaseSize = (chars) => {
  const maxSize = Math.max(...chars.map((c) => c.size));
  if (!maxSize) return { size: maxSize, uniform: false };
  const isSmall = (c) => c.size < SCRIPT_SIZE_RATIO * maxSize;
  const scripts = chars.filter((c) => c.text !== " " && isSmall(c));
  const fulls = chars.filter((c) => c.text !== " " && !isSmall(c));
  if (fulls.length && scripts.length > fulls.length) {
    const baseTop = median(fulls.map((c) => c.top));
    const baseBottom = median(fulls.map((c) => c.bottom));
    const displaced = scripts.filter(
      (c) =>
        Math.abs(c.bottom - baseBottom) >= RAISED_RATIO * maxSize ||
        Math.abs(c.top - baseTop) >= RAISED_RATIO * maxSize
    );
    if (!displaced.length) return { size: dominantSize(chars), uniform: true };
  }
  return { size: maxSize, uniform: false };
};

// Replaces runs of 2+ adjacent body-cluster letters with a single \text{...}
// pseudo-char so plain-English sentences survive inside an all-math solutions
// line. Solutions PDFs set body words at a slightly smaller Times size than
// math symbols, so only that cluster is wrapped; math-size pairs like "gt"
// (g times t) stay math, and script letters stay available for fractions.
const wordWrapChars = (chars, fullSize) => {
  const isBody = (c) =>
    c.size >= SCRIPT_SIZE_RATIO * fullSize && c.size < 0.95 * fullSize;
  const out = [];
  for (let i = 0; i < chars.length; i++) {
    if (!isLetter(chars[i].text) || !isBody(chars[i])) {
      out.push(chars[i]);
      continue;
    }
    let j = i;
    let word = "";
    while (j < chars.length && isLetter(chars[j].text) && isBody(chars[j])) {
      word += chars[j].text;
      j++;
    }
    if (j - i >= 2) {
      const first = chars[i];
      const last = chars[j - 1];
      out.push({
        text: `\\text{${word}}`,
        x0: first.x0,
        x1: last.x1,
        top: first.top,
        bottom: first.bottom,
        size: first.size,
        fontname: first.fontname,
      });
    } else {
      out.push(chars[i]);
    }
    i = j - 1;
  }
  return out;
};

const xOverlaps = (a, b) => a.x0 < b.x1 && b.x0 < a.x1;

const FUNCTION_NAMES = new Set([
  "sin", "cos", "tan", "ln", "log", "lim", "sec", "csc", "cot",
  "arcsin", "arccos", "arctan", "exp",
]);

// Symbol-font growing-paren pieces. A 2-3 line paren (around a fraction) is
// three stacked glyphs; they collapse into \left( / \right).
const BRACKET_LEFT = new Set(["\uf0e4", "\uf0e5", "\uf0e6", "\uf0e7", "\uf0e8"]);
const BRACKET_RIGHT = new Set(["\uf0f6", "\uf0f7", "\uf0f8"]);

// Non-italic full-size letter runs that spell a function name (sin, cos...)
// become LaTeX commands; variables are set in italic in these PDFs.
const functionTokens = (chars, fullSize) => {
  const out = [];
  for (let i = 0; i < chars.length; i++) {
    const c = chars[i];
    if (
      !isLetter(c.text) ||
      c.size < SCRIPT_SIZE_RATIO * fullSize ||
      /Ital/.test(c.fontname || "")
    ) {
      out.push(c);
      continue;
    }
    let j = i;
    let word = "";
    while (
      j < chars.length &&
      isLetter(chars[j].text) &&
      chars[j].size >= SCRIPT_SIZE_RATIO * fullSize &&
      !/Ital/.test(chars[j].fontname || "")
    ) {
      word += chars[j].text;
      j++;
    }
    if (FUNCTION_NAMES.has(word)) {
      const first = chars[i];
      const last = chars[j - 1];
      out.push({ ...first, text: `\\${word}`, x1: last.x1, forceFull: true });
    } else {
      out.push(chars[i]);
      j = i + 1;
    }
    i = j - 1;
  }
  return out;
};

const collapseBracketPieces = (chars) => {
  const out = [];
  let leftDone = false;
  let lastRight = -1;
  for (let i = 0; i < chars.length; i++) {
    if (BRACKET_RIGHT.has(chars[i].text)) lastRight = i;
  }
  for (let i = 0; i < chars.length; i++) {
    const c = chars[i];
    if (BRACKET_LEFT.has(c.text)) {
      if (!leftDone) {
        leftDone = true;
        out.push({ ...c, text: "\\left(", forceFull: true });
      }
    } else if (BRACKET_RIGHT.has(c.text)) {
      if (i === lastRight) out.push({ ...c, text: "\\right)", forceFull: true });
    } else {
      out.push(c);
    }
  }
  return out;
};

// "A O^ B" angle notation: a caret raised over a letter becomes \hat{letter}.
const pairCaretHats = (chars, fullSize) => {
  const out = [];
  for (const c of chars) {
    const prev = out[out.length - 1];
    if (
      c.text === "\u02c6" &&
      prev &&
      !prev.forceFull &&
      xOverlaps(c, prev) &&
      prev.bottom - c.bottom >= 0.2 * fullSize
    ) {
      out[out.length - 1] = { ...prev, text: `\\hat{${prev.text}}` };
    } else {
      out.push(c);
    }
  }
  return out;
};

function processMathRun(chars, { wordWrap } = {}) {
  const { size: fullSize, uniform } = resolveBaseSize(chars);
  let run = wordWrap ? wordWrapChars(chars, fullSize) : chars;
  if (uniform) return run.map((c) => c.text).join("");
  run = functionTokens(run, fullSize);
  run = collapseBracketPieces(run);
  run = pairCaretHats(run, fullSize);
  // Diagram label rows (lone letters spread across a sketch) are not formulas.
  // Inserted space chars absorb the gaps, so measure on the dense stream.
  const dense = run.filter((c) => c.text !== " ");
  if (dense.some((c, i) => i > 0 && dense[i].x0 - dense[i - 1].x1 > 3 * fullSize)) {
    return run
      .map((c) => c.text)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/\u02c6/g, "\\hat{}");
  }
  // Scripts are judged against the nearest preceding full-size char's baseline
  // (a line can mix body and math clusters at slightly different baselines).
  // Subscripts drop below the base's TOP; superscripts rise above its BOTTOM;
  // stacked fraction digits are often FULL-SIZE, so displacement alone
  // qualifies a char as a script.
  const fallbackBase = run.find(
    (c) => c.text !== " " && c.size >= SCRIPT_SIZE_RATIO * fullSize
  );
  const raisedFrom = (c, base) => (base.bottom - c.bottom) / fullSize >= RAISED_RATIO;
  const loweredFrom = (c, base) => (c.top - base.top) / fullSize >= RAISED_RATIO;
  const scriptLike = (c, base) =>
    c.text !== " " &&
    !c.forceFull &&
    (c.size < SCRIPT_SIZE_RATIO * fullSize ||
      raisedFrom(c, base) ||
      loweredFrom(c, base));
  // Fraction digits are full-size in Word-generated PDFs; script-sized pairs
  // at the same x are a genuine subscript + superscript.
  const fullSizeDisp = (c) => c.size >= SCRIPT_SIZE_RATIO * fullSize;

  const tokens = [];
  let lastBase = fallbackBase;
  for (let i = 0; i < run.length; i++) {
    const c = run[i];
    if (!scriptLike(c, lastBase)) {
      tokens.push(c.text);
      if (!c.forceFull) lastBase = c;
      continue;
    }
    const raised = raisedFrom(c, lastBase);
    const lowered = loweredFrom(c, lastBase);
    if (raised) {
      // Raised group; a following lowered group overlapping it in x is the
      // denominator of a fraction (stacked digits/letters interleave in x).
      const num = [c];
      const den = [];
      let j = i + 1;
      while (j < run.length && scriptLike(run[j], lastBase)) {
        const d = run[j];
        if (raisedFrom(d, lastBase)) {
          const prev = num[num.length - 1];
          // Superscript operators (minus etc.) carry wide side bearings, so a
          // following exponent sits farther out than the default allowance.
          const allowance = /^[-+<>=]$/.test(prev.text) ? 0.9 : 0.45;
          if (d.x0 - prev.x1 <= allowance * prev.size) num.push(d);
          else break;
        } else if (
          loweredFrom(d, lastBase) &&
          fullSizeDisp(d) &&
          fullSizeDisp(num[0]) &&
          xOverlaps(d, { x0: num[0].x0, x1: num[num.length - 1].x1 })
        ) {
          den.push(d);
        } else {
          break;
        }
        j++;
      }
      if (den.length) {
        tokens.push(
          `\\frac{${num.map((n) => n.text).join("")}}{${den.map((d) => d.text).join("")}}`
        );
        i = j - 1;
      } else if (tokens.length) {
        tokens[tokens.length - 1] += `^{${num.map((n) => n.text).join("")}}`;
        i = j - 1;
      } else {
        tokens.push(c.text);
      }
    } else if (lowered && tokens.length) {
      const sub = [c];
      let j = i + 1;
      while (j < run.length && scriptLike(run[j], lastBase) && loweredFrom(run[j], lastBase)) {
        const prev = sub[sub.length - 1];
        if (run[j].x0 - prev.x1 <= 0.45 * prev.size) sub.push(run[j]);
        else break;
        j++;
      }
      // Stacked fraction digits interleave in x; when the denominator comes
      // first, a full-size raised group overlapping it is the numerator.
      let k = j;
      while (
        k < run.length &&
        scriptLike(run[k], lastBase) &&
        raisedFrom(run[k], lastBase) &&
        fullSizeDisp(run[k]) &&
        fullSizeDisp(sub[0]) &&
        xOverlaps(run[k], { x0: sub[0].x0, x1: sub[sub.length - 1].x1 })
      ) {
        k++;
      }
      if (k > j) {
        tokens.push(
          `\\frac{${run.slice(j, k).map((n) => n.text).join("")}}{${sub.map((s) => s.text).join("")}}`
        );
        i = k - 1;
      } else {
        tokens[tokens.length - 1] += `_{${sub.map((s) => s.text).join("")}}`;
        i = j - 1;
      }
    } else {
      tokens.push(c.text);
    }
  }

  // A LaTeX command followed by a letter or digit needs a separating space.
  let out = tokens[0] ?? "";
  for (let i = 1; i < tokens.length; i++) {
    const t = tokens[i];
    out += /\\[a-zA-Z]+$/.test(out) && /^[a-zA-Z0-9]/.test(t) ? ` ${t}` : t;
  }
  return out.replace(/\u02c6/g, "\\hat{}");
}

export function latexifyLine(line, opts = {}) {
  const runs = [];
  for (const raw of line.chars) {
    const c = { ...raw, text: mapSymbol(raw.text) };
    const isMath = classifyFont(c.fontname) !== "body";
    const last = runs[runs.length - 1];
    if (last && last.isMath === isMath) last.chars.push(c);
    else runs.push({ isMath, chars: [c] });
  }
  const parts = [];
  for (const run of runs) {
    const spaced = insertSpaces(run.chars, run.isMath ? 0.25 : 0.45);
    if (run.isMath) {
      parts.push(`$${processMathRun(spaced, { wordWrap: !!opts.solutions })}$`);
    } else {
      parts.push(spaced.map((c) => c.text).join("").replace(/\s+/g, " "));
    }
  }
  return parts.join("").trim();
}

export function isQuestionHeader(text) {
  return /^\d+\.\s*\[Maximum mark:\s*\d+\]/i.test(text);
}

export function parseQuestionHeader(text) {
  const number = Number(text.match(/^(\d+)\./)?.[1]);
  const marks = Number(text.match(/Maximum mark:\s*(\d+)/i)?.[1]);
  const gdc = !/\[without GDC\]/i.test(text);
  return { number, marks, gdc };
}
