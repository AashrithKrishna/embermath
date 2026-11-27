# Dashboard Improvements Design — Math HL Question Bank

**Date:** 2026-11-10
**Status:** Approved design, pending spec review
**Builds on:** `docs/superpowers/specs/2026-11-10-question-bank-dashboard-design.md`

## Goal

Make four improvements to the IB Math HL question-bank dashboard: (1) fix math
formulas that render as raw `$...$` text, (2) add a single-question "Practice
Mode" exam view with Next/Previous pagination, (3) add real markschemes (schema
+ seed + a "Show Markscheme" toggle), and (4) rename the app to "Math HL Question
Bank".

## Architecture

A cohesive change across the existing stack: a new pure math-parsing lib hardens
the current KaTeX pipeline; the scraper captures the source `answer` field and
both courses are re-scraped; a nullable `markscheme` column flows through Drizzle
→ Express → React; a new Practice view and a reusable Markscheme panel extend the
UI; branding is updated. No router and no new runtime dependency are introduced.

## Tech Stack

React 19, Tailwind v4, shadcn/base-ui, KaTeX (existing), Drizzle ORM + mysql2,
Express 5, Node 24 (native TS type-stripping), Vitest (UI), node:test (scraper),
Playwright (scraper). User-space MySQL 9.7 on port 3307.

## Global Constraints

- Dark theme only: deep slate `#09090b`, frosted `glass-panel`, `border-zinc-800`,
  emerald/amber/rose accents. Match existing component styling.
- KaTeX stays the math engine; **no new math dependency** (react-katex/MathJax
  rejected — they do not fix the root cause).
- TDD for pure logic (math lib, scraper normalization): write the failing test
  first, watch it fail, implement minimally, watch it pass.
