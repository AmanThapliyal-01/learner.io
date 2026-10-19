import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { api } from '../../shared/api/client'
import { authKeys } from '../auth/api'

export interface BasicInfo {
  fullName: string
  country: string
  ageRange: string
  currentStatus: string
}

export interface ProfileDetails {
  profession: string | null
  yearsOfExperience: number | null
  education: string | null
  certifications: string[]
  skills: string[]
  hobbies: string[]
  professionalSummary: string | null
}

export interface Profile extends ProfileDetails {
  fullName: string
  country: string | null
  ageRange: string | null
  currentStatus: string | null
  onboardingCompleted: boolean
}

export const profileKeys = { profile: ['profile'] as const }

export function useProfile() {
  return useQuery({ queryKey: profileKeys.profile, queryFn: () => api.get<Profile>('/api/profile') })
}

/** Every profile write returns the fresh profile; keep it and the session's onboarding flag in sync. */
function useProfileMutation<TInput>(request: (input: TInput) => Promise<Profile>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: request,
    onSuccess: (profile) => {
      queryClient.setQueryData(profileKeys.profile, profile)
      return queryClient.invalidateQueries({ queryKey: authKeys.me })
    },
  })
}

export const useUpdateBasicInfo = () => useProfileMutation((input: BasicInfo) => api.put<Profile>('/api/profile/basic', input))

export const useUpdateDetails = () =>
  useProfileMutation((input: ProfileDetails) => api.put<Profile>('/api/profile/details', input))

export const useCompleteOnboarding = () =>
  useProfileMutation(() => api.post<Profile>('/api/profile/onboarding/complete'))
