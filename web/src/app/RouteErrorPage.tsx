import { isRouteErrorResponse, useRouteError } from 'react-router'

import { Button, ButtonLink } from '../shared/ui/Button'
import { Logo } from '../shared/ui/Logo'

/** Catches render errors and failed page downloads (e.g. after a new deploy) anywhere in the app. */
export function RouteErrorPage() {
  const error = useRouteError()
  const notFound = isRouteErrorResponse(error) && error.status === 404
  const chunkFailed = error instanceof Error && /dynamically imported module|Importing a module script failed/i.test(error.message)

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-5 px-4 text-center">
      <Logo />
      <h1 className="font-display text-3xl font-semibold tracking-tight">
        {notFound ? "This page doesn't exist." : 'Something went wrong on this page.'}
      </h1>
      <p className="max-w-md text-ink-muted">
        {chunkFailed
          ? 'learner.io was just updated. Reload to get the latest version.'
          : "Your progress is saved. Reload the page, or head back to your dashboard."}
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <Button onClick={() => window.location.reload()}>Reload</Button>
        <ButtonLink to="/dashboard" variant="secondary">
          Go to dashboard
        </ButtonLink>
      </div>
    </main>
  )
}
