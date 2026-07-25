'use client'

import { AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ErrorStateProps {
  /** What failed to load, e.g. "SAML configuration". Phrased into "Failed to load {title}". */
  title: string
  /** The caught error; its message is shown when available. */
  error?: unknown
  /** Retry handler — usually the SWR `mutate` for the failed key. */
  onRetry?: () => void
}

/**
 * Shown when a read fails. Without it, a failed fetch leaves `data` undefined and
 * the page renders its empty state instead — telling the user "nothing here" when
 * the truth is "we could not find out". That misreads badly on security settings
 * (no SSO configured / no verified domains / no API keys) and can lead an admin to
 * re-create something that already exists, or to save over a config they never saw.
 *
 * Mirrors the inline error card already used by the *-section components.
 */
export function ErrorState({ title, error, onRetry }: ErrorStateProps) {
  return (
    <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4">
      <div className="flex items-center gap-2 text-red-500">
        <AlertCircle className="h-4 w-4" />
        <span className="text-sm font-medium">Failed to load {title}</span>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        {error instanceof Error ? error.message : 'An unexpected error occurred'}
      </p>
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-2" onClick={onRetry}>
          <RefreshCw className="me-2 h-4 w-4" />
          Retry
        </Button>
      )}
    </div>
  )
}
