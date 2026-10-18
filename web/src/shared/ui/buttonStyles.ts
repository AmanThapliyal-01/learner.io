import { cn } from './cn'

export type Variant = 'primary' | 'secondary' | 'ghost'
export type Size = 'md' | 'lg'

const base =
  'inline-flex items-center justify-center gap-2 rounded-xl font-medium select-none ' +
  'transition-[background-color,border-color,color,box-shadow,transform] duration-150 ease-out ' +
  'active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50'

const variants: Record<Variant, string> = {
  primary: 'bg-primary text-on-primary shadow-sm hover:bg-primary-hover',
  secondary: 'border border-border-strong bg-surface text-ink hover:bg-surface-muted',
  ghost: 'text-ink-muted hover:bg-surface-muted hover:text-ink',
}

// 44px minimum hit target on every size.
const sizes: Record<Size, string> = {
  md: 'min-h-11 px-4 text-[15px]',
  lg: 'min-h-12 px-6 text-base',
}

export interface StyleProps {
  variant?: Variant
  size?: Size
}

export function buttonClass({ variant = 'primary', size = 'md' }: StyleProps, className?: string) {
  return cn(base, variants[variant], sizes[size], className)
}
