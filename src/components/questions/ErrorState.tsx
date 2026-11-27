import { AlertTriangle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ErrorStateProps {
  message: string
  onRetry: () => void
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="glass-panel flex flex-col items-center gap-4 rounded-xl px-6 py-16 text-center">
      <span className="grid size-12 place-items-center rounded-full border border-rose-400/30 bg-rose-400/10 text-rose-300">
        <AlertTriangle className="size-6" aria-hidden="true" />
      </span>
      <div>
        <h2 className="text-base font-semibold text-zinc-100">Couldn&apos;t load the question bank</h2>
        <p className="mt-1 max-w-sm text-sm text-zinc-500">{message}</p>
        <p className="mt-1 text-xs text-zinc-600">
          Make sure the API server and MySQL are running, then retry.
        </p>
      </div>
      <Button
        variant="outline"
        onClick={onRetry}
        className="gap-2 border-zinc-700 bg-transparent text-zinc-200 hover:bg-white/5 hover:text-zinc-100"
      >
        <RefreshCw className="size-4" aria-hidden="true" />
        Retry
      </Button>
    </div>
  )
}