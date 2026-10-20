import { ChoiceCheck } from './Choice'

/**
 * "Saved" shown beside the button that saved, and kept until the next edit (HIG feedback: status near the
 * item it describes; accessibility: avoid feedback that disappears on a timer).
 */
export function SavedNote() {
  return (
    <p role="status" className="flex items-center gap-1.5 text-small font-medium text-success">
      <ChoiceCheck className="text-success" />
      Saved
    </p>
  )
}
