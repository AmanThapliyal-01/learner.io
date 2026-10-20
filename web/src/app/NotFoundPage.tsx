import { ButtonLink } from '../shared/ui/Button'
import { Logo } from '../shared/ui/Logo'

export function NotFoundPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4 text-center">
      <Logo />
      <h1 className="font-display text-heading font-semibold tracking-tight">This page doesn't exist.</h1>
      <p className="text-ink-muted">The link may be old, or the address has a typo.</p>
      <ButtonLink to="/">Go to the home page</ButtonLink>
    </main>
  )
}
