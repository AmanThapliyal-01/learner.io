import { useId, useState } from 'react'
import { motion } from 'motion/react'
import { useNavigate } from 'react-router'

import { Button } from '../../shared/ui/Button'
import { cn } from '../../shared/ui/cn'
import { SkillGap, SkillGapLegend } from '../../shared/ui/SkillGap'
import {
  DEMO_GOALS,
  estimateWeeks,
  gapStatus,
  LEVEL_WORDS,
  LEVELS,
  MAX_HOURS,
  MIN_HOURS,
  STATUS_LABEL,
  type DemoGoal,
} from './demoGoals'
import { draftMessage, savePlanDraft } from './planDraft'

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`

/**
 * The hero's "try it" card: pick a goal, rate yourself, and watch the gap redraw. It runs entirely in the browser
 * (no AI call, nothing stored server-side); "Build this plan" hands a drafted first message to Asta.
 */
export function GapDemo({ signedIn }: { signedIn: boolean }) {
  const navigate = useNavigate()
  const hoursId = useId()
  const [goal, setGoal] = useState<DemoGoal>(DEMO_GOALS[0])
  const [levels, setLevels] = useState(() => goal.skills.map((skill) => skill.start))
  const [hours, setHours] = useState(goal.hoursPerWeek)
  // The entrance plays once; after the first edit, bars follow the sliders without the stagger.
  const [live, setLive] = useState(false)

  const pickGoal = (next: DemoGoal) => {
    setGoal(next)
    setLevels(next.skills.map((skill) => skill.start))
    setHours(next.hoursPerWeek)
    setLive(true)
  }
  const rate = (index: number, level: number) => {
    setLevels((current) => current.map((value, i) => (i === index ? level : value)))
    setLive(true)
  }

  const rows = goal.skills.map((skill, index) => ({
    skill: skill.name,
    current: levels[index],
    target: skill.target,
    note: STATUS_LABEL[gapStatus(levels[index], skill.target)],
  }))
  const estimate = estimateWeeks(goal, levels, hours)

  const build = () => {
    savePlanDraft({ goalId: goal.id, levels, hoursPerWeek: hours, message: draftMessage(goal, levels, hours) })
    navigate(signedIn ? '/asta' : '/signup', { state: { from: '/asta' } })
  }

  return (
    <div className="rounded-3xl border border-border bg-surface p-5 shadow-[0_30px_80px_-40px_rgba(20,60,50,0.45)] sm:p-7">
      <fieldset>
        <legend className="text-sm text-ink-muted">Try it: pick a goal</legend>
        <div className="mt-2.5 flex flex-wrap gap-2">
          {DEMO_GOALS.map((option) => {
            const selected = option.id === goal.id
            return (
              <button
                key={option.id}
                type="button"
                aria-pressed={selected}
                onClick={() => pickGoal(option)}
                className={cn(
                  'min-h-11 rounded-xl border px-3.5 text-sm font-medium transition-colors',
                  selected
                    ? 'border-primary bg-primary-soft text-primary'
                    : 'border-border-strong bg-surface text-ink hover:bg-surface-muted',
                )}
              >
                {option.label}
              </button>
            )
          })}
        </div>
      </fieldset>

      <p className="mt-6 text-sm font-medium text-ink">How well do you know each skill? Drag a bar to rate yourself.</p>
      <SkillGap
        rows={rows}
        className="mt-4"
        delay={0.5}
        live={live}
        renderControl={(row, index) => (
          <RangeInput
            overlay
            label={`How well do you know ${row.skill}?`}
            min={0}
            max={LEVELS}
            value={row.current}
            valueText={`${LEVEL_WORDS[row.current]}, level ${row.current} of ${LEVELS}. Your goal needs ${row.target}: ${row.note}.`}
            onChange={(level) => rate(index, level)}
          />
        )}
      />

      <div className="mt-3">
        <SkillGapLegend />
      </div>

      <div className="mt-5 border-t border-border pt-4">
        <div className="flex items-baseline justify-between gap-3 text-sm">
          <label htmlFor={hoursId} className="font-medium text-ink">
            Hours a week
          </label>
          <span aria-hidden className="text-ink-muted tabular-nums">
            {plural(hours, 'hr')}
          </span>
        </div>
        <RangeInput
          id={hoursId}
          min={MIN_HOURS}
          max={MAX_HOURS}
          value={hours}
          valueText={`${plural(hours, 'hour')} a week`}
          onChange={setHours}
        />
      </div>

      <div className="mt-6 flex flex-col gap-4 rounded-2xl bg-primary-soft p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-ink" aria-live="polite" aria-atomic>
            {estimate.weeks === 0 ? (
              <>You already meet this goal's levels.</>
            ) : (
              <>
                About{' '}
                <motion.strong key={estimate.weeks} initial={{ opacity: 0.4 }} animate={{ opacity: 1 }} className="font-display text-lg font-semibold">
                  {plural(estimate.weeks, 'week')}
                </motion.strong>
                , instead of {estimate.fromZero} starting from zero.
              </>
            )}
          </p>
          <p className="mt-1 text-xs text-ink-muted">Estimate. Your real plan comes from a short skill check.</p>
        </div>
        <Button onClick={build} className="shrink-0">
          Build this plan
        </Button>
      </div>
    </div>
  )
}

interface RangeInputProps {
  /** Pass `id` when a visible <label> points at the input; otherwise `label` names it for screen readers. */
  id?: string
  label?: string
  min: number
  max: number
  value: number
  /** What a screen reader announces as the value. */
  valueText: string
  onChange: (value: number) => void
  /** Sits on top of a SkillGap bar so the bar itself is what you drag: transparent track, a thumb at the bar's end. */
  overlay?: boolean
}

// The input is one thumb-width wider than the bar, so the thumb's centre lands exactly on the bar's end (level / 5).
const overlayClass =
  'relative -mx-2.5 -mt-[23px] block h-9 w-[calc(100%+1.25rem)] cursor-grab appearance-none rounded-full bg-transparent active:cursor-grabbing ' +
  '[&::-webkit-slider-thumb]:size-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full ' +
  '[&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-primary [&::-webkit-slider-thumb]:bg-surface [&::-webkit-slider-thumb]:shadow-md ' +
  '[&::-moz-range-thumb]:size-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-primary ' +
  '[&::-moz-range-thumb]:bg-surface [&::-moz-range-thumb]:shadow-md [&::-moz-range-track]:bg-transparent ' +
  // Keyboard focus rings the thumb, not the whole row (which would cut through the label). `!` beats the global :focus-visible rule.
  'focus-visible:outline-none! focus-visible:[&::-webkit-slider-thumb]:ring-4 focus-visible:[&::-webkit-slider-thumb]:ring-primary/40 ' +
  'focus-visible:[&::-moz-range-thumb]:ring-4 focus-visible:[&::-moz-range-thumb]:ring-primary/40'

/** A native range input: keyboard (arrows, Home/End) and touch for free, tinted with the primary token. */
function RangeInput({ id, label, min, max, value, valueText, onChange, overlay }: RangeInputProps) {
  return (
    <input
      id={id}
      type="range"
      aria-label={label}
      min={min}
      max={max}
      step={1}
      value={value}
      aria-valuetext={valueText}
      onChange={(event) => onChange(Number(event.target.value))}
      className={overlay ? overlayClass : 'mt-1 block h-9 w-full cursor-pointer accent-primary'}
    />
  )
}
