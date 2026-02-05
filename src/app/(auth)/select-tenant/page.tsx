'use client'

import { useState, useEffect, useTransition, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Building2, Check, Loader2, LogOut } from 'lucide-react'
import { toast } from 'sonner'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { getCookie } from '@/lib/cookies'
import { env } from '@/lib/env'
import {
  selectTenantAction,
  localLogoutAction,
  type LoginTenant,
} from '@/features/auth/actions/local-auth-actions'
import { getErrorMessage } from '@/lib/api/error-handler'

// Parse tenants from cookie - done outside component to avoid re-parsing
function parsePendingTenants(): { tenants: LoginTenant[]; error: boolean } {
  if (typeof window === 'undefined') {
    return { tenants: [], error: false }
  }
  const pendingTenantsStr = getCookie(env.cookies.pendingTenants)
  if (!pendingTenantsStr) {
    return { tenants: [], error: true }
  }
  try {
    const parsed = JSON.parse(pendingTenantsStr) as LoginTenant[]
    return { tenants: parsed, error: false }
  } catch {
    return { tenants: [], error: true }
  }
}

export default function SelectTenantPage() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  // Parse tenants once using useMemo
  const { tenants, error: parseError } = useMemo(() => parsePendingTenants(), [])

  // Check if user already has a tenant selected - redirect to dashboard
  useEffect(() => {
    const tenantCookie = getCookie(env.cookies.tenant)
    if (tenantCookie) {
      window.location.href = '/'
    }
  }, [])

  // Handle redirect on error - use effect only for side effects (navigation)
  useEffect(() => {
    if (parseError) {
      toast.error('Session expired. Please login again.')
      router.push('/login')
    }
  }, [parseError, router])

  // Handle tenant selection
  function handleSelectTenant(tenantId: string) {
    setSelectedId(tenantId)
    startTransition(async () => {
      const result = await selectTenantAction(tenantId)

      if (result.success) {
        toast.success('Team selected successfully')
        // Use full page reload to ensure cookies are picked up
        // router.push() doesn't work reliably after server action sets cookies
        window.location.href = '/'
      } else {
        setSelectedId(null)
        toast.error(getErrorMessage(result.error, 'Failed to select team'))
      }
    })
  }

  // Handle cancel/logout
  async function handleCancel() {
    setIsLoggingOut(true)
    // Use server action to properly clear all httpOnly cookies
    try {
      await localLogoutAction('/login')
    } catch (error) {
      // localLogoutAction uses redirect() which throws, this is expected
      console.log('[SelectTenant] Logout redirect:', error)
    }
  }

  // Show loading if parsing or redirecting due to error
  if (parseError || tenants.length === 0) {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-xl">Select a Team</CardTitle>
        <CardDescription>
          You have access to multiple teams. Please select one to continue.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Tenant List */}
        <div className="space-y-2">
          {tenants.map((tenant) => {
            const isSelected = selectedId === tenant.id
            const isDisabled = isPending

            return (
              <button
                key={tenant.id}
                onClick={() => handleSelectTenant(tenant.id)}
                disabled={isDisabled}
                className={`
                  w-full flex items-center gap-3 p-4 rounded-lg border transition-colors
                  ${
                    isSelected
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50 hover:bg-muted/50'
                  }
                  ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
              >
                {/* Icon */}
                <div
                  className={`
                  flex items-center justify-center w-10 h-10 rounded-lg
                  ${isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted'}
                `}
                >
                  {isSelected && isPending ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Building2 className="h-5 w-5" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 text-left">
                  <p className="font-medium">{tenant.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {tenant.slug} · {tenant.role}
                  </p>
                </div>

                {/* Check indicator */}
                {isSelected && !isPending && <Check className="h-5 w-5 text-primary" />}
              </button>
            )
          })}
        </div>

        {/* Cancel Button */}
        <div className="pt-4 border-t">
          <Button
            variant="ghost"
            className="w-full"
            onClick={handleCancel}
            disabled={isPending || isLoggingOut}
          >
            {isLoggingOut ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <LogOut className="h-4 w-4 mr-2" />
            )}
            {isLoggingOut ? 'Signing out...' : 'Sign out and use a different account'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
