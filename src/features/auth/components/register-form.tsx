/**
 * Register Form Component
 *
 * Handles user registration with support for:
 * - Local auth (email/password) via backend API
 * - Social auth (Google, GitHub, Microsoft) via OAuth2
 */

'use client'

import { useMemo, useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2, UserPlus } from 'lucide-react'
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
import { registerSchema, type RegisterInput } from '../schemas/auth.schema'
import { registerAction } from '../actions/local-auth-actions'
import { initiateSocialLogin, type SocialProvider } from '../actions/social-auth-actions'

// ============================================
// TYPES
// ============================================

interface RegisterFormProps extends React.HTMLAttributes<HTMLFormElement> {
  /**
   * URL to redirect to after successful registration
   * @default '/login'
   */
  redirectTo?: string

  /**
   * URL to redirect to after social login (which signs in directly)
   * @default '/'
   */
  socialRedirectTo?: string

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

export function RegisterForm({
  className,
  redirectTo = '/login',
  socialRedirectTo = '/',
  showSocialLogin = true,
  ...props
}: RegisterFormProps) {
  const [isPending, startTransition] = useTransition()
  const [loadingProvider, setLoadingProvider] = useState<SocialProvider | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()

  // Check for error from OAuth callback
  const errorParam = searchParams.get('error')
  if (errorParam) {
    toast.error(errorParam)
  }

  // Pre-fill the email field when the user arrives from an invitation
  // link. The invitation page redirects to /login?email=alice@co.com&
  // returnTo=/invitations/{token}, and the "Create Account" link on
  // the login page preserves the email param. Without this the user
  // has to manually re-type the exact email the invitation was sent
  // to — error-prone and high friction.
  const prefillEmail = searchParams.get('email') ?? ''

  // Extract the invitation token from the returnTo param if it points
  // at an invitation page. The backend uses this to apply the inviting
  // tenant's email-verification rule (e.g. "never") to the new user
  // instead of falling back to the platform default. Without this,
  // setting EmailVerificationMode=never on a tenant has no effect for
  // brand-new users who don't yet have a membership in any tenant.
  const invitationToken = useMemo(() => {
    const returnTo = searchParams.get('returnTo')
    if (!returnTo) return undefined
    // Match /invitations/{token} or /invitations/{token}/anything. The
    // token is opaque (40-100 chars from the backend) so we just take
    // the next path segment.
    const match = returnTo.match(/^\/invitations\/([^/?#]+)/)
    return match?.[1]
  }, [searchParams])

  // Form setup with centralized schema
  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: prefillEmail,
      password: '',
      confirmPassword: '',
    },
  })

  /**
   * Handle form submission for local auth
   */
  function onSubmit(data: RegisterInput) {
    startTransition(async () => {
      const result = await registerAction({
        email: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        invitationToken,
      })

      if (result.success) {
        toast.success(
          result.message ||
            'Registration successful! Please check your email to verify your account.'
        )
        router.push(redirectTo)
      } else {
        toast.error(result.error || 'Registration failed')
      }
    })
  }

  /**
   * Handle social login (Google, GitHub, Microsoft)
   * Social login also handles registration - creates account if doesn't exist
   */
  async function handleSocialLogin(provider: SocialProvider) {
    setLoadingProvider(provider)
    try {
      // This will redirect to the OAuth provider
      await initiateSocialLogin(provider, socialRedirectTo)
    } catch (error) {
      setLoadingProvider(null)
      console.error(`Social login error (${provider}):`, error)
      toast.error(`Failed to sign up with ${provider}. Please try again.`)
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
        {/* Social Login Section - Show First for Better UX */}
        {showSocialLogin && (
          <>
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

            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background text-muted-foreground px-2">
                  Or register with email
                </span>
              </div>
            </div>
          </>
        )}

        {/* Name Fields */}
        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>First Name</FormLabel>
                <FormControl>
                  <Input
                    placeholder="John"
                    autoComplete="given-name"
                    disabled={isLoading}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Last Name</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Doe"
                    autoComplete="family-name"
                    disabled={isLoading}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

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
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <PasswordInput
                  placeholder="Create a password"
                  autoComplete="new-password"
                  disabled={isLoading}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Confirm Password Field */}
        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirm Password</FormLabel>
              <FormControl>
                <PasswordInput
                  placeholder="Confirm your password"
                  autoComplete="new-password"
                  disabled={isLoading}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Terms and Privacy Notice */}
        <p className="text-muted-foreground text-xs">
          By creating an account, you agree to our{' '}
          <Link href="/terms" className="text-primary hover:underline">
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link href="/privacy" className="text-primary hover:underline">
            Privacy Policy
          </Link>
          .
        </p>

        {/* Submit Button */}
        <Button className="mt-2" disabled={isLoading} type="submit">
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <UserPlus className="h-4 w-4" />
          )}
          Create Account
        </Button>
      </form>
    </Form>
  )
}
