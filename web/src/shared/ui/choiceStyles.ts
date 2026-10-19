import { cn } from './cn'

/**
 * Shared look for "pick one" options (skill ratings, demo goals). Selection is never shown by color alone
 * (HIG accessibility › Vision): the selected option also gets a thicker outline and a check mark (ChoiceCheck).
 */
export function choiceClass(selected: boolean) {
  return cn(
    'rounded-xl border transition-colors',
    selected ? 'border-primary bg-primary-soft ring-1 ring-primary ring-inset' : 'border-border-strong bg-surface hover:bg-surface-muted',
  )
}
