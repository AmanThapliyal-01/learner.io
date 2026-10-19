import { Alert } from '../../shared/ui/Alert'
import { Button } from '../../shared/ui/Button'
import { Spinner } from '../../shared/ui/Spinner'
import { useLogout } from '../auth/api'
import { useProfile } from './api'
import { BasicInfoForm } from './BasicInfoForm'
import { ProfileDetailsForm } from './ProfileDetailsForm'

export function ProfilePage() {
  const { data: profile, isPending, error } = useProfile()
  const logout = useLogout()

  if (isPending) return <Spinner className="size-5 text-primary" label="Loading your profile" />
  if (error || !profile) return <Alert>We couldn't load your profile. Refresh to try again.</Alert>

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8">
      <header>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Profile</h1>
        <p className="mt-2 text-ink-muted">Asta uses this to suggest what to learn and to skip what you already know.</p>
      </header>
      <section aria-labelledby="basic-heading" className="rounded-2xl border border-border bg-surface p-6">
        <h2 id="basic-heading" className="mb-5 text-lg font-semibold">
          Basic info
        </h2>
        <BasicInfoForm profile={profile} submitLabel="Save basic info" confirmSaved />
      </section>
      <section aria-labelledby="details-heading" className="rounded-2xl border border-border bg-surface p-6">
        <h2 id="details-heading" className="mb-5 text-lg font-semibold">
          Experience and skills
        </h2>
        <ProfileDetailsForm profile={profile} submitLabel="Save details" confirmSaved />
      </section>
      <div className="sm:hidden">
        <Button variant="secondary" className="w-full" loading={logout.isPending} onClick={() => logout.mutate()}>
          Sign out
        </Button>
      </div>
    </div>
  )
}
