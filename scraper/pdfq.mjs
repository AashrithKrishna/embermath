// Driver that turns a Nikolaidis topic PDF pair (questions + solutions) into
// question records: extracts per-character geometry via scraper/pdfextract.py,
// reconstructs lines with scraper/pdfmath.mjs, splits sections/questions,
// aligns markschemes from the solutions PDF, and validates every math segment
// with KaTeX.
//
// Usage:
//   node scraper/pdfq.mjs <course> <slug> <topic> <questions.pdf> <solutions.pdf> [--out file.json]
//
// Course is "AA" or "AI" (stored as "AA HL" / "AI HL"). The topic name is
// humanized from the slug by default (5.12-KINEMATICS -> Kinematics).

import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import katex from "katex";

import {
  buildLines,
  latexifyLine,
  isQuestionHeader,
  parseQuestionHeader,
} from "./pdfmath.mjs";

export const SECTION_RE = /^(O|A|B)\.\s+(Practice questions|Exam style questions)/i;
export const PAST_PAPER_RE = /past\s*paper/i;

export function stripQuestionHeader(text) {
  return text
    .replace(/^\d+\.\s*\[Maximum mark:\s*\d+\]\s*(?:\[without GDC\]\s*)?/i, "")
    .trim();
}

export function isNoiseLine(text) {
  const bare = text.replace(/^\$|\$$/g, "").trim();
  if (/^\d{1,3}$/.test(bare)) return true;
  if (/^Page \d+/i.test(bare)) return true;
  if (/^Compiled by/i.test(bare)) return true;
  if (/^\[Math-AA/i.test(bare)) return true;
  if (/^SOLUTIONS$/i.test(bare)) return true;
  if (/^[A-Z][A-Z\s]{2,29}$/.test(bare)) return true;
  return false;
}

const skipPastPaper = (text, state) => {
  if (/^[A-Z]\.\s/.test(text) && PAST_PAPER_RE.test(text)) {
    state.skip = true;
    state.current = null;
    return true;
  }
  return false;
};

export function splitQuestions(lines) {
  const state = { section: null, skip: false, current: null };
  const out = [];
  for (const text of lines) {
    const sec = text.match(SECTION_RE);
    if (sec) {
      state.section = sec[1].toUpperCase();
      state.skip = PAST_PAPER_RE.test(text);
      state.current = null;
      continue;
    }
    if (skipPastPaper(text, state)) continue;
    if (state.skip) continue;
    if (isQuestionHeader(text)) {
      const h = parseQuestionHeader(text);
      state.current = {
        number: h.number,
        marks: h.marks,
        gdc: h.gdc,
        section: state.section,
        lines: [],
      };
      const rest = stripQuestionHeader(text);
      if (rest) state.current.lines.push(rest);
      out.push(state.current);
      continue;
    }
    if (state.current) state.current.lines.push(text.trim());
  }
  return out.filter((q) => q.lines.some((l) => l.trim()));
}

export function parseSolutionBlocks(lines) {
  const state = { section: null, skip: false, current: null };
  const out = [];
  for (const text of lines) {
    const sec = text.match(SECTION_RE);
    if (sec) {
      state.section = sec[1].toUpperCase();
      state.skip = PAST_PAPER_RE.test(text);
      state.current = null;
      continue;
    }
    if (skipPastPaper(text, state)) continue;
    if (state.skip) continue;
    const m = text.match(/^(\d+)\.\s+(.*)$/);
    if (m) {
      state.current = { number: Number(m[1]), section: state.section, lines: [] };
      if (m[2].trim()) state.current.lines.push(m[2].trim());
      out.push(state.current);
      continue;
    }
    if (state.current) state.current.lines.push(text.trim());
  }
  return out.filter((b) => b.lines.some((l) => l.trim()));
}

export function alignSolutions(questions, solutions) {
  const sMap = new Map(solutions.map((s) => [`${s.section}:${s.number}`, s]));
  const byNumber = new Map();
  for (const s of solutions) {
    if (!byNumber.has(s.number)) byNumber.set(s.number, []);
    byNumber.get(s.number).push(s);
  }
  return questions.map((q) => {
    let sol = sMap.get(`${q.section}:${q.number}`);
    if (!sol) {
      const candidates = byNumber.get(q.number) || [];
      sol =
        candidates.find((c) => c.section == null || q.section == null) || null;
    }
    return { ...q, solution: sol ? sol.lines.join("\n") : null };
  });
}

// Lines reconstructed from a pdfextract JSON dump, with page + geometry kept
// for later diagram matching.
export function linesFromJson(data, opts = {}) {
  const out = [];
  for (const page of data.pages) {
    for (const line of buildLines(page.chars)) {
      const text = latexifyLine(line, opts).trim();
      if (!text || isNoiseLine(text)) continue;
      out.push({
        text,
        page: page.index,
        top: Math.min(...line.chars.map((c) => c.top)),
        bottom: Math.max(...line.chars.map((c) => c.bottom)),
        x0: Math.min(...line.chars.map((c) => c.x0)),
        x1: Math.max(...line.chars.map((c) => c.x1)),
      });
    }
  }
  return out;
}

// Every $...$ segment must render with KaTeX; returns error strings for QA.
export function validateMath(text) {
  const errors = [];
  for (const m of text.matchAll(/\$+([^$]+)\$+/g)) {
    try {
      katex.renderToString(m[1], { throwOnError: true });
    } catch (err) {
      errors.push(`${m[1].slice(0, 60)} -> ${err.message.slice(0, 80)}`);
    }
  }
  return errors;
}

const humanize = (slug) =>
  slug
    .replace(/^[\d.]+-/, "")
    .split("-")
    .map((w) => w[0] + w.slice(1).toLowerCase())
    .join(" ");

const SECTION_LABEL = {
  O: "Practice",
  A: "Exam style (short)",
  B: "Exam style (long)",
};

const venvPython = () =>
  process.env.PDFQ_VENV || "/tmp/qoder-pdf-venv-3e802862/bin/python3";

function extractPdf(pdfPath) {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const jsonPath = `${pdfPath}.json`;
  const res = spawnSync(
    venvPython(),
    [path.join(here, "pdfextract.py"), pdfPath, jsonPath],
    { encoding: "utf8" }
  );
  if (res.status !== 0) {
    throw new Error(`pdfextract failed for ${pdfPath}: ${res.stderr}`);
  }
  return JSON.parse(readFileSync(jsonPath, "utf8"));
}

export function extractTopic({ course, slug, topic, questionsPdf, solutionsPdf }) {
  const qData = extractPdf(questionsPdf);
  const sData = extractPdf(solutionsPdf);

  const qLines = linesFromJson(qData);
  const sLines = linesFromJson(sData, { solutions: true });

  const questions = splitQuestions(qLines.map((l) => l.text));
  const solutions = parseSolutionBlocks(sLines.map((l) => l.text));
  const aligned = alignSolutions(questions, solutions);

  const courseName = course.toUpperCase() === "AI" ? "AI HL" : "AA HL";
  const records = [];
  const qa = [];
  for (const q of aligned) {
    const statement = q.lines.join("\n");
    const record = {
      course: courseName,
      topic: topic || humanize(slug),
      subtopic: q.section ? SECTION_LABEL[q.section] || null : null,
      chapter: slug,
      number: q.number,
      marks: q.marks,
      gdc: q.gdc,
      statement,
      markscheme: q.solution,
      tips: null,
      image_url: null,
      diagram_missing: 0,
      source: "Christos Nikolaidis",
    };
    const errors = validateMath(statement);
    if (errors.length) qa.push({ chapter: slug, number: q.number, errors });
    if (q.solution) {
      const sErrors = validateMath(q.solution);
      if (sErrors.length) qa.push({ chapter: slug, number: q.number, solutionErrors: sErrors });
    }
    records.push(record);
  }
  return { records, qa };
}

async function main() {
  const argv = process.argv.slice(2);
  const flags = { out: null };
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--out") flags.out = argv[++i];
    else positional.push(argv[i]);
  }
  const [course, slug, topic, questionsPdf, solutionsPdf] = positional;
  if (!course || !slug || !questionsPdf || !solutionsPdf) {
    console.error(
      "Usage: node scraper/pdfq.mjs <AA|AI> <slug> <topic> <questions.pdf> <solutions.pdf> [--out file.json]"
    );
    process.exit(2);
  }
  const { records, qa } = extractTopic({
    course,
    slug,
    topic: topic || humanize(slug),
    questionsPdf,
    solutionsPdf,
  });
  const out = JSON.stringify({ records, qa }, null, 2) + "\n";
  if (flags.out) {
    writeFileSync(flags.out, out, "utf8");
    console.log(`wrote ${records.length} records -> ${flags.out}`);
  } else {
    console.log(out);
  }
  if (qa.length) {
    console.error(`\nQA issues: ${qa.length}`);
    for (const q of qa.slice(0, 10)) {
      console.error(`  ${q.chapter} #${q.number}: ${(q.errors || q.solutionErrors || []).join(" | ").slice(0, 200)}`);
    }
  }
}

// Runs only when executed directly (tests import the pure functions).
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
