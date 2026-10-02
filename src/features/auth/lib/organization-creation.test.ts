import { describe, it, expect } from 'vitest'

import { canCreateOrganization } from './organization-creation'

describe('canCreateOrganization', () => {
  it('refuses when only the platform administrator creates organizations', () => {
    expect(canCreateOrganization('admin_only')).toBe(false)
  })

  it('allows self-service creation', () => {
    expect(canCreateOrganization('self_service')).toBe(true)
  })

  it('treats a missing mode as the server default (self-service)', () => {
    expect(canCreateOrganization(undefined)).toBe(true)
    expect(canCreateOrganization('')).toBe(true)
  })
})
