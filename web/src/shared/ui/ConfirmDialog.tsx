import { useEffect, useId, useRef, type ReactNode } from 'react'

import { Alert } from './Alert'
import { Button } from './Button'

interface ConfirmDialogProps {
  open: boolean
  title: string
  children: ReactNode
  confirmLabel: string
  onConfirm: () => void
  onCancel: () => void
  busy?: boolean
  error?: string
}

/**
 * Native modal dialog for destructive, irreversible actions: focus is trapped, Escape cancels, and Cancel is
 * focused first so Enter never destroys anything by accident.
 */
export function ConfirmDialog({ open, title, children, confirmLabel, onConfirm, onCancel, busy, error }: ConfirmDialogProps) {
  const dialog = useRef<HTMLDialogElement>(null)
  const cancel = useRef<HTMLButtonElement>(null)
  const titleId = useId()

  useEffect(() => {
    const element = dialog.current
    if (!element) return
    if (open && !element.open) {
      element.showModal()
      cancel.current?.focus()
    } else if (!open && element.open) {
      element.close()
    }
  }, [open])

  return (
    <dialog
      ref={dialog}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault()
        if (!busy) onCancel()
      }}
      className="motion-dialog m-auto w-[min(28rem,calc(100vw-2rem))] rounded-2xl border border-border bg-surface p-6 text-ink shadow-xl backdrop:bg-black/40 backdrop:backdrop-blur-[2px]"
    >
      <h2 id={titleId} className="font-display text-title font-semibold">
        {title}
      </h2>
      <div className="mt-2 text-ink-muted">{children}</div>
      <div className="mt-4">
        <Alert>{error}</Alert>
      </div>
      <div className="mt-6 flex flex-wrap justify-end gap-2">
        <Button ref={cancel} variant="secondary" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        <Button variant="danger" loading={busy} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </dialog>
  )
}
