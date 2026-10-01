import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const start = vi.fn()
const verify = vi.fn()
const logout = vi.fn()
const idpInfo = vi.fn()
const idpStart = vi.fn()
vi.mock('@/features/admin-console/api/use-admin-session', () => ({
  adminStartSession: (...a: unknown[]) => start(...a),
  adminVerifyMFA: (...a: unknown[]) => verify(...a),
  adminIdPInfo: (...a: unknown[]) => idpInfo(...a),
  adminIdPStart: (...a: unknown[]) => idpStart(...a),
}))
vi.mock('@/features/auth/actions/local-auth-actions', () => ({
  localLogoutAction: (...a: unknown[]) => logout(...a),
}))

import AdminVerifyPage from '@/app/(admin-console)/admin/login/page'
import { AdminApiError } from '@/features/admin-console/api/admin-client'

const originalLocation = window.location

/** Replaces window.location so navigations can be observed. */
function stubLocation(search: string) {
  const nav = { href: vi.fn(), replace: vi.fn(), assign: vi.fn() }
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: {
      ...originalLocation,
      search,
      replace: nav.replace,
      assign: nav.assign,
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
    idpInfo.mockResolvedValue({ enabled: false })
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

  it('offers the administrators identity provider when not signed in', async () => {
    const nav = stubLocation('?next=/admin/organizations')
    start.mockRejectedValueOnce(new AdminApiError('Sign in first', 401))
    idpInfo.mockResolvedValueOnce({ enabled: true, display_name: 'Contoso SSO' })
    idpStart.mockResolvedValueOnce({ authorization_url: 'https://idp.example/authorize?x=1' })
    const user = userEvent.setup()
    render(<AdminVerifyPage />)
    const button = await screen.findByRole('button', { name: 'Sign in with Contoso SSO' })
    expect(screen.getByRole('link', { name: 'Sign in with a password' })).toHaveAttribute(
      'href',
      '/login?redirect=%2Fadmin%2Forganizations'
    )
    expect(nav.replace).not.toHaveBeenCalled()
    await user.click(button)
    await vi.waitFor(() =>
      expect(nav.assign).toHaveBeenCalledWith('https://idp.example/authorize?x=1')
    )
    expect(window.sessionStorage.getItem('openctem.admin.next')).toBe('/admin/organizations')
  })

  it('never navigates to a non-http authorization URL', async () => {
    const nav = stubLocation('')
    start.mockRejectedValueOnce(new AdminApiError('Sign in first', 401))
    idpInfo.mockResolvedValueOnce({ enabled: true, display_name: 'SSO' })
    idpStart.mockResolvedValueOnce({ authorization_url: 'javascript:alert(1)' })
    const user = userEvent.setup()
    render(<AdminVerifyPage />)
    await user.click(await screen.findByRole('button', { name: 'Sign in with SSO' }))
    await vi.waitFor(() => expect(idpStart).toHaveBeenCalled())
    expect(nav.assign).not.toHaveBeenCalled()
  })

  it('points to the identity provider when it is required', async () => {
    stubLocation('')
    start.mockRejectedValueOnce(
      new AdminApiError(
        'Sign in to the admin console with the identity provider',
        403,
        'IDP_SIGN_IN_REQUIRED'
      )
    )
    idpInfo.mockResolvedValueOnce({ enabled: true, display_name: 'Contoso SSO' })
    render(<AdminVerifyPage />)
    expect(
      await screen.findByText('Sign in to the admin console with the identity provider')
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sign in with Contoso SSO' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Verification code')).not.toBeInTheDocument()
  })
})
