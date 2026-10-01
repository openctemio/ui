import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SsoManagedByPlatform } from '../sso-managed-by-platform'

describe('SsoManagedByPlatform', () => {
  it('explains who configures SSO and links back to integrations', () => {
    render(<SsoManagedByPlatform title="SAML single sign-on" what="SAML single sign-on" />)
    expect(screen.getByRole('heading', { name: 'SAML single sign-on' })).toBeInTheDocument()
    expect(screen.getByText('SSO is configured by your platform administrator')).toBeInTheDocument()
    expect(screen.getByText(/contact your platform administrator/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to integrations' })).toHaveAttribute(
      'href',
      '/settings/integrations'
    )
  })
})
