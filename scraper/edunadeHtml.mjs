// Pure helpers for turning Edunade question/answer HTML into bank records and for
// matching API questions against already-flattened seed records. No network/DOM
// dependency so they can be unit-tested with node:test.
import katex from "katex";

const NAMED_ENTITIES = {
  nbsp: " ", amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", "#39": "'",
  le: "≤", ge: "≥", ne: "≠", times: "×", divide: "÷", deg: "°", minus: "−",
  plusmn: "±", pi: "π", theta: "θ", hellip: "…", ndash: "–", mdash: "—",
  rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“", infin: "∞", radic: "√",
  middot: "·", alpha: "α", beta: "β", mu: "μ", sigma: "σ", lambda: "λ",
};

// Inside math, entities become LaTeX rather than unicode.
const MATH_ENTITIES = {
  nbsp: " ", amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", "#39": "'",
  le: "\\le ", ge: "\\ge ", ne: "\\ne ", times: "\\times ", divide: "\\div ",
  deg: "^\\circ ", minus: "-", plusmn: "\\pm ", pi: "\\pi ", theta: "\\theta ",
  hellip: "\\ldots ", infin: "\\infty ", middot: "\\cdot ", alpha: "\\alpha ",
  beta: "\\beta ", mu: "\\mu ", sigma: "\\sigma ", lambda: "\\lambda ",
};

