import type { ReactNode } from 'react'
import { motion } from 'motion/react'

import { Logo } from '../../shared/ui/Logo'
import { SkillGap, SkillGapLegend } from '../../shared/ui/SkillGap'

const sampleGap = [
  { skill: 'Python', current: 4, target: 4, note: 'Skip' },
  { skill: 'Prompt design', current: 2, target: 4, note: 'Focus · 2 wks' },
  { skill: 'LangGraph agents', current: 1, target: 4, note: 'Focus · 4 wks' },
]

/** Split layout: the form on the left, the product's idea on the right (wide screens only). */
export function AuthLayout({ title, subtitle, children, footer }: { title: string; subtitle: string; children: ReactNode; footer: ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_minmax(0,560px)]">
      <main className="flex flex-col px-4 py-6 sm:px-8">
        <Logo />
        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-sm">
            <h1 className="font-display text-heading font-semibold tracking-tight text-ink">{title}</h1>
            <p className="mt-2 text-ink-muted">{subtitle}</p>
            <div className="mt-8 flex flex-col gap-5">{children}</div>
            <p className="mt-8 text-center text-small text-ink-muted">{footer}</p>
          </div>
        </div>
      </main>

      <aside className="relative hidden overflow-hidden bg-primary-soft lg:flex lg:items-center lg:justify-center lg:p-12">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="w-full max-w-md rounded-3xl border border-border bg-surface p-7 shadow-[0_24px_60px_-28px_rgba(20,60,50,0.35)]"
        >
          <p className="text-small font-medium text-ink-muted">Goal · AI engineer</p>
          <p className="mt-1 font-display text-title font-semibold text-ink">Your plan skips what you know.</p>
          <SkillGap rows={sampleGap} className="mt-6" delay={0.3} />
          <div className="mt-6 border-t border-border pt-4">
            <SkillGapLegend />
          </div>
        </motion.div>
      </aside>
    </div>
  )
}
