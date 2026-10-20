import { useEffect, useRef, useState, type ReactNode } from 'react'
import { motion, useInView, useReducedMotion } from 'motion/react'

import { AgentAvatar } from '../../shared/ui/AgentAvatar'
import { AGENTS, type AgentName } from '../../shared/ui/agents'
import { cn } from '../../shared/ui/cn'
import { reveal } from './reveal'

/** What Anbu works through while building a plan (the same stages the planner reports in the app). */
const ANBU_STEPS = ['Reading your skill check', 'Outlining phases', 'Detailing phase 2 of 4', 'Putting it together']
const STEP_MS = 1800

/** "Meet Asta & Anbu": who you talk to, who plans in the background, and the handoff between them. */
export function TeamSection() {
  const reduceMotion = useReducedMotion()
  // The two loops run on their own, so people get a way to stop them (WCAG 2.2.2 Pause, Stop, Hide).
  const [paused, setPaused] = useState(false)
  const still = Boolean(reduceMotion) || paused

  return (
    <section id="agents" aria-labelledby="agents-title" className="scroll-mt-20 bg-primary-soft">
      <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
        <motion.div {...reveal} className="max-w-2xl">
          <h2 id="agents-title" className="font-display text-heading font-semibold tracking-tight">
            Meet Asta & Anbu.
          </h2>
          <p className="mt-4 text-title text-ink-muted">
            Two agents, one handoff. Asta talks with you until your goal is clear. Anbu takes it from there and builds
            your plan in the background.
          </p>
        </motion.div>

        <motion.div {...reveal} className="mt-10 flex items-center gap-3">
          <Handoff still={still} />
          {!reduceMotion && (
            <button
              type="button"
              onClick={() => setPaused((value) => !value)}
              className="flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-3 text-small font-medium text-ink-muted transition-colors hover:bg-surface hover:text-ink"
            >
              <svg aria-hidden viewBox="0 0 16 16" className="size-4">
                {paused ? <path d="M5 3.5v9l7-4.5-7-4.5Z" fill="currentColor" /> : <path d="M5 3.5v9M11 3.5v9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />}
              </svg>
              {paused ? 'Play' : 'Pause'}
              <span className="sr-only"> animations</span>
            </button>
          )}
        </motion.div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <AgentCard agent="asta">
            <div data-ui className="flex flex-col gap-3" aria-label="Example conversation with Asta" role="group">
              <Bubble from="you">I want to get into AI but I'm a backend dev and don't know where to start.</Bubble>
              <Bubble from="asta">Good starting point. How many hours a week can you give this, and do you want to build AI features or train models?</Bubble>
              <Bubble from="you">About 6 hours. Building features.</Bubble>
              <Bubble from="asta">Then AI engineering fits. I'll check your Python and APIs first; you likely skip a lot.</Bubble>
            </div>
          </AgentCard>
          <AgentCard agent="anbu">
            <AnbuPreview still={still} />
          </AgentCard>
        </div>
      </div>
    </section>
  )
}

function AgentCard({ agent, children }: { agent: AgentName; children: ReactNode }) {
  const { name, role } = AGENTS[agent]
  return (
    <motion.article {...reveal} aria-labelledby={`agent-${agent}`} className="flex flex-col rounded-3xl bg-surface p-5 sm:p-7">
      <header className="flex items-center gap-3">
        <AgentAvatar agent={agent} className="size-11" />
        <div>
          <h3 id={`agent-${agent}`} className="font-display text-title font-semibold">
            {name}
          </h3>
          <p className="text-small text-ink-muted">{role}</p>
        </div>
      </header>
      <div className="mt-6 flex-1">{children}</div>
    </motion.article>
  )
}

function Bubble({ from, children }: { from: 'you' | 'asta'; children: ReactNode }) {
  const isAsta = from === 'asta'
  return (
    <div className={isAsta ? 'flex justify-start' : 'flex justify-end'}>
      <p
        className={
          isAsta
            ? 'max-w-[85%] rounded-2xl rounded-bl-md bg-surface-muted px-4 py-3 text-ink'
            : 'max-w-[85%] rounded-2xl rounded-br-md bg-primary px-4 py-3 text-on-primary'
        }
      >
        <span className="sr-only">{isAsta ? 'Asta: ' : 'You: '}</span>
        {children}
      </p>
    </div>
  )
}

/** A goal card drifting from Asta to Anbu, on a slow loop. Decorative; the paragraph above says the same thing. */
function Handoff({ still }: { still: boolean }) {
  const chip = (
    <span className="flex items-center gap-2 rounded-xl bg-surface px-3 py-2 text-small whitespace-nowrap text-ink">
      <span className="gap-stripes h-2 w-5 rounded-full" />
      Goal: AI engineer
    </span>
  )

  return (
    <div aria-hidden className="flex flex-1 items-center gap-3 sm:gap-4">
      <span className="flex shrink-0 items-center gap-2 text-small font-medium text-ink">
        <AgentAvatar agent="asta" className="size-8" />
        <span className="hidden sm:inline">{AGENTS.asta.name}</span>
      </span>
      <div className="relative flex h-12 flex-1 items-center">
        <span className="absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 rounded-full border-t-2 border-dotted border-primary/40" />
        {still ? (
          <span className="relative mx-auto">{chip}</span>
        ) : (
          <motion.span
            className="absolute top-1/2"
            initial={{ left: '0%', x: '0%', y: '-50%', opacity: 0 }}
            animate={{ left: ['0%', '0%', '100%', '100%'], x: ['0%', '0%', '-100%', '-100%'], opacity: [0, 1, 1, 0] }}
            transition={{ duration: 4, times: [0, 0.15, 0.85, 1], ease: 'easeInOut', repeat: Infinity, repeatDelay: 1.5 }}
          >
            {chip}
          </motion.span>
        )}
      </div>
      <span className="flex shrink-0 items-center gap-2 text-small font-medium text-ink">
        <span className="hidden sm:inline">{AGENTS.anbu.name}</span>
        <AgentAvatar agent="anbu" className="size-8" />
      </span>
    </div>
  )
}

/** Anbu's working steps on a gentle loop, paused off-screen. When still (paused or reduced motion) it shows the finished list. */
function AnbuPreview({ still }: { still: boolean }) {
  const box = useRef<HTMLOListElement>(null)
  const inView = useInView(box, { margin: '-80px' })
  // One extra beat past the last step shows everything done before the loop restarts.
  const [tick, setTick] = useState(0)
  const animate = inView && !still
  const current = still ? ANBU_STEPS.length : tick % (ANBU_STEPS.length + 1)

  useEffect(() => {
    if (!animate) return
    const timer = window.setInterval(() => setTick((value) => value + 1), STEP_MS)
    return () => window.clearInterval(timer)
  }, [animate])

  return (
    <ol ref={box} data-ui aria-label="Example of Anbu building a plan" className="flex flex-col gap-2">
      {ANBU_STEPS.map((step, index) => {
        const state = index < current ? 'done' : index === current ? 'active' : 'waiting'
        return (
          <li
            key={step}
            className={cn(
              'flex items-center gap-3 rounded-2xl px-4 py-3 transition-colors duration-300',
              state === 'active' ? 'bg-surface-muted' : 'bg-transparent',
            )}
          >
            <StepMark state={state} />
            <span className={state === 'waiting' ? 'text-ink-muted' : 'text-ink'}>{step}</span>
            <span className="sr-only">{state === 'done' ? '(done)' : state === 'active' ? '(in progress)' : '(waiting)'}</span>
          </li>
        )
      })}
    </ol>
  )
}

function StepMark({ state }: { state: 'done' | 'active' | 'waiting' }) {
  if (state === 'done') {
    return (
      <span aria-hidden className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-on-primary">
        <svg viewBox="0 0 16 16" className="size-3.5">
          <path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    )
  }
  if (state === 'active') {
    return (
      <span aria-hidden className="relative flex size-6 shrink-0 items-center justify-center">
        <motion.span
          className="absolute inset-0 rounded-full bg-primary/25"
          animate={{ scale: [0.7, 1.15, 0.7] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
        />
        <span className="size-2.5 rounded-full bg-primary" />
      </span>
    )
  }
  return <span aria-hidden className="size-6 shrink-0 rounded-full border-2 border-dotted border-border-strong" />
}
