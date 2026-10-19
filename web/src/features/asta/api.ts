import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { api, ApiError, type ProblemDetails } from '../../shared/api/client'

/** The goal card exactly as the agents service produced it (snake_case). */
export interface GoalSummary {
  goal_type: 'professional' | 'personal'
  title: string
  target_outcome: string
  motivation: string
  hours_per_week: number
  timeline: string | null
  learning_style: 'video' | 'reading' | 'hands_on' | 'mixed'
  budget: 'free_only' | 'paid_ok'
  skills: string[]
  current_experience: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  goalSummary: GoalSummary | null
}

export type GoalStage = 'chatting' | 'rating' | 'assessing' | 'confirmed'

export interface Conversation {
  goalId: string | null
  stage: GoalStage | null
  messages: ChatMessage[]
}

export type AstaEvent =
  | { type: 'token'; text: string }
  | { type: 'goal_summary'; text: string; goalSummary: GoalSummary }
  | { type: 'done'; messageId?: string }
  | { type: 'error'; text: string; code: 'rate_limited' | 'agent_error' | 'agent_unavailable'; retryAt?: string }

export const astaKeys = { conversation: ['asta', 'conversation'] as const }

export function useConversation() {
  return useQuery({ queryKey: astaKeys.conversation, queryFn: () => api.get<Conversation>('/api/asta/conversation') })
}

export function useConfirmGoal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => api.post<{ id: string; title: string; stage: GoalStage }>('/api/asta/goal/confirm'),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: astaKeys.conversation }),
        queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
      ]),
  })
}

/**
 * Sends a message and yields Asta's reply as it streams (server-sent events over a POST, so not EventSource).
 * Throws ApiError if the API rejects the message before streaming starts.
 */
export async function* streamAstaReply(content: string, signal?: AbortSignal): AsyncGenerator<AstaEvent> {
  const response = await fetch('/api/asta/messages', {
    method: 'POST',
    credentials: 'same-origin',
    signal,
    headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream', 'X-Requested-With': 'learner-web' },
    body: JSON.stringify({ content }),
  })
  if (!response.ok || !response.body) {
    const problem = response.headers.get('Content-Type')?.includes('json') ? ((await response.json()) as ProblemDetails) : undefined
    throw new ApiError(response.status, problem)
  }

  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader()
  let buffer = ''
  for (;;) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += value.replace(/\r\n/g, '\n')
    let boundary: number
    while ((boundary = buffer.indexOf('\n\n')) !== -1) {
      const block = buffer.slice(0, boundary)
      buffer = buffer.slice(boundary + 2)
      const data = block
        .split('\n')
        .filter((line) => line.startsWith('data:'))
        .map((line) => line.slice(5).trimStart())
        .join('\n')
      if (data) yield JSON.parse(data) as AstaEvent
    }
  }
}
