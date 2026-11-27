// Deterministic, idempotent LaTeX repairs for the seed JSONs.
//
//   node scripts/repair-latex.mjs [--dry-run] [--verbose]
//
// Passes (per statement / markscheme / tips, repeated until stable):
//   1. legacy \(..\) / \[..\] in prose        -> $..$ / $$..$$
//   2. currency "$" at an opener position     -> \$   ($12,000 / $8.80 / $ per year)
//   3. lone "$" inside $$..$$                 -> \$
//   4. stray unclosed "$" / trailing "$$"     -> \$ / removed
//   5. bare LaTeX runs in prose               -> wrapped in $..$ ($$..$$ for \begin{align*})
//   6. HTML entities                          -> LaTeX inside math, unicode in prose
// A rewrite is kept only if it does not increase the field's ERROR count.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { lintText, LEVEL, splitMath, katexError } from "./lib/bank-lint.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DRY = process.argv.includes("--dry-run");
const VERBOSE = process.argv.includes("--verbose");
const FILES = ["paper3_seed_questions.json", "original_seed_questions.json"];
const FIELDS = ["statement", "markscheme", "tips"];

// ------------------------------------------------------------------ entities
const MATH_ENT = {
  lt: "<", gt: ">", amp: "\\&", nbsp: " ", le: "\\le ", leq: "\\le ", ge: "\\ge ", geq: "\\ge ",
  ne: "\\ne ", times: "\\times ", divide: "\\div ", div: "\\div ", deg: "^\\circ ", minus: "-",
  plusmn: "\\pm ", pm: "\\pm ", infin: "\\infty ", infty: "\\infty ", middot: "\\cdot ",
  cdot: "\\cdot ", hellip: "\\ldots ", approx: "\\approx ", asymp: "\\approx ", radic: "\\surd ",
  alpha: "\\alpha ", beta: "\\beta ", gamma: "\\gamma ", delta: "\\delta ", epsilon: "\\epsilon ",
  theta: "\\theta ", lambda: "\\lambda ", mu: "\\mu ", pi: "\\pi ", rho: "\\rho ", sigma: "\\sigma ",
  tau: "\\tau ", phi: "\\phi ", omega: "\\omega ", Delta: "\\Delta ", Sigma: "\\Sigma ", Omega: "\\Omega ",
  rarr: "\\rightarrow ", larr: "\\leftarrow ", rArr: "\\Rightarrow ", hArr: "\\Leftrightarrow ",
  isin: "\\in ", cap: "\\cap ", cup: "\\cup ", sub: "\\subset ", prime: "'", quot: '"', apos: "'",
};
const TEXT_ENT = {
  lt: "<", gt: ">", amp: "&", nbsp: " ", le: "≤", leq: "≤", ge: "≥", geq: "≥", ne: "≠", times: "×",
  divide: "÷", div: "÷", deg: "°", minus: "−", plusmn: "±", pm: "±", infin: "∞", middot: "·",
  hellip: "…", approx: "≈", asymp: "≈", radic: "√", alpha: "α", beta: "β", gamma: "γ", delta: "δ",
  epsilon: "ε", theta: "θ", lambda: "λ", mu: "μ", pi: "π", rho: "ρ", sigma: "σ", tau: "τ", phi: "φ",
  omega: "ω", Delta: "Δ", Sigma: "Σ", Omega: "Ω", rarr: "→", larr: "←", rArr: "⇒", hArr: "⇔",
  isin: "∈", cap: "∩", cup: "∪", sub: "⊂", prime: "′", quot: '"', apos: "'", rsquo: "’", lsquo: "‘",
  rdquo: "”", ldquo: "“", ndash: "–", mdash: "—", euro: "€", pound: "£", cent: "¢",
};
function decodeEnt(s, math) {
  const table = math ? MATH_ENT : TEXT_ENT;
  return s.replace(/&(#\d+|#x[0-9a-fA-F]+|[a-zA-Z]{2,8});/g, (whole, name) => {
    if (name[0] === "#") {
      const cp = name[1] === "x" || name[1] === "X" ? parseInt(name.slice(2), 16) : Number(name.slice(1));
      const ch = String.fromCodePoint(cp);
      return math && ch === "&" ? "\\&" : ch;
    }
    return table[name] ?? table[name.toLowerCase()] ?? whole;
  });
}

/** Re-join segments produced by splitMath (text unchanged, math re-delimited). */
function mapSegments(s, fnText, fnMath) {
  const { segments, unclosed } = splitMath(s);
  if (unclosed !== -1) return s; // only touch well-formed strings
  return segments
    .map((g) => {
      if (g.kind === "text") return fnText(g.value);
      const d = g.kind === "display" ? "$$" : "$";
      return d + fnMath(g.value, g.kind === "display") + d;
    })
    .join("");
}

