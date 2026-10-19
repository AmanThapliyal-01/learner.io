import { useId, useState, type FormEvent, type ReactNode } from 'react'

import { fieldErrorsFrom, formErrorFrom, type FieldErrors } from '../../shared/forms/errors'
import { Alert } from '../../shared/ui/Alert'
import { SavedNote } from '../../shared/ui/SavedNote'
import { Button } from '../../shared/ui/Button'
import { SelectField, TextField } from '../../shared/ui/Field'
import { useUpdateBasicInfo, type BasicInfo, type Profile } from './api'
import { AGE_RANGES, COMMON_COUNTRIES, CURRENT_STATUSES } from './options'

interface BasicInfoFormProps {
  profile: Pick<Profile, 'fullName' | 'country' | 'ageRange' | 'currentStatus'>
  submitLabel: string
  onSaved?: () => void
  /** Show "Saved" beside the button after saving (the profile page; onboarding moves on instead). */
  confirmSaved?: boolean
  actions?: ReactNode
}

/** Required basic info. Used in onboarding (step 1) and on the profile page. */
export function BasicInfoForm({ profile, submitLabel, onSaved, actions, confirmSaved }: BasicInfoFormProps) {
  const save = useUpdateBasicInfo()
  const countriesId = useId()
  const [form, setForm] = useState<BasicInfo>({
    fullName: profile.fullName ?? '',
    country: profile.country ?? '',
    ageRange: profile.ageRange ?? '',
    currentStatus: profile.currentStatus ?? '',
  })
  const [errors, setErrors] = useState<FieldErrors>({})
  const set = (field: keyof BasicInfo) => (value: string) => {
    if (save.isSuccess) save.reset() // an edit makes "Saved" stale
    setForm((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
  }

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    const found: FieldErrors = {
      fullName: form.fullName.trim() ? undefined : 'Tell us what to call you.',
      country: form.country.trim() ? undefined : 'Choose or type your country.',
      ageRange: form.ageRange ? undefined : 'Choose an age range.',
      currentStatus: form.currentStatus ? undefined : "Choose what you're doing right now.",
    }
    setErrors(found)
    if (Object.values(found).some(Boolean)) return
    save.mutate(form, { onSuccess: () => onSaved?.() })
  }

  const serverErrors = fieldErrorsFrom(save.error)
  const errorFor = (field: keyof BasicInfo) => errors[field] ?? serverErrors[field]

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <Alert>{formErrorFrom(save.error)}</Alert>
      <TextField
        label="Your name"
        autoComplete="name"
        value={form.fullName}
        onChange={(event) => set('fullName')(event.target.value)}
        error={errorFor('fullName')}
      />
      <TextField
        label="Country"
        autoComplete="country-name"
        list={countriesId}
        value={form.country}
        onChange={(event) => set('country')(event.target.value)}
        error={errorFor('country')}
        hint="Helps Asta suggest resources and roles relevant where you live."
      />
      <datalist id={countriesId}>
        {COMMON_COUNTRIES.map((country) => (
          <option key={country} value={country} />
        ))}
      </datalist>
      <div className="grid gap-5 sm:grid-cols-2">
        <SelectField
          label="Age range"
          options={AGE_RANGES}
          placeholder="Choose…"
          value={form.ageRange}
          onChange={(event) => set('ageRange')(event.target.value)}
          error={errorFor('ageRange')}
        />
        <SelectField
          label="Right now you're…"
          options={CURRENT_STATUSES}
          placeholder="Choose…"
          value={form.currentStatus}
          onChange={(event) => set('currentStatus')(event.target.value)}
          error={errorFor('currentStatus')}
        />
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-end gap-3">
        {confirmSaved && save.isSuccess && <SavedNote />}
        {actions}
        <Button type="submit" loading={save.isPending}>
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}
