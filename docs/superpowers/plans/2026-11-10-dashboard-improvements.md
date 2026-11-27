# Dashboard Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix raw-text math rendering, add a single-question Practice Mode, add real markschemes (re-scrape + schema + UI toggle), and rename the app to "Math HL Question Bank".

**Architecture:** A new pure `math.ts` lib hardens the existing KaTeX pipeline; the scraper captures the source `answer` field and both courses are re-scraped; a nullable `markscheme` column flows Drizzle → Express → React; a Practice view and reusable Markscheme panel extend the UI; branding is updated. No router, no new dependency.

**Tech Stack:** React 19, Tailwind v4, shadcn/base-ui, KaTeX, Drizzle + mysql2, Express 5, Node 24, Vitest, node:test, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-10-dashboard-improvements-design.md`

## Global Constraints

- Dark theme: `#09090b`, `glass-panel`, `border-zinc-800`, emerald/amber/rose accents; match existing styling.
- KaTeX stays the engine; no new math dependency.
- TDD for pure logic: failing test first, watch it fail, minimal implement, watch it pass.
- Complete implementation only — no placeholders/TODOs.
- Workspace is NOT a git repo: do not commit, do not `git init`. (Skip all commit steps.)
- If npm install needed: `--cache /tmp/qoder-npm-cache-3e802862`. No new deps expected.
- Never claim an unrun check. Browser-verify UI before reporting complete.
- Keep stack running: MySQL :3307, API :8787, Vite :5173. Restart API after schema migration.

## File Structure

**Create:** `src/lib/math.ts`, `src/lib/math.test.ts`, `src/components/ui/SegmentedControl.tsx`, `src/components/practice/PracticeView.tsx`, `src/components/questions/MarkschemePanel.tsx`, `drizzle/migrations/0002_add_markscheme.sql` (generated).

**Modify:** `MathDisplay.tsx`, `CourseToggle.tsx`, `TopNav.tsx`, `QuestionCard.tsx`, `QuestionDetailDialog.tsx`, `App.tsx`, `src/lib/questions.ts` (+tests), `src/lib/filter.test.ts`, `scraper/normalize.mjs` (+test), `drizzle/schema.ts`, `scripts/seed.mjs`, `index.html`, `seed_questions.json`, `ai_seed_questions.json`.

---

### Task 1: Pure math lib (`math.ts`)

**Files:**
- Create: `src/lib/math.ts`
- Test: `src/lib/math.test.ts`

**Interfaces:**
- Produces: `MathSegment`, `decodeMathEntities(input:string):string`, `normalizeLatex(input:string):string`, `parseMathSegments(text:string):MathSegment[]`, `renderMathToHtml(value:string,displayMode:boolean):string`.

- [ ] **Step 1: Write the failing test** — `src/lib/math.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import {
  decodeMathEntities,
  normalizeLatex,
  parseMathSegments,
  renderMathToHtml,
} from "./math"

describe("parseMathSegments", () => {
  it("returns [] for empty or whitespace input", () => {
    expect(parseMathSegments("")).toEqual([])
    expect(parseMathSegments("   ")).toEqual([])
  })

  it("parses balanced inline math", () => {
    expect(parseMathSegments("solve $x^2$ now")).toEqual([
      { kind: "text", value: "solve " },
      { kind: "inline", value: "x^2" },
      { kind: "text", value: " now" },
    ])
  })

  it("parses balanced display math", () => {
    expect(parseMathSegments("$$\\frac{a}{b}$$")).toEqual([
      { kind: "display", value: "\\frac{a}{b}" },
    ])
  })

  it("treats currency dollars as text", () => {
    expect(parseMathSegments("costs $30,000 and $20,000")).toEqual([
      { kind: "text", value: "costs $30,000 and $20,000" },
    ])
  })

  it("separates currency from real math", () => {
    expect(parseMathSegments("for $5, solve $x=2$")).toEqual([
      { kind: "text", value: "for $5, solve " },
      { kind: "inline", value: "x=2" },
    ])
  })

  it("recovers an unbalanced opener (user example)", () => {
    expect(parseMathSegments("Solve the inequality $x^2 - 9 + \\frac{5}{x} .")).toEqual([
      { kind: "text", value: "Solve the inequality " },
      { kind: "inline", value: "x^2 - 9 + \\frac{5}{x}" },
    ])
  })

  it("does not close math on a currency dollar", () => {
    expect(parseMathSegments("$x=2$ then $30")).toEqual([
      { kind: "inline", value: "x=2" },
      { kind: "text", value: " then $30" },
    ])
  })
})

describe("decodeMathEntities", () => {
  it("decodes Greek and symbol entities to LaTeX", () => {
    expect(decodeMathEntities("8cos(&theta;)")).toBe("8cos(\\theta)")
    expect(decodeMathEntities("45&deg;")).toBe("45^\\circ")
  })
  it("decodes general and numeric entities", () => {
    expect(decodeMathEntities("a&amp;b")).toBe("a&b")
    expect(decodeMathEntities("&#945;")).toBe("\u03b1")
  })
})

describe("normalizeLatex", () => {
  it("trims and strips a dangling trailing backslash", () => {
    expect(normalizeLatex("  x^2 \\")).toBe("x^2")
    expect(normalizeLatex("\\frac{5}{x}")).toBe("\\frac{5}{x}")
  })
})

describe("renderMathToHtml", () => {
  it("renders valid math without throwing", () => {
    expect(renderMathToHtml("x^2", false)).toContain("katex")
  })
  it("does not throw on malformed math", () => {
    expect(() => renderMathToHtml("\\frac{", true)).not.toThrow()
  })
})
```

