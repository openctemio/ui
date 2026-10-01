import { cookies } from 'next/headers'

import { env } from '@/lib/env'

import { InvitationView } from './invitation-view'

/**
 * Public invitation page (/invitations/{token}). Readable without a session:
 * an invited person who has no account yet sees the invitation and can sign in
 * or create their account from here.
 */
export default async function InvitationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const cookieStore = await cookies()
  const hasSession = Boolean(
    cookieStore.get(env.auth.cookieName)?.value ||
    cookieStore.get(env.auth.refreshCookieName)?.value
  )
  return <InvitationView token={token} hasSession={hasSession} />
}
