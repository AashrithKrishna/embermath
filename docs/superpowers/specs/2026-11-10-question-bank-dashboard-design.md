# Math AA HL Question Bank — Dashboard Design

**Date:** 2026-11-10
**Status:** Approved for implementation planning
**Scope:** Front-end only, mock data, no backend

## 1. Overview

A single-screen dashboard for browsing a Mathematics: Analysis and Approaches HL
question bank. The deliverable is a polished, dark-only interface populated with
dummy data so the visual direction and interaction model can be evaluated before
any data layer exists.

**Goals**

- Establish the visual language: deep slate canvas, frosted glass panels, hairline
  borders, neon difficulty accents.
- Let a student narrow questions by search, difficulty range, topic, and year.
- Present questions as rich cards with authentic rendered mathematics.
- Demonstrate a plausible "Generate Random Paper" flow against the current
  filtered set.

**Non-goals**

- No backend, API, database, or persistence. Bookmarks and filters reset on reload.
- No routing, authentication, favourites page, or paper history.
- No mobile native app; the layout is responsive web only.

## 2. Stack

| Concern | Choice |
|---|---|
| Build | Vite 7, React 19, TypeScript |
| Styling | Tailwind CSS v4 via `@tailwindcss/vite` (CSS-first config, no `tailwind.config.js`) |
| Components | shadcn/ui (local source) on Radix primitives |
| Icons | lucide-react |
| Math | KaTeX (`katex.renderToString`, display mode) |
| Type | `@fontsource-variable/inter` |
| Unit tests | Vitest for pure filter/sampling logic |

Initialised with `npm create vite@latest`, then `npx shadcn@latest init`. All shadcn
components are vendored under `src/components/ui` and may be edited freely.

## 3. File layout

```
index.html
src/
  main.tsx
  App.tsx
  index.css                         Tailwind import, @theme tokens, glass utility
  components/
    layout/TopNav.tsx
    filters/FilterRail.tsx
    filters/MobileFilterSheet.tsx
    questions/QuestionGrid.tsx
    questions/QuestionCard.tsx
    questions/QuestionDetailDialog.tsx
    questions/MathDisplay.tsx
    questions/DifficultyPill.tsx
    questions/EmptyState.tsx
    paper/GeneratePaperDialog.tsx
    ui/                              shadcn: button, input, slider, checkbox,
                                     badge, dialog, sheet, separator, tooltip
  lib/
    questions.ts                     Question type + 12 mock records
    filter.ts                        applyFilters, topicCounts, samplePaper
    filter.test.ts
    utils.ts                         cn()
docs/superpowers/specs/            this document
```

## 4. Design system

### 4.1 Tokens (`index.css`)

| Token | Value | Use |
|---|---|---|
| `--background` | `#09090b` | page canvas |
| `--surface` | `rgba(255,255,255,0.03)` | glass panels/cards |
| `--surface-strong` | `rgba(255,255,255,0.055)` | hovered card, inset wells |
| `--border` | `#27272a` (`zinc-800`) | 1px structural borders |
| `--border-subtle` | `rgba(39,39,42,0.6)` | dividers |
| `--foreground` | `#fafafa` | primary text |
| `--muted` | `#a1a1aa` (`zinc-400`) | secondary text |
| `--easy` / `--medium` / `--hard` | `#34d399` / `#fbbf24` / `#fb7185` | difficulty accents |

Body background `#09090b`, `color-scheme: dark`. No light mode, no theme toggle.

### 4.2 Glass recipe

`bg-white/[0.03] backdrop-blur-xl border border-zinc-800` exposed as a
`glass-panel` utility. Hover state raises the surface to `bg-white/[0.055]` and
adds a 1px inset top highlight (`inset 0 1px 0 rgba(255,255,255,0.05)`). Shadows
stay soft and low-opacity; depth comes from blur and borders.

### 4.3 Difficulty colors

Difficulty is the only saturated color in the UI.