- [ ] **Step 2: Run, verify fail** — `npx vitest run src/lib/math.test.ts`. Expected: FAIL (cannot resolve `./math`).

- [ ] **Step 3: Implement** — `src/lib/math.ts`:

```ts
import katex from "katex"

export type MathSegment =
  | { kind: "text"; value: string }
  | { kind: "inline"; value: string }
  | { kind: "display"; value: string }

const ENTITY_MAP: Record<string, string> = {
  theta: "\\theta", alpha: "\\alpha", beta: "\\beta", gamma: "\\gamma",
  delta: "\\delta", pi: "\\pi", mu: "\\mu", sigma: "\\sigma", lambda: "\\lambda",
  omega: "\\omega", phi: "\\phi", rho: "\\rho", tau: "\\tau", epsilon: "\\epsilon",
  zeta: "\\zeta", eta: "\\eta", iota: "\\iota", kappa: "\\kappa", nu: "\\nu",
  xi: "\\xi", omicron: "o", upsilon: "\\upsilon", chi: "\\chi", psi: "\\psi",
  deg: "^\\circ", times: "\\times", div: "\\div", pm: "\\pm", mp: "\\mp",
  leq: "\\leq", geq: "\\geq", neq: "\\neq", approx: "\\approx", infty: "\\infty",
  sum: "\\sum", prod: "\\prod", int: "\\int", sqrt: "\\sqrt", cdot: "\\cdot",
  ldots: "\\ldots", cdots: "\\cdots", dots: "\\dots", rightarrow: "\\rightarrow",
  leftarrow: "\\leftarrow", Rightarrow: "\\Rightarrow", Leftarrow: "\\Leftarrow",
  partial: "\\partial", nabla: "\\nabla", in: "\\in", notin: "\\notin",
  cup: "\\cup", cap: "\\cap", subset: "\\subset", supset: "\\supset",
  equiv: "\\equiv", sim: "\\sim", simeq: "\\simeq", propto: "\\propto",
  circ: "\\circ", bullet: "\\bullet", ast: "\\ast", star: "\\star",
  prime: "\\prime", ell: "\\ell", hbar: "\\hbar", angle: "\\angle",
  perp: "\\perp", parallel: "\\parallel", forall: "\\forall", exists: "\\exists",
  emptyset: "\\emptyset", varnothing: "\\varnothing", land: "\\land", lor: "\\lor",
  neg: "\\neg", oplus: "\\oplus", otimes: "\\otimes", sin: "\\sin", cos: "\\cos",
  tan: "\\tan", log: "\\log", ln: "\\ln", lim: "\\lim", exp: "\\exp",
  min: "\\min", max: "\\max", det: "\\det", dim: "\\dim", gcd: "\\gcd",
}

export function decodeMathEntities(input: string): string {
  return input
    .replace(/&([a-zA-Z]+);/g, (whole, name: string) => {
      const mapped = ENTITY_MAP[name] ?? ENTITY_MAP[name.toLowerCase()]
      if (mapped !== undefined) return mapped
      switch (name.toLowerCase()) {
        case "nbsp": return " "
        case "amp": return "&"
        case "lt": return "<"
        case "gt": return ">"
        case "quot": return '"'
        case "apos": return "'"
        default: return whole
      }
    })
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n: string) => String.fromCodePoint(parseInt(n, 16)))
}

export function normalizeLatex(input: string): string {
  return input.trim().replace(/\\+$/, "")
}

const cleanMath = (s: string) => normalizeLatex(decodeMathEntities(s))
const isDigitAt = (text: string, index: number) => {
  let i = index
  while (i < text.length && text[i] === " ") i++
  return i < text.length && /[0-9]/.test(text[i])
}

export function parseMathSegments(text: string): MathSegment[] {
  if (!text || !text.trim()) return []
  const segments: MathSegment[] = []
  const n = text.length
  let textStart = 0
  let i = 0

  const flushText = (end: number) => {
    if (end > textStart) segments.push({ kind: "text", value: text.slice(textStart, end) })
  }

  while (i < n) {
    if (text[i] !== "$") { i++; continue }

    if (text[i + 1] === "$") {
      const close = text.indexOf("$$", i + 2)
      flushText(i)
      if (close === -1) {
        segments.push({ kind: "display", value: cleanMath(text.slice(i + 2)) })
        i = n
      } else {
        segments.push({ kind: "display", value: cleanMath(text.slice(i + 2, close)) })
        i = close + 2
      }
      textStart = i
      continue
    }

    if (isDigitAt(text, i + 1)) { i++; continue } // currency: leave $ as text

    let close = -1
    for (let k = i + 1; k < n; k++) {
      if (text[k] === "$" && !isDigitAt(text, k + 1)) { close = k; break }
    }
    flushText(i)
    if (close === -1) {
      const remainder = text.slice(i + 1).replace(/[\s.,;:!?]+$/, "")
      segments.push({ kind: "inline", value: cleanMath(remainder) })
      i = n
    } else {
      segments.push({ kind: "inline", value: cleanMath(text.slice(i + 1, close)) })
      i = close + 1
    }
    textStart = i
  }
  flushText(n)
  return segments
}

export function renderMathToHtml(value: string, displayMode: boolean): string {
  return katex.renderToString(value, {
    displayMode,
    throwOnError: false,
    strict: false,
    output: "html",
  })
}
```

