import { useEffect, useRef, useState } from "react"
import { extractGraphableExpression } from "@/lib/desmos"
import type { Question } from "@/lib/questions"
import { Btn } from "@/components/app/primitives"
import { GraphSkeleton } from "@/components/app/Skeletons"

const DESMOS_API_URL = "https://www.desmos.com/api/v1.9/calculator.js?apiKey=dcb31709b452b1cf9dc26972add0fda6"

let scriptPromise: Promise<void> | null = null
function loadDesmos(): Promise<void> {
  if (window.Desmos) return Promise.resolve()
  if (!scriptPromise) {
    scriptPromise = new Promise<void>((resolve, reject) => {
      const s = document.createElement("script")
      s.src = DESMOS_API_URL
      s.async = true
      s.onload = () => resolve()
      s.onerror = () => {
        scriptPromise = null
        reject(new Error("Desmos failed to load"))
      }
      document.head.appendChild(s)
    })
  }
  return scriptPromise
}

/**
 * Live Desmos graphing calculator (official API v1.9). Created lazily the
 * first time the dock shows it and kept alive afterwards so work persists.
 */
export function DesmosPanel({ visible, question }: { visible: boolean; question: Question | null }) {
  const host = useRef<HTMLDivElement>(null)
  const calc = useRef<DesmosCalculator | null>(null)
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "failed">("idle")
  const expression = question ? extractGraphableExpression([question.statement, question.latex].filter(Boolean).join("\n")) : null

  useEffect(() => {
    if (!visible || calc.current) return
    let canceled = false
    let frame = 0
    setStatus("loading")
    const create = () => {
      if (canceled || calc.current) return
      const el = host.current
      if (!el || !window.Desmos || el.clientWidth === 0) {
        frame = requestAnimationFrame(create)
        return
      }
      calc.current = new window.Desmos.GraphingCalculator(el, {
        keypad: true,
        expressions: true,
        settingsMenu: true,
        zoomButtons: true,
        border: false,
        invertedColors: true,
      })
      setStatus("ready")
    }
    loadDesmos()
      .then(create)
      .catch(() => !canceled && setStatus("failed"))
    return () => {
      canceled = true
      cancelAnimationFrame(frame)
    }
  }, [visible])

  useEffect(() => {
    if (!visible || !calc.current) return
    const t = window.setTimeout(() => calc.current?.resize(), 60)
    return () => window.clearTimeout(t)
  }, [visible])

  useEffect(() => {
    const el = host.current
    if (!el) return
    const ro = new ResizeObserver(() => calc.current?.resize())
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const plotQuestion = () => {
    if (!calc.current || !expression) return
    calc.current.setExpression({ id: "question", latex: expression, color: "#f06a2a" })
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-10 shrink-0 items-center justify-between gap-2 border-b border-line px-3">
        <span className="truncate text-[12px] text-ink-faint">
          {expression ? (
            <>
              Detected <span className="num text-accent">{expression.length > 34 ? `${expression.slice(0, 34)}…` : expression}</span>
            </>
          ) : (
            "Plot anything — the calculator keeps your work"
          )}
        </span>
        {expression ? (
          <Btn size="sm" onClick={plotQuestion} disabled={status !== "ready"}>
            Plot question
          </Btn>
        ) : null}
      </div>
      <div className="relative min-h-0 flex-1">
        <div ref={host} data-testid="desmos-host" className="absolute inset-0" aria-label="Desmos graphing calculator" />
        {status === "loading" ? (
          <GraphSkeleton />
        ) : null}
        {status === "failed" ? (
          <div className="absolute inset-0 grid place-items-center p-6 text-center text-[12px] text-ink-muted">
            Desmos could not be reached. Check your connection, then close and reopen the dock.
          </div>
        ) : null}
      </div>
    </div>
  )
}
