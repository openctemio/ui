/**
 * Session API Hooks
 *
 * React hooks for managing user sessions
 */

import useSWR from 'swr'
import { get, del } from '@/lib/api/client'
import { userEndpoints } from '@/lib/api/endpoints'
import type { Session, SessionListResponse } from '../types/account.types'
import { useCallback, useState } from 'react'

// ============================================
// FETCH SESSIONS
// ============================================

/**
 * Hook to fetch user's active sessions
 */
export function useSessions() {
  const { data, error, isLoading, mutate } = useSWR<SessionListResponse>(
    userEndpoints.sessions(),
    (url: string) => get<SessionListResponse>(url),
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000, // 30 seconds
    }
  )

  return {
    sessions: data?.data || [],
    total: data?.total || 0,
    isLoading,
    isError: !!error,
    error,
    mutate,
  }
}

// ============================================
// REVOKE SESSION
// ============================================

/**
 * Hook to revoke a specific session
 */
export function useRevokeSession() {
  const [isRevoking, setIsRevoking] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const revokeSession = useCallback(async (sessionId: string): Promise<boolean> => {
    setIsRevoking(true)
    setError(null)

    try {
      await del(userEndpoints.revokeSession(sessionId))
      return true
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to revoke session')
      setError(error)
      throw error
    } finally {
      setIsRevoking(false)
    }
  }, [])

  return {
    revokeSession,
    isRevoking,
    error,
  }
}

/**
 * Hook to revoke all sessions except current
 */
export function useRevokeAllSessions() {
  const [isRevoking, setIsRevoking] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const revokeAllSessions = useCallback(async (): Promise<boolean> => {
    setIsRevoking(true)
    setError(null)

    try {
      await del(userEndpoints.revokeAllSessions())
      return true
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to revoke all sessions')
      setError(error)
      throw error
    } finally {
      setIsRevoking(false)
    }
  }, [])

  return {
    revokeAllSessions,
    isRevoking,
    error,
  }
}

// ============================================
// CURRENT SESSION
// ============================================

/**
 * Get current session from list
 */
export function getCurrentSession(sessions: Session[]): Session | undefined {
  return sessions.find((s) => s.is_current)
}

/**
 * Get other sessions (excluding current)
 */
export function getOtherSessions(sessions: Session[]): Session[] {
  return sessions.filter((s) => !s.is_current)
}
