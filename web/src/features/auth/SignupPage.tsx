import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'

import { fieldErrorsFrom, formErrorFrom, isEmail, type FieldErrors } from '../../shared/forms/errors'
import { Alert } from '../../shared/ui/Alert'
import { Button } from '../../shared/ui/Button'
import { TextField } from '../../shared/ui/Field'
import { useRegister } from './api'
import { AuthLayout } from './AuthLayout'
import { GoogleButton } from './GoogleButton'

const MIN_PASSWORD = 8

export function SignupPage() {
  const register = useRegister()
  const [form, setForm] = useState({ fullName: '', email: '', password: '' })
  const [errors, setErrors] = useState<FieldErrors>({})

  const validate = (): FieldErrors => ({
    fullName: !form.fullName.trim() ? 'Tell us what to call you.' : undefined,
    email: !form.email.trim() ? 'Enter your email.' : !isEmail(form.email) ? 'Enter a valid email address.' : undefined,
    password: form.password.length < MIN_PASSWORD ? `Use at least ${MIN_PASSWORD} characters.` : undefined,
  })

  const set = (field: keyof typeof form) => (value: string) => setForm((current) => ({ ...current, [field]: value }))
  const revalidate = (field: keyof typeof form) => () =>
    form[field] && setErrors((current) => ({ ...current, [field]: validate()[field] }))

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    const found = validate()
    setErrors(found)
    if (Object.values(found).some(Boolean)) return
    register.mutate(form)
  }

  const serverErrors = fieldErrorsFrom(register.error)

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Two minutes to set up. Then Asta helps you pick what to learn."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Log in
          </Link>
        </>
      }
    >
      <Alert>{formErrorFrom(register.error)}</Alert>
      <GoogleButton label="Sign up with Google" />
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
        <TextField
          label="Your name"
          autoComplete="name"
          value={form.fullName}
          onChange={(event) => set('fullName')(event.target.value)}
          onBlur={revalidate('fullName')}
          error={errors.fullName ?? serverErrors.fullName}
        />
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          inputMode="email"
          value={form.email}
          onChange={(event) => set('email')(event.target.value)}
          onBlur={revalidate('email')}
          error={errors.email ?? serverErrors.email}
        />
        <TextField
          label="Password"
          type="password"
          autoComplete="new-password"
          hint={`At least ${MIN_PASSWORD} characters. A short phrase works well.`}
          value={form.password}
          onChange={(event) => set('password')(event.target.value)}
          onBlur={revalidate('password')}
          error={errors.password ?? serverErrors.password}
        />
        <Button type="submit" loading={register.isPending} className="w-full">
          Create account
        </Button>
      </form>
    </AuthLayout>
  )
}
