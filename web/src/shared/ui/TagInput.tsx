import { useState, type KeyboardEvent } from 'react'
import { AnimatePresence, motion } from 'motion/react'

import { FieldShell, inputClass } from './Field'
import { cn } from './cn'
import { EASE_OUT, EXIT } from './motion'

interface TagInputProps {
  label: string
  value: string[]
  onChange: (value: string[]) => void
  placeholder?: string
  hint?: string
  error?: string
  optional?: boolean
  max?: number
}

/** Free-form list entry: type and press Enter or comma to add; Backspace on empty removes the last tag. */
export function TagInput({ label, value, onChange, placeholder, hint, error, optional, max = 30 }: TagInputProps) {
  const [draft, setDraft] = useState('')

  /** Adds each new, non-empty tag once (case-insensitive), up to the max. */
  const addAll = (raw: string[]) => {
    const next = [...value]
    for (const tag of raw.map((part) => part.trim()).filter(Boolean)) {
      if (next.length >= max) break
      if (!next.some((existing) => existing.toLowerCase() === tag.toLowerCase())) next.push(tag)
    }
    if (next.length !== value.length) onChange(next)
  }

  const add = (raw: string) => {
    addAll([raw])
    setDraft('')
  }

  // Commas split tags however they arrive: typed, pasted ("SQL, Python") or autofilled.
  const onDraftChange = (text: string) => {
    if (!text.includes(',')) return setDraft(text)
    const parts = text.split(',')
    const rest = parts.pop() ?? ''
    addAll(parts)
    setDraft(rest.trimStart())
  }

  const remove = (tag: string) => onChange(value.filter((existing) => existing !== tag))

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      add(draft)
    } else if (event.key === 'Backspace' && !draft && value.length > 0) {
      remove(value[value.length - 1])
    }
  }

  return (
    <FieldShell label={label} hint={hint ?? 'Press Enter or comma to add.'} error={error} optional={optional}>
      {(aria) => (
        <div
          className={cn(
            inputClass,
            'flex min-h-11 flex-wrap items-center gap-1.5 py-1.5 focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/15',
          )}
          aria-invalid={aria['aria-invalid']}
        >
          <ul className="contents" aria-label={`${label} added`}>
            <AnimatePresence initial={false}>
              {value.map((tag) => (
                <motion.li
                  key={tag}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9, transition: EXIT }}
                  transition={{ duration: 0.15, ease: EASE_OUT }}
                  className="flex items-center gap-1 rounded-lg bg-primary-soft py-1 pr-1 pl-2.5 text-small text-primary"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => remove(tag)}
                    aria-label={`Remove ${tag}`}
                    // 28px visible (the HIG minimum), widened to a 44px touch target by the invisible ::after.
                    className="relative flex size-7 items-center justify-center rounded-md after:absolute after:-inset-2 after:content-[''] hover:bg-primary/15"
                  >
                    <svg aria-hidden viewBox="0 0 16 16" className="size-3.5">
                      <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
                    </svg>
                  </button>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
          <input
            {...aria}
            value={draft}
            onChange={(event) => onDraftChange(event.target.value)}
            onKeyDown={onKeyDown}
            onBlur={() => add(draft)}
            placeholder={value.length === 0 ? placeholder : undefined}
            disabled={value.length >= max}
            className="min-w-32 flex-1 bg-transparent py-1 text-body text-ink placeholder:text-ink-muted focus:outline-none"
          />
        </div>
      )}
    </FieldShell>
  )
}
