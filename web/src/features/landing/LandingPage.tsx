import type { ReactNode } from 'react'
import { motion } from 'motion/react'

import { ButtonLink } from '../../shared/ui/Button'
import { buttonClass } from '../../shared/ui/buttonStyles'
import { Logo } from '../../shared/ui/Logo'
import { SkillGap, SkillGapLegend } from '../../shared/ui/SkillGap'
import { useMe } from '../auth/api'

const heroGap = [
  { skill: 'SQL', current: 4, target: 4, note: 'Skip' },
  { skill: 'Python for data', current: 3, target: 4, note: 'Refresh · 1 wk' },
  { skill: 'Statistics', current: 1, target: 3, note: 'Focus · 3 wks' },
  { skill: 'Dashboards (Power BI)', current: 0, target: 3, note: 'Focus · 2 wks' },
]

const STEPS = [
  { title: 'Tell Asta your goal', body: 'A role, a skill, a hobby, or "not sure yet". Asta asks a few sharp questions until it\'s clear.' },
  { title: 'Rate yourself', body: 'Say how well you know each skill your goal needs. Honest is fine; it gets checked.' },
  { title: 'Take a short assessment', body: 'A few questions per skill confirm your real level, so the plan starts from fact.' },
  { title: 'Get your plan', body: 'Phases, milestones and resources for the gap only, sized to your hours and budget.' },
]

const YEAR = new Date().getFullYear()

const reveal = {
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-80px' },
  transition: { duration: 0.45, ease: 'easeOut' },
} as const

export function LandingPage() {
  const { data: me } = useMe()

  return (
    <div className="min-h-dvh overflow-x-clip">
      <header className="sticky top-0 z-10 border-b border-transparent bg-bg/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6">
          <Logo />
          <nav aria-label="Sections" className="hidden items-center gap-1 text-[15px] text-ink-muted md:flex">
            <a href="#how" className="rounded-lg px-3 py-2 hover:text-ink">How it works</a>
            <a href="#asta" className="rounded-lg px-3 py-2 hover:text-ink">Meet Asta</a>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            {me ? (
              <ButtonLink to="/dashboard">Open dashboard</ButtonLink>
            ) : (
              <>
                <ButtonLink to="/login" variant="ghost">Log in</ButtonLink>
                <ButtonLink to="/signup">Get started</ButtonLink>
              </>
            )}
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pt-14 pb-20 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:pt-24 lg:pb-28">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: 'easeOut' }}>
            <h1 className="font-display text-5xl leading-[1.04] font-semibold tracking-tight text-balance sm:text-6xl">
              Skip what you know. <span className="text-primary">Learn what you don't.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg text-ink-muted text-pretty">
              Every roadmap online assumes you're starting from zero. learner.io checks where you actually stand, then
              builds a plan around the gap, for the role or skill you want.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink to={me ? '/dashboard' : '/signup'} size="lg">
                {me ? 'Open dashboard' : 'Build my plan'}
              </ButtonLink>
              <a href="#how" className={buttonClass({ variant: 'secondary', size: 'lg' })}>
                See how it works
              </a>
            </div>
          </motion.div>

          <motion.figure
            initial={{ opacity: 0, y: 24, rotate: -1 }}
            animate={{ opacity: 1, y: 0, rotate: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="relative"
          >
            <div aria-hidden className="absolute -inset-6 -z-10 rounded-[2.5rem] bg-primary-soft" />
            <div className="rounded-3xl border border-border bg-surface p-6 shadow-[0_30px_80px_-40px_rgba(20,60,50,0.45)] sm:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-ink-muted">Goal</p>
                  <p className="font-display text-xl font-semibold">Data analyst in 4 months</p>
                </div>
                <span className="shrink-0 rounded-lg bg-surface-muted px-2.5 py-1 text-xs font-medium whitespace-nowrap text-ink-muted">6 hrs / week</span>
              </div>
              <SkillGap rows={heroGap} className="mt-7" delay={0.5} />
              <figcaption className="mt-7 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
                <SkillGapLegend />
                <span className="text-xs text-ink-muted">From an assessment, not a template</span>
              </figcaption>
            </div>
          </motion.figure>
        </section>

        {/* Contrast */}
        <section className="border-y border-border bg-surface">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[1fr_1.4fr] lg:items-start">
            <motion.h2 {...reveal} className="font-display text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
              The same 40 steps for everyone is why most roadmaps get abandoned.
            </motion.h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Comparison
                title="A generic roadmap"
                points={['Starts everyone at step one', 'Re-teaches what you already know', "Ignores how many hours you've got"]}
                muted
              />
              <Comparison
                title="Your learner.io plan"
                points={['Starts from your assessed level', 'Skips what you know, digs into gaps', 'Fits your hours, budget and style']}
              />
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-24 sm:px-6">
          <motion.h2 {...reveal} className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            How it works
          </motion.h2>
          <ol className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, index) => (
              <motion.li key={step.title} {...reveal} transition={{ ...reveal.transition, delay: index * 0.08 }} className="flex flex-col gap-3">
                <span className="flex size-9 items-center justify-center rounded-full bg-primary-soft font-semibold text-primary">
                  {index + 1}
                </span>
                <h3 className="text-lg font-semibold">{step.title}</h3>
                <p className="text-ink-muted">{step.body}</p>
              </motion.li>
            ))}
          </ol>
        </section>

        {/* Meet Asta */}
        <section id="asta" className="scroll-mt-20 bg-primary-soft">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-24 sm:px-6 lg:grid-cols-2">
            <motion.div {...reveal}>
              <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">Meet Asta.</h2>
              <p className="mt-4 max-w-md text-lg text-ink-muted">
                Friendly, never fluffy. Asta asks only what it needs, suggests what's in demand when you're unsure, and
                hands your goal to our planning agent once it's clear.
              </p>
            </motion.div>
            <motion.div {...reveal} className="flex flex-col gap-3" aria-label="Example conversation with Asta">
              <Bubble from="you">I want to get into AI but I'm a backend dev and don't know where to start.</Bubble>
              <Bubble from="asta">Good starting point. Two questions: how many hours a week can you give this, and do you want to build AI features or train models?</Bubble>
              <Bubble from="you">About 6 hours. Building features.</Bubble>
              <Bubble from="asta">Then AI engineering fits. I'll check your Python and APIs first; you likely skip a lot.</Bubble>
            </motion.div>
          </div>
        </section>

        {/* Final call to action */}
        <section className="mx-auto max-w-6xl px-4 py-24 text-center sm:px-6">
          <motion.h2 {...reveal} className="mx-auto max-w-2xl font-display text-3xl font-semibold tracking-tight text-balance sm:text-5xl">
            Your next skill, minus the parts you already know.
          </motion.h2>
          <motion.div {...reveal} className="mt-8">
            <ButtonLink to={me ? '/dashboard' : '/signup'} size="lg">
              {me ? 'Open dashboard' : 'Build my plan'}
            </ButtonLink>
          </motion.div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-8 text-sm text-ink-muted sm:px-6">
          <Logo />
          <p>© {YEAR} learner.io</p>
        </div>
      </footer>
    </div>
  )
}

