import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useNavigate } from 'react-router'

import { Alert } from '../../shared/ui/Alert'
import { Button } from '../../shared/ui/Button'
import { Logo } from '../../shared/ui/Logo'
import { FullPageSpinner } from '../../shared/ui/Spinner'
import { formErrorFrom } from '../../shared/forms/errors'
import { useCompleteOnboarding, useProfile } from '../profile/api'
import { homePath } from '../landing/planDraft'
import { BasicInfoForm } from '../profile/BasicInfoForm'
import { ProfileDetailsForm } from '../profile/ProfileDetailsForm'

const STEPS = [
  { title: 'First, the basics', subtitle: 'Just enough for Asta to talk to you like a person, not a form.' },
  {
    title: 'What do you already know?',
    subtitle: "Optional, but it's how your plan skips what you know. You can change it anytime from your profile.",
  },
]

export function OnboardingPage() {
  const navigate = useNavigate()
  const { data: profile, isPending } = useProfile()
  const complete = useCompleteOnboarding()
  const [step, setStep] = useState<number>()
  const [direction, setDirection] = useState(1)

  if (isPending || !profile) return <FullPageSpinner />

  // Resume where the user left off: basic info done → straight to step 2.
  const current = step ?? (profile.country && profile.ageRange && profile.currentStatus ? 1 : 0)
  const go = (next: number) => {
    setDirection(next > current ? 1 : -1)
    setStep(next)
  }
  const finish = () => navigate(homePath(), { replace: true })

  return (
    <div className="flex min-h-dvh flex-col px-4 py-6 sm:px-8">
      <header className="mx-auto flex w-full max-w-2xl items-center justify-between">
        <Logo />
        <p className="text-sm text-ink-muted" aria-live="polite">
          Step {current + 1} of {STEPS.length}
        </p>
      </header>

      <div className="mx-auto mt-4 h-1 w-full max-w-2xl overflow-hidden rounded-full bg-surface-muted" aria-hidden>
        <motion.div
          className="h-full rounded-full bg-primary"
          animate={{ width: `${((current + 1) / STEPS.length) * 100}%` }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        />
      </div>

      <main className="mx-auto w-full max-w-2xl flex-1 py-10">
        <AnimatePresence mode="wait" custom={direction} initial={false}>
          <motion.section
            key={current}
            custom={direction}
            initial={{ opacity: 0, x: direction * 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -24 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            aria-labelledby="step-title"
          >
            <h1 id="step-title" className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              {STEPS[current].title}
            </h1>
            <p className="mt-2 max-w-xl text-ink-muted">{STEPS[current].subtitle}</p>

            <div className="mt-8 rounded-2xl border border-border bg-surface p-6 sm:p-8">
              {current === 0 ? (
                <BasicInfoForm profile={profile} submitLabel="Continue" onSaved={() => go(1)} />
              ) : (
                <>
                  <Alert>{formErrorFrom(complete.error)}</Alert>
                  <ProfileDetailsForm
                    profile={profile}
                    submitLabel="Finish"
                    onSaved={finish}
                    actions={
                      <>
                        <Button variant="ghost" onClick={() => go(0)} className="mr-auto">
                          Back
                        </Button>
                        <Button variant="secondary" loading={complete.isPending} onClick={() => complete.mutate(undefined, { onSuccess: finish })}>
                          Skip for now
                        </Button>
                      </>
                    }
                  />
                </>
              )}
            </div>
          </motion.section>
        </AnimatePresence>
      </main>
    </div>
  )
}
