import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { resetPasswordAction } from '../actions/local-auth-actions'
import { PasswordTokenForm } from './password-token-form'

vi.mock('../actions/local-auth-actions', () => ({ resetPasswordAction: vi.fn() }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const mockReset = vi.mocked(resetPasswordAction)
const PASSWORD = 'Str0ng!Passw0rd#2026'

async function fillAndSubmit(button: RegExp) {
  const user = userEvent.setup()
  const [pw, confirm] = screen.getAllByPlaceholderText(/password/i)
  await user.type(pw, PASSWORD)
  await user.type(confirm, PASSWORD)
  await user.click(screen.getByRole('button', { name: button }))
}

describe('PasswordTokenForm', () => {
  beforeEach(() => vi.clearAllMocks())

  it('setup mode uses the set-password wording and posts the same reset call', async () => {
    mockReset.mockResolvedValue({ success: true, data: null, message: 'ok' })
    render(<PasswordTokenForm mode="setup" token="tok-1" />)

    expect(screen.getByText('Set your password')).toBeInTheDocument()
    await fillAndSubmit(/^set password$/i)

    await waitFor(() => expect(mockReset).toHaveBeenCalledWith('tok-1', PASSWORD))
    expect(
      await screen.findByText('Your password is set. Sign in to continue.')
    ).toBeInTheDocument()
  })

  it('reset mode keeps the reset wording', async () => {
    mockReset.mockResolvedValue({ success: true, data: null, message: 'ok' })
    render(<PasswordTokenForm mode="reset" token="tok-2" />)

    expect(
      screen.getByText('Reset password', { selector: '[data-slot="card-title"]' })
    ).toBeInTheDocument()
    await fillAndSubmit(/^reset password$/i)
    await waitFor(() => expect(mockReset).toHaveBeenCalledWith('tok-2', PASSWORD))
    expect(await screen.findByText('Password reset successful')).toBeInTheDocument()
  })

  // The page reads the token from the URL after hydration, so the first render
  // has no token. The form must still submit the token that arrives later
  // (before this fix the form kept the empty first-render token and silently
  // refused to submit).
  it('submits a token that arrives after the first render', async () => {
    mockReset.mockResolvedValue({ success: true, data: null, message: 'ok' })
    const { rerender } = render(<PasswordTokenForm mode="setup" token="" />)
    rerender(<PasswordTokenForm mode="setup" token="tok-late" />)
    await fillAndSubmit(/^set password$/i)
    await waitFor(() => expect(mockReset).toHaveBeenCalledWith('tok-late', PASSWORD))
  })

  it('setup mode without a token says to ask the administrator (no self-service reset link)', () => {
    render(<PasswordTokenForm mode="setup" token="" />)
    expect(screen.getByText('Invalid setup link')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /request a new reset link/i })).toBeNull()
    expect(screen.getByRole('link', { name: /back to sign in/i })).toHaveAttribute('href', '/login')
  })

  it('reset mode without a token offers a new reset link', () => {
    render(<PasswordTokenForm mode="reset" token="" />)
    expect(screen.getByRole('link', { name: /request a new reset link/i })).toHaveAttribute(
      'href',
      '/forgot-password'
    )
  })

  it('an expired setup link tells the user to ask for a new one', async () => {
    mockReset.mockResolvedValue({ success: false, error: 'Token expired' })
    render(<PasswordTokenForm mode="setup" token="tok-3" />)
    await fillAndSubmit(/^set password$/i)
    expect(await screen.findByText('Token expired')).toBeInTheDocument()
    expect(screen.getByText(/ask your administrator for a new one/i)).toBeInTheDocument()
  })
})
