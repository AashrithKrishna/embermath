# EmberMath

A free question bank and exam trainer for **IB Mathematics: Analysis and Approaches HL** and **Applications and Interpretation HL**.

Practise in the real exam format (Paper 1, Paper 2 and Paper 3 questions with full markschemes), at real exam timings, and see where your marks and minutes go.

**Live site:** https://embermath.aa-hl-question-bank.workers.dev

## Features

- About 3,000 original questions (AA HL and AI HL), each with a full markscheme and an examiner tip. Every answer was checked by an independent solver.
- Practice mode with a question timer, scratchpad and self-marking.
- Exam builder that follows the real paper specifications and timings.
- Statistics: score and pace history, weak topics.
- Reference panel: formula booklet, calculator and Desmos beside the question.
- Cheat sheets with interactive simulations.
- Keyboard shortcuts throughout.

## Tech

React 19, Vite, TypeScript, Tailwind CSS v4 and KaTeX. The site is static and served by Cloudflare Workers. A local MySQL database and a small API (`server/`) are used only to assemble the question bank into `public/questions.json`.

## Running locally

```bash
npm ci
npm run dev:ui        # front end only, reads public/questions.json
npx vitest run        # tests
```

To rebuild the question bank from the seed files:

```bash
npm run db:setup      # starts MySQL on 127.0.0.1:3307, migrates and seeds
npm run server        # API on http://127.0.0.1:8787
curl -s http://127.0.0.1:8787/api/questions -o public/questions.json
node scripts/validate-bank.mjs --no-db
```

## Adding questions

New questions go in a new `*_seed_questions.json` file at the repository root. Register it in `SOURCES` in `scripts/seed.mjs` and in `SEED_FILES` in `scripts/validate-bank.mjs`. Records follow the format of `original_seed_questions.json`. Only add original or openly licensed content, with attribution.

## Licence

- **Code:** MIT (see `LICENSE`).
- **Questions:** CC BY-NC-SA 4.0 (see `CONTENT-LICENSE.md`).

Not affiliated with or endorsed by the International Baccalaureate Organization.
