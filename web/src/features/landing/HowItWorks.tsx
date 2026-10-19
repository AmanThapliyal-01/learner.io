import { useRef } from 'react'
import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from 'motion/react'

import { reveal } from './reveal'

const STEPS = [
  { title: 'Tell Asta your goal', body: 'A role, a skill, a hobby, or "not sure yet". Asta asks a few sharp questions until it\'s clear.' },
  { title: 'Rate yourself', body: 'Say how well you know each skill your goal needs. Honest is fine; it gets checked.' },
  { title: 'Take a short assessment', body: 'A few questions per skill confirm your real level, so the plan starts from fact.' },
  { title: 'Get your plan', body: 'Phases, milestones and resources for the gap only, sized to your hours and budget.' },
]

/** Step i is reached once the scroll progress passes i / steps; its stone fills over the next few percent. */
const reachedAt = (index: number) => [index / STEPS.length, index / STEPS.length + 0.06]

/**
 * "How it works" as a scroll story: the steps scroll past a sticky stepping-stone path (the gap-path illustration's
 * language: hatched stones are still ahead, solid ones are done). With reduced motion it's a plain list.
 */
export function HowItWorks() {
  const reduceMotion = useReducedMotion()

  return (
    <section id="how" aria-labelledby="how-title" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-24 sm:px-6">
      <motion.h2 id="how-title" {...reveal} className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
        How it works
      </motion.h2>
      {reduceMotion ? <StaticSteps /> : <ScrollStory />}
    </section>
  )
}

function StaticSteps() {
  return (
    <ol className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {STEPS.map((step, index) => (
        <li key={step.title} className="flex flex-col gap-3">
          <span className="flex size-9 items-center justify-center rounded-full bg-primary-soft font-semibold text-primary">{index + 1}</span>
          <h3 className="text-lg font-semibold">{step.title}</h3>
          <p className="text-ink-muted">{step.body}</p>
        </li>
      ))}
    </ol>
  )
}

