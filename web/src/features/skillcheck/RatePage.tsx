import { useState } from 'react'
import { motion } from 'motion/react'
import { useNavigate } from 'react-router'

import { formErrorFrom } from '../../shared/forms/errors'
import { Alert } from '../../shared/ui/Alert'
import { Button } from '../../shared/ui/Button'
import { ChoiceCheck } from '../../shared/ui/Choice'
import { choiceClass } from '../../shared/ui/choiceStyles'
import { cn } from '../../shared/ui/cn'
import { Spinner } from '../../shared/ui/Spinner'
import { LEVELS, useRatingForm, useSaveRatings } from './api'
import { EASE_OUT } from '../../shared/ui/motion'

export function RatePage() {
  const navigate = useNavigate()
  const { data: form, isPending, error } = useRatingForm()
  const save = useSaveRatings()
  const [ratings, setRatings] = useState<Record<string, number>>({})

  if (isPending) return <Spinner className="size-5 text-primary" label="Loading your skills" />
  if (error || !form) return <Alert>{formErrorFrom(error) ?? "We couldn't load your skills."}</Alert>

  const value = (skill: string) => ratings[skill] ?? form.skills.find((s) => s.skill === skill)?.selfRating ?? null
  const unrated = form.skills.filter((s) => value(s.skill) === null).length

  const submit = () =>
    save.mutate(
      form.skills.map((s) => ({ skill: s.skill, rating: value(s.skill)! })),
      { onSuccess: () => navigate('/assessment') },
    )

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <header>
        <p className="text-small font-medium text-ink-muted">Step 1 of 2 · {form.goalTitle}</p>
        <h1 className="mt-1 font-display text-heading font-semibold tracking-tight">How well do you know each skill?</h1>
        <p className="mt-2 max-w-xl text-ink-muted">
          Be honest: a short check comes next, pitched at the level you choose. Skills you've never used are skipped.
        </p>
      </header>

      <ol className="flex flex-col gap-4">
        {form.skills.map((skill, index) => (
          <motion.li
            key={skill.skill}
            initial={{ opacity: 0, transform: 'translateY(8px)' }}
            animate={{ opacity: 1, transform: 'translateY(0px)' }}
            transition={{ delay: index * 0.05, duration: 0.25, ease: EASE_OUT }}
            className="rounded-2xl border border-border bg-surface p-5"
          >
            <fieldset>
              <legend className="font-medium text-ink">{skill.skill}</legend>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
                {LEVELS.map((level) => {
                  const selected = value(skill.skill) === level.value
                  return (
                    <label
                      key={level.value}
                      className={cn(
                        'relative flex min-h-14 cursor-pointer flex-col justify-center py-2 pr-7 pl-3',
                        'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary',
                        choiceClass(selected),
                      )}
                    >
                      {selected && <ChoiceCheck className="absolute top-2 right-2" />}
                      <input
                        type="radio"
                        name={`rating-${index}`}
                        value={level.value}
                        checked={selected}
                        onChange={() => setRatings((current) => ({ ...current, [skill.skill]: level.value }))}
                        className="sr-only"
                      />
                      <span className={cn('text-small font-medium', selected ? 'text-primary' : 'text-ink')}>{level.label}</span>
                      <span className="text-small text-ink-muted">{level.hint}</span>
                    </label>
                  )
                })}
              </div>
            </fieldset>
          </motion.li>
        ))}
      </ol>

      <Alert>{formErrorFrom(save.error)}</Alert>
      <div className="flex flex-wrap items-center justify-end gap-3">
        {unrated > 0 && <p className="text-small text-ink-muted">{unrated} left to rate</p>}
        <Button size="lg" disabled={unrated > 0} loading={save.isPending} onClick={submit}>
          Continue to the skill check
        </Button>
      </div>
    </div>
  )
}
