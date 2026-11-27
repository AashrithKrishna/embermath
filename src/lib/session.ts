import { emptyBankFilter, type BankFilter } from "./bank"
import { createStore } from "./store"

/** Explorer filter (persisted so returning to the bank restores context). */
export const bankFilterStore = createStore<BankFilter>(
  "mhqb.bankFilter",
  emptyBankFilter,
  (v): v is BankFilter => typeof v === "object" && v !== null && "papers" in v && "difficulties" in v,
)

/** The ordered list Practice walks through. Empty ids = whole course. */
export interface PracticeQueue {
  ids: string[]
  label: string
}
export const practiceStore = createStore<PracticeQueue>(
  "mhqb.practiceQueue",
  { ids: [], label: "" },
  (v): v is PracticeQueue => typeof v === "object" && v !== null && Array.isArray((v as PracticeQueue).ids),
)