function ScrollStory() {
  const list = useRef<HTMLOListElement>(null)
  // 0 when the first step reaches the lower third of the screen, 1 when the last one has.
  const { scrollYProgress } = useScroll({ target: list, offset: ['start 0.7', 'end 0.7'] })

  return (
    <div className="mt-6 grid gap-x-16 lg:mt-0 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <div aria-hidden className="hidden lg:block">
        <div className="sticky top-16 flex h-[calc(100dvh-4rem)] max-h-[44rem] items-center justify-center">
          <StonePath progress={scrollYProgress} />
        </div>
      </div>

      <ol ref={list} className="flex flex-col">
        {STEPS.map((step, index) => (
          <li key={step.title} className="relative flex gap-5 py-8 lg:min-h-[60dvh] lg:items-center lg:py-0">
            {/* Small screens: a stone per step on a rail, filling as you scroll. */}
            <span aria-hidden className="relative flex w-10 shrink-0 justify-center pt-1 lg:hidden">
              {index < STEPS.length - 1 && <span className="absolute top-8 -bottom-10 w-0.5 rounded-full bg-border" />}
              <RailStone progress={scrollYProgress} index={index} />
            </span>
            <div className="max-w-md">
              <StepNumber progress={scrollYProgress} index={index} />
              <h3 className="mt-3 font-display text-2xl font-semibold tracking-tight">{step.title}</h3>
              <p className="mt-2 text-lg text-ink-muted">{step.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}

function StepNumber({ progress, index }: { progress: MotionValue<number>; index: number }) {
  const fill = useTransform(progress, reachedAt(index), [0, 1])
  return (
    <span className="relative hidden size-9 items-center justify-center rounded-full bg-primary-soft font-semibold text-primary lg:flex">
      <motion.span aria-hidden style={{ opacity: fill }} className="absolute inset-0 rounded-full bg-primary" />
      <span className="sr-only">Step </span>
      <span className="relative">{index + 1}</span>
      <motion.span aria-hidden style={{ opacity: fill }} className="absolute inset-0 flex items-center justify-center text-on-primary">
        {index + 1}
      </motion.span>
    </span>
  )
}

function RailStone({ progress, index }: { progress: MotionValue<number>; index: number }) {
  const fill = useTransform(progress, reachedAt(index), [0, 1])
  return (
    <svg viewBox="0 0 40 26" className="relative size-10 overflow-visible">
      {/* A lighter hatch than the big path, so the step number on top stays readable. */}
      <HatchPattern id={`rail-hatch-${index}`} lineClassName="stroke-primary/30" />
      <ellipse cx="20" cy="13" rx="18" ry="11" fill={`url(#rail-hatch-${index})`} className="stroke-ink" strokeWidth="1.5" />
      <motion.ellipse cx="20" cy="13" rx="18" ry="11" style={{ opacity: fill }} className="fill-primary stroke-ink" strokeWidth="1.5" />
      <text x="20" y="17.5" textAnchor="middle" className="fill-ink text-[12px] font-semibold">
        {index + 1}
      </text>
      <motion.text x="20" y="17.5" textAnchor="middle" style={{ opacity: fill }} className="fill-on-primary text-[12px] font-semibold">
        {index + 1}
      </motion.text>
    </svg>
  )
}

/** One stone per step, zig-zagging down to a sprout: the goal. */
const STONES = [
  { cx: 120, cy: 70, rx: 84, ry: 36 },
  { cx: 250, cy: 190, rx: 76, ry: 33 },
  { cx: 120, cy: 310, rx: 70, ry: 30 },
  { cx: 240, cy: 425, rx: 64, ry: 27 },
]
const TRAIL = 'M120 70C200 110 260 140 250 190S110 260 120 310S250 380 240 425S150 500 150 528'

function StonePath({ progress }: { progress: MotionValue<number> }) {
  const trail = useTransform(progress, [0, 1], [0, 1])
  const grow = useTransform(progress, [0.92, 1], [0, 1])
  return (
    <svg viewBox="0 0 360 580" className="h-full max-h-[34rem] w-auto overflow-visible">
      <HatchPattern id="story-hatch" />
      <path d={TRAIL} fill="none" className="stroke-border-strong" strokeWidth="3" strokeLinecap="round" strokeDasharray="0.1 12" />
      <motion.path d={TRAIL} fill="none" style={{ pathLength: trail }} className="stroke-primary" strokeWidth="4" strokeLinecap="round" />
      {STONES.map((stone, index) => (
        <Stone key={index} stone={stone} progress={progress} index={index} />
      ))}
      {/* The goal: a sprout that grows once the last step is reached. */}
      <ellipse cx="150" cy="540" rx="34" ry="9" className="fill-ink" />
      <motion.g style={{ scale: grow, opacity: grow, originX: '150px', originY: '536px' }}>
        <path d="M150 536C150 518 150 506 150 494" fill="none" className="stroke-ink" strokeWidth="3.5" strokeLinecap="round" />
        <path d="M149 512C132 490 108 486 95 492C104 514 128 522 149 512Z" className="fill-primary-soft stroke-ink" strokeWidth="3" strokeLinejoin="round" />
        <path d="M151 504C165 478 191 470 207 476C200 501 175 514 151 504Z" className="fill-primary stroke-ink" strokeWidth="3" strokeLinejoin="round" />
      </motion.g>
    </svg>
  )
}

function Stone({ stone, progress, index }: { stone: (typeof STONES)[number]; progress: MotionValue<number>; index: number }) {
  const fill = useTransform(progress, reachedAt(index), [0, 1])
  const lift = useTransform(fill, [0, 1], [0, -4])
  return (
    <motion.g style={{ y: lift }}>
      <ellipse {...stone} fill="url(#story-hatch)" className="stroke-ink" strokeWidth="3" />
      <motion.ellipse {...stone} style={{ opacity: fill }} className="fill-primary stroke-ink" strokeWidth="3" />
    </motion.g>
  )
}

function HatchPattern({ id, lineClassName = 'stroke-primary' }: { id: string; lineClassName?: string }) {
  return (
    <defs>
      <pattern id={id} width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)">
        <rect width="8" height="8" className="fill-surface" />
        <line x1="0" y1="0" x2="0" y2="8" className={lineClassName} strokeWidth="2.5" />
      </pattern>
    </defs>
  )
}
