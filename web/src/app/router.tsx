import { createBrowserRouter } from 'react-router'

import { HomePage } from '../features/home/HomePage'

// Feature routes (landing, auth, onboarding, dashboard) are added here as they land.
export const router = createBrowserRouter([
  {
    path: '/',
    element: <HomePage />,
  },
])
