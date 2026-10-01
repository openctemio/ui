import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

import { ApiClientError } from '@/lib/api/error-handler'
import { AccessRestrictionsCard, isIpLockoutError, parseLines } from '../access-restrictions-card'

function renderCard(overrides: Partial<Parameters<typeof AccessRestrictionsCard>[0]> = {}) {
  const props = {
    ipAllowlist: '',
    allowedDomains: '',
    onIpAllowlistChange: vi.fn(),
    onAllowedDomainsChange: vi.fn(),
    currentIp: '198.51.100.4',
    ...overrides,
  }
  render(<AccessRestrictionsCard {...props} />)
  return props
}

describe('parseLines', () => {
  it('trims and drops blank lines', () => {
    expect(parseLines(' a.com \n\n b.com\n')).toEqual(['a.com', 'b.com'])
    expect(parseLines('')).toEqual([])
  })
})

describe('isIpLockoutError', () => {
  it('matches the API lockout refusal only', () => {
    expect(
      isIpLockoutError(
        new ApiClientError(
          'IP allowlist must include your current IP address (198.51.100.4)',
          'BAD_REQUEST',
          400
        )
      )
    ).toBe(true)
    expect(isIpLockoutError(new ApiClientError('invalid CIDR', 'BAD_REQUEST', 400))).toBe(false)
    expect(isIpLockoutError(new Error('IP allowlist must include your current IP'))).toBe(false)
  })
})

describe('AccessRestrictionsCard', () => {
  it('explains both fields are enforced and who they apply to', () => {
    renderCard()
    expect(screen.getByLabelText('Allowed email domains')).toBeInTheDocument()
    expect(screen.getByLabelText('IP allowlist')).toBeInTheDocument()
    expect(
      screen.getByText(/sensors, api keys and the platform admin console/i)
    ).toBeInTheDocument()
    expect(screen.getByText('Empty: no IP restriction.')).toBeInTheDocument()
    expect(screen.getByText('Empty: any email domain is allowed.')).toBeInTheDocument()
  })

  it('shows the current IP and adds it on request', () => {
    const props = renderCard({ ipAllowlist: '10.0.0.0/8' })
    expect(screen.getByText('198.51.100.4')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /add my ip/i }))
    expect(props.onIpAllowlistChange).toHaveBeenCalledWith('10.0.0.0/8\n198.51.100.4')
  })

  it('hides "Add my IP" once the IP is listed', () => {
    renderCard({ ipAllowlist: '198.51.100.4' })
    expect(screen.queryByRole('button', { name: /add my ip/i })).toBeNull()
    expect(screen.queryByText('Empty: no IP restriction.')).toBeNull()
  })

  it('shows the lockout error inline', () => {
    renderCard({
      ipAllowlist: '10.0.0.0/8',
      ipAllowlistError: 'IP allowlist must include your current IP address (198.51.100.4)',
    })
    expect(screen.getByRole('alert')).toHaveTextContent(
      'IP allowlist must include your current IP address (198.51.100.4)'
    )
    expect(screen.getByLabelText('IP allowlist')).toHaveAttribute('aria-invalid', 'true')
  })
})
