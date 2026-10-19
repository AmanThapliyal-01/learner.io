import type { ComponentProps } from 'react'
import { Link, type LinkProps } from 'react-router'

import { buttonClass, type StyleProps } from './buttonStyles'
import { Spinner } from './Spinner'

// ComponentProps includes `ref` (React 19 passes it as a normal prop), so dialogs can focus a button.
interface ButtonProps extends ComponentProps<'button'>, StyleProps {
  loading?: boolean
}

export function Button({ variant, size, loading, disabled, className, children, type = 'button', ...props }: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClass({ variant, size }, className)}
      {...props}
    >
      {loading && <Spinner />}
      {children}
    </button>
  )
}

export function ButtonLink({ variant, size, className, ...props }: LinkProps & StyleProps) {
  return <Link className={buttonClass({ variant, size }, className)} {...props} />
}