function Comparison({ title, points, muted }: { title: string; points: string[]; muted?: boolean }) {
  return (
    <motion.div {...reveal} className={muted ? 'rounded-2xl bg-surface-muted p-6' : 'rounded-2xl border-2 border-primary bg-surface p-6'}>
      <h3 className={muted ? 'font-semibold text-ink-muted' : 'font-semibold text-primary'}>{title}</h3>
      <ul className="mt-4 flex flex-col gap-3">
        {points.map((point) => (
          <li key={point} className="flex gap-3">
            <span aria-hidden className={muted ? 'mt-0.5 text-ink-muted' : 'mt-0.5 text-primary'}>
              {muted ? '–' : '✓'}
            </span>
            <span className={muted ? 'text-ink-muted' : 'text-ink'}>{point}</span>
          </li>
        ))}
      </ul>
    </motion.div>
  )
}

function Bubble({ from, children }: { from: 'you' | 'asta'; children: ReactNode }) {
  const isAsta = from === 'asta'
  return (
    <div className={isAsta ? 'flex justify-start' : 'flex justify-end'}>
      <p
        className={
          isAsta
            ? 'max-w-[85%] rounded-2xl rounded-bl-md bg-surface px-4 py-3 text-ink shadow-sm'
            : 'max-w-[85%] rounded-2xl rounded-br-md bg-primary px-4 py-3 text-on-primary'
        }
      >
        <span className="sr-only">{isAsta ? 'Asta: ' : 'You: '}</span>
        {children}
      </p>
    </div>
  )
}
