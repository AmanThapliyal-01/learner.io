import type { ReactNode } from 'react'
import { motion } from 'motion/react'

import { AgentAvatar } from '../../shared/ui/AgentAvatar'
import { cn } from '../../shared/ui/cn'

/** Renders **bold** inside plain text; everything else stays as typed (line breaks preserved by CSS). */
function withEmphasis(text: string): ReactNode[] {
  return text.split(/(\*\*[^*\n]+\*\*)/g).map((part, index) =>
    part.startsWith('**') && part.endsWith('**') ? <strong key={index}>{part.slice(2, -2)}</strong> : part,
  )
}

export function AstaAvatar() {
  return <AgentAvatar agent="asta" className="mt-0.5 size-8" />
}

interface MessageBubbleProps {
  role: 'user' | 'assistant'
  text: string
  children?: ReactNode
  /** Animate in (new messages only; history renders still). */
  animate?: boolean
}

export function MessageBubble({ role, text, children, animate }: MessageBubbleProps) {
  const isAsta = role === 'assistant'
  return (
    <motion.li
      initial={animate ? { opacity: 0, y: 6 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={cn('flex gap-3', isAsta ? 'justify-start' : 'justify-end')}
    >
      {isAsta && <AstaAvatar />}
      <div className={cn('flex min-w-0 flex-col', isAsta ? 'items-start' : 'items-end')}>
        <span className="sr-only">{isAsta ? 'Asta said:' : 'You said:'}</span>
        {text && (
          <p
            className={cn(
              'max-w-[min(36rem,85vw)] rounded-2xl px-4 py-2.5 leading-relaxed break-words whitespace-pre-wrap',
              isAsta ? 'rounded-tl-md border border-border bg-surface text-ink' : 'rounded-tr-md bg-primary text-on-primary',
            )}
          >
            {withEmphasis(text)}
          </p>
        )}
        {children}
      </div>
    </motion.li>
  )
}

export function TypingIndicator() {
  return (
    <li className="flex gap-3" aria-hidden>
      <AstaAvatar />
      <span className="flex items-center gap-1 rounded-2xl rounded-tl-md border border-border bg-surface px-4 py-3.5">
        {[0, 1, 2].map((dot) => (
          <motion.span
            key={dot}
            className="size-1.5 rounded-full bg-ink-muted"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1, repeat: Infinity, delay: dot * 0.15 }}
          />
        ))}
      </span>
    </li>
  )
}
