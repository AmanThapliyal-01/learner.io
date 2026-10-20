import type { ReactNode } from 'react'
import { motion } from 'motion/react'

import { ButtonLink } from '../../shared/ui/Button'
import { SkillGap, SkillGapLegend } from '../../shared/ui/SkillGap'
import { Spinner } from '../../shared/ui/Spinner'
import { useCurrentPlan } from '../plan/api'
import { phaseWeeks, skillGapRows } from '../plan/planDocument'

/**
 * Home once the plan is ready answers "what do I do now?": the phase to work on, its first practice task, and the
 * gap the plan closes. There's no progress tracking yet, so the current phase is always the first one.
 */
export function CurrentPhase({ goalTitle, fallback }: { goalTitle?: string; fallback: ReactNode }) {
  const { data: plan, isPending } = useCurrentPlan()

  if (isPending) return <Spinner className="size-5 text-primary" label="Loading your plan" />
  const document = plan?.content
  if (!document || document.phases.length === 0) return fallback

  const index = 0
  const phase = document.phases[index]
  const weeks = phaseWeeks(document.phases, index)

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="flex flex-col gap-4"
    >
      {/* Phones read top to bottom: what the phase is, the task to do, then the way in. */}
      <section
        aria-labelledby="phase-title"
        className="grid gap-6 rounded-3xl border border-border bg-surface p-6 sm:p-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:grid-rows-[auto_1fr] lg:gap-x-10"
      >
        <div>
          <p className="text-small text-ink-muted">
            Start here · Phase {index + 1} of {document.phases.length} · Weeks {weeks.start}–{weeks.end}
          </p>
          <h2 id="phase-title" className="mt-2 font-display text-heading font-semibold tracking-tight text-balance">
            {phase.title}
          </h2>
          <p className="mt-3 text-ink-muted">{phase.aim}</p>
        </div>

        <div className="rounded-2xl bg-primary-soft p-5 sm:p-6 lg:col-start-2 lg:row-span-2 lg:row-start-1">
          <h3 className="font-display text-title font-semibold text-ink">Your first practice task</h3>
          <p className="mt-2 text-ink">{phase.practice}</p>
        </div>

        <div className="flex flex-col items-start gap-4">
          <ButtonLink to="/plan">Open phase {index + 1}</ButtonLink>
          <p className="text-small text-ink-muted">
            Milestone: <span className="text-ink">{phase.milestone}</span>
          </p>
        </div>
      </section>

      <section aria-labelledby="gap-title" className="flex flex-col gap-5 rounded-3xl border border-border bg-surface p-6 sm:p-8">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <div>
            <h2 id="gap-title" className="font-display text-title font-semibold">
              Your gap{goalTitle ? `: ${goalTitle}` : ''}
            </h2>
            <p className="mt-1 text-small text-ink-muted">
              Planned over {document.total_weeks} weeks at {document.hours_per_week} hours a week.
            </p>
          </div>
          <SkillGapLegend />
        </div>
        <SkillGap rows={skillGapRows(document)} delay={0.15} />
      </section>
    </motion.div>
  )
}
