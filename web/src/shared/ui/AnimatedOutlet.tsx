import { useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useLocation, useOutlet } from 'react-router'

/** Route outlet with a short fade-and-rise between pages. MotionConfig handles reduced motion. */
export function AnimatedOutlet({ className }: { className?: string }) {
  const location = useLocation()
  const outlet = useOutlet()
  const firstRender = useRef(true)

  // After in-app navigation, put focus on the new page's heading so screen readers announce the page.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    const timer = window.setTimeout(() => {
      const heading = document.querySelector<HTMLElement>('main h1')
      if (!heading) return
      heading.tabIndex = -1
      heading.focus({ preventScroll: true })
    }, 260) // after the page transition
    return () => window.clearTimeout(timer)
  }, [location.pathname])

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        className={className}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
      >
        {outlet}
      </motion.div>
    </AnimatePresence>
  )
}
