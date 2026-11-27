// Extracts diagram/figure images from Nikolaidis question PDFs and maps each
// figure to the question number it belongs to.
//
// Pipeline:
//   1. Per-char geometry -> /tmp/diag-<short>.json (scraper/pdfextract.py)
//   2. Vector + raster figure regions -> PNGs in public/images/ and
//      /tmp/diag-regions.json (scraper/diag_extract.py)
//   3. Question spans tracked with the same state machine as splitQuestions()
//      (so geometry aligns with the question objects), regions matched by
//      vertical overlap on the same page -> /tmp/diagram-map.json
//
// Usage:
//   node scraper/diagrams.mjs

import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync, statSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { linesFromJson, splitQuestions, SECTION_RE, PAST_PAPER_RE, stripQuestionHeader } from "./pdfq.mjs";
import { isQuestionHeader, parseQuestionHeader } from "./pdfmath.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const IMAGES_DIR = path.join(ROOT, "public", "images");
const REGIONS_JSON = "/tmp/diag-regions.json";
const MAP_JSON = "/tmp/diagram-map.json";

const TOPICS = [
  { slug: "5.12-KINEMATICS", short: "kine", pdf: "/tmp/kine.pdf" },
  { slug: "1.4-GEOMETRIC-SEQUENCES", short: "seq", pdf: "/tmp/nik-seq.pdf" },
  { slug: "2.1-LINES", short: "lines", pdf: "/tmp/nik-lines.pdf" },
  { slug: "1.5-PERCENTAGE-CHANGE-FINANCIAL-APPLICATIONS", short: "pct", pdf: "/tmp/nik-pct.pdf" },
];

const MATCH_TOLERANCE = 30; // pt above/below the question span

const venvPython = () =>
  process.env.PDFQ_VENV || "/tmp/qoder-pdf-venv-3e802862/bin/python3";

function runPy(args) {
  const res = spawnSync(venvPython(), args, { encoding: "utf8" });
  if (res.status !== 0) {
    throw new Error(`python ${args.join(" ")} failed:\n${res.stderr || res.stdout}`);
  }
  return res.stdout;
}

// 1) per-char geometry for each PDF
function extractChars(topic) {
  const out = `/tmp/diag-${topic.short}.json`;
  runPy([path.join(HERE, "pdfextract.py"), topic.pdf, out]);
  return out;
}

// 2) figure regions + PNG crops
function extractRegions() {
  const spec = TOPICS.map((t) => ({ slug: t.slug, pdf: t.pdf }));
  const specPath = "/tmp/diag-spec.json";
  writeFileSync(specPath, JSON.stringify(spec), "utf8");
  mkdirSync(IMAGES_DIR, { recursive: true });
  runPy([path.join(HERE, "diag_extract.py"), specPath, IMAGES_DIR, REGIONS_JSON]);
  return JSON.parse(readFileSync(REGIONS_JSON, "utf8"));
}

// Mirrors splitQuestions() so each returned question object can be matched to
// the geometry span of the same lines (aligned by ordinal position).
function trackQuestionSpans(lines) {
  const state = { section: null, skip: false, current: null };
  const spans = [];
  const finish = () => {
    if (state.current && state.current.hasContent) {
      spans.push({
        number: state.current.number,
        section: state.current.section,
        pages: [...state.current.pages.entries()].map(([page, g]) => ({ page, ...g })),
      });
    }
    state.current = null;
  };
  for (const line of lines) {
    const text = line.text;
    const sec = text.match(SECTION_RE);
    if (sec) {
      state.section = sec[1].toUpperCase();
      state.skip = PAST_PAPER_RE.test(text);
      finish();
      continue;
    }
    if (/^[A-Z]\.\s/.test(text) && PAST_PAPER_RE.test(text)) {
      state.skip = true;
      finish();
      continue;
    }
    if (state.skip) continue;
    if (isQuestionHeader(text)) {
      finish();
      const h = parseQuestionHeader(text);
      const rest = stripQuestionHeader(text);
      state.current = {
        number: h.number,
        section: state.section,
        hasContent: !!rest.trim(),
        pages: new Map([[line.page, { top: line.top, bottom: line.bottom }]]),
      };
      continue;
    }
    if (state.current) {
      state.current.hasContent = true;
      const g = state.current.pages.get(line.page);
      if (g) g.bottom = Math.max(g.bottom, line.bottom);
      else state.current.pages.set(line.page, { top: line.top, bottom: line.bottom });
    }
  }
  finish();
  return spans;
}

