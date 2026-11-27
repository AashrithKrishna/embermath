// Pure mapping/validation helpers shared by the network and DOM extraction paths.
// No Playwright or DOM dependency so it can be unit-tested with node:test.

export const SESSIONS = ["May", "November"];
export const TIMEZONES = ["TZ1", "TZ2"];
export const PAPERS = ["Paper 1", "Paper 2", "Paper 3"];

const clean = (v) => (typeof v === "string" ? v.trim() : v == null ? "" : String(v).trim());

export function parseYear(v) {
  const m = clean(v).match(/(19|20)\d{2}/);
  return m ? Number(m[0]) : null;
}

export function parseSession(v) {
  const s = clean(v).toLowerCase();
  if (/nov|n\/d|winter|oct/.test(s)) return "November";
  if (/may|m\/j|summer|jun/.test(s)) return "May";
  return null;
}

export function parseTimezone(v) {
  const s = clean(v).toUpperCase().replace(/\s/g, "");
  if (/TZ2|TIMEZONE2|ZONE2/.test(s)) return "TZ2";
  if (/TZ1|TIMEZONE1|ZONE1/.test(s)) return "TZ1";
  return null;
}

export function parsePaper(v) {
  const m = clean(v).match(/paper\s*([123])/i) || clean(v).match(/\bP\s*([123])\b/i);
  return m ? `Paper ${m[1]}` : null;
}

export function parseDifficulty(v) {
  const n = Number(clean(v));
  if (Number.isFinite(n) && n >= 1 && n <= 5) return Math.round(n);
  const s = clean(v).toLowerCase();
  if (/easy|foundation|sl|basic/.test(s)) return 2;
  if (/medium|moderate|standard/.test(s)) return 3;
  if (/hard|difficult|challenge|extension/.test(s)) return 4;
  return null;
}

export function parseMarks(v) {
  const m = clean(v).match(/(\d+)\s*(?:marks?|mks?|pts?|points?)?/i);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) && n > 0 && n < 100 ? n : null;
}

// When a source omits difficulty, infer a sane 1-5 value from mark weight.
export function inferDifficulty(marks) {
  if (marks == null) return 3;
  if (marks >= 12) return 5;
  if (marks >= 9) return 4;
  if (marks >= 6) return 3;
  if (marks >= 3) return 2;
  return 1;
}

// Turn a slug ("differential-calculus") or single lowercase word into a readable label,
// while leaving already-formatted labels ("Differential calculus") untouched.
export function humanize(v) {
  const s = clean(v);
  if (!s) return "";
  if (/[-_]/.test(s)) {
    return s
      .split(/[-_]+/)
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }
  if (/^[a-z]+$/.test(s)) return s.charAt(0).toUpperCase() + s.slice(1);
  return s;
}

const decodeEntities = (s) =>
  s
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));

// Convert a question's HTML + MathJax markup into a readable prompt with KaTeX-friendly
// $...$ / $$...$$ delimiters preserved inline.
export function htmlToStatement(html) {
  let s = clean(html);
  if (!s) return "";
  s = s.replace(/\\\[([\s\S]*?)\\\]/g, (_, m) => `$$${m.trim()}$$`);
  s = s.replace(/\\\(([\s\S]*?)\\\)/g, (_, m) => `$${m.trim()}$`);
  s = s.replace(/<\s*br\s*\/?>/gi, " ");
  s = s.replace(/<\s*\/\s*(p|div|li|h[1-6])\s*>/gi, " ");
  s = s.replace(/<[^>]+>/g, "");
  s = decodeEntities(s);
  return s.replace(/\s+/g, " ").trim();
}

// Pull display-math blocks (\[...\] or $$...$$) out of HTML/markup into a single KaTeX string.
export function extractDisplayLatex(html) {
  const s = clean(html);
  if (!s) return null;
  const blocks = [];
  const re = /\\\[([\s\S]*?)\\\]|\$\$([\s\S]*?)\$\$/g;
  let m;
  while ((m = re.exec(s))) blocks.push(clean(m[1] ?? m[2]));
  const joined = blocks.filter(Boolean).join(" \\quad ");
  return joined || null;
}

