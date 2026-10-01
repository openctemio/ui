/**
 * LoginForm — social-button gating tests
 *
 * Verifies that social OAuth buttons are only rendered for providers the
 * backend reports as configured (no dead-affordance 404 buttons), and that
 * the "or continue with" divider never appears orphaned.
 */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { LoginForm } from './login-form'
import { useAuthProviders } from '../api/use-auth-providers'
import { useTenantSSOProviders } from '@/features/sso/api/use-sso-api'

vi.mock('../api/use-auth-providers')
vi.mock('@/features/sso/api/use-sso-api')
const loginAction = vi.fn()
const verifyMfaAction = vi.fn()
const startMfaEnrollmentAction = vi.fn()
const confirmMfaEnrollmentAction = vi.fn()
const cancelMfaAction = vi.fn()
const finishMfaEnrollmentAction = vi.fn()
vi.mock('../actions/local-auth-actions', () => ({
  loginAction: (...a: unknown[]) => loginAction(...a),
  verifyMfaAction: (...a: unknown[]) => verifyMfaAction(...a),
  startMfaEnrollmentAction: (...a: unknown[]) => startMfaEnrollmentAction(...a),
  confirmMfaEnrollmentAction: (...a: unknown[]) => confirmMfaEnrollmentAction(...a),
  cancelMfaAction: (...a: unknown[]) => cancelMfaAction(...a),
  finishMfaEnrollmentAction: (...a: unknown[]) => finishMfaEnrollmentAction(...a),
}))

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

describe('LoginForm platform administrator', () => {
  const originalLocation = window.location
  beforeEach(() => {
    mockUseTenantSSOProviders.mockReturnValue({
      data: undefined,
    } as ReturnType<typeof useTenantSSOProviders>)
    setAuthProviders({ google: false, github: false, microsoft: false })
  })

  it('opens the admin console instead of organization onboarding', async () => {
    const href = vi.fn()
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        ...originalLocation,
        set href(v: string) {
          href(v)
        },
      },
    })
    loginAction.mockResolvedValueOnce({
      success: true,
      platformAdmin: true,
      tenants: [],
      user: { id: 'u1', name: 'Ops', email: 'ops@acme.io' },
    })
    const user = userEvent.setup()
    render(<LoginForm />)
    await user.type(screen.getByLabelText('Email'), 'ops@acme.io')
    await user.type(screen.getByLabelText('Password'), 'Correct-Horse-9')
    await user.click(screen.getByRole('button', { name: /sign in/i }))
    await vi.waitFor(() => expect(href).toHaveBeenCalled())
    expect(href).toHaveBeenCalledWith('/admin')
    expect(href).not.toHaveBeenCalledWith('/onboarding/create-team')
    Object.defineProperty(window, 'location', { configurable: true, value: originalLocation })
  })
})