- [ ] **Step 4: Run, verify pass** — `npx vitest run src/lib/math.test.ts`. Expected: PASS (all).

---

### Task 2: Wire `MathDisplay` to the math lib

**Files:**
- Modify: `src/components/questions/MathDisplay.tsx`

**Interfaces:**
- Consumes: `parseMathSegments`, `renderMathToHtml` from `@/lib/math`.

- [ ] **Step 1: Rewrite `MathDisplay.tsx`** to import from `@/lib/math`, removing the local `MATH_PATTERN`/`parseSegments`/`renderMath`. Keep props and branch structure:

```tsx
import { useMemo } from "react"
import { parseMathSegments, renderMathToHtml } from "@/lib/math"
import { cn } from "@/lib/utils"

interface MathDisplayProps {
  statement?: string | null
  latex?: string | null
  imageUrl?: string | null
  className?: string
  clamp?: boolean
}

export function MathDisplay({ statement, latex, imageUrl, className, clamp }: MathDisplayProps) {
  const segments = useMemo(
    () => (statement && statement.trim() ? parseMathSegments(statement) : null),
    [statement],
  )
  const fallbackHtml = useMemo(
    () => (!segments && latex ? renderMathToHtml(latex, true) : null),
    [segments, latex],
  )

  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt="Question diagram"
        className={cn("max-h-64 w-auto rounded-md object-contain", className)}
      />
    )
  }

  if (segments) {
    return (
      <div className={cn("katex-host", clamp && "line-clamp-4", className)}>
        {segments.map((segment, index) => {
          if (segment.kind === "text") return <span key={index}>{segment.value}</span>
          const html = renderMathToHtml(segment.value, segment.kind === "display")
          if (segment.kind === "display") {
            return (
              <div
                key={index}
                className="my-2 overflow-x-auto text-center"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            )
          }
          return <span key={index} dangerouslySetInnerHTML={{ __html: html }} />
        })}
      </div>
    )
  }

  if (fallbackHtml) {
    return (
      <div className={cn("katex-host", className)} dangerouslySetInnerHTML={{ __html: fallbackHtml }} />
    )
  }

  return null
}
```

