import { useCallback, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import { formErrorFrom } from '../../shared/forms/errors'
import { astaKeys, streamAstaReply, type AstaEvent, type GoalSummary } from './api'

export interface PendingTurn {
  userText: string
  replyText: string
  goalSummary: GoalSummary | null
}

function errorMessage(event: Extract<AstaEvent, { type: 'error' }>) {
  if (event.code === 'rate_limited' && event.retryAt) {
    const at = new Date(event.retryAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    return `Asta is taking a short break. Try again at ${at}.`
  }
  return event.text
}

/**
 * The turn in flight: the user's message (shown immediately) and Asta's reply as it streams.
 * Once the reply is stored, the conversation is refetched and the pending turn disappears into it.
 */
export function useAstaChat() {
  const queryClient = useQueryClient()
  const [pending, setPending] = useState<PendingTurn | null>(null)
  const [error, setError] = useState<string>()
  const abort = useRef<AbortController | null>(null)

  /** Returns false if the message couldn't be sent, so the caller can give the text back to the user. */
  const send = useCallback(
    async (text: string): Promise<boolean> => {
      setError(undefined)
      setPending({ userText: text, replyText: '', goalSummary: null })
      abort.current = new AbortController()
      try {
        for await (const event of streamAstaReply(text, abort.current.signal)) {
          if (event.type === 'token') {
            setPending((turn) => turn && { ...turn, replyText: turn.replyText + event.text })
          } else if (event.type === 'goal_summary') {
            setPending((turn) => turn && { ...turn, replyText: event.text, goalSummary: event.goalSummary })
          } else if (event.type === 'error') {
            setError(errorMessage(event))
            setPending(null)
            return false
          }
        }
        await queryClient.invalidateQueries({ queryKey: astaKeys.conversation })
        setPending(null)
        return true
      } catch (caught) {
        if ((caught as Error).name !== 'AbortError') setError(formErrorFrom(caught))
        setPending(null)
        return false
      }
    },
    [queryClient],
  )

  return { pending, error, send, isStreaming: pending !== null, dismissError: () => setError(undefined) }
}
