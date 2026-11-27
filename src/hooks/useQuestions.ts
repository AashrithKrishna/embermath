import { useCallback, useEffect, useState } from "react"
import { fetchQuestions } from "@/lib/api"
import type { Question } from "@/lib/questions"

interface QuestionsState {
  questions: Question[]
  loading: boolean
  error: string | null
}

export function useQuestions() {
  const [state, setState] = useState<QuestionsState>({
    questions: [],
    loading: true,
    error: null,
  })
  const [nonce, setNonce] = useState(0)

  useEffect(() => {
    let active = true
    setState((previous) => ({ ...previous, loading: true, error: null }))
    fetchQuestions()
      .then((questions) => {
        if (active) setState({ questions, loading: false, error: null })
      })
      .catch((error: unknown) => {
        if (active) {
          setState({
            questions: [],
            loading: false,
            error: error instanceof Error ? error.message : "Failed to load questions",
          })
        }
      })
    return () => {
      active = false
    }
  }, [nonce])

  const refetch = useCallback(() => setNonce((value) => value + 1), [])

  return { ...state, refetch }
}