import { AnimatePresence, motion, useReducedMotion } from 'motion/react'

import { AgentAvatar } from './AgentAvatar'
import type { AgentName } from './agents'
import { cn } from './cn'

/** One step of an agent's work. Only mark a step done once the agent has really finished it. */
export interface WorkingStep {
  label: string
  state: 'done' | 'active' | 'pending'
  /** A real count, e.g. "2 of 4". Never an estimate. */
  detail?: string
}

interface WorkingCardProps {
  title: string
  body: string
  agent?: AgentName
  /** The agent's real steps. Without them the card shows an indeterminate bar. */
  steps?: WorkingStep[]
  footnote?: string
}

/** Shown while an agent works: a gently breathing mark, an honest message, no fake progress numbers. */
export function WorkingCard({ title, body, agent = 'asta', steps, footnote }: WorkingCardProps) {
  const reduceMotion = useReducedMotion()

  return (
    <section
      role={steps ? undefined : 'status'}
      aria-live={steps ? undefined : 'polite'}
      className="mx-auto flex max-w-xl flex-col items-center gap-5 rounded-3xl border border-border bg-surface px-6 py-12 text-center"
    >
      <motion.div
        animate={reduceMotion ? undefined : { scale: [1, 1.08, 1] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
      >
        <AgentAvatar agent={agent} className="size-12" />
      </motion.div>
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 text-ink-muted">{body}</p>
      </div>
      {steps ? (
        <>
          <StepList steps={steps} />
          <p role="status" aria-live="polite" className="sr-only">
            {announcement(steps)}
          </p>
        </>
      ) : (
        <div className="h-1 w-40 overflow-hidden rounded-full bg-surface-muted" aria-hidden>
          <motion.div
            className="h-full w-1/3 rounded-full bg-primary"
            animate={{ x: ['-100%', '300%'] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>
      )}
      {footnote && <p className="text-sm text-ink-muted">{footnote}</p>}
    </section>
  )
}

/** One short sentence for screen readers, so a change is announced once instead of re-reading the list. */
function announcement(steps: WorkingStep[]) {
  const lastDone = steps.filter((step) => step.state === 'done').at(-1)
  const active = steps.find((step) => step.state === 'active')
  const parts = []
  if (lastDone) parts.push(`Done: ${lastDone.label}.`)
  if (active) parts.push(`Now: ${active.label}${active.detail ? `, ${active.detail} done` : ''}.`)
  return parts.join(' ')
}

function StepList({ steps }: { steps: WorkingStep[] }) {
  return (
    <ol className="flex w-full max-w-xs flex-col gap-1 text-left">
      {steps.map((step) => (
        <li
          key={step.label}
          aria-current={step.state === 'active' ? 'step' : undefined}
          className={cn(
            'flex items-center gap-3 rounded-xl px-3 py-2 transition-colors duration-300',
            step.state === 'active' && 'bg-surface-muted',
          )}
        >
          <StepIcon state={step.state} />
          <span className={cn('flex-1 transition-colors duration-300', step.state === 'pending' ? 'text-ink-muted' : 'text-ink')}>
            {step.label}
            <span className="sr-only">{step.state === 'done' ? ' (done)' : step.state === 'active' ? ' (in progress)' : ''}</span>
          </span>
          {step.detail && <span className="text-sm text-ink-muted tabular-nums">{step.detail}</span>}
        </li>
      ))}
    </ol>
  )
}

function StepIcon({ state }: { state: WorkingStep['state'] }) {
  const reduceMotion = useReducedMotion()

  return (
    <span aria-hidden className="relative flex size-5 shrink-0 items-center justify-center">
      <AnimatePresence initial={false} mode="popLayout">
        {state === 'done' ? (
          <motion.svg
            key="done"
            viewBox="0 0 20 20"
            className="size-5"
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 28 }}
          >
            <circle cx="10" cy="10" r="10" className="fill-primary" />
            <motion.path
              d="M6 10.4l2.6 2.6L14 7.5"
              fill="none"
              className="stroke-on-primary"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: reduceMotion ? 1 : 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.3, delay: 0.1, ease: 'easeOut' }}
            />
          </motion.svg>
        ) : state === 'active' ? (
          <motion.span key="active" className="relative flex size-5 items-center justify-center" exit={{ opacity: 0, scale: 0.6 }}>
            <span className="absolute inset-0 rounded-full border-2 border-primary/25" />
            <span className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-primary [animation-duration:1.1s]" />
          </motion.span>
        ) : (
          <motion.span key="pending" className="size-3.5 rounded-full border-2 border-border-strong/60" exit={{ opacity: 0 }} />
        )}
      </AnimatePresence>
    </span>
  )
}
