import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { env } from '@/lib/env'
import { validateRedirectUrl } from '@/lib/redirect'

// Use refactored LoginForm from features directory
import { LoginForm } from '@/features/auth/components/login-form'

interface LoginPageProps {
  searchParams: Promise<{
    redirect?: string
    returnTo?: string
    org?: string
    error?: string
    // Preserved from the invitation flow — when a user clicks an
    // invite link and doesn't have an account, the invitation page
    // redirects to /login?email=alice@co.com&returnTo=/invitations/{token}.
    // The login page passes this email through to the "Sign up" link
    // so the register form can pre-fill it.
    email?: string
  }>
}

export default async function SignIn({ searchParams }: LoginPageProps) {
  // Get redirect URL from search params (support both 'redirect' and 'returnTo')
  const params = await searchParams
  const redirectTo = validateRedirectUrl(params.returnTo || params.redirect, '/')

  // Check if user is already authenticated
  const cookieStore = await cookies()
  const hasAuthToken = cookieStore.get(env.auth.cookieName)?.value
  const hasRefreshToken = cookieStore.get(env.auth.refreshCookieName)?.value

  if (hasAuthToken || hasRefreshToken) {
    // User is authenticated - determine where to redirect
    const hasTenant = cookieStore.get(env.cookies.tenant)?.value
    const hasPendingTenants = cookieStore.get(env.cookies.pendingTenants)?.value

    if (hasTenant) {
      // User has selected a team - redirect to dashboard or specified URL
      redirect(redirectTo)
    } else if (hasPendingTenants) {
      // User has multiple teams but hasn't selected one - redirect to select-tenant
      redirect('/select-tenant')
    } else if (redirectTo.includes('/invitations/')) {
      // Special case: invitation links — let them through with current auth
      // so the invitation acceptance flow can issue a fresh tenant cookie.
      redirect(redirectTo)
    }

    // ⚠️ Dangling auth state: refresh_token exists but no tenant cookie and
    // no pendingTenants cookie. This typically happens when the user logged
    // in with a multi-tenant account, walked away from /select-tenant, and
    // the pendingTenants cookie expired before they picked a team.
    //
    // We CANNOT assume "no tenants" here — the user almost certainly has
    // tenants on the server, we just lost the cached list locally. The
    // previous behaviour (redirect to /onboarding/create-team) caused the
    // user to create a duplicate tenant they didn't want.
    //
    // Instead: fall through and render the login form. The user re-enters
    // credentials, /auth/login returns the tenant list fresh, and the
    // normal flow resumes. The dangling refresh_token is harmless — the
    // successful re-login will overwrite it.
  }

  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle className="text-lg tracking-tight">Sign in</CardTitle>
        <CardDescription>
          Enter your email and password below to <br />
          log into your account. Don&apos;t have an account?{' '}
          <Link
            href={
              params.email ? `/register?email=${encodeURIComponent(params.email)}` : '/register'
            }
            className="hover:text-primary underline underline-offset-4"
          >
            Sign up
          </Link>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <LoginForm redirectTo={redirectTo} orgSlug={params.org} />
      </CardContent>
      <CardFooter>
        <p className="text-muted-foreground px-8 text-center text-sm">
          By clicking sign in, you agree to our{' '}
          <a href="/terms" className="hover:text-primary underline underline-offset-4">
            Terms of Service
          </a>{' '}
          and{' '}
          <a href="/privacy" className="hover:text-primary underline underline-offset-4">
            Privacy Policy
          </a>
          .
        </p>
      </CardFooter>
    </Card>
  )
}
