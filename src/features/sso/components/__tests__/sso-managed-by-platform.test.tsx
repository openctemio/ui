import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SsoManagedByPlatform } from '../sso-managed-by-platform'

describe('SsoManagedByPlatform', () => {
  it("explains who configures SSO and links to the tenant's own sign-in rules", () => {
    render(<SsoManagedByPlatform title="SAML single sign-on" what="SAML single sign-on" />)
    expect(screen.getByRole('heading', { name: 'SAML single sign-on' })).toBeInTheDocument()
    expect(screen.getByText('SSO is configured by your platform administrator')).toBeInTheDocument()
    expect(screen.getByText(/contact your platform administrator/)).toBeInTheDocument()
    // The organization's own sign-in rules (2FA, sessions, restrictions) live
    // in Settings › Access › Authentication, which shows the same notice.
    expect(screen.getByRole('link', { name: 'Authentication settings' })).toHaveAttribute(
      'href',
      '/settings/authentication'
    )
  })
})
