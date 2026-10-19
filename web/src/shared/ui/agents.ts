/** learner.io's two agents: Asta talks with you; Anbu builds your plan in the background. */
export const AGENTS = {
  asta: { name: 'Asta', role: 'Talks with you and pins down your goal' },
  anbu: { name: 'Anbu', role: 'Reads your skill check, skips what you know and maps the gap into phases' },
} as const

export type AgentName = keyof typeof AGENTS
