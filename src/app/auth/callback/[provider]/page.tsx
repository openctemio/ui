/**
 * OAuth Callback Page
 *
 * Handles OAuth callback from social providers (Google, GitHub, Microsoft)
 * Processes the authorization code and redirects to the appropriate page
 */

import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'

import { handleOAuthCallback, type SocialProvider } from '@/features/auth/actions/social-auth-actions'

// ============================================
// TYPES
// ============================================

interface OAuthCallbackPageProps {
  params: Promise<{
    provider: string
  }>
  searchParams: Promise<{
    code?: string
    state?: string
    error?: string
    error_description?: string
  }>
}

// ============================================
// VALID PROVIDERS
// ============================================

const validProviders: SocialProvider[] = ['google', 'github', 'microsoft']

function isValidProvider(provider: string): provider is SocialProvider {
  return validProviders.includes(provider as SocialProvider)
}

// ============================================
// PAGE COMPONENT
// ============================================

export default async function OAuthCallbackPage({
  params,
  searchParams,
}: OAuthCallbackPageProps) {
  const { provider } = await params
  const { code, state, error, error_description } = await searchParams

  // Validate provider
  if (!isValidProvider(provider)) {
    redirect(`/sign-in?error=${encodeURIComponent('Invalid OAuth provider')}`)
  }

  // Handle OAuth error from provider
  if (error) {
    const errorMessage = error_description || error || 'OAuth authentication failed'
    redirect(`/sign-in?error=${encodeURIComponent(errorMessage)}`)
  }

  // Validate required parameters
  if (!code || !state) {
    redirect(`/sign-in?error=${encodeURIComponent('Missing OAuth parameters')}`)
  }

  // Process the OAuth callback
  const result = await handleOAuthCallback(provider, code, state)

  if (!result.success) {
    redirect(`/sign-in?error=${encodeURIComponent(result.error)}`)
  }

  // Get the stored redirect destination
  const cookieStore = await cookies()
  const redirectTo = cookieStore.get('oauth_redirect')?.value || '/'

  // Clean up redirect cookie
  cookieStore.delete('oauth_redirect')

  // Redirect to the final destination
  redirect(redirectTo)
}

// ============================================
// LOADING STATE
// ============================================

// This component is shown briefly while the server processes the callback
export function generateStaticParams() {
  return validProviders.map((provider) => ({
    provider,
  }))
}