- [ ] **Step 2: Verify** — `npx tsc --noEmit` (clean) and `npx vitest run` (green). Browser: open the AA HL "Rational Functions" question whose statement is `Solve the inequality $x^2 - 9 + \frac{5}{x} .` and confirm it renders as math (no raw `$`). Confirm currency statements (e.g. Sequences And Series money problems) show `$30,000` as text.

---

### Task 3: Scraper markscheme capture

**Files:**
- Modify: `scraper/normalize.mjs` (`fromApiRecord`, `fromDomRaw`, `finalize`)
- Test: `scraper/normalize.test.mjs`

**Interfaces:**
- Produces: records may include `markscheme` (string). `fromApiRecord(rec, context)` reads `answer`.

- [ ] **Step 1: Add failing tests** to `scraper/normalize.test.mjs` (append a describe block; match the file's existing node:test style — `import { test } from "node:test"; import assert from "node:assert/strict";` already present):

```js
test("fromApiRecord captures the answer field as a markscheme", () => {
  const rec = {
    question: "<p>Find \\( u_5 \\)</p>",
    answer: '<p class="answers-ms"><strong>a)</strong></p><p><span class="math">\\[ u_5 = 15*(\\frac{1}{3})^4 \\]</span></p>',
    marks: "7",
    chapter: "sequences",
  };
  const out = fromApiRecord(rec, { topic: "Sequences" });
  assert.ok(out.markscheme, "markscheme should be present");
  assert.ok(!/<[a-z]/i.test(out.markscheme), "no HTML tags");
  assert.ok(out.markscheme.includes("$$"), "display math converted to $$");
});

test("fromApiRecord omits markscheme when no answer is present", () => {
  const out = fromApiRecord({ question: "Plain question", marks: "3" }, {});
  assert.equal(out.markscheme, undefined);
});
```

- [ ] **Step 2: Run, verify fail** — `node --test scraper/normalize.test.mjs`. Expected: FAIL (markscheme undefined).

- [ ] **Step 3: Implement** in `scraper/normalize.mjs`:
  - In `fromApiRecord`, after the `imageUrl` line, add:
    ```js
    const markschemeStr = clean(pick(rec, ["answer", "markscheme", "mark_scheme", "solution", "solution_html", "markscheme_html"]));
    const markscheme = looksLikeHtml(markschemeStr) ? htmlToStatement(markschemeStr) : markschemeStr;
    ```
    Add `markscheme,` to the object passed to `finalize`.
  - In `fromDomRaw`, add `markscheme: clean(raw.markscheme) || null,` to the `finalize` argument.
  - In `finalize`, after the latex/image_url block, add:
    ```js
    if (q.markscheme) out.markscheme = q.markscheme;
    ```

- [ ] **Step 4: Run, verify pass** — `node --test scraper/normalize.test.mjs`. Expected: PASS (all, including existing 26).

---

### Task 4: Re-scrape both courses

**Files:**
- Regenerate: `seed_questions.json`, `ai_seed_questions.json`

- [ ] **Step 1: Scrape AA HL** — `node scraper/scrape.mjs --url https://academy.edunade.com/ib-hub/math-aa-hl/ --out seed_questions.json --max-pages 40` (background; crawls sub-topics).
- [ ] **Step 2: Scrape AI HL** — `node scraper/scrape.mjs --url https://academy.edunade.com/ib-hub/math-ai-hl/ --out ai_seed_questions.json --max-pages 40`.
- [ ] **Step 3: Validate** — node script: both files are arrays; count records; count records with a non-empty `markscheme`; print keys. Expected: ~479 each, markscheme present on most records, keys include `markscheme`.

---

### Task 5: Schema, migration, seed, model

**Files:**
- Modify: `drizzle/schema.ts`, `scripts/seed.mjs`, `src/lib/questions.ts`, `src/lib/questions.test.ts`, `src/lib/filter.test.ts`
- Create: `drizzle/migrations/0002_add_markscheme.sql` (generated)

**Interfaces:**
- Produces: `Question.markscheme: string | null`; DB column `markscheme text`; API returns `markscheme`.

- [ ] **Step 1: Add column** to `drizzle/schema.ts` after `imageUrl`: `markscheme: text("markscheme"),`.
- [ ] **Step 2: Generate migration** — `npx drizzle-kit generate --name add_markscheme`. Verify `0002_add_markscheme.sql` is `ALTER TABLE \`questions\` ADD \`markscheme\` text;`.
- [ ] **Step 3: Apply** — `node scripts/migrate.mjs`. Verify column: `/usr/local/mysql/bin/mysql --no-defaults -h 127.0.0.1 -P 3307 -u root question_bank -e "SHOW COLUMNS FROM questions LIKE 'markscheme';"`.
- [ ] **Step 4: Update seed** — in `scripts/seed.mjs` `toRow`, add `markscheme: record.markscheme ? String(record.markscheme).trim() : null,` to the row object.
- [ ] **Step 5: Update model** — add `markscheme: string | null` to `Question` in `src/lib/questions.ts`. Add `markscheme: null,` to `makeQuestion` in `src/lib/questions.test.ts` and `src/lib/filter.test.ts`.
- [ ] **Step 6: Seed** — `node scripts/seed.mjs`. Expected: 479 AA HL + 479 AI HL (or new counts), total reported.
- [ ] **Step 7: Restart API** — kill the running `node server/index.mjs` pid, relaunch `node server/index.mjs` (background). Verify `curl -s http://127.0.0.1:8787/api/questions` returns rows with a `markscheme` key (non-null on most).
- [ ] **Step 8: Verify** — `npx vitest run` (green) and `npx tsc --noEmit` (clean).

---

### Task 6: `SegmentedControl` + `CourseToggle` refactor

**Files:**
- Create: `src/components/ui/SegmentedControl.tsx`
- Modify: `src/components/layout/CourseToggle.tsx`

**Interfaces:**
- Produces: `SegmentedControl<T extends string>({ options:{value:T;label:string}[], value:T, onChange:(v:T)=>void, ariaLabel:string, className? })`.

- [ ] **Step 1: Create `SegmentedControl.tsx`:**

```tsx
import { cn } from "@/lib/utils"

interface SegmentedControlProps<T extends string> {
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
  ariaLabel: string
  className?: string
}

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#09090b]"

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  className,
}: SegmentedControlProps<T>) {
  if (options.length === 0) return null
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex items-center gap-1 rounded-lg border border-zinc-800 bg-white/[0.03] p-1",
        className,
      )}
    >
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "rounded-md border px-3 py-1.5 text-sm font-medium transition",
              focusRing,
              active
                ? "border-emerald-400/30 bg-emerald-400/15 text-emerald-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                : "border-transparent text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200",
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Refactor `CourseToggle.tsx`** to delegate (preserve props/API):

```tsx
import { SegmentedControl } from "@/components/ui/SegmentedControl"

interface CourseToggleProps {
  courses: string[]
  value: string
  onChange: (course: string) => void
}

export function CourseToggle({ courses, value, onChange }: CourseToggleProps) {
  return (
    <SegmentedControl
      ariaLabel="Question bank course"
      options={courses.map((course) => ({ value: course, label: course }))}
      value={value}
      onChange={onChange}
    />
  )
}
```

- [ ] **Step 3: Verify** — `npx tsc --noEmit` clean. Browser: course toggle still switches AA HL/AI HL (group aria-label "Question bank course" intact).

---

### Task 7: `MarkschemePanel` + card/dialog placement

**Files:**
- Create: `src/components/questions/MarkschemePanel.tsx`
- Modify: `src/components/questions/QuestionCard.tsx`, `src/components/questions/QuestionDetailDialog.tsx`

**Interfaces:**
- Consumes: `Question.markscheme`, `MathDisplay`.
- Produces: `MarkschemePanel({ markscheme:string|null, className?, defaultOpen? })`.

- [ ] **Step 1: Create `MarkschemePanel.tsx`:**

```tsx
import { useState } from "react"
import { Eye, EyeOff } from "lucide-react"
import { cn } from "@/lib/utils"
import { MathDisplay } from "./MathDisplay"

interface MarkschemePanelProps {
  markscheme: string | null
  className?: string
  defaultOpen?: boolean
}

export function MarkschemePanel({ markscheme, className, defaultOpen = false }: MarkschemePanelProps) {
  const [open, setOpen] = useState(defaultOpen)
  const available = Boolean(markscheme && markscheme.trim())

  return (
    <div className={cn("pointer-events-auto relative z-20", className)}>
      <button
        type="button"
        disabled={!available}
        aria-expanded={open}
        onClick={(event) => {
          event.stopPropagation()
          if (available) setOpen((previous) => !previous)
        }}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50",
          available
            ? "border-zinc-700 bg-white/[0.03] text-zinc-300 hover:border-emerald-400/40 hover:text-emerald-200"
            : "cursor-not-allowed border-zinc-800 bg-white/[0.02] text-zinc-600",
        )}
      >
        {open ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
        {open ? "Hide markscheme" : "Show markscheme"}
      </button>

      {!available && (
        <p className="mt-2 text-[11px] text-zinc-600">Markscheme not available for this question.</p>
      )}

      {available && open && (
        <div className="mt-2 rounded-lg border border-emerald-400/20 bg-emerald-400/[0.04] px-3 py-3">
          <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.14em] text-emerald-300/80">
            Markscheme
          </p>
          <div className="text-sm leading-relaxed text-zinc-200">
            <MathDisplay statement={markscheme} />
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Add to `QuestionCard.tsx`** — import `MarkschemePanel`; render `<MarkschemePanel markscheme={question.markscheme} className="mt-3" />` inside the `pointer-events-none relative z-10` content div, after the math block (before the footer). The panel's own `pointer-events-auto z-20` and `stopPropagation` keep it clickable without opening the dialog.
- [ ] **Step 3: Add to `QuestionDetailDialog.tsx`** — import `MarkschemePanel`; replace `<p className="text-xs text-zinc-600">Markscheme available in a future release.</p>` with `<MarkschemePanel key={question.id} markscheme={question.markscheme} />`.
- [ ] **Step 4: Verify** — `npx tsc --noEmit` clean. Browser: a card with a markscheme reveals it on "Show markscheme" (math renders), clicking the toggle does NOT open the dialog; a null-markscheme card shows the disabled state; the detail dialog shows the markscheme toggle.

---

### Task 8: `PracticeView` + App view toggle

**Files:**
- Create: `src/components/practice/PracticeView.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `SegmentedControl`, `MathDisplay`, `MarkschemePanel`, `DifficultyPill`, `examLabel`, `Question`.
- Produces: `PracticeView({ questions:Question[], savedIds:Set<string>, onToggleSaved:(id:string)=>void })`.

- [ ] **Step 1: Create `PracticeView.tsx`:**

```tsx
import { useEffect, useState } from "react"
import { Bookmark, ChevronLeft, ChevronRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { difficultyBand } from "@/lib/filter"
import { examLabel, type Question } from "@/lib/questions"
import { cn } from "@/lib/utils"
import { DifficultyPill } from "@/components/questions/DifficultyPill"
import { MathDisplay } from "@/components/questions/MathDisplay"
import { MarkschemePanel } from "@/components/questions/MarkschemePanel"

interface PracticeViewProps {
  questions: Question[]
  savedIds: Set<string>
  onToggleSaved: (id: string) => void
}

export function PracticeView({ questions, savedIds, onToggleSaved }: PracticeViewProps) {
  const [index, setIndex] = useState(0)

  useEffect(() => { setIndex(0) }, [questions])

  const total = questions.length
  const safeIndex = Math.min(index, Math.max(0, total - 1))
  const question = questions[safeIndex]

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return
      if (event.key === "ArrowLeft") setIndex((i) => Math.max(0, i - 1))
      else if (event.key === "ArrowRight") setIndex((i) => Math.min(total - 1, i + 1))
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [total])

  if (!question) {
    return (
      <div className="glass-panel grid place-items-center rounded-xl px-6 py-16 text-center">
        <p className="text-sm text-zinc-400">No questions match the current filters.</p>
      </div>
    )
  }

  const saved = savedIds.has(question.id)
  const header = [examLabel(question), question.paper].filter(Boolean).join(" · ")

  return (
    <div className="glass-panel animate-rise flex flex-col rounded-xl p-6 sm:p-8">
      <div className="flex items-center justify-between gap-3 text-[11px] text-zinc-500">
        <span className="truncate tabular-nums">{header || "Question"}</span>
        <span className="shrink-0 tabular-nums">Question {safeIndex + 1} of {total}</span>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <DifficultyPill score={question.difficulty} />
        <Badge variant="outline" className="border-zinc-700/60 bg-white/[0.04] font-normal text-zinc-300">
          {question.topic}
        </Badge>
        <span className="text-xs text-zinc-500">{question.marks} marks · {difficultyBand(question.difficulty)}</span>
        <button
          type="button"
          onClick={() => onToggleSaved(question.id)}
          aria-pressed={saved}
          aria-label={saved ? "Remove bookmark" : "Bookmark question"}
          className="ml-auto grid size-7 place-items-center rounded-md text-zinc-500 transition hover:bg-white/5 hover:text-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50"
        >
          <Bookmark className={cn("size-4", saved && "fill-emerald-400 text-emerald-400")} />
        </button>
      </div>

      {question.subtopic && (
        <p className="mt-2 text-xs text-zinc-500">{question.subtopic}</p>
      )}

      <div className="mt-5 rounded-lg border border-zinc-800/70 bg-black/25 px-5 py-6 text-[15px] leading-relaxed text-zinc-200">
        {question.imageUrl ? (
          <div className="grid place-items-center"><MathDisplay imageUrl={question.imageUrl} /></div>
        ) : (
          <MathDisplay statement={question.statement} latex={question.latex} />
        )}
      </div>

      <MarkschemePanel key={question.id} markscheme={question.markscheme} className="mt-4" />

      <div className="mt-6 flex items-center justify-between gap-3 border-t border-zinc-800/70 pt-5">
        <Button
          variant="outline"
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          disabled={safeIndex === 0}
          className="gap-1.5 border-zinc-800 bg-white/[0.03] text-zinc-300 hover:bg-white/[0.06] disabled:opacity-40"
        >
          <ChevronLeft className="size-4" /> Previous
        </Button>
        <span className="text-[11px] text-zinc-600">Use ← → keys</span>
        <Button
          variant="outline"
          onClick={() => setIndex((i) => Math.min(total - 1, i + 1))}
          disabled={safeIndex === total - 1}
          className="gap-1.5 border-zinc-700 bg-zinc-900/80 text-zinc-200 hover:border-emerald-400/40 hover:bg-emerald-400/10 hover:text-emerald-100 disabled:opacity-40"
        >
          Next <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Wire `App.tsx`:**
  - Import `SegmentedControl` and `PracticeView`.
  - Add `const [view, setView] = useState<"browse" | "practice">("browse")`.
  - In the header left block (next to `CourseToggle`), add:
    ```tsx
    <SegmentedControl
      ariaLabel="Dashboard view"
      options={[{ value: "browse", label: "Browse" }, { value: "practice", label: "Practice" }]}
      value={view}
      onChange={setView}
    />
    ```
    (Wrap `CourseToggle` + this in a `flex flex-wrap items-center gap-2` row.)
  - Replace the body ternary's final branch:
    ```tsx
    ) : view === "practice" ? (
      <PracticeView questions={visible} savedIds={savedIds} onToggleSaved={toggleSaved} />
    ) : (
      <QuestionGrid ... />
    )
    ```
- [ ] **Step 3: Verify** — `npx tsc --noEmit` clean. Browser: switch to Practice; one question shows; Next/Previous paginate; Previous disabled at first, Next at last; ←/→ keys work; changing a filter resets to question 1; empty filter set shows the message; markscheme toggle works in practice.

---

### Task 9: Rename to "Math HL Question Bank"

**Files:**
- Modify: `index.html`, `src/components/layout/TopNav.tsx`, `src/App.tsx`

- [ ] **Step 1: `index.html`** — `<title>Math HL Question Bank</title>`; meta description → "Browse past-paper questions for IB Mathematics: Analysis and Approaches HL and Applications and Interpretation HL."
- [ ] **Step 2: `TopNav.tsx`** — remove `course` from `TopNavProps` and destructuring; brand span text → "Math HL Question Bank"; subtitle → "IB Mathematics · HL".
- [ ] **Step 3: `App.tsx`** — remove the `course={course}` prop from `<TopNav>`.
- [ ] **Step 4: Verify** — `npx tsc --noEmit` clean; `grep -rn "AA HL Bank" index.html src` returns nothing. Browser: document title and navbar show "Math HL Question Bank".

---

### Task 10: Final verification

- [ ] **Step 1:** `npx vitest run` (all green), `node --test scraper/*.test.mjs` (all green), `npx tsc --noEmit` (clean), `npx vite build` (succeeds).
- [ ] **Step 2:** Browser end-to-end on BOTH courses: math renders (user example fixed, currency as text); Browse grid + Practice navigation; markscheme reveal on card/practice/dialog; rename in title + navbar; course toggle resets filters. Console clean (no errors/warnings).
- [ ] **Step 3:** Confirm stack running (MySQL :3307, API :8787 with markscheme, Vite :5173). Leave running. Reload to a clean default state.