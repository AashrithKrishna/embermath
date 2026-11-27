// Recover diagrams (and mangled tables/math) for the Edunade-sourced seed banks.
//
//   node scraper/recover-diagrams.mjs [--offline] [--refresh] [--delay 1100]
//
// 1. Crawl hubs -> topic pages -> chapter codes -> /api/math-{aa,ai}-hl-questions/?chapter=X
//    Raw responses are cached under scraper/cache/edunade/ so reruns are offline.
// 2. Match API questions to seed records by normalised text (source_id first on reruns).
// 3. Write images / markscheme_images (hotlinked URLs), source, source_id,
//    diagram_missing back into seed_questions.json / ai_seed_questions.json.
//    Records whose text is still the verbatim v1 flattening of the API HTML are
//    re-flattened with htmlToStatementV2 (tables -> \begin{array}, "<" kept in math).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { detectMissingFigure } from "./figureHeuristic.mjs";
import { htmlToStatement } from "./normalize.mjs";
import {
  extractImages,
  figureSatisfiedInline,
  replaceMangledTables,
  htmlToStatementV2,
  matchRecords,
  parseHubLinks,
  parseTopicPage,
} from "./edunadeHtml.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CACHE = path.join(root, "scraper", "cache", "edunade");
const ORIGIN = "https://academy.edunade.com";
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";

const args = process.argv.slice(2);
const OFFLINE = args.includes("--offline");
const REFRESH = args.includes("--refresh");
const DELAY = Number(args[args.indexOf("--delay") + 1]) || 1100;

const COURSES = [
  { course: "AA HL", key: "aa", hub: "/ib-hub/math-aa-hl/", file: "seed_questions.json" },
  { course: "AI HL", key: "ai", hub: "/ib-hub/math-ai-hl/", file: "ai_seed_questions.json" },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let lastFetch = 0;

async function cachedGet(urlPath, cacheFile) {
  const file = path.join(CACHE, cacheFile);
  if (existsSync(file) && !REFRESH) return readFileSync(file, "utf8");
  if (OFFLINE) throw new Error(`offline and not cached: ${cacheFile}`);
  const wait = lastFetch + DELAY - Date.now();
  if (wait > 0) await sleep(wait);
  lastFetch = Date.now();
  const res = await fetch(ORIGIN + urlPath, { headers: { "User-Agent": UA, Accept: "*/*" } });
  if (!res.ok) throw new Error(`${res.status} ${urlPath}`);
  const body = await res.text();
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, body);
  console.log(`  fetched ${urlPath}`);
  return body;
}

async function crawlCourse({ key, hub }) {
  const hubHtml = await cachedGet(hub, `${key}/hub.html`);
  const links = parseHubLinks(hubHtml, hub).filter((l) => l !== hub);
  const questions = [];
  // The same API question can be listed under several chapters (chapter2/3), and
  // the seed bank holds one copy per topic, so keep one entry per (chapter, id).
  const seen = new Set();
  for (const link of links) {
    const slug = link.slice(hub.length).replace(/\/$/, "");
    let page;
    try {
      page = await cachedGet(link, `${key}/topic-${slug}.html`);
    } catch (e) {
      console.warn(`  skip topic ${slug}: ${e.message}`);
      continue;
    }
    const { chapters, api } = parseTopicPage(page);
    for (const ch of chapters) {
      const apiPath = `/api/${api ?? `math-${key}-hl-questions`}/?chapter=${encodeURIComponent(ch)}`;
      let json;
      try {
        json = JSON.parse(await cachedGet(apiPath, `${key}/api-${ch}.json`));
      } catch (e) {
        console.warn(`  skip chapter ${ch}: ${e.message}`);
        continue;
      }
      for (const q of json.questions ?? []) {
        const key = `${ch}:${q.id}`;
        if (seen.has(key)) continue;
        seen.add(key);
        questions.push({ ...q, _chapter: ch });
      }
    }
  }
  return { links, questions };
}

const report = { generatedAt: new Date().toISOString(), courses: {} };

