'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Sparkles, Loader2, AlertCircle, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useHasModule } from '@/features/integrations/api/use-tenant-modules'
import { useTriageChannel } from '@/hooks/use-websocket'
import { useRequestTriage, useTriageResult } from '../api'
import type { TriageStatus } from '../types'

/** WebSocket triage event structure from backend */
interface WSTriageEvent {
  type: 'triage_pending' | 'triage_started' | 'triage_completed' | 'triage_failed'
  triage: {
    id: string
    finding_id: string
    tenant_id: string
    status: TriageStatus
    error_message?: string
  }
}

/** Module ID for AI Triage feature */
const AI_TRIAGE_MODULE = 'ai_triage'

/** Max age in minutes for a triage job to be considered "stuck" */
const STUCK_JOB_TIMEOUT_MINUTES = 5

/**
 * Check if a triage job is stuck (pending/processing for too long)
 * This handles cases where the worker crashed or job was never processed
 */
function isTriageStuck(result: { status: string; createdAt: string } | null | undefined): boolean {
  if (!result) return false
  if (result.status !== 'pending' && result.status !== 'processing') return false

  const createdAt = new Date(result.createdAt)
  const now = new Date()
  const ageMinutes = (now.getTime() - createdAt.getTime()) / (1000 * 60)

  return ageMinutes > STUCK_JOB_TIMEOUT_MINUTES
}

interface AITriageButtonProps {
  findingId: string
  currentStatus?: TriageStatus | null
  onTriageRequested?: () => void
  onTriageCompleted?: () => void
  variant?: 'default' | 'outline' | 'ghost' | 'secondary' | 'ai'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  className?: string
  disabled?: boolean
  /** If true, always show button regardless of module access (for testing) */
  forceShow?: boolean
}

/**
 * AI Triage Button with real-time WebSocket updates.
 *
 * This button automatically checks if the tenant has the `ai_triage` module enabled.
 * Module availability is controlled by the `is_active` field in the modules table.
 * If not enabled, the button will not render (returns null).
 *
 * When triage is requested, receives real-time updates via WebSocket channel `triage:{finding_id}`.
 * Falls back to polling if WebSocket is not connected.
 */
