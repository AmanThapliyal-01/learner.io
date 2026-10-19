/**
 * Static data for the landing page's "try it" card. Nothing here is sent anywhere: the demo runs in the
 * browser and only becomes a real plan after the user's own skill check.
 */

export interface DemoSkill {
  /** Shown on the bar, e.g. "Python for data". */
  name: string
  /** How it reads mid-sentence in the drafted message to Asta, e.g. "statistics". */
  spoken: string
  /** Level the goal needs, 0–5. */
  target: number
  /** Where the slider starts, 0–5. */
  start: number
}

export interface DemoGoal {
  id: string
  label: string
  /** Opens the drafted message to Asta. */
  intent: string
  hoursPerWeek: number
  /** Rough study hours to move up one level in one skill, before the hours-per-week scaling. */
  hoursPerLevel: number
  skills: DemoSkill[]
}

export const DEMO_GOALS: DemoGoal[] = [
  {
    id: 'data-analyst',
    label: 'Data analyst',
    intent: 'I want to become a data analyst',
    hoursPerWeek: 6,
    hoursPerLevel: 20,
    skills: [
      { name: 'SQL', spoken: 'SQL', target: 4, start: 4 },
      { name: 'Python for data', spoken: 'Python', target: 4, start: 3 },
      { name: 'Statistics', spoken: 'statistics', target: 3, start: 1 },
      { name: 'Dashboards (Power BI)', spoken: 'Power BI', target: 3, start: 0 },
    ],
  },
  {
    id: 'ai-engineer',
    label: 'AI engineer',
    intent: 'I want to become an AI engineer',
    hoursPerWeek: 8,
    hoursPerLevel: 20,
    skills: [
      { name: 'Python', spoken: 'Python', target: 4, start: 3 },
      { name: 'APIs and backend', spoken: 'APIs and backend work', target: 3, start: 3 },
      { name: 'LLM APIs and prompting', spoken: 'LLM APIs', target: 4, start: 1 },
      { name: 'Evals and RAG', spoken: 'evals and RAG', target: 3, start: 0 },
    ],
  },
  {
    id: 'ux-designer',
    label: 'UX designer',
    intent: 'I want to become a UX designer',
    hoursPerWeek: 6,
    hoursPerLevel: 18,
    skills: [
      { name: 'User research', spoken: 'user research', target: 3, start: 1 },
      { name: 'Wireframing', spoken: 'wireframing', target: 4, start: 2 },
      { name: 'Figma', spoken: 'Figma', target: 4, start: 2 },
      { name: 'Visual design', spoken: 'visual design', target: 3, start: 3 },
    ],
  },
  {
    id: 'watercolour',
    label: 'Watercolour painting',
    intent: 'I want to learn watercolour painting',
    hoursPerWeek: 3,
    hoursPerLevel: 10,
    skills: [
      { name: 'Colour mixing', spoken: 'colour mixing', target: 3, start: 1 },
      { name: 'Brush control', spoken: 'brush control', target: 3, start: 2 },
      { name: 'Washes and layering', spoken: 'washes and layering', target: 3, start: 0 },
      { name: 'Composition', spoken: 'composition', target: 3, start: 1 },
    ],
  },
]

export const LEVELS = 5
export const MIN_HOURS = 1
export const MAX_HOURS = 20

/** Plain words for each self-rating, used by the slider's value text. */
export const LEVEL_WORDS = ['New to it', 'Beginner', 'Getting there', 'Comfortable', 'Strong', 'Expert'] as const

export type GapStatus = 'skip' | 'refresh' | 'focus'

/** The planner's own rule (agents planner/graph.py skill_statuses): gap 0 skips, 1 refreshes, 2+ focuses. */
export function gapStatus(current: number, target: number): GapStatus {
  const gap = target - current
  if (gap <= 0) return 'skip'
  return gap === 1 ? 'refresh' : 'focus'
}

export const STATUS_LABEL: Record<GapStatus, string> = { skip: 'Skip', refresh: 'Refresh', focus: 'Focus' }

/**
 * The demo's estimate. Each level of gap costs `hoursPerLevel` study hours; weeks = total hours / hours a week,
 * rounded up. "From zero" applies the same rule to every level the goal needs. Deliberately simple: it's a hook,
 * labelled as an estimate, and the real plan comes from the skill check.
 */
export function estimateWeeks(goal: DemoGoal, levels: number[], hoursPerWeek: number) {
  const weeks = (gapLevels: number) => Math.ceil((gapLevels * goal.hoursPerLevel) / hoursPerWeek)
  const gap = goal.skills.reduce((sum, skill, index) => sum + Math.max(skill.target - (levels[index] ?? 0), 0), 0)
  const fromZero = goal.skills.reduce((sum, skill) => sum + skill.target, 0)
  return { weeks: weeks(gap), fromZero: weeks(fromZero) }
}
