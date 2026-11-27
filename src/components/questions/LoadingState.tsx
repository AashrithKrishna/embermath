export function LoadingState() {
  return (
    <div role="status" aria-live="polite">
      <span className="sr-only">Loading questions…</span>
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3" aria-hidden="true">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="glass-panel animate-pulse rounded-xl p-5 motion-reduce:animate-none"
          >
            <div className="flex items-center justify-between">
              <div className="h-3 w-24 rounded-full bg-raised/70" />
              <div className="h-3 w-16 rounded-full bg-raised/70" />
            </div>
            <div className="mt-4 flex items-center gap-2">
              <div className="h-5 w-16 rounded-full bg-raised/70" />
              <div className="h-5 w-20 rounded-full bg-raised/70" />
              <div className="h-5 w-16 rounded-full bg-raised/40" />
            </div>
            <div className="my-4 h-28 rounded-lg bg-raised/40" />
            <div className="h-3 w-32 rounded-full bg-raised/70" />
            <div className="mt-2 h-3 w-24 rounded-full bg-raised/40" />
          </div>
        ))}
      </div>
    </div>
  )
}