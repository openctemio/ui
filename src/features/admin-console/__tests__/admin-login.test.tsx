import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const login = vi.fn()
const verify = vi.fn()
vi.mock('@/features/admin-console/api/use-admin-session', () => ({
  adminLogin: (...a: unknown[]) => login(...a),
  adminVerifyMFA: (...a: unknown[]) => verify(...a),
}))

import AdminLoginPage from '@/app/(admin-console)/admin/login/page'

describe('Admin console login', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.history.replaceState(null, '', '/admin/login')
  })

  async function signIn() {
    const user = userEvent.setup()
    render(<AdminLoginPage />)
    await user.type(screen.getByLabelText('Email'), 'ops@acme.io')
    await user.type(screen.getByLabelText('Password'), 'a long password')
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    return user
  }

  it('asks for the code after the password when MFA is enrolled', async () => {
    login.mockResolvedValueOnce({ status: 'mfa_required' })
    await signIn()
    expect(login).toHaveBeenCalledWith('ops@acme.io', 'a long password')
    expect(await screen.findByLabelText('Verification code')).toBeInTheDocument()
    expect(screen.queryByRole('img', { name: /QR code/ })).not.toBeInTheDocument()
  })

  it('shows the QR code and setup key on first sign-in', async () => {
    login.mockResolvedValueOnce({
      status: 'mfa_enrollment_required',
      otpauth_uri: 'otpauth://totp/OpenCTEM%20Admin:ops@acme.io?secret=ABCDEFGH&issuer=OpenCTEM',
      secret: 'ABCDEFGHIJKLMNOP',
    })
    await signIn()
    expect(await screen.findByRole('img', { name: /QR code/ })).toBeInTheDocument()
    expect(screen.getByText('ABCD EFGH IJKL MNOP')).toBeInTheDocument()
  })

  it('shows the API error when the password is wrong', async () => {
    const { AdminApiError } = await import('@/features/admin-console/api/admin-client')
    login.mockRejectedValueOnce(new AdminApiError('Invalid email or password', 401))
    await signIn()
    expect(await screen.findByText('Invalid email or password')).toBeInTheDocument()
  })

  it('only follows ?next= into the console (no open redirect)', async () => {
    window.history.replaceState(null, '', '/admin/login?next=https://evil.example')
    login.mockResolvedValueOnce({ status: 'mfa_required' })
    verify.mockResolvedValueOnce({
      id: '1',
      email: 'ops@acme.io',
      name: 'Ops',
      role: 'super_admin',
    })
    const assign = vi.fn()
    const original = window.location
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        ...original,
        search: '?next=https://evil.example',
        set href(v: string) {
          assign(v)
        },
      },
    })
    const user = await signIn()
    await user.type(await screen.findByLabelText('Verification code'), '123456')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))
    await vi.waitFor(() => expect(assign).toHaveBeenCalled())
    expect(assign).toHaveBeenCalledWith('/admin')
    Object.defineProperty(window, 'location', { configurable: true, value: original })
  })
})