export function AITriageButton({
  findingId,
  currentStatus: initialStatus,
  onTriageRequested,
  onTriageCompleted,
  variant = 'outline',
  size = 'default',
  className,
  disabled,
  forceShow = false,
}: AITriageButtonProps) {
  const [isRequesting, setIsRequesting] = useState(false)
  const [shouldPoll, setShouldPoll] = useState(false)
  const [pollInterval, setPollInterval] = useState(2000)
  const [wsStatus, setWsStatus] = useState<TriageStatus | null>(null)
  const pollCountRef = useRef(0)
  const previousStatusRef = useRef<TriageStatus | null>(null)

  // Check if tenant has AI Triage module enabled (module is_active checked by backend)
  const { hasModule: hasAITriageModule, isLoading: isCheckingModule } =
    useHasModule(AI_TRIAGE_MODULE)

  const { trigger: requestTriage } = useRequestTriage(findingId)

  // Subscribe to WebSocket triage channel for real-time updates
  const { isSubscribed: wsConnected } = useTriageChannel<WSTriageEvent>(findingId, {
    enabled: true,
    onData: (event) => {
      // Update status from WebSocket event
      if (event.triage?.finding_id === findingId) {
        const newStatus = event.triage.status
        setWsStatus(newStatus)

        // Show toast for status transitions
        if (event.type === 'triage_started') {
          toast.info('AI Triage Processing', {
            id: `triage-progress-${findingId}`,
            description: 'AI is now analyzing this finding...',
          })
        } else if (event.type === 'triage_completed') {
          // Dismiss progress toast
          toast.dismiss(`triage-progress-${findingId}`)
          toast.success('AI Triage Completed', {
            id: `triage-result-${findingId}`,
            description: 'Analysis is ready to view.',
          })
          onTriageCompleted?.()
          setShouldPoll(false)
        } else if (event.type === 'triage_failed') {
          // Dismiss progress toast
          toast.dismiss(`triage-progress-${findingId}`)
          toast.error('AI Triage Failed', {
            id: `triage-result-${findingId}`,
            description: event.triage.error_message || 'Please try again.',
          })
          onTriageCompleted?.()
          setShouldPoll(false)
        }
      }
    },
  })

  // Always fetch triage result on mount to check if there's an in-progress triage
  // This ensures the button shows correct state after page reload
  const isInitiallyInProgress = initialStatus === 'pending' || initialStatus === 'processing'

  // Determine polling refresh interval:
  // - If actively polling (user just clicked) and WebSocket not connected: use poll interval
  // - Otherwise: no auto-refresh (initial fetch only, WebSocket handles updates)
  const refreshInterval = shouldPoll && !wsConnected ? pollInterval : 0

  // Always fetch on mount to get current status, then poll only when needed
  const { data: triageResult, mutate } = useTriageResult(findingId, {
    refreshInterval,
    // Revalidate on mount to get latest status (important for page reload)
    revalidateOnMount: true,
  })

  // Check if triage job is stuck (pending/processing for too long)
  const isStuck = isTriageStuck(triageResult)

  // Get current status: WebSocket > polling result > initial prop
  // If job is stuck, treat it as if there's no active triage (allow re-trigger)
  const rawStatus = wsStatus ?? triageResult?.status ?? initialStatus
  const currentStatus = isStuck ? null : rawStatus

  // Debug logging for triage status
  useEffect(() => {
    if (triageResult) {
      console.log('[AITriageButton] Status:', {
        findingId,
        apiStatus: triageResult.status,
        wsStatus,
        currentStatus,
        isStuck,
        createdAt: triageResult.createdAt,
        wsConnected,
      })
    }
  }, [findingId, triageResult, wsStatus, currentStatus, isStuck, wsConnected])

  const isTriageInProgress = currentStatus === 'pending' || currentStatus === 'processing'
  const isDisabled = disabled || isRequesting || isTriageInProgress

  // Exponential backoff for polling (only when WebSocket not connected)
  useEffect(() => {
    if (!shouldPoll || !isTriageInProgress || wsConnected) {
      pollCountRef.current = 0
      setPollInterval(2000)
      return
    }

    // Increase interval: 2s -> 3s -> 4.5s -> 6.75s -> max 10s
    const nextInterval = Math.min(2000 * Math.pow(1.5, pollCountRef.current), 10000)
    setPollInterval(nextInterval)
    pollCountRef.current += 1
  }, [shouldPoll, isTriageInProgress, triageResult, wsConnected])

  // Detect completion from polling result (fallback when WebSocket not connected)
  useEffect(() => {
    // Skip if WebSocket is connected (it handles notifications)
    if (wsConnected) return

    const prevStatus = previousStatusRef.current
    const isNewCompletion = currentStatus === 'completed' && prevStatus !== 'completed'
    const isNewFailure = currentStatus === 'failed' && prevStatus !== 'failed'

    // Stop polling immediately when triage is done
    if (shouldPoll && (currentStatus === 'completed' || currentStatus === 'failed')) {
      setShouldPoll(false)
    }

    // Notify completion when transitioning TO completed/failed
    // Use toast ID to deduplicate (prevent showing same toast from both WebSocket and polling)
    if (isNewCompletion) {
      if (prevStatus === 'pending' || prevStatus === 'processing') {
        toast.success('AI Triage Completed', {
          id: `triage-result-${findingId}`,
          description: 'Analysis is ready to view.',
        })
      }
      onTriageCompleted?.()
    } else if (isNewFailure) {
      if (prevStatus === 'pending' || prevStatus === 'processing') {
        toast.error('AI Triage Failed', {
          id: `triage-result-${findingId}`,
          description: triageResult?.errorMessage || 'Please try again.',
        })
      }
      onTriageCompleted?.()
    }

    previousStatusRef.current = currentStatus ?? null
  }, [currentStatus, triageResult?.errorMessage, onTriageCompleted, shouldPoll, wsConnected])

  // Start polling when status becomes pending/processing (only if WebSocket not connected)
  useEffect(() => {
    if (isTriageInProgress && !shouldPoll && !wsConnected) {
      setShouldPoll(true)
    }
    // Stop polling when WebSocket becomes connected
    if (shouldPoll && wsConnected) {
      setShouldPoll(false)
    }
  }, [isTriageInProgress, shouldPoll, wsConnected])

  // Clear WebSocket status when finding changes
  useEffect(() => {
    setWsStatus(null)
  }, [findingId])

  const handleClick = useCallback(async () => {
    if (isDisabled) return

    setIsRequesting(true)
    // Reset polling state
    pollCountRef.current = 0
    setPollInterval(3000) // Start with 3s interval
    setWsStatus(null) // Clear previous WebSocket status

    try {
      const result = await requestTriage({ mode: 'quick' })

      if (result) {
        toast.success('AI Triage Started', {
          description: "Analysis has been queued. We'll notify you when it completes.",
        })
        // Only start polling if WebSocket is not connected
        if (!wsConnected) {
          setShouldPoll(true)
        }
        previousStatusRef.current = 'pending'
        onTriageRequested?.()
        // Refresh immediately to get pending status
        mutate()
      }
    } catch (error) {
      toast.error('Failed to start AI triage', {
        description: error instanceof Error ? error.message : 'Please try again.',
      })
    } finally {
      setIsRequesting(false)
    }
  }, [isDisabled, requestTriage, onTriageRequested, mutate, wsConnected])

  const getButtonContent = () => {
    if (isRequesting || currentStatus === 'processing') {
      return (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Analyzing...
        </>
      )
    }

    if (currentStatus === 'pending') {
      return (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Queued...
        </>
      )
    }

    if (currentStatus === 'completed') {
      return (
        <>
          <RotateCcw className="h-4 w-4 mr-2" />
          Re-analyze
        </>
      )
    }

    if (currentStatus === 'failed') {
      return (
        <>
          <AlertCircle className="h-4 w-4 mr-2" />
          Retry
        </>
      )
    }

    return (
      <>
        <Sparkles className="h-4 w-4 mr-2" />
        AI Triage
      </>
    )
  }

  const getTooltipContent = () => {
    if (currentStatus === 'pending') {
      return 'AI triage is queued and waiting to process'
    }
    if (currentStatus === 'processing') {
      return 'AI is currently analyzing this finding'
    }
    if (currentStatus === 'completed') {
      return 'Run AI triage again to get updated analysis'
    }
    return 'Analyze this finding with AI to get severity assessment, risk score, and remediation guidance'
  }

  // Determine button styling based on state and variant
  const getButtonStyles = () => {
    // Use AI gradient style for 'ai' variant or when variant is default/outline and not yet triaged
    const useAIStyle = variant === 'ai' || (variant === 'outline' && !currentStatus)

    if (useAIStyle && !isDisabled) {
      // AI-themed gradient: purple to blue
      return cn(
        'bg-gradient-to-r from-violet-600 to-indigo-600',
        'hover:from-violet-500 hover:to-indigo-500',
        'text-white border-0',
        'shadow-sm hover:shadow-md hover:shadow-violet-500/25',
        'transition-all duration-200',
        className
      )
    }

    if (currentStatus === 'completed') {
      return cn(
        'border-green-500/50 text-green-600 hover:bg-green-50 dark:hover:bg-green-950/30',
        className
      )
    }

    if (currentStatus === 'failed') {
      return cn(
        'border-red-500/50 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30',
        className
      )
    }

    return className
  }

  // Don't render if module is not enabled (unless forceShow is true)
  if (!forceShow && !isCheckingModule && !hasAITriageModule) {
    return null
  }

  // Show subtle loading state while checking module access
  if (!forceShow && isCheckingModule) {
    return null // Don't show anything while checking - prevents flash
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={variant === 'ai' ? 'default' : variant}
            size={size}
            className={getButtonStyles()}
            onClick={handleClick}
            disabled={isDisabled}
          >
            {getButtonContent()}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p className="max-w-xs">{getTooltipContent()}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
