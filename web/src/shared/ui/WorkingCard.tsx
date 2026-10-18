import { motion } from 'motion/react'

import { SproutMark } from './SproutMark'

/** Shown while an agent works: a gently breathing mark, an honest message, no fake progress numbers. */
export function WorkingCard({ title, body }: { title: string; body: string }) {
  return (
    <section
      role="status"
      aria-live="polite"
      className="mx-auto flex max-w-xl flex-col items-center gap-5 rounded-3xl border border-border bg-surface px-6 py-12 text-center"
    >
      <motion.div animate={{ scale: [1, 1.08, 1] }} transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}>
        <SproutMark className="size-12" />
      </motion.div>
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 text-ink-muted">{body}</p>
      </div>
      <div className="h-1 w-40 overflow-hidden rounded-full bg-surface-muted" aria-hidden>
        <motion.div
          className="h-full w-1/3 rounded-full bg-primary"
          animate={{ x: ['-100%', '300%'] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>
    </section>
  )
}
