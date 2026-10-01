'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ArrowLeft, UserX } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

import { useCanSelfRegister } from '../hooks/use-can-self-register'
import { RegisterForm } from './register-form'

/**
 * The /register page body. Shows the sign-up form only when the server allows
 * open registration or the visitor holds an invitation; otherwise explains that
 * accounts are created by an administrator.
 */
export function RegisterGate() {
  const searchParams = useSearchParams()
  const returnTo = searchParams.get('returnTo')
  const { canRegister, isLoading } = useCanSelfRegister(returnTo)

  if (isLoading) {
    return (
      <Card className="gap-4" aria-busy="true">
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </CardContent>
      </Card>
    )
  }

  if (!canRegister) {
    return (
      <Card className="gap-4">
        <CardHeader>
          <div className="text-muted-foreground mb-2 flex justify-center">
            <UserX className="h-10 w-10" />
          </div>
          <CardTitle className="text-center text-lg tracking-tight">
            Registration is disabled
          </CardTitle>
          <CardDescription className="text-center">
            Accounts are created by your administrator. If you were given a setup or invitation
            link, open it to get started.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full">
            <Link href="/login">
              <ArrowLeft className="h-4 w-4" />
              Back to sign in
            </Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  const loginHref = returnTo ? `/login?returnTo=${encodeURIComponent(returnTo)}` : '/login'

  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle className="text-lg tracking-tight">Create an account</CardTitle>
        <CardDescription>
          Enter your email and password to create an account. <br />
          Already have an account?{' '}
          <Link href={loginHref} className="hover:text-primary underline underline-offset-4">
            Sign in
          </Link>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RegisterForm />
      </CardContent>
      <CardFooter>
        <p className="text-muted-foreground px-8 text-center text-sm">
          By creating an account, you agree to our{' '}
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
