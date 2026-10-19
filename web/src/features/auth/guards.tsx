import { Navigate, Outlet, useLocation } from 'react-router'

import { FullPageSpinner } from '../../shared/ui/Spinner'
import { homePath } from '../landing/planDraft'
import { useMe } from './api'

/** Signed-in users only; others go to login and come back afterwards. */
export function RequireAuth() {
  const { data: me, isPending } = useMe()
  const location = useLocation()

  if (isPending) return <FullPageSpinner />
  if (!me) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return <Outlet />
}

/** The app itself needs basic info first. */
export function RequireOnboarded() {
  const { data: me } = useMe()
  if (me && !me.onboardingCompleted) return <Navigate to="/onboarding" replace />
  return <Outlet />
}

/**
 * Login and signup make no sense when already signed in. This is also the one place that routes a user
 * after signing in: back to the page that sent them to login, or to onboarding if it isn't done.
 */
export function RedirectIfSignedIn() {
  const { data: me, isPending } = useMe()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from

  if (isPending) return <FullPageSpinner />
  if (me) return <Navigate to={me.onboardingCompleted ? (from ?? homePath()) : '/onboarding'} replace />
  return <Outlet />
}
