---
name: ib-question-scraper
description: Use when adding, refreshing or enriching IB Math AA HL / AI HL questions in this repo's bank (seed_questions.json, ai_seed_questions.json, paper3_seed_questions.json), when questions are missing diagrams/tables, when re-crawling Edunade, or when authoring new original questions (e.g. Paper 3). Covers the Edunade API pattern, the Playwright DOM fallback, diagram extraction rules, the record schema and the politeness/copyright rules.
---

# IB question scraper / enricher

## Pipeline (run from repo root; MySQL on 127.0.0.1:3307 via `bash scripts/mysql.sh status`)

```bash
node scripts/migrate.mjs                 # drizzle migrations 0000-0003 (0003 = source/images/markscheme_images/diagram_missing/tips)
npm run recover:diagrams -- --offline    # match seeds to cached Edunade API, write images/tables/diagram_missing
npm run repair:latex                     # deterministic LaTeX fixes (see latex-diagram-validator skill)
node scripts/seed.mjs                    # reload MySQL from all three seed JSONs (966 rows)
npm run validate                         # must print ERROR: 0
node server/index.mjs &                  # API on :8787 (skip if already listening: lsof -iTCP:8787)
curl -s http://127.0.0.1:8787/api/questions -o public/questions.json   # static fallback for the UI
node --test scraper/*.test.mjs scripts/*.test.mjs
```

Drop `--offline` (or add `--refresh`) only when you actually need fresh data; responses are cached in `scraper/cache/edunade/{aa,ai}/` (`hub.html`, `topic-<slug>.html`, `api-<chapter>.json`).

## Edunade API pattern (primary source)

1. Hubs: `https://academy.edunade.com/ib-hub/math-aa-hl/` and `.../math-ai-hl/` list topic pages `href="/ib-hub/math-<aa|ai>-hl/<slug>/"`.
2. Each topic page has inline JS `params.append('chapter', '<code>')` and fetches `/api/math-<aa|ai>-hl-questions/?chapter=<code>`. Parse with `parseTopicPage()` in `scraper/edunadeHtml.mjs`.
3. The API returns `{questions:[{id, question, answer, difficulty:"Easy|Medium|Hard", paper:"paper1|paper2", marks:"5", chapter, chapter2, chapter3, type}], metadata}`. `question`/`answer` are HTML with `\(..\)` / `\[..\]` MathJax, `<img class="medium_question" src="https://ik.imagekit.io/...">` and `<table>`s.
4. Plain `fetch` with a desktop browser User-Agent works; no browser needed.

Gotchas:
- One API question can be listed under several chapters (`chapter2/3`), and the seed bank keeps one copy per topic. Key records by `(chapter, id)`, never by `id` alone (deduping by `id` lost about 50 matches). `source_id` = `edunade:<aa|ai>:<chapter>:<id>` and is reused on reruns.
- The original flattener (`normalize.htmlToStatement`) stripped tags before protecting math, so `\(x<3\)` lost its `<`, and tables became mush ("Menu Price ($) Normal 5 Maxi 8"). Use `htmlToStatementV2()`: it protects math, converts `<table>` to `$$\begin{array}{|c|c|}\hline ...\end{array}$$` (KaTeX-checked), and drops `<img>/<svg>/<canvas>`.
- Only re-flatten a record whose text is still exactly the v1 output. Hand-edited seeds are patched in place (`replaceMangledTables` / `locateCells`), keeping their own math cells.
- Matching (`matchRecords`): exact normalised text, then a unique 80-char prefix, then token Jaccard ≥ 0.7 (statement 0.85 + markscheme 0.15). Review `reports/diagram-recovery.json` (`fuzzy`, `unmatched`) after every run.

## DOM fallback (sites without a JSON API)

`node scraper/scrape.mjs <hub-or-topic-url> [--strategy auto|network|dom] [--max-pages 30] [--delay 400]` uses Playwright with system Chrome (`/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`). It intercepts JSON responses first and falls back to DOM selectors. Scripts that import `playwright` must live inside the project directory to resolve the package. Note: the DOM path currently captures only the first `<img>` per card, so extend `extractDom()` before relying on it for diagram-heavy pages.

## Diagram extraction rules

- Capture **every** figure in document order: `<img src>`, inline `<svg>` (serialise the outerHTML into a `data:image/svg+xml` URI), `<canvas>` (`toDataURL("image/png")` inside the page), and CSS background images used as figures.
- Statement figures go in `images`; figures inside the answer/solution go in `markscheme_images`.
- **Hotlink** public `https://` URLs (e.g. ImageKit); do not download or re-host them. Use data URIs only for svg/canvas, which have no URL.
- Tables are data, not figures: convert them to `\begin{array}` in the text.
- `diagram_missing = 1` only when `detectMissingFigure(statement)` is true, there are no `images`, and `figureSatisfiedInline()` is false. ("The table below: $$\begin{array}..$$" counts as satisfied.)

## Record schema (seed JSON, snake_case; API returns camelCase)

`course` ("AA HL" | "AI HL"; required in paper3_seed_questions.json, implied by file otherwise), `year`/`session`/`timezone` (null for Edunade), `paper` ("Paper 1|2|3"), `topic` (must be an existing topic name for that course), `subtopic`, `difficulty` 1-5, `marks`, `statement`, `markscheme`, `latex` (optional), `images` [], `markscheme_images` [], `source` ("edunade" | "original" | ...), `source_id`, `diagram_missing` 0/1, `tips`.
Math goes inline using `$..$` / `$$..$$` only (the UI does not parse `\(..\)`). Write currency as `\$`.
Row ids are a sha1 of the core content fields only, so changing images/source/tips keeps ids stable.

## Authoring original questions (e.g. Paper 3)

Add records to `paper3_seed_questions.json` (each carries its own `course`). Use a plain-prose stem, parts `(a) ... [n]`, a full markscheme with `[M1] [A1] [R1] [AG]` and `[n marks]` per part summing to `marks`, `difficulty: 5`, `source: "original"`. Verify the numbers with a script, and render every math segment with `katex.renderToString(..., {throwOnError: true})`. `npm run validate` does the KaTeX check for you.

## Politeness and copyright

- Only scrape public pages that anonymous visitors can see; never log in or bypass paywalls (`type != "free"` content behind a login is out of scope).
- Wait at least 1 s between requests (`--delay 1100` is the default), never fetch in parallel, cache everything, and reuse the cache.
- Keep attribution: `source`/`source_id` on every record; images stay hotlinked to the origin.
- Do not import IBO past papers or markschemes wholesale. Original questions must be your own words.
