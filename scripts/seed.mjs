import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { sql } from "drizzle-orm"
import { db, pool, schema } from "../server/db.mjs"

const { questions } = schema
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")

// `course: null` means each record carries its own `course` field.
const SOURCES = [
  { file: "paper3_seed_questions.json", course: null },
  { file: "original_seed_questions.json", course: null },
  { file: "wave1_seed_questions.json", course: null },
  { file: "wave2_aa_seed_questions.json", course: null },
  { file: "wave2_ai_seed_questions.json", course: null },
  { file: "wave3_aa_seed_questions.json", course: null },
  { file: "wave3_ai_seed_questions.json", course: null },
  { file: "wave4_aa_seed_questions.json", course: null },
  { file: "wave4_ai_seed_questions.json", course: null },
  { file: "wave5_aa_seed_questions.json", course: null },
  { file: "wave5_ai_seed_questions.json", course: null },
]

const jsonList = (value) => {
  const list = Array.isArray(value) ? value.filter((u) => typeof u === "string" && u.trim()) : []
  return list.length ? JSON.stringify(list) : null
}

const clampDifficulty = (value) => {
  const n = Number(value)
  if (!Number.isFinite(n)) return 3
  return Math.min(5, Math.max(1, Math.round(n)))
}

// Stable content hash: identical questions map to the same id, so re-seeding
// is idempotent. course is part of the hash, so the same question in two
// courses stays two distinct rows. Enrichment metadata (source, images,
// diagram flag, tips) is deliberately NOT hashed, so recovering a diagram does
// not change a question's id.
function toRow(record, course) {
  const row = {
    course,
    year: record.year ?? null,
    session: record.session ?? null,
    timezone: record.timezone ?? null,
    paper: record.paper ?? null,
    topic: String(record.topic ?? "").trim(),
    subtopic: record.subtopic ? String(record.subtopic).trim() : null,
    difficulty: clampDifficulty(record.difficulty),
    marks: Number.isFinite(Number(record.marks)) ? Number(record.marks) : 0,
    statement: String(record.statement ?? "").trim(),
    latex: record.latex ? String(record.latex) : null,
    imageUrl: record.image_url ? String(record.image_url) : null,
    markscheme: record.markscheme ? String(record.markscheme).trim() : null,
  }
  const id = createHash("sha1").update(JSON.stringify(row)).digest("hex")
  const images = jsonList(record.images)
  const firstImage = Array.isArray(record.images) ? record.images.find(Boolean) : null
  return {
    id,
    ...row,
    imageUrl: row.imageUrl ?? firstImage ?? null,
    source: record.source ? String(record.source) : null,
    images,
    markschemeImages: jsonList(record.markscheme_images),
    diagramMissing: record.diagram_missing ? 1 : 0,
    tips: record.tips ? String(record.tips).trim() : null,
  }
}

function isValid(row) {
  return Boolean(row.topic && (row.statement || row.latex || row.imageUrl))
}

const rows = []
const seen = new Set()
const perCourse = []
let skipped = 0

for (const { file, course: fileCourse } of SOURCES) {
  const filePath = path.join(root, file)
  const raw = JSON.parse(readFileSync(filePath, "utf8"))
  if (!Array.isArray(raw)) {
    console.error(`Seed file must contain a JSON array: ${filePath}`)
    process.exit(1)
  }
  let added = 0
  for (const record of raw) {
    const course = fileCourse ?? record.course
    if (!course) {
      skipped += 1
      continue
    }
    const row = toRow(record, course)
    if (!isValid(row)) {
      skipped += 1
      continue
    }
    if (seen.has(row.id)) continue
    seen.add(row.id)
    rows.push(row)
    added += 1
  }
  perCourse.push({ course: fileCourse ?? "per-record", file, added })
}

const BATCH = 100
await db.transaction(async (tx) => {
  await tx.delete(questions)
  for (let i = 0; i < rows.length; i += BATCH) {
    await tx.insert(questions).values(rows.slice(i, i + BATCH))
  }
})

for (const { course, file, added } of perCourse) {
  console.log(`Seeded ${added} ${course} questions from ${file}.`)
}
if (skipped) console.log(`Skipped ${skipped} invalid record(s).`)

const counts = await db
  .select({ course: questions.course, count: sql`count(*)` })
  .from(questions)
  .groupBy(questions.course)
for (const { course, count } of counts) {
  console.log(`Rows in database — ${course}: ${count}`)
}
console.log(`Total rows: ${rows.length}`)
await pool.end()