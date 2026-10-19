import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { api } from '../../shared/api/client'

export type ResourceKind = 'course' | 'docs' | 'video' | 'book' | 'project' | 'article' | 'community'

export interface PlanDocument {
  summary: string
  starting_point: string
  total_weeks: number
  hours_per_week: number
  skills: { skill: string; current_level: number; target_level: number; status: 'skip' | 'refresh' | 'focus'; note: string }[]
  phases: {
    title: string
    weeks: number
    focus_skills: string[]
    aim: string
    objectives: string[]
    topics: string[]
    practice: string
    milestone: string
    resources: { title: string; kind: ResourceKind; free: boolean; why: string }[]
  }[]
}

/** Anbu's planner steps, in the order they run. */
export type PlanStep = 'reading' | 'outlining' | 'detailing' | 'assembling'

/** The last step Anbu finished. `done` and `total` count detailed phases; `total` is 0 until the outline exists. */
export interface PlanProgress {
  step: PlanStep
  done: number
  total: number
}

export interface Plan {
  id: string
  phase: 'generating' | 'ready' | 'stale' | 'failed'
  generatedAt: string | null
  staleAt: string | null
  content: PlanDocument | null
  error: string | null
  /** Only while generating; null before Anbu finishes its first step. */
  progress: PlanProgress | null
}

export const planKeys = { current: ['plan', 'current'] as const }

/** While Anbu works, check back often enough to tick each step as it finishes (PRD FR-24). */
export const useCurrentPlan = () =>
  useQuery({
    queryKey: planKeys.current,
    queryFn: () => api.get<Plan>('/api/plans/current'),
    refetchInterval: (query) => (query.state.data?.phase === 'generating' ? 1500 : false),
  })

function usePlanMutation(path: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => api.post<Plan>(path),
    onSuccess: (plan) => {
      queryClient.setQueryData(planKeys.current, plan)
      // Refetch rather than rely on the cached write: polling only re-arms after a fetch.
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: planKeys.current }),
        queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
      ])
    },
  })
}

export const useRequestPlan = () => usePlanMutation('/api/plans')
export const useRegeneratePlan = () => usePlanMutation('/api/plans/regenerate')
