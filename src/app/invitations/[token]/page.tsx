'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Building2, Check, Loader2, X, LogIn, Clock, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'

interface InvitationData {
  invitation: {
    id: string
    email: string
    role: string
    pending: boolean
    expires_at: string
    invited_by?: string
    inviter_name?: string
  }
  tenant: {
    id: string
    name: string
    slug: string
  }
}

export default function InvitationPage() {
  const router = useRouter()
  const params = useParams()
  const token = params.token as string

  const [isPending, startTransition] = useTransition()
  const [isLoading, setIsLoading] = useState(true)
  const [invitation, setInvitation] = useState<InvitationData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [acceptError, setAcceptError] = useState<string | null>(null)

  // Fetch invitation details using public preview endpoint
  useEffect(() => {
    async function fetchInvitation() {
      try {
        // Use public preview endpoint (no auth required)
        const previewResponse = await fetch(`/api/v1/invitations/${token}/preview`)

        if (!previewResponse.ok) {
          if (previewResponse.status === 404) {
            setError('Invitation not found or has expired')
          } else {
            const data = await previewResponse.json()
            setError(data.message || 'Failed to load invitation')
          }
          return
        }

        const data = await previewResponse.json()
        setInvitation(data)
      } catch {
        setError('Failed to load invitation. Please try again.')
      } finally {
        setIsLoading(false)
      }
    }

    if (token) {
      fetchInvitation()
    }
  }, [token])

  // Accept invitation - tries access token first, then refresh token
  function handleAccept() {
    setAcceptError(null)
    startTransition(async () => {
      try {
        // First try with access token (for users with tenant)
        const response = await fetch(`/api/v1/invitations/${token}/accept`, {
          method: 'POST',
          credentials: 'include',
        })

        if (response.ok) {
          toast.success('You have joined the team!')
          window.location.href = '/dashboard'
          return
        }

        // If 401, try with refresh token (for users without tenant)
        if (response.status === 401) {
          const refreshResponse = await fetch(`/api/v1/invitations/${token}/accept-with-refresh`, {
            method: 'POST',
            credentials: 'include',
          })

          if (refreshResponse.ok) {
            toast.success('You have joined the team!')
            window.location.href = '/dashboard'
            return
          }

          if (refreshResponse.status === 401) {
            // No valid session - redirect to login (use window.location for full page reload)
            window.location.href = `/login?returnTo=/invitations/${token}&email=${encodeURIComponent(invitation?.invitation.email || '')}`
            return
          }

          // Other error from refresh endpoint
          const refreshData = await refreshResponse.json()
          const errorMsg = refreshData.message || 'Failed to accept invitation'
          setAcceptError(errorMsg)
          toast.error(errorMsg)
          return
        }

        // Other error from regular accept
        const data = await response.json()
        const errorMsg = data.message || 'Failed to accept invitation'
        setAcceptError(errorMsg)
        toast.error(errorMsg)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to accept invitation'
        setAcceptError(message)
        toast.error(message)
      }
    })
  }

  // Decline invitation
  function handleDecline() {
    startTransition(async () => {
      try {
        const response = await fetch(`/api/v1/invitations/${token}/decline`, {
          method: 'POST',
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.message || 'Failed to decline invitation')
        }

        toast.success('Invitation declined')
        router.push('/')
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to decline invitation'
        toast.error(message)
        // Still redirect to home even if decline fails
        router.push('/')
      }
    })
  }

  // Calculate days until expiry
  function getDaysUntilExpiry(): number {
    if (!invitation) return 0
    const expiryDate = new Date(invitation.invitation.expires_at)
    const now = new Date()
    const diffTime = expiryDate.getTime() - now.getTime()
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Skeleton className="h-8 w-48 mx-auto mb-2" />
            <Skeleton className="h-4 w-64 mx-auto" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle className="text-xl">Invitation Error</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <div className="flex flex-col gap-2">
              <Button variant="outline" className="w-full" onClick={() => router.push('/login')}>
                <LogIn className="mr-2 h-4 w-4" />
                Go to Login
              </Button>
              <Button variant="ghost" className="w-full" onClick={() => router.push('/')}>
                Go to Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Invitation expired or already accepted
  if (invitation && !invitation.invitation.pending) {
    const isExpired = new Date(invitation.invitation.expires_at) < new Date()
    const statusText = isExpired ? 'Expired' : 'Already Accepted'
    const StatusIcon = isExpired ? Clock : Check

    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className={`mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full ${isExpired ? 'bg-yellow-500/10' : 'bg-green-500/10'}`}>
              <StatusIcon className={`h-6 w-6 ${isExpired ? 'text-yellow-500' : 'text-green-500'}`} />
            </div>
            <CardTitle className="text-xl">Invitation {statusText}</CardTitle>
            <CardDescription>
              {isExpired
                ? 'This invitation has expired. Please contact the team admin for a new invitation.'
                : 'This invitation has already been accepted.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Team Info */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium">{invitation.tenant.name}</p>
                <p className="text-sm text-muted-foreground capitalize">{invitation.invitation.role}</p>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Button className="w-full" onClick={() => router.push('/login')}>
                <LogIn className="mr-2 h-4 w-4" />
                Go to Login
              </Button>
              <Button variant="ghost" className="w-full" onClick={() => router.push('/')}>
                Go to Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const daysUntilExpiry = getDaysUntilExpiry()

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <Building2 className="h-7 w-7 text-primary" />
          </div>
          <CardTitle className="text-xl">Team Invitation</CardTitle>
          <CardDescription>
            You&apos;ve been invited to join a team
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          {/* Team Info Card */}
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-start gap-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary text-primary-foreground font-bold text-lg">
                {invitation?.tenant.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-lg truncate">{invitation?.tenant.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className="capitalize">
                    {invitation?.invitation.role}
                  </Badge>
                  {daysUntilExpiry <= 3 && daysUntilExpiry > 0 && (
                    <Badge variant="outline" className="text-yellow-600 border-yellow-600/50">
                      <Clock className="h-3 w-3 mr-1" />
                      Expires in {daysUntilExpiry} day{daysUntilExpiry > 1 ? 's' : ''}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Invitation Details */}
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-muted-foreground">Invited by</span>
              <span className="font-medium">{invitation?.invitation.inviter_name || 'A team member'}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-muted-foreground">Invitation for</span>
              <span className="font-medium">{invitation?.invitation.email}</span>
            </div>
          </div>

          {/* Accept Error */}
          {acceptError && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Cannot accept invitation</AlertTitle>
              <AlertDescription>{acceptError}</AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col gap-2">
            <Button
              className="w-full"
              size="lg"
              onClick={handleAccept}
              disabled={isPending}
            >
              {isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Check className="mr-2 h-4 w-4" />
              )}
              Accept Invitation
            </Button>

            <Button
              variant="outline"
              className="w-full"
              onClick={handleDecline}
              disabled={isPending}
            >
              <X className="mr-2 h-4 w-4" />
              Decline
            </Button>
          </div>

          {/* Switch account link */}
          <p className="text-xs text-center text-muted-foreground">
            Not <strong>{invitation?.invitation.email}</strong>?{' '}
            <button
              type="button"
              className="text-primary hover:underline"
              onClick={() => router.push(`/login?returnTo=/invitations/${token}&email=${encodeURIComponent(invitation?.invitation.email || '')}`)}
            >
              Log in with different account
            </button>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
