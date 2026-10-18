import type { ReactNode } from 'react'
import { motion } from 'motion/react'

import { Alert } from '../../shared/ui/Alert'
import { ButtonLink } from '../../shared/ui/Button'
import { Spinner } from '../../shared/ui/Spinner'
import { useMe } from '../auth/api'
import { ChangeGoalButton } from '../goal/ChangeGoalButton'
import { useDashboard, type Dashboard } from './api'

function greeting(now = new Date()) {
  const hour = now.getHours()
  return hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
}

export function DashboardPage() {
  const { data: me } = useMe()
  const { data, isPending, error } = useDashboard()
  const firstName = me?.fullName?.split(' ')[0]

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          {greeting()}
          {firstName ? `, ${firstName}` : ''}.
        </h1>
      </header>
      {isPending ? (
        <Spinner className="size-5 text-primary" label="Loading your dashboard" />
      ) : error || !data ? (
        <Alert>We couldn't load your dashboard. Refresh to try again.</Alert>
      ) : (
        <DashboardBody dashboard={data} />
      )}
    </div>
  )
}

function DashboardBody({ dashboard }: { dashboard: Dashboard }) {
  if (dashboard.state === 'no_goal') return <EmptyState />
  return (
    <div className="flex flex-col gap-3">
      <GoalStateCard dashboard={dashboard} />
      <div className="flex justify-end">
        <ChangeGoalButton />
      </div>
    </div>
  )
}

function GoalStateCard({ dashboard }: { dashboard: Dashboard }) {
  switch (dashboard.state) {
    case 'no_goal':
      return null
    case 'goal_in_progress':
      return dashboard.goal?.stage === 'chatting' ? (
        <StateCard
          title="Your goal is taking shape"
          body="Pick up with Asta where you left off. Once your goal is clear, you'll check your skills and get your plan."
          action={<ButtonLink to="/asta">Continue with Asta</ButtonLink>}
        />
      ) : dashboard.goal?.stage === 'rating' ? (
        <StateCard
          title={`Your goal: ${dashboard.goal.title ?? 'confirmed'}`}
          body="Next, rate how well you know each skill, then take a short check. Your plan is built from the result."
          action={<ButtonLink to="/rate">Rate your skills</ButtonLink>}
        />
      ) : (
        <StateCard
          title={`Your goal: ${dashboard.goal?.title ?? 'confirmed'}`}
          body="Pick up your skill check where you left off. Once it's done, our agent builds your plan."
          action={<ButtonLink to="/assessment">Continue the skill check</ButtonLink>}
        />
      )
    case 'plan_generating':
      return (
        <StateCard
          title="Our agent is creating your plan"
          body="It's working from your goal and assessment. This usually takes a minute or two; this page updates on its own."
          action={<ButtonLink to="/plan" variant="secondary">See progress</ButtonLink>}
        />
      )
    case 'plan_failed':
      return (
        <StateCard
          title="Your plan didn't finish"
          body="Something went wrong while building it. Your goal and assessment are saved, so trying again starts from there."
          action={<ButtonLink to="/plan">Try again</ButtonLink>}
        />
      )
    case 'plan_stale':
      return (
        <StateCard
          title="Your plan is a month old"
          body="Skills and markets move. Regenerate it to reflect where you are now."
          action={<ButtonLink to="/plan">View plan</ButtonLink>}
        />
      )
    case 'plan_ready':
      return (
        <StateCard
          title="Your plan is ready"
          body="Built around the gap between what you know and what your goal needs."
          action={<ButtonLink to="/plan">Open your plan</ButtonLink>}
        />
      )
  }
}

const FIRST_STEPS = [
  { title: 'Tell Asta your goal', detail: 'A role, a skill, or "I\'m not sure yet". About 5 minutes.' },
  { title: 'Check what you know', detail: 'Rate yourself, then a short assessment confirms it.' },
  { title: 'Get your plan', detail: 'Built around your gap, your hours and your budget.' },
]

function EmptyState() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="grid gap-8 overflow-hidden rounded-3xl border border-border bg-surface p-6 sm:p-10 md:grid-cols-[1.2fr_1fr]"
      aria-labelledby="empty-title"
    >
      <div className="flex flex-col items-start gap-4">
        <h2 id="empty-title" className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
          Let's work out what you'll learn.
        </h2>
        <p className="max-w-md text-ink-muted">
          Asta asks a few sharp questions, checks what you already know, and then our agent builds a plan around the
          gap, not a generic roadmap.
        </p>
        <ButtonLink to="/asta" size="lg" className="mt-2">
          Chat with Asta
        </ButtonLink>
      </div>
      <ol className="flex flex-col gap-3">
        {FIRST_STEPS.map((step, index) => (
          <motion.li
            key={step.title}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 + index * 0.08, duration: 0.3 }}
            className="flex gap-4 rounded-2xl bg-surface-muted p-4"
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-on-primary">
              {index + 1}
            </span>
            <span>
              <span className="block font-medium">{step.title}</span>
              <span className="block text-sm text-ink-muted">{step.detail}</span>
            </span>
          </motion.li>
        ))}
      </ol>
    </motion.section>
  )
}

function StateCard({ title, body, action }: { title: string; body: string; action: ReactNode }) {
  return (
    <section className="flex flex-col items-start gap-4 rounded-3xl border border-border bg-surface p-6 sm:p-10">
      <h2 className="font-display text-2xl font-semibold tracking-tight">{title}</h2>
      <p className="max-w-xl text-ink-muted">{body}</p>
      {action}
    </section>
  )
}
