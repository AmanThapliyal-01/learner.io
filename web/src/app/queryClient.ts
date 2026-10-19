import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query'

import { authKeys } from '../features/auth/api'
import { ApiError } from '../shared/api/client'

/** A 401 anywhere means the session ended: forget the user so the route guards send them to log in. */
function onSessionExpired(error: unknown) {
  if (error instanceof ApiError && error.status === 401) {
    queryClient.setQueryData(authKeys.me, null)
  }
}

export const queryClient: QueryClient = new QueryClient({
  queryCache: new QueryCache({ onError: onSessionExpired }),
  mutationCache: new MutationCache({ onError: onSessionExpired }),
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      // Client errors (401, 404, ...) won't fix themselves on retry.
      retry: (failureCount, error) =>
        !(error instanceof ApiError && error.status < 500) && failureCount < 2,
    },
  },
})
