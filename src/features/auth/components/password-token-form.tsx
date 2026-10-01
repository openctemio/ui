/**
 * Choose a password from a one-time token.
 *
 * Two flows share this form and the same API call
 * (POST /auth/reset-password {token, new_password}):
 * - "reset": the forgot-password email link (/reset-password?token=...)
 * - "setup": the one-time link an administrator gives a user they created
 *   (/set-password?token=...)
 * Only the wording and the "get a new link" advice differ.
 */

'use client'

import { useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import Link from 'next/link'
import { ArrowLeft, CheckCircle, Loader2, KeyRound } from 'lucide-react'
import { toast } from 'sonner'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { PasswordInput } from '@/components/password-input'

import { resetPasswordSchema, type ResetPasswordInput } from '../schemas/auth.schema'
import { resetPasswordAction } from '../actions/local-auth-actions'

export type PasswordTokenMode = 'reset' | 'setup'

interface ModeCopy {
  title: string
  description: string
  submit: string
  successTitle: string
  successDescription: string
  invalidTitle: string
  invalidDescription: string
  /** Where to get a new link; null when only an administrator can issue one. */
  newLink: { href: string; label: string } | null
  newLinkHint: string
}

export const PASSWORD_TOKEN_COPY: Record<PasswordTokenMode, ModeCopy> = {
  reset: {
    title: 'Reset password',
    description: 'Enter your new password below.',
    submit: 'Reset password',
    successTitle: 'Password reset successful',
    successDescription:
      'Your password has been updated. You can now sign in with your new password.',
    invalidTitle: 'Invalid reset link',
    invalidDescription:
      'This password reset link is invalid or missing a token. Please request a new one.',
    newLink: { href: '/forgot-password', label: 'Request a new reset link' },
    newLinkHint: '',
  },
  setup: {
    title: 'Set your password',
    description: 'Your administrator created an account for you. Choose a password to sign in.',
    submit: 'Set password',
    successTitle: 'Password set',
    successDescription: 'Your password is set. Sign in to continue.',
    invalidTitle: 'Invalid setup link',
    invalidDescription:
      'This setup link is invalid or missing a token. Ask your administrator for a new setup link.',
    newLink: null,
    newLinkHint: 'Setup links work once and expire. Ask your administrator for a new one.',
  },
}

function isStaleLinkError(message: string) {
  const m = message.toLowerCase()
  return m.includes('expired') || m.includes('invalid')
}

export function PasswordTokenForm({ mode, token }: { mode: PasswordTokenMode; token: string }) {
  const copy = PASSWORD_TOKEN_COPY[mode]
  const [isPending, startTransition] = useTransition()
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const form = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '', token },
  })

  function onSubmit(data: ResetPasswordInput) {
    setError(null)
    startTransition(async () => {
      const result = await resetPasswordAction(data.token, data.password)
      if (result.success) {
        setIsSuccess(true)
        toast.success(copy.successDescription)
      } else {
        const errorMessage = 'error' in result ? result.error : `${copy.submit} failed`
        setError(errorMessage)
        toast.error(errorMessage)
      }
    })
  }

  if (!token) {
    return (
      <Card className="gap-4">
        <CardHeader>
          <CardTitle className="text-lg tracking-tight">{copy.invalidTitle}</CardTitle>
          <CardDescription>{copy.invalidDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" asChild>
            {copy.newLink ? (
              <Link href={copy.newLink.href}>{copy.newLink.label}</Link>
            ) : (
              <Link href="/login">
                <ArrowLeft className="h-4 w-4" />
                Back to sign in
              </Link>
            )}
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (isSuccess) {
    return (
      <Card className="gap-4">
        <CardHeader>
          <div className="text-primary mb-2 flex justify-center">
            <CheckCircle className="h-10 w-10" />
          </div>
          <CardTitle className="text-center text-lg tracking-tight">{copy.successTitle}</CardTitle>
          <CardDescription className="text-center">{copy.successDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full">
            <Link href="/login">
              <ArrowLeft className="h-4 w-4" />
              {mode === 'setup' ? 'Sign in' : 'Back to sign in'}
            </Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle className="text-lg tracking-tight">{copy.title}</CardTitle>
        <CardDescription>{copy.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-3">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>
                  <p>{error}</p>
                  {isStaleLinkError(error) &&
                    (copy.newLink ? (
                      <Link
                        href={copy.newLink.href}
                        className="text-primary hover:text-primary/80 mt-2 inline-block text-sm underline underline-offset-4"
                      >
                        {copy.newLink.label}
                      </Link>
                    ) : (
                      <p className="mt-2">{copy.newLinkHint}</p>
                    ))}
                </AlertDescription>
              </Alert>
            )}

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{mode === 'setup' ? 'Password' : 'New password'}</FormLabel>
                  <FormControl>
                    <PasswordInput
                      placeholder={mode === 'setup' ? 'Choose a password' : 'Enter new password'}
                      autoComplete="new-password"
                      disabled={isPending}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm password</FormLabel>
                  <FormControl>
                    <PasswordInput
                      placeholder="Confirm password"
                      autoComplete="new-password"
                      disabled={isPending}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button className="mt-2" disabled={isPending} type="submit">
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <KeyRound className="h-4 w-4" />
              )}
              {copy.submit}
            </Button>

            <Button variant="link" size="sm" asChild className="mt-1">
              <Link href="/login">
                <ArrowLeft className="h-4 w-4" />
                Back to sign in
              </Link>
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
