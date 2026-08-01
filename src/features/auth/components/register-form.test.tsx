/**
 * RegisterForm rendered all three social buttons on every deployment.
 *
 * LoginForm has always filtered them against GET /auth/providers, so a
 * deployment with no OAuth credentials showed no buttons on the login page —
 * and three dead ones on the register page. Clicking one there sends the user
 * to an authorize endpoint that is not registered.
 *
 * The API-side half of this is api#391, which stops /auth/providers
 * advertising a provider whose routes are not live. That fix cannot reach this
 * form, because this form never asked.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

import { RegisterForm } from './register-form'
import { useAuthProviders } from '../api/use-auth-providers'

vi.mock('../api/use-auth-providers')
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}))
vi.mock('../actions/local-auth-actions', () => ({ registerAction: vi.fn() }))
vi.mock('../actions/social-auth-actions', () => ({ initiateSocialLogin: vi.fn() }))

const mockUseAuthProviders = vi.mocked(useAuthProviders)

function mockProviders(social: Record<string, boolean> | undefined) {
  mockUseAuthProviders.mockReturnValue({
    data: { social },
  } as unknown as ReturnType<typeof useAuthProviders>)
}

// Matched loosely on purpose: each brand icon renders its own <title>, so the
// accessible name is the provider name twice ("GoogleGoogle"). That duplicate
// label is a separate a11y nit; pinning the exact string here would make this
// test fail the day someone fixes it.
function socialButtonNames() {
  return ['Google', 'GitHub', 'Microsoft'].filter(
    (name) => screen.queryByRole('button', { name: new RegExp(name, 'i') }) !== null
  )
}

describe('RegisterForm social buttons', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders no social buttons when the API advertises none', () => {
    mockProviders({ google: false, github: false, microsoft: false })
    render(<RegisterForm />)

    expect(
      socialButtonNames(),
      'a button here sends the user to an OAuth route that is not registered'
    ).toEqual([])
  })

  it('renders only the providers the API advertises', () => {
    mockProviders({ google: true, github: false, microsoft: false })
    render(<RegisterForm />)

    expect(socialButtonNames()).toEqual(['Google'])
  })

  it('renders nothing while the provider list is still loading', () => {
    mockUseAuthProviders.mockReturnValue({
      data: undefined,
    } as unknown as ReturnType<typeof useAuthProviders>)
    render(<RegisterForm />)

    expect(
      socialButtonNames(),
      'buttons must not flash in before we know which ones work'
    ).toEqual([])
  })

  // The API contract says `social` is always present, but a proxy error page or
  // a partial response can omit it. Indexing it unguarded throws a TypeError
  // that takes the whole registration page down — a login-availability outage
  // caused by a cosmetic detail.
  it('survives a response with no social field', () => {
    mockProviders(undefined)
    expect(() => render(<RegisterForm />)).not.toThrow()
    expect(socialButtonNames()).toEqual([])
  })
})
