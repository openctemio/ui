import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const callback = vi.fn()
const verify = vi.fn()
vi.mock('@/features/admin-console/api/use-admin-session', () => ({
  adminIdPCallback: (...a: unknown[]) => callback(...a),
  adminVerifyMFA: (...a: unknown[]) => verify(...a),
}))

import AdminIdPCallbackPage from '@/app/(admin-console)/admin/login/callback/page'
import { AdminApiError } from '@/features/admin-console/api/admin-client'

const originalLocation = window.location

function stubLocation(search: string) {
  const nav = { href: vi.fn() }
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: {
      ...originalLocation,
      search,
      pathname: '/admin/login/callback',
      set href(v: string) {
        nav.href(v)
      },
    },
  })
  return nav
}

describe('Admin identity-provider callback', () => {
  const replaceState = vi.spyOn(window.history, 'replaceState').mockImplementation(() => {})

  beforeEach(() => {
    vi.clearAllMocks()
    window.sessionStorage.clear()
  })
  afterEach(() => {
    Object.defineProperty(window, 'location', { configurable: true, value: originalLocation })
  })

  it('posts the code and state once, removes them from the URL, then asks for the code', async () => {
    stubLocation('?code=c-1&state=s-1')
    callback.mockResolvedValueOnce({ status: 'mfa_required' })
    const { rerender } = render(<AdminIdPCallbackPage />)
    expect(await screen.findByLabelText('Verification code')).toBeInTheDocument()
    rerender(<AdminIdPCallbackPage />)
    expect(callback).toHaveBeenCalledTimes(1)
    expect(callback).toHaveBeenCalledWith('c-1', 's-1')
    expect(replaceState).toHaveBeenCalledWith(null, '', '/admin/login/callback')
  })

  it('opens the console directly when the IdP MFA is trusted', async () => {
    window.sessionStorage.setItem('openctem.admin.next', '/admin/organizations')
    const nav = stubLocation('?code=c-1&state=s-1')
    callback.mockResolvedValueOnce({ status: 'signed_in' })
    render(<AdminIdPCallbackPage />)
    await vi.waitFor(() => expect(nav.href).toHaveBeenCalledWith('/admin/organizations'))
  })

  it('does not follow a remembered target outside the console', async () => {
    window.sessionStorage.setItem('openctem.admin.next', '//evil.example/admin')
    const nav = stubLocation('?code=c-1&state=s-1')
    callback.mockResolvedValueOnce({ status: 'signed_in' })
    render(<AdminIdPCallbackPage />)
    await vi.waitFor(() => expect(nav.href).toHaveBeenCalledWith('/admin'))
  })

  it('finishes with the TOTP step after enrollment', async () => {
    const nav = stubLocation('?code=c-1&state=s-1')
    callback.mockResolvedValueOnce({
      status: 'mfa_enrollment_required',
      otpauth_uri: 'otpauth://totp/OpenCTEM%20Admin:a@x.io?secret=ABCDEFGH&issuer=OpenCTEM',
      secret: 'ABCDEFGHIJKLMNOP',
    })
    verify.mockResolvedValueOnce({ id: '1', email: 'a@x.io', name: 'A', role: 'super_admin' })
    const user = userEvent.setup()
    render(<AdminIdPCallbackPage />)
    expect(await screen.findByRole('img', { name: /QR code/ })).toBeInTheDocument()
    await user.type(screen.getByLabelText('Verification code'), '123456')
    await user.click(screen.getByRole('button', { name: 'Verify and finish setup' }))
    await vi.waitFor(() => expect(nav.href).toHaveBeenCalledWith('/admin'))
  })

  it('shows one generic message when the sign-in is refused', async () => {
    stubLocation('?code=c-1&state=s-1')
    callback.mockRejectedValueOnce(new AdminApiError('Single sign-on failed', 401))
    render(<AdminIdPCallbackPage />)
    expect(await screen.findByText('Single sign-on failed')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to sign-in' })).toHaveAttribute(
      'href',
      '/admin/login'
    )
  })

  it('does not call the API when the IdP returned an error', async () => {
    stubLocation('?error=access_denied&state=s-1')
    render(<AdminIdPCallbackPage />)
    expect(await screen.findByText('Single sign-on was cancelled or failed.')).toBeInTheDocument()
    expect(callback).not.toHaveBeenCalled()
  })
})
