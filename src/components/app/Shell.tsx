import { BookOpen, FileStack, LayoutGrid, Layers, LineChart, NotebookPen, Timer } from "lucide-react"
import type { View } from "@/lib/router"
import { courseStore, dockStore, toggleDock, useStore, type Course } from "@/lib/store"
import { cn } from "@/lib/utils"
import { EmberMark, Wordmark } from "./Brand"
import { Dock, type DockItem } from "./Dock"
import { ModuleArt } from "./ModuleArt"
import { Kbd } from "./primitives"

export const NAV: { view: View; label: string; icon: typeof LayoutGrid; key: string; title: string; body: string }[] = [
  { view: "home", label: "Hub", icon: LayoutGrid, key: "1", title: "Command hub", body: "Today's question, topic coverage and your progress at a glance." },
  { view: "bank", label: "Bank", icon: Layers, key: "2", title: "Question bank", body: "Filter by topic, subtopic, paper, difficulty and marks. Every question has a markscheme." },
  { view: "practice", label: "Practice", icon: NotebookPen, key: "3", title: "Practice mode", body: "One question at a time with a scratchpad. J / K to move, M for the markscheme." },
  { view: "exam", label: "Exam", icon: Timer, key: "4", title: "Exam generator", body: "Timed Paper 1, 2 or 3 built to your mark target and topic weighting." },
  { view: "cheatsheets", label: "Sheets", icon: FileStack, key: "5", title: "Tips and cheatsheets", body: "Series shortcuts, De Moivre, GDC keystrokes and common examiner traps." },
]

export interface Telemetry {
  questions: number
  topics: number
  papers: string[]
  figures: number
  attempted: number
  sheets: number
}

export function Rail({ view, telemetry }: { view: View; telemetry: Telemetry }) {
  const dock = useStore(dockStore)
  const stats: Record<string, string> = {
    home: `${telemetry.topics} topics tracked`,
    bank: `${telemetry.questions} questions, ${telemetry.figures} with figures`,
    practice: `${telemetry.attempted} self-marked so far`,
    exam: telemetry.papers.map((p) => `P${p.slice(-1)}`).join(" / ") + " available",
    cheatsheets: `${telemetry.sheets} sheets for this course`,
  }
  const navItems: DockItem[] = NAV.map((n) => ({
    id: n.view,
    label: n.label,
    href: `#/${n.view}`,
    active: view === n.view,
    running: view === n.view,
    keyHint: n.key,
    icon: <n.icon className="size-[18px]" aria-hidden="true" />,
    preview: { title: n.title, body: n.body, stat: stats[n.view], art: <ModuleArt kind={n.view} /> },
  }))
  const tools: DockItem[] = [
    {
      id: "desmos",
      label: "Desmos",
      onClick: () => toggleDock("desmos"),
      active: dock.open && dock.tab === "desmos",
      running: dock.open && dock.tab === "desmos",
      keyHint: "G",
      icon: <LineChart className="size-[18px]" aria-hidden="true" />,
      preview: { title: "Desmos graphing calculator", body: "Opens beside your work. Plot the current question's function in one click.", art: <ModuleArt kind="desmos" /> },
    },
    {
      id: "booklet",
      label: "Booklet",
      onClick: () => toggleDock("booklet"),
      active: dock.open && dock.tab === "booklet",
      running: dock.open && dock.tab === "booklet",
      keyHint: "B",
      icon: <BookOpen className="size-[18px]" aria-hidden="true" />,
      preview: { title: "Formula booklet", body: "Searchable, organized like the IB data booklet. Pin formulas to your workspace.", art: <ModuleArt kind="booklet" /> },
    },
  ]

  return (
    <>
      {/* Desktop: vertical dock */}
      <nav aria-label="Primary" className="no-print sticky top-0 z-50 hidden h-dvh w-[76px] shrink-0 flex-col items-center border-r border-line bg-surface/80 py-3 backdrop-blur lg:flex">
        <a href="#/" className="group mb-4 grid size-11 place-items-center rounded-xl border border-accent-line bg-raised transition-transform hover:scale-110" aria-label="EmberMath home">
          <EmberMark className="size-7" glow />
        </a>
        <Dock orientation="vertical" items={navItems} />
        <div className="my-3 h-px w-8 bg-line" />
        <Dock orientation="vertical" items={tools} />
      </nav>
      {/* Mobile: bottom dock */}
      <nav aria-label="Primary" className="no-print fixed inset-x-0 bottom-0 z-50 flex h-[68px] items-center border-t border-line bg-surface/95 px-1 backdrop-blur lg:hidden">
        <Dock orientation="horizontal" items={navItems} />
      </nav>
    </>
  )
}

