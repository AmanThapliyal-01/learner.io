import { Link } from 'react-router'

import { cn } from './cn'

/** Wordmark with a sprout-like mark: a known base and a growing tip, the product in one glyph. */
export function Logo({ to = '/', className }: { to?: string; className?: string }) {
  return (
    <Link to={to} className={cn('inline-flex items-center gap-2 rounded-lg', className)} aria-label="learner.io home">
      <svg aria-hidden viewBox="0 0 28 28" className="size-7">
        <rect width="28" height="28" rx="8" className="fill-primary" />
        <path d="M8 19h12" className="stroke-on-primary" strokeWidth="2.25" strokeLinecap="round" />
        <path d="M14 19v-6" className="stroke-on-primary" strokeWidth="2.25" strokeLinecap="round" />
        <path d="M14 13c0-2.8 2.2-5 5-5 0 2.8-2.2 5-5 5Z" className="fill-on-primary" />
        <path d="M14 14.5c0-2.2-1.8-4-4-4 0 2.2 1.8 4 4 4Z" className="fill-on-primary/70" />
      </svg>
      <span className="font-display text-lg font-semibold tracking-tight text-ink">
        learner<span className="text-primary">.io</span>
      </span>
    </Link>
  )
}
