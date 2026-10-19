import type { WorkingStep } from '../../shared/ui/WorkingCard'
import type { PlanProgress, PlanStep } from './api'

const ORDER: PlanStep[] = ['reading', 'outlining', 'detailing', 'assembling']

const LABELS: Record<PlanStep, string> = {
  reading: 'Reading your skill check',
  outlining: 'Outlining phases',
  detailing: 'Detailing phases',
  assembling: 'Putting it together',
}

/**
 * Anbu's checklist from the plan's progress: every step up to the last finished one is ticked, the next is active.
 * Phases are detailed in parallel, so the detailing step shows how many are finished, not which one is "current".
 */
export function anbuSteps(progress: PlanProgress | null): WorkingStep[] {
  const detailing = progress?.step === 'detailing' && progress.done < progress.total
  const lastDone = progress ? ORDER.indexOf(progress.step) - (detailing ? 1 : 0) : -1

  return ORDER.map((step, index) => ({
    label: LABELS[step],
    state: index <= lastDone ? 'done' : index === lastDone + 1 ? 'active' : 'pending',
    detail: step === 'detailing' && progress && progress.total > 0 ? `${progress.done} of ${progress.total}` : undefined,
  }))
}
