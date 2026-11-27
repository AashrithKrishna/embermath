import { useEffect, useRef, useState } from "react"
import { PAPER_SPECS, type PaperCode } from "./exam"
import { createStore } from "./store"

/**
 * Time budget for one question, from the paper's official minutes-per-mark
 * ratio (Paper 1/2: 120 min for 110 marks ≈ 65 s per mark; Paper 3 ≈ 82 s).
 */
export function targetSeconds(marks: number, paper: string | null | undefined): number {
  const spec = PAPER_SPECS[(paper ?? "Paper 1") as PaperCode] ?? PAPER_SPECS["Paper 1"]
  return Math.max(30, Math.round((marks * spec.minutes * 60) / spec.defaultMarks))
}

export type Pace = "idle" | "on" | "over" | "way-over"

/** On budget, up to 1.5× over, or beyond that. */
export function pace(seconds: number, target: number): Pace {
  if (seconds <= 0) return "idle"
  const r = seconds / target
  return r <= 1 ? "on" : r <= 1.5 ? "over" : "way-over"
}

export const PACE_TEXT: Record<Pace, string> = {
  idle: "text-ink-faint",
  on: "text-ink",
  over: "text-medium",
  "way-over": "text-hard",
}
export const PACE_BG: Record<Pace, string> = {
  idle: "bg-raised-2",
  on: "bg-ember",
  over: "bg-medium",
  "way-over": "bg-hard",
}

/** Practice timing per question: the latest attempt and the running total. */
export interface PracticeTime {
  last: number
  total: number
  attempts: number
}
export const practiceTimeStore = createStore<Record<string, PracticeTime>>(
  "mhqb.practiceTime",
  {},
  (v): v is Record<string, PracticeTime> => typeof v === "object" && v !== null && !Array.isArray(v),
)

export function recordPracticeTime(id: string, seconds: number) {
  if (seconds < 3) return
  practiceTimeStore.set((t) => {
    const prev = t[id] ?? { last: 0, total: 0, attempts: 0 }
    return { ...t, [id]: { last: seconds, total: prev.total + seconds, attempts: prev.attempts + 1 } }
  })
}

/**
 * Seconds spent on `key` while `running` and the tab is visible. Resets when
 * the key changes; `onCommit(key, seconds)` fires for the previous key on
 * change and on unmount.
 */
export function useStopwatch(key: string, running: boolean, onCommit?: (key: string, seconds: number) => void) {
  const [seconds, setSeconds] = useState(0)
  const ref = useRef({ key, seconds: 0 })
  const commit = useRef(onCommit)
  commit.current = onCommit

  useEffect(() => {
    ref.current = { key, seconds: 0 }
    setSeconds(0)
    return () => commit.current?.(ref.current.key, ref.current.seconds)
  }, [key])

  useEffect(() => {
    if (!running) return
    const t = window.setInterval(() => {
      if (document.visibilityState !== "visible") return
      ref.current.seconds += 1
      setSeconds(ref.current.seconds)
    }, 1000)
    return () => window.clearInterval(t)
  }, [running, key])

  return seconds
}
