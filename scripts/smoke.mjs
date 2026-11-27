// Playwright smoke test for every module of the app.
//
//   node scripts/smoke.mjs [baseUrl]      (default http://localhost:5173)
//
// Fails (exit 1) on: console errors / page errors, red KaTeX (.katex-error),
// broken figures (naturalWidth 0), Desmos not mounting, missing module UI.
// Screenshots land in reports/screens/ for visual review.
import { mkdirSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { chromium } from "playwright"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const base = (process.argv[2] ?? "http://localhost:5173").replace(/\/$/, "")
const shots = path.join(root, "reports", "screens")
mkdirSync(shots, { recursive: true })

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
const browser = await chromium.launch({ executablePath: CHROME, headless: true }).catch(() => chromium.launch())
const failures = []
const notes = []

// Third-party noise we do not control (analytics in Desmos, favicon).
const IGNORE = [/favicon/i, /desmos\.com\/.*(analytics|telemetry)/i, /Failed to load resource.*\/api\/questions/i]

async function session(viewport, label) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1 })
  const page = await context.newPage()
  const errors = []
  page.on("console", (m) => {
    if (m.type() === "error" && !IGNORE.some((r) => r.test(m.text()))) errors.push(m.text())
  })
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`))

  const check = async (name, fn) => {
    try {
      await fn()
      notes.push(`ok   ${label} ${name}`)
    } catch (e) {
      failures.push(`${label} ${name}: ${e.message.split("\n")[0]}`)
    }
  }
  const katexAudit = async (where) => {
    const red = await page.locator(".katex-error").count()
    if (red) throw new Error(`${red} .katex-error elements on ${where}`)
    const fallbacks = await page.locator(".math-fallback").count()
    if (fallbacks) notes.push(`warn ${label} ${where}: ${fallbacks} math fallback(s)`)
  }
  const figureAudit = async (where) => {
    await page.waitForTimeout(800)
    const broken = await page.$$eval(".figure-well img", (imgs) =>
      imgs.filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.src),
    )
    if (broken.length) throw new Error(`${broken.length} broken figure(s) on ${where}: ${broken[0]}`)
  }

  await check("landing", async () => {
    await page.goto(`${base}/#/`, { waitUntil: "networkidle" })
    await page.getByRole("heading", { level: 1, name: /Work the problem/ }).waitFor()
    await page.locator("canvas").first().waitFor()
    await page.getByText("Try one now").waitFor()
    await page.waitForTimeout(1200)
    await katexAudit("landing")
    await page.screenshot({ path: path.join(shots, `${label}-landing.png`) })
    if (viewport.width >= 1024) {
      await page.locator("#workspace").scrollIntoViewIfNeeded()
      await page.getByRole("link", { name: "Exam" }).last().hover()
      await page.getByRole("tooltip").filter({ hasText: "Exam generator" }).last().waitFor({ state: "visible" })
      await page.screenshot({ path: path.join(shots, `${label}-landing-dock.png`) })
    }
    await page.getByRole("button", { name: /Start Analysis/ }).click()
    await page.waitForURL(/#\/home/)
  })

  await check("dock preview + magnify", async () => {
    if (viewport.width < 1024) return
    await page.goto(`${base}/#/home`, { waitUntil: "networkidle" })
    const bank = page.getByRole("navigation", { name: "Primary" }).first().getByRole("link", { name: /Bank/ })
    const box = await bank.boundingBox()
    await page.mouse.move(box.x + 4, box.y + 4)
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 6 })
    await page.getByRole("tooltip").filter({ hasText: "Question bank" }).first().waitFor({ state: "visible" })
    const t = await bank.locator("span").first().evaluate((el) => getComputedStyle(el).transform)
    if (t === "none" || t === "matrix(1, 0, 0, 1, 0, 0)") throw new Error("dock item did not magnify")
    await page.screenshot({ path: path.join(shots, `${label}-dock-hover.png`) })
  })

  await check("hub", async () => {
    await page.goto(`${base}/#/home`, { waitUntil: "networkidle" })
    await page.getByRole("heading", { name: /Today’s question/ }).waitFor()
    await page.getByRole("heading", { name: "Coverage" }).waitFor()
    await katexAudit("hub")
    await page.screenshot({ path: path.join(shots, `${label}-hub.png`) })
  })

  await check("course switch", async () => {
    await page.getByRole("radio", { name: "AI HL" }).click()
    if (viewport.width < 768) {
      await page.getByRole("radio", { name: "AA HL" }).click()
      return
    }
    await page.waitForTimeout(200)
    const txt = await page.locator("header").innerText()
    if (!/\d+\s*questions/.test(txt)) throw new Error("telemetry missing")
    await page.getByRole("radio", { name: "AA HL" }).click()
  })

  await check("bank", async () => {
    await page.goto(`${base}/#/bank`, { waitUntil: "networkidle" })
    await page.getByRole("searchbox", { name: "Search questions" }).or(page.getByLabel("Search questions")).first().waitFor()
    const rows = await page.locator("ol > li").count()
    if (rows < 10) throw new Error(`only ${rows} rows`)
    await page.locator("ol > li button[aria-expanded]").first().click()
    await page.getByRole("button", { name: "Show markscheme" }).first().click()
    await katexAudit("bank")
    await figureAudit("bank")
    await page.screenshot({ path: path.join(shots, `${label}-bank.png`) })
  })

  await check("bank figures filter", async () => {
    if (viewport.width < 1024) return
    await page.getByRole("button", { name: /Only questions with figures/ }).click()
    await page.waitForTimeout(300)
    const first = page.locator("ol > li button[aria-expanded]").first()
    if (await first.count()) {
      await first.click()
      await page.locator(".figure-well img").first().waitFor({ timeout: 8000 })
      await figureAudit("bank figures")
      await page.screenshot({ path: path.join(shots, `${label}-bank-figure.png`) })
    } else notes.push(`warn ${label}: no questions with figures`)
    await page.getByRole("button", { name: /Only questions with figures/ }).click()
  })

  await check("practice", async () => {
    await page.goto(`${base}/#/practice`, { waitUntil: "networkidle" })
    await page.getByRole("article", { name: "Current question" }).waitFor()
    const before = await page.locator("article").innerText()
    await page.keyboard.press("j")
    await page.waitForTimeout(250)
    const after = await page.locator("article").innerText()
    if (before === after) throw new Error("J did not advance")
    const qt = page.getByRole("timer", { name: /Time on this question/ })
    const q1 = await qt.innerText()
    await page.waitForTimeout(2200)
    if ((await qt.innerText()) === q1) throw new Error("practice question timer not counting")
    await page.keyboard.press("m")
    await page.waitForTimeout(200)
    await page.keyboard.press("y")
    await katexAudit("practice")
    await page.screenshot({ path: path.join(shots, `${label}-practice.png`) })
  })

  await check("booklet dock", async () => {
    await page.keyboard.press("b")
    await page.getByLabel("Search formula booklet").fill("binomial")
    await page.waitForTimeout(200)
    const hits = await page.locator('[aria-label="Reference dock"] li').count()
    if (!hits) throw new Error("booklet search returned nothing")
    await katexAudit("booklet")
    await page.screenshot({ path: path.join(shots, `${label}-booklet.png`) })
  })

  await check("desmos dock", async () => {
    await page.evaluate(() => document.activeElement instanceof HTMLElement && document.activeElement.blur())
    await page.keyboard.press("g")
    await page.locator(".dcg-container, [data-testid=desmos-host] .dcg-calculator-api-container").first().waitFor({ timeout: 20000 })
    await page.waitForTimeout(800)
    await page.screenshot({ path: path.join(shots, `${label}-desmos.png`) })
    // Switching back to the booklet must fully hide the Desmos canvas.
    await page.keyboard.press("b")
    await page.waitForTimeout(300)
    const bleed = await page.evaluate(() => {
      const host = document.querySelector("[data-testid=desmos-host]")
      const wrapper = host?.closest("[aria-hidden]")
      if (!wrapper) return "no wrapper"
      const cs = getComputedStyle(wrapper)
      return cs.opacity === "0" && cs.pointerEvents === "none" ? "" : `desmos visible under booklet (opacity ${cs.opacity})`
    })
    if (bleed) {
      await page.keyboard.press("Escape")
      throw new Error(bleed)
    }
    await page.screenshot({ path: path.join(shots, `${label}-booklet-after-desmos.png`) })
    await page.keyboard.press("Escape")
  })

  await check("exam generator", async () => {
    await page.goto(`${base}/#/exam`, { waitUntil: "networkidle" })
    await page.getByRole("button", { name: "Start timed paper" }).waitFor()
    await page.screenshot({ path: path.join(shots, `${label}-exam-build.png`) })
    await page.getByRole("button", { name: "Start timed paper" }).click()
    const paperClock = page.getByRole("timer").first()
    await paperClock.waitFor()
    const t1 = await paperClock.innerText()
    await page.waitForTimeout(2200)
    const t2 = await paperClock.innerText()
    if (t1 === t2) throw new Error("timer not counting down")
    const qClock = await page.getByRole("timer", { name: /Time on this question/ }).innerText()
    if (!/00:0[1-9]/.test(qClock)) throw new Error(`question clock not counting: ${qClock}`)
    await page.keyboard.press("j")
    await page.keyboard.press("f")
    await katexAudit("exam")
    await page.screenshot({ path: path.join(shots, `${label}-exam-sit.png`) })
    await page.getByRole("button", { name: "Finish" }).click()
    await page.getByRole("heading", { name: "Markscheme" }).waitFor()
    await katexAudit("exam review")
    // Self-mark the first question, tag a mistake, then read the feedback.
    const first = page.getByRole("spinbutton").first()
    await first.fill("0")
    await page.getByRole("group", { name: /Why marks were lost/ }).first().getByRole("button", { name: "Careless slip" }).click()
    await page.getByRole("radio", { name: "Statistics and feedback" }).click()
    await page.getByRole("heading", { name: "What to work on" }).waitFor()
    await page.getByRole("heading", { name: "Time per question" }).waitFor()
    if (!(await page.getByText(/Careless slip: \d+ marks lost/).count())) throw new Error("mistake feedback missing")
    await page.screenshot({ path: path.join(shots, `${label}-exam-stats.png`), fullPage: true })
    await page.getByRole("button", { name: "All statistics" }).click()
    await page.getByRole("heading", { name: /statistics$/ }).waitFor()
  })

  await check("paper 3", async () => {
    await page.goto(`${base}/#/home`, { waitUntil: "networkidle" })
    await page.goto(`${base}/#/exam`, { waitUntil: "networkidle" })
    const p3 = page.getByRole("button", { name: /Paper 3/ })
    if (await p3.isDisabled()) throw new Error("no Paper 3 questions for AA HL")
    await p3.click()
    await page.getByRole("button", { name: "Start timed paper" }).click()
    await page.getByRole("timer").first().waitFor()
    await katexAudit("paper 3")
    await page.screenshot({ path: path.join(shots, `${label}-paper3.png`) })
  })

  await check("cheatsheets", async () => {
    await page.goto(`${base}/#/cheatsheets`, { waitUntil: "networkidle" })
    await page.getByRole("heading", { level: 1 }).waitFor()
    await page.getByRole("button", { name: /Complex numbers/ }).click()
    await page.getByRole("img", { name: "Argand diagram" }).waitFor()
    await page.getByRole("button", { name: /Maclaurin/ }).click()
    await page.getByRole("img", { name: /Maclaurin approximation/ }).waitFor()
    await katexAudit("cheatsheets")
    await page.screenshot({ path: path.join(shots, `${label}-sheets.png`), fullPage: true })
  })

  await check("no horizontal overflow", async () => {
    for (const v of ["home", "bank", "practice", "exam", "cheatsheets"]) {
      await page.goto(`${base}/#/${v}`, { waitUntil: "networkidle" })
      const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
      if (over > 2) throw new Error(`${v} overflows by ${over}px`)
    }
  })

  if (errors.length) failures.push(`${label} console: ${[...new Set(errors)].slice(0, 5).join(" | ")}`)
  await context.close()
}

await session({ width: 1440, height: 900 }, "desktop")
await session({ width: 390, height: 844 }, "mobile")
await browser.close()

for (const n of notes) console.log(n)
if (failures.length) {
  console.log(`\nFAILED (${failures.length})`)
  for (const f of failures) console.log(`  ✗ ${f}`)
  process.exit(1)
}
console.log("\nAll smoke checks passed.")
