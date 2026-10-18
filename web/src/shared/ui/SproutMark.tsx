import { cn } from './cn'

/** The brand glyph: a known base and a growing tip. Used by the logo and Asta's avatar. */
export function SproutMark({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 28 28" className={cn('size-7', className)}>
      <rect width="28" height="28" rx="8" className="fill-primary" />
      <path d="M8 19h12" className="stroke-on-primary" strokeWidth="2.25" strokeLinecap="round" />
      <path d="M14 19v-6" className="stroke-on-primary" strokeWidth="2.25" strokeLinecap="round" />
      <path d="M14 13c0-2.8 2.2-5 5-5 0 2.8-2.2 5-5 5Z" className="fill-on-primary" />
      <path d="M14 14.5c0-2.2-1.8-4-4-4 0 2.2 1.8 4 4 4Z" className="fill-on-primary/70" />
    </svg>
  )
}