// ------------------------------------------------------------------ passes
export function fixLegacyDelimiters(s) {
  return mapSegments(
    s,
    (t) =>
      t
        .replace(/\\\[([\s\S]*?)\\\]/g, (_, m) => `$$${m.trim()}$$`)
        .replace(/\\\(([\s\S]*?)\\\)/g, (_, m) => `$${m.trim()}$`),
    (m) => m,
  );
}

// Currency amount right after an opener-position "$": digits with thousands
// groups / cents, then whitespace, closing punctuation or end of string.
const CURRENCY = /^\$ ?\d{1,3}(?:,\d{3})+(?:\.\d+)?(?=$|\s|[.,;:?!)](?:\s|$))|^\$ ?\d+(?:\.\d+)?(?=$|\s|[.,;:?!)](?:\s|$))/;
const MATH_NEXT = /^\s*[=+\-*/^_\\<>{}|]/;
const FUNC_WORDS = /^(sin|cos|tan|log|ln|lim|max|min|exp|sec|csc|cot|and|or|for|if)$/;

/** Prose words in a math candidate (outside \text{..}/\mathrm{..}). */
export function proseWords(math) {
  const stripped = math
    .replace(/\\(begin|end)\{[^{}]*\}(\{[^{}]*\})?/g, " ")
    .replace(/\\(text|textit|mathrm|textbf|operatorname|mbox)\{[^{}]*\}/g, " ")
    .replace(/\\[a-zA-Z]+/g, " ");
  return (stripped.match(/[A-Za-z]{3,}/g) || []).filter((w) => !FUNC_WORDS.test(w.toLowerCase()));
}

function findInlineClose(s, from) {
  for (let j = from; j < s.length; j++) {
    if (s[j] === "\\") {
      j++;
      continue;
    }
    if (s[j] === "$") return j;
  }
  return -1;
}

export function escapeCurrency(s) {
  let out = "";
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (c === "\\") {
      out += s.slice(i, i + 2);
      i += 2;
      continue;
    }
    if (c !== "$") {
      out += c;
      i++;
      continue;
    }
    if (s[i + 1] === "$") {
      // display block: copy through to its closer, escaping lone $ inside.
      const close = s.indexOf("$$", i + 2);
      if (close === -1) {
        out += s.slice(i);
        break;
      }
      const inner = s.slice(i + 2, close).replace(/(^|[^\\$])\$(?!\$)/g, "$1\\$");
      out += "$$" + inner + "$$";
      i = close + 2;
      continue;
    }
    const rest = s.slice(i);
    const prev = s[i - 1] ?? "";
    let currency = false;
    if (prev === "(" && s[i + 1] === ")") currency = true; // "dollars ($)"
    else if (/[0-9]/.test(prev)) currency = true; // "10000$ per year"
    else {
      const cur = rest.match(CURRENCY);
      if (cur && !MATH_NEXT.test(rest.slice(cur[0].length))) {
        // "$2, 3, 5$" is a math list; money is followed by prose or nothing.
        const k = findInlineClose(s, i + 1);
        const span = k === -1 ? "" : s.slice(i + 1, k).replace(/\\[a-zA-Z]+/g, " ");
        if (k === -1 || /[A-Za-z]{3,}/.test(span)) currency = true;
      }
    }
    const close = currency ? -1 : findInlineClose(s, i + 1);
    if (!currency && close === -1) currency = true; // lone "$"
    if (!currency && proseWords(s.slice(i + 1, close)).length >= 3) {
      const inner = s.slice(i + 1, close);
      if (!/\\[a-zA-Z]/.test(inner)) {
        // "$Area \ of \ the \ triangle * length$": prose typed in math mode -> plain text.
        out += inner.replace(/\\ /g, " ");
        i = close + 1;
        continue;
      }
      currency = true; // the "$" swallows prose: it is not an opener
    }
    if (currency) {
      out += "\\$";
      i++;
      continue;
    }
    out += s.slice(i, close + 1);
    i = close + 1;
  }
  return out;
}

/**
 * "$$ $$P(x)=..$$": a doubled / empty display OPENER shifts every later
 * delimiter. Parity-aware: "$$a$$ $$b$$" (closer + opener) is left alone.
 */
