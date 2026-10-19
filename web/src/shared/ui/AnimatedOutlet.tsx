import { useEffect, useRef } from 'react'
import { motion } from 'motion/react'
import { useLocation, useOutlet } from 'react-router'

/**
 * Route outlet. The new page appears at once and fades in briefly; there is no exit animation to wait for,
 * because switching sections is the most frequent interaction in the app (HIG motion › avoid motion on
 * frequent interactions; let people cancel motion). Opacity only, so it is calm under reduced motion too.
 */
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
    // Once the page has rendered; pages that show their heading after loading data get one more chance.
    // Timers, not requestAnimationFrame: frames don't run in a tab that isn't painting.
    const focusHeading = () => {
      const heading = document.querySelector<HTMLElement>('main h1')
      if (!heading) return false
      heading.tabIndex = -1
      heading.focus({ preventScroll: true })
      return true
    }
    let retry: number | undefined
    const first = window.setTimeout(() => {
      if (!focusHeading()) retry = window.setTimeout(focusHeading, 400)
    }, 50)
    return () => {
      window.clearTimeout(first)
      window.clearTimeout(retry)
    }
  }, [location.pathname])

  return (
    <motion.div
      key={location.pathname}
      className={className}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
    >
      {outlet}
    </motion.div>
  )
}
