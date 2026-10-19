import { cn } from './cn'

/** The check mark shown on a selected option (see choiceClass). Decorative: the control announces its state. */
export function ChoiceCheck({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 16 16" className={cn('size-4 shrink-0 text-primary', className)}>
      <path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
