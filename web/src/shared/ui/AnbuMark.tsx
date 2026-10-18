import { cn } from './cn'

/**
 * Anbu's glyph, a sibling of SproutMark: a seed whose roots trace a dotted route to a leaf (the goal).
 * A soft tile instead of a solid one, so Anbu reads as the quiet background partner to Asta.
 */
export function AnbuMark({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 28 28" className={cn('size-7', className)}>
      <rect width="28" height="28" rx="8" className="fill-primary-soft" />
      <rect x="0.75" y="0.75" width="26.5" height="26.5" rx="7.25" fill="none" className="stroke-primary/30" strokeWidth="1" />
      <ellipse cx="8.5" cy="19.5" rx="3.4" ry="2.5" transform="rotate(-32 8.5 19.5)" className="fill-primary" />
      <path
        d="M13.2 16.4c1.9-1 2.6-2.9 4.2-3.9 1.2-.7 2.2-.8 3-.9"
        fill="none"
        className="stroke-primary"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeDasharray="0.01 3.3"
      />
      <path d="M19.5 10.5c0-2.5 2-4.5 4.5-4.5 0 2.5-2 4.5-4.5 4.5Z" className="fill-primary" />
    </svg>
  )
}
