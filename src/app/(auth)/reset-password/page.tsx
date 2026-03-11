'use client'

import { useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ArrowLeft, CheckCircle, Loader2, KeyRound } from 'lucide-react'
import { toast } from 'sonner'

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

import { resetPasswordSchema, type ResetPasswordInput } from '@/features/auth/schemas/auth.schema'
import { resetPasswordAction } from '@/features/auth/actions/local-auth-actions'

export default function ResetPasswordPage() {
  const [isPending, startTransition] = useTransition()
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const searchParams = useSearchParams()

  const token = searchParams.get('token') || ''

  const form = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
      token,
    },
  })

  function onSubmit(data: ResetPasswordInput) {
    startTransition(async () => {
      const result = await resetPasswordAction(data.token, data.password)

      if (result.success) {
        setIsSuccess(true)
        toast.success(result.message)
      } else {
        const errorMessage = 'error' in result ? result.error : 'Password reset failed'
        setError(errorMessage)
        toast.error(errorMessage)
      }
    })
  }

  if (!token) {
    return (
      <Card className="gap-4">
        <CardHeader>
          <CardTitle className="text-lg tracking-tight">Invalid reset link</CardTitle>
          <CardDescription>
            This password reset link is invalid or missing a token. Please request a new one.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" asChild>
            <Link href="/forgot-password">Request new reset link</Link>
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
          <CardTitle className="text-lg tracking-tight text-center">
            Password reset successful
          </CardTitle>
          <CardDescription className="text-center">
            Your password has been updated. You can now sign in with your new password.
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

  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle className="text-lg tracking-tight">Reset password</CardTitle>
        <CardDescription>Enter your new password below.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-3">
            {error && (
              <div className="bg-destructive/10 text-destructive rounded-md p-3 text-sm">
                {error}
              </div>
            )}

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Password</FormLabel>
                  <FormControl>
                    <PasswordInput
                      placeholder="Enter new password"
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
                  <FormLabel>Confirm Password</FormLabel>
                  <FormControl>
                    <PasswordInput
                      placeholder="Confirm new password"
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
              Reset password
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
