import { SearchX } from "lucide-react"
import { Button } from "@/components/ui/button"

interface EmptyStateProps {
  summary: string
  onClear: () => void
}

export function EmptyState({ summary, onClear }: EmptyStateProps) {
  return (
    <div className="glass-panel animate-rise grid place-items-center rounded-xl px-6 py-20 text-center">
      <SearchX className="size-8 text-zinc-600" aria-hidden="true" />
      <h3 className="mt-4 text-sm font-medium text-zinc-200">No questions match these filters</h3>
      {summary ? (
        <p className="mt-1.5 max-w-sm text-sm text-zinc-500">
          Active filters: <span className="text-zinc-400">{summary}</span>
        </p>
      ) : (
        <p className="mt-1.5 max-w-sm text-sm text-zinc-500">
          Try widening the difficulty range or removing a topic or year.
        </p>
      )}
      <Button
        variant="outline"
        onClick={onClear}
        className="mt-6 border-zinc-700 bg-zinc-900/80 text-zinc-200 hover:bg-zinc-800 hover:text-zinc-100"
      >
        Clear all filters
      </Button>
    </div>
  )
}