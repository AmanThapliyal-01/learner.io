import { useQuery } from '@tanstack/react-query'

import { api } from '../../shared/api/client'

export type DashboardState = 'no_goal' | 'goal_in_progress' | 'plan_generating' | 'plan_ready' | 'plan_stale' | 'plan_failed'

export interface Dashboard {
  state: DashboardState
  goal: { id: string; title: string | null; stage: 'chatting' | 'rating' | 'assessing' | 'confirmed' } | null
  plan: { id: string; phase: 'generating' | 'ready' | 'stale' | 'failed'; generatedAt: string | null } | null
}

export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get<Dashboard>('/api/dashboard'),
    // While the planner agent works, check back every few seconds (PRD FR-24).
    refetchInterval: (query) => (query.state.data?.state === 'plan_generating' ? 4000 : false),
  })
}
