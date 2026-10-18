import { useQuery } from '@tanstack/react-query'
import { motion } from 'motion/react'

import { apiFetch } from '../../shared/api/client'

/** M0 placeholder: confirms the SPA → API → database path works. Replaced by the landing page in M1. */
export function HomePage() {
  const health = useQuery({
    queryKey: ['health'],
    queryFn: () => apiFetch<string>('/api/health'),
    refetchInterval: 10_000,
  })

  const status = health.isPending ? 'checking' : health.data === 'Healthy' ? 'healthy' : 'unreachable'
  const dotColor = { checking: 'bg-ink-muted', healthy: 'bg-success', unreachable: 'bg-danger' }[status]

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col items-center justify-center gap-6 px-4 text-center">
      <motion.h1
        className="text-5xl font-semibold tracking-tight"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        learner<span className="text-primary">.io</span>
      </motion.h1>
      <motion.p
        className="text-lg text-ink-muted"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1, ease: 'easeOut' }}
      >
        A learning plan built around what you already know.
      </motion.p>
      <motion.div
        className="flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-sm text-ink-muted"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.25 }}
      >
        <span className={`size-2 rounded-full ${dotColor}`} aria-hidden />
        API: {status}
      </motion.div>
    </main>
  )
}
