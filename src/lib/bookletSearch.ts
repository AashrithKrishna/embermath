import type { BookletSection } from "../data/booklet"

/**
 * Filters booklet sections by a case-insensitive substring query matched
 * against each entry's name, LaTeX source, and note. Sections without any
 * matching entry are dropped.
 */
export function searchBooklet(sections: BookletSection[], query: string): BookletSection[] {
  const needle = query.trim().toLowerCase()
  if (!needle) return sections

  return sections
    .map((section) => ({
      ...section,
      entries: section.entries.filter((entry) =>
        [entry.name, entry.latex, entry.note ?? ""].some((field) =>
          field.toLowerCase().includes(needle),
        ),
      ),
    }))
    .filter((section) => section.entries.length > 0)
}

export function countBookletEntries(sections: BookletSection[]): number {
  return sections.reduce((total, section) => total + section.entries.length, 0)
}
