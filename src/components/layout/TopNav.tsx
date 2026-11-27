import { useEffect, useRef } from "react"
import { BookOpen, LineChart, NotebookPen, Search, SlidersHorizontal, Sparkles, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { isTypingTarget } from "@/lib/keyboard"
import { cn } from "@/lib/utils"

interface TopNavProps {
  search: string
  onSearchChange: (value: string) => void
  onGenerate: () => void
  canGenerate: boolean
  onOpenFilters: () => void
  activeFilterCount: number
  onOpenBooklet: () => void
  onOpenRevision: () => void
  onToggleDesmos: () => void
  desmosOpen: boolean
}

export function TopNav({
  search,
  onSearchChange,
  onGenerate,
  canGenerate,
  onOpenFilters,
  activeFilterCount,
  onOpenBooklet,
  onOpenRevision,
  onToggleDesmos,
  desmosOpen,
}: TopNavProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return
      const commandSearch =
        (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k"
      const slashSearch = event.key === "/" && !event.metaKey && !event.ctrlKey && !event.altKey
      if (commandSearch || slashSearch) {
        event.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  const utilityButton =
    "size-9 border-line bg-raised/50 text-ink-muted transition hover:border-accent-line hover:bg-accent-wash hover:text-ink"

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-page/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-3 px-4 sm:px-6">
        <div className="flex shrink-0 items-center gap-2.5">
          <span className="grid size-8 place-items-center rounded-lg border border-line-strong bg-raised text-[15px] font-medium text-verdigris-bright shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
            ∫
          </span>
          <span className="hidden flex-col leading-none sm:flex">
            <span className="text-sm font-semibold tracking-tight text-ink">Math HL Question Bank</span>
            <span className="mt-1 text-[10px] uppercase tracking-[0.14em] text-ink-faint">
              IB Mathematics · HL
            </span>
          </span>
        </div>

        <div className="relative mx-auto w-full min-w-0 max-w-[420px]">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-faint"
            aria-hidden="true"
          />
          <Input
            ref={inputRef}
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search questions, topics, years…"
            aria-label="Search questions"
            className="h-9 border-line bg-raised/40 pl-9 pr-12 text-sm text-ink placeholder:text-ink-faint focus-visible:border-accent-line focus-visible:ring-accent/30"
          />
          {search ? (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              aria-label="Clear search"
              className="absolute right-2.5 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-md text-ink-faint transition hover:bg-accent-wash hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
            >
              <X className="size-3.5" />
            </button>
          ) : (
            <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded border border-line-strong bg-raised px-1.5 py-0.5 font-sans text-[10px] text-ink-faint sm:block">
              /
            </kbd>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <Tooltip>
            <TooltipTrigger render={<span className="inline-flex" />}>
              <Button
                variant="outline"
                size="lg"
                onClick={onOpenBooklet}
                aria-label="Open data booklet"
                className={cn(utilityButton, "gap-2 px-2.5")}
              >
                <BookOpen className="size-4" />
                <span className="hidden xl:inline">Data Booklet</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Formula sheets for the active course</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger render={<span className="inline-flex" />}>
              <Button
                variant="outline"
                size="lg"
                onClick={onOpenRevision}
                aria-label="Open quick revision notes"
                className={cn(utilityButton, "gap-2 px-2.5")}
              >
                <NotebookPen className="size-4" />
                <span className="hidden xl:inline">Quick Revision</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Bite-sized revision notes by topic</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger render={<span className="inline-flex" />}>
              <Button
                variant="outline"
                size="icon"
                onClick={onToggleDesmos}
                aria-pressed={desmosOpen}
                aria-label="Toggle graphing calculator"
                className={cn(
                  utilityButton,
                  desmosOpen && "border-accent-line bg-accent-wash text-accent",
                )}
              >
                <LineChart className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              Graphing calculator — press{" "}
              <kbd
                data-slot="kbd"
                className="ml-0.5 rounded-sm border border-black/25 px-1 text-[10px]"
              >
                D
              </kbd>
            </TooltipContent>
          </Tooltip>

          <Button
            variant="outline"
            size="icon"
            onClick={onOpenFilters}
            aria-label={
              activeFilterCount > 0 ? `Open filters, ${activeFilterCount} active` : "Open filters"
            }
            className="relative size-9 border-line bg-raised/50 text-ink-muted hover:bg-accent-wash hover:text-ink lg:hidden"
          >
            <SlidersHorizontal className="size-4" />
            {activeFilterCount > 0 && (
              <span className="absolute -right-1 -top-1 grid size-4 place-items-center rounded-full bg-verdigris-bright text-[10px] font-semibold text-page">
                {activeFilterCount}
              </span>
            )}
          </Button>

          <Tooltip>
            <TooltipTrigger
              render={
                <span className={cn("inline-flex", !canGenerate && "cursor-not-allowed")} />
              }
            >
              <Button
                variant="outline"
                size="lg"
                onClick={onGenerate}
                disabled={!canGenerate}
                className="h-9 gap-2 border-line bg-raised/60 px-3 text-sm text-ink transition duration-200 hover:border-accent-line hover:bg-accent-wash hover:text-accent hover:shadow-[0_0_24px_-6px_rgba(240,106,42,0.5)] disabled:opacity-40"
              >
                <Sparkles className="size-4" aria-hidden="true" />
                <span className="hidden sm:inline">Generate Random Paper</span>
                <span className="sm:hidden">Generate</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {canGenerate
                ? "Pick up to 4 questions from the current results"
                : "No questions match the current filters"}
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </header>
  )
}