import { createBrowserRouter } from 'react-router'

import { RedirectIfSignedIn, RequireAuth, RequireOnboarded } from '../features/auth/guards'
import { LoginPage } from '../features/auth/LoginPage'
import { SignupPage } from '../features/auth/SignupPage'
import { LandingPage } from '../features/landing/LandingPage'
import { NotFoundPage } from './NotFoundPage'

// Signed-in pages load on demand so the landing page stays light.
export const router = createBrowserRouter([
  { path: '/', element: <LandingPage /> },
  {
    element: <RedirectIfSignedIn />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/signup', element: <SignupPage /> },
    ],
  },
  {
    element: <RequireAuth />,
    children: [
      { path: '/onboarding', lazy: () => import('../features/onboarding/OnboardingPage').then((m) => ({ Component: m.OnboardingPage })) },
      {
        element: <RequireOnboarded />,
        children: [
          {
            lazy: () => import('../features/dashboard/AppLayout').then((m) => ({ Component: m.AppLayout })),
            children: [
              { path: '/dashboard', lazy: () => import('../features/dashboard/DashboardPage').then((m) => ({ Component: m.DashboardPage })) },
              { path: '/profile', lazy: () => import('../features/profile/ProfilePage').then((m) => ({ Component: m.ProfilePage })) },
              { path: '/asta', lazy: () => import('../features/asta/AstaPage').then((m) => ({ Component: m.AstaPage })) },
            ],
          },
        ],
      },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
])