const contains = (outer, inner, eps = 0.5) =>
  outer[0] <= inner[0] + eps &&
  outer[1] <= inner[1] + eps &&
  outer[2] >= inner[2] - eps &&
  outer[3] >= inner[3] - eps;

const overlapsVertically = (regionBbox, top, bottom) =>
  regionBbox[3] > top && regionBbox[1] < bottom;

function matchRegions(topic, questions, spans, regions) {
  const slugRegions = regions.filter((r) => r.slug === topic.slug);
  const used = new Set();
  const mappings = [];
  const unmatched = new Set(slugRegions.map((r) => r.imagePath));

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const span = spans[i];
    if (!span || span.number !== q.number) {
      console.warn(`WARN ${topic.slug}: question/span mismatch at #${i} (${q.number} vs ${span?.number})`);
    }
    if (!span) continue;

    const candidates = [];
    for (const pg of span.pages) {
      const top = pg.top - MATCH_TOLERANCE;
      const bottom = pg.bottom + MATCH_TOLERANCE;
      for (const r of slugRegions) {
        if (r.pdfPage !== pg.page) continue;
        if (used.has(r.imagePath)) continue;
        if (!overlapsVertically(r.bbox, top, bottom)) continue;
        candidates.push(r);
      }
    }
    // Drop a candidate whose bbox sits inside another matched candidate.
    const kept = candidates.filter(
      (r) => !candidates.some((o) => o !== r && contains(o.bbox, r.bbox))
    );
    // First region wins (sorted by page, then region idx = top-to-bottom).
    kept.sort((a, b) => a.pdfPage - b.pdfPage || a.idx - b.idx);
    if (!kept.length) continue;
    const first = kept[0];
    used.add(first.imagePath);
    unmatched.delete(first.imagePath);
    mappings.push({ slug: topic.slug, number: q.number, imagePath: first.imagePath });
  }
  return { mappings, unmatched: [...unmatched] };
}

function pngInfo(imagePath) {
  const full = path.join(ROOT, "public", imagePath);
  if (!existsSync(full)) return { missing: true };
  const buf = readFileSync(full);
  // IHDR: width at bytes 16-19, height at 20-23 (big-endian, 8-byte signature).
  const w = buf.readUInt32BE(16);
  const h = buf.readUInt32BE(20);
  return { w, h, bytes: statSync(full).size };
}

function main() {
  for (const t of TOPICS) extractChars(t);
  const regions = extractRegions();

  const mappings = [];
  const allUnmatched = [];
  const stats = {};

  for (const t of TOPICS) {
    const data = JSON.parse(readFileSync(`/tmp/diag-${t.short}.json`, "utf8"));
    const lines = linesFromJson(data);
    const questions = splitQuestions(lines.map((l) => l.text));
    const spans = trackQuestionSpans(lines);
    const res = matchRegions(t, questions, spans, regions);
    mappings.push(...res.mappings);
    allUnmatched.push(...res.unmatched.map((u) => ({ slug: t.slug, imagePath: u })));
    stats[t.slug] = {
      regions: regions.filter((r) => r.slug === t.slug).length,
      questions: questions.length,
      matches: res.mappings.length,
      unmatched: res.unmatched.length,
    };
  }

  writeFileSync(MAP_JSON, JSON.stringify({ mappings }, null, 2) + "\n", "utf8");

  for (const [slug, s] of Object.entries(stats)) {
    console.log(
      `${slug}: regions=${s.regions} questions=${s.questions} matches=${s.matches} unmatchedRegions=${s.unmatched}`
    );
  }
  if (allUnmatched.length) {
    console.log("unmatched regions:");
    for (const u of allUnmatched) console.log(`  ${u.slug} ${u.imagePath}`);
  }
  console.log(`wrote ${mappings.length} mappings -> ${MAP_JSON}`);

  // QA: PNG checks on mapped figures.
  const bad = [];
  let okCount = 0;
  for (const m of mappings) {
    const info = pngInfo(m.imagePath);
    if (!info || info.missing) {
      bad.push(`${m.imagePath}: missing`);
      continue;
    }
    if (info.w >= 100 && info.w <= 1200 && info.h >= 100 && info.h <= 1200 && info.bytes > 2048) {
      okCount++;
    } else {
      bad.push(`${m.imagePath}: ${info.w}x${info.h}px ${info.bytes}B`);
    }
  }
  console.log(`QA: ${okCount}/${mappings.length} mapped PNGs within 100-1200px and >2KB`);
  if (bad.length) {
    console.log("QA: outside bounds (small point diagrams are expected):");
    for (const b of bad) console.log(`  ${b}`);
  }
}

main();
