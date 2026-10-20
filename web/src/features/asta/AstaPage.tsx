import { useEffect, useRef, useState } from 'react'

import { Alert } from '../../shared/ui/Alert'
import { ButtonLink } from '../../shared/ui/Button'
import { Spinner } from '../../shared/ui/Spinner'
import { formErrorFrom } from '../../shared/forms/errors'
import { useMe } from '../auth/api'
import { clearPlanDraft, readPlanDraft } from '../landing/planDraft'
import { useConfirmGoal, useConversation } from './api'
import { Composer, type ComposerHandle } from './Composer'
import { GoalChecklist } from './GoalChecklist'
import { GoalSummaryCard } from './GoalSummaryCard'
import { MessageBubble, TypingIndicator } from './MessageBubble'
import { useAstaChat } from './useAstaChat'

/** Where to go once the goal is confirmed, by stage. */
const NEXT_STEP = {
  chatting: { hint: '', label: 'Back to dashboard', to: '/dashboard' },
  rating: { hint: 'Next, rate your skills and take a short check.', label: 'Rate your skills', to: '/rate' },
  assessing: { hint: 'Next, finish your skill check.', label: 'Continue the skill check', to: '/assessment' },
  confirmed: { hint: 'Your plan is built from it.', label: 'Open your plan', to: '/plan' },
} as const

const STARTERS = [
  'I want to become an AI engineer',
  "I want to grow in my career but I'm not sure what to learn",
  'I want to learn to draw',
]

