import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from "next/link"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { env } from '@/lib/env'

// Use refactored LoginForm from features directory
import { LoginForm } from '@/features/auth/components/login-form'

interface LoginPageProps {
  searchParams: Promise<{ redirect?: string; returnTo?: string }>
}

export default async function SignIn({ searchParams }: LoginPageProps) {
  // Get redirect URL from search params (support both 'redirect' and 'returnTo')
  const params = await searchParams
  const redirectTo = params.returnTo || params.redirect || '/'

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
    } else {
      // User has no teams but has a specific destination (e.g., invitation)
      // Let them go there first - they can accept invitation and get a tenant
      if (redirectTo.includes('/invitations/')) {
        redirect(redirectTo)
      }
      // Otherwise, redirect to onboarding to create first team
      redirect('/onboarding/create-team')
    }
  }

  return (
    <Card className='gap-4'>
      <CardHeader>
        <CardTitle className='text-lg tracking-tight'>Sign in</CardTitle>
        <CardDescription>
          Enter your email and password below to <br />
          log into your account. Don&apos;t have an account?{' '}
          <Link
            href='/register'
            className='hover:text-primary underline underline-offset-4'
          >
            Sign up
          </Link>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <LoginForm redirectTo={redirectTo} />
      </CardContent>
      <CardFooter>
        <p className='text-muted-foreground px-8 text-center text-sm'>
          By clicking sign in, you agree to our{' '}
          <a
            href='/terms'
            className='hover:text-primary underline underline-offset-4'
          >
            Terms of Service
          </a>{' '}
          and{' '}
          <a
            href='/privacy'
            className='hover:text-primary underline underline-offset-4'
          >
            Privacy Policy
          </a>
          .
        </p>
      </CardFooter>
    </Card>
  )
}
