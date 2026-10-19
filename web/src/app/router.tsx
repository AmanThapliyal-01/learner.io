import { createBrowserRouter } from 'react-router'

import { RedirectIfSignedIn, RequireAuth, RequireOnboarded } from '../features/auth/guards'
import { LoginPage } from '../features/auth/LoginPage'
import { SignupPage } from '../features/auth/SignupPage'
import { LandingPage } from '../features/landing/LandingPage'
import { NotFoundPage } from './NotFoundPage'
import { RouteErrorPage } from './RouteErrorPage'

/** Signed-in pages load on demand so the landing page stays light. */
const page = <T extends Record<string, React.ComponentType>>(load: () => Promise<T>, name: keyof T) => () =>
  load().then((module) => ({ Component: module[name] }))

export const router = createBrowserRouter([
  {
    errorElement: <RouteErrorPage />,
    children: [
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
          { path: '/onboarding', lazy: page(() => import('../features/onboarding/OnboardingPage'), 'OnboardingPage') },
          {
            element: <RequireOnboarded />,
            children: [
              {
                lazy: page(() => import('../features/dashboard/AppLayout'), 'AppLayout'),
                children: [
                  { path: '/dashboard', lazy: page(() => import('../features/dashboard/DashboardPage'), 'DashboardPage') },
                  { path: '/profile', lazy: page(() => import('../features/profile/ProfilePage'), 'ProfilePage') },
                  { path: '/asta', lazy: page(() => import('../features/asta/AstaPage'), 'AstaPage') },
                  { path: '/rate', lazy: page(() => import('../features/skillcheck/RatePage'), 'RatePage') },
                  { path: '/assessment', lazy: page(() => import('../features/skillcheck/AssessmentPage'), 'AssessmentPage') },
                  { path: '/assessment/results', lazy: page(() => import('../features/skillcheck/ResultsPage'), 'ResultsPage') },
                  { path: '/plan', lazy: page(() => import('../features/plan/PlanPage'), 'PlanPage') },
                ],
              },
            ],
          },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
