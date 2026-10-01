/**
 * No self-registration: sign-up affordances appear only when the server turns
 * open registration on, or when the visitor arrived from an invitation.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

import { useAuthProviders } from '../api/use-auth-providers'
import { RegisterGate } from './register-gate'
import { SignUpPrompt } from './sign-up-prompt'

let search = new URLSearchParams()

vi.mock('../api/use-auth-providers')
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => search,
}))
vi.mock('../actions/local-auth-actions', () => ({ registerAction: vi.fn() }))
vi.mock('../actions/social-auth-actions', () => ({ initiateSocialLogin: vi.fn() }))

const mockProviders = vi.mocked(useAuthProviders)

function providers(data: Record<string, unknown> | undefined, isLoading = false) {
  mockProviders.mockReturnValue({ data, isLoading } as unknown as ReturnType<
    typeof useAuthProviders
  >)
}

const social = { google: false, github: false, microsoft: false }

describe('RegisterGate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    search = new URLSearchParams()
  })

  it('shows "registration is disabled" when the server has it off', () => {
    providers({ social, registration_enabled: false })
    render(<RegisterGate />)
    expect(screen.getByText('Registration is disabled')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /back to sign in/i })).toHaveAttribute('href', '/login')
    expect(screen.queryByRole('button', { name: /create account/i })).toBeNull()
  })

  it('treats a missing flag (older server) as disabled', () => {
    providers({ social })
    render(<RegisterGate />)
    expect(screen.getByText('Registration is disabled')).toBeInTheDocument()
  })

  it('does not flash the form while the provider list loads', () => {
    providers(undefined, true)
    render(<RegisterGate />)
    expect(screen.queryByRole('button', { name: /create account/i })).toBeNull()
    expect(screen.queryByText('Registration is disabled')).toBeNull()
  })

  it('shows the form when open registration is enabled', () => {
    providers({ social, registration_enabled: true })
    render(<RegisterGate />)
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument()
  })

  it('shows the form to an invited visitor even when registration is disabled', () => {
    search = new URLSearchParams({ returnTo: '/invitations/tok', email: 'a@co.com' })
    providers({ social, registration_enabled: false })
    render(<RegisterGate />)
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /sign in/i })).toHaveAttribute(
      'href',
      '/login?returnTo=%2Finvitations%2Ftok'
    )
  })
})

describe('SignUpPrompt (login page)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders nothing when registration is disabled', () => {
    providers({ social, registration_enabled: false })
    const { container } = render(<SignUpPrompt />)
    expect(container).toBeEmptyDOMElement()
  })

  it('links to /register when registration is enabled', () => {
    providers({ social, registration_enabled: true })
    render(<SignUpPrompt email="a@co.com" />)
    expect(screen.getByRole('link', { name: 'Sign up' })).toHaveAttribute(
      'href',
      '/register?email=a%40co.com'
    )
  })

  it('offers sign-up to an invited visitor, carrying the invitation', () => {
    providers({ social, registration_enabled: false })
    render(<SignUpPrompt returnTo="/invitations/tok" email="a@co.com" />)
    const href = screen.getByRole('link', { name: 'Sign up' }).getAttribute('href') ?? ''
    const url = new URL(href, 'http://x')
    expect(url.searchParams.get('returnTo')).toBe('/invitations/tok')
    expect(url.searchParams.get('email')).toBe('a@co.com')
  })
})
