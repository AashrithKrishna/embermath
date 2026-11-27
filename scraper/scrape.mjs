// Node.js + Playwright scraper for IB Math AA HL community question banks.
//
// Strategy (per request):
//   1. Crawl a hub page's sub-topic links (e.g. Edunade's /ib-hub/math-aa-hl/<topic>/).
//   2. On each page, passively intercept background network/fetch responses and look
//      for a clean JSON payload of question records. If found, map it directly.
//   3. Otherwise fall back to robust DOM selectors and parse the rendered cards.
// The final, de-duplicated array is written to seed_questions.json.
//
// Usage:
//   node scraper/scrape.mjs <hub-or-topic-url> [--out seed_questions.json]
//        [--strategy auto|network|dom] [--max-pages 30] [--no-crawl] [--delay 400]
//   node scraper/scrape.mjs --demo        # runs against a bundled local fixture bank
//
// Uses the system Chrome (CHROME_PATH or a detected install) to avoid downloading browsers.
import { writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { chromium } from "playwright";
import {
  dedupe,
  findQuestionArray,
  fromApiRecord,
  fromDomRaw,
  humanize,
  isValid,
} from "./normalize.mjs";

// Endpoints that plausibly serve question data; used to stop waiting once one responds.
const API_PATTERN = /\/api\/[^?]*(question|problem|exercise|paper)|(question|problem|exercise)s?\.json/i;

function detectChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ].filter(Boolean);
  for (const p of candidates) if (existsSync(p)) return p;
  return null;
}

async function launchBrowser() {
  const executablePath = detectChrome();
  const args = ["--no-sandbox", "--disable-dev-shm-usage"];
  try {
    return await chromium.launch(
      executablePath ? { executablePath, args } : { channel: "chrome", args }
    );
  } catch (err) {
    // Fall back to Playwright's bundled Chromium if a system browser is unavailable.
    return await chromium.launch({ args });
  }
}

// Runs in the page. Collects raw fields from each rendered question card.
function extractDom() {
  const containers = Array.from(
    document.querySelectorAll(
      '[data-question], [data-question-id], .question, .question-card, article, .card, li.question, .problem'
    )
  );
  const text = (el) => (el ? el.textContent.replace(/\s+/g, " ").trim() : "");
  const first = (root, sel) => root.querySelector(sel);
  const raw = [];
  for (const el of containers) {
    // Skip wrapper elements that merely contain other candidate cards.
    if (el.querySelector('[data-question], [data-question-id], .question-card, article.question')) continue;
    const all = text(el);
    const statementEl = first(el, ".statement, .question-text, .prompt, p");
    const statement = text(statementEl) || all;
    const annotation = first(el, 'annotation[encoding="application/x-tex"]');
    const latexEl = first(el, "[data-latex], .latex, .tex");
    const img = first(el, "img.question-image, .math img, img");
    // Require some actual question content rather than an exam year (topic banks have none).
    if (!statement && !annotation && !latexEl && !img) continue;
    // Require a genuine question signal so navigation/promo cards are not mistaken for questions.
    const hasSignal =
      el.hasAttribute("data-question-id") ||
      el.querySelector('[data-question-id], .difficulty, .difficulty-badge, .marks, .statement, .question, annotation[encoding="application/x-tex"]') ||
      /\b\d+\s*(marks?|mks?|pts?|points?)\b/i.test(all) ||
      /\[\s*\d+\s*\]/.test(all);
    if (!hasSignal) continue;
    const metaEl = first(el, ".question-meta, .meta, [data-meta], .exam-info");
    const levelEl = first(el, "[data-level], .difficulty");
    const marksEl = first(el, ".marks, .mark-scheme, [data-marks]");
    raw.push({
      meta: text(metaEl) || all,
      statement,
      topic: text(first(el, ".topic, [data-topic]")),
      subtopic: text(first(el, ".subtopic, [data-subtopic]")),
      difficulty:
        (levelEl && levelEl.getAttribute("data-level")) || text(levelEl) || "",
      marks: text(marksEl) || (all.match(/\[\s*\d+\s*marks?\s*\]/i) || [""])[0],
      latex:
        (annotation && annotation.textContent.trim()) ||
        (latexEl && (latexEl.getAttribute("data-latex") || text(latexEl))) ||
        "",
      imageUrl: img ? img.getAttribute("src") : "",
    });
  }
  return raw;
}

// Runs in the page. Finds same-origin links exactly one path segment deeper than the
// hub (its sub-topic pages), ignoring navigation/account/utility links.
function discoverLinks(baseUrl) {
  const b = new URL(baseUrl);
  const basePath = b.pathname.replace(/\/+$/, "") + "/";
  const skip =
    /^(static|api|account|login|register|pricing|contact|faq|home|exam-builder|questionbank|past-papers|past-papers-topics|survey-results|privacy-policy|data-processing-terms|ib-hub)$/i;
  const out = new Set();
  for (const a of document.querySelectorAll("a[href]")) {
    let u;
    try {
      u = new URL(a.getAttribute("href"), b);
    } catch {
      continue;
    }
    if (u.origin !== b.origin) continue;
    const p = u.pathname.replace(/\/+$/, "") + "/";
    if (!p.startsWith(basePath)) continue;
    const rest = p.slice(basePath.length).replace(/\/+$/, "");
    if (!rest || rest.includes("/") || skip.test(rest)) continue;
    out.add(u.origin + p);
  }
  return Array.from(out);
}

const slugFromUrl = (url) => {
  const parts = new URL(url).pathname.split("/").filter(Boolean);
  return parts[parts.length - 1] || "";
};

