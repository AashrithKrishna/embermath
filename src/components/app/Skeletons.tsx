import type { View } from "@/lib/router"

const Bar = ({ className }: { className: string }) => <div className={`skeleton ${className}`} />

/** Layout-matched skeletons shown while a view's code or data is loading. */
export function ViewSkeleton({ view }: { view: View }) {
  return (
    <div aria-busy="true" aria-label="Loading" className="animate-enter">
      {view === "bank" ? <BankSkeleton /> : view === "practice" ? <PracticeSkeleton /> : view === "exam" ? <ExamSkeleton /> : view === "cheatsheets" ? <SheetsSkeleton /> : <HubSkeleton />}
    </div>
  )
}

function HubSkeleton() {
  return (
    <div className="mx-auto grid max-w-[1320px] grid-cols-1 gap-5 p-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:p-6">
      <div className="surface grid content-start gap-3 rounded-xl p-5">
        <Bar className="h-3 w-40" />
        <Bar className="h-4 w-full" />
        <Bar className="h-4 w-11/12" />
        <Bar className="h-4 w-4/5" />
        <Bar className="mt-4 h-32 w-full" />
      </div>
      <div className="surface grid content-start gap-2 rounded-xl p-5">
        {Array.from({ length: 10 }, (_, i) => (
          <Bar key={i} className="h-5 w-full" />
        ))}
      </div>
      <div className="grid gap-px overflow-hidden rounded-xl border border-line lg:col-span-2 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="grid gap-3 bg-surface p-5">
            <Bar className="h-3 w-24" />
            <Bar className="h-7 w-16" />
            <Bar className="h-3 w-full" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function QuestionRowsSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-xl border border-line">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="grid grid-cols-[18px_120px_minmax(0,1fr)_60px] gap-3 border-b border-line px-4 py-4 last:border-b-0">
          <Bar className="h-4 w-4" />
          <div className="grid gap-2">
            <Bar className="h-3 w-20" />
            <Bar className="h-4 w-8" />
          </div>
          <div className="grid gap-2">
            <Bar className="h-3 w-32" />
            <Bar className="h-4 w-full" />
            <Bar className="h-4 w-2/3" />
          </div>
          <Bar className="h-4 w-12" />
        </div>
      ))}
    </div>
  )
}

function BankSkeleton() {
  return (
    <div className="mx-auto grid max-w-[1440px] grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)]">
      <div className="hidden gap-4 border-r border-line p-4 lg:grid lg:content-start">
        {Array.from({ length: 12 }, (_, i) => (
          <Bar key={i} className="h-5 w-full" />
        ))}
      </div>
      <div className="p-4 lg:p-5">
        <Bar className="mb-4 h-9 w-full" />
        <QuestionRowsSkeleton />
      </div>
    </div>
  )
}

function PracticeSkeleton() {
  return (
    <div className="mx-auto grid max-w-[1440px] grid-cols-1 gap-4 p-4 lg:p-5 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="grid content-start gap-3">
        <Bar className="h-5 w-1/2" />
        <div className="surface grid gap-3 rounded-xl p-5">
          <Bar className="h-3 w-1/3" />
          <Bar className="h-4 w-full" />
          <Bar className="h-4 w-11/12" />
          <Bar className="h-4 w-3/4" />
          <Bar className="mt-3 h-40 w-full" />
        </div>
      </div>
      <div className="surface h-[400px] rounded-xl p-4">
        <Bar className="h-4 w-24" />
      </div>
    </div>
  )
}

function ExamSkeleton() {
  return (
    <div className="mx-auto grid max-w-[1320px] grid-cols-1 gap-5 p-4 lg:grid-cols-[minmax(0,1fr)_380px] lg:p-6">
      <div className="surface grid content-start gap-4 rounded-xl p-5">
        <Bar className="h-4 w-48" />
        <div className="grid gap-2 sm:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => (
            <Bar key={i} className="h-20 w-full" />
          ))}
        </div>
        {Array.from({ length: 8 }, (_, i) => (
          <Bar key={i} className="h-5 w-full" />
        ))}
      </div>
      <div className="surface grid content-start gap-2 rounded-xl p-5">
        {Array.from({ length: 12 }, (_, i) => (
          <Bar key={i} className="h-4 w-full" />
        ))}
      </div>
    </div>
  )
}

function SheetsSkeleton() {
  return (
    <div className="mx-auto grid max-w-[1320px] grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)]">
      <div className="hidden gap-3 border-r border-line p-4 lg:grid lg:content-start">
        {Array.from({ length: 9 }, (_, i) => (
          <Bar key={i} className="h-10 w-full" />
        ))}
      </div>
      <div className="grid content-start gap-3 p-4 lg:p-6">
        <Bar className="h-6 w-72" />
        <Bar className="h-4 w-96 max-w-full" />
        <Bar className="mt-4 h-64 w-full" />
      </div>
    </div>
  )
}

/** Canvas-shaped shimmer for the Desmos calculator while its script loads. */
export function GraphSkeleton() {
  return (
    <div className="absolute inset-0 grid grid-cols-[42%_1fr]" aria-busy="true" aria-label="Loading Desmos">
      <div className="grid content-start gap-2 border-r border-line p-3">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="skeleton h-9 w-full" />
        ))}
      </div>
      <div className="relative overflow-hidden bg-[linear-gradient(rgba(168,186,183,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(168,186,183,0.06)_1px,transparent_1px)] [background-size:28px_28px]">
        <div className="skeleton absolute inset-0 opacity-40" />
      </div>
    </div>
  )
}