const looksLikeHtml = (s) => /<[a-z][\s\S]*>/i.test(s) || /\\\(|\\\[/.test(s);

const pick = (obj, keys) => {
  for (const k of keys) {
    if (obj && obj[k] != null && obj[k] !== "") return obj[k];
  }
  return undefined;
};

// Map a flexible API record. Handles both clean JSON banks and chapter-organized
// community banks (e.g. Edunade) whose question text is HTML with embedded MathJax
// and which carry no exam year/session/timezone.
export function fromApiRecord(rec, context = {}) {
  if (!rec || typeof rec !== "object") return null;

  const questionStr = clean(pick(rec, ["statement", "question", "text", "prompt", "body", "title"]));
  const statement = looksLikeHtml(questionStr) ? htmlToStatement(questionStr) : questionStr;

  const explicitLatex = clean(pick(rec, ["latex", "tex", "katex", "equation", "math", "formula"]));
  const latex = explicitLatex || extractDisplayLatex(questionStr) || null;
  const imageUrl = clean(pick(rec, ["image_url", "imageUrl", "image", "img", "diagram_url"])) || null;

  const markschemeStr = clean(pick(rec, ["answer", "markscheme", "mark_scheme", "solution", "solution_html", "markscheme_html"]));
  const markscheme = looksLikeHtml(markschemeStr) ? htmlToStatement(markschemeStr) : markschemeStr;

  const marks = parseMarks(pick(rec, ["marks", "max_marks", "total_marks", "mark", "points"]));
  const difficulty =
    parseDifficulty(pick(rec, ["difficulty", "level", "difficulty_level", "rating"])) ??
    inferDifficulty(marks);

  const chapter = clean(pick(rec, ["chapter", "chapter_name"]));
  const secondary = clean(pick(rec, ["chapter2", "chapter3", "sub_topic", "subtopic_name", "skill"]));
  const topicRaw = context.topic || pick(rec, ["topic", "topic_name", "subject", "syllabus_topic"]) || chapter;
  const subtopicRaw =
    pick(rec, ["subtopic", "sub_topic", "subtopic_name", "skill"]) ||
    secondary ||
    (context.topic ? chapter : "");

  return finalize({
    year: parseYear(pick(rec, ["year", "exam_year", "examYear", "session_year"])),
    session: parseSession(pick(rec, ["session", "term", "exam_session", "season"])),
    timezone: parseTimezone(pick(rec, ["timezone", "tz", "time_zone", "zone"])),
    paper: parsePaper(pick(rec, ["paper", "paper_number", "exam_paper"])),
    topic: humanize(topicRaw) || null,
    subtopic: humanize(subtopicRaw) || null,
    difficulty,
    marks: marks ?? 0,
    statement,
    latex,
    imageUrl,
    markscheme,
  });
}

// Map raw strings scraped from a rendered card (DOM fallback path).
export function fromDomRaw(raw) {
  if (!raw) return null;
  const meta = clean(raw.meta);
  const marks = parseMarks(raw.marks ?? meta);
  const difficulty =
    parseDifficulty(raw.difficulty) ?? inferDifficulty(marks);
  const rawStatement = clean(raw.statement);
  return finalize({
    year: parseYear(raw.year ?? meta),
    session: parseSession(raw.session ?? meta),
    timezone: parseTimezone(raw.timezone ?? meta),
    paper: parsePaper(raw.paper ?? meta),
    topic: humanize(raw.topic) || null,
    subtopic: humanize(raw.subtopic) || null,
    difficulty,
    marks: marks ?? 0,
    statement: looksLikeHtml(rawStatement) ? htmlToStatement(rawStatement) : rawStatement,
    latex: clean(raw.latex) || extractDisplayLatex(rawStatement) || null,
    imageUrl: clean(raw.imageUrl) || null,
    markscheme: clean(raw.markscheme) || null,
  });
}

function finalize(q) {
  const out = {
    year: q.year,
    session: SESSIONS.includes(q.session) ? q.session : null,
    timezone: TIMEZONES.includes(q.timezone) ? q.timezone : null,
    paper: PAPERS.includes(q.paper) ? q.paper : null,
    topic: q.topic,
    subtopic: q.subtopic,
    difficulty: Math.min(5, Math.max(1, q.difficulty ?? 3)),
    marks: q.marks ?? 0,
    statement: q.statement,
  };
  if (q.latex) out.latex = q.latex;
  else if (q.imageUrl) out.image_url = q.imageUrl;
  if (q.markscheme) out.markscheme = q.markscheme;
  return out;
}

// A record is usable when it carries actual question content. Exam year is optional
// metadata: many community banks organize by topic/chapter and never expose a year.
export function isValid(q) {
  return Boolean(q && (q.statement || q.latex || q.image_url));
}

export function dedupe(questions) {
  const seen = new Set();
  const out = [];
  for (const q of questions) {
    const key = [q.year, q.session, q.timezone, q.paper, q.topic, q.latex || q.image_url || q.statement]
      .join("|")
      .toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(q);
  }
  return out;
}

// Detect whether a parsed JSON payload looks like a collection of question records.
// Recognizes both year-tagged exam banks and chapter-organized banks without a year.
export function findQuestionArray(payload) {
  const looksLike = (o) => {
    if (!o || typeof o !== "object" || Array.isArray(o)) return false;
    const hasContent = pick(o, ["statement", "question", "text", "prompt", "latex", "tex"]) != null;
    const hasMeta =
      pick(o, ["marks", "difficulty", "paper", "chapter", "topic", "year", "exam_year", "id"]) != null;
    return hasContent && hasMeta;
  };

  const scan = (node, depth) => {
    if (depth > 5 || node == null) return null;
    if (Array.isArray(node)) {
      const hits = node.filter(looksLike);
      if (hits.length > 0) return hits;
      for (const item of node) {
        const r = scan(item, depth + 1);
        if (r) return r;
      }
      return null;
    }
    if (typeof node === "object") {
      if (looksLike(node)) return [node];
      for (const v of Object.values(node)) {
        const r = scan(v, depth + 1);
        if (r) return r;
      }
    }
    return null;
  };
  return scan(payload, 0);
}