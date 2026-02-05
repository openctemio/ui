/**
 * Security API Hooks
 *
 * React hooks for account security management (password, 2FA)
 */

import useSWR from 'swr'
import { get, post, del } from '@/lib/api/client'
import { userEndpoints } from '@/lib/api/endpoints'
import type {
  ChangePasswordInput,
  TwoFactorStatus,
  TwoFactorSetupResponse,
  TwoFactorVerifyInput,
} from '../types/account.types'
import { useCallback, useState } from 'react'

// ============================================
// PASSWORD
// ============================================

/**
 * Hook to change user password
 */
export function useChangePassword() {
  const [isChanging, setIsChanging] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const changePassword = useCallback(async (input: ChangePasswordInput): Promise<boolean> => {
    setIsChanging(true)
    setError(null)

    try {
      await post(userEndpoints.changePassword(), {
        current_password: input.current_password,
        new_password: input.new_password,
      })
      return true
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to change password')
      setError(error)
      throw error
    } finally {
      setIsChanging(false)
    }
  }, [])

  return {
    changePassword,
    isChanging,
    error,
  }
}

// ============================================
// TWO-FACTOR AUTHENTICATION
// ============================================

const TWO_FACTOR_ENDPOINT = '/api/v1/users/me/2fa'

/**
 * Hook to get 2FA status
 */
export function useTwoFactorStatus() {
  const { data, error, isLoading, mutate } = useSWR<TwoFactorStatus>(
    TWO_FACTOR_ENDPOINT,
    (url: string) => get<TwoFactorStatus>(url),
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000,
    }
  )

  return {
    status: data,
    isLoading,
    isError: !!error,
    error,
    mutate,
  }
}

/**
 * Hook to setup 2FA
 */
export function useSetupTwoFactor() {
  const [isSettingUp, setIsSettingUp] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const setupTwoFactor = useCallback(async (): Promise<TwoFactorSetupResponse | null> => {
    setIsSettingUp(true)
    setError(null)

    try {
      const result = await post<TwoFactorSetupResponse>(`${TWO_FACTOR_ENDPOINT}/setup`)
      return result
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to setup 2FA')
      setError(error)
      throw error
    } finally {
      setIsSettingUp(false)
    }
  }, [])

  return {
    setupTwoFactor,
    isSettingUp,
    error,
  }
}

/**
 * Hook to verify and enable 2FA
 */
export function useVerifyTwoFactor() {
  const [isVerifying, setIsVerifying] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const verifyTwoFactor = useCallback(async (input: TwoFactorVerifyInput): Promise<boolean> => {
    setIsVerifying(true)
    setError(null)

    try {
      await post(`${TWO_FACTOR_ENDPOINT}/verify`, input)
      return true
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to verify 2FA code')
      setError(error)
      throw error
    } finally {
      setIsVerifying(false)
    }
  }, [])

  return {
    verifyTwoFactor,
    isVerifying,
    error,
  }
}

/**
 * Hook to disable 2FA
 */
export function useDisableTwoFactor() {
  const [isDisabling, setIsDisabling] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const disableTwoFactor = useCallback(async (password: string): Promise<boolean> => {
    setIsDisabling(true)
    setError(null)

    try {
      await del(TWO_FACTOR_ENDPOINT, { password })
      return true
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to disable 2FA')
      setError(error)
      throw error
    } finally {
      setIsDisabling(false)
    }
  }, [])

  return {
    disableTwoFactor,
    isDisabling,
    error,
  }
}
