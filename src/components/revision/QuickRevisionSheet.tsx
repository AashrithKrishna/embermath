import { useEffect, useState } from "react"
import { ChevronDown, NotebookPen } from "lucide-react"
import { MathDisplay } from "@/components/questions/MathDisplay"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { revisionFor } from "@/data/revision"
import { cn } from "@/lib/utils"

interface QuickRevisionSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  course: string
}

export function QuickRevisionSheet({ open, onOpenChange, course }: QuickRevisionSheetProps) {
  const topics = revisionFor(course)
  const [openId, setOpenId] = useState<string | null>(null)

  // Keep the first topic open, and reset when the course changes.
  useEffect(() => {
    setOpenId(topics[0]?.id ?? null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [course])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full gap-0 overflow-y-auto bg-surface p-0 data-[side=right]:w-full sm:max-w-md"
      >
        <SheetHeader className="shrink-0 border-b border-line p-4 pb-3">
          <div className="flex items-center gap-2">
            <NotebookPen className="size-4 text-verdigris-bright" aria-hidden="true" />
            <SheetTitle>Quick Revision</SheetTitle>
          </div>
          <SheetDescription>
            Bite-sized notes for {course}. Expand a topic to revise the essentials.
          </SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto p-4">
          {topics.map((topic) => {
            const isOpen = openId === topic.id
            return (
              <section
                key={topic.id}
                className="overflow-hidden rounded-lg border border-line bg-page/40"
              >
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => setOpenId(isOpen ? null : topic.id)}
                  className="flex w-full items-center justify-between gap-3 px-3.5 py-3 text-left transition-colors hover:bg-accent-wash focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-verdigris/50"
                >
                  <span className="text-sm font-medium text-ink">{topic.title}</span>
                  <ChevronDown
                    className={cn(
                      "size-4 shrink-0 text-ink-faint transition-transform duration-200",
                      isOpen && "rotate-180",
                    )}
                    aria-hidden="true"
                  />
                </button>
                {isOpen && (
                  <ul className="space-y-2.5 border-t border-line px-3.5 py-3">
                    {topic.bullets.map((bullet, index) => (
                      <li key={index} className="flex gap-2.5 text-sm leading-relaxed text-ink-muted">
                        <span
                          className="mt-[7px] size-1.5 shrink-0 rounded-full bg-accent"
                          aria-hidden="true"
                        />
                        <span className="min-w-0">
                          <MathDisplay statement={bullet} />
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )
          })}
        </div>
      </SheetContent>
    </Sheet>
  )
}
