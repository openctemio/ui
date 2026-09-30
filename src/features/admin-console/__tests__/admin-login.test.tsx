import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const start = vi.fn()
const verify = vi.fn()
const logout = vi.fn()
vi.mock('@/features/admin-console/api/use-admin-session', () => ({
  adminStartSession: (...a: unknown[]) => start(...a),
  adminVerifyMFA: (...a: unknown[]) => verify(...a),
}))
vi.mock('@/features/auth/actions/local-auth-actions', () => ({
  localLogoutAction: (...a: unknown[]) => logout(...a),
}))

import AdminVerifyPage from '@/app/(admin-console)/admin/login/page'
import { AdminApiError } from '@/features/admin-console/api/admin-client'

const originalLocation = window.location

/** Replaces window.location so navigations can be observed. */
function stubLocation(search: string) {
  const nav = { href: vi.fn(), replace: vi.fn() }
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: {
      ...originalLocation,
      search,
      replace: nav.replace,
      set href(v: string) {
        nav.href(v)
      },
    },
  })
  return nav
}

describe('Admin console verification (after /login)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })
  afterEach(() => {
    Object.defineProperty(window, 'location', { configurable: true, value: originalLocation })
  })

  it('starts the console session from the /login sign-in and asks for the code', async () => {
    stubLocation('')
    start.mockResolvedValueOnce({ status: 'mfa_required' })
    render(<AdminVerifyPage />)
    expect(await screen.findByLabelText('Verification code')).toBeInTheDocument()
    expect(start).toHaveBeenCalledTimes(1)
    expect(screen.queryByLabelText('Password')).not.toBeInTheDocument()
    expect(screen.queryByRole('img', { name: /QR code/ })).not.toBeInTheDocument()
  })

  it('shows the QR code and setup key on first use', async () => {
    stubLocation('')
    start.mockResolvedValueOnce({
      status: 'mfa_enrollment_required',
      otpauth_uri: 'otpauth://totp/OpenCTEM%20Admin:ops@acme.io?secret=ABCDEFGH&issuer=OpenCTEM',
      secret: 'ABCDEFGHIJKLMNOP',
    })
    render(<AdminVerifyPage />)
    expect(await screen.findByRole('img', { name: /QR code/ })).toBeInTheDocument()
    expect(screen.getByText('ABCD EFGH IJKL MNOP')).toBeInTheDocument()
  })

  it('sends someone who is not signed in to the normal sign-in page', async () => {
    const nav = stubLocation('?next=/admin/organizations')
    start.mockRejectedValueOnce(new AdminApiError('Sign in first', 401))
    render(<AdminVerifyPage />)
    await vi.waitFor(() =>
      expect(nav.replace).toHaveBeenCalledWith('/login?redirect=%2Fadmin%2Forganizations')
    )
  })

  it('explains a refusal and offers to switch accounts', async () => {
    stubLocation('')
    start.mockRejectedValueOnce(
      new AdminApiError('This account is not a platform administrator', 403)
    )
    const user = userEvent.setup()
    render(<AdminVerifyPage />)
    expect(
      await screen.findByText('This account is not a platform administrator')
    ).toBeInTheDocument()
    expect(screen.queryByLabelText('Verification code')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Sign in with a different account' }))
    expect(logout).toHaveBeenCalledWith('/login?redirect=%2Fadmin')
  })

  it('shows the API error for a wrong code and lets the admin retry', async () => {
    stubLocation('')
    start.mockResolvedValueOnce({ status: 'mfa_required' })
    verify.mockRejectedValueOnce(new AdminApiError('Invalid or expired verification code', 401))
    const user = userEvent.setup()
    render(<AdminVerifyPage />)
    await user.type(await screen.findByLabelText('Verification code'), '000000')
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    expect(await screen.findByText('Invalid or expired verification code')).toBeInTheDocument()
    expect(screen.getByLabelText('Verification code')).toHaveValue('')
  })

  it('only follows ?next= into the console (no open redirect)', async () => {
    const nav = stubLocation('?next=https://evil.example')
    start.mockResolvedValueOnce({ status: 'mfa_required' })
    verify.mockResolvedValueOnce({
      id: '1',
      email: 'ops@acme.io',
      name: 'Ops',
      role: 'super_admin',
    })
    const user = userEvent.setup()
    render(<AdminVerifyPage />)
    await user.type(await screen.findByLabelText('Verification code'), '123456')
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    await vi.waitFor(() => expect(nav.href).toHaveBeenCalled())
    expect(nav.href).toHaveBeenCalledWith('/admin')
  })
})
