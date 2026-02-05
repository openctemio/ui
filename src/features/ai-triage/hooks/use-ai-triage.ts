'use client'

import { useCallback, useState, useEffect, useRef } from 'react'
import { useTriageResult, useRequestTriage } from '../api'
import type { AITriageResult, TriageStatus } from '../types'

interface UseAITriageOptions {
  /** Initial refresh interval in ms when status is pending/processing (default: 2000) */
  initialRefreshInterval?: number
  /** Maximum refresh interval in ms after exponential backoff (default: 30000) */
  maxRefreshInterval?: number
  /** Backoff multiplier (default: 1.5) */
  backoffMultiplier?: number
  /** Whether to auto-refresh when status is pending/processing (default: true) */
  autoRefresh?: boolean
}

interface UseAITriageReturn {
  /** Current triage result */
  result: AITriageResult | null
  /** Whether the result is loading (first load only) */
  isLoading: boolean
  /** Whether a refresh is in progress */
  isRefreshing: boolean
  /** Error if any */
  error: Error | null
  /** Current status */
  status: TriageStatus | null
  /** Whether triage is in progress (pending or processing) */
  isTriageInProgress: boolean
  /** Request a new triage */
  requestTriage: () => Promise<void>
  /** Whether request is in progress */
  isRequesting: boolean
  /** Refresh the result */
  refresh: () => void
  /** Current polling interval in ms (for debugging) */
  currentInterval: number
}

/**
 * Hook for managing AI triage state with exponential backoff polling.
 *
 * Uses exponential backoff to reduce server load while waiting for triage completion:
 * - Starts with fast polling (2s) for quick responses
 * - Gradually increases interval up to maxRefreshInterval (30s)
 * - Resets to fast polling when a new triage is requested
 */
export function useAITriage(
  findingId: string | null,
  options: UseAITriageOptions = {}
): UseAITriageReturn {
  const {
    initialRefreshInterval = 2000,
    maxRefreshInterval = 30000,
    backoffMultiplier = 1.5,
    autoRefresh = true,
  } = options

  const [isRequesting, setIsRequesting] = useState(false)
  const [shouldRefresh, setShouldRefresh] = useState(false)
  const [currentInterval, setCurrentInterval] = useState(initialRefreshInterval)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const pollCountRef = useRef(0)

  const {
    data: result,
    isLoading,
    error,
    mutate,
    isValidating,
  } = useTriageResult(findingId, {
    refreshInterval: shouldRefresh ? currentInterval : 0,
    onSuccess: () => {
      setIsRefreshing(false)
    },
  })

  const { trigger: triggerRequest } = useRequestTriage(findingId)

  const status = result?.status ?? null
  const isTriageInProgress = status === 'pending' || status === 'processing'

  // Exponential backoff logic
  useEffect(() => {
    if (!shouldRefresh || !isTriageInProgress) {
      // Reset when not polling or triage completes
      pollCountRef.current = 0
      setCurrentInterval(initialRefreshInterval)
      return
    }

    // Apply exponential backoff after each poll
    const nextInterval = Math.min(
      initialRefreshInterval * Math.pow(backoffMultiplier, pollCountRef.current),
      maxRefreshInterval
    )
    setCurrentInterval(nextInterval)
    pollCountRef.current += 1
    setIsRefreshing(isValidating)
  }, [
    shouldRefresh,
    isTriageInProgress,
    isValidating,
    initialRefreshInterval,
    maxRefreshInterval,
    backoffMultiplier,
  ])

  // Update shouldRefresh based on status
  useEffect(() => {
    if (autoRefresh) {
      setShouldRefresh(isTriageInProgress)
    }
  }, [autoRefresh, isTriageInProgress])

  const requestTriage = useCallback(async () => {
    if (!findingId || isRequesting) return

    setIsRequesting(true)
    // Reset backoff when starting new request
    pollCountRef.current = 0
    setCurrentInterval(initialRefreshInterval)
    setShouldRefresh(true) // Start polling after request

    try {
      await triggerRequest({ mode: 'quick' })
      // Refresh the result after requesting
      await mutate()
    } finally {
      setIsRequesting(false)
    }
  }, [findingId, isRequesting, triggerRequest, mutate, initialRefreshInterval])

  const refresh = useCallback(() => {
    setIsRefreshing(true)
    mutate()
  }, [mutate])

  return {
    result: result ?? null,
    isLoading,
    isRefreshing,
    error: error ?? null,
    status,
    isTriageInProgress,
    requestTriage,
    isRequesting,
    refresh,
    currentInterval,
  }
}
