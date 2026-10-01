'use client'

import { useUrlParam } from '@/hooks/use-url-param'
import { PasswordTokenForm } from '@/features/auth/components/password-token-form'

/**
 * One-time setup link for an account an administrator created:
 * /set-password?token=... (public route — the user has no session yet).
 */
export default function SetPasswordPage() {
  const token = useUrlParam('token') || ''
  return <PasswordTokenForm mode="setup" token={token} />
}
