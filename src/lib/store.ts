import { useSyncExternalStore } from "react"

/**
 * Tiny persisted stores (localStorage, guarded) shared across views:
 * hash route, course, practice progress, notes, pinned formulas.
 */
export function createStore<T>(key: string, initial: T, validate: (v: unknown) => v is T) {
  let value: T = initial
  try {
    const raw = window.localStorage.getItem(key)
    if (raw) {
      const parsed: unknown = JSON.parse(raw)
      if (validate(parsed)) value = parsed
    }
  } catch {
    /* storage unavailable */
  }
  const listeners = new Set<() => void>()
  return {
    get: () => value,
    set(next: T | ((prev: T) => T)) {
      value = typeof next === "function" ? (next as (p: T) => T)(value) : next
      try {
        window.localStorage.setItem(key, JSON.stringify(value))
      } catch {
        /* ignore */
      }
      listeners.forEach((l) => l())
    },
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}

type Store<T> = ReturnType<typeof createStore<T>>

export function useStore<T>(store: Store<T>): T {
  return useSyncExternalStore(store.subscribe, store.get, store.get)
}

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v)

export type Course = "AA HL" | "AI HL"
export const courseStore = createStore<Course>(
  "mhqb.course",
  "AA HL",
  (v): v is Course => v === "AA HL" || v === "AI HL",
)

/** Self-assessed outcome per question id. */
export type Outcome = "got" | "partial" | "missed"
export const progressStore = createStore<Record<string, Outcome>>("mhqb.progress", {}, (v): v is Record<string, Outcome> =>
  isObject(v),
)

export const notesStore = createStore<Record<string, string>>("mhqb.notes", {}, (v): v is Record<string, string> =>
  isObject(v),
)

export interface PinnedFormula {
  id: string
  name: string
  latex: string
}
export const pinsStore = createStore<PinnedFormula[]>("mhqb.pins", [], (v): v is PinnedFormula[] => Array.isArray(v))

export const starredStore = createStore<string[]>("mhqb.starred", [], (v): v is string[] => Array.isArray(v))

export type DockTab = "desmos" | "booklet"
export interface DockState {
  open: boolean
  tab: DockTab
  width: number
}
export const dockStore = createStore<DockState>(
  "mhqb.dock",
  { open: false, tab: "booklet", width: 460 },
  (v): v is DockState => isObject(v) && typeof v.width === "number",
)

export function toggleDock(tab: DockTab) {
  dockStore.set((d) => (d.open && d.tab === tab ? { ...d, open: false } : { ...d, open: true, tab }))
}
