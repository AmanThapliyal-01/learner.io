import { forwardRef, useImperativeHandle, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'

import { cn } from '../../shared/ui/cn'

const MAX_LENGTH = 4000

export interface ComposerHandle {
  focus: (placeholder?: string) => void
  setText: (text: string) => void
}

interface ComposerProps {
  disabled?: boolean
  /** Starting text the user can edit before sending (e.g. a draft carried over from the landing demo). */
  initialText?: string
  onSend: (text: string) => void
}

/** Message box: Enter sends, Shift+Enter adds a line, grows up to six lines. */
export const Composer = forwardRef<ComposerHandle, ComposerProps>(function Composer({ disabled, initialText = '', onSend }, ref) {
  const [text, setText] = useState(initialText)
  const [placeholder, setPlaceholder] = useState('Message Asta…')
  const input = useRef<HTMLTextAreaElement>(null)

  useImperativeHandle(ref, () => ({
    focus: (hint) => {
      if (hint) setPlaceholder(hint)
      input.current?.focus()
    },
    setText,
  }))

  const submit = (event?: FormEvent) => {
    event?.preventDefault()
    const message = text.trim()
    if (!message || disabled) return
    onSend(message)
    setText('')
    setPlaceholder('Message Asta…')
  }

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault()
      submit()
    }
  }

  const canSend = text.trim().length > 0 && !disabled

  return (
    <form onSubmit={submit} className="flex items-end gap-2 rounded-2xl border border-border-strong bg-surface p-2 transition-shadow focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/15">
      <label htmlFor="asta-composer" className="sr-only">
        Message Asta
      </label>
      <textarea
        id="asta-composer"
        ref={input}
        rows={1}
        value={text}
        maxLength={MAX_LENGTH}
        placeholder={placeholder}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={onKeyDown}
        className="field-sizing-content max-h-40 min-h-11 flex-1 resize-none bg-transparent px-2.5 py-2.5 text-[15px] leading-relaxed text-ink placeholder:text-ink-muted focus:outline-none"
      />
      <button
        type="submit"
        disabled={!canSend}
        aria-label="Send message"
        className={cn(
          'flex size-11 shrink-0 items-center justify-center rounded-xl transition-colors',
          canSend ? 'bg-primary text-on-primary hover:bg-primary-hover' : 'bg-surface-muted text-ink-muted',
        )}
      >
        <svg aria-hidden viewBox="0 0 20 20" className="size-5">
          <path d="M10 15V5M5 10l5-5 5 5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </form>
  )
})
