import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

import { copyToClipboard } from '@/lib/clipboard'
import { buildSetupLink, OneTimeSetupLink, SetupLinkResult } from '../one-time-setup-link'

vi.mock('@/lib/clipboard', () => ({ copyToClipboard: vi.fn(async () => true) }))

describe('buildSetupLink', () => {
  it('points at /set-password with the token encoded', () => {
    expect(buildSetupLink('a b/c', 'https://ctem.example')).toBe(
      'https://ctem.example/set-password?token=a%20b%2Fc'
    )
  })

  it('defaults to the current origin', () => {
    expect(buildSetupLink('tok')).toBe(`${window.location.origin}/set-password?token=tok`)
  })
})

describe('OneTimeSetupLink', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shows the link once with a copy button and the hand-over note', async () => {
    render(<OneTimeSetupLink token="tok-1" expiresAt="2026-10-08T10:00:00Z" email="bob@co.com" />)
    const link = `${window.location.origin}/set-password?token=tok-1`
    expect(screen.getByTestId('setup-link')).toHaveTextContent(link)
    expect(screen.getByText('Shown once')).toBeInTheDocument()
    expect(screen.getByText(/trusted channel/i)).toBeInTheDocument()
    expect(screen.getByText(/expires/i)).toBeInTheDocument()
    expect(screen.getByText('bob@co.com')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /copy setup link/i }))
    await waitFor(() => expect(copyToClipboard).toHaveBeenCalledWith(link))
  })
})

describe('SetupLinkResult', () => {
  it('shows the one-time link when the API returned a token', () => {
    render(
      <SetupLinkResult
        outcome={{
          email_sent: false,
          setup_token: 'tok-2',
          setup_expires_at: '2026-10-08T10:00:00Z',
        }}
        email="a@co.com"
      />
    )
    expect(screen.getByTestId('setup-link')).toHaveTextContent('/set-password?token=tok-2')
  })

  it('says the email failed, without a link, when the API reports email_failed', () => {
    // The platform admin's first-owner bootstrap never falls back to returning
    // the link when the organization can send email.
    render(<SetupLinkResult outcome={{ email_sent: false, email_failed: true }} email="a@co.com" />)
    expect(screen.getByText('Setup email not sent')).toBeInTheDocument()
    expect(screen.getByText(/forgot password/i)).toBeInTheDocument()
    expect(screen.queryByTestId('setup-link')).toBeNull()
  })

  it('says the email was sent when there is no token', () => {
    render(<SetupLinkResult outcome={{ email_sent: true }} email="a@co.com" />)
    expect(screen.getByText('Setup email sent')).toBeInTheDocument()
    expect(screen.queryByTestId('setup-link')).toBeNull()
  })
})
