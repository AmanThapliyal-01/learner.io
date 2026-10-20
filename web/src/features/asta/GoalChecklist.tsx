import { ChoiceCheck } from '../../shared/ui/Choice'
import { cn } from '../../shared/ui/cn'
import type { ChecklistItem } from './api'

/**
 * What the goal card still needs, so the conversation has a visible end: Asta shows the card once every item is
 * done. Phones get the count and the next item; wider screens list them all.
 */
export function GoalChecklist({ items }: { items: ChecklistItem[] }) {
  const done = items.filter((item) => item.done).length
  const next = items.find((item) => !item.done)

  return (
    <section aria-label="Goal so far" className="border-b border-border bg-surface px-5 py-2.5">
      <p className="text-sm text-ink-muted">
        <span className="font-medium text-ink">
          Goal so far: {done} of {items.length}
        </span>
        {next && <span className="sm:hidden"> · Next: {next.label}</span>}
        {!next && <span> · Your goal card is ready</span>}
      </p>
      <ul className="mt-2 hidden flex-wrap gap-1.5 sm:flex">
        {items.map((item) => (
          <li
            key={item.label}
            className={cn(
              'flex items-center gap-1 rounded-lg px-2 py-0.5 text-sm',
              item.done ? 'bg-primary-soft text-primary' : 'border border-dashed border-border-strong text-ink-muted',
            )}
          >
            {item.done ? (
              <ChoiceCheck className="size-3.5" />
            ) : (
              <span aria-hidden className="size-2 rounded-full border border-current" />
            )}
            {item.label}
            <span className="sr-only">{item.done ? ', done' : ', still needed'}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
