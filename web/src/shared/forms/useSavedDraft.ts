import { useCallback, useEffect, useState } from 'react'

const PREFIX = 'learner.draft.'

function read<T>(key: string): T | undefined {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    return raw === null ? undefined : (JSON.parse(raw) as T)
  } catch {
    return undefined // storage blocked or unreadable: start fresh
  }
}

/**
 * State kept in this browser until `clear()`, so work survives a refresh, a closed tab or a phone call.
 * `restored` says whether an earlier draft was found, so the screen can say so.
 */
export function useSavedDraft<T>(key: string, initial: T) {
  const [{ value, restored }, setState] = useState(() => {
    const saved = read<T>(key)
    return { value: saved ?? initial, restored: saved !== undefined }
  })

  const setValue = useCallback((update: (current: T) => T) => {
    setState((state) => ({ ...state, value: update(state.value) }))
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value))
    } catch {
      // Storage full or blocked: the draft just isn't kept.
    }
  }, [key, value])

  const clear = useCallback(() => {
    try {
      localStorage.removeItem(PREFIX + key)
    } catch {
      // Nothing to clear.
    }
  }, [key])

  return { value, setValue, clear, restored }
}
