/** The app's one ease-out curve (also the CSS --ease-out token): fast start, soft landing. */
export const EASE_OUT = [0.23, 1, 0.32, 1] as const

/** Exits are quicker than entrances: the interface answers fast when it is dismissing something. */
export const EXIT = { duration: 0.12, ease: EASE_OUT } as const
