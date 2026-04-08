'use client'

import { useState, useEffect, useMemo, useTransition } from 'react'
import { devLog } from '@/lib/logger'
import { useRouter } from 'next/navigation'
import { Building2, Check, Loader2, LogOut, Plus, Search } from 'lucide-react'
import { toast } from 'sonner'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getCookie } from '@/lib/cookies'
import { env } from '@/lib/env'
import {
  selectTenantAction,
  localLogoutAction,
  type LoginTenant,
} from '@/features/auth/actions/local-auth-actions'
import { getErrorMessage } from '@/lib/api/error-handler'

// Show the search input only when the user has more than this many teams.
// Below this threshold scanning visually is faster than typing.
const SEARCH_THRESHOLD = 6

interface PendingState {
  tenants: LoginTenant[]
  error: boolean
}

// Parse tenants from a cookie. Client-only (the cookie is HttpOnly=false but
// only meaningful at the browser); the SSR pass returns null and the page
// shows a stable loading state until the effect runs.
function parsePendingTenants(): PendingState {
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
  const [searchQuery, setSearchQuery] = useState('')

  // Defer cookie parsing to a client effect so SSR and the first client
  // render produce the SAME HTML (the loading card). Without this, the
  // server returns "no tenants → loading state" while the client immediately
  // reads the cookie and renders the "select a team" state, causing a
  // hydration mismatch at the <CardContent> / <CardHeader> level.
  const [pendingState, setPendingState] = useState<PendingState | null>(null)
  useEffect(() => {
    setPendingState(parsePendingTenants())
  }, [])

  // Memoise the empty fallback so the array reference is stable across
  // renders and the filteredTenants useMemo below doesn't recompute on
  // every parent render.
  const tenants = useMemo(() => pendingState?.tenants ?? [], [pendingState])
  const parseError = pendingState?.error ?? false

  // Check if user already has a tenant selected - redirect to dashboard
  useEffect(() => {
    const tenantCookie = getCookie(env.cookies.tenant)
    if (tenantCookie) {
      window.location.href = '/'
    }
  }, [])

  // Handle redirect on error - use effect only for side effects (navigation).
  // The cookie is set with a 1-hour TTL on login, so this normally only fires
  // if the user has been idle on this page for >1 hour. Message is intentional:
  // "session" is misleading because refresh_token is probably still valid —
  // we just lost the cached tenant list. The /login page handles this case
  // gracefully by rendering the login form (NOT redirecting to onboarding).
  useEffect(() => {
    if (parseError) {
      toast.error('Your team list expired. Please sign in again to continue.')
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
        // Brief delay to ensure Set-Cookie headers are fully processed by browser
        // before hard redirect. Without this, dashboard bootstrap may race with
        // cookie initialization and flash a 401 error before auto-recovering.
        await new Promise((resolve) => setTimeout(resolve, 100))
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
      devLog.log('[SelectTenant] Logout redirect:', error)
    }
  }

  // Filter tenants by search query (case-insensitive on name and slug).
  // Memoised so the filter only re-runs when query or list changes.
  const filteredTenants = useMemo(() => {
    if (!searchQuery.trim()) return tenants
    const q = searchQuery.trim().toLowerCase()
    return tenants.filter(
      (t) => t.name.toLowerCase().includes(q) || t.slug.toLowerCase().includes(q)
    )
  }, [tenants, searchQuery])

  const showSearch = tenants.length > SEARCH_THRESHOLD

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
    /*
      Card uses flex column with bounded max-height so the header, search,
      and footer stay visible while only the team list scrolls when the user
      has many teams. Without this, a user with 30+ teams would push the
      "Create new team" and "Sign out" buttons completely off-screen.

      max-height: min(85vh, 720px) — adapts to small screens (mobile) by
      using viewport height, but caps at 720px on large screens so the card
      doesn't stretch ridiculously tall on a 4K monitor.
    */
    <Card className="w-full max-w-md flex flex-col max-h-[min(90vh,720px)] overflow-hidden">
      <CardHeader className="text-center shrink-0 pb-4">
        <CardTitle className="text-xl">Select a Team</CardTitle>
        <CardDescription className="text-sm">
          {tenants.length === 1
            ? 'You have access to one team. Select it to continue.'
            : `You have access to ${tenants.length} teams. Pick one to continue.`}
        </CardDescription>
      </CardHeader>

      {/*
        Search input — fixed (doesn't scroll). Only renders when the user
        has more than SEARCH_THRESHOLD teams; below that scanning is faster
        than typing.
      */}
      {showSearch && (
        <div className="shrink-0 px-6 pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              type="search"
              placeholder="Search teams…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              disabled={isPending || isLoggingOut}
              className="pl-9"
              aria-label="Search teams"
              autoFocus
            />
          </div>
        </div>
      )}

      {/*
        Scrollable team list — this is the only part of the card that
        scrolls. flex-1 + min-h-0 makes it claim the remaining space inside
        the flex column without overflowing the card max-height. The
        negative right margin trick lets the scrollbar sit closer to the
        edge while keeping content padded.
      */}
      <div className="flex-1 min-h-0 overflow-y-auto px-6">
        <div className="space-y-2">
          {filteredTenants.map((tenant) => {
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
                  flex items-center justify-center w-10 h-10 rounded-lg shrink-0
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
                <div className="flex-1 text-left min-w-0">
                  <p className="font-medium truncate">{tenant.name}</p>
                  <p className="text-sm text-muted-foreground truncate">
                    {tenant.slug} · {tenant.role}
                  </p>
                </div>

                {/* Check indicator */}
                {isSelected && !isPending && <Check className="h-5 w-5 text-primary shrink-0" />}
              </button>
            )
          })}

          {/* Empty search state */}
          {filteredTenants.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <p className="text-sm text-muted-foreground">
                No teams match &ldquo;{searchQuery}&rdquo;
              </p>
              <Button variant="link" size="sm" onClick={() => setSearchQuery('')} className="mt-1">
                Clear search
              </Button>
            </div>
          )}
        </div>
      </div>

      {/*
        Footer — fixed (doesn't scroll). Always visible regardless of how
        many teams the user has. Contains the "Create new team" CTA and the
        sign-out escape hatch. pb uses safe-area-inset-bottom on mobile so
        the sign-out button clears the iOS home indicator.
      */}
      <div className="shrink-0 px-6 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] space-y-3">
        {/* Create new team — secondary action with dashed border. Visually
            distinct from the team list above so it reads as "another option"
            rather than "another team". p-3 on mobile (vs p-4) keeps it
            from dominating the small screen. */}
        <button
          onClick={() => router.push('/onboarding/create-team')}
          disabled={isPending || isLoggingOut}
          className={`
            w-full flex items-center gap-3 p-3 sm:p-4 rounded-lg border border-dashed transition-colors
            border-border hover:border-primary hover:bg-muted/30
            ${isPending || isLoggingOut ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
        >
          <div className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-muted shrink-0">
            <Plus className="h-5 w-5" />
          </div>
          <div className="flex-1 text-left min-w-0">
            <p className="font-medium text-sm sm:text-base">Create a new team</p>
            <p className="text-xs sm:text-sm text-muted-foreground truncate">
              Start a fresh workspace for a different organisation
            </p>
          </div>
        </button>

        {/* Sign out */}
        <div className="pt-3 border-t">
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
            <span className="truncate">
              {isLoggingOut ? 'Signing out...' : 'Sign out and use a different account'}
            </span>
          </Button>
        </div>
      </div>
    </Card>
  )
}
