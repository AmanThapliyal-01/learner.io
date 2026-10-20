import type { SkillGapRow } from '../../shared/ui/SkillGap'
import type { PlanDocument } from './api'

type Phase = PlanDocument['phases'][number]
type Resource = Phase['resources'][number]

const STATUS_NOTE = { skip: 'Skip', refresh: 'Refresh', focus: 'Focus' } as const

/** The plan's skills as skill-gap bars. */
export const skillGapRows = (document: PlanDocument): SkillGapRow[] =>
  document.skills.map((s) => ({ skill: s.skill, current: s.current_level, target: s.target_level, note: STATUS_NOTE[s.status] }))

/** First and last week of phase `index`, counting from week 1. */
export function phaseWeeks(phases: Phase[], index: number) {
  const start = 1 + phases.slice(0, index).reduce((sum, phase) => sum + phase.weeks, 0)
  return { start, end: start + phases[index].weeks - 1 }
}

/**
 * Resources carry no URLs on purpose (a model would invent some), so each one links to a web search for its
 * title instead, and the learner picks the real page.
 */
export const resourceSearchUrl = (resource: Resource) => `https://www.google.com/search?q=${encodeURIComponent(resource.title)}`
