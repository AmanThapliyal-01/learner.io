import { useState } from 'react'
import { motion } from 'motion/react'

import { reveal } from './reveal'

const VIDEO = '/assets/video/learner-promo.mp4'
const POSTER = '/assets/video/learner-promo-poster.jpg'
const CAPTIONS = '/assets/video/learner-promo.en.vtt'

/** Runs once the poster's play button has swapped the video in, so it's always the user's click that starts it. */
function startPlayback(video: HTMLVideoElement | null) {
  if (!video) return
  video.focus()
  video.play().catch(() => {
    // Blocked or interrupted: the native controls are right there.
  })
}

/**
 * The 25-second narrated promo. Only the poster loads with the page; the video element appears when the user
 * asks for it, plays with sound because that click started it, and never plays on its own. Captions are on by
 * default so the narration is there for people who can't hear it (HIG accessibility › Hearing).
 */
export function VideoSection() {
  const [playing, setPlaying] = useState(false)

  return (
    <section id="video" aria-labelledby="video-title" className="mx-auto max-w-5xl scroll-mt-20 px-4 pb-24 sm:px-6">
      <motion.div {...reveal} className="text-center">
        <h2 id="video-title" className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          See it in 25 seconds
        </h2>
      </motion.div>

      <motion.div {...reveal} className="relative mt-10 aspect-video overflow-hidden rounded-3xl border border-border bg-surface-muted shadow-[0_30px_80px_-40px_rgba(20,60,50,0.45)]">
        {playing ? (
          <video
            src={VIDEO}
            poster={POSTER}
            controls
            playsInline
            preload="none"
            ref={startPlayback}
            aria-describedby="video-summary"
            className="size-full"
          >
            <track kind="captions" src={CAPTIONS} srcLang="en" label="English" default />
          </video>
        ) : (
          <button
            type="button"
            onClick={() => setPlaying(true)}
            aria-describedby="video-summary"
            className="group relative block size-full"
          >
            <img src={POSTER} alt="" width={1280} height={720} loading="lazy" decoding="async" className="size-full object-cover" />
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="flex items-center gap-3 rounded-full bg-surface py-3 pr-6 pl-3 text-ink shadow-lg transition-transform group-hover:scale-[1.03] group-active:scale-[0.98]">
                <span className="flex size-11 items-center justify-center rounded-full bg-primary text-on-primary">
                  <svg aria-hidden viewBox="0 0 20 20" className="ml-0.5 size-5">
                    <path d="M6 4.5v11l9-5.5-9-5.5Z" fill="currentColor" />
                  </svg>
                </span>
                <span className="font-medium">Play the 25s tour</span>
              </span>
            </span>
          </button>
        )}
      </motion.div>
      <p id="video-summary" className="mx-auto mt-4 max-w-2xl text-center text-sm text-ink-muted text-pretty">
        Narrated, with captions. It shows a goal set with Asta, a quick self-rating and skill check, and a plan that
        skips SQL and focuses on the gap.
      </p>
    </section>
  )
}