- Complete implementation only — no placeholders, TODOs, or partial examples.
- Workspace is **not a git repo**: do not commit; do not `git init`.
- If npm install is ever needed, use `--cache /tmp/qoder-npm-cache-3e802862`
  (the user's npm cache is root-owned). No new dependencies are expected.
- Never claim a check that was not actually run. Verify in the browser before
  reporting UI work complete.
- Keep the stack running: MySQL :3307, API :8787, Vite :5173.

## Verified Findings (premises checked against the code/data)

1. **Math already renders via KaTeX** in `src/components/questions/MathDisplay.tsx`.
   The raw-text failures are data issues:
   - **Unbalanced delimiters:** the user's example is stored as
     `"Solve the inequality $x^2 - 9 + \frac{5}{x} ."` — an opening `$` with no
     closing `$`. The current pair-matching regex `/\$\$([\s\S]+?)\$\$|\$([^$]+?)\$/g`
     leaves it as plain text.
   - **Currency signs:** statements contain `$30,000`, `$12,000`, `$32,500` which
     must NOT be treated as math delimiters.
   - **HTML entities inside math:** e.g. `&theta;`, `&deg;` (4 AI HL records) cause
     KaTeX errors.
   - **Stray backslashes / broken matrices:** ~2 AA HL + ~12 AI HL records produce
     `.katex-error` nodes (graceful red source today).
   - Counts: AA HL 434/479 statements contain `$`; AI HL 439/479. None use
     `\(`/`\[` in the stored statements (already converted to `$`).
2. **Markschemes exist at the source but were never scraped.** Neither JSON file
   has a markscheme key; `scraper/normalize.mjs` drops it. A live probe of the
   Edunade API confirmed each record has keys
   `id, question, answer, difficulty, paper, video, chapter, chapter2, chapter3, marks, type`.
   The **`answer`** field holds real worked markschemes as HTML + MathJax, e.g.
   `<p class="answers-ms"><strong>a)</strong></p><p><span class="math">\[ u_5 = u_1*r^{(5-1)} = 15*(\frac{1}{3})^4 = 0.185 \]</span></p>`.
3. **Rename scope:** `index.html` `<title>` is "AA HL Bank — Question Bank";
   `TopNav` brand is the dynamic `{course} Bank` with subtitle "Question bank".

## Decisions (confirmed with user)

- **Markschemes:** re-scrape both courses to capture the real `answer` field.
- **Math:** harden the existing KaTeX pipeline (no new package).

---

## Section 1 — Harden math rendering

### New module `src/lib/math.ts` (pure, unit-tested)

Exports:

```ts
export type MathSegment =
  | { kind: "text"; value: string }
  | { kind: "inline"; value: string }
  | { kind: "display"; value: string }

export function decodeMathEntities(input: string): string
export function normalizeLatex(input: string): string
export function parseMathSegments(text: string): MathSegment[]
export function renderMathToHtml(value: string, displayMode: boolean): string
```

**`decodeMathEntities`** — replace HTML entities that appear inside math with
LaTeX equivalents, then general entities:
- Greek/symbols → commands: `&theta;`→`\theta`, `&alpha;`→`\alpha`, `&beta;`→`\beta`,
  `&gamma;`→`\gamma`, `&delta;`→`\delta`, `&pi;`→`\pi`, `&mu;`→`\mu`,
  `&sigma;`→`\sigma`, `&lambda;`→`\lambda`, `&omega;`→`\omega`, `&phi;`→`\phi`,
  `&rho;`→`\rho`, `&tau;`→`\tau`, `&epsilon;`→`\epsilon`, `&deg;`→`^\circ`,
  `&times;`→`\times`, `&div;`→`\div`, `&pm;`→`\pm`, `&leq;`→`\leq`,
  `&geq;`→`\geq`, `&neq;`→`\neq`, `&approx;`→`\approx`, `&infty;`→`\infty`,
  `&sum;`→`\sum`, `&int;`→`\int`, `&sqrt;`→`\sqrt`, `&cdot;`→`\cdot`,
  `&ldots;`→`\ldots`, `&rightarrow;`→`\rightarrow`, `&Rightarrow;`→`\Rightarrow`,
  `&partial;`→`\partial`, `&in;`→`\in`, `&cup;`→`\cup`, `&cap;`→`\cap`,
  `&equiv;`→`\equiv`, `&sim;`→`\sim`, `&propto;`→`\propto`, `&circ;`→`\circ`,
  `&prime;`→`\prime`, `&ell;`→`\ell`, `&nabla;`→`\nabla`, `&angle;`→`\angle`,
  `&perp;`→`\perp`, `&parallel;`→`\parallel`, `&forall;`→`\forall`,
  `&exists;`→`\exists`, `&emptyset;`→`\emptyset`, `&land;`→`\land`, `&lor;`→`\lor`,
  `&neg;`→`\neg`, `&oplus;`→`\oplus`, `&otimes;`→`\otimes`, `&dots;`→`\dots`,
  `&sin;`→`\sin`, `&cos;`→`\cos`, `&tan;`→`\tan`, `&log;`→`\log`, `&ln;`→`\ln`,
  `&lim;`→`\lim`, `&exp;`→`\exp`, `&min;`→`\min`, `&max;`→`\max`.
  (Implementation uses a single mapping object; this list is representative, not
  exhaustive — cover the common Greek letters and math relations/operators.)
- General: `&nbsp;`→space, `&amp;`→`&`, `&lt;`→`<`, `&gt;`→`>`, `&quot;`→`"`,
  `&#39;`/`&apos;`→`'`, numeric `&#NN;` and `&#xHH;`→`String.fromCodePoint`.
- Case-insensitive entity names.

**`normalizeLatex`** — `trim()`, then strip a dangling trailing backslash run
(`/\\+$/` → `""`). Do not alter valid `\\` line breaks inside matrices. Best-effort;
genuinely broken fragments still degrade gracefully via KaTeX.

**`parseMathSegments`** — scan the string left to right:
1. Empty/whitespace-only input → `[]`.
2. `$$` opens display math; find the next `$$`. If found, emit a `display` segment
   with the cleaned inner content; if not found, recover by treating the remainder
   as display math.
3. A single `$`:
   - If the next non-space character is a **digit** (`0-9`), it is **currency**:
     emit the `$` as text and continue scanning (the digits remain text).
   - Otherwise it is a **math opener**: find the next `$` that is **not** followed
     by a digit (a digit-followed `$` is currency, never a closer). If found, emit
     an `inline` segment with the cleaned content between. If **not found**,
     recover: treat the remainder as inline math, trimming trailing whitespace and
     sentence punctuation (e.g. ` .`, `,`) so `$x^2 - 9 + \frac{5}{x} .` yields
     inline math `x^2 - 9 + \frac{5}{x}`.
4. All other characters accumulate into `text` segments; merge adjacent text.
5. Every math segment's value passes through `decodeMathEntities` then
   `normalizeLatex`. Text segments are left verbatim (React escapes them).

Recovery is best-effort for malformed source data; balanced delimiters (the
majority) parse exactly as today. Currency detection prevents `$30,000 ... $20,000`
from being misread as a math span.

**`renderMathToHtml`** — `katex.renderToString(value, { displayMode, throwOnError:
false, strict: false, output: "html" })`. Trust stays disabled (default); math
cannot inject HTML/links.

### `src/components/questions/MathDisplay.tsx` (modify)

Replace the local `MATH_PATTERN`/`parseSegments`/`renderMath` with imports from
`@/lib/math`. Keep the existing props (`statement`, `latex`, `imageUrl`,
`className`, `clamp`) and rendering structure: image branch; statement →
`parseMathSegments` → text/inline/display spans; fallback to `latex` as display
when there is no statement; `null` otherwise. Behavior is unchanged for clean
input; raw-text and entity cases are now fixed.

### Tests `src/lib/math.test.ts` (new, Vitest)

Cover at minimum:
- balanced inline `$x^2$` → one inline segment `x^2`.
- balanced display `$$\\frac{a}{b}$$` → one display segment.
- mixed prose + inline + display preserves order and text.
- **currency:** `"costs $30,000 and $20,000"` → a single text segment (no math).
- **currency + math:** `"for $5, solve $x=2$"` → text, inline `x=2`, text.
- **unbalanced recovery (user example):** `"Solve the inequality $x^2 - 9 + \\frac{5}{x} ."`
  → text `"Solve the inequality "` + inline `x^2 - 9 + \frac{5}{x}`.
- **entities:** `"$\\frac{8cos(&theta;)}{x}$"` → inline containing `\theta` (no `&theta;`).
- **degree entity:** `"$&deg;45$"` or `"$45&deg;$"` → contains `^\circ`.
- **trailing backslash:** `"$x^2 \\"` → normalized, no dangling `\`.
- empty/whitespace → `[]`.
- `renderMathToHtml` returns a string containing `katex` for valid input and does
  not throw for malformed input.

---

## Section 2 — Practice Mode

### Generic `src/components/ui/SegmentedControl.tsx` (new)

```ts
interface SegmentedControlProps<T extends string> {
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
  ariaLabel: string
  className?: string
}
```

Renders `role="group"` with `aria-label={ariaLabel}`; one button per option with
`aria-pressed={option.value === value}`; calls `onChange(option.value)`. Styling
matches the current `CourseToggle` (rounded-lg border-zinc-800 container; active
emerald `border-emerald-400/30 bg-emerald-400/15 text-emerald-200`; inactive
`text-zinc-400 hover:text-zinc-200`; same focus ring). Returns `null` when
`options.length === 0`.

### `src/components/layout/CourseToggle.tsx` (modify)

Refactor to delegate to `SegmentedControl`, preserving its existing props
(`courses: string[]`, `value`, `onChange`) and `aria-label="Question bank course"`.
Map `courses` → `options` (`{ value: c, label: c }`). No behavior change.

### `src/components/practice/PracticeView.tsx` (new)

```ts
interface PracticeViewProps {
  questions: Question[]        // the filtered + sorted set (App's `visible`)
  savedIds: Set<string>
  onToggleSaved: (id: string) => void
}
```

- Internal `index` state (number). `useEffect` resets `index` to `0` whenever the
  `questions` reference changes (filter/sort/course change). Current question is
  `questions[Math.min(index, questions.length - 1)]`.
- Empty set (`questions.length === 0`): render a muted "No questions match the
  current filters." message with the same glass styling.
- Single-question layout (glass panel): metadata header (exam label / paper,
  topic · subtopic, DifficultyPill, marks), full **unclamped** statement via
  `MathDisplay`, a bookmark button, and a `MarkschemePanel` (Section 3) keyed by
  `question.id` so reveal state resets per question.
- Footer controls: **Previous** button (disabled at index 0), a progress indicator
  "Question {index+1} of {questions.length}", **Next** button (disabled at last).
- Keyboard: `useEffect` keydown listener — `ArrowLeft` → previous, `ArrowRight` →
  next; ignore when the event target is an input/textarea; clamp at boundaries;
  clean up on unmount.
- Buttons use the existing `Button` primitive and emerald accent styling.

### `src/App.tsx` (modify)

- Add `const [view, setView] = useState<"browse" | "practice">("browse")`.
- Header: render a `SegmentedControl` for the view
  (`options=[{value:"browse",label:"Browse"},{value:"practice",label:"Practice"}]`,
  `ariaLabel="Dashboard view"`) alongside the existing `CourseToggle`.
- Body: `loading ? <LoadingState/> : error ? <ErrorState/> : view === "practice"
  ? <PracticeView questions={visible} savedIds={savedIds} onToggleSaved={toggleSaved}/>
  : <QuestionGrid .../>` (grid props unchanged).
- The "X of Y questions" count and Sort control remain visible in both views
  (sort defines practice order).

No router; view is local state. Practice progress is not persisted across reloads.

---

## Section 3 — Markschemes

### Scraper `scraper/normalize.mjs` (modify)

- In `fromApiRecord`, read the markscheme source:
  ```js
  const markschemeStr = clean(pick(rec, [
    "answer", "markscheme", "mark_scheme", "solution", "solution_html", "markscheme_html",
  ]));
  const markscheme = looksLikeHtml(markschemeStr) ? htmlToStatement(markschemeStr) : markschemeStr;
  ```
  Pass `markscheme` into `finalize`.
- In `fromDomRaw`, read `clean(raw.markscheme) || null` (DOM path optional; the
  Edunade network path is the one that supplies `answer`).
- In `finalize`, add `if (q.markscheme) out.markscheme = q.markscheme;` (omit when
  empty, mirroring `latex`). `isValid` and `dedupe` are unchanged (markscheme is
  optional content, not a validity/dedupe criterion).
- `htmlToStatement` already converts `\[...\]`→`$$...$$`, `\(...\)`→`$...$`, strips
  tags, and decodes entities — reused as-is for markscheme HTML.

### Re-scrape both courses

Run the existing scraper against both hubs, overwriting the JSON files (each now
includes `markscheme`):
- `node scraper/scrape.mjs --url https://academy.edunade.com/ib-hub/math-aa-hl/ --out seed_questions.json --max-pages 40`
- `node scraper/scrape.mjs --url https://academy.edunade.com/ib-hub/math-ai-hl/ --out ai_seed_questions.json --max-pages 40`

The scraper writes only after a successful crawl, so a failure leaves the existing
file intact. Counts may differ slightly from 479 if the source changed; verify the
output is a clean array with `markscheme` populated on most records.

### Database

- `drizzle/schema.ts`: add `markscheme: text("markscheme")` (nullable) to the
  `questions` table.
- Generate `drizzle/migrations/0002_add_markscheme.sql` via
  `npx drizzle-kit generate --name add_markscheme`
  (expected: `ALTER TABLE \`questions\` ADD \`markscheme\` text;`). Apply with
  `node scripts/migrate.mjs`. Existing rows get `NULL`.
- `scripts/seed.mjs`: in `toRow`, add
  `markscheme: record.markscheme ? String(record.markscheme).trim() : null`.
  It participates in the content hash (re-seed deletes all then inserts, so id
  changes are fine). Per-course counts unchanged.
- `server/index.mjs`: no change — `db.select().from(questions)` returns the new
  column automatically. **Restart the API** after migrating so it reloads the
  schema (the running process caches the old schema).

### Model `src/lib/questions.ts` (modify)

Add `markscheme: string | null` to the `Question` interface. Update
`makeQuestion` in `src/lib/questions.test.ts` and `src/lib/filter.test.ts` to
include `markscheme: null`.

### `src/components/questions/MarkschemePanel.tsx` (new)

```ts
interface MarkschemePanelProps {
  markscheme: string | null
  className?: string
  defaultOpen?: boolean
}
```

- Local `open` state (initial `defaultOpen ?? false`).
- Toggle button: Eye/EyeOff icon + label "Show markscheme" / "Hide markscheme",
  `aria-expanded={open}`. The button calls `event.stopPropagation()` so it never
  triggers a surrounding card's open-dialog overlay.
- When `markscheme` is null: render a disabled button plus a muted
  "Markscheme not available for this question." note (no crash).
- When open and present: render `MathDisplay statement={markscheme}` inside a
  bordered panel (`border-zinc-800/70 bg-black/25`), with a small "Markscheme"
  label. Math renders through the hardened pipeline (Section 1).

### Placement

- `QuestionCard.tsx`: add `MarkschemePanel` at the card bottom. Its toggle button
  needs `pointer-events-auto relative z-20` (above the absolute inset-0 open
  button), like the existing bookmark button. Revealing expands the card inline.
- `PracticeView.tsx`: include `MarkschemePanel` keyed by `question.id`.
- `QuestionDetailDialog.tsx`: replace the
  `<p>Markscheme available in a future release.</p>` with `MarkschemePanel`
  (keyed by `question.id` so it resets when the dialog opens a new question).

### Tests

- `scraper/normalize.test.mjs` (extend, node:test): `fromApiRecord` with an
  `answer` field containing HTML/MathJax produces a `markscheme` string with
  `$...$`/`$$...$$` delimiters and no HTML tags; a record without `answer` has no
  `markscheme`. Add an Edunade-like fixture record with `answer`.
- UI: `MarkschemePanel`/`PracticeView` are verified in the browser (consistent
  with the existing approach of unit-testing pure lib logic, not components).

---

## Section 4 — Rename to "Math HL Question Bank"

- `index.html`: `<title>Math HL Question Bank</title>`; meta description →
  "Browse past-paper questions for IB Mathematics: Analysis and Approaches HL and
  Applications and Interpretation HL."
- `src/components/layout/TopNav.tsx`: brand text → "Math HL Question Bank" (fixed,
  not course-dependent); subtitle → "IB Mathematics · HL". Remove the now-unused
  `course` prop from `TopNavProps` and the destructuring.
- `src/App.tsx`: stop passing `course` to `TopNav`.
- The course labels in `CourseToggle` ("AA HL"/"AI HL") stay — they identify the
  bank, not the app name. The `App` `<h1>` "Question bank" stays.
- Grep for any other "AA HL Bank" branding and update if found.

---

## File Structure

**Create:**
- `src/lib/math.ts`, `src/lib/math.test.ts`
- `src/components/ui/SegmentedControl.tsx`
- `src/components/practice/PracticeView.tsx`
- `src/components/questions/MarkschemePanel.tsx`
- `drizzle/migrations/0002_add_markscheme.sql` (+ meta, generated)

**Modify:**
- `src/components/questions/MathDisplay.tsx` (use math lib)
- `src/components/layout/CourseToggle.tsx` (delegate to SegmentedControl)
- `src/components/layout/TopNav.tsx` (rename, drop course prop)
- `src/components/questions/QuestionCard.tsx` (MarkschemePanel)
- `src/components/questions/QuestionDetailDialog.tsx` (MarkschemePanel)
- `src/App.tsx` (view state + toggle, PracticeView, TopNav prop)
- `src/lib/questions.ts` (+ markscheme), `src/lib/questions.test.ts`,
  `src/lib/filter.test.ts` (makeQuestion)
- `scraper/normalize.mjs` (+ markscheme), `scraper/normalize.test.mjs`
- `drizzle/schema.ts` (+ markscheme), `scripts/seed.mjs` (+ markscheme)
- `index.html` (title/description)
- `seed_questions.json`, `ai_seed_questions.json` (regenerated by re-scrape)

## Data Flow

Edunade API `answer` → scraper `fromApiRecord`/`htmlToStatement` → `markscheme`
in JSON → `seed.mjs` `toRow` → MySQL `questions.markscheme` → Express
`/api/questions` → `useQuestions` → `Question.markscheme` → `MarkschemePanel`
→ `MathDisplay` → hardened `math.ts` → KaTeX HTML. Practice Mode reads the same
`visible` (filtered+sorted) array the grid uses.

## Error Handling

- KaTeX `throwOnError:false, strict:false`: malformed fragments render as
  highlighted source, never crash. Entity/backslash cleaning reduces these.
- Currency-aware parsing prevents money amounts from becoming broken math.
- Null markscheme → explicit "not available" state, not an empty panel or crash.
- Empty practice set → friendly message; index clamped to valid range.
- Re-scrape writes only on success; existing JSON preserved on failure.
- API must be restarted after the schema migration to pick up the new column.

## Testing & Verification

- `npx vitest run` — math lib + model tests green.
- `node --test scraper/*.test.mjs` — markscheme capture green.
- `npx tsc --noEmit` clean; `npx vite build` succeeds.
- Browser (both courses): the user's example formula renders as math (no raw
  `$`); currency stays text; Practice Mode Next/Previous + keyboard + boundary
  disabling + index reset on filter change; markscheme reveal on card, practice,
  and dialog; title + navbar show "Math HL Question Bank". Console clean.

## Out of Scope (YAGNI)

- No router (view is local state).
- No AI-generated markschemes (real source data only).
- No video solutions (source `video` field ignored — not requested).
- No new math dependency.
- No exam timer/scoring/grading in Practice Mode (pagination + markscheme reveal
  only, as specified).
- No persistence of bookmarks or practice progress across reloads.