| Score | Label | Classes |
|---|---|---|
| 1–2 | Easy | `text-emerald-300 bg-emerald-400/10 border-emerald-400/25` + `shadow-[0_0_18px_-6px_rgba(52,211,153,0.5)]` |
| 3 | Medium | `text-amber-300 bg-amber-400/10 border-amber-400/25` + amber equivalent glow |
| 4–5 | Hard | `text-rose-300 bg-rose-400/10 border-rose-400/25` + rose equivalent glow |

Topic tags are neutral: `border-zinc-700/60 bg-white/[0.04] text-zinc-300`.

### 4.4 Typography

- UI: Inter Variable, `font-feature-settings: "cv11","ss01"`, tabular numerals in the rail.
- Page title: 20px/600. Section labels: 11px uppercase, `tracking-[0.14em]`, `text-zinc-500`.
- Card equation: KaTeX at 1.05rem, `text-zinc-100`.
- No display-scale marketing type; this is a utility screen.

### 4.5 Motion

150–200ms ease-out on background, border, translate, and glow. Cards translate
`-1px` on hover with a faint topic-neutral ring. `prefers-reduced-motion`
disables transforms and non-essential transitions.

## 5. Layout

**Desktop (≥1024px)**

- Sticky top bar, 64px: wordmark left (function glyph + "AA HL Bank"), search
  field centered with max-width 440px, `Generate Random Paper` button right.
- Content grid: `lg:grid-cols-[264px_minmax(0,1fr)]`, 32px gap, max-width 1440px,
  centered, 24px horizontal padding.
- Filter rail is `position: sticky`, top offset 88px, self-starting.
- Question grid: 1 column < 768px, 2 at `md`, 3 at `xl`, 20px gap.

**Mobile (<1024px)**

- Rail hidden; a `Filters` button (with active-count badge) sits beside the search.
- Opens the same `FilterRail` content inside a right-side shadcn `Sheet`, with an
  `Apply`/`Reset` footer. State is shared, so changes reflect immediately.

## 6. Components

### 6.1 TopNav

- Wordmark: 28px rounded square with `∫` glyph, subtle accent gradient border,
  label "AA HL Bank" and small "Question Bank" caption.
- Search: input with search icon, placeholder "Search questions, topics, years…",
  clear button when non-empty, `⌘K` / `Ctrl K` focuses it. `aria-label` present.
- Generate button: primary, `Sparkles` icon, label "Generate Random Paper".
  Resting: zinc-900 fill, zinc-700 border. Hover/focus: emerald-tinted glow ring
  plus a slow 1px lift. Disabled at zero filtered results, with explanatory tooltip.

### 6.2 FilterRail

Ordered sections separated by hairline dividers:

1. **Header** — "Filters" + Reset text button, only rendered when any filter is
   active (search excluded).
2. **Difficulty** — Radix range slider, 1–5, two thumbs, 0 minimum gap. Endpoint
   labels "Easy" and "Hard"; live readout pill reads e.g. `2 – 4 · Easy → Hard`.
   Value maps to label colors at the thumb edges.
3. **Topics** — checkboxes for Calculus, Algebra, Vectors only. Each row shows a
   faceted count: questions in that topic after search, difficulty, and year
   filters, ignoring topic selection. Zero-count topics stay enabled but dim.
4. **Year** — wrapped chips, 2020–2024, multi-select toggles with active styling
   and `aria-pressed`.
5. **Footer** — "Showing N of 12 questions" in tabular numerals.

`Apply` is not required on desktop; changes filter live in both breakpoints.

### 6.3 QuestionCard

Frosted glass card, `rounded-xl`, `p-5`, vertical rhythm:

- **Meta row** — `May 2024 · TZ1` on the left; `Paper 2` and `7 marks` on the right,
  small zinc-400 text.
- **Badge row** — difficulty pill, topic tag, and a right-aligned bookmark icon
  button (`aria-pressed`, emerald when saved).
- **Equation well** — inset `rounded-lg bg-black/25 border border-zinc-800/70`
  with `p-4`, KaTeX display equation, horizontally scrollable if wide.
- **Footer** — subtopic in zinc-500, part count (`2 parts`), and a chevron affordance.

