# EmberMath recolor: remove the purple (2026-11-25)

The user says the purple/amethyst gradient look "screams AI". Replace it everywhere. Their standing rules (shared memory):
- No purple, violet or indigo. No pink, rose, blush, magenta, salmon or peach, including tints (the old `ember-soft #ffb38a` is a peach and the old `hard #f43f5e` is a rose: both must go).
- Cool, quiet slate/blue-grey neutrals. ONE restrained accent. No gradients used as decoration. No new glows.
- Do not change layout, copy, features or fonts. Color only.

## Token contract (identical in every file)

Base (slate, replaces the violet-tinted blacks):
| token | value |
|---|---|
| `page` | `#0d1117` |
| `surface` | `#141a22` |
| `raised` | `#1b222c` |
| `raised-2` | `#232b37` |
| `line` | `rgba(148, 163, 184, 0.14)` |
| `line-strong` | `rgba(148, 163, 184, 0.28)` |
| `hair` | `rgba(255, 255, 255, 0.06)` |
| `ink` | `#e6eaf0` |
| `ink-muted` | `#9aa5b4` |
| `ink-faint` | `#697586` |

The one accent (ember orange, the brand name):
| token | value | use |
|---|---|---|
| `accent` | `#f06a2a` | primary buttons, active states, focus ring, links, selected chips, mark highlights |
| `accent-bright` | `#ff7d3f` | hover on accent fills |
| `accent-wash` | `rgba(240, 106, 42, 0.12)` | selected backgrounds |
| `accent-line` | `rgba(240, 106, 42, 0.34)` | selected/hover borders |
| `accent-ink` | `#0d1117` | text/icons ON an accent fill (dark text; white on orange fails contrast) |

Semantic (difficulty, marking outcome only): `easy #10b981`, `medium #eab308`, `hard #ef4444` (red, NOT rose).

Mapping from old names (every class, CSS var and hex literal):
- `amethyst`, `amethyst-bright`, `amethyst-deep`, `ember`, `ember-bright`, `ember-deep` → `accent` (`-bright` → `accent-bright` where it is a hover)
- `amethyst-soft`, `ember-soft` (used as text highlight) → `accent` for emphasis, or `ink` where it was just "bright text"
- `amethyst-wash`, `ember-wash` → `accent-wash`; `ember-line` and `amethyst-*/NN` borders → `accent-line`
- `bg-amethyst text-white` → `bg-accent text-accent-ink`
- legacy `verdigris*`, `danger`, `warning` aliases: keep working, point `danger` at `#ef4444`
- old hex literals: `#9333ea #a855f7 #7e22ce` → accent; `#c084fc #e9d5ff` → `#e6eaf0` (ink) or accent; `#ffb38a #ff8a4c` → accent/accent-bright; `#f43f5e` → `#ef4444`; `#09090b #121118 #1a1824 #221f2f` → page/surface/raised/raised-2; `#ededf2 #a3a1b3 #6e6b80` → ink/ink-muted/ink-faint; `rgba(168,85,247,…)` → `rgba(148,163,184,…)` for lines/grids or `rgba(240,106,42,…)` for accent glows.
- Gradients: remove decorative ones (brand mark, headings, glows). Known case: gradient text on the landing hero heading (`src/views/Landing.tsx` around line 127, `bg-clip-text`/`text-transparent`) must become solid color (ink, with the accent word in solid `accent` if one word is highlighted). Functional shimmer on skeletons stays but uses slate (`#161c25 → #1f2631`).

## Done when
`grep -rniE "amethyst|#(9333ea|a855f7|c084fc|7e22ce|e9d5ff|ffb38a|ff8a4c|f43f5e|121118|1a1824|221f2f|09090b)|168, ?85, ?247" <your files>` returns nothing, and `npx tsc --noEmit` is clean. Do not run builds, deploys or dev servers; the orchestrator does that.

## Addendum: ember, teal and gold (2026-11-25, ASH-33)

The slate/one-accent contract above was superseded the same day by the golden-angle palette now in `src/index.css`: page `#081110`, ember `#f06a2a` (actions), teal `#01b19c` (structure, ember + 137.5° in OKLCH). Gold is the third and last color.

| token | value | use |
|---|---|---|
| `gold` | `#d5b629` | score and grade readouts, the score line on charts, starred state, reasoning/AG mark tags |
| `gold-bright` | `#e6c93f` | hover on a gold element |
| `gold-wash` | `rgba(213, 182, 41, 0.12)` | background behind a gold tag or selected-and-starred row |
| `gold-line` | `rgba(213, 182, 41, 0.34)` | border of a gold tag |
| `medium` | `#d5b629` (was `#eab308`) | the middle step of easy / medium / hard: difficulty 3, "partly" outcome, up to 1.5× over budget, flagged |

Derivation: ember is OKLCH hue 42.9°; 42.9° + 3 × 137.5° = 455.4° ≡ 95.4°. `#d5b629` is OKLCH(0.781 0.150 95.6°). It is a step lighter than ember and teal (L 0.68) because a yellow at L 0.68 reads olive.

Roles, so the three never compete:
- Ember: what you can press (primary buttons, active and selected controls, links).
- Teal: structure (focus ring, part labels, method marks, running indicators).
- Gold: what you earned. One gold figure per group at most: the score KPI, the score line of the trend chart, the self-marked total, a starred question. Never a button fill, never a heading, never a large area, never a glow or gradient.
- A score that does not exist yet ("–") stays `ink`, not gold.

Contrast (WCAG 2.x, AA needs 4.5:1 for text):
| gold text on | ratio |
|---|---|
| `page` `#081110` | 9.61 |
| `surface` `#0f1b19` | 8.86 |
| `raised` `#172422` | 8.04 |
| `raised-2` `#1f2e2c` | 7.10 |
| `gold-wash` over `surface` (mark tags) | 7.07 |
| `medium/15` over `raised` (the "Partly" button, worst case in use) | 5.94 |

`gold-bright` on the same surfaces is 8.6 to 11.7. Text on a gold fill must be `accent-ink` `#081110` (9.61); white on gold fails.

Known overlap: `medium` and `gold` are the same hex on purpose (the task replaced the generic yellow), so a caution figure such as "Lost to tagged mistakes" (`text-medium`) is the same color as the score beside it. If that reads as ambiguous, move caution figures to `ink` and keep gold for results only.
