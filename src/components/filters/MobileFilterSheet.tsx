import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import type { FilterState } from "@/lib/filter"
import { FilterRail } from "./FilterRail"

interface MobileFilterSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  filters: FilterState
  onChange: (patch: Partial<FilterState>) => void
  onReset: () => void
  counts: Record<string, number>
  topics: string[]
  years: number[]
  resultCount: number
  total: number
}

export function MobileFilterSheet({ open, onOpenChange, ...railProps }: MobileFilterSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full overflow-y-auto border-line bg-surface p-4 data-[side=right]:w-full sm:max-w-sm"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>Filters</SheetTitle>
          <SheetDescription>
            Narrow the question bank by difficulty, topic, and year.
          </SheetDescription>
        </SheetHeader>
        <FilterRail {...railProps} />
      </SheetContent>
    </Sheet>
  )
}