'use client'

import { useState } from 'react'
import { Globe, Loader2, LogOut, Monitor, Smartphone } from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { EmptyState } from '@/features/shared'
import { getErrorMessage } from '@/lib/api/error-handler'
import { formatDateSafe, formatRelative } from '@/lib/format-date'

import { useRevokeAllSessions, useRevokeSession } from '../api/use-sessions'
import { describeUserAgent, type DeviceKind } from '../lib/user-agent'
import type { Session } from '../types/account.types'

const DEVICE_ICON: Record<DeviceKind, typeof Monitor> = {
  desktop: Monitor,
  mobile: Smartphone,
  other: Globe,
}

interface SessionsCardProps {
  sessions: Session[]
  isLoading: boolean
  onChanged: () => void
}

/**
 * Active sign-ins of the current user. Signing a session out takes effect on
 * that device's next request.
 */
export function SessionsCard({ sessions, isLoading, onChanged }: SessionsCardProps) {
  const { revokeSession, isRevoking } = useRevokeSession()
  const { revokeAllSessions, isRevoking: isRevokingAll } = useRevokeAllSessions()
  const [toRevoke, setToRevoke] = useState<Session | null>(null)
  const [confirmAll, setConfirmAll] = useState(false)

  const ordered = [...sessions].sort((a, b) =>
    a.is_current === b.is_current
      ? b.last_activity_at.localeCompare(a.last_activity_at)
      : a.is_current
        ? -1
        : 1
  )
  const others = sessions.filter((s) => !s.is_current)

  async function revokeOne() {
    if (!toRevoke) return
    try {
      await revokeSession(toRevoke.id)
      toast.success('Session signed out')
      setToRevoke(null)
      onChanged()
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to sign out the session'))
    }
  }

  async function revokeOthers() {
    try {
      await revokeAllSessions()
      toast.success('Signed out of all other sessions')
      setConfirmAll(false)
      onChanged()
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to sign out other sessions'))
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div className="space-y-1.5">
          <CardTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            Sessions
          </CardTitle>
          <CardDescription>Devices signed in to your account.</CardDescription>
        </div>
        {others.length > 0 && (
          <Button variant="outline" size="sm" onClick={() => setConfirmAll(true)}>
            <LogOut className="h-4 w-4" />
            Sign out all others
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : sessions.length === 0 ? (
          <EmptyState icon={Monitor} title="No active sessions" card={false} />
        ) : (
          <ul className="divide-y rounded-md border">
            {ordered.map((s) => {
              const d = describeUserAgent(s.user_agent)
              const Icon = DEVICE_ICON[d.kind]
              return (
                <li key={s.id} className="flex items-center justify-between gap-4 p-4">
                  <div className="flex min-w-0 items-start gap-3">
                    <Icon className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">
                          {d.browser} on {d.os}
                        </span>
                        {s.is_current && <Badge variant="secondary">This device</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {s.ip_address ? (
                          <span className="font-mono">{s.ip_address}</span>
                        ) : (
                          'Unknown IP'
                        )}
                        {' · '}Signed in {formatDateSafe(s.created_at)}
                        {' · '}Last active {formatRelative(s.last_activity_at)}
                      </p>
                    </div>
                  </div>
                  {!s.is_current && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="shrink-0 text-destructive hover:text-destructive"
                      onClick={() => setToRevoke(s)}
                    >
                      Sign out
                    </Button>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>

      <ConfirmDialog
        open={!!toRevoke}
        onOpenChange={(open) => !open && setToRevoke(null)}
        title="Sign out this session?"
        desc="That device is signed out immediately and has to sign in again."
        confirmText={
          <>
            {isRevoking && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
            Sign out
          </>
        }
        destructive
        isLoading={isRevoking}
        handleConfirm={revokeOne}
      />
      <ConfirmDialog
        open={confirmAll}
        onOpenChange={setConfirmAll}
        title="Sign out all other sessions?"
        desc="Every device except this one is signed out immediately."
        confirmText={
          <>
            {isRevokingAll && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
            Sign out all others
          </>
        }
        destructive
        isLoading={isRevokingAll}
        handleConfirm={revokeOthers}
      />
    </Card>
  )
}
