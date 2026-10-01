'use client'

import Link from 'next/link'

import { useCanSelfRegister } from '../hooks/use-can-self-register'
import { registerHref } from '../lib/self-register'

interface SignUpPromptProps {
  /** Where the visitor goes after signing in (an invitation link allows sign-up). */
  returnTo?: string | null
  /** Email to pre-fill on the register form. */
  email?: string | null
}

/**
 * "Don't have an account? Sign up" — rendered only when the visitor may create
 * an account (open registration, or an invitation). Otherwise nothing.
 */
export function SignUpPrompt({ returnTo, email }: SignUpPromptProps) {
  const { canRegister } = useCanSelfRegister(returnTo)
  if (!canRegister) return null
  return (
    <>
      {' '}
      Don&apos;t have an account?{' '}
      <Link
        href={registerHref({ returnTo, email })}
        className="hover:text-primary underline underline-offset-4"
      >
        Sign up
      </Link>
    </>
  )
}
