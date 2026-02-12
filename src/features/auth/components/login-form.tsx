/**
 * Login Form Component
 *
 * Handles user authentication with support for:
 * - Local auth (email/password) via backend API
 * - Social auth (Google, GitHub, Microsoft) via OAuth2
 */

'use client'

import { useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2, LogIn } from 'lucide-react'
import { toast } from 'sonner'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/password-input'
import { IconGoogle, IconGithub, IconMicrosoft } from '@/assets/brand-icons'

// Import schema and server actions
import { loginSchema, type LoginInput } from '../schemas/auth.schema'
import { loginAction } from '../actions/local-auth-actions'
import { initiateSocialLogin, type SocialProvider } from '../actions/social-auth-actions'

// ============================================
// TYPES
// ============================================

interface LoginFormProps extends React.HTMLAttributes<HTMLFormElement> {
  /**
   * URL to redirect to after successful login
   * @default '/'
   */
  redirectTo?: string

  /**
   * Whether to show social login buttons (Google, GitHub, Microsoft)
   * @default true
   */
  showSocialLogin?: boolean
}

// ============================================
// SOCIAL PROVIDERS CONFIG
// ============================================

const socialProviders: {
  id: SocialProvider
  name: string
  icon: React.ComponentType<{ className?: string }>
}[] = [
  { id: 'google', name: 'Google', icon: IconGoogle },
  { id: 'github', name: 'GitHub', icon: IconGithub },
  { id: 'microsoft', name: 'Microsoft', icon: IconMicrosoft },
]

// ============================================
// COMPONENT
// ============================================

export function LoginForm({
  className,
  redirectTo = '/',
  showSocialLogin = true,
  ...props
}: LoginFormProps) {
  const [isPending, startTransition] = useTransition()
  const [loadingProvider, setLoadingProvider] = useState<SocialProvider | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()

  // Check for error from OAuth callback
  const errorParam = searchParams.get('error')
  if (errorParam) {
    // Show error toast once
    toast.error(errorParam)
  }

  // Form setup with centralized schema
  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  /**
   * Handle form submission for local auth
   */
  function onSubmit(data: LoginInput) {
    startTransition(async () => {
      const result = await loginAction({
        email: data.email,
        password: data.password,
      })

      if (result.success) {
        // Store user data in localStorage for sidebar display
        if (result.user) {
          try {
            localStorage.setItem(
              'app_user',
              JSON.stringify({
                id: result.user.id,
                name: result.user.name,
                email: result.user.email,
              })
            )
          } catch {
            // Ignore localStorage errors
          }
        }

        // Case 1: Multiple tenants - redirect to tenant selection
        if (result.requiresTenantSelection) {
          toast.success('Please select a team to continue')
          router.push('/select-tenant')
          return
        }

        // Case 2: No tenants - check if user has a specific destination (e.g., invitation)
        if (result.tenants && result.tenants.length === 0) {
          // If returnTo is an invitation page, go there first (user can accept and get a tenant)
          if (redirectTo.includes('/invitations/')) {
            toast.success('Logged in successfully')
            window.location.href = redirectTo
            return
          }
          // Otherwise, redirect to onboarding to create first team
          toast.success('Please create your first team to get started')
          window.location.href = '/onboarding/create-team'
          return
        }

        // Case 3: Single tenant - proceed to dashboard
        // IMPORTANT: Use window.location.href for full page navigation
        // to ensure cookies set by Server Action are picked up properly
        toast.success('Logged in successfully')
        window.location.href = redirectTo
      } else {
        toast.error(result.error || 'Login failed')
      }
    })
  }

  /**
   * Handle social login (Google, GitHub, Microsoft)
   */
  async function handleSocialLogin(provider: SocialProvider) {
    setLoadingProvider(provider)
    try {
      // This will redirect to the OAuth provider
      await initiateSocialLogin(provider, redirectTo)
    } catch (error) {
      setLoadingProvider(null)
      console.error(`Social login error (${provider}):`, error)
      toast.error(`Failed to sign in with ${provider}. Please try again.`)
    }
  }

  const isLoading = isPending || loadingProvider !== null

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className={cn('grid gap-3', className)}
        {...props}
      >
        {/* Email Field */}
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  placeholder="name@example.com"
                  type="email"
                  autoComplete="email"
                  disabled={isLoading}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Password Field */}
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem className="relative">
              <FormLabel>Password</FormLabel>
              <FormControl>
                <PasswordInput
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  disabled={isLoading}
                  {...field}
                />
              </FormControl>
              <FormMessage />

              {/* Forgot Password Link */}
              <Link
                href="/forgot-password"
                className="text-muted-foreground absolute end-0 -top-0.5 text-sm font-medium hover:opacity-75 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded"
              >
                Forgot password?
              </Link>
            </FormItem>
          )}
        />

        {/* Submit Button */}
        <Button className="mt-2" disabled={isLoading} type="submit">
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
          Sign in
        </Button>

        {/* Social Login Section */}
        {showSocialLogin && (
          <>
            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background text-muted-foreground px-2">Or continue with</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {socialProviders.map((provider) => (
                <Button
                  key={provider.id}
                  variant="outline"
                  type="button"
                  disabled={isLoading}
                  onClick={() => handleSocialLogin(provider.id)}
                  className="relative"
                >
                  {loadingProvider === provider.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <provider.icon className="h-4 w-4" />
                  )}
                  <span className="sr-only">{provider.name}</span>
                </Button>
              ))}
            </div>
          </>
        )}
      </form>
    </Form>
  )
}
