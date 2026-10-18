import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router'

import { api, ApiError } from '../../shared/api/client'

export interface Me {
  id: string
  email: string
  fullName: string | null
  onboardingCompleted: boolean
}

export interface RegisterInput {
  fullName: string
  email: string
  password: string
}

export interface LoginInput {
  email: string
  password: string
}

export const authKeys = {
  me: ['auth', 'me'] as const,
  providers: ['auth', 'providers'] as const,
}

/** The signed-in user, or null when signed out. */
export function useMe() {
  return useQuery({
    queryKey: authKeys.me,
    queryFn: async () => {
      try {
        return await api.get<Me>('/api/auth/me')
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) return null
        throw error
      }
    },
    staleTime: 5 * 60_000,
  })
}

export function useAuthProviders() {
  return useQuery({
    queryKey: authKeys.providers,
    queryFn: () => api.get<{ google: boolean }>('/api/auth/providers'),
    staleTime: Infinity,
  })
}

/** Signs in (or up). Storing the session is enough: RedirectIfSignedIn then routes the user onward. */
function useSessionMutation<TInput>(request: (input: TInput) => Promise<Me>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: request,
    onSuccess: (me) => queryClient.setQueryData(authKeys.me, me),
  })
}

export const useLogin = () => useSessionMutation((input: LoginInput) => api.post<Me>('/api/auth/login', input))

export const useRegister = () => useSessionMutation((input: RegisterInput) => api.post<Me>('/api/auth/register', input))

export function useLogout() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  return useMutation({
    mutationFn: () => api.post<void>('/api/auth/logout'),
    onSuccess: () => {
      queryClient.clear()
      queryClient.setQueryData(authKeys.me, null)
      navigate('/', { replace: true })
    },
  })
}

/** Full-page navigation: Google sign-in is a redirect flow, not a fetch. */
export const GOOGLE_SIGN_IN_URL = '/api/auth/google'
