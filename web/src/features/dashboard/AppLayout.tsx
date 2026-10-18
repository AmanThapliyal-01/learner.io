import { NavLink } from 'react-router'

import { AnimatedOutlet } from '../../shared/ui/AnimatedOutlet'
import { Button } from '../../shared/ui/Button'
import { cn } from '../../shared/ui/cn'
import { Logo } from '../../shared/ui/Logo'
import { useLogout, useMe } from '../auth/api'

const NAV = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/profile', label: 'Profile' },
]

/** Shell for signed-in pages: one top bar on every width (two destinations don't need a sidebar). */
export function AppLayout() {
  const { data: me } = useMe()
  const logout = useLogout()
  const initial = (me?.fullName || me?.email || '?').trim().charAt(0).toUpperCase()

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-10 border-b border-border bg-bg/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center gap-4 px-4 sm:px-6">
          <Logo to="/dashboard" />
          <nav aria-label="Main" className="ml-2 flex items-center gap-1 sm:ml-6">
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
            <span
              aria-hidden
              title={me?.email}
              className="hidden size-9 items-center justify-center rounded-full bg-primary-soft text-sm font-semibold text-primary sm:flex"
            >
              {initial}
            </span>
            <Button variant="ghost" loading={logout.isPending} onClick={() => logout.mutate()}>
              Sign out
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
        <AnimatedOutlet />
      </main>
    </div>
  )
}
