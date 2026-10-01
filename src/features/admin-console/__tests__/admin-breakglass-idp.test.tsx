import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const changePassword = vi.fn()
const logout = vi.fn()
const save = vi.fn()
vi.mock('@/features/admin-console/api/use-admin-session', () => ({
  adminChangePassword: (...a: unknown[]) => changePassword(...a),
}))
vi.mock('@/features/auth/actions/local-auth-actions', () => ({
  localLogoutAction: (...a: unknown[]) => logout(...a),
}))
vi.mock('@/features/admin-console/api/use-platform-idp', () => ({
  savePlatformIdP: (...a: unknown[]) => save(...a),
  deletePlatformIdP: vi.fn(),
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

// jsdom has no ResizeObserver; Radix's Switch measures itself with one.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver

import { ChangePasswordGate } from '@/features/admin-console/components/change-password-gate'
import {
  PlatformIdPForm,
  parseList,
  toInput,
} from '@/features/admin-console/components/platform-idp-form'
import { isNavigableURL, safeConsolePath } from '@/features/admin-console/lib/console-navigation'
import type { PlatformIdP } from '@/features/admin-console/types'

const admin = { id: '1', email: 'root@x.io', name: 'Root', role: 'super_admin' as const }

describe('temporary password gate', () => {
  beforeEach(() => vi.clearAllMocks())

  it('refuses mismatched passwords without calling the API', async () => {
    const user = userEvent.setup()
    render(<ChangePasswordGate admin={admin} />)
    await user.type(screen.getByLabelText('Temporary password'), 'Temp-Pass-1!')
    await user.type(screen.getByLabelText('New password'), 'New-Pass-123')
    await user.type(screen.getByLabelText('Confirm new password'), 'New-Pass-124')
    await user.click(screen.getByRole('button', { name: 'Change password' }))
    expect(await screen.findByText('The new passwords do not match.')).toBeInTheDocument()
    expect(changePassword).not.toHaveBeenCalled()
  })

  it('changes the password and signs out so the administrator signs in again', async () => {
    changePassword.mockResolvedValueOnce(undefined)
    const user = userEvent.setup()
    render(<ChangePasswordGate admin={admin} />)
    await user.type(screen.getByLabelText('Temporary password'), 'Temp-Pass-1!')
    await user.type(screen.getByLabelText('New password'), 'New-Pass-123')
    await user.type(screen.getByLabelText('Confirm new password'), 'New-Pass-123')
    await user.click(screen.getByRole('button', { name: 'Change password' }))
    await vi.waitFor(() => expect(logout).toHaveBeenCalledWith('/login?redirect=%2Fadmin'))
    expect(changePassword).toHaveBeenCalledWith('Temp-Pass-1!', 'New-Pass-123')
  })
})

const configured: PlatformIdP = {
  configured: true,
  enabled: true,
  display_name: 'Contoso SSO',
  issuer: 'https://login.contoso.example',
  client_id: 'console',
  has_client_secret: true,
  redirect_uri: 'https://console.example/admin/login/callback',
  scopes: ['openid', 'email'],
  require_idp: false,
  trusted_acr_values: [],
  trusted_amr_values: [],
  token_endpoint: 'https://login.contoso.example/token',
  authorization_endpoint: 'https://login.contoso.example/authorize',
  jwks_uri: 'https://login.contoso.example/jwks',
  token_endpoint_auth_method: 'client_secret_basic',
}

describe('admin sign-in (platform IdP) form', () => {
  beforeEach(() => vi.clearAllMocks())

  it('never sends an empty secret, so the stored one is kept', () => {
    const input = toInput({
      enabled: true,
      displayName: ' SSO ',
      issuer: 'https://idp',
      clientID: 'c',
      clientSecret: '',
      redirectURI: 'https://console/cb',
      scopes: 'openid, email profile',
      requireIdP: false,
      trustedACR: '',
      trustedAMR: 'hwk',
    })
    expect(input).not.toHaveProperty('client_secret')
    expect(input.display_name).toBe('SSO')
    expect(input.scopes).toEqual(['openid', 'email', 'profile'])
    expect(input.trusted_acr_values).toEqual([])
    expect(input.trusted_amr_values).toEqual(['hwk'])
    expect(parseList(' a ,b  c,, ')).toEqual(['a', 'b', 'c'])
  })

  it('does not offer "require IdP" without a break-glass super admin', () => {
    render(<PlatformIdPForm idp={configured} hasBreakGlass={false} onSaved={vi.fn()} />)
    expect(screen.getByRole('switch', { name: 'Require the identity provider' })).toBeDisabled()
    expect(
      screen.getByText('Add an active break-glass super admin first (Administrators).')
    ).toBeInTheDocument()
  })

  it('asks for confirmation before requiring the IdP, then saves', async () => {
    save.mockResolvedValueOnce(configured)
    const onSaved = vi.fn()
    const user = userEvent.setup()
    render(<PlatformIdPForm idp={configured} hasBreakGlass onSaved={onSaved} />)
    expect(screen.getByLabelText('Client secret')).toHaveAttribute(
      'placeholder',
      'Stored. Leave empty to keep it.'
    )
    await user.click(screen.getByRole('switch', { name: 'Require the identity provider' }))
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(save).not.toHaveBeenCalled()
    await user.click(await screen.findByRole('button', { name: 'Require it' }))
    await vi.waitFor(() => expect(save).toHaveBeenCalledTimes(1))
    expect(save.mock.calls[0][0]).toMatchObject({ require_idp: true, issuer: configured.issuer })
    expect(save.mock.calls[0][0]).not.toHaveProperty('client_secret')
    expect(onSaved).toHaveBeenCalled()
  })

  it('shows the API error when discovery fails', async () => {
    const { AdminApiError } = await import('@/features/admin-console/api/admin-client')
    save.mockRejectedValueOnce(
      new AdminApiError("could not read the issuer's OpenID configuration", 400)
    )
    const user = userEvent.setup()
    render(<PlatformIdPForm idp={configured} hasBreakGlass onSaved={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(
      await screen.findByText("could not read the issuer's OpenID configuration")
    ).toBeInTheDocument()
  })
})

describe('console navigation helpers', () => {
  it.each([
    ['/admin', '/admin'],
    ['/admin/organizations', '/admin/organizations'],
    ['//evil.example/admin', '/admin'],
    ['https://evil.example/admin', '/admin'],
    ['/admin\\@evil.example', '/admin'],
    ['/administrators-elsewhere', '/admin'],
    [null, '/admin'],
  ])('safeConsolePath(%s) = %s', (raw, want) => {
    expect(safeConsolePath(raw)).toBe(want)
  })

  it('only navigates to http(s) authorization URLs', () => {
    expect(isNavigableURL('https://idp.example/authorize')).toBe(true)
    expect(isNavigableURL('javascript:alert(1)')).toBe(false)
    expect(isNavigableURL('data:text/html,x')).toBe(false)
    expect(isNavigableURL('/relative')).toBe(false)
  })
})
