import { useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { Navigate, useNavigate } from 'react-router'

import { formErrorFrom } from '../../shared/forms/errors'
import { Alert } from '../../shared/ui/Alert'
import { Button, ButtonLink } from '../../shared/ui/Button'
import { cn } from '../../shared/ui/cn'
import { inputClass } from '../../shared/ui/Field'
import { useSavedDraft } from '../../shared/forms/useSavedDraft'
import { useAssessment, useSubmitAnswers, type Assessment, type AssessmentQuestion } from './api'
import { WorkingCard } from '../../shared/ui/WorkingCard'

const LETTERS = ['A', 'B', 'C', 'D']

export function AssessmentPage() {
  const { data: assessment, isPending, error, refetch, isRefetching } = useAssessment()

  if (isPending) {
    return (
      <WorkingCard
        title="Preparing your skill check"
        body="Asta is writing questions pitched at the levels you chose. This takes a few seconds."
      />
    )
  }
  if (error || !assessment) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-start gap-4">
        <Alert>{formErrorFrom(error) ?? "We couldn't prepare your check."}</Alert>
        <div className="flex flex-wrap gap-2">
          <Button loading={isRefetching} onClick={() => refetch()}>
            Try again
          </Button>
          <ButtonLink to="/dashboard" variant="secondary">
            Back to dashboard
          </ButtonLink>
        </div>
      </div>
    )
  }
  if (assessment.status === 'Completed') return <Navigate to="/assessment/results" replace />
  return <AssessmentForm assessment={assessment} />
}

/** The check itself. Answers are saved on this device as they're given, so nothing is lost before submitting. */
function AssessmentForm({ assessment }: { assessment: Assessment }) {
  const navigate = useNavigate()
  const submit = useSubmitAnswers()
  const draft = useSavedDraft<Record<string, string>>(`skillcheck.${assessment.id}`, {})
  const answers = draft.value
  const [confirmingBlanks, setConfirmingBlanks] = useState(false)

  const bySkill = useMemo(() => {
    const groups = new Map<string, AssessmentQuestion[]>()
    for (const question of assessment.questions) groups.set(question.skill, [...(groups.get(question.skill) ?? []), question])
    return [...groups.entries()]
  }, [assessment])

  if (submit.isPending) {
    return <WorkingCard title="Checking your answers" body="Grading short answers and working out your level in each skill." />
  }

  const total = assessment.questions.length
  const answered = assessment.questions.filter((q) => (answers[q.id] ?? '').trim()).length

  const onSubmit = () => {
    if (answered < total && !confirmingBlanks) {
      setConfirmingBlanks(true)
      return
    }
    submit.mutate(
      assessment.questions.map((q) => ({ questionId: q.id, answer: answers[q.id]?.trim() || null })),
      {
        onSuccess: () => {
          draft.clear()
          navigate('/assessment/results', { replace: true })
        },
      },
    )
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <header>
        <p className="text-small font-medium text-ink-muted">Step 2 of 2</p>
        <h1 className="mt-1 font-display text-heading font-semibold tracking-tight">Quick skill check</h1>
        <p className="mt-2 max-w-xl text-ink-muted">
          {total} questions. Answer from what you know; guessing only makes your plan less accurate.
          {assessment.skippedSkills.length > 0 && ` Skipped, since you haven't used them yet: ${assessment.skippedSkills.join(', ')}.`}
        </p>
      </header>

      <div className="sticky top-16 z-[5] -mx-4 border-b border-border bg-bg/90 px-4 py-3 backdrop-blur-md sm:mx-0 sm:rounded-xl sm:border">
        <div className="flex items-center justify-between gap-3 text-small">
          <span className="text-ink-muted" aria-live="polite">
            {answered} of {total} answered
          </span>
          <span className="text-ink-muted">{draft.restored && answered > 0 ? 'Picked up where you left off' : 'Saved as you go'}</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-muted" aria-hidden>
          <motion.div className="h-full rounded-full bg-primary" animate={{ width: `${(answered / total) * 100}%` }} transition={{ duration: 0.3 }} />
        </div>
      </div>

      {bySkill.map(([skill, questions]) => (
        <section key={skill} aria-label={skill} className="flex flex-col gap-4">
          <h2 className="font-display text-title font-semibold">{skill}</h2>
          {questions.map((question) => (
            <QuestionCard
              key={question.id}
              question={question}
              number={assessment.questions.indexOf(question) + 1}
              answer={answers[question.id] ?? ''}
              onAnswer={(value) => {
                draft.setValue((current) => ({ ...current, [question.id]: value }))
                setConfirmingBlanks(false)
              }}
            />
          ))}
        </section>
      ))}

      <Alert>{formErrorFrom(submit.error)}</Alert>
      <Alert tone="warning">
        {confirmingBlanks && `${total - answered} unanswered. They'll count as not known. Finish anyway?`}
      </Alert>
      <div className="flex justify-end">
        <Button size="lg" onClick={onSubmit}>
          {confirmingBlanks ? 'Finish anyway' : 'Finish skill check'}
        </Button>
      </div>
    </div>
  )
}

interface QuestionCardProps {
  question: AssessmentQuestion
  number: number
  answer: string
  onAnswer: (value: string) => void
}

function QuestionCard({ question, number, answer, onAnswer }: QuestionCardProps) {
  const promptId = `q-${question.id}`
  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <p id={promptId} className="leading-relaxed text-ink">
        <span className="mr-2 font-semibold text-ink-muted">{number}.</span>
        {question.prompt}
      </p>
      {question.kind === 'multiple_choice' && question.options ? (
        <div role="radiogroup" aria-labelledby={promptId} className="mt-4 grid gap-2">
          {question.options.map((option, index) => {
            const selected = answer === String(index)
            return (
              <label
                key={index}
                className={cn(
                  'flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border px-3.5 py-2.5 transition-colors',
                  'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary',
                  selected ? 'border-primary bg-primary-soft' : 'border-border-strong hover:bg-surface-muted',
                )}
              >
                <input type="radio" name={question.id} checked={selected} onChange={() => onAnswer(String(index))} className="sr-only" />
                <span
                  aria-hidden
                  className={cn(
                    'mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md text-small font-semibold',
                    selected ? 'bg-primary text-on-primary' : 'bg-surface-muted text-ink-muted',
                  )}
                >
                  {LETTERS[index]}
                </span>
                <span className="text-body text-ink">{option}</span>
              </label>
            )
          })}
        </div>
      ) : (
        <textarea
          aria-labelledby={promptId}
          value={answer}
          maxLength={4000}
          onChange={(event) => onAnswer(event.target.value)}
          placeholder="A few sentences is plenty."
          className={cn(inputClass, 'mt-4 min-h-28 resize-y py-2.5 leading-relaxed')}
        />
      )}
    </div>
  )
}