export function AstaPage() {
  const { data: me } = useMe()
  const { data: conversation, isPending, error: loadError } = useConversation()
  const chat = useAstaChat()
  const confirm = useConfirmGoal()
  const composer = useRef<ComposerHandle>(null)
  const log = useRef<HTMLDivElement>(null)
  // A first message drafted by the landing demo: offered once, in an empty conversation, for the user to edit and send.
  const [draft] = useState(() => readPlanDraft()?.message)
  useEffect(() => {
    if (draft && conversation) clearPlanDraft()
  }, [draft, conversation])

  const messages = conversation?.messages ?? []
  const chatting = !conversation?.stage || conversation.stage === 'chatting'
  const lastMessage = messages.at(-1)

  // Keep the newest message in view as Asta streams, unless the user has scrolled up to read. "Near the bottom"
  // is tracked on scroll, before new content lands: a tall goal card would otherwise make it look like they scrolled up.
  const followLatest = useRef(true)
  const shownCount = useRef(0)
  useEffect(() => {
    const element = log.current
    if (!element) return
    // History loading in at once jumps straight to the end; new messages and streaming scroll smoothly.
    const jump = messages.length - shownCount.current > 1
    shownCount.current = messages.length
    if (jump || followLatest.current || chat.pending?.replyText === '') {
      element.scrollTo({ top: element.scrollHeight, behavior: jump ? 'instant' : 'smooth' })
      followLatest.current = true
    }
  }, [messages.length, chat.pending?.replyText, chat.pending?.goalSummary])
  const onLogScroll = () => {
    const element = log.current
    if (element) followLatest.current = element.scrollHeight - element.scrollTop - element.clientHeight < 160
  }

  // Screen readers hear each finished reply (not history, not every streamed token), plus the goal card when shown.
  // null until the conversation first loads; '' when it loaded empty.
  const announcedId = useRef<string | null>(null)
  const [announcement, setAnnouncement] = useState('')
  useEffect(() => {
    if (!conversation) return
    const latestId = lastMessage?.id ?? ''
    const isNew = announcedId.current !== null && announcedId.current !== latestId
    announcedId.current = latestId
    if (isNew && lastMessage?.role === 'assistant') {
      setAnnouncement(`Asta: ${lastMessage.content}${lastMessage.goalSummary ? ' Your goal card is below.' : ''}`)
    }
  }, [conversation, lastMessage])

  const send = async (text: string) => {
    const sent = await chat.send(text)
    if (!sent) composer.current?.setText(text) // give the message back so it can be resent
  }

  if (isPending) return <Spinner className="size-5 text-primary" label="Loading your conversation" />
  if (loadError) return <Alert>We couldn't load your conversation. Refresh to try again.</Alert>

  const firstName = me?.fullName?.split(' ')[0]
  const progress = chat.pending?.progress ?? conversation?.progress
  const prefill = messages.length === 0 && !chat.pending ? draft : undefined

  return (
    <section aria-label="Chat with Asta" className="-mx-4 -mt-8 flex h-[calc(100dvh-4rem-3.5rem-env(safe-area-inset-bottom))] min-h-[24rem] flex-col overflow-hidden border-border bg-bg sm:mx-auto sm:mt-0 sm:h-[calc(100dvh-10rem)] sm:max-w-3xl sm:rounded-3xl sm:border">
      <header className="flex items-center justify-between gap-3 border-b border-border bg-surface px-5 py-3">
        <div>
          <h1 className="font-display text-lg font-semibold">Asta</h1>
          <p className="text-sm text-ink-muted">Your learning guide</p>
        </div>
        <span className="sr-only" aria-live="polite">
          {chat.isStreaming ? 'Asta is replying' : announcement}
        </span>
      </header>
      {chatting && progress && progress.length > 0 && <GoalChecklist items={progress} />}

      <div ref={log} onScroll={onLogScroll} className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
        <ol className="flex flex-col gap-5">
          {messages.length === 0 && !chat.pending && (
            <MessageBubble
              role="assistant"
              text={`Hi${firstName ? ` ${firstName}` : ''}! I'm Asta. Tell me what you'd like to learn: a role, a skill, or "not sure yet" is fine too.`}
            >
              <div className="mt-3 flex flex-wrap gap-2">
                {STARTERS.map((starter) => (
                  <button
                    key={starter}
                    type="button"
                    onClick={() => send(starter)}
                    className="min-h-11 rounded-xl border border-border-strong bg-surface px-3.5 text-left text-sm text-ink transition-colors hover:border-primary hover:bg-primary-soft"
                  >
                    {starter}
                  </button>
                ))}
              </div>
            </MessageBubble>
          )}

          {messages.map((message) => (
            <MessageBubble key={message.id} role={message.role} text={message.content}>
              {message.goalSummary && (
                <GoalSummaryCard
                  summary={message.goalSummary}
                  actionable={chatting && message.id === lastMessage?.id && !chat.isStreaming}
                  confirming={confirm.isPending}
                  onConfirm={() => confirm.mutate()}
                  onChange={() => composer.current?.focus('What should change?')}
                />
              )}
            </MessageBubble>
          ))}

          {chat.pending && (
            <>
              <MessageBubble role="user" text={chat.pending.userText} animate />
              {chat.pending.replyText || chat.pending.goalSummary ? (
                <MessageBubble role="assistant" text={chat.pending.replyText} animate>
                  {chat.pending.goalSummary && <GoalSummaryCard summary={chat.pending.goalSummary} actionable={false} />}
                </MessageBubble>
              ) : (
                <TypingIndicator />
              )}
            </>
          )}
        </ol>
      </div>

      <footer className="border-t border-border bg-surface px-4 py-3 sm:px-6">
        {chatting ? (
          <div className="flex flex-col gap-3">
            <Alert>{chat.error ?? formErrorFrom(confirm.error)}</Alert>
            {prefill && <p className="text-sm text-ink-muted">We drafted this from your demo. Edit anything, then send.</p>}
            <Composer ref={composer} disabled={chat.isStreaming} initialText={prefill} onSend={send} />
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3 py-1">
            <p className="text-sm text-ink">
              <span className="font-medium">Goal confirmed.</span>{' '}
              <span className="text-ink-muted">{NEXT_STEP[conversation?.stage ?? 'rating'].hint}</span>
            </p>
            <ButtonLink to={NEXT_STEP[conversation?.stage ?? 'rating'].to}>{NEXT_STEP[conversation?.stage ?? 'rating'].label}</ButtonLink>
          </div>
        )}
      </footer>
    </section>
  )
}
