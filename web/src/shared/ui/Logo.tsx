import { Link } from 'react-router'

import { cn } from './cn'
import { SproutMark } from './SproutMark'

export function Logo({ to = '/', className }: { to?: string; className?: string }) {
  return (
    <Link to={to} className={cn('inline-flex items-center gap-2 rounded-lg', className)} aria-label="learner.io home">
      <SproutMark />
      <span className="font-display text-lg font-semibold tracking-tight text-ink">
        learner<span className="text-primary">.io</span>
      </span>
    </Link>
  )
}
