'use client'

import { useUrlParam } from '@/hooks/use-url-param'
import { PasswordTokenForm } from '@/features/auth/components/password-token-form'

/** Forgot-password email link: /reset-password?token=... */
export default function ResetPasswordPage() {
  const token = useUrlParam('token') || ''
  return <PasswordTokenForm mode="reset" token={token} />
}
