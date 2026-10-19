import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { api } from '../../shared/api/client'

export const LEVELS = [
  { value: 1, label: 'Never used', hint: "Haven't tried it yet" },
  { value: 2, label: 'Beginner', hint: 'Tried it, need guidance' },
  { value: 3, label: 'Intermediate', hint: 'Use it on my own' },
  { value: 4, label: 'Advanced', hint: 'Handle tricky cases' },
  { value: 5, label: 'Expert', hint: 'Could teach it' },
] as const

export interface RatingForm {
  goalTitle: string
  stage: 'rating' | 'assessing'
  skills: { skill: string; selfRating: number | null }[]
}

export interface AssessmentQuestion {
  id: string
  skill: string
  kind: 'multiple_choice' | 'short_answer'
  prompt: string
  options: string[] | null
}

export interface Assessment {
  id: string
  status: 'Pending' | 'InProgress' | 'Completed'
  questions: AssessmentQuestion[]
  skippedSkills: string[]
}

export interface SkillResult {
  skill: string
  selfRating: number
  assessedLevel: number
  targetLevel: number
  score: number | null
  strengths: string[]
  gaps: string[]
  summary: string
}

export interface AssessmentResults {
  assessmentId: string
  goalTitle: string
  skills: SkillResult[]
  questions: { id: string; skill: string; prompt: string; score: number; feedback: string }[]
}

export const skillCheckKeys = {
  form: ['skillcheck', 'form'] as const,
  assessment: ['skillcheck', 'assessment'] as const,
  results: ['skillcheck', 'results'] as const,
}

export const useRatingForm = () =>
  useQuery({ queryKey: skillCheckKeys.form, queryFn: () => api.get<RatingForm>('/api/learning/skills') })

export function useSaveRatings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (ratings: { skill: string; rating: number }[]) => api.put<void>('/api/learning/ratings', { ratings }),
    onSuccess: () =>
      Promise.all([
        queryClient.removeQueries({ queryKey: skillCheckKeys.assessment }),
        queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
      ]),
  })
}

/** The first request generates the check (several seconds), so no automatic retries or refetches. */
export const useAssessment = () =>
  useQuery({
    queryKey: skillCheckKeys.assessment,
    queryFn: () => api.get<Assessment>('/api/learning/assessment'),
    retry: false,
    staleTime: Infinity,
  })

export function useSubmitAnswers() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (answers: { questionId: string; answer: string | null }[]) =>
      api.post<AssessmentResults>('/api/learning/assessment/submit', { answers }),
    onSuccess: (results) => {
      queryClient.setQueryData(skillCheckKeys.results, results)
      queryClient.removeQueries({ queryKey: skillCheckKeys.assessment })
    },
  })
}

export const useResults = () =>
  useQuery({ queryKey: skillCheckKeys.results, queryFn: () => api.get<AssessmentResults>('/api/learning/assessment/results') })

/** What the plan will do with a skill, by the same rule the planner uses. */
export function gapNote(current: number, target: number) {
  const gap = target - current
  return gap <= 0 ? 'Skip' : gap === 1 ? 'Refresh' : 'Focus'
}
