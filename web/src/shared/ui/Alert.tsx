import type { ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'

import { EASE_OUT, EXIT } from './motion'
import { cn } from './cn'

const tones = {
  danger: 'border-danger/30 bg-danger/8 text-danger',
  warning: 'border-warning/30 bg-warning-soft text-warning',
  info: 'border-primary/25 bg-primary-soft text-primary',
}

/** Inline, animated message for a form or section. Renders nothing when there is no message. */
export function Alert({ tone = 'danger', children }: { tone?: keyof typeof tones; children?: ReactNode }) {
  return (
    <AnimatePresence initial={false}>
      {children && (
        <motion.div
          role={tone === 'danger' ? 'alert' : 'status'}
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0, transition: EXIT }}
          transition={{ duration: 0.2, ease: EASE_OUT }}
          className="overflow-hidden"
        >
          <div className={cn('rounded-xl border px-4 py-3 text-small', tones[tone])}>{children}</div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
