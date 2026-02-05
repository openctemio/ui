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

// Use refactored RegisterForm from features directory
import { RegisterForm } from '@/features/auth/components/register-form'

export default async function SignUp() {
  // Check if user is already authenticated
  const cookieStore = await cookies()
  const hasAuthToken = cookieStore.get(env.auth.cookieName)?.value
  const hasRefreshToken = cookieStore.get(env.auth.refreshCookieName)?.value

  if (hasAuthToken || hasRefreshToken) {
    // User is authenticated - check if they have a tenant
    const hasTenant = cookieStore.get(env.cookies.tenant)?.value
    if (hasTenant) {
      redirect('/')
    } else {
      redirect('/onboarding/create-team')
    }
  }

  return (
    <Card className='gap-4'>
        <CardHeader>
          <CardTitle className='text-lg tracking-tight'>
            Create an account
          </CardTitle>
          <CardDescription>
            Enter your email and password to create an account. <br />
            Already have an account?{' '}
            <Link
              href='/login'
              className='hover:text-primary underline underline-offset-4'
            >
              Sign In
            </Link>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RegisterForm />
        </CardContent>
        <CardFooter>
          <p className='text-muted-foreground px-8 text-center text-sm'>
            By creating an account, you agree to our{' '}
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