export function collapseEmptyDisplay(s) {
  let out = "";
  let i = 0;
  while (i < s.length) {
    if (s[i] === "\\") {
      out += s.slice(i, i + 2);
      i += 2;
      continue;
    }
    if (s[i] !== "$") {
      out += s[i++];
      continue;
    }
    if (s[i + 1] === "$") {
      const m = s.slice(i).match(/^\$\$\s*\$\$(?=[^\s$])/);
      const from = m ? i + m[0].length : i + 2; // content start
      const close = s.indexOf("$$", from);
      if (close === -1) return out + s.slice(i);
      out += "$$" + s.slice(from, close) + "$$";
      i = close + 2;
      continue;
    }
    const close = s.indexOf("$", i + 1);
    if (close === -1) return out + s.slice(i);
    out += s.slice(i, close + 1);
    i = close + 1;
  }
  return out;
}

/** Context-free fixes: "($)" is always a currency label; "$$$" at a block end is one "$" too many. */
export function fixDollarGlyphs(s) {
  return s.replace(/\((?:\\)?\$\)/g, "(\\$)").replace(/\$\$\$(?=\s|$)/g, "$$$$");
}

/** A lone "$" as the very last character (after math or prose) is stray. */
export function dropTrailingStray(s) {
  const { unclosed } = splitMath(s);
  if (unclosed !== -1 && unclosed === s.trimEnd().length - 1 && s[unclosed - 1] !== "$") return s.slice(0, unclosed).trimEnd();
  return s;
}

/**
 * "(x \to \pm\infty)": the scrape stripped the backslashes of \( .. \), leaving
 * a paren group of LaTeX in prose. Turn such groups back into $..$.
 */
export function restoreStrippedInline(text) {
  let out = "";
  let i = 0;
  while (i < text.length) {
    // Only a group standing alone in prose ("as (x \\to 3)"), never f(x) or {(..)}.
    if (text[i] === "(" && (i === 0 || /[\s,;:]/.test(text[i - 1]))) {
      const q = consumeGroup(text, i);
      if (q !== -1) {
        const inner = text.slice(i + 1, q - 1);
        if (/\\[a-zA-Z]+/.test(inner) && proseWords(inner).length === 0 && !/\$/.test(inner) && !katexError(inner, false)) {
          out += `$${inner.trim()}$`;
          i = q;
          continue;
        }
      }
    }
    out += text[i];
    i++;
  }
  return out;
}

/** Remove an unclosed trailing "$$" (stray delimiter at the very end / before prose). */
export function fixStrayDisplay(s) {
  const { unclosed } = splitMath(s);
  if (unclosed === -1 || s[unclosed + 1] !== "$") return s;
  const rest = s.slice(unclosed + 2);
  if (!rest.trim()) return s.slice(0, unclosed).trimEnd();
  // "$$ Same logic applies" — a stray opener before prose: drop it.
  if (/^\s*[A-Z][a-z]+\s+[a-z]+/.test(rest) && !/\\[a-zA-Z]/.test(rest.slice(0, 40))) {
    return s.slice(0, unclosed) + rest.replace(/^\s*/, " ");
  }
  return s;
}

