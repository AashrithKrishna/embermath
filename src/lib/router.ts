import { useSyncExternalStore } from "react"

export type View = "landing" | "home" | "bank" | "practice" | "exam" | "cheatsheets"
export const VIEWS: View[] = ["landing", "home", "bank", "practice", "exam", "cheatsheets"]

export interface Route {
  view: View
  params: URLSearchParams
}

function parse(hash: string): Route {
  const clean = hash.replace(/^#\/?/, "")
  const [path, query = ""] = clean.split("?")
  const view = (VIEWS as string[]).includes(path) ? (path as View) : "landing"
  return { view, params: new URLSearchParams(query) }
}

let current = parse(window.location.hash)
const listeners = new Set<() => void>()
window.addEventListener("hashchange", () => {
  current = parse(window.location.hash)
  listeners.forEach((l) => l())
})

export function useRoute(): Route {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => current,
  )
}

export function navigate(view: View, params?: Record<string, string | undefined>) {
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(params ?? {})) if (v) q.set(k, v)
  const qs = q.toString()
  window.location.hash = `/${view}${qs ? `?${qs}` : ""}`
}
