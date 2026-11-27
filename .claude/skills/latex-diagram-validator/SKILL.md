---
name: latex-diagram-validator
description: Use when checking or fixing math rendering / missing-diagram problems in the question bank — after editing or importing questions, before seeding MySQL or regenerating public/questions.json, when KaTeX shows red errors or stray "$" signs in the UI, or when reviewing reports/validation.json. Explains validate-bank.mjs, repair-latex.mjs, every issue code, and the fix loop.
---

# LaTeX and diagram validator

## Commands (repo root)

```bash
npm run validate                          # = node scripts/validate-bank.mjs; seeds + live MySQL; exit 1 on any ERROR
node scripts/validate-bank.mjs --no-db    # seed JSONs only (no MySQL needed)
node scripts/validate-bank.mjs --verbose  # print every issue with the record ref
node scripts/validate-bank.mjs --json     # report to stdout (it is always written to reports/validation.json)
npm run repair:latex                      # = node scripts/repair-latex.mjs [--dry-run] [--verbose]
node --test scripts/repair-latex.test.mjs
```

Refs look like `seed_questions.json#342` (array index) or `mysql:<id>`.
Shared logic lives in `scripts/lib/bank-lint.mjs`. The delimiter grammar matches the frontend (`src/lib/math.ts`): only `$..$` and `$$..$$` open math, and `\$` never does.

## Issue codes

| code | level | meaning, and the usual fix |
|---|---|---|
| UNBALANCED_DOLLAR | ERROR | `$`/`$$` with no closer. Usually an unescaped currency sign (`$12,000`, `10000$ per year`, `dollars ($)`) or a stray `$$`/`$$$`. Repair escapes currency as `\$`. |
| LEGACY_DELIMITER | ERROR | `\(..\)` / `\[..\]` in prose; the UI ignores them. Repair converts them to `$`/`$$`. |
| UNBALANCED_BRACES | ERROR | `{`/`}` mismatch inside one math segment. Fix by hand. |
| UNMATCHED_ENV | ERROR | `\begin{X}` without `\end{X}` (or misnested). Fix by hand. |
| KATEX_PARSE | ERROR | KaTeX (`throwOnError: true`) rejects the segment; the message is in `detail`. |
| BARE_LATEX | ERROR | `\frac`, `\to`, `\begin{align*}` ... outside math. Repair wraps the run in `$..$`, wraps environments in `$$..$$`, and turns `(x \to \infty)` back into `$x \to \infty$` (the scrape had stripped the backslashes of `\(..\)`). |
| HTML_ENTITY | ERROR | Literal `&le;`, `&epsilon;`, `&lt;` ... Repair decodes them to LaTeX inside math and to Unicode in prose. |
| HTML_TAG | ERROR | Leftover `<p>`, `<img>`, `<td>` ... Re-flatten from source with `htmlToStatementV2`. |
| EMPTY_STATEMENT / EMPTY_MARKSCHEME | ERROR | Missing content. Recover it from the source (`scraper/cache/edunade`) or write it. |
| FIGURE_UNFLAGGED | ERROR | The statement references a figure (`detectMissingFigure`), has no `images`, isn't satisfied by an inline `$$..$$` table, and `diagram_missing` is not set. Run `npm run recover:diagrams -- --offline`, which sets the flag. |
| FIGURE_MISSING | WARN | Same, but already flagged `diagram_missing: 1`. The only warning allowed to remain: an unrecoverable diagram. |

## Fix loop

1. `npm run recover:diagrams -- --offline` (images, tables, flags; reruns produce identical files).
2. `npm run repair:latex`, then run it again; the second run must report `Total fields repaired: 0`.
3. `node scripts/validate-bank.mjs --no-db --verbose`. Fix any remaining ERRORs by hand in the seed JSON, then repeat from step 2.
4. `node scripts/seed.mjs && npm run validate` (this also checks MySQL), then refresh `public/questions.json` from the API.

## Gotchas

- Fix the data in the seed JSONs, never only in MySQL: `seed.mjs` wipes and reloads the table.
- Every repair pass is guarded and is kept only if the field's weighted ERROR count does not rise (`UNBALANCED_DOLLAR` weighs 10, because an unclosed `$` hides every later issue).
- Currency vs math: `$2, 3, 5$`, `$5$` and `$32nx$` are math. Money is `$<number>` followed by prose/punctuation/end, a `$` glued after digits, or `($)`.
- An empty display opener (`$$ $$P(A)=..$$`) shifts every later delimiter. Collapse it only at an opener position, never the `$$ $$` between two blocks (`$$a$$ $$b$$`).
- Paren restoration applies only to groups preceded by whitespace. Never rewrite `f(x)` or `{(2\sqrt2)^2}` inside an environment.
- Prose typed in math mode (`$Area \ of \ the \ triangle$`) becomes plain text. Math that legitimately contains words (`P(H|read)`) is left alone.
- After any heuristic change, diff the seeds against a backup and read the changes; a 0-error count can still hide wrong rewrites.
