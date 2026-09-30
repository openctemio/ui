'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Key,
  Shield,
  Smartphone,
  Monitor,
  Globe,
  Loader2,
  LogOut,
  AlertTriangle,
  Check,
} from 'lucide-react'
import { toast } from 'sonner'
import { getErrorMessage } from '@/lib/api/error-handler'
import { EmptyState, ErrorState } from '@/features/shared'
import { useProfile } from '@/features/account'
import {
  useChangePassword,
  useTwoFactorStatus,
  useSessions,
  useRevokeSession,
  useRevokeAllSessions,
  getCurrentSession,
  getOtherSessions,
} from '@/features/account'
import { formatRelative } from '@/lib/format-date'

export default function SecurityPage() {
  const { profile } = useProfile()
  const { changePassword, isChanging } = useChangePassword()
  const { status: twoFactorStatus, isLoading: is2FALoading } = useTwoFactorStatus()
  const {
    sessions,
    isLoading: isSessionsLoading,
    error: sessionsError,
    mutate: mutateSessions,
  } = useSessions()
  const { revokeSession, isRevoking } = useRevokeSession()
  const { revokeAllSessions, isRevoking: isRevokingAll } = useRevokeAllSessions()

  // Password change dialog
  const [showPasswordDialog, setShowPasswordDialog] = useState(false)
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  })
  const [passwordError, setPasswordError] = useState('')

  // Session revoke dialog
  const [sessionToRevoke, setSessionToRevoke] = useState<string | null>(null)
  const [showRevokeAllDialog, setShowRevokeAllDialog] = useState(false)

  const isLocalAuth = profile?.auth_provider === 'local'
  const currentSession = getCurrentSession(sessions)
  const otherSessions = getOtherSessions(sessions)

  // Handle password change
  const handleChangePassword = async () => {
    setPasswordError('')

    // Validate
    if (passwordForm.new_password.length < 8) {
      setPasswordError('Password must be at least 8 characters')
      return
    }
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setPasswordError('Passwords do not match')
      return
    }

    try {
      await changePassword(passwordForm)
      setShowPasswordDialog(false)
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' })
      toast.success('Password changed successfully')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to change password'
      setPasswordError(message)
    }
  }

  // Handle session revoke
  const handleRevokeSession = async () => {
    if (!sessionToRevoke) return

    try {
      await revokeSession(sessionToRevoke)
      mutateSessions()
      setSessionToRevoke(null)
      toast.success('Device signed out')
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to revoke session'))
    }
  }

  // Handle revoke all sessions
  const handleRevokeAllSessions = async () => {
    try {
      await revokeAllSessions()
      mutateSessions()
      setShowRevokeAllDialog(false)
      toast.success('All other sessions revoked')
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to revoke sessions'))
    }
  }

  // Get device icon
  const getDeviceIcon = (device: string) => {
    const d = device.toLowerCase()
    if (d.includes('mobile') || d.includes('phone')) return Smartphone
    if (d.includes('desktop') || d.includes('mac') || d.includes('windows')) return Monitor
    return Globe
  }

  return (
    <div className="grid gap-5">
      <Card>
        <CardHeader>
          <CardTitle>Password</CardTitle>
          <CardDescription>
            {isLocalAuth
              ? 'Use a strong password you do not use anywhere else.'
              : `Your password is managed by ${profile?.auth_provider}.`}
          </CardDescription>
          {isLocalAuth && (
            <CardAction>
              <Button variant="outline" size="sm" onClick={() => setShowPasswordDialog(true)}>
                <Key className="h-4 w-4" />
                Change password
              </Button>
            </CardAction>
          )}
        </CardHeader>
        {!isLocalAuth && (
          <CardContent>
            <p className="flex items-start gap-3 text-sm text-muted-foreground">
              <Shield className="mt-0.5 h-4 w-4 shrink-0" />
              To change your password, go to your {profile?.auth_provider} account settings.
            </p>
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Two-factor authentication</CardTitle>
          <CardDescription>A second step at sign-in, on top of your password.</CardDescription>
        </CardHeader>
        <CardContent>
          {is2FALoading ? (
            <Skeleton className="h-12 w-full" />
          ) : (
            <div className="flex items-center gap-3">
              {twoFactorStatus?.enabled ? (
                <>
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-success/10">
                    <Check className="h-5 w-5 text-success" />
                  </div>
                  <div>
                    <p className="font-medium">On</p>
                    <p className="text-sm text-muted-foreground">
                      Your account is protected with two-factor authentication.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-warning/10">
                    <AlertTriangle className="h-5 w-5 text-warning" />
                  </div>
                  <div>
                    <p className="font-medium">Off</p>
                    <p className="text-sm text-muted-foreground">
                      Setting up two-factor authentication from this page is not available yet.
                    </p>
                  </div>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Active sessions</CardTitle>
          <CardDescription>Devices currently signed in to your account.</CardDescription>
          {otherSessions.length > 0 && (
            <CardAction>
              <Button variant="outline" size="sm" onClick={() => setShowRevokeAllDialog(true)}>
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Sign out all others</span>
                <span className="sm:hidden">Sign out others</span>
              </Button>
            </CardAction>
          )}
        </CardHeader>
        <CardContent>
          {isSessionsLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : sessionsError ? (
            <ErrorState
              title="sessions"
              error={sessionsError}
              onRetry={() => void mutateSessions()}
            />
          ) : sessions.length === 0 ? (
            <EmptyState icon={Monitor} title="No active sessions" card={false} />
          ) : (
            <ul className="divide-y rounded-md border">
              {[...(currentSession ? [currentSession] : []), ...otherSessions].map((session) => {
                const Icon = getDeviceIcon(session.device)
                const isCurrent = session.id === currentSession?.id
                return (
                  <li key={session.id} className="flex items-start gap-3 p-3 sm:gap-4 sm:p-4">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">
                          {session.browser} on {session.os}
                        </p>
                        {isCurrent && (
                          <Badge variant="secondary" className="text-xs">
                            This device
                          </Badge>
                        )}
                      </div>
                      <p className="break-all text-sm text-muted-foreground">
                        <span className="font-mono">{session.ip_address}</span>
                        {session.location && ` · ${session.location}`}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Last active {formatRelative(session.last_active_at)}
                      </p>
                    </div>
                    {!isCurrent && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 text-destructive hover:text-destructive"
                        onClick={() => setSessionToRevoke(session.id)}
                        aria-label={`Sign out ${session.browser} on ${session.os}`}
                        title="Sign out this device"
                      >
                        <LogOut className="h-4 w-4" />
                      </Button>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Password Change Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change password</DialogTitle>
            <DialogDescription>Enter your current password and choose a new one.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="current-password">Current password</Label>
              <Input
                id="current-password"
                type="password"
                value={passwordForm.current_password}
                onChange={(e) =>
                  setPasswordForm({ ...passwordForm, current_password: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">New password</Label>
              <Input
                id="new-password"
                type="password"
                value={passwordForm.new_password}
                onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">At least 8 characters</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm new password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={passwordForm.confirm_password}
                onChange={(e) =>
                  setPasswordForm({ ...passwordForm, confirm_password: e.target.value })
                }
              />
            </div>
            {passwordError && <p className="text-sm text-destructive">{passwordError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPasswordDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleChangePassword} disabled={isChanging}>
              {isChanging && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              Change password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke Session Dialog */}
      <ConfirmDialog
        open={!!sessionToRevoke}
        onOpenChange={(open) => !open && setSessionToRevoke(null)}
        title="Sign out this device?"
        desc="This will sign out the device. You will need to sign in again on that device."
        confirmText={
          <>
            {isRevoking && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
            Sign out
          </>
        }
        destructive
        isLoading={isRevoking}
        handleConfirm={handleRevokeSession}
      />

      {/* Revoke All Sessions Dialog */}
      <ConfirmDialog
        open={showRevokeAllDialog}
        onOpenChange={setShowRevokeAllDialog}
        title="Sign out all other devices?"
        desc="This will sign out all devices except this one. They will need to sign in again."
        confirmText={
          <>
            {isRevokingAll && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
            Sign out all
          </>
        }
        destructive
        isLoading={isRevokingAll}
        handleConfirm={handleRevokeAllSessions}
      />
    </div>
  )
}
