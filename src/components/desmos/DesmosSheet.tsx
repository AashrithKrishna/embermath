import { useEffect, useRef, useState } from "react"
import { LineChart } from "lucide-react"
import { Kbd } from "@/components/ui/kbd"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { extractGraphableExpression } from "@/lib/desmos"
import type { Question } from "@/lib/questions"

const DESMOS_API_URL = "https://www.desmos.com/api/v1.9/calculator.js"

let scriptPromise: Promise<void> | null = null

/** Injects the Desmos script once and resolves when it is ready. */
function loadDesmosScript(): Promise<void> {
  if (typeof window !== "undefined" && window.Desmos) return Promise.resolve()
  if (!scriptPromise) {
    scriptPromise = new Promise<void>((resolve, reject) => {
      const script = document.createElement("script")
      script.src = DESMOS_API_URL
      script.async = true
      script.onload = () => resolve()
      script.onerror = () => {
        scriptPromise = null
        reject(new Error("Failed to load the Desmos calculator"))
      }
      document.head.appendChild(script)
    })
  }
  return scriptPromise
}

interface DesmosSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The active question (from the detail dialog or practice view), if any. */
  question: Question | null
}

export function DesmosSheet({ open, onOpenChange, question }: DesmosSheetProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const calculatorRef = useRef<DesmosCalculator | null>(null)
  const questionRef = useRef<Question | null>(question)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    questionRef.current = question
  }, [question])

  const seedFromQuestion = () => {
    const calculator = calculatorRef.current
    const active = questionRef.current
    if (!calculator || !active) return
    const text = [active.statement, active.latex].filter(Boolean).join("\n")
    const expression = extractGraphableExpression(text)
    if (expression) {
      const color = window.Desmos?.Colors.PURPLE ?? "#9d6bff"
      calculator.setExpression({ id: "q", latex: expression, color })
    }
  }

  // Lazy-load the API and create the calculator on the first open, waiting
  // until the drawer's container has a non-zero size.
  useEffect(() => {
    if (!open) return
    let canceled = false
    let frame = 0
    const ensureCreated = () => {
      if (canceled || calculatorRef.current) return
      const element = containerRef.current
      const api = window.Desmos
      if (!element || !api || element.clientWidth === 0 || element.clientHeight === 0) {
        frame = window.requestAnimationFrame(ensureCreated)
        return
      }
      calculatorRef.current = new api.GraphingCalculator(element, {
        keypad: false,
        expressions: true,
        settingsMenu: false,
        zoomButtons: false,
        border: false,
      })
      seedFromQuestion()
    }
    loadDesmosScript()
      .then(ensureCreated)
      .catch(() => {
        if (!canceled) setFailed(true)
      })
    return () => {
      canceled = true
      window.cancelAnimationFrame(frame)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Re-measure once the drawer has finished sliding in.
  useEffect(() => {
    if (!open || !calculatorRef.current) return
    const timer = window.setTimeout(() => calculatorRef.current?.resize(), 260)
    return () => window.clearTimeout(timer)
  }, [open])

  // Re-seed when the active question changes while the calculator exists.
  useEffect(() => {
    seedFromQuestion()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full gap-0 overflow-y-auto bg-surface p-0 data-[side=right]:w-full sm:max-w-lg"
      >
        <SheetHeader className="shrink-0 border-b border-line p-4 pb-3">
          <div className="flex items-center gap-2">
            <LineChart className="size-4 text-verdigris-bright" aria-hidden="true" />
            <SheetTitle>Graphing calculator</SheetTitle>
          </div>
          <SheetDescription>
            Toggle anytime with <Kbd className="align-middle">D</Kbd>. When the open question
            contains an equation, it is plotted automatically.
          </SheetDescription>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-3 p-4 pt-3">
          {failed ? (
            <div className="grid flex-1 place-items-center rounded-xl border border-line bg-page/40 px-6 py-10 text-center text-sm text-ink-muted">
              Couldn&apos;t load Desmos. Check your connection and reopen the drawer.
            </div>
          ) : (
            <div
              ref={containerRef}
              className="h-[60vh] min-h-[320px] w-full overflow-hidden rounded-xl border border-line bg-page"
              aria-label="Graphing calculator workspace"
            />
          )}
          <p className="text-[11px] text-ink-faint">
            Add your own expressions in the panel, or open a question to have its equation
            plotted.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  )
}
