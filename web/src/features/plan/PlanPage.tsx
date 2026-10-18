import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'

import { formErrorFrom } from '../../shared/forms/errors'
import { Alert } from '../../shared/ui/Alert'
import { Button, ButtonLink } from '../../shared/ui/Button'
import { cn } from '../../shared/ui/cn'
import { SkillGap, SkillGapLegend } from '../../shared/ui/SkillGap'
import { Spinner } from '../../shared/ui/Spinner'
import { WorkingCard } from '../../shared/ui/WorkingCard'
import { useCurrentPlan, useRegeneratePlan, type PlanDocument, type ResourceKind } from './api'

const STATUS_NOTE = { skip: 'Skip', refresh: 'Refresh', focus: 'Focus' } as const
const KIND_LABEL: Record<ResourceKind, string> = {
  course: 'Course',
  docs: 'Docs',
  video: 'Video',
  book: 'Book',
  project: 'Project',
  article: 'Article',
  community: 'Community',
}

const formatDate = (iso: string) => new Date(iso).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })

export function PlanPage() {
  const { data: plan, isPending, error } = useCurrentPlan()
  const regenerate = useRegeneratePlan()

  if (isPending) return <Spinner className="size-5 text-primary" label="Loading your plan" />
  if (error || !plan) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-start gap-4">
        <Alert>{formErrorFrom(error) ?? "We couldn't load your plan."}</Alert>
        <ButtonLink to="/dashboard" variant="secondary">
          Back to dashboard
        </ButtonLink>
      </div>
    )
  }

  if (plan.phase === 'generating') {
    return (
      <WorkingCard
        title="Our agent is creating your plan"
        body="It's working from your goal and skill check. It'll be ready in a short while; this page updates by itself."
      />
    )
  }

  if (plan.phase === 'failed' || !plan.content) {
    return (
      <section className="mx-auto flex max-w-xl flex-col items-start gap-4 rounded-3xl border border-border bg-surface p-8">
        <h1 className="font-display text-2xl font-semibold">Your plan didn't finish</h1>
        <p className="text-ink-muted">Your goal and skill check are saved, so trying again picks up from there.</p>
        <Alert>{formErrorFrom(regenerate.error)}</Alert>
        <Button loading={regenerate.isPending} onClick={() => regenerate.mutate()}>
          Try again
        </Button>
      </section>
    )
  }

  return (
    <PlanView
      document={plan.content}
      generatedAt={plan.generatedAt}
      stale={plan.phase === 'stale'}
      regenerating={regenerate.isPending}
      regenerateError={formErrorFrom(regenerate.error)}
      onRegenerate={() => regenerate.mutate()}
    />
  )
}

interface PlanViewProps {
  document: PlanDocument
  generatedAt: string | null
  stale: boolean
  regenerating: boolean
  regenerateError?: string
  onRegenerate: () => void
}