// Bare LaTeX in prose: wrap the surrounding math-like run in $..$.
const RUN_CHAR = /[0-9a-zA-Z+\-*/=<>^_.,'|:!]/;
function consumeGroup(t, p) {
  const open = t[p];
  const close = open === "{" ? "}" : open === "(" ? ")" : "]";
  let d = 0;
  for (let q = p; q < t.length; q++) {
    if (t[q] === "\\") {
      q++;
      continue;
    }
    if (t[q] === open) d++;
    else if (t[q] === close && --d === 0) return q + 1;
  }
  return -1;
}
const isWord = (w) => /^[A-Za-z]{2,}$/.test(w) && !/^(sin|cos|tan|log|ln|lim|max|min|exp|sec|csc|cot|dx|dy|dt)$/.test(w);

export function wrapBareLatex(text) {
  // \begin{env}...\end{env} in prose -> display block.
  let t = text.replace(/\\begin\{([a-zA-Z*]+)\}[\s\S]*?\\end\{\1\}/g, (m) => `$$${m.trim()}$$`);
  if (t !== text) return t;
  const m = t.match(/\\[a-zA-Z]+/);
  if (!m) return t;
  let start = m.index;
  let end = m.index;
  // extend right over commands, groups, math chars and short mathy tokens
  while (end < t.length) {
    const c = t[end];
    if (c === "\\") {
      if (/[a-zA-Z]/.test(t[end + 1] ?? "")) {
        end += 1;
        while (/[a-zA-Z]/.test(t[end] ?? "")) end++;
      } else end += 2;
      continue;
    }
    if (c === "{" || c === "(" || c === "[") {
      const q = consumeGroup(t, end);
      if (q === -1) break;
      end = q;
      continue;
    }
    if (c === " ") {
      const nextTok = t.slice(end + 1).match(/^\S+/)?.[0] ?? "";
      const word = nextTok.replace(/[.,;:!?)]+$/, "");
      if (!nextTok || isWord(word) || /^[a-z]\)$/.test(nextTok)) break;
      end++;
      continue;
    }
    if (RUN_CHAR.test(c)) {
      const w = t.slice(end).match(/^[A-Za-z]+/)?.[0];
      if (w && isWord(w)) break;
      end += w ? w.length : 1;
      continue;
    }
    break;
  }
  // extend left over math-ish tokens (not prose words)
  while (start > 0) {
    const before = t.slice(0, start);
    const tok = before.match(/(\S+)(\s*)$/);
    if (!tok) break;
    const word = tok[1];
    if (isWord(word.replace(/[^A-Za-z]/g, "")) && /^[A-Za-z]+[.,:;]?$/.test(word)) break;
    if (/[.:;?!]$/.test(word) && /[A-Za-z]{2,}/.test(word)) break;
    if (!/^[0-9a-zA-Z+\-*/=<>^_.,()|'[\]{}]+$/.test(word)) break;
    if (/^[a-z]\)$/.test(word)) break; // part label "a)"
    start = before.length - tok[0].length;
  }
  // trim trailing punctuation / unmatched parens
  let run = t.slice(start, end);
  const lead = run.match(/^[\s(]*/)[0];
  run = run.slice(lead.length);
  let trail = run.match(/[\s.,;:]*$/)[0];
  run = run.slice(0, run.length - trail.length);
  const opens = (run.match(/\(/g) || []).length;
  const closes = (run.match(/\)/g) || []).length;
  if (closes > opens && run.endsWith(")")) {
    trail = ")" + trail;
    run = run.slice(0, -1);
  }
  if (!run || katexError(run, false)) return t; // not safely wrappable
  return t.slice(0, start) + lead + `$${run}$` + trail + t.slice(end);
}

function wrapAllBare(s) {
  let prev;
  const wrapEnvs = (t) => t.replace(/\\begin\{([a-zA-Z*]+)\}[\s\S]*?\\end\{\1\}/g, (m) => `$$${m.trim()}$$`);
  let cur = mapSegments(s, wrapEnvs, (m) => m);
  cur = mapSegments(cur, restoreStrippedInline, (m) => m);
  for (let k = 0; k < 20 && cur !== prev; k++) {
    prev = cur;
    // re-split every round so freshly wrapped runs count as math
    cur = mapSegments(cur, wrapBareLatex, (m) => m);
  }
  return cur;
}

export function fixEntities(s) {
  return mapSegments(s, (t) => decodeEnt(t, false), (m) => decodeEnt(m, true).replace(/\s+$/, (w) => w));
}

// An unclosed "$" hides every later issue (the scanner stops there), so it
// outweighs the issues a fix may newly expose for the following passes.
const errorCount = (s) =>
  lintText(s)
    .filter((i) => LEVEL[i.code] === "ERROR")
    .reduce((n, i) => n + (i.code === "UNBALANCED_DOLLAR" ? 10 : 1), 0);

export function repairField(s) {
  if (typeof s !== "string" || !s) return s;
  let cur = s;
  const passes = [fixLegacyDelimiters, fixDollarGlyphs, collapseEmptyDisplay, dropTrailingStray, escapeCurrency, fixStrayDisplay, wrapAllBare, fixEntities];
  for (let round = 0; round < 4; round++) {
    const before = cur;
    for (const pass of passes) {
      const next = pass(cur);
      if (next !== cur && errorCount(next) <= errorCount(cur)) cur = next;
    }
    if (cur === before) break;
  }
  return cur;
}

// ------------------------------------------------------------------ main
if (import.meta.url === `file://${process.argv[1]}`) {
  let changed = 0;
  for (const file of FILES) {
    const p = path.join(root, file);
    if (!existsSync(p)) continue;
    const data = JSON.parse(readFileSync(p, "utf8"));
    let fileChanged = 0;
    data.forEach((rec, i) => {
      for (const f of FIELDS) {
        const next = repairField(rec[f]);
        if (next !== rec[f]) {
          if (VERBOSE) console.log(`${file}#${i}.${f}: ${errorCount(rec[f])} -> ${errorCount(next)} errors`);
          rec[f] = next;
          fileChanged++;
        }
      }
    });
    changed += fileChanged;
    if (fileChanged && !DRY) writeFileSync(p, JSON.stringify(data, null, 2) + "\n");
    console.log(`${file}: ${fileChanged} field(s) repaired${DRY ? " (dry run)" : ""}`);
  }
  console.log(`Total fields repaired: ${changed}`);
}
