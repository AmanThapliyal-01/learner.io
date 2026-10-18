import type { DemoGoal } from './demoGoals'

/**
 * Carries the landing demo into Asta: "Build this plan" saves the drafted first message for this tab only,
 * and Asta's composer picks it up once. Storage can be unavailable (private mode, blocked), so every access is
 * guarded and a failure just means no prefill.
 */
const KEY = 'learner.planDraft'

export interface PlanDraft {
  goalId: string
  levels: number[]
  hoursPerWeek: number
  message: string
}

const join = (items: string[]) =>
  items.length <= 1 ? (items[0] ?? '') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`

/** e.g. "I want to become a data analyst, about 6 hrs a week. I'm strong in SQL, okay at Python, new to statistics and Power BI." */
export function draftMessage(goal: DemoGoal, levels: number[], hoursPerWeek: number) {
  const named = (test: (level: number) => boolean) =>
    goal.skills.filter((_, index) => test(levels[index] ?? 0)).map((skill) => skill.spoken)
  const parts = [
    ['strong in', named((level) => level >= 4)],
    ['okay at', named((level) => level === 2 || level === 3)],
    ['new to', named((level) => level <= 1)],
  ] as const
  const standing = parts.filter(([, skills]) => skills.length > 0).map(([words, skills]) => `${words} ${join(skills)}`)
  const hours = `about ${hoursPerWeek} ${hoursPerWeek === 1 ? 'hr' : 'hrs'} a week`
  return `${goal.intent}, ${hours}. I'm ${standing.join(', ')}.`
}

export function savePlanDraft(draft: PlanDraft) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(draft))
  } catch {
    // No storage: the user lands in Asta with an empty composer, which still works.
  }
}

export function readPlanDraft(): PlanDraft | null {
  try {
    const raw = sessionStorage.getItem(KEY)
    if (!raw) return null
    const draft = JSON.parse(raw) as Partial<PlanDraft>
    return typeof draft.message === 'string' && draft.message ? (draft as PlanDraft) : null
  } catch {
    return null
  }
}

export function clearPlanDraft() {
  try {
    sessionStorage.removeItem(KEY)
  } catch {
    // Nothing to clear.
  }
}

/** Where a newly signed-in user goes by default: to Asta when a demo draft is waiting, otherwise the dashboard. */
export function homePath() {
  return readPlanDraft() ? '/asta' : '/dashboard'
}
