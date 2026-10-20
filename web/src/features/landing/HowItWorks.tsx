import { useRef } from 'react'
import { motion, useInView, useReducedMotion } from 'motion/react'

import { reveal } from './reveal'

const STEPS = [
  { title: 'Tell Asta your goal', body: 'A role, a skill, a hobby, or "not sure yet". Asta asks a few sharp questions until it\'s clear.' },
  { title: 'Rate yourself', body: 'Say how well you know each skill your goal needs. Honest is fine; it gets checked.' },
  { title: 'Take a short assessment', body: 'A few questions per skill confirm your real level, so the plan starts from fact.' },
  { title: 'Get your plan', body: 'Phases, milestones and resources for the gap only, sized to your hours and budget.' },
]

/** When stone i fills, once the section is in view. The trail reaches it at the same moment. */
const FILL_START = 0.3
const FILL_STEP = 0.45
const fillDelay = (index: number) => FILL_START + index * FILL_STEP

/**
 * "How it works" on one screen: a large stepping-stone path (the gap-path illustration's language: hatched stones
 * are still ahead, solid ones are done) with each step set beside its stone. Order comes from the path, not numbers.
 * As the section comes into view the stones fill in turn and the sprout grows; with reduced motion it starts drawn.
 */
export function HowItWorks() {
  const reduceMotion = useReducedMotion() ?? false
  const stage = useRef<HTMLDivElement>(null)
  const inView = useInView(stage, { once: true, margin: '0px 0px -25% 0px' })
  const drawn = reduceMotion || inView

  return (
    <section id="how" aria-labelledby="how-title" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-24 sm:px-6 lg:py-32">
      <motion.h2 id="how-title" {...reveal} className="font-display text-heading font-semibold tracking-tight">
        How it works
      </motion.h2>

      <div ref={stage} className="mt-10 grid lg:mt-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16">
        <div aria-hidden className="hidden lg:block">
          <StonePath drawn={drawn} instant={reduceMotion} />
        </div>

        {/* Desktop: one row per stone, so each step sits level with it. Phones: a small stone per step on a rail. */}
        <ol className="flex flex-col gap-8 lg:grid lg:h-[32rem] lg:grid-rows-4 lg:gap-0">
          {STEPS.map((step, index) => (
            <li key={step.title} className="relative flex gap-5 lg:items-center">
              <span aria-hidden className="relative flex w-12 shrink-0 items-start justify-center pt-0.5 lg:hidden">
                {index < STEPS.length - 1 && (
                  <span className="absolute top-8 -bottom-10 border-l-2 border-dotted border-border-strong" />
                )}
                <RailStone index={index} drawn={drawn} instant={reduceMotion} />
              </span>
              <div className="max-w-md">
                <h3 className="font-display text-title font-semibold">{step.title}</h3>
                <p className="mt-1 text-ink-muted">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

interface DrawProps {
  /** The section has come into view (or motion is reduced): show the filled state. */
  drawn: boolean
  /** Skip the animation and show the end state at once. */
  instant: boolean
}

function fillTransition(index: number, instant: boolean) {
  return instant ? { duration: 0 } : { delay: fillDelay(index), duration: 0.35, ease: 'easeOut' as const }
}

function RailStone({ index, drawn, instant }: DrawProps & { index: number }) {
  return (
    <svg viewBox="0 0 48 30" className="relative w-12 overflow-visible">
      <HatchPattern id={`rail-hatch-${index}`} />
      <ellipse cx="24" cy="15" rx="22" ry="13" fill={`url(#rail-hatch-${index})`} className="stroke-ink" strokeWidth="2" />
      <motion.ellipse
        cx="24"
        cy="15"
        rx="22"
        ry="13"
        className="fill-primary stroke-ink"
        strokeWidth="2"
        initial={false}
        animate={{ opacity: drawn ? 1 : 0 }}
        transition={fillTransition(index, instant)}
      />
    </svg>
  )
}

/**
 * The path, drawn on a 480 × 512 grid: four rows of 128, one stone centred in each, zig-zagging to a sprout (the
 * goal) beside the last stone. The step list uses the same four rows, so text and stones line up.
 */
const ROW = 128
const STONES = [
  { cx: 140, cy: ROW * 0.5, rx: 96, ry: 40 },
  { cx: 318, cy: ROW * 1.5, rx: 90, ry: 37 },
  { cx: 150, cy: ROW * 2.5, rx: 84, ry: 35 },
  { cx: 300, cy: ROW * 3.5, rx: 78, ry: 33 },
]
const TRAIL = 'M140 64C240 92 330 130 318 192S150 256 150 320S300 380 300 448S392 470 430 458'

function StonePath({ drawn, instant }: DrawProps) {
  const total = fillDelay(STONES.length - 1)
  return (
    <svg viewBox="0 0 480 512" className="h-[32rem] w-full overflow-visible">
      <HatchPattern id="story-hatch" />
      <path d={TRAIL} fill="none" className="stroke-border-strong" strokeWidth="3" strokeLinecap="round" strokeDasharray="0.1 12" />
      <motion.path
        d={TRAIL}
        fill="none"
        className="stroke-primary"
        strokeWidth="4"
        strokeLinecap="round"
        initial={false}
        animate={{ pathLength: drawn ? 1 : 0 }}
        transition={instant ? { duration: 0 } : { delay: FILL_START, duration: total, ease: 'linear' }}
      />
      {STONES.map((stone, index) => (
        <motion.g
          key={index}
          initial={false}
          animate={{ y: drawn ? -4 : 0 }}
          transition={fillTransition(index, instant)}
        >
          <ellipse {...stone} fill="url(#story-hatch)" className="stroke-ink" strokeWidth="3" />
          <motion.ellipse
            {...stone}
            className="fill-primary stroke-ink"
            strokeWidth="3"
            initial={false}
            animate={{ opacity: drawn ? 1 : 0 }}
            transition={fillTransition(index, instant)}
          />
        </motion.g>
      ))}
      {/* The goal: a sprout that grows once the last step is reached. */}
      <ellipse cx="438" cy="462" rx="30" ry="8" className="fill-border-strong" />
      <motion.g
        style={{ originX: '438px', originY: '458px' }}
        initial={false}
        animate={{ scale: drawn ? 1 : 0, opacity: drawn ? 1 : 0 }}
        transition={instant ? { duration: 0 } : { delay: total + 0.3, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <path d="M438 458C438 440 438 428 438 416" fill="none" className="stroke-ink" strokeWidth="3.5" strokeLinecap="round" />
        <path d="M437 434C420 412 396 408 383 414C392 436 416 444 437 434Z" className="fill-primary-soft stroke-ink" strokeWidth="3" strokeLinejoin="round" />
        <path d="M439 426C453 400 479 392 495 398C488 423 463 436 439 426Z" className="fill-primary stroke-ink" strokeWidth="3" strokeLinejoin="round" />
      </motion.g>
    </svg>
  )
}

function HatchPattern({ id }: { id: string }) {
  return (
    <defs>
      <pattern id={id} width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)">
        <rect width="8" height="8" className="fill-surface" />
        <line x1="0" y1="0" x2="0" y2="8" className="stroke-primary" strokeWidth="2.5" />
      </pattern>
    </defs>
  )
}
