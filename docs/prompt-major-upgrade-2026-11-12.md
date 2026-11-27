# Master Prompt — "Math HL Question Bank" Major Upgrade

Paste everything below this line into an agentic coding AI and let it run from start to finish.

---

You are a senior full-stack engineer and elite frontend architect with strong UI/UX taste. Execute this entire task end-to-end in the existing project. Deliver only complete, working, verified software — no placeholders, no TODOs, no partial features, no follow-up questions. Verify everything you claim in a real browser.

## Project context (read this first)

- **Workspace:** `/Users/aashrith/Documents/Qoder/2026-11-10/3e802862` — this is **NOT a git repo**. Do not `git init` or commit unless the user explicitly asks.
- **Stack:** Vite 7 + React 19 + TypeScript, Tailwind CSS 4, shadcn-style components on `@base-ui/react`, `lucide-react` icons, **KaTeX** for all math rendering. **Do not add any new math dependency** — KaTeX stays.
- **Data layer:** user-space MySQL on `127.0.0.1:3307` (start with `bash scripts/mysql.sh start`), Drizzle ORM schema (`server/db.mjs`, 14 columns incl. `course` and `markscheme`), Express 5 API at `server/index.mjs` on port 8787 with one endpoint `GET /api/questions` returning all rows. Migrations via `node scripts/migrate.mjs`, seeding via `node scripts/seed.mjs` from `seed_questions.json` (AA HL) and `ai_seed_questions.json` (AI HL). Scraper lives in `scraper/scrape.mjs` with tests in `scraper/*.test.mjs` (run `node --test scraper/*.test.mjs`).
- **Frontend data flow:** `src/lib/api.ts` fetches `/api/questions` (Vite dev proxy) and **falls back to the bundled `/questions.json`** (in `public/`, generated from the API). The production site is fully static — `public/questions.json` must be regenerated after every data change with: `curl -s http://127.0.0.1:8787/api/questions -o public/questions.json`.
- **Dev orchestration:** `npm run dev` (spawns API + Vite via `scripts/dev.mjs`; UI at `http://localhost:5173`, API at `http://127.0.0.1:8787`). Build: `npm run build` (runs `tsc --noEmit && vite build` → `dist/`). Unit tests: `npx vitest run`.
- **npm caveat:** always install with `--cache /tmp/qoder-npm-cache-3e802862` (the user's npm cache is root-owned and must not be touched). Never silently install system dependencies.
- **Math parsing:** `src/lib/math.ts` is a hardened `$`/`$$` delimiter parser (currency disambiguation, bare-LaTeX runs, entity decoding, escaped dollars). It has 34 passing tests in `src/lib/math.test.ts`. Any parser change must follow TDD against this file. Corpus diagnostics: seed JSONs contain statements + markschemes; check with a quick node script after parser changes.
- **Current data:** 958 questions (479 AA HL + 479 AI HL), 100% with markschemes.
- **Live deployment (already published and public):** https://math-hl-question-bank-aiop0fs0u1h.qoder.website
  - Qoder Sites IDs — reuse these exactly: `projectId: 01a1cdec-b3da-7caf-b817-89fd62acca77`, `siteId: 01a1cdec-b3dd-700e-8cef-eaf2d6fd8305`.
  - Redeploy workflow: generate a **new actionId (UUID)** for each changed build → `prepare_site` (MCP tool `mcp__plugin_sites_qoder_sites__prepare_site`) with `{actionId, projectId, projectRoot: "/Users/aashrith/Documents/Qoder/2026-11-10/3e802862", webDirectory: "dist", spa: false}` → poll `get_publish_status` until `canPublish: true` → `publish_site` → verify `published: true`. The site must remain **public** (currently `mode: public`). If running on Qoder Desktop, finish with `show_publish_confirmation` using the same actionId and use its `deliveryMarkdown` as the final delivery line.

## The mission

1. Open the deployed site, hunt down and fix **formatting errors**.
2. **Scrape more questions** from three new sources so the bank exceeds **1000+ questions**.
3. Add new features: **inbuilt data booklet**, **Desmos sidebar**, **revision notes + method tips**.
4. **Redesign the UI**: dark background, **amethyst purple** + **oxidised green (verdigris)** accents, professional-grade, "made for lazy people".
5. Make navigation/loading delightful: **skeleton loading animations**, **transitions** on navigation and Next/Previous, **slight hover enlargement** on interactive elements.
6. Redeploy and verify everything live.

## Task 0 — Live-site formatting audit (do first)

Open https://math-hl-question-bank-aiop0fs0u1h.qoder.website in a browser. Inspect both courses, Browse and Practice modes, and at least 30 questions each (including long markschemes). Hunt for:

- Raw LaTeX leaking into prose (e.g. visible `\frac`, `$...$`, `\ ` artifacts, HTML entities like `&deg;` shown literally).
- Misparsed math (currency mistaken for math or vice versa, broken `$$` blocks, truncated display formulas).
- Layout bugs: overflow on long formulas, broken markscheme panels, mobile/responsive breakage.

For every defect: reproduce it in the seed data, write a failing test in `src/lib/math.test.ts` (or the relevant component test), fix the pipeline (usually `src/lib/math.ts` or the `MathDisplay` component), watch it pass. Then rebuild and redeploy so the live site reflects the fixes.

## Task 1 — Scrape expansion (target: 1000+ total questions)

Add at least ~200–400 new, high-quality AA HL and AI HL questions **with markschemes** from these sources:

1. **Christos Nikolaidis** — https://www.christosnikolaidis.com/ (Math AA and Math AI: exercise pages per topic, tests; lecture notes and formula booklets for Task 2 content).
2. **Revision Hub** — https://revisionhub.study/ (free question banks with mark schemes, organized by subject/paper/topic/difficulty).
3. **IB Docs archive** — https://ibdocs.re/ (use for catalog/metadata and specimen papers only).

Hard rules:
- Only scrape **publicly accessible, free content**. Respect `robots.txt` and each site's ToS. Skip anything behind login, paywall, or "teachers only" walls. Rate-limit politely (≥ 1s between requests, small batches).
- **Copyright guardrail:** do not wholesale reproduce official IBO past papers/markschemes (IBO copyright). Prefer original exam-style questions (Nikolaidis's own exercises, Revision Hub's exam-style banks) and self-written content. For anything compiled, paraphrase question statements and write markschemes in your own words, and keep a `source` attribution field.
- **Schema:** add a `source` text column via a new Drizzle migration (follow the existing expand-and-contract pattern in `server/db.mjs`; update `src/lib/questions.ts` `Question` type, the scraper, and seeding logic consistently). Store provenance for every new question (e.g. `"christos-nikolaidis"`, `"revision-hub"`).
- Follow the existing scraper patterns (`scraper/scrape.mjs`, TDD with `node --test`), but the scraped output must land in the same seed pipeline: extend `seed_questions.json` / `ai_seed_questions.json` (or add a third `extra_seed_questions.json` wired into `scripts/seed.mjs`) with correct topic/subtopic/course mapping, difficulty, marks, year/session where known (null otherwise), and **markscheme text**.
- After scraping: migrate + seed the local MySQL, verify counts via `GET /api/questions` (must exceed 1000 rows with both courses represented and >95% markscheme coverage), then regenerate `public/questions.json`.

## Task 2 — New features

**A. Inbuilt data booklet.** A searchable, topic-organized formula reference built into the app (own page or drawer, reachable from the nav). Write the formulas **yourself** — do not copy the IBO data booklet verbatim. Cover both courses: algebra, functions, trig, calculus, probability/stats (AA and AI variants), complex numbers, matrices/vectors. Nikolaidis's free formula booklets are a good reference for content. Integrate KaTeX for the formulas.

**B. Desmos sidebar.** A collapsible right-side drawer with an embedded **Desmos graphing calculator**, using the official Desmos API (https://www.desmos.com/api/v1.9/docs/index.html — free, no API key). Lazy-load the calculator only when the drawer is first opened (code-split the loader). Pre-seed the calculator with the current question's expression when it's graphable (parse simple `y = ...` expressions from statements as a best effort). Keep it per-question in Practice mode and globally available in Browse mode.

**C. Quick revision notes + Tips.** 
- Add a "Tips" panel to question cards and the detail dialog: short, method-focused notes ("how to approach this", key formula, common mistake) for **important questions** — auto-flag important questions by heuristic (exam-style markers, marks ≥ threshold, topic coverage) and/or manual curation. Tips must be stored in the DB (new nullable `tips` column, migration) so they survive static export.
- Add a "Quick revision" section/page: concise method summaries per topic (2–6 lines each) with an example in KaTeX, collapsible accordion, searchable.

## Task 3 — UI redesign (dark, amethyst + oxidised green, professional, lazy-friendly)

**Visual direction:** deep near-black background (slightly purple-tinted, e.g. `#0E0B14`-family), surfaces a step lighter, **amethyst purple** as the primary accent (e.g. `#9D6BFF` with a deeper `#7C4DFF`), **oxidised green / verdigris** as the secondary accent (e.g. `#4FA37F`-family). High contrast text, generous spacing, refined typography (existing Geist/Inter are fine). Consistent elevation, borders, and focus rings. All existing components (cards, dialogs, filter rail, segmented controls, markscheme panels, Practice view) must be re-themed to this system — no leftover light-theme colors.

**"Made for lazy people" UX — required:**
- **Skeleton loading animation** for question cards while data loads (shimmering placeholders matching card layout; also a skeleton for the practice question view).
- **Transitions**: smooth animated transitions between Browse ↔ Practice, on Next/Previous question changes (subtle slide/fade), on dialog opens, on markscheme expand, on filter changes. Respect `prefers-reduced-motion`.
- **Hover enlargement**: interactive elements (cards, buttons, nav items, segmented controls) get a slight scale-up (e.g. 1.01–1.03) plus color lift on hover/focus.
- **Keyboard shortcuts**: `/` focuses search, `←`/`→` for Previous/Next in Practice, `M` toggles markscheme, `D` opens Desmos, `Esc` closes dialogs. Show them in a small hints popover.
- **Zero-friction defaults**: remember last course/view/sort in `localStorage`, one-click course switch without losing scroll position, back-to-top button, instant client-side search with debounce, results count always visible, obvious empty states.
- Mobile: all of the above must work on small screens (Desmos drawer becomes bottom sheet, Practice controls sticky at bottom).

**Design research (do this before coding the UI):** study the design philosophy of Awwwards, Mobbin, Dribbble, and Refactoring UI / Linear's design system for dark, polished app design; study the user experience of top practice/revision products — Revision Village, RevisionDojo, Brilliant, Khan Academy, Duolingo, and LeetCode — and steal their best patterns (progressive disclosure, instant feedback, streaks/progress feel, keyboard-first navigation). Apply your available frontend-design skill. The result must feel like a premium product, not a template.

## Task 4 — Data pipeline, rebuild, redeploy, verify

1. Migrate + seed the DB with the new questions/tips/source columns; verify `GET /api/questions` returns **1000+ rows**, both courses, >95% markschemes.
2. Regenerate `public/questions.json`, run `npm run build`, then serve `dist/` statically (e.g. `python3 -m http.server 4173 --bind 127.0.0.1 --directory dist`) and do a full browser pass: both courses, Browse/Practice, Next/Previous, markscheme reveal, tips panels, data booklet, Desmos drawer, skeletons, transitions, hover effects, keyboard shortcuts, mobile viewport. Console must be clean except the expected single 404 for `/api/questions` (the static fallback trigger).
3. Run the full suites: `npx vitest run`, `node --test scraper/*.test.mjs`, `npx tsc --noEmit`.
4. Redeploy via Qoder Sites (workflow in Project context above), verify `published: true` and the live URL renders the new build anonymously (200 on `/`, 200 on `/questions.json`), keep the site **public**.

## Process rules

- TDD for all pure logic (parser, scraping transforms, filters, tips heuristics). Watch tests fail first.
- Do not touch the math engine choice (KaTeX) and do not add new heavy dependencies without justification.
- Keep the local dev stack running between sessions (`npm run dev`).
- Small, verifiable increments: QA fixes → scrapes → features → theme → polish → redeploy.
- Everything you report as done must have been actually verified in a browser.

## Acceptance checklist (all must be true before you stop)

- [ ] Live site loads anonymously with no formatting errors across 30+ sampled questions in both courses.
- [ ] Question bank totals 1000+ questions, both AA HL and AI HL, >95% with markschemes, all with source attribution.
- [ ] Inbuilt data booklet, Desmos sidebar, Tips panels, and Quick revision notes all work end-to-end on the live site.
- [ ] Dark amethyst/verdigris theme applied everywhere; no light-theme leftovers.
- [ ] Skeleton loaders, view/question transitions, and hover enlargement visible and smooth; reduced-motion respected.
- [ ] Keyboard shortcuts and lazy-friendly defaults (remembered state, sticky controls, back-to-top) working.
- [ ] Mobile layout verified.
- [ ] All test suites pass; production build clean; console clean on live site (except the known `/api/questions` fallback 404).
- [ ] New build published and verified `published: true`, site remains public.
