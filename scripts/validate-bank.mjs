// Deterministic validator for the question bank (seed JSONs + live MySQL table).
//
//   node scripts/validate-bank.mjs [--json] [--no-db] [--verbose]
//
// Prints a summary table (issue code x source), writes reports/validation.json,
// and exits 1 if any ERROR-level issue exists. --json prints the report to stdout.
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { LEVEL, lintRecord } from "./lib/bank-lint.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const JSON_OUT = args.includes("--json");
const NO_DB = args.includes("--no-db");
const VERBOSE = args.includes("--verbose");

export const SEED_FILES = ["paper3_seed_questions.json", "original_seed_questions.json", "wave1_seed_questions.json", "wave2_aa_seed_questions.json", "wave2_ai_seed_questions.json", "wave3_aa_seed_questions.json", "wave3_ai_seed_questions.json", "wave4_aa_seed_questions.json", "wave4_ai_seed_questions.json", "wave5_aa_seed_questions.json", "wave5_ai_seed_questions.json", "wave6_aa_seed_questions.json", "wave6_ai_seed_questions.json"];

const sources = [];
for (const file of SEED_FILES) {
  const p = path.join(root, file);
  if (!existsSync(p)) continue;
  const records = JSON.parse(readFileSync(p, "utf8")).map((r, i) => ({
    ref: `${file}#${i}`,
    statement: r.statement,
    markscheme: r.markscheme,
    tips: r.tips,
    images: r.images ?? [],
    diagramMissing: Boolean(r.diagram_missing),
  }));
  sources.push({ name: file, records });
}

if (!NO_DB) {
  try {
    const { db, pool, schema } = await import("../server/db.mjs");
    const rows = await db.select().from(schema.questions);
    await pool.end();
    const parse = (v) => {
      try {
        const a = JSON.parse(v ?? "[]");
        return Array.isArray(a) ? a : [];
      } catch {
        return [];
      }
    };
    sources.push({
      name: "mysql:questions",
      records: rows.map((r) => ({
        ref: `mysql:${r.id}`,
        statement: r.statement,
        markscheme: r.markscheme,
        tips: r.tips,
        images: parse(r.images),
        diagramMissing: Boolean(r.diagramMissing),
      })),
    });
  } catch (e) {
    console.error(`DB check skipped: ${e.message}`);
    sources.push({ name: "mysql:questions", records: [], error: e.message });
  }
}

const report = { generatedAt: new Date().toISOString(), totals: { ERROR: 0, WARN: 0 }, bySource: {}, issues: [] };
const codes = Object.keys(LEVEL);
for (const src of sources) {
  const counts = Object.fromEntries(codes.map((c) => [c, 0]));
  for (const rec of src.records) {
    for (const issue of lintRecord(rec)) {
      counts[issue.code]++;
      report.totals[issue.level]++;
      report.issues.push({ source: src.name, ref: rec.ref, ...issue });
    }
  }
  report.bySource[src.name] = { records: src.records.length, ...(src.error ? { error: src.error } : {}), counts };
}

mkdirSync(path.join(root, "reports"), { recursive: true });
writeFileSync(path.join(root, "reports", "validation.json"), JSON.stringify(report, null, 2) + "\n");

if (JSON_OUT) {
  console.log(JSON.stringify(report, null, 2));
} else {
  const names = sources.map((s) => s.name);
  const short = (n) => n.replace("_seed_questions.json", "").replace("seed_questions.json", "aa").replace("mysql:questions", "mysql");
  const w = 20;
  console.log(["code".padEnd(w), "level".padEnd(6), ...names.map((n) => short(n).padStart(8))].join(" "));
  console.log(["records".padEnd(w), "".padEnd(6), ...sources.map((s) => String(s.records.length).padStart(8))].join(" "));
  for (const c of codes) {
    const row = sources.map((s) => report.bySource[s.name].counts[c]);
    console.log([c.padEnd(w), LEVEL[c].padEnd(6), ...row.map((n) => String(n).padStart(8))].join(" "));
  }
  console.log(`\nERROR: ${report.totals.ERROR}  WARN: ${report.totals.WARN}  (details: reports/validation.json)`);
  if (VERBOSE) for (const i of report.issues) console.log(`${i.level} ${i.code} ${i.ref} [${i.field}] ${i.detail}`);
}
process.exit(report.totals.ERROR > 0 ? 1 : 0);