export function decodeEntities(s, math = false) {
  const table = math ? MATH_ENTITIES : NAMED_ENTITIES;
  return String(s ?? "")
    .replace(/&(#?[a-zA-Z0-9]+);/g, (whole, name) => {
      if (name.startsWith("#x") || name.startsWith("#X")) return String.fromCodePoint(parseInt(name.slice(2), 16));
      if (/^#\d+$/.test(name) && name !== "#39") return String.fromCodePoint(Number(name.slice(1)));
      const v = table[name] ?? table[name.toLowerCase()];
      return v !== undefined ? v : whole;
    });
}

/** All <img src> URLs in document order (absolute http(s) or data: URIs). */
export function extractImages(html) {
  const out = [];
  const re = /<img\b[^>]*?\bsrc\s*=\s*["']([^"']+)["'][^>]*>/gi;
  let m;
  while ((m = re.exec(String(html ?? "")))) {
    const src = decodeEntities(m[1]).trim();
    if (/^(https?:|data:image\/)/i.test(src) && !out.includes(src)) out.push(src);
  }
  return out;
}

// Escape plain text for use inside \text{...}.
function texText(s) {
  return s
    .replace(/\\/g, "\\textbackslash ")
    .replace(/([{}$&#%_])/g, "\\$1")
    .replace(/\^/g, "\\^{}")
    .replace(/~/g, "\\sim ");
}

/** Convert one table cell's HTML into a math-mode LaTeX fragment. */
export function cellToLatex(cellHtml) {
  let s = String(cellHtml ?? "")
    .replace(/<\s*br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, "");
  s = decodeEntities(s).replace(/\s+/g, " ").trim();
  if (!s) return "";
  // Split into math (\(..\), \[..\], $..$) and text runs.
  const parts = [];
  const re = /\\\(([\s\S]*?)\\\)|\\\[([\s\S]*?)\\\]|\$\$([\s\S]*?)\$\$|\$([^$]+)\$/g;
  let last = 0;
  let m;
  while ((m = re.exec(s))) {
    if (m.index > last) parts.push({ text: s.slice(last, m.index) });
    parts.push({ math: (m[1] ?? m[2] ?? m[3] ?? m[4]).trim() });
    last = re.lastIndex;
  }
  if (last < s.length) parts.push({ text: s.slice(last) });
  return parts
    .map((p) => {
      if (p.math !== undefined) return p.math;
      const t = p.text;
      if (!t.trim()) return "\\ ";
      // Pure numbers/simple symbols stay in math mode; prose goes in \text{}.
      if (/^\s*[-+]?[0-9.,]+\s*$/.test(t)) return t.trim().replace(/,/g, "{,}");
      // A lone variable ("a", "x") is math, not prose.
      if (/^\s*[a-zA-Z]\s*$/.test(t)) return t.trim();
      return `\\text{${texText(t)}}`;
    })
    .join("");
}

/** Convert an HTML <table> into a $$\begin{array}...\end{array}$$ display block. */
export function tableToArray(tableHtml) {
  const rows = [];
  const rowRe = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
  let r;
  while ((r = rowRe.exec(tableHtml))) {
    const cells = [];
    const cellRe = /<(td|th)\b([^>]*)>([\s\S]*?)<\/\1>/gi;
    let c;
    while ((c = cellRe.exec(r[1]))) {
      const span = Number((c[2].match(/colspan\s*=\s*["']?(\d+)/i) || [])[1] || 1);
      cells.push(cellToLatex(c[3]));
      for (let k = 1; k < span; k++) cells.push("");
    }
    if (cells.length) rows.push(cells);
  }
  if (!rows.length) return "";
  const cols = Math.max(...rows.map((x) => x.length));
  const spec = "|" + Array(cols).fill("c").join("|") + "|";
  const body = rows
    .map((cells) => [...cells, ...Array(cols - cells.length).fill("")].join(" & ") + " \\\\ \\hline")
    .join(" ");
  return `$$\\begin{array}{${spec}}\\hline ${body}\\end{array}$$`;
}

/** True when every $..$/$$..$$ segment of a converted table renders in KaTeX. */
export function katexOk(latex, displayMode = true) {
  try {
    katex.renderToString(latex, { throwOnError: true, displayMode, strict: "ignore" });
    return true;
  } catch {
    return false;
  }
}

/**
 * Improved flattener (v2): like normalize.htmlToStatement but protects math from
 * the tag stripper (so "\(x<3\)" keeps its "<"), turns tables into LaTeX arrays
 * and drops <img>/<svg>/<canvas> (captured separately as image URLs).
 */
export function htmlToStatementV2(html) {
  let s = String(html ?? "").trim();
  if (!s) return "";
  const stash = [];
  const keep = (v) => `\u0000${stash.push(v) - 1}\u0000`;
  s = s.replace(/<table\b[\s\S]*?<\/table>/gi, (t) => {
    const arr = tableToArray(t);
    if (arr && katexOk(arr.slice(2, -2))) return " " + keep(arr) + " ";
    // Fallback: rows separated by "; ", cells by ", " (pipe-free, readable).
    const rows = [...t.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map((m) =>
      [...m[1].matchAll(/<(td|th)\b[^>]*>([\s\S]*?)<\/\1>/gi)]
        .map((c) => c[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim())
        .join(", "),
    );
    return " " + rows.join("; ") + " ";
  });
  s = s.replace(/<(svg|canvas)\b[\s\S]*?<\/\1>/gi, " ");
  s = s.replace(/\\\[([\s\S]*?)\\\]/g, (_, m) => keep(`$$${decodeEntities(m, true).replace(/<[^>]+>/g, "").trim()}$$`));
  s = s.replace(/\\\(([\s\S]*?)\\\)/g, (_, m) => keep(`$${decodeEntities(m, true).replace(/<[^>]+>/g, "").trim()}$`));
  s = s.replace(/<\s*br\s*\/?>/gi, " ");
  s = s.replace(/<\s*\/\s*(p|div|li|h[1-6]|tr)\s*>/gi, " ");
  s = s.replace(/<[^>]+>/g, "");
  s = decodeEntities(s);
  s = s.replace(/\u0000(\d+)\u0000/g, (_, i) => stash[Number(i)]);
  return s.replace(/\s+/g, " ").trim();
}

/** Normalise text for matching: strip HTML, LaTeX delimiters/commands, case, punctuation. */
export function normalizeForMatch(s) {
  return decodeEntities(String(s ?? ""))
    .replace(/<[^>]*>/g, " ")
    .replace(/\\[a-zA-Z]+/g, " ")
    .replace(/\\[()[\]]/g, " ")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function tokens(s) {
  return new Set(normalizeForMatch(s).split(" ").filter((t) => t.length > 1));
}

/** Jaccard similarity of two token sets. */
export function jaccard(a, b) {
  if (!a.size && !b.size) return 1;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  return inter / (a.size + b.size - inter);
}

const PREFIX_LEN = 80;

/**
 * Match seed records to API questions. Returns Map(seedIndex -> {apiIndex, method, score}).
 * Strategy: exact normalised equality, then shared 80-char prefix (unique),
 * then best token Jaccard of statement (+ markscheme as tiebreak) >= threshold.
 * Each API question is used at most once.
 */
export function matchRecords(seeds, apiQs, { threshold = 0.7 } = {}) {
  const apiNorm = apiQs.map((q) => normalizeForMatch(q.question));
  const apiTok = apiQs.map((q) => tokens(q.question));
  const apiAnsTok = apiQs.map((q) => tokens(q.answer));
  const used = new Set();
  const result = new Map();
  const seedNorm = seeds.map((r) => normalizeForMatch(r.statement));

  const byExact = new Map();
  apiNorm.forEach((n, i) => {
    if (!byExact.has(n)) byExact.set(n, []);
    byExact.get(n).push(i);
  });
  const pass = (fn) => {
    seeds.forEach((rec, si) => {
      if (result.has(si)) return;
      const hit = fn(rec, si);
      if (hit && !used.has(hit.apiIndex)) {
        used.add(hit.apiIndex);
        result.set(si, hit);
      }
    });
  };
  // 1. Exact (pick an unused candidate; break ties on markscheme similarity).
  pass((rec, si) => {
    const cands = (byExact.get(seedNorm[si]) || []).filter((i) => !used.has(i));
    if (!cands.length) return null;
    const ms = tokens(rec.markscheme);
    cands.sort((a, b) => jaccard(ms, apiAnsTok[b]) - jaccard(ms, apiAnsTok[a]));
    return { apiIndex: cands[0], method: "exact", score: 1 };
  });
  // 2. Unique prefix.
  pass((rec, si) => {
    const p = seedNorm[si].slice(0, PREFIX_LEN);
    if (p.length < 30) return null;
    const cands = apiNorm.map((n, i) => (n.startsWith(p) && !used.has(i) ? i : -1)).filter((i) => i >= 0);
    return cands.length === 1 ? { apiIndex: cands[0], method: "prefix", score: 1 } : null;
  });
  // 3. Token similarity.
  pass((rec) => {
    const st = tokens(rec.statement);
    const ms = tokens(rec.markscheme);
    let best = -1;
    let bestScore = 0;
    apiTok.forEach((t, i) => {
      if (used.has(i)) return;
      const score = jaccard(st, t) * 0.85 + jaccard(ms, apiAnsTok[i]) * 0.15;
      if (score > bestScore) {
        bestScore = score;
        best = i;
      }
    });
    return best >= 0 && bestScore >= threshold ? { apiIndex: best, method: "similarity", score: bestScore } : null;
  });
  return result;
}

/** Extract `params.append('chapter', '<code>')` codes and the API path from a topic page. */
export function parseTopicPage(html) {
  const chapters = [...new Set([...String(html).matchAll(/params\.append\(\s*['"]chapter['"]\s*,\s*['"]([^'"]+)['"]\s*\)/g)].map((m) => m[1]))];
  const api = (String(html).match(/\/api\/(math-[a-z]+-hl-questions)\//) || [])[1] || null;
  return { chapters, api };
}

/** Topic page links (absolute paths) from a hub page. */
export function parseHubLinks(html, hubPath) {
  const esc = hubPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`href="(${esc}[a-z0-9-]+/)"`, "g");
  return [...new Set([...String(html).matchAll(re)].map((m) => m[1]))];
}

/**
 * Replace the v1-flattened (mangled) text of each <table> in `html` inside
 * `text` with its \begin{array} display block. `flattenV1` is the original
 * flattener (normalize.htmlToStatement). Returns {text, replaced}.
 */
export function replaceMangledTables(text, html, flattenV1) {
  let out = String(text ?? "");
  let replaced = 0;
  for (const m of String(html ?? "").matchAll(/<table\b[\s\S]*?<\/table>/gi)) {
    const mangled = flattenV1(m[0]);
    const arr = tableToArray(m[0]);
    if (!mangled || !arr || !katexOk(arr.slice(2, -2))) continue;
    let at = out.indexOf(mangled);
    let end = at === -1 ? -1 : at + mangled.length;
    if (at === -1) {
      // Fallback: locate the cells, in order, as they appear after v2 flattening.
      const span = locateCells(out, tableCells(m[0]));
      if (!span) continue;
      [at, end] = span;
      // Rebuild from the seed's own cell text (keeps later hand corrections).
      const shape = [...m[0].matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map(
        (r) => [...r[1].matchAll(/<(td|th)\b[^>]*>([\s\S]*?)<\/\1>/gi)].filter((c) => htmlToStatementV2(c[2])).length,
      );
      const rebuilt = arrayFromCells(span[2], shape.filter(Boolean));
      if (rebuilt && katexOk(rebuilt.slice(2, -2))) {
        out = out.slice(0, at) + rebuilt + out.slice(end);
        replaced++;
      }
      continue;
    }
    out = out.slice(0, at) + arr + out.slice(end);
    replaced++;
  }
  return { text: out, replaced };
}

/**
 * True when a statement's figure reference is satisfied by content that is
 * inline in the text itself (a $$...$$ table/array or data block), i.e. the
 * reference is "the table below" / "shown below:" followed by display math.
 * `detect` is figureHeuristic.detectMissingFigure.
 */
export function figureSatisfiedInline(statement, detect) {
  const s = String(statement ?? "");
  if (!/\$\$[\s\S]+?\$\$/.test(s)) return false;
  const neutral = s
    .replace(/\$\$[\s\S]+?\$\$/g, " [data] ")
    .replace(/\b(in |from )?(the |this )?(following |given |above |below )?(frequency |two-way |contingency )?tables?( below| above| shown)?\b/gi, " the data ")
    .replace(/\b(is|are|was|were|as|been) (shown|presented|given|represented|illustrated)( below| above)?\b/gi, " are listed ")
    .replace(/\b(shown|presented|given) (below|above)\b/gi, " listed ")
    .replace(/\bin the form of\b/gi, " as ");
  return !detect(neutral);
}

/** Cell texts of a table, flattened with htmlToStatementV2. */
export function tableCells(tableHtml) {
  return [...String(tableHtml).matchAll(/<(td|th)\b[^>]*>([\s\S]*?)<\/\1>/gi)]
    .map((c) => htmlToStatementV2(c[2]))
    .filter(Boolean);
}

/**
 * Find the span of `text` that contains every cell string in order, separated
 * only by whitespace. Returns [start, end] or null.
 */
export function locateCells(text, cells) {
  if (cells.length < 2) return null;
  let from = 0;
  while (true) {
    const start = text.indexOf(cells[0], from);
    if (start === -1) return null;
    let pos = start + cells[0].length;
    let ok = true;
    const actual = [cells[0]];
    for (const cell of cells.slice(1)) {
      const gap = text.slice(pos).match(/^[\s:]*/)[0].length;
      const p = pos + gap;
      let got = null;
      if (text.startsWith(cell, p)) got = cell;
      else if (/^\$[^$]+\$$/.test(cell)) {
        // A math cell may have been hand-corrected in the seed; accept the
        // seed's own $...$ segment if it is a close variant.
        const seg = text.slice(p).match(/^\$[^$]+\$/);
        if (seg && normalizeForMatch(seg[0]).split(" ")[0] === normalizeForMatch(cell).split(" ")[0]) got = seg[0];
      }
      if (!got) {
        ok = false;
        break;
      }
      actual.push(got);
      pos = p + got.length;
    }
    if (ok) return [start, pos, actual];
    from = start + 1;
  }
}

/** Build a $$\\begin{array}$$ block from flattened cell strings and a row shape. */
export function arrayFromCells(cells, shape) {
  if (shape.reduce((a, b) => a + b, 0) !== cells.length) return "";
  const cols = Math.max(...shape);
  const rows = [];
  let i = 0;
  for (const n of shape) {
    const row = cells.slice(i, i + n).map(cellToLatex);
    i += n;
    rows.push([...row, ...Array(cols - n).fill("")].join(" & ") + " \\\\ \\hline");
  }
  return `$$\\begin{array}{|${Array(cols).fill("c").join("|")}|}\\hline ${rows.join(" ")}\\end{array}$$`;
}
