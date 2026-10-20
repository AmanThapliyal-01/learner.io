import type { ReactNode } from 'react'
import { motion } from 'motion/react'

import { cn } from './cn'

export interface SkillGapRow {
  skill: string
  /** Assessed level, 0–5. */
  current: number
  /** Level the goal needs, 0–5. */
  target: number
  /** What the plan does about it, e.g. "Skip" or "Focus · 3 wks". */
  note: string
}

const LEVELS = 5
const pct = (level: number) => `${(Math.min(Math.max(level, 0), LEVELS) / LEVELS) * 100}%`

interface SkillGapProps {
  rows: SkillGapRow[]
  className?: string
  delay?: number
  /** Rows are being edited live (e.g. by sliders): changes animate at once, without the entrance stagger. */
  live?: boolean
  /** The user is dragging a value: bars follow it instantly instead of easing behind the pointer. */
  tracking?: boolean
  /** An input rendered under each bar, e.g. a slider to change `current`. */
  renderControl?: (row: SkillGapRow, index: number) => ReactNode
}

/**
 * The product's signature: what you already know (solid) versus what your goal needs (the gap).
 * Meaning is carried by text too (note + accessible label), never by color alone.
 */
export function SkillGap({ rows, className, delay = 0, live, tracking, renderControl }: SkillGapProps) {
  return (
    <ul className={cn('flex flex-col gap-4', className)}>
      {rows.map((row, index) => {
        const covered = row.current >= row.target
        const rowDelay = live ? 0 : delay + index * 0.12
        const gapDelay = live ? 0 : rowDelay + 0.45
        const duration = live ? (tracking ? 0 : 0.3) : undefined
        return (
          <li key={row.skill}>
            <span className="sr-only">
              {`${row.skill}: you're at level ${row.current} of ${LEVELS}, your goal needs ${row.target}. ${row.note}.`}
            </span>
            <div aria-hidden className="mb-1.5 flex items-baseline justify-between gap-3 text-small">
              <span className="font-medium text-ink">{row.skill}</span>
              <span
                className={cn(
                  'rounded-md px-2 py-0.5 text-small font-medium',
                  covered ? 'bg-surface-muted text-ink-muted' : 'bg-primary-soft text-primary',
                )}
              >
                {row.note}
              </span>
            </div>
            <div aria-hidden className="relative h-2.5 rounded-full bg-surface-muted">
              {/* The gap: from where you are to where the goal needs you. */}
              {!covered && (
                <motion.div
                  className="gap-stripes absolute inset-y-0 rounded-full"
                  style={{ left: pct(row.current) }}
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ left: pct(row.current), width: `calc(${pct(row.target)} - ${pct(row.current)})`, opacity: 1 }}
                  transition={{ delay: gapDelay, duration: duration ?? 0.5, ease: 'easeOut' }}
                />
              )}
              {/* What you already know. */}
              <motion.div
                className={cn('absolute inset-y-0 left-0 rounded-full', covered ? 'bg-ink-muted/45' : 'bg-primary')}
                initial={{ width: 0 }}
                animate={{ width: pct(row.current) }}
                transition={{ delay: rowDelay, duration: duration ?? 0.6, ease: [0.22, 1, 0.36, 1] }}
              />
              {/* The goal marker. */}
              <motion.div
                className="absolute -top-1 -bottom-1 w-0.5 rounded-full bg-ink"
                style={{ left: `calc(${pct(row.target)} - 1px)` }}
                initial={{ opacity: 0, scaleY: 0.4 }}
                animate={{ opacity: 1, scaleY: 1 }}
                transition={{ delay: live ? 0 : rowDelay + 0.3, duration: 0.25 }}
              />
            </div>
            {renderControl?.(row, index)}
          </li>
        )
      })}
    </ul>
  )
}

export function SkillGapLegend() {
  return (
    <div aria-hidden className="flex flex-wrap items-center gap-x-4 gap-y-1 text-small text-ink-muted">
      <span className="flex items-center gap-1.5">
        <span className="h-2 w-4 rounded-full bg-primary" /> You know
      </span>
      <span className="flex items-center gap-1.5">
        <span className="gap-stripes h-2 w-4 rounded-full" /> Your gap
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-3 w-0.5 rounded-full bg-ink" /> Goal
      </span>
    </div>
  )
}