for (const cfg of COURSES) {
  console.log(`== ${cfg.course}`);
  const { links, questions: apiQs } = await crawlCourse(cfg);
  const file = path.join(root, cfg.file);
  const seeds = JSON.parse(readFileSync(file, "utf8"));

  // Reruns: records already carrying a source_id are bound directly.
  const sourceId = (q) => `edunade:${cfg.key}:${q._chapter}:${q.id}`;
  const byId = new Map(apiQs.map((q, i) => [sourceId(q), i]));
  const pre = new Map();
  seeds.forEach((r, i) => {
    if (r.source_id && byId.has(r.source_id)) pre.set(i, { apiIndex: byId.get(r.source_id), method: "source_id", score: 1 });
  });
  const remainingSeedIdx = seeds.map((_, i) => i).filter((i) => !pre.has(i) && (r => !r.source || r.source === "edunade")(seeds[i]));
  const usedApi = new Set([...pre.values()].map((m) => m.apiIndex));
  const freeApiIdx = apiQs.map((_, i) => i).filter((i) => !usedApi.has(i));
  const sub = matchRecords(remainingSeedIdx.map((i) => seeds[i]), freeApiIdx.map((i) => apiQs[i]));
  const matches = new Map(pre);
  for (const [si, m] of sub) matches.set(remainingSeedIdx[si], { ...m, apiIndex: freeApiIdx[m.apiIndex] });

  const stats = {
    topicPages: links.length,
    apiQuestions: apiQs.length,
    seedRecords: seeds.length,
    matched: 0,
    methods: {},
    withImages: 0,
    withMarkschemeImages: 0,
    statementsReflattened: 0,
    markschemesReflattened: 0,
    tablesConverted: 0,
    tablesPatchedInPlace: 0,
    figureSatisfiedByInlineData: 0,
    figureReferences: 0,
    diagramMissing: 0,
    unmatched: [],
  };

  seeds.forEach((rec, i) => {
    if (!rec.source) rec.source = "edunade";
    const m = matches.get(i);
    if (m && rec.source === "edunade") {
      const q = apiQs[m.apiIndex];
      stats.matched++;
      stats.methods[m.method] = (stats.methods[m.method] ?? 0) + 1;
      if (m.method === "similarity") (stats.fuzzy ??= []).push({ score: +m.score.toFixed(3), seed: rec.statement.slice(0, 70), api: q.question.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 70) });
      rec.source_id = sourceId(q);
      rec.images = extractImages(q.question);
      rec.markscheme_images = extractImages(q.answer);
      // Re-flatten only text that is still the verbatim v1 scrape output.
      const v2s = htmlToStatementV2(q.question);
      if (rec.statement === htmlToStatement(q.question) && v2s && v2s !== rec.statement) {
        rec.statement = v2s;
        stats.statementsReflattened++;
        if (/<table/i.test(q.question)) stats.tablesConverted++;
      }
      // Text was edited after the scrape: patch just the mangled table runs.
      if (/<table/i.test(q.question) && !/\\begin\{array\}/.test(rec.statement)) {
        const r = replaceMangledTables(rec.statement, q.question, htmlToStatement);
        if (r.replaced) {
          rec.statement = r.text;
          stats.tablesPatchedInPlace += r.replaced;
        }
      }
      if (q.answer) {
        const v2m = htmlToStatementV2(q.answer);
        if (rec.markscheme === htmlToStatement(q.answer) && v2m && v2m !== rec.markscheme) {
          rec.markscheme = v2m;
          stats.markschemesReflattened++;
          if (/<table/i.test(q.answer)) stats.tablesConverted++;
        }
      }
    } else if (rec.source === "edunade") {
      stats.unmatched.push(rec.statement.slice(0, 100));
    }
    rec.images = Array.isArray(rec.images) ? rec.images : [];
    rec.markscheme_images = Array.isArray(rec.markscheme_images) ? rec.markscheme_images : [];
    if (rec.images.length) stats.withImages++;
    if (rec.markscheme_images.length) stats.withMarkschemeImages++;
    const refs = detectMissingFigure(rec.statement);
    if (refs) stats.figureReferences++;
    const inline = refs && rec.images.length === 0 && figureSatisfiedInline(rec.statement, detectMissingFigure);
    if (inline) stats.figureSatisfiedByInlineData++;
    rec.diagram_missing = refs && rec.images.length === 0 && !inline ? 1 : 0;
    if (rec.diagram_missing) stats.diagramMissing++;
  });

  stats.matchRate = `${((100 * stats.matched) / seeds.length).toFixed(1)}%`;
  writeFileSync(file, JSON.stringify(seeds, null, 2) + "\n");
  report.courses[cfg.course] = stats;
  const { unmatched, ...summary } = stats;
  console.log(summary);
  if (unmatched.length) console.log(`  ${unmatched.length} unmatched (see reports/diagram-recovery.json)`);
}

mkdirSync(path.join(root, "reports"), { recursive: true });
writeFileSync(path.join(root, "reports", "diagram-recovery.json"), JSON.stringify(report, null, 2) + "\n");
console.log("Wrote reports/diagram-recovery.json");
