/**
 * Security API Hooks
 *
 * React hooks for account security management (password, 2FA)
 */

import useSWR from 'swr'
import { get, post } from '@/lib/api/client'
import { userEndpoints } from '@/lib/api/endpoints'
import type {
  ChangePasswordInput,
  RecoveryCodesResponse,
  TwoFactorDisableInput,
  TwoFactorStatus,
  TwoFactorSetupResponse,
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

/**
 * The signed-in user's 2FA status.
 */
export function useTwoFactorStatus() {
  const { data, error, isLoading, mutate } = useSWR<TwoFactorStatus>(
    userEndpoints.twoFactor(),
    (url: string) => get<TwoFactorStatus>(url),
    { revalidateOnFocus: false }
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
 * Wraps one 2FA mutation with a pending flag. Errors are re-thrown so the
 * caller can show them next to the field that caused them.
 */
function useTwoFactorMutation<TArgs extends unknown[], TResult>(
  run: (...args: TArgs) => Promise<TResult>
) {
  const [isPending, setIsPending] = useState(false)
  const mutate = useCallback(
    async (...args: TArgs): Promise<TResult> => {
      setIsPending(true)
      try {
        return await run(...args)
      } finally {
        setIsPending(false)
      }
    },
    [run]
  )
  return { mutate, isPending }
}

const startSetup = () => post<TwoFactorSetupResponse>(userEndpoints.twoFactorSetup())
const enable = async (code: string) =>
  (await post<RecoveryCodesResponse>(userEndpoints.twoFactorEnable(), { code })).recovery_codes
const disable = (input: TwoFactorDisableInput) =>
  post<{ message: string }>(userEndpoints.twoFactorDisable(), input)
const regenerate = async (code: string) =>
  (await post<RecoveryCodesResponse>(userEndpoints.twoFactorRecoveryCodes(), { code }))
    .recovery_codes

/** Generate a new (pending) authenticator secret. */
export function useSetupTwoFactor() {
  const { mutate, isPending } = useTwoFactorMutation(startSetup)
  return { setupTwoFactor: mutate, isSettingUp: isPending }
}

/**
 * Confirm the pending secret with a code. Returns the recovery codes (shown
 * once). The server signs out every other session.
 */
export function useEnableTwoFactor() {
  const { mutate, isPending } = useTwoFactorMutation(enable)
  return { enableTwoFactor: mutate, isEnabling: isPending }
}

/** Turn 2FA off (current password + authenticator or recovery code). */
export function useDisableTwoFactor() {
  const { mutate, isPending } = useTwoFactorMutation(disable)
  return { disableTwoFactor: mutate, isDisabling: isPending }
}

/** Replace all recovery codes (needs an authenticator code). */
export function useRegenerateRecoveryCodes() {
  const { mutate, isPending } = useTwoFactorMutation(regenerate)
  return { regenerateRecoveryCodes: mutate, isRegenerating: isPending }
}
