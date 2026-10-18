import type { AgentName } from './agents'
import { AnbuMark } from './AnbuMark'
import { cn } from './cn'
import { SproutMark } from './SproutMark'

/** Decorative: the agent's name is always in the text next to it. */
export function AgentAvatar({ agent, className }: { agent: AgentName; className?: string }) {
  const Mark = agent === 'asta' ? SproutMark : AnbuMark
  return (
    <span aria-hidden className={cn('inline-flex shrink-0', className)}>
      <Mark className="size-full" />
    </span>
  )
}
