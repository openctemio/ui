/**
 * @vitest-environment node
 */
import { describe, it, expect } from 'vitest'

import { requiresAuth } from '@/lib/middleware/auth'

describe('public routes', () => {
  it.each(['/set-password', '/reset-password', '/invitations/tok123', '/login', '/register'])(
    '%s opens without a session',
    (path) => {
      expect(requiresAuth(path)).toBe(false)
    }
  )

  it.each(['/', '/dashboard', '/settings/members', '/findings'])(
    '%s still requires a session',
    (path) => {
      expect(requiresAuth(path)).toBe(true)
    }
  )
})