export function TopBar({ telemetry, title }: { telemetry: Telemetry; title: string }) {
  const course = useStore(courseStore)
  const dock = useStore(dockStore)
  return (
    <header className="no-print sticky top-0 z-40 flex h-12 items-center gap-3 border-b border-line bg-page/85 px-4 backdrop-blur lg:px-5">
      <a href="#/" className="flex items-center gap-2 lg:hidden" aria-label="EmberMath home">
        <EmberMark className="size-6" />
      </a>
      <div className="flex min-w-0 items-center gap-2">
        <Wordmark className="hidden text-[13px] sm:inline" />
        <span className="hidden text-ink-faint sm:inline" aria-hidden="true">/</span>
        <span className="truncate text-[13px] text-ink-muted">{title}</span>
      </div>
      <div className="ml-auto flex items-center gap-3">
        <dl className="hidden items-center gap-4 md:flex" aria-label={`${course} bank telemetry`}>
          <Stat label="questions" value={telemetry.questions} />
          <Stat label="topics" value={telemetry.topics} />
          <Stat label="with figures" value={telemetry.figures} />
          <div className="flex items-center gap-1" title="Papers available">
            {["Paper 1", "Paper 2", "Paper 3"].map((p) => (
              <span
                key={p}
                className={cn(
                  "num rounded-[4px] border px-1 text-[10px]",
                  telemetry.papers.includes(p) ? "border-accent-line text-accent" : "border-hair text-ink-faint line-through",
                )}
              >
                P{p.slice(-1)}
              </span>
            ))}
          </div>
        </dl>
        <CourseSwitch />
        <button
          type="button"
          onClick={() => toggleDock(dock.tab)}
          aria-pressed={dock.open}
          className="grid size-8 place-items-center rounded-lg border border-line text-ink-muted hover:border-accent-line hover:text-accent lg:hidden"
          aria-label="Toggle reference panel"
        >
          <BookOpen className="size-4" />
        </button>
        <span className="hidden items-center gap-1 text-[11px] text-ink-faint xl:flex">
          <Kbd>?</Kbd> shortcuts
        </span>
      </div>
    </header>
  )
}

export function CourseSwitch({ size = "sm" }: { size?: "sm" | "lg" }) {
  const course = useStore(courseStore)
  return (
    <div role="radiogroup" aria-label="Course" className="flex rounded-lg border border-line bg-surface p-0.5">
      {(["AA HL", "AI HL"] as Course[]).map((c) => (
        <button
          key={c}
          type="button"
          role="radio"
          aria-checked={course === c}
          onClick={() => courseStore.set(c)}
          title={c === "AA HL" ? "Analysis & Approaches HL" : "Applications & Interpretation HL"}
          className={cn(
            "num rounded-md font-medium transition-[background,color,transform] hover:scale-[1.04]",
            size === "lg" ? "h-9 px-4 text-[13px]" : "h-7 px-2.5 text-[11.5px]",
            course === c ? "bg-accent text-accent-ink" : "text-ink-faint hover:text-accent",
          )}
        >
          {c}
        </button>
      ))}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-baseline gap-1">
      <dd className="num text-[12px] text-ink">{value}</dd>
      <dt className="text-[11px] text-ink-faint">{label}</dt>
    </div>
  )
}
