import { useMemo, useRef, useState } from "react"
import { ArrowDown, BookOpen, FileStack, Layers, LayoutGrid, LineChart, NotebookPen, Timer } from "lucide-react"
import { navigate } from "@/lib/router"
import { courseStore, type Course } from "@/lib/store"
import { questionFigures, type Question } from "@/lib/questions"
import { cn } from "@/lib/utils"
import { EmberField } from "@/components/landing/EmberField"
import { EmberMark, Wordmark } from "@/components/app/Brand"
import { Dock, type DockItem } from "@/components/app/Dock"
import { ModuleArt } from "@/components/app/ModuleArt"
import { Markscheme, QuestionMeta, QuestionStatement } from "@/components/question/QuestionBody"
import { MaclaurinVisualizer } from "@/components/sheets/Visualizers"
import { CHEATSHEETS } from "@/data/cheatsheets"

const COURSES: { code: Course; name: string; blurb: string }[] = [
  {
    code: "AA HL",
    name: "Analysis & Approaches",
    blurb: "Proof, series, complex numbers, vectors and calculus at full depth. Built for Paper 1 without a calculator.",
  },
  {
    code: "AI HL",
    name: "Applications & Interpretation",
    blurb: "Modeling, statistics, matrices, graph theory and differential equations, with the GDC doing the heavy lifting.",
  },
]

function enter(course?: Course) {
  if (course) courseStore.set(course)
  navigate("home")
}

