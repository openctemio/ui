'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { CheckCircle, Eye, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Can, Permission } from '@/lib/permissions'
import { getErrorMessage } from '@/lib/api/error-handler'
import { summarizeEvaluation } from '../charter-outcome'
import { transitionCycle, type CycleTransition } from '../api'
import type { CtemCycle } from '../types'

const COPY: Record<
  CycleTransition,
  { label: string; title: string; body: string; done: string; icon: typeof Play }
> = {
  activate: {
    label: 'Activate',
    title: 'Activate this cycle?',
    body: 'Activating freezes the charter and snapshots the current asset scope (the assets of the in-scope services, or every asset when none is chosen). The scope cannot be changed afterwards.',
    done: 'Cycle activated',
    icon: Play,
  },
  review: {
    label: 'Start review',
    title: 'Move to review?',
    body: 'The cycle stops taking new findings into scope and enters review. You can still close it afterwards.',
    done: 'Cycle moved to review',
    icon: Eye,
  },
  close: {
    label: 'Close cycle',
    title: 'Close this cycle?',
    body: 'Closing is irreversible: the charter success criteria are evaluated and the cycle and its scope snapshot become read-only.',
    done: 'Cycle closed',
    icon: CheckCircle,
  },
}

/** The one transition a cycle can take next, if any. */
export function nextTransition(status: CtemCycle['status']): CycleTransition | null {
  if (status === 'planning') return 'activate'
  if (status === 'active') return 'review'
  if (status === 'review') return 'close'
  return null
}

/**
 * The cycle's next lifecycle step as the page's primary action, behind a
 * confirmation (each step is irreversible). Transitions use their dedicated
 * endpoints, which snapshot scope (activate) and evaluate the charter (close).
 */
export function CycleLifecycleAction({
  cycle,
  onDone,
}: {
  cycle: CtemCycle
  onDone: (updated: CtemCycle | undefined, action: CycleTransition) => void
}) {
  const action = nextTransition(cycle.status)
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  if (!action) return null
  const copy = COPY[action]
  const Icon = copy.icon

  const run = async () => {
    setConfirming(false)
    setBusy(true)
    try {
      const updated = await transitionCycle(cycle.id, action)
      const outcome = action === 'close' ? summarizeEvaluation(updated?.charter_evaluation) : null
      toast.success(outcome ? `${copy.done}: ${outcome.toLowerCase()}` : copy.done)
      onDone(updated, action)
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to update the cycle'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Can permission={Permission.CTEMCyclesWrite}>
        <Button size="sm" onClick={() => setConfirming(true)} disabled={busy}>
          <Icon className="me-2 h-4 w-4" />
          {copy.label}
        </Button>
      </Can>
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={copy.title}
        desc={
          <>
            <span className="block font-medium text-foreground">Cycle: {cycle.name}</span>
            <span className="mt-2 block">{copy.body}</span>
          </>
        }
        confirmText={copy.label}
        handleConfirm={run}
      />
    </>
  )
}
