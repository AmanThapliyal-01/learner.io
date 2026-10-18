/** RFC 7807 problem response returned by the C# API. */
export interface ProblemDetails {
  title?: string
  status?: number
  detail?: string
  errors?: Record<string, string[]>
}

export class ApiError extends Error {
  readonly status: number
  readonly problem?: ProblemDetails

  constructor(status: number, problem?: ProblemDetails) {
    super(problem?.title ?? `Request failed with status ${status}`)
    this.status = status
    this.problem = problem
  }
}

/** Single fetch wrapper for every API call: same-origin cookies, JSON in/out, typed errors. */
export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  if (init.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(path, { ...init, headers, credentials: 'same-origin' })

  if (!response.ok) {
    const isProblem = response.headers.get('Content-Type')?.includes('json')
    throw new ApiError(response.status, isProblem ? await response.json() : undefined)
  }
  if (response.status === 204) return undefined as T

  const contentType = response.headers.get('Content-Type') ?? ''
  return (contentType.includes('json') ? response.json() : response.text()) as Promise<T>
}
