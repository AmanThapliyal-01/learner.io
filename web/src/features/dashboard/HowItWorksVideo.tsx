import { useEffect, useId, useRef, useState } from 'react'

const VIDEO = {
  src: '/assets/video/learner-promo.mp4',
  poster: '/assets/video/learner-promo-poster.jpg',
  captions: '/assets/video/learner-promo.en.vtt',
  seconds: 25,
}

/**
 * "Watch how it works": a native modal with a native video. Nothing loads until it opens (preload="none"),
 * nothing plays until the viewer presses play, and closing pauses it.
 */
export function HowItWorksVideo() {
  const [open, setOpen] = useState(false)
  const dialog = useRef<HTMLDialogElement>(null)
  const video = useRef<HTMLVideoElement>(null)
  const titleId = useId()

  useEffect(() => {
    const element = dialog.current
    if (!element) return
    if (open && !element.open) element.showModal()
    else if (!open && element.open) element.close()
  }, [open])

  // Pause on every way out ourselves rather than wait for the native close event, which isn't always delivered.
  const close = () => {
    video.current?.pause()
    setOpen(false)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-medium text-primary underline-offset-4 hover:underline"
      >
        <svg aria-hidden viewBox="0 0 20 20" className="size-5">
          <circle cx="10" cy="10" r="9" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path d="M8.2 6.8v6.4l5-3.2-5-3.2Z" fill="currentColor" />
        </svg>
        Watch how it works ({VIDEO.seconds}s)
      </button>
      <dialog
        ref={dialog}
        aria-labelledby={titleId}
        onCancel={(event) => {
          event.preventDefault() // Escape: close through state so the video pauses too
          close()
        }}
        onClose={close}
        onClick={(event) => {
          if (event.target === event.currentTarget) close() // a click on the backdrop
        }}
        className="motion-dialog m-auto w-[min(56rem,calc(100vw-2rem))] rounded-2xl border border-border bg-surface p-3 text-ink shadow-xl backdrop:bg-black/60 backdrop:backdrop-blur-[2px] sm:p-4"
      >
        <div className="flex items-center justify-between gap-3 px-1 pb-3">
          <h2 id={titleId} className="font-display text-lg font-semibold">
            How learner.io works
          </h2>
          <button
            type="button"
            onClick={close}
            aria-label="Close video"
            className="flex size-11 items-center justify-center rounded-full text-ink-muted hover:bg-surface-muted hover:text-ink"
          >
            <svg aria-hidden viewBox="0 0 16 16" className="size-4">
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <video
          ref={video}
          src={VIDEO.src}
          poster={VIDEO.poster}
          preload="none"
          controls
          playsInline
          width={1920}
          height={1080}
          className="block aspect-video h-auto w-full rounded-xl bg-black"
        >
          <track kind="captions" src={VIDEO.captions} srcLang="en" label="English" default />
          A 25-second narrated tour: tell Asta your goal, check what you know, and Anbu builds your plan.
        </video>
      </dialog>
    </>
  )
}
