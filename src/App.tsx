import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react"
import { useQuestions } from "@/hooks/useQuestions"
import { isTypingTarget } from "@/lib/keyboard"
import { navigate, useRoute, type View } from "@/lib/router"
import { courseStore, dockStore, progressStore, toggleDock, useStore } from "@/lib/store"
import { questionFigures, type Question } from "@/lib/questions"
import { NAV, Rail, TopBar, type Telemetry } from "@/components/app/Shell"
import { Btn, Kbd } from "@/components/app/primitives"
import { ReferenceDock } from "@/components/dock/ReferenceDock"
import { ViewSkeleton } from "@/components/app/Skeletons"
import { CHEATSHEETS } from "@/data/cheatsheets"

// Views are code-split; each shows a skeleton of its own layout while loading.
const Landing = lazy(() => import("@/views/Landing").then((m) => ({ default: m.Landing })))
const Home = lazy(() => import("@/views/Home").then((m) => ({ default: m.Home })))
const Bank = lazy(() => import("@/views/Bank").then((m) => ({ default: m.Bank })))
const Practice = lazy(() => import("@/views/Practice").then((m) => ({ default: m.Practice })))
const Exam = lazy(() => import("@/views/Exam").then((m) => ({ default: m.Exam })))
const Cheatsheets = lazy(() => import("@/views/Cheatsheets").then((m) => ({ default: m.Cheatsheets })))

const TITLES: Record<View, string> = {
  landing: "IB Math HL, worked until it catches",
  home: "Hub",
  bank: "Question bank",
  practice: "Practice",
  exam: "Exam generator",
  cheatsheets: "Tips and cheatsheets",
}

const SHORTCUTS: [string, string][] = [
  ["1 – 5", "Switch module"],
  ["G", "Desmos graphing calculator"],
  ["B", "Formula booklet"],
  ["/", "Search the bank"],
  ["J / K or → / ←", "Next / previous question"],
  ["M", "Toggle markscheme"],
  ["Y / P / N", "Self-mark: got it, partly, missed"],
  ["S", "Star question"],
  ["F", "Flag question in an exam"],
  ["Esc", "Close panel"],
]

export default function App() {
  const { questions, loading, error, refetch } = useQuestions()
  const course = useStore(courseStore)
  const progress = useStore(progressStore)
  const route = useRoute()
  const [active, setActive] = useState<Question | null>(null)
  const [help, setHelp] = useState(false)

  const pool = useMemo(() => questions.filter((q) => q.course === course), [questions, course])
  const telemetry: Telemetry = useMemo(
    () => ({
      questions: pool.length,
      topics: new Set(pool.map((q) => q.topic)).size,
      papers: [...new Set(pool.map((q) => q.paper).filter((p): p is NonNullable<typeof p> => Boolean(p)))].sort(),
      figures: pool.filter((q) => questionFigures(q).length > 0).length,
      attempted: pool.filter((q) => progress[q.id]).length,
      sheets: CHEATSHEETS.filter((s) => s.courses.includes(course)).length,
    }),
    [pool, progress, course],
  )

  const onActive = useCallback((q: Question | null) => setActive(q), [])

  useEffect(() => {
    document.title = route.view === "landing" ? `EmberMath — ${TITLES.landing}` : `${TITLES[route.view]} — EmberMath`
    window.scrollTo({ top: 0 })
  }, [route.view])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (help) setHelp(false)
        else if (dockStore.get().open) dockStore.set((d) => ({ ...d, open: false }))
        return
      }
      if (isTypingTarget(e.target) || e.metaKey || e.ctrlKey || e.altKey) return
      const nav = NAV.find((n) => n.key === e.key)
      if (nav) {
        e.preventDefault()
        navigate(nav.view)
      } else if (route.view !== "landing" && (e.key === "g" || e.key === "G")) {
        e.preventDefault()
        toggleDock("desmos")
      } else if (route.view !== "landing" && (e.key === "b" || e.key === "B")) {
        e.preventDefault()
        toggleDock("booklet")
      } else if (e.key === "?") {
        e.preventDefault()
        setHelp((h) => !h)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [help, route.view])

  if (route.view === "landing") {
    return (
      <Suspense fallback={<div className="min-h-dvh bg-page" />}>
        <Landing questions={questions} loading={loading} />
      </Suspense>
    )
  }

  let body: React.ReactNode
  if (loading) body = <ViewSkeleton view={route.view} />
  else if (error)
    body = (
      <div className="grid min-h-[60vh] place-items-center p-6 text-center">
        <div>
          <p className="text-[13px] text-ink">The question bank did not load.</p>
          <p className="mt-1 text-[12px] text-ink-faint">{error}. Check your connection, then try again.</p>
          <Btn className="mt-4" onClick={refetch}>
            Try again
          </Btn>
        </div>
      </div>
    )
  else if (route.view === "bank") body = <Bank pool={pool} course={course} />
  else if (route.view === "practice") body = <Practice pool={pool} course={course} onActive={onActive} />
  else if (route.view === "exam") body = <Exam pool={pool} course={course} onActive={onActive} />
  else if (route.view === "cheatsheets") body = <Cheatsheets course={course} />
  else body = <Home pool={pool} course={course} />

  return (
    <div className="flex min-h-dvh">
      <Rail view={route.view} telemetry={telemetry} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar telemetry={telemetry} title={TITLES[route.view]} />
        <div className="flex min-w-0 flex-1">
          <main key={route.view} className="animate-enter min-w-0 flex-1 pb-20 lg:pb-0">
            <Suspense fallback={<ViewSkeleton view={route.view} />}>{body}</Suspense>
          </main>
          <ReferenceDock course={course} question={active} />
        </div>
      </div>

      {help ? (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-black/60 p-4" onClick={() => setHelp(false)} role="presentation">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Keyboard shortcuts"
            className="surface animate-enter w-full max-w-sm rounded-xl p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-3 text-[13px] font-semibold">Keyboard shortcuts</h2>
            <dl className="grid gap-2">
              {SHORTCUTS.map(([k, v]) => (
                <div key={k} className="flex items-center justify-between gap-4 text-[12.5px]">
                  <dt className="text-ink-muted">{v}</dt>
                  <dd>
                    <Kbd>{k}</Kbd>
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      ) : null}
    </div>
  )
}