export function Landing({ questions, loading }: { questions: Question[]; loading: boolean }) {
  const [reveal, setReveal] = useState(false)
  const card = useRef<HTMLDivElement>(null)

  const sample = useMemo(
    () =>
      questions.find(
        (q) =>
          q.course === "AA HL" &&
          q.marks >= 5 &&
          q.marks <= 7 &&
          q.statement.length > 120 &&
          q.statement.length < 320 &&
          q.statement.includes("$") &&
          questionFigures(q).length === 0 &&
          (q.markscheme?.length ?? 0) < 900,
      ) ?? null,
    [questions],
  )
  const stats = useMemo(() => {
    const by = (c: string) => questions.filter((q) => q.course === c)
    return COURSES.map(({ code }) => {
      const pool = by(code)
      return {
        code,
        total: pool.length,
        topics: new Set(pool.map((q) => q.topic)).size,
        papers: ["Paper 1", "Paper 2", "Paper 3"].map((p) => pool.filter((q) => q.paper === p).length),
        figures: pool.filter((q) => questionFigures(q).length > 0).length,
        topicList: [...new Set(pool.map((q) => q.topic))].sort().slice(0, 14),
      }
    })
  }, [questions])
  const total = questions.length

  // Gentle 3D tilt toward the cursor.
  const onTilt = (e: React.PointerEvent) => {
    const el = card.current
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const r = el.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width - 0.5
    const y = (e.clientY - r.top) / r.height - 0.5
    el.style.transform = `perspective(1100px) rotateY(${x * 6}deg) rotateX(${-y * 6}deg)`
  }
  const resetTilt = () => {
    if (card.current) card.current.style.transform = ""
  }

  const modules: DockItem[] = [
    { id: "home", label: "Hub", icon: <LayoutGrid className="size-[18px]" />, href: "#/home", preview: { title: "Command hub", body: "Today's question, coverage map and progress.", art: <ModuleArt kind="home" /> } },
    { id: "bank", label: "Bank", icon: <Layers className="size-[18px]" />, href: "#/bank", preview: { title: "Question bank", body: `${total || "960+"} questions, filterable down to the subtopic.`, art: <ModuleArt kind="bank" /> } },
    { id: "practice", label: "Practice", icon: <NotebookPen className="size-[18px]" />, href: "#/practice", preview: { title: "Practice mode", body: "One question, a scratchpad, and the markscheme on M.", art: <ModuleArt kind="practice" /> } },
    { id: "exam", label: "Exam", icon: <Timer className="size-[18px]" />, href: "#/exam", preview: { title: "Exam generator", body: "Timed papers to your mark target, printable with markschemes.", art: <ModuleArt kind="exam" /> } },
    { id: "sheets", label: "Sheets", icon: <FileStack className="size-[18px]" />, href: "#/cheatsheets", preview: { title: "Cheatsheets", body: `${CHEATSHEETS.length} sheets and two interactive visualizers.`, art: <ModuleArt kind="cheatsheets" /> } },
    { id: "desmos", label: "Desmos", icon: <LineChart className="size-[18px]" />, href: "#/practice", preview: { title: "Desmos, built in", body: "A live graphing calculator beside every question.", art: <ModuleArt kind="desmos" /> } },
    { id: "booklet", label: "Booklet", icon: <BookOpen className="size-[18px]" />, href: "#/practice", preview: { title: "Formula booklet", body: "Searchable and pinnable, organized by IB topic.", art: <ModuleArt kind="booklet" /> } },
  ]

  return (
    <div className="relative min-h-dvh overflow-x-hidden bg-page">
      {/* HERO */}
      <section className="relative isolate flex min-h-dvh flex-col" onPointerMove={onTilt} onPointerLeave={resetTilt}>
        <EmberField className="absolute inset-0 -z-10 h-full w-full" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-48 bg-gradient-to-t from-page to-transparent" />

        <header className="mx-auto flex w-full max-w-[1240px] items-center gap-3 px-5 py-5">
          <a href="#/" className="flex items-center gap-2.5" aria-label="EmberMath">
            <EmberMark className="size-8" glow />
            <Wordmark className="text-[17px]" />
          </a>
          <nav className="ml-auto hidden items-center gap-6 text-[13px] text-ink-muted md:flex" aria-label="Landing">
            <a href="#workspace" onClick={(e) => scrollTo(e, "workspace")} className="hover:text-accent">Workspace</a>
            <a href="#courses" onClick={(e) => scrollTo(e, "courses")} className="hover:text-accent">Courses</a>
            <a href="#try" onClick={(e) => scrollTo(e, "try")} className="hover:text-accent">Try a question</a>
          </nav>
          <button
            type="button"
            onClick={() => enter()}
            className="ml-auto inline-flex h-9 items-center gap-2 rounded-lg border border-accent-line bg-accent-wash px-3.5 text-[13px] font-medium text-accent transition-[transform,box-shadow] hover:scale-[1.04] hover:shadow-[0_0_24px_-6px_rgba(240,106,42,0.5)] md:ml-6"
          >
            Open workspace
          </button>
        </header>

        <div className="mx-auto grid w-full max-w-[1240px] flex-1 items-center gap-10 px-5 pb-16 pt-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
          <div className="max-w-[620px]">
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-line bg-surface/70 px-3 py-1 text-[12px] text-ink-muted backdrop-blur">
              <span className="size-1.5 rounded-full bg-accent shadow-[0_0_8px_rgba(240,106,42,0.9)]" />
              IB Mathematics AA HL and AI HL
            </p>
            <h1 className="text-[44px] font-semibold leading-[1.02] tracking-[-0.035em] text-ink sm:text-[64px]">
              Work the problem
              <br />
              until it{" "}
              <span className="text-accent">catches.</span>
            </h1>
            <p className="mt-6 max-w-[52ch] text-[16px] leading-relaxed text-ink-muted">
              {loading ? "Hundreds of" : <span className="num text-ink">{total}</span>} exam-style questions with full markschemes. Practice one at a time, sit timed papers built
              to your mark target, and keep Desmos and the formula booklet open beside every question.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {COURSES.map((c, i) => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => enter(c.code)}
                  className={cn(
                    "group inline-flex h-12 items-center gap-3 rounded-xl px-5 text-[14px] font-medium transition-[transform,box-shadow,background] duration-200 hover:scale-[1.04]",
                    i === 0
                      ? "bg-accent text-accent-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] hover:bg-accent-bright hover:shadow-[0_10px_40px_-10px_rgba(240,106,42,0.5)]"
                      : "border border-accent-line bg-surface/70 text-accent backdrop-blur hover:bg-accent-wash hover:shadow-[0_10px_40px_-12px_rgba(240,106,42,0.5)]",
                  )}
                >
                  <span className="num text-[12px] opacity-80">{c.code}</span>
                  Start {c.name.split(" ")[0]}
                </button>
              ))}
            </div>
            <dl className="mt-10 grid max-w-[520px] grid-cols-3 gap-px overflow-hidden rounded-xl border border-line bg-line">
              {[
                ["questions", total],
                ["with figures", questions.filter((q) => questionFigures(q).length > 0).length],
                ["Paper 3 investigations", questions.filter((q) => q.paper === "Paper 3").length],
              ].map(([label, value]) => (
                <div key={label as string} className="bg-surface/80 px-4 py-3 backdrop-blur">
                  {loading ? <div className="skeleton h-6 w-12" /> : <dd className="num text-[22px] leading-none text-ink">{value}</dd>}
                  <dt className="mt-1.5 text-[11.5px] text-ink-faint">{label}</dt>
                </div>
              ))}
            </dl>
          </div>

          {/* Live question card */}
          <div className="relative" id="try">
            <div ref={card} className="surface rounded-2xl p-0 transition-transform duration-200 ease-out will-change-transform">
              <div className="flex items-center justify-between border-b border-line px-5 py-3">
                <span className="text-[12.5px] font-medium text-ink">Try one now</span>
                <span className="flex gap-1.5" aria-hidden="true">
                  <span className="size-2.5 rounded-full bg-hard/70" />
                  <span className="size-2.5 rounded-full bg-medium/70" />
                  <span className="size-2.5 rounded-full bg-easy/70" />
                </span>
              </div>
              <div className="max-h-[440px] overflow-y-auto px-5 py-4">
                {sample ? (
                  <>
                    <QuestionMeta question={sample} />
                    <div className="mt-3">
                      <QuestionStatement question={sample} />
                    </div>
                    {reveal ? (
                      <div className="mt-4 rounded-lg border border-accent-line bg-page/70 p-4">
                        <Markscheme question={sample} />
                      </div>
                    ) : null}
                  </>
                ) : (
                  <div className="grid gap-3" aria-busy="true" aria-label="Loading a sample question">
                    <div className="skeleton h-3 w-1/2" />
                    <div className="skeleton h-4 w-full" />
                    <div className="skeleton h-4 w-11/12" />
                    <div className="skeleton h-4 w-3/4" />
                    <div className="skeleton mt-3 h-20 w-full" />
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 border-t border-line px-5 py-3">
                <button
                  type="button"
                  disabled={!sample}
                  onClick={() => setReveal((r) => !r)}
                  className="h-8 rounded-lg border border-line bg-raised px-3 text-[12.5px] text-ink transition-[transform,border-color,color] hover:scale-[1.04] hover:border-accent-line hover:text-accent disabled:opacity-40"
                >
                  {reveal ? "Hide markscheme" : "Reveal markscheme"}
                </button>
                <button
                  type="button"
                  disabled={!sample}
                  onClick={() => {
                    courseStore.set("AA HL")
                    navigate("practice", { id: sample?.id })
                  }}
                  className="ml-auto h-8 rounded-lg px-3 text-[12.5px] text-accent transition-transform hover:scale-[1.04] hover:underline disabled:opacity-40"
                >
                  Keep practicing
                </button>
              </div>
            </div>
          </div>
        </div>

        <a
          href="#workspace"
          onClick={(e) => scrollTo(e, "workspace")}
          className="mx-auto mb-6 grid size-9 place-items-center rounded-full border border-line text-ink-faint transition-colors hover:border-accent-line hover:text-accent"
          aria-label="Scroll to the workspace"
        >
          <ArrowDown className="size-4 motion-safe:animate-bounce" />
        </a>
      </section>

      {/* WORKSPACE DOCK */}
      <section id="workspace" className="relative border-t border-line bg-surface/40 py-20">
        <div className="mx-auto max-w-[1240px] px-5">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-center">
            <div>
              <h2 className="text-[30px] font-semibold leading-tight tracking-[-0.025em] text-ink">Everything for HL, one dock away.</h2>
              <p className="mt-3 max-w-[48ch] text-[15px] leading-relaxed text-ink-muted">
                Hover the dock to preview each module. Every tool opens beside your work, so you never lose the question you are on.
              </p>
              <ul className="mt-6 grid gap-2 text-[13.5px] text-ink-muted">
                <li className="flex gap-3"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" />Keyboard-first: J / K to move, M for the markscheme, G for Desmos.</li>
                <li className="flex gap-3"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" />Markschemes with IB mark allocations: M1, A1, R1 and AG.</li>
                <li className="flex gap-3"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" />Progress is saved in your browser, no account needed.</li>
              </ul>
            </div>
            <div className="surface relative rounded-2xl px-4 pb-6 pt-24">
              <div className="relative mx-auto w-fit rounded-2xl border border-line bg-page/80 px-3 py-2 backdrop-blur">
                <Dock orientation="horizontal" items={modules} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* LIVE VISUALIZER */}
      <section className="border-t border-line py-20">
        <div className="mx-auto grid max-w-[1240px] gap-10 px-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] lg:items-center">
          <div>
            <h2 className="text-[30px] font-semibold leading-tight tracking-[-0.025em] text-ink">See the series converge.</h2>
            <p className="mt-3 max-w-[46ch] text-[15px] leading-relaxed text-ink-muted">
              The cheatsheets are interactive. Add terms to a Maclaurin series and watch the approximation wrap around the curve, then spin powers of a
              complex number around the Argand plane.
            </p>
            <a href="#/cheatsheets" className="mt-5 inline-flex text-[13.5px] text-accent hover:underline">
              Open all cheatsheets
            </a>
          </div>
          <div className="surface rounded-2xl p-4">
            <MaclaurinVisualizer />
          </div>
        </div>
      </section>

      {/* COURSES */}
      <section id="courses" className="border-t border-line bg-surface/40 py-20">
        <div className="mx-auto max-w-[1240px] px-5">
          <h2 className="text-[30px] font-semibold tracking-[-0.025em] text-ink">Pick your course.</h2>
          <div className="mt-8 grid gap-5 md:grid-cols-2">
            {COURSES.map((c, i) => {
              const s = stats[i]
              return (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => enter(c.code)}
                  className={cn(
                    "group surface relative overflow-hidden rounded-2xl p-6 text-left transition-[transform,box-shadow,border-color] duration-200 hover:scale-[1.015]",
                    "hover:border-accent-line hover:shadow-[0_20px_60px_-24px_rgba(240,106,42,0.5)]",
                  )}
                >
                  <div className="flex items-baseline justify-between">
                    <span className={cn("num text-[13px]", i === 0 ? "text-accent" : "text-accent")}>{c.code}</span>
                    {loading ? <span className="skeleton h-4 w-20" /> : <span className="num text-[12px] text-ink-faint">{s.total} questions</span>}
                  </div>
                  <h3 className="mt-2 text-[22px] font-semibold tracking-[-0.02em] text-ink">{c.name}</h3>
                  <p className="mt-2 max-w-[52ch] text-[14px] leading-relaxed text-ink-muted">{c.blurb}</p>
                  <div className="mt-5 grid grid-cols-3 gap-2">
                    {["P1", "P2", "P3"].map((p, k) => (
                      <div key={p} className="rounded-lg border border-hair bg-page/60 px-3 py-2">
                        {loading ? <div className="skeleton h-5 w-10" /> : <div className="num text-[18px] text-ink">{s.papers[k]}</div>}
                        <div className="num text-[11px] text-ink-faint">{p}</div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {s.topicList.map((t) => (
                      <span key={t} className="rounded-md border border-hair px-2 py-0.5 text-[11px] text-ink-faint">
                        {t}
                      </span>
                    ))}
                  </div>
                  <span className={cn("mt-6 inline-flex text-[13.5px] font-medium", i === 0 ? "text-accent" : "text-accent")}>
                    Enter {c.code} workspace
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </section>

      <footer className="border-t border-line py-10">
        <div className="mx-auto flex max-w-[1240px] flex-wrap items-center gap-4 px-5 text-[12px] text-ink-faint">
          <EmberMark className="size-6" />
          <Wordmark className="text-[13px]" />
          <span>Independent study tool. Not affiliated with the International Baccalaureate.</span>
          <button type="button" onClick={() => enter()} className="ml-auto text-accent hover:underline">
            Open workspace
          </button>
        </div>
      </footer>
    </div>
  )
}

function scrollTo(e: React.MouseEvent, id: string) {
  e.preventDefault()
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" })
}
