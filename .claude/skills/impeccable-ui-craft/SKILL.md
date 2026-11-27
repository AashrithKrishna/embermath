---
name: impeccable-ui-craft
description: Use when adding or changing any React component, page, or style in EmberMath (src/). Enforces the Obsidian, Amethyst & Ember design system — tokens, surfaces, type roles, math rendering, motion and the anti-template rules — and gives a pre-flight audit to run before declaring UI work done.
---

# Impeccable UI craft — EmberMath (Obsidian, Amethyst & Ember)

Color budget: ~60% obsidian surfaces, ~20% amethyst (primary actions, selection), ~20% ember (navigation, hover highlights, focus rings, timers, secondary emphasis).

The app is an academic workstation (Linear / Raycast / Typst lineage), not a marketing site. Density, precision and legible mathematics beat decoration.

## Tokens (defined in `src/index.css` `@theme`) — never hard-code hex in components

| Role | Token / class | Value |
|---|---|---|
| Canvas | `bg-page` | `#09090B` |
| Elevated surface (panels, rails) | `surface` utility / `bg-surface` | `#121118` |
| Interactive card | `card` utility / `bg-raised` | `#1A1824` (`bg-raised-2` = hover/pressed) |
| Hairline border | `border-line` | `rgba(168,85,247,.14)`; `border-line-strong` for focus/selected |
| Primary accent | `bg-amethyst` | `#9333EA` (`amethyst-bright` `#A855F7` hover/glow, `amethyst-soft` `#C084FC` text highlights, `amethyst-wash` selected fill) |
| Second brand color | `ember`, `ember-bright`, `ember-soft`, `ember-wash`, `ember-line` | `#FF6A2B` family — hover/focus highlights, dock, links, secondary CTAs |
| Semantic only | `easy` / `medium` / `hard` | `#10B981` / `#EAB308` / `#F43F5E` (medium is yellow so it never reads as ember) — difficulty, self-marking outcome, Paper 3. Never decorative. |
| Text | `text-ink`, `text-ink-muted`, `text-ink-faint` | three steps only |

Surfaces = 1px hairline border + 1px inset top highlight (`surface` / `card` utilities). No drop shadows, no glows, no gradients, no blur blobs.

## Shape
- Radius: `rounded-md` (6px) for chips/inputs, `rounded-lg` (8px) for buttons and rows, `rounded-xl` (12px) for panels. `rounded-2xl/3xl` are clamped to 12px in the theme — do not fight it.
- Bento grids: use `gap-px bg-line` on the parent with `bg-surface` children for crisp shared hairlines (see Home modules, cheatsheet items).

## Type roles
- UI: Geist Variable (`font-sans`), 12–13px controls, 13–15px reading text, 18–20px max for page titles. Sentence case everywhere.
- `JetBrains Mono` via the `num` utility: question IDs (`shortId`), mark allocations, timers, paper codes, counts. Nothing else.
- Mathematics: always KaTeX through `<MathRenderer>` (prose + math) or `<Tex>` (pure LaTeX). Never render a question string as plain text.

## Banned (template tells)
- Centred hero with gradient headline, floating blobs, glassmorphism cards.
- ALL-CAPS tracked eyebrow labels; `→` appended to buttons; `A · B · C` meta strings; one accented word in a heading.
- Identical rounded cards with soft grey shadows; numbered 01/02/03 markers on non-sequences.
- Fade-up entrance on every section. Allowed motion: one `animate-enter` per view change, `animate-slide-next/prev` on question change, state-change feedback. `prefers-reduced-motion` is honoured globally — keep it that way.

## Components to reuse (don't re-invent)
- `src/components/app/primitives.tsx` — `Btn` (tones: primary/default/ghost/danger), `Chip`, `Kbd`, `Segmented`, `DifficultyMeter`, `PaperTag`, `Marks`.
- `src/components/math/MathRenderer.tsx` — `MathRenderer` (`marks` renders [M1]/[A1]/[R1]/[AG] tags, `parts` breaks a)/b) sub-parts, `preview` for one-line rows), `Tex`, `FigureList` (light-well framing for black-ink diagrams).
- `src/components/question/QuestionBody.tsx` — `QuestionMeta`, `QuestionStatement` (figures + diagram-missing notice), `Markscheme`.
- Reference dock: `toggleDock("desmos" | "booklet")` from `src/lib/store.ts`.

## Dock and hover behavior
- Navigation uses `src/components/app/Dock.tsx` (macOS-style magnification + preview cards with `ModuleArt`). Add new modules there, not as plain links.
- Every `Btn` lifts (scale 1.04) with an ember highlight on hover; pass `hint` for a preview tooltip on important actions.
- Anything that loads shows a layout-matched skeleton (`src/components/app/Skeletons.tsx`), never a spinner or bare text.

## Copy
American English only — run `npm run americanize -- --check` (fails if any British spelling remains in UI or question data).

Name things by what students do ("Practise 42", "Start timed paper", "Show markscheme"). Empty and error states say what happened and the next action, without apology.

## Pre-flight audit (run before saying UI work is done)
1. `npx tsc --noEmit` and `npx vitest run` — includes `src/lib/corpus.test.ts`, which fails on any raw LaTeX or unrenderable math in `public/questions.json`.
2. `grep -rnE "#[0-9a-fA-F]{6}" src/components src/views` — hex only allowed in SVG visualisers/canvas strokes.
3. `grep -rnE "uppercase|tracking-widest|rounded-(2xl|3xl|full)|shadow-(lg|xl|2xl)|bg-gradient" src/components src/views` — every hit needs a reason (rounded-full is fine for dots/progress bars).
4. Open the page in the browser at 1440px and 375px: no horizontal scroll, keyboard focus visible on every control, no red KaTeX, figures legible.
5. Run `node scripts/smoke.mjs` (Playwright) — zero console errors across all modules.