function PlanView({ document, generatedAt, stale, regenerating, regenerateError, onRegenerate }: PlanViewProps) {
  const rows = document.skills.map((s) => ({ skill: s.skill, current: s.current_level, target: s.target_level, note: STATUS_NOTE[s.status] }))

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2 text-sm text-ink-muted">
          <span className="rounded-lg bg-primary-soft px-2.5 py-1 font-medium text-primary">
            {document.total_weeks} weeks · {document.hours_per_week} hrs a week
          </span>
          {generatedAt && <span>Built {formatDate(generatedAt)}</span>}
        </div>
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">Your learning plan</h1>
        <p className="text-lg text-ink-muted">{document.summary}</p>
      </header>

      {stale && (
        <section className="flex flex-col gap-3 rounded-2xl border border-warning/30 bg-warning-soft p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-medium text-warning">This plan is over a month old</p>
            <p className="text-sm text-ink-muted">Regenerate it from your goal and latest skill check to keep it current.</p>
          </div>
          <Button loading={regenerating} onClick={onRegenerate}>
            Regenerate plan
          </Button>
        </section>
      )}
      <Alert>{regenerateError}</Alert>

      <section aria-labelledby="start-heading" className="rounded-3xl border border-border bg-surface p-6 sm:p-8">
        <h2 id="start-heading" className="font-display text-xl font-semibold">
          Where you're starting
        </h2>
        <p className="mt-2 text-ink-muted">{document.starting_point}</p>
        <SkillGap rows={rows} className="mt-6" delay={0.1} />
        <div className="mt-6 border-t border-border pt-4">
          <SkillGapLegend />
        </div>
      </section>

      <section aria-labelledby="phases-heading">
        <h2 id="phases-heading" className="font-display text-xl font-semibold">
          Phases
        </h2>
        <ol className="relative mt-4 flex flex-col gap-4 border-l-2 border-border pl-6">
          {document.phases.map((phase, index) => (
            <PhaseCard key={phase.title} phase={phase} index={index} startWeek={1 + document.phases.slice(0, index).reduce((sum, p) => sum + p.weeks, 0)} />
          ))}
        </ol>
      </section>
    </div>
  )
}

function PhaseCard({ phase, index, startWeek }: { phase: PlanDocument['phases'][number]; index: number; startWeek: number }) {
  const [open, setOpen] = useState(index === 0)
  const endWeek = startWeek + phase.weeks - 1
  const panelId = `phase-${index}`

  return (
    <motion.li
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.06, duration: 0.25 }}
      className="relative"
    >
      <span
        aria-hidden
        className="absolute top-5 -left-[33px] flex size-4 items-center justify-center rounded-full border-2 border-primary bg-bg"
      />
      <div className="rounded-2xl border border-border bg-surface">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((value) => !value)}
          className="flex w-full items-start justify-between gap-4 rounded-2xl p-5 text-left hover:bg-surface-muted/60"
        >
          <span>
            <span className="block text-sm text-ink-muted">
              Phase {index + 1} · Weeks {startWeek}–{endWeek}
            </span>
            <span className="mt-0.5 block text-lg font-semibold text-ink">{phase.title}</span>
            <span className="mt-1 block text-ink-muted">{phase.aim}</span>
          </span>
          <svg aria-hidden viewBox="0 0 16 16" className={cn('mt-1 size-5 shrink-0 text-ink-muted transition-transform', open && 'rotate-180')}>
            <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              id={panelId}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22 }}
              className="overflow-hidden"
            >
              <div className="grid gap-5 border-t border-border p-5 text-[15px]">
                <Block title="You'll be able to">
                  <ul className="flex list-disc flex-col gap-1 pl-5">
                    {phase.objectives.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </Block>
                <Block title="Topics, in order">
                  <ol className="flex list-decimal flex-col gap-1 pl-5">
                    {phase.topics.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ol>
                </Block>
                <Block title="Practice">{phase.practice}</Block>
                <Block title="Milestone">{phase.milestone}</Block>
                {phase.resources.length > 0 && (
                  <Block title="Resources">
                    <ul className="flex flex-col gap-2">
                      {phase.resources.map((resource) => (
                        <li key={resource.title} className="rounded-xl bg-surface-muted p-3">
                          <span className="flex flex-wrap items-center gap-2">
                            <span className="font-medium">{resource.title}</span>
                            <span className="rounded-md bg-surface px-1.5 py-0.5 text-xs text-ink-muted">{KIND_LABEL[resource.kind]}</span>
                            {resource.free && <span className="rounded-md bg-primary-soft px-1.5 py-0.5 text-xs text-primary">Free</span>}
                          </span>
                          <span className="mt-1 block text-sm text-ink-muted">{resource.why}</span>
                        </li>
                      ))}
                    </ul>
                  </Block>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.li>
  )
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-medium tracking-wide text-ink-muted uppercase">{title}</h3>
      <div className="mt-1.5 text-ink">{children}</div>
    </div>
  )
}
