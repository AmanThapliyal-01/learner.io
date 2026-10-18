import { cn } from './cn'

export function Spinner({ className, label }: { className?: string; label?: string }) {
  return (
    <span role={label ? 'status' : undefined} className="inline-flex items-center gap-2">
      <span
        aria-hidden
        className={cn('size-4 animate-spin rounded-full border-2 border-current border-r-transparent', className)}
      />
      {label && <span className="sr-only">{label}</span>}
    </span>
  )
}

export function FullPageSpinner() {
  return (
    <div className="flex min-h-dvh items-center justify-center text-primary">
      <Spinner className="size-6" label="Loading" />
    </div>
  )
}
