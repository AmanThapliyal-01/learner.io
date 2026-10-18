import { ApiError } from '../api/client'

export type FieldErrors = Record<string, string | undefined>

/** Field-level messages from an API validation problem (keys are camelCase field names). */
export function fieldErrorsFrom(error: unknown): FieldErrors {
  if (!(error instanceof ApiError) || !error.problem?.errors) return {}
  return Object.fromEntries(
    Object.entries(error.problem.errors).map(([field, messages]) => [field, messages[0]]),
  )
}

/** A message for the whole form: the API's title, or a friendly fallback for network/server failures. */
export function formErrorFrom(error: unknown): string | undefined {
  if (!error) return undefined
  if (error instanceof ApiError) {
    if (error.status >= 500) return 'Something went wrong on our side. Please try again.'
    if (error.status === 429) return 'Too many attempts. Wait a minute and try again.'
    // Validation problems are shown next to each field instead.
    return error.problem?.errors ? undefined : error.problem?.title ?? error.message
  }
  return "We couldn't reach the server. Check your connection and try again."
}

export const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
