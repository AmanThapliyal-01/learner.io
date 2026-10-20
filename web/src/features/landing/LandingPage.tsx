import { motion } from 'motion/react'

import { ButtonLink } from '../../shared/ui/Button'
import { buttonClass } from '../../shared/ui/buttonStyles'
import { Logo } from '../../shared/ui/Logo'
import { useMe } from '../auth/api'
import { GapDemo } from './GapDemo'
import { HowItWorks } from './HowItWorks'
import { reveal } from './reveal'
import { TeamSection } from './TeamSection'
import { VideoSection } from './VideoSection'

const YEAR = new Date().getFullYear()

export function LandingPage() {
  const { data: me } = useMe()

  return (
    <div className="min-h-dvh overflow-x-clip">
      <header className="sticky top-0 z-10 bg-bg/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6">
          <Logo />
          <nav aria-label="Sections" className="hidden items-center gap-1 text-body text-ink-muted md:flex">
            <a href="#how" className="rounded-lg px-3 py-2 hover:text-ink">How it works</a>
            <a href="#agents" className="rounded-lg px-3 py-2 hover:text-ink">Meet Asta & Anbu</a>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            {me ? (
              <ButtonLink to="/dashboard">Open dashboard</ButtonLink>
            ) : (
              <>
                <ButtonLink to="/login" variant="ghost">Sign in</ButtonLink>
                <ButtonLink to="/signup">Get started</ButtonLink>
              </>
            )}
          </div>
        </div>
      </header>

      <main>
        {/* Hero: the line runs the full width, two lines at every size; the live demo answers it. */}
        <section className="mx-auto grid max-w-6xl gap-x-12 gap-y-10 px-4 pt-12 pb-20 sm:px-6 lg:grid-cols-[1fr_1.1fr] lg:pt-16 lg:pb-28">
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="font-display text-display font-bold lg:col-span-2"
          >
            <span className="block">Skip what you know.</span>
            <span className="block text-primary">Learn what you don't.</span>
          </motion.h1>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.08, ease: 'easeOut' }}
          >
            <p className="max-w-xl text-ink-muted text-pretty sm:text-title">
              Every roadmap online assumes you're starting from zero. learner.io checks where you actually stand, then
              builds a plan around the gap, for the role or skill you want.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink to={me ? '/dashboard' : '/signup'} size="lg">
                {me ? 'Open dashboard' : 'Build my plan'}
              </ButtonLink>
              <a href="#video" className={buttonClass({ variant: 'secondary', size: 'lg' })}>
                See how it works
              </a>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24, rotate: -1 }}
            animate={{ opacity: 1, y: 0, rotate: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="relative"
          >
            <div aria-hidden className="absolute -inset-3 -z-10 rounded-[2.5rem] bg-primary-soft sm:-inset-6" />
            <GapDemo signedIn={Boolean(me)} />
          </motion.div>
        </section>

        <VideoSection />

        {/* Contrast */}
        <section className="bg-surface">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[1fr_1.4fr] lg:items-start">
            <motion.div {...reveal}>
              <h2 className="font-display text-heading font-semibold tracking-tight text-balance">Why most roadmaps get abandoned</h2>
              <p className="mt-4 text-title text-ink-muted">They give everyone the same 40 steps.</p>
            </motion.div>
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

        <HowItWorks />

        <TeamSection />

        {/* Final call to action */}
        <section className="mx-auto max-w-6xl px-4 py-24 text-center sm:px-6">
          <motion.h2 {...reveal} className="mx-auto max-w-2xl font-display text-heading font-semibold tracking-tight text-balance">
            Your next skill, minus the parts you already know.
          </motion.h2>
          <motion.div {...reveal} className="mt-8">
            <ButtonLink to={me ? '/dashboard' : '/signup'} size="lg">
              {me ? 'Open dashboard' : 'Build my plan'}
            </ButtonLink>
          </motion.div>
        </section>
      </main>

      <footer className="bg-surface-muted">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-8 text-small text-ink-muted sm:px-6">
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
            {muted ? (
              <span aria-hidden className="mt-0.5 text-ink-muted">–</span>
            ) : (
              <svg aria-hidden viewBox="0 0 16 16" className="mt-1 size-4 shrink-0 text-primary">
                <path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
            <span className={muted ? 'text-ink-muted' : 'text-ink'}>{point}</span>
          </li>
        ))}
      </ul>
    </motion.div>
  )
}
