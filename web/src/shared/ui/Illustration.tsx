import { cn } from './cn'

/**
 * Brand illustrations in public/assets/illustrations. Each SVG carries its own light and dark palette
 * (matching the design tokens), so it follows the system theme without extra CSS.
 */
const ILLUSTRATIONS = {
  /** Solid stones (what you know), hatched stones (the gap), a sprout at the goal. */
  gapPath: { src: '/assets/illustrations/gap-path.svg', width: 1600, height: 680 },
  /** A seedling and a typing bubble: a plan that starts with a conversation. */
  sproutChat: { src: '/assets/illustrations/sprout-chat.svg', width: 480, height: 520 },
} as const

export type IllustrationName = keyof typeof ILLUSTRATIONS

/** Decorative by default (empty alt); pass `alt` when the picture carries meaning the text around it doesn't. */
export function Illustration({ name, alt = '', className }: { name: IllustrationName; alt?: string; className?: string }) {
  const { src, width, height } = ILLUSTRATIONS[name]
  return (
    <img
      src={src}
      width={width}
      height={height}
      alt={alt}
      loading="lazy"
      decoding="async"
      draggable={false}
      className={cn('block h-auto select-none', className)}
    />
  )
}
