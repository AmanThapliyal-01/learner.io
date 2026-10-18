import { useState, type FormEvent, type ReactNode } from 'react'

import { fieldErrorsFrom, formErrorFrom } from '../../shared/forms/errors'
import { Alert } from '../../shared/ui/Alert'
import { Button } from '../../shared/ui/Button'
import { TextArea, TextField } from '../../shared/ui/Field'
import { TagInput } from '../../shared/ui/TagInput'
import { useUpdateDetails, type ProfileDetails } from './api'

const SUMMARY_MAX = 4000

interface ProfileDetailsFormProps {
  profile: ProfileDetails
  submitLabel: string
  onSaved?: () => void
  /** Extra buttons placed before the submit button, e.g. "Skip for now". */
  actions?: ReactNode
}

/** The optional detailed profile. Used in onboarding (step 2) and on the profile page. */
export function ProfileDetailsForm({ profile, submitLabel, onSaved, actions }: ProfileDetailsFormProps) {
  const save = useUpdateDetails()
  const [form, setForm] = useState({
    profession: profile.profession ?? '',
    yearsOfExperience: profile.yearsOfExperience?.toString() ?? '',
    education: profile.education ?? '',
    certifications: profile.certifications,
    skills: profile.skills,
    hobbies: profile.hobbies,
    professionalSummary: profile.professionalSummary ?? '',
  })
  const set = <K extends keyof typeof form>(field: K) => (value: (typeof form)[K]) =>
    setForm((current) => ({ ...current, [field]: value }))

  const years = form.yearsOfExperience.trim() === '' ? null : Number(form.yearsOfExperience)
  const yearsError = years !== null && (!Number.isInteger(years) || years < 0 || years > 60) ? 'Enter a whole number from 0 to 60.' : undefined

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (yearsError) return
    const blankToNull = (value: string) => value.trim() || null
    save.mutate(
      {
        profession: blankToNull(form.profession),
        yearsOfExperience: years,
        education: blankToNull(form.education),
        certifications: form.certifications,
        skills: form.skills,
        hobbies: form.hobbies,
        professionalSummary: blankToNull(form.professionalSummary),
      },
      { onSuccess: () => onSaved?.() },
    )
  }

  const serverErrors = fieldErrorsFrom(save.error)

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <Alert>{formErrorFrom(save.error)}</Alert>
      <div className="grid gap-5 sm:grid-cols-[1fr_10rem]">
        <TextField
          label="Profession or role"
          optional
          autoComplete="organization-title"
          placeholder="e.g. Backend developer"
          value={form.profession}
          onChange={(event) => set('profession')(event.target.value)}
          error={serverErrors.profession}
        />
        <TextField
          label="Years of experience"
          optional
          inputMode="numeric"
          value={form.yearsOfExperience}
          onChange={(event) => set('yearsOfExperience')(event.target.value.replace(/[^\d]/g, ''))}
          error={yearsError ?? serverErrors.yearsOfExperience}
        />
      </div>
      <TextField
        label="Education"
        optional
        placeholder="e.g. B.Tech, Computer Science"
        value={form.education}
        onChange={(event) => set('education')(event.target.value)}
        error={serverErrors.education}
      />
      <TagInput
        label="Skills you already have"
        optional
        placeholder="e.g. Python, SQL, sketching"
        value={form.skills}
        onChange={set('skills')}
        error={serverErrors.skills}
      />
      <TagInput
        label="Certifications"
        optional
        placeholder="e.g. AWS Cloud Practitioner"
        value={form.certifications}
        onChange={set('certifications')}
        error={serverErrors.certifications}
      />
      <TagInput
        label="Hobbies and interests"
        optional
        placeholder="e.g. chess, photography"
        value={form.hobbies}
        onChange={set('hobbies')}
        error={serverErrors.hobbies}
      />
      <TextArea
        label="Professional summary"
        optional
        maxLength={SUMMARY_MAX}
        placeholder="A few lines about your work and what you want next. Asta uses this to suggest what to learn."
        value={form.professionalSummary}
        onChange={(event) => set('professionalSummary')(event.target.value)}
        error={serverErrors.professionalSummary}
      />
      <div className="mt-2 flex flex-wrap items-center justify-end gap-3">
        {actions}
        <Button type="submit" loading={save.isPending}>
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}
