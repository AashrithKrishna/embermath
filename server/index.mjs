import { existsSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import cors from "cors"
import express from "express"
import { db, pool, schema } from "./db.mjs"

const { questions } = schema
const app = express()

app.use(cors())
app.use(express.json())

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" })
})

// images / markscheme_images are stored as JSON text; expose them as arrays.
function parseList(value) {
  if (!value) return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.filter((u) => typeof u === "string" && u) : []
  } catch {
    return []
  }
}

function toApiRow(row) {
  const images = parseList(row.images)
  const markschemeImages = parseList(row.markschemeImages)
  return {
    ...row,
    images,
    markschemeImages,
    imageUrl: row.imageUrl ?? images[0] ?? null,
    diagramMissing: row.diagramMissing ?? 0,
  }
}

app.get("/api/questions", async (_req, res) => {
  try {
    const rows = await db.select().from(questions).orderBy(questions.topic, questions.id)
    res.json(rows.map(toApiRow))
  } catch (error) {
    console.error("GET /api/questions failed:", error)
    res.status(500).json({ error: "Failed to load questions" })
  }
})

app.get("/api/stats", async (_req, res) => {
  try {
    const rows = await db
      .select({ course: questions.course, topic: questions.topic, paper: questions.paper })
      .from(questions)
    const courses = {}
    for (const { course, topic, paper } of rows) {
      const c = (courses[course] ??= { questions: 0, topics: new Set(), papers: new Set() })
      c.questions += 1
      c.topics.add(topic)
      if (paper) c.papers.add(paper)
    }
    const out = {}
    for (const [course, c] of Object.entries(courses)) {
      out[course] = { questions: c.questions, topics: c.topics.size, papers: [...c.papers].sort() }
    }
    res.json({ courses: out })
  } catch (error) {
    console.error("GET /api/stats failed:", error)
    res.status(500).json({ error: "Failed to load stats" })
  }
})

// Serve the production build (npm run build → dist/) from the same origin, so
// one public URL (e.g. a Cloudflare tunnel to this port) serves both the app
// and /api. Hashed assets are cached for a year; index.html is never cached.
const dist = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "dist")
if (existsSync(path.join(dist, "index.html"))) {
  app.use(
    express.static(dist, {
      index: "index.html",
      setHeaders(res, file) {
        if (file.endsWith("index.html")) res.setHeader("Cache-Control", "no-cache")
        else if (file.includes(`${path.sep}assets${path.sep}`)) res.setHeader("Cache-Control", "public, max-age=31536000, immutable")
      },
    }),
  )
  app.get(/^(?!\/api\/).*/, (_req, res) => res.sendFile(path.join(dist, "index.html")))
}

const port = Number(process.env.API_PORT ?? 8787)
const server = app.listen(port, "127.0.0.1", () => {
  console.log(`Question bank API listening on http://127.0.0.1:${port}`)
})

async function shutdown() {
  server.close()
  await pool.end()
  process.exit(0)
}
process.on("SIGINT", shutdown)
process.on("SIGTERM", shutdown)