'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
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
import { formatDistanceToNow } from 'date-fns'

export default function SecurityPage() {
  const { profile } = useProfile()
  const { changePassword, isChanging } = useChangePassword()
  const { status: twoFactorStatus, isLoading: is2FALoading } = useTwoFactorStatus()
  const { sessions, isLoading: isSessionsLoading, mutate: mutateSessions } = useSessions()
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
      toast.success('Session revoked')
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
    <div className="grid gap-6">
      {/* Password Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Password
          </CardTitle>
          <CardDescription>
            {isLocalAuth
              ? 'Change your account password'
              : `Your password is managed by ${profile?.auth_provider}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLocalAuth ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm">Use a strong password that you are not using elsewhere</p>
              </div>
              <Button onClick={() => setShowPasswordDialog(true)}>Change Password</Button>
            </div>
          ) : (
            <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
              <Shield className="h-5 w-5 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                To change your password, please visit your {profile?.auth_provider} account
                settings.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Two-Factor Authentication */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Two-Factor Authentication
          </CardTitle>
          <CardDescription>Add an extra layer of security to your account</CardDescription>
        </CardHeader>
        <CardContent>
          {is2FALoading ? (
            <Skeleton className="h-16 w-full" />
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {twoFactorStatus?.enabled ? (
                  <>
                    <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
                      <Check className="h-5 w-5 text-green-500" />
                    </div>
                    <div>
                      <p className="font-medium">Enabled</p>
                      <p className="text-sm text-muted-foreground">
                        Your account is protected with 2FA
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="h-10 w-10 rounded-full bg-yellow-500/10 flex items-center justify-center">
                      <AlertTriangle className="h-5 w-5 text-yellow-500" />
                    </div>
                    <div>
                      <p className="font-medium">Not Enabled</p>
                      <p className="text-sm text-muted-foreground">
                        Enable 2FA to add extra security
                      </p>
                    </div>
                  </>
                )}
              </div>
              <Button
                variant={twoFactorStatus?.enabled ? 'outline' : 'default'}
                onClick={() => toast.info('2FA setup coming soon')}
              >
                {twoFactorStatus?.enabled ? 'Manage 2FA' : 'Enable 2FA'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active Sessions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Monitor className="h-5 w-5" />
                Active Sessions
              </CardTitle>
              <CardDescription>Manage your active login sessions</CardDescription>
            </div>
            {otherSessions.length > 0 && (
              <Button variant="outline" size="sm" onClick={() => setShowRevokeAllDialog(true)}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out All Others
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isSessionsLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : sessions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No active sessions found
            </p>
          ) : (
            <div className="space-y-4">
              {/* Current Session */}
              {currentSession && (
                <>
                  <div className="flex items-start justify-between p-4 border rounded-lg bg-primary/5">
                    <div className="flex items-start gap-4">
                      {(() => {
                        const Icon = getDeviceIcon(currentSession.device)
                        return (
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <Icon className="h-5 w-5 text-primary" />
                          </div>
                        )
                      })()}
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">
                            {currentSession.browser} on {currentSession.os}
                          </p>
                          <Badge variant="secondary" className="text-xs">
                            Current
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {currentSession.ip_address}
                          {currentSession.location && ` • ${currentSession.location}`}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Last active:{' '}
                          {formatDistanceToNow(new Date(currentSession.last_active_at), {
                            addSuffix: true,
                          })}
                        </p>
                      </div>
                    </div>
                  </div>

                  {otherSessions.length > 0 && <Separator />}
                </>
              )}

              {/* Other Sessions */}
              {otherSessions.map((session) => {
                const Icon = getDeviceIcon(session.device)
                return (
                  <div
                    key={session.id}
                    className="flex items-start justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start gap-4">
                      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                        <Icon className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium">
                          {session.browser} on {session.os}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {session.ip_address}
                          {session.location && ` • ${session.location}`}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Last active:{' '}
                          {formatDistanceToNow(new Date(session.last_active_at), {
                            addSuffix: true,
                          })}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setSessionToRevoke(session.id)}
                    >
                      <LogOut className="h-4 w-4" />
                    </Button>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Password Change Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>Enter your current password and choose a new one.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="current-password">Current Password</Label>
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
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                value={passwordForm.new_password}
                onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">At least 8 characters</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm New Password</Label>
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
              {isChanging && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Change Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke Session Dialog */}
      <AlertDialog
        open={!!sessionToRevoke}
        onOpenChange={(open) => !open && setSessionToRevoke(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke Session</AlertDialogTitle>
            <AlertDialogDescription>
              This will sign out the device. You will need to sign in again on that device.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevokeSession}
              disabled={isRevoking}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isRevoking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Revoke
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Revoke All Sessions Dialog */}
      <AlertDialog open={showRevokeAllDialog} onOpenChange={setShowRevokeAllDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign Out All Other Devices</AlertDialogTitle>
            <AlertDialogDescription>
              This will sign out all devices except this one. They will need to sign in again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevokeAllSessions}
              disabled={isRevokingAll}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isRevokingAll && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sign Out All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
