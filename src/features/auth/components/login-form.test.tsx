/**
 * LoginForm — social-button gating tests
 *
 * Verifies that social OAuth buttons are only rendered for providers the
 * backend reports as configured (no dead-affordance 404 buttons), and that
 * the "or continue with" divider never appears orphaned.
 */

import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { LoginForm } from './login-form'
import { useAuthProviders } from '../api/use-auth-providers'
import { useTenantSSOProviders } from '@/features/sso/api/use-sso-api'

vi.mock('../api/use-auth-providers')
vi.mock('@/features/sso/api/use-sso-api')

const mockUseAuthProviders = vi.mocked(useAuthProviders)
const mockUseTenantSSOProviders = vi.mocked(useTenantSSOProviders)

function setAuthProviders(social: { google: boolean; github: boolean; microsoft: boolean } | null) {
  mockUseAuthProviders.mockReturnValue({
    data: social ? { social, sso_env_entra_enabled: false } : undefined,
  } as ReturnType<typeof useAuthProviders>)
}

describe('LoginForm social-button gating', () => {
  beforeEach(() => {
    mockUseTenantSSOProviders.mockReturnValue({
      data: undefined,
    } as ReturnType<typeof useTenantSSOProviders>)
  })

  it('renders email + password fields regardless of social config', () => {
    setAuthProviders({ google: false, github: false, microsoft: false })
    render(<LoginForm />)
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
  })

  it('hides ALL social buttons and the divider when nothing is configured', () => {
    setAuthProviders({ google: false, github: false, microsoft: false })
    render(<LoginForm />)
    expect(screen.queryByText('Google')).not.toBeInTheDocument()
    expect(screen.queryByText('GitHub')).not.toBeInTheDocument()
    expect(screen.queryByText('Microsoft')).not.toBeInTheDocument()
    // No orphan divider
    expect(screen.queryByText('Or continue with')).not.toBeInTheDocument()
  })

  it('does not flash social buttons while providers are still loading', () => {
    setAuthProviders(null) // data undefined => loading
    render(<LoginForm />)
    expect(screen.queryByText('Or continue with')).not.toBeInTheDocument()
    expect(screen.queryByText('Google')).not.toBeInTheDocument()
  })

  it('renders only the configured providers', () => {
    setAuthProviders({ google: true, github: false, microsoft: true })
    render(<LoginForm />)
    expect(screen.getByText('Or continue with')).toBeInTheDocument()
    expect(screen.getAllByText('Google').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Microsoft').length).toBeGreaterThan(0)
    expect(screen.queryByText('GitHub')).not.toBeInTheDocument()
  })

  it('respects showSocialLogin=false even if providers are configured', () => {
    setAuthProviders({ google: true, github: true, microsoft: true })
    render(<LoginForm showSocialLogin={false} />)
    expect(screen.queryByText('Or continue with')).not.toBeInTheDocument()
    expect(screen.queryByText('Google')).not.toBeInTheDocument()
  })
})
