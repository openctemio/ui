/**
 * Preferences API Hooks
 *
 * React hooks for managing user preferences
 */

import useSWR from 'swr'
import { get, put } from '@/lib/api/client'
import { userEndpoints } from '@/lib/api/endpoints'
import type { UserPreferences, UpdatePreferencesInput } from '../types/account.types'
import { useCallback, useState } from 'react'

// ============================================
// FETCH PREFERENCES
// ============================================

/**
 * Hook to fetch user preferences
 */
export function usePreferences() {
  const { data, error, isLoading, mutate } = useSWR<UserPreferences>(
    userEndpoints.updatePreferences(),
    (url: string) => get<UserPreferences>(url),
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000, // 1 minute
    }
  )

  return {
    preferences: data,
    isLoading,
    isError: !!error,
    error,
    mutate,
  }
}

// ============================================
// UPDATE PREFERENCES
// ============================================

/**
 * Hook to update user preferences
 */
export function useUpdatePreferences() {
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const updatePreferences = useCallback(
    async (input: UpdatePreferencesInput): Promise<UserPreferences | null> => {
      setIsUpdating(true)
      setError(null)

      try {
        const result = await put<UserPreferences>(userEndpoints.updatePreferences(), input)
        return result
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to update preferences')
        setError(error)
        throw error
      } finally {
        setIsUpdating(false)
      }
    },
    []
  )

  return {
    updatePreferences,
    isUpdating,
    error,
  }
}

// ============================================
// LOCAL PREFERENCES (Client-side only)
// ============================================

const LOCAL_PREFERENCES_KEY = 'user_preferences'

/**
 * Get preferences from localStorage (for immediate UI)
 */
export function getLocalPreferences(): Partial<UserPreferences> | null {
  if (typeof window === 'undefined') return null

  try {
    const stored = localStorage.getItem(LOCAL_PREFERENCES_KEY)
    return stored ? JSON.parse(stored) : null
  } catch {
    return null
  }
}

/**
 * Save preferences to localStorage (for immediate UI)
 */
export function setLocalPreferences(preferences: Partial<UserPreferences>): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem(LOCAL_PREFERENCES_KEY, JSON.stringify(preferences))
  } catch {
    // Ignore localStorage errors
  }
}

/**
 * Hook to manage local preferences with sync
 */
export function useLocalPreferences() {
  const { preferences, mutate, isLoading } = usePreferences()
  const { updatePreferences, isUpdating } = useUpdatePreferences()

  const update = useCallback(
    async (input: UpdatePreferencesInput) => {
      // Optimistically update local storage
      const current = getLocalPreferences() || {}
      const merged = { ...current, ...input }
      if (typeof window !== 'undefined') {
        localStorage.setItem(LOCAL_PREFERENCES_KEY, JSON.stringify(merged))
      }

      // Update server
      try {
        const result = await updatePreferences(input)
        if (result) {
          mutate(result)
          setLocalPreferences(result)
        }
        return result
      } catch (err) {
        // Revert on error
        if (preferences) {
          setLocalPreferences(preferences)
        }
        throw err
      }
    },
    [updatePreferences, mutate, preferences]
  )

  return {
    preferences: preferences || (getLocalPreferences() as UserPreferences | null),
    update,
    isLoading,
    isUpdating,
  }
}
