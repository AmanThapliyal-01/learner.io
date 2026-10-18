import { useEffect, useRef } from 'react'

import { Alert } from '../../shared/ui/Alert'
import { ButtonLink } from '../../shared/ui/Button'
import { Spinner } from '../../shared/ui/Spinner'
import { formErrorFrom } from '../../shared/forms/errors'
import { useMe } from '../auth/api'
import { useConfirmGoal, useConversation } from './api'
import { Composer, type ComposerHandle } from './Composer'
import { GoalSummaryCard } from './GoalSummaryCard'
import { MessageBubble, TypingIndicator } from './MessageBubble'
import { useAstaChat } from './useAstaChat'

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

  const messages = conversation?.messages ?? []
  const chatting = !conversation?.stage || conversation.stage === 'chatting'
  const lastMessage = messages.at(-1)

  // Keep the newest message in view as Asta streams, unless the user has scrolled up to read.
  useEffect(() => {
    const element = log.current
    if (!element) return
    const nearBottom = element.scrollHeight - element.scrollTop - element.clientHeight < 160
    if (nearBottom || chat.pending?.replyText === '') element.scrollTo({ top: element.scrollHeight, behavior: 'smooth' })
  }, [messages.length, chat.pending?.replyText, chat.pending?.goalSummary])

  const send = async (text: string) => {
    const sent = await chat.send(text)
    if (!sent) composer.current?.setText(text) // give the message back so it can be resent
  }

  if (isPending) return <Spinner className="size-5 text-primary" label="Loading your conversation" />
  if (loadError) return <Alert>We couldn't load your conversation. Refresh to try again.</Alert>

  const firstName = me?.fullName?.split(' ')[0]

  return (
    <section aria-label="Chat with Asta" className="mx-auto flex h-[calc(100dvh-10rem)] min-h-[28rem] max-w-3xl flex-col overflow-hidden rounded-3xl border border-border bg-bg">
      <header className="flex items-center justify-between gap-3 border-b border-border bg-surface px-5 py-3">
        <div>
          <h1 className="font-display text-lg font-semibold">Asta</h1>
          <p className="text-sm text-ink-muted">Your learning guide</p>
        </div>
        <span className="sr-only" aria-live="polite">
          {chat.isStreaming ? 'Asta is replying' : ''}
        </span>
      </header>

      <div ref={log} className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
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
            <Composer ref={composer} disabled={chat.isStreaming} onSend={send} />
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3 py-1">
            <p className="text-sm text-ink">
              <span className="font-medium">Goal confirmed.</span>{' '}
              <span className="text-ink-muted">Next, rate your skills and take a short check.</span>
            </p>
            <ButtonLink to={conversation?.stage === 'rating' ? '/rate' : '/dashboard'}>
              {conversation?.stage === 'rating' ? 'Rate your skills' : 'Back to dashboard'}
            </ButtonLink>
          </div>
        )}
      </footer>
    </section>
  )
}