describe('LoginForm two-factor step', () => {
  const originalLocation = window.location
  let href: ReturnType<typeof vi.fn<(v: string) => void>>

  beforeEach(() => {
    vi.clearAllMocks()
    mockUseTenantSSOProviders.mockReturnValue({
      data: undefined,
    } as ReturnType<typeof useTenantSSOProviders>)
    setAuthProviders({ google: false, github: false, microsoft: false })
    href = vi.fn<(v: string) => void>()
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        ...originalLocation,
        set href(v: string) {
          href(v)
        },
      },
    })
  })

  afterEach(() => {
    Object.defineProperty(window, 'location', { configurable: true, value: originalLocation })
  })

  async function signIn() {
    const user = userEvent.setup()
    render(<LoginForm redirectTo="/findings" />)
    await user.type(screen.getByLabelText('Email'), 'qa@acme.io')
    await user.type(screen.getByLabelText('Password'), 'Correct-Horse-9')
    await user.click(screen.getByRole('button', { name: /sign in/i }))
    return user
  }

  it('asks for the authenticator code instead of navigating', async () => {
    loginAction.mockResolvedValueOnce({ success: true, mfaRequired: true, mfaPurpose: 'verify' })
    await signIn()
    expect(await screen.findByText('Two-factor authentication')).toBeInTheDocument()
    expect(screen.getByLabelText('Authentication code')).toBeInTheDocument()
    expect(href).not.toHaveBeenCalled()
  })

  it('verifies the code and continues the normal login', async () => {
    loginAction.mockResolvedValueOnce({ success: true, mfaRequired: true, mfaPurpose: 'verify' })
    verifyMfaAction.mockResolvedValueOnce({
      success: true,
      user: { id: 'u1', name: 'QA', email: 'qa@acme.io' },
      requiresTenantSelection: false,
    })
    const user = await signIn()
    const verify = screen.getByRole('button', { name: /verify/i })
    expect(verify).toBeDisabled()
    await user.type(await screen.findByLabelText('Authentication code'), '12a3456')
    expect(screen.getByLabelText('Authentication code')).toHaveValue('123456')
    await user.click(verify)
    await vi.waitFor(() => expect(href).toHaveBeenCalledWith('/findings'))
    expect(verifyMfaAction).toHaveBeenCalledWith({ code: '123456' })
  })

  it('shows a wrong code inline and stays on the step', async () => {
    loginAction.mockResolvedValueOnce({ success: true, mfaRequired: true, mfaPurpose: 'verify' })
    verifyMfaAction.mockResolvedValueOnce({ success: false, error: 'Invalid verification code' })
    const user = await signIn()
    await user.type(await screen.findByLabelText('Authentication code'), '000000')
    await user.click(screen.getByRole('button', { name: /verify/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid verification code')
    expect(screen.getByText('Two-factor authentication')).toBeInTheDocument()
    expect(href).not.toHaveBeenCalled()
  })

  it('accepts a recovery code', async () => {
    loginAction.mockResolvedValueOnce({ success: true, mfaRequired: true, mfaPurpose: 'verify' })
    verifyMfaAction.mockResolvedValueOnce({
      success: true,
      user: { id: 'u1', name: 'QA', email: 'qa@acme.io' },
    })
    const user = await signIn()
    await user.click(await screen.findByRole('button', { name: /use a recovery code/i }))
    await user.type(screen.getByLabelText('Recovery code'), 'abcde-fghjk')
    await user.click(screen.getByRole('button', { name: /verify/i }))
    await vi.waitFor(() =>
      expect(verifyMfaAction).toHaveBeenCalledWith({ recoveryCode: 'abcde-fghjk' })
    )
  })

  it('goes back to the password form when the challenge expired', async () => {
    loginAction.mockResolvedValueOnce({ success: true, mfaRequired: true, mfaPurpose: 'verify' })
    verifyMfaAction.mockResolvedValueOnce({
      success: false,
      error: 'Your sign-in verification expired or is no longer valid. Please sign in again.',
    })
    const user = await signIn()
    await user.type(await screen.findByLabelText('Authentication code'), '123456')
    await user.click(screen.getByRole('button', { name: /verify/i }))
    expect(await screen.findByLabelText('Password')).toBeInTheDocument()
  })

  it('forced enrollment: QR, code, recovery codes, then continue', async () => {
    loginAction.mockResolvedValueOnce({ success: true, mfaRequired: true, mfaPurpose: 'enroll' })
    startMfaEnrollmentAction.mockResolvedValueOnce({
      success: true,
      secret: 'JBSWY3DPEHPK3PXP',
      otpauthUri: 'otpauth://totp/OpenCTEM:qa%40acme.io?secret=JBSWY3DPEHPK3PXP&issuer=OpenCTEM',
    })
    // The session is parked until the codes are acknowledged.
    confirmMfaEnrollmentAction.mockResolvedValueOnce({
      success: true,
      user: { id: 'u1', name: 'QA', email: 'qa@acme.io' },
      recoveryCodes: ['aaaaa-bbbbb', 'ccccc-ddddd'],
    })
    finishMfaEnrollmentAction.mockResolvedValueOnce({
      success: true,
      user: { id: 'u1', name: 'QA', email: 'qa@acme.io' },
      requiresTenantSelection: false,
    })
    const user = await signIn()
    expect(await screen.findByText('Set up two-factor authentication')).toBeInTheDocument()
    expect(await screen.findByRole('img', { name: /qr code/i })).toBeInTheDocument()
    expect(screen.getByText('JBSW Y3DP EHPK 3PXP')).toBeInTheDocument()
    await user.type(screen.getByLabelText('Authentication code'), '654321')
    await user.click(screen.getByRole('button', { name: /turn on and continue/i }))
    expect(await screen.findByText('aaaaa-bbbbb')).toBeInTheDocument()
    const cont = screen.getByRole('button', { name: /^continue$/i })
    expect(cont).toBeDisabled()
    await user.click(screen.getByLabelText('I have saved my recovery codes'))
    expect(finishMfaEnrollmentAction).not.toHaveBeenCalled()
    await user.click(cont)
    await vi.waitFor(() => expect(href).toHaveBeenCalledWith('/findings'))
    expect(confirmMfaEnrollmentAction).toHaveBeenCalledWith('654321')
    expect(finishMfaEnrollmentAction).toHaveBeenCalledTimes(1)
    expect(startMfaEnrollmentAction).toHaveBeenCalledTimes(1)
  })
})
