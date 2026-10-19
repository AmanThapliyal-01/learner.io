import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router'

import { api } from '../../shared/api/client'
import { formErrorFrom } from '../../shared/forms/errors'
import { Button } from '../../shared/ui/Button'
import type { Variant } from '../../shared/ui/buttonStyles'
import { ConfirmDialog } from '../../shared/ui/ConfirmDialog'

/** Archives the goal, skill check and plan (PRD FR-12), then starts a new conversation with Asta. */
export function ChangeGoalButton({ variant = 'ghost' }: { variant?: Variant }) {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const change = useMutation({
    mutationFn: () => api.post<void>('/api/goal/change'),
    onSuccess: () => {
      // Everything except the session belongs to the old goal.
      queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== 'auth' })
      setOpen(false)
      navigate('/asta')
    },
  })

  return (
    <>
      <Button variant={variant} onClick={() => setOpen(true)}>
        Change goal
      </Button>
      <ConfirmDialog
        open={open}
        title="Change your goal?"
        confirmLabel="Change goal"
        busy={change.isPending}
        error={formErrorFrom(change.error)}
        onCancel={() => {
          change.reset()
          setOpen(false)
        }}
        onConfirm={() => change.mutate()}
      >
        Your current goal, skill check and plan will be archived, and you'll start fresh with Asta. This can't be undone.
      </ConfirmDialog>
    </>
  )
}
