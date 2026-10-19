import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router'

import { fieldErrorsFrom, formErrorFrom, isEmail, type FieldErrors } from '../../shared/forms/errors'
import { Alert } from '../../shared/ui/Alert'
import { Button } from '../../shared/ui/Button'
import { TextField } from '../../shared/ui/Field'
import { useLogin } from './api'
import { AuthLayout } from './AuthLayout'
import { GoogleButton } from './GoogleButton'

const GOOGLE_ERRORS: Record<string, string> = {
  google: "Google sign-in didn't complete. Try again, or use your email.",
  google_unavailable: "Google sign-in isn't available right now. Use your email instead.",
}

export function LoginPage() {
  const [params] = useSearchParams()
  const login = useLogin()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})

  const validate = (): FieldErrors => ({
    email: !email.trim() ? 'Enter your email.' : !isEmail(email) ? 'Enter a valid email address.' : undefined,
    password: !password ? 'Enter your password.' : undefined,
  })

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    const found = validate()
    setErrors(found)
    if (Object.values(found).some(Boolean)) return
    login.mutate({ email, password })
  }

  const serverErrors = fieldErrorsFrom(login.error)
  const googleError = GOOGLE_ERRORS[params.get('error') ?? '']

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Pick up your plan where you left off."
      footer={
        <>
          New to learner.io?{' '}
          <Link to="/signup" className="font-medium text-primary hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <Alert>{formErrorFrom(login.error) ?? googleError}</Alert>
      <GoogleButton label="Continue with Google" />
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          onBlur={() => email && setErrors((current) => ({ ...current, email: validate().email }))}
          error={errors.email ?? serverErrors.email}
        />
        <TextField
          label="Password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={errors.password ?? serverErrors.password}
        />
        <Button type="submit" loading={login.isPending} className="w-full">
          Log in
        </Button>
      </form>
    </AuthLayout>
  )
}
