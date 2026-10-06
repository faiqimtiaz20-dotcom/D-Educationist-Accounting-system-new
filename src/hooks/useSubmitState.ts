import { useCallback, useRef, useState } from 'react'

/**
 * Tracks in-flight form / action submits so buttons can use `loading={submitting}`.
 * Concurrent calls are ignored while a submit is already running.
 */
export function useSubmitState() {
  const [submitting, setSubmitting] = useState(false)
  const busy = useRef(false)

  const runSubmit = useCallback(async <T>(fn: () => Promise<T>): Promise<T | undefined> => {
    if (busy.current) return undefined
    busy.current = true
    setSubmitting(true)
    try {
      return await fn()
    } finally {
      busy.current = false
      setSubmitting(false)
    }
  }, [])

  return { submitting, runSubmit }
}