// Scrape a single page with an existing browser. Returns questions plus discovered links.
export async function scrapePage(browser, url, opts = {}, context = {}) {
  const {
    strategy = "auto",
    timeout = 30000,
    apiTimeout = 10000,
    settle = 500,
    maxQuestions = Infinity,
  } = opts;
  const page = await browser.newPage();
  const payloads = [];
  // Passive interception: never blocks or modifies requests, just observes responses.
  page.on("response", async (response) => {
    try {
      const ct = response.headers()["content-type"] || "";
      const u = response.url();
      const isJson = /json/i.test(ct) || /\/api\/|graphql|\.json(\?|$)/i.test(u);
      if (!isJson || !response.ok()) return;
      payloads.push(await response.json());
    } catch {
      /* non-JSON or unreadable body — ignore */
    }
  });

  try {
    // Wait for the questions API specifically rather than full networkidle, which never
    // settles on busy sites (MathJax, PDF.js, video, chat polling).
    const apiWait = page
      .waitForResponse((r) => API_PATTERN.test(r.url()) && r.ok(), { timeout: apiTimeout })
      .catch(() => null);
    await page.goto(url, { waitUntil: "domcontentloaded", timeout });
    await apiWait;
    await page.waitForTimeout(settle);

    // A page with deeper sub-topic links is a hub, not a question page: crawl it instead
    // of DOM-scraping its navigation/promo cards.
    const links = await page.evaluate(discoverLinks, url).catch(() => []);

    let questions = [];
    let used = null;

    if (strategy === "network" || strategy === "auto") {
      for (const payload of payloads) {
        const arr = findQuestionArray(payload);
        if (arr && arr.length) {
          const mapped = arr.map((r) => fromApiRecord(r, context)).filter(isValid);
          if (mapped.length) {
            questions = mapped;
            used = "network";
            break;
          }
        }
      }
    }

    if (!questions.length && links.length === 0 && (strategy === "dom" || strategy === "auto")) {
      const raw = await page.evaluate(extractDom);
      const mapped = raw.map(fromDomRaw).filter(isValid);
      if (mapped.length) {
        questions = mapped;
        used = "dom";
      }
    }

    questions = dedupe(questions).slice(0, maxQuestions);
    return { strategy: used ?? "none", count: questions.length, questions, links };
  } finally {
    await page.close();
  }
}

// Single-page scrape (owns its browser). Kept for direct leaf URLs and tests.
export async function scrapeUrl(url, opts = {}) {
  const browser = await launchBrowser();
  try {
    const r = await scrapePage(browser, url, opts, {});
    return { strategy: r.strategy, count: r.count, questions: r.questions };
  } finally {
    await browser.close();
  }
}

// Crawl a hub: scrape it, then visit each discovered sub-topic link with one browser.
export async function crawlHub(url, opts = {}) {
  const { crawl = true, maxPages = 30, delay = 400, maxQuestions = Infinity } = opts;
  const browser = await launchBrowser();
  try {
    const first = await scrapePage(browser, url, opts, {});
    const results = [{ url, strategy: first.strategy, count: first.count }];
    const all = [...first.questions];

    if (crawl && first.links.length) {
      const links = first.links.slice(0, Math.max(0, maxPages - 1));
      for (const link of links) {
        const slug = slugFromUrl(link);
        const res = await scrapePage(browser, link, opts, { topic: humanize(slug) });
        results.push({ url: link, strategy: res.strategy, count: res.count });
        all.push(...res.questions);
        if (delay) await new Promise((r) => setTimeout(r, delay));
      }
    }

    const questions = dedupe(all).slice(0, maxQuestions);
    return { questions, count: questions.length, pages: results.length, results };
  } finally {
    await browser.close();
  }
}

function parseArgs(argv) {
  const opts = {
    strategy: "auto",
    out: "seed_questions.json",
    timeout: 30000,
    apiTimeout: 10000,
    delay: 400,
    maxPages: 30,
    crawl: true,
    demo: false,
  };
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--demo") opts.demo = true;
    else if (a === "--no-crawl") opts.crawl = false;
    else if (a === "--url") opts.url = argv[++i];
    else if (a === "--out") opts.out = argv[++i];
    else if (a === "--strategy") opts.strategy = argv[++i];
    else if (a === "--timeout") opts.timeout = Number(argv[++i]);
    else if (a === "--api-timeout") opts.apiTimeout = Number(argv[++i]);
    else if (a === "--delay") opts.delay = Number(argv[++i]);
    else if (a === "--max-pages") opts.maxPages = Number(argv[++i]);
    else if (a === "--max-questions") opts.maxQuestions = Number(argv[++i]);
    else positional.push(a);
  }
  if (!opts.url && positional.length) opts.url = positional[0];
  return opts;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  let fixture = null;
  let target = opts.url;
  if (opts.demo) {
    const { startFixtureServer } = await import("./fixtures/server.mjs");
    fixture = await startFixtureServer();
    target = `${fixture.url}/hub/`;
  }
  if (!target) {
    console.error("Provide a URL or use --demo. See scraper/scrape.mjs header.");
    process.exit(1);
  }

  try {
    const result = await crawlHub(target, opts);
    result.results.forEach((r, i) => {
      const label = opts.demo ? slugFromUrl(r.url) || "hub" : r.url;
      console.log(`[${i + 1}/${result.pages}] ${label} strategy=${r.strategy} count=${r.count}`);
    });
    await writeFile(opts.out, JSON.stringify(result.questions, null, 2) + "\n", "utf8");
    console.log(`Wrote ${result.count} questions from ${result.pages} page(s) -> ${opts.out}`);
  } finally {
    if (fixture) await fixture.close();
  }
}

// Only run the CLI when executed directly, not when imported by tests.
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}