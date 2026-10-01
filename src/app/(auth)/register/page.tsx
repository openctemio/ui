import { Suspense } from 'react'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { env } from '@/lib/env'

import { RegisterGate } from '@/features/auth/components/register-gate'

export default async function SignUp() {
  // Check if user is already authenticated
  const cookieStore = await cookies()
  const hasAuthToken = cookieStore.get(env.auth.cookieName)?.value
  const hasRefreshToken = cookieStore.get(env.auth.refreshCookieName)?.value

  if (hasAuthToken || hasRefreshToken) {
    // User is authenticated - check if they have a tenant
    const hasTenant = cookieStore.get(env.cookies.tenant)?.value
    if (hasTenant) {
      redirect('/')
    } else {
      redirect('/onboarding/create-team')
    }
  }

  // The gate shows the form only when open registration is on or the visitor
  // came from an invitation; otherwise "accounts are created by your admin".
  return (
    <Suspense>
      <RegisterGate />
    </Suspense>
  )
}
