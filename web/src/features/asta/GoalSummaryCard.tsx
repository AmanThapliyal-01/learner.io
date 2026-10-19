import { motion } from 'motion/react'

import { Button } from '../../shared/ui/Button'
import type { GoalSummary } from './api'

const STYLE_LABELS: Record<GoalSummary['learning_style'], string> = {
  video: 'Video',
  reading: 'Reading',
  hands_on: 'Hands-on',
  mixed: 'A mix',
}

const BUDGET_LABELS: Record<GoalSummary['budget'], string> = {
  free_only: 'Free resources only',
  paid_ok: 'Paid resources are fine',
}

interface GoalSummaryCardProps {
  summary: GoalSummary
  /** Only the latest card, while the goal is still being set, can be confirmed. */
  actionable: boolean
  confirming?: boolean
  onConfirm?: () => void
  onChange?: () => void
}

export function GoalSummaryCard({ summary, actionable, confirming, onConfirm, onChange }: GoalSummaryCardProps) {
  const time = [`${summary.hours_per_week} hrs a week`, summary.timeline].filter(Boolean).join(' · ')

  return (
    <motion.section
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      aria-label="Goal summary"
      className="mt-3 w-full max-w-md overflow-hidden rounded-2xl border border-primary/30 bg-surface shadow-sm"
    >
      <header className="border-b border-border bg-primary-soft px-5 py-4">
        <p className="text-xs font-medium tracking-wide text-ink-muted uppercase">
          {summary.goal_type === 'professional' ? 'Professional goal' : 'Personal goal'}
        </p>
        <h3 className="mt-1 font-display text-lg font-semibold text-ink">{summary.title}</h3>
      </header>
      <dl className="grid gap-3 px-5 py-4 text-sm">
        <Row label="Success looks like" value={summary.target_outcome} />
        <Row label="Why now" value={summary.motivation} />
        <Row label="Time" value={time} />
        <Row label="Learning style" value={`${STYLE_LABELS[summary.learning_style]} · ${BUDGET_LABELS[summary.budget]}`} />
        <div>
          <dt className="text-ink-muted">Skills we'll check</dt>
          <dd className="mt-1.5 flex flex-wrap gap-1.5">
            {summary.skills.map((skill) => (
              <span key={skill} className="rounded-lg bg-surface-muted px-2.5 py-1 text-ink">
                {skill}
              </span>
            ))}
          </dd>
        </div>
      </dl>
      {actionable && (
        <footer className="flex flex-wrap justify-end gap-2 border-t border-border px-5 py-3">
          <Button variant="ghost" onClick={onChange}>
            Change something
          </Button>
          <Button loading={confirming} onClick={onConfirm}>
            Confirm goal
          </Button>
        </footer>
      )}
    </motion.section>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-0.5 sm:grid-cols-[9rem_1fr] sm:gap-3">
      <dt className="text-ink-muted">{label}</dt>
      <dd className="text-ink">{value}</dd>
    </div>
  )
}
