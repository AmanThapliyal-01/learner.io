import { motion } from 'motion/react'
import { useNavigate } from 'react-router'

import { formErrorFrom } from '../../shared/forms/errors'
import { Alert } from '../../shared/ui/Alert'
import { Button } from '../../shared/ui/Button'
import { SkillGap, SkillGapLegend } from '../../shared/ui/SkillGap'
import { AgentAvatar } from '../../shared/ui/AgentAvatar'
import { AGENTS } from '../../shared/ui/agents'
import { Spinner } from '../../shared/ui/Spinner'
import { useRequestPlan } from '../plan/api'
import { LEVELS, gapNote, useResults, type SkillResult } from './api'
import { EASE_OUT } from '../../shared/ui/motion'

const levelName = (level: number) => LEVELS.find((l) => l.value === level)?.label ?? `Level ${level}`
// What the check found reads better as a starting point than "Never used" for someone who has tried it.
const assessedName = (level: number) => (level === 1 ? 'Just starting' : levelName(level))

export function ResultsPage() {
  const navigate = useNavigate()
  const { data: results, isPending, error } = useResults()
  const requestPlan = useRequestPlan()

  if (isPending) return <Spinner className="size-5 text-primary" label="Loading your results" />
  if (error || !results) return <Alert>{formErrorFrom(error) ?? "We couldn't load your results."}</Alert>

  const rows = results.skills.map((s) => ({
    skill: s.skill,
    current: s.assessedLevel,
    target: s.targetLevel,
    note: gapNote(s.assessedLevel, s.targetLevel),
  }))

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <header>
        <p className="text-sm font-medium text-ink-muted">{results.goalTitle}</p>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight sm:text-4xl">Here's where you stand</h1>
        <p className="mt-2 max-w-xl text-ink-muted">
          Your plan will skip what you already know and spend your time on the gaps.
        </p>
      </header>

      <section aria-label="Your skill gaps" className="rounded-3xl border border-border bg-surface p-6 sm:p-8">
        <SkillGap rows={rows} delay={0.1} />
        <div className="mt-6 border-t border-border pt-4">
          <SkillGapLegend />
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        {results.skills.map((skill, index) => (
          <SkillCard key={skill.skill} skill={skill} index={index} />
        ))}
      </div>

      <Alert>{formErrorFrom(requestPlan.error)}</Alert>
      <div className="flex flex-col items-end gap-2">
        <Button size="lg" loading={requestPlan.isPending} onClick={() => requestPlan.mutate(undefined, { onSuccess: () => navigate('/plan') })}>
          Build my plan
        </Button>
        <p className="flex items-center gap-2 text-sm text-ink-muted">
          <AgentAvatar agent="anbu" className="size-5" />
          {AGENTS.anbu.name}, our planning agent, builds it in under a minute.
        </p>
      </div>
    </div>
  )
}

function SkillCard({ skill, index }: { skill: SkillResult; index: number }) {
  const changed = skill.assessedLevel !== skill.selfRating
  return (
    <motion.article
      initial={{ opacity: 0, transform: 'translateY(8px)' }}
      animate={{ opacity: 1, transform: 'translateY(0px)' }}
      transition={{ delay: 0.2 + index * 0.05, duration: 0.25, ease: EASE_OUT }}
      className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5"
    >
      <h2 className="font-medium text-ink">{skill.skill}</h2>
      <p className="text-sm text-ink-muted">
        {skill.score === null ? (
          <>Not tested: you said you haven't used it yet.</>
        ) : (
          <>
            You said <span className="font-medium text-ink">{levelName(skill.selfRating)}</span>
            {changed ? (
              <>
                , the check shows <span className="font-medium text-ink">{assessedName(skill.assessedLevel)}</span>.
              </>
            ) : (
              <>, and the check agrees.</>
            )}{' '}
            Your goal needs {levelName(skill.targetLevel)}.
          </>
        )}
      </p>
      {skill.strengths.length > 0 && <List title="Strengths" items={skill.strengths} />}
      {skill.gaps.length > 0 && <List title="To work on" items={skill.gaps} />}
    </motion.article>
  )
}

function List({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h3 className="text-xs font-medium tracking-wide text-ink-muted uppercase">{title}</h3>
      <ul className="mt-1.5 flex list-disc flex-col gap-1 pl-5 text-sm text-ink">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  )
}
