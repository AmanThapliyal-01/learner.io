import type { ReactNode } from 'react'
import { Link, NavLink } from 'react-router'

import { AnimatedOutlet } from '../../shared/ui/AnimatedOutlet'
import { Button } from '../../shared/ui/Button'
import { cn } from '../../shared/ui/cn'
import { Logo } from '../../shared/ui/Logo'
import { useLogout, useMe } from '../auth/api'

const icon = (path: ReactNode) => (
  <svg aria-hidden viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    {path}
  </svg>
)

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: icon(<path d="M4 11l8-7 8 7v8a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1z" />) },
  { to: '/asta', label: 'Asta', icon: icon(<path d="M5 18l-1 3 4-2a9 8 0 1 0-3-1z" />) },
  {
    to: '/profile',
    label: 'Profile',
    icon: icon(
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
      </>,
    ),
  },
]

/**
 * Shell for signed-in pages. Wide screens: a top bar with sections and Sign out. Phones: sections move to a
 * bottom tab bar (navigation only, per Apple's HIG); Sign out, an action, lives on the Profile page.
 */
export function AppLayout() {
  const { data: me } = useMe()
  const logout = useLogout()
  const initial = (me?.fullName || me?.email || '?').trim().charAt(0).toUpperCase()

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-10 border-b border-border bg-bg/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center gap-4 px-4 sm:px-6">
          <Logo to="/dashboard" />
          <nav aria-label="Main" className="ml-6 hidden items-center gap-1 sm:flex">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'flex min-h-11 items-center rounded-lg px-3 text-[15px] font-medium transition-colors',
                    isActive ? 'bg-primary-soft text-primary' : 'text-ink-muted hover:bg-surface-muted hover:text-ink',
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            {/* Looks like an account button, so it acts as one: it opens Profile. */}
            <Link
              to="/profile"
              aria-label={`Profile${me?.email ? ` (${me.email})` : ''}`}
              title={me?.email}
              className="flex size-11 items-center justify-center rounded-full"
            >
              <span aria-hidden className="flex size-9 items-center justify-center rounded-full bg-primary-soft text-sm font-semibold text-primary">
                {initial}
              </span>
            </Link>
            {/* Wrapped: the button's own inline-flex would override `hidden`. */}
            <span className="hidden sm:block">
              <Button variant="ghost" loading={logout.isPending} onClick={() => logout.mutate()}>
                Sign out
              </Button>
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pt-8 pb-28 sm:px-6 sm:py-12">
        <AnimatedOutlet />
      </main>

      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-surface/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md sm:hidden"
      >
        <ul className="grid grid-cols-3">
          {NAV.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs font-medium transition-colors',
                    isActive ? 'text-primary' : 'text-ink-muted',
                  )
                }
              >
                {item.icon}
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}
