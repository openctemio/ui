import { describe, it, expect } from 'vitest'
import { PEER_ADMIN_LOCK_REASON, isPeerAdminLocked } from '../lib/member-policy'

const admin = { role: 'admin', user_id: 'u-admin' }
const member = { role: 'member', user_id: 'u-member' }
const viewer = { role: 'viewer', user_id: 'u-viewer' }

describe('isPeerAdminLocked', () => {
  it('locks another administrator for a caller who is not the owner', () => {
    expect(isPeerAdminLocked(admin, { isOwner: false, userId: 'u-other-admin' })).toBe(true)
  })

  it('does not lock administrators for the owner', () => {
    expect(isPeerAdminLocked(admin, { isOwner: true, userId: 'u-owner' })).toBe(false)
  })

  it('does not lock members and viewers', () => {
    expect(isPeerAdminLocked(member, { isOwner: false, userId: 'u-admin' })).toBe(false)
    expect(isPeerAdminLocked(viewer, { isOwner: false, userId: 'u-admin' })).toBe(false)
  })

  it('does not lock an administrator acting on themselves', () => {
    expect(isPeerAdminLocked(admin, { isOwner: false, userId: 'u-admin' })).toBe(false)
  })

  it('explains the rule', () => {
    expect(PEER_ADMIN_LOCK_REASON).toMatch(/only the organization owner/i)
  })
})