Whole card is an `<article>` containing a sibling overlay `<button>` absolutely
positioned over the full card (`inset-0`, visually transparent) with an accessible
name such as "Open May 2024 TZ1, Calculus, hard, 7 marks". The bookmark button
sits above the overlay with `z-10`, so no interactive element is nested inside
another. Focus shows the same hover treatment via `focus-within`. Bookmark clicks
do not trigger the overlay.

### 6.4 QuestionDetailDialog

Radix dialog, `max-w-xl`, glass surface. Shows session, paper, marks, difficulty,
topic/subtopic, the full statement, rendered equation, and a muted "Markscheme
available in a future release" note. Close button and `Esc`.

### 6.5 GeneratePaperDialog

Triggered by the nav button. On open, `samplePaper(filtered, 4)` picks up to four
questions, shuffled, with no repeats. Dialog content:

- Title "Practice paper" and subtitle "Generated from N matching questions".
- Ordered list: question number, session/paper, difficulty pill, marks.
- Footer: total marks, `Close`, and a disabled `Export PDF` button marked
  "Coming soon" (visual affordance only).
- If fewer than four matches exist, the list shows what is available and notes
  "Only N questions match your filters."
- Regenerate icon button re-samples from the same filtered set.

Sampling is uniform random over the filtered set; deterministic ordering only
within the dialog presentation.

### 6.6 EmptyState

Shown when filters produce zero results. Centered in the grid area with a muted
glyph, "No questions match these filters", a sentence naming the active
constraints, and a `Clear all filters` button. Does not clear search silently —
it clears everything including search.

## 7. Data model

```ts
type Topic = "Calculus" | "Algebra" | "Vectors";

interface Question {
  id: string;                 // "2024-may-tz1-p2-3"
  year: number;               // 2020–2024
  session: "May" | "November";
  timezone: "TZ1" | "TZ2";
  paper: "Paper 1" | "Paper 2";
  topic: Topic;
  subtopic: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  marks: number;
  parts: number;
  latex: string;              // KaTeX-compatible display expression
  statement: string;          // plain-language prompt for the detail dialog
}
```

Twelve mock records: four per topic, at least two per difficulty band, spread
across 2020–2024 and both sessions. Statements are plausible AA HL prompts;
equations must render without KaTeX errors.

### 7.1 Filter state

```ts
interface FilterState {
  search: string;      // trimmed, case-insensitive
  difficulty: [number, number]; // [1,5] inclusive
  topics: Topic[];     // empty = all
  years: number[];     // empty = all
}
```

`applyFilters(questions, state)` is pure. Search matches year, session, paper,
topic, subtopic, and statement. Filter arrays are OR within a facet, AND across
facets.

`topicCounts` returns per-topic counts under all filters except the topic facet.
`samplePaper(questions, count, rng?)` is pure, accepts an injectable RNG for
tests, and never returns duplicates.

## 8. Accessibility

- Every control labelled; icon-only buttons carry `aria-label`.
- Visible `focus-visible` ring (`ring-2 ring-emerald-400/50 ring-offset-2
  ring-offset-[#09090b]`) on all interactive elements.
- Cards expose a meaningful accessible name including year, topic, and difficulty.
- Radix provides focus trapping and restore for both dialogs and the sheet.
- Difficulty is conveyed by text as well as color.
- Contrast: primary text ≥ 7:1, muted text ≥ 4.5:1 on `#09090b`.

## 9. Verification

1. `npx tsc --noEmit` passes.
2. `npx vitest run` covers `applyFilters`, `topicCounts`, and `samplePaper`
   (including no-duplicate behavior and fewer-than-requested results).
3. `npm run build` succeeds.
4. Manual browser pass at 1440×900 and 390×844:
   - search narrows cards and updates facet counts;
   - range slider and topic/year filters compose correctly;
   - reset restores all 12; empty state appears and clears;
   - bookmark toggles style and state, survives filtering within session;
   - card opens detail dialog via mouse and keyboard, `Esc` closes;
   - Generate samples from the filtered set only; <4 matches handled;
   - mobile sheet opens, filters apply, and closes;
   - no horizontal overflow, no console errors, KaTeX renders everywhere.

## 10. Out of scope

Backend, auth, persistence, exporting, paper editing, markscheme content,
routing, light theme, and any analytics.
