import { describe, it, expect } from 'vitest'

import { canSelfRegister, invitationTokenFromReturnTo, registerHref } from './self-register'

describe('invitationTokenFromReturnTo', () => {
  it('extracts the token from an invitation path', () => {
    expect(invitationTokenFromReturnTo('/invitations/abc123')).toBe('abc123')
    expect(invitationTokenFromReturnTo('/invitations/abc123/accept')).toBe('abc123')
    expect(invitationTokenFromReturnTo('/invitations/abc123?x=1')).toBe('abc123')
  })

  it('returns undefined for anything else', () => {
    expect(invitationTokenFromReturnTo(undefined)).toBeUndefined()
    expect(invitationTokenFromReturnTo(null)).toBeUndefined()
    expect(invitationTokenFromReturnTo('')).toBeUndefined()
    expect(invitationTokenFromReturnTo('/dashboard')).toBeUndefined()
    expect(invitationTokenFromReturnTo('/invitations/')).toBeUndefined()
    expect(invitationTokenFromReturnTo('https://evil.test/invitations/x')).toBeUndefined()
  })
})

describe('canSelfRegister', () => {
  it('is false by default (registration disabled, flag missing, or still loading)', () => {
    expect(canSelfRegister(false, null)).toBe(false)
    expect(canSelfRegister(undefined, null)).toBe(false)
    expect(canSelfRegister(undefined, '/dashboard')).toBe(false)
  })

  it('is true when the server enables open registration', () => {
    expect(canSelfRegister(true, null)).toBe(true)
  })

  it('is true for an invited visitor even when registration is disabled', () => {
    expect(canSelfRegister(false, '/invitations/tok')).toBe(true)
    expect(canSelfRegister(undefined, '/invitations/tok')).toBe(true)
  })
})

describe('registerHref', () => {
  it('is plain /register with nothing to carry', () => {
    expect(registerHref()).toBe('/register')
    expect(registerHref({ returnTo: '/dashboard' })).toBe('/register')
  })

  it('carries an invitation returnTo and the email', () => {
    const href = registerHref({ returnTo: '/invitations/tok', email: 'a+b@co.com' })
    const url = new URL(href, 'http://x')
    expect(url.pathname).toBe('/register')
    expect(url.searchParams.get('returnTo')).toBe('/invitations/tok')
    expect(url.searchParams.get('email')).toBe('a+b@co.com')
  })
})
