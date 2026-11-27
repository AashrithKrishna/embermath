// Converts British spellings to American English.
//
//   node scripts/americanize.mjs            # seed JSON prose fields + src/ UI text
//   node scripts/americanize.mjs --check    # report only, exit 1 if anything would change
//
// Seed records: only PROSE_FIELDS change (never ids, image URLs, paper codes).
// Source files: the whole text is converted; URLs, aria-* attributes and LaTeX
// command names are protected by americanize() itself.
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { americanize, PROSE_FIELDS } from "./lib/americanize.mjs"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const check = process.argv.includes("--check")
let changes = 0

for (const file of ["paper3_seed_questions.json", "original_seed_questions.json"]) {
  const full = path.join(root, file)
  const records = JSON.parse(readFileSync(full, "utf8"))
  let n = 0
  for (const r of records) {
    for (const f of PROSE_FIELDS) {
      if (typeof r[f] !== "string") continue
      const next = americanize(r[f])
      if (next !== r[f]) {
        n += 1
        r[f] = next
      }
    }
  }
  changes += n
  console.log(`${file}: ${n} field(s) ${check ? "would change" : "updated"}`)
  if (!check && n) writeFileSync(full, JSON.stringify(records, null, 2) + "\n")
}

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = path.join(dir, name)
    return statSync(p).isDirectory() ? walk(p) : [p]
  })
}
for (const file of [...walk(path.join(root, "src")), path.join(root, "index.html")]) {
  if (!/\.(tsx?|css|html)$/.test(file) || /\.test\.ts$/.test(file)) continue
  const text = readFileSync(file, "utf8")
  const next = americanize(text)
  if (next !== text) {
    changes += 1
    console.log(`${path.relative(root, file)} ${check ? "would change" : "updated"}`)
    if (!check) writeFileSync(file, next)
  }
}

if (check && changes) process.exit(1)
