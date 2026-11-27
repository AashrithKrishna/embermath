import { useMemo, useState } from "react"
import { BookOpen, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { bookletFor } from "@/data/booklet"
import { countBookletEntries, searchBooklet } from "@/lib/bookletSearch"
import { renderMathToHtml } from "@/lib/math"

interface DataBookletSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  course: string
}

export function DataBookletSheet({ open, onOpenChange, course }: DataBookletSheetProps) {
  const [query, setQuery] = useState("")

  const sections = useMemo(() => bookletFor(course), [course])
  const visible = useMemo(() => searchBooklet(sections, query), [sections, query])
  const total = useMemo(() => countBookletEntries(sections), [sections])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full gap-0 overflow-y-auto bg-surface p-0 data-[side=right]:w-full sm:max-w-md"
      >
        <SheetHeader className="shrink-0 border-b border-line p-4 pb-3">
          <div className="flex items-center gap-2">
            <BookOpen className="size-4 text-accent" aria-hidden="true" />
            <SheetTitle>Data Booklet</SheetTitle>
          </div>
          <SheetDescription>
            Formula sheets for {course}. {total} entries, grouped by topic.
          </SheetDescription>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col p-4 pt-3">
          <div className="relative shrink-0">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-faint"
              aria-hidden="true"
            />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search formulas…"
              aria-label="Search data booklet"
              className="h-9 border-line bg-raised/40 pl-9 text-sm text-ink placeholder:text-ink-faint focus-visible:border-accent-line focus-visible:ring-accent/30"
            />
          </div>

          {visible.length === 0 ? (
            <div className="grid flex-1 place-items-center rounded-xl border border-line bg-page/40 px-6 py-12 text-center">
              <p className="text-sm text-ink-muted">
                No formulas match &ldquo;{query.trim()}&rdquo;.
              </p>
            </div>
          ) : (
            <div className="mt-4">
              {visible.map((section) => (
                <section key={section.id} className="mt-5 first:mt-0">
                  <h3 className="sticky top-0 -mx-1 bg-surface px-1 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
                    {section.title}
                  </h3>
                  <ul className="mt-2 space-y-2">
                    {section.entries.map((entry, index) => (
                      <li
                        key={`${entry.name}-${index}`}
                        className="rounded-lg border border-line bg-page/40 px-3 py-2.5"
                      >
                        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                          <span className="text-xs font-medium text-ink">{entry.name}</span>
                          <span
                            className="katex-host text-sm text-ink-muted"
                            dangerouslySetInnerHTML={{ __html: renderMathToHtml(entry.latex, false) }}
                          />
                        </div>
                        {entry.note && (
                          <p className="mt-1.5 text-[11px] leading-relaxed text-ink-faint">
                            {entry.note}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
