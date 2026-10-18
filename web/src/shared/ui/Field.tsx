import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'

import { cn } from './cn'

export const inputClass =
  'w-full rounded-xl border border-border-strong bg-surface px-3.5 text-[15px] text-ink ' +
  'placeholder:text-ink-muted transition-[border-color,box-shadow] duration-150 ' +
  'focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15 ' +
  'aria-[invalid=true]:border-danger aria-[invalid=true]:focus:ring-danger/15'

interface FieldShellProps {
  label: string
  hint?: ReactNode
  error?: string
  optional?: boolean
  children: (aria: { id: string; 'aria-invalid'?: boolean; 'aria-describedby'?: string }) => ReactNode
  trailing?: ReactNode
}

/** Label, hint and error wiring shared by every form control. */
export function FieldShell({ label, hint, error, optional, children, trailing }: FieldShellProps) {
  const id = useId()
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined
  const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm font-medium text-ink">
          {label}
          {optional && <span className="ml-1.5 font-normal text-ink-muted">(optional)</span>}
        </label>
        {trailing}
      </div>
      {children({ id, 'aria-invalid': error ? true : undefined, 'aria-describedby': describedBy })}
      {error ? (
        <p id={errorId} className="text-sm text-danger">
          {error}
        </p>
      ) : (
        hint && (
          <p id={hintId} className="text-sm text-ink-muted">
            {hint}
          </p>
        )
      )}
    </div>
  )
}

interface CommonProps {
  label: string
  hint?: ReactNode
  error?: string
  optional?: boolean
}

export function TextField({ label, hint, error, optional, className, ...props }: CommonProps & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <FieldShell label={label} hint={hint} error={error} optional={optional}>
      {(aria) => <input {...aria} {...props} className={cn(inputClass, 'min-h-11', className)} />}
    </FieldShell>
  )
}

export function TextArea({
  label,
  hint,
  error,
  optional,
  className,
  value,
  maxLength,
  ...props
}: CommonProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const length = typeof value === 'string' ? value.length : 0
  return (
    <FieldShell
      label={label}
      hint={hint}
      error={error}
      optional={optional}
      trailing={maxLength && <span className="text-xs tabular-nums text-ink-muted">{length}/{maxLength}</span>}
    >
      {(aria) => (
        <textarea
          {...aria}
          {...props}
          value={value}
          maxLength={maxLength}
          className={cn(inputClass, 'min-h-28 resize-y py-2.5 leading-relaxed', className)}
        />
      )}
    </FieldShell>
  )
}

interface SelectFieldProps extends CommonProps, SelectHTMLAttributes<HTMLSelectElement> {
  options: ReadonlyArray<{ value: string; label: string }>
  placeholder?: string
}

export function SelectField({ label, hint, error, optional, options, placeholder, className, ...props }: SelectFieldProps) {
  return (
    <FieldShell label={label} hint={hint} error={error} optional={optional}>
      {(aria) => (
        <div className="relative">
          <select {...aria} {...props} className={cn(inputClass, 'min-h-11 appearance-none pr-10', className)}>
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <svg
            aria-hidden
            viewBox="0 0 16 16"
            className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-ink-muted"
          >
            <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      )}
    </FieldShell>
  )
}
