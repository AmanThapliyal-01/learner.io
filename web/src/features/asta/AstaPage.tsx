import { ButtonLink } from '../../shared/ui/Button'

/** Placeholder until the Asta chat lands in M2. */
export function AstaPage() {
  return (
    <section className="flex flex-col items-start gap-4 rounded-3xl border border-border bg-surface p-6 sm:p-10">
      <h1 className="font-display text-3xl font-semibold tracking-tight">Asta is almost here</h1>
      <p className="max-w-xl text-ink-muted">
        The chat that turns your goal into a plan arrives in the next build. Your profile is saved, so you'll start right
        where you are.
      </p>
      <ButtonLink to="/dashboard" variant="secondary">
        Back to dashboard
      </ButtonLink>
    </section>
  )
}
