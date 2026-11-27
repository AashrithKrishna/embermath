import type { FilterState, SortKey } from "./filter"

export const PREFS_KEY = "mathhl.prefs.v1"

export const SORT_KEYS: readonly SortKey[] = ["newest", "oldest", "marks", "difficulty"]

export interface PersistedPrefs {
  course?: string
  view?: "browse" | "practice"
  filters?: FilterState
  sortKey?: SortKey
}

function sanitizeFilters(value: unknown): FilterState | undefined {
  if (typeof value !== "object" || value === null) return undefined
  const candidate = value as Partial<FilterState>

  const clean: FilterState = {
    search: typeof candidate.search === "string" ? candidate.search : "",
    difficulty: [1, 5],
    topics: [],
    years: [],
  }

  if (
    Array.isArray(candidate.difficulty) &&
    candidate.difficulty.length === 2 &&
    candidate.difficulty.every((bound) => typeof bound === "number")
  ) {
    clean.difficulty = [
      Math.min(5, Math.max(1, candidate.difficulty[0])),
      Math.min(5, Math.max(1, candidate.difficulty[1])),
    ]
  }

  if (Array.isArray(candidate.topics) && candidate.topics.every((t) => typeof t === "string")) {
    clean.topics = candidate.topics
  }

  if (Array.isArray(candidate.years) && candidate.years.every((y) => typeof y === "number")) {
    clean.years = candidate.years
  }

  return clean
}

/** Keeps only known, well-formed preference fields. */
export function sanitizePrefs(value: unknown): PersistedPrefs {
  if (typeof value !== "object" || value === null) return {}
  const candidate = value as Record<string, unknown>

  const prefs: PersistedPrefs = {}
  if (typeof candidate.course === "string") prefs.course = candidate.course
  if (candidate.view === "browse" || candidate.view === "practice") prefs.view = candidate.view

  const filters = sanitizeFilters(candidate.filters)
  if (filters) prefs.filters = filters

  if (
    typeof candidate.sortKey === "string" &&
    (SORT_KEYS as readonly string[]).includes(candidate.sortKey)
  ) {
    prefs.sortKey = candidate.sortKey as SortKey
  }

  return prefs
}

export function loadPrefs(storage?: Pick<Storage, "getItem">): PersistedPrefs {
  try {
    const raw = (storage ?? window.localStorage).getItem(PREFS_KEY)
    if (!raw) return {}
    return sanitizePrefs(JSON.parse(raw) as unknown)
  } catch {
    return {}
  }
}

export function savePrefs(prefs: PersistedPrefs, storage?: Pick<Storage, "setItem">): void {
  try {
    ;(storage ?? window.localStorage).setItem(PREFS_KEY, JSON.stringify(prefs))
  } catch {
    // Storage may be unavailable (private mode, quota); preferences are best-effort.
  }
}
