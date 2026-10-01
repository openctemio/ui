'use client'

import {
  PasswordCard,
  SessionsCard,
  TwoFactorCard,
  useProfile,
  useSessions,
} from '@/features/account'

/**
 * My account → Security: password, two-factor authentication and the
 * devices signed in to the account.
 */
export default function SecurityPage() {
  const { profile } = useProfile()
  const { sessions, isLoading, mutate: mutateSessions } = useSessions()

  return (
    <div className="grid gap-5">
      <PasswordCard
        isLocalAccount={profile ? profile.auth_provider === 'local' : true}
        onChanged={() => mutateSessions()}
      />
      <TwoFactorCard email={profile?.email} onOtherSessionsSignedOut={() => mutateSessions()} />
      <SessionsCard sessions={sessions} isLoading={isLoading} onChanged={() => mutateSessions()} />
    </div>
  )
}
