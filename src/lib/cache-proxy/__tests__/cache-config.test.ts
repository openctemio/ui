/**
 * Cache Config Tests
 *
 * Tests for cache configuration helpers:
 * - shouldNeverCache: identifies paths that must not be cached
 * - getTTL: returns the correct TTL for a given path
 */

import { describe, it, expect } from 'vitest'
import {
  shouldNeverCache,
  getTTL,
  DEFAULT_TTL,
  CACHE_TTLS,
  NEVER_CACHE_PATHS,
} from '../cache-config'

// ============================================
// shouldNeverCache
// ============================================

describe('shouldNeverCache', () => {
  describe('auth paths', () => {
    it('returns true for /api/v1/me', () => {
      expect(shouldNeverCache('/api/v1/me')).toBe(true)
    })

    it('returns true for /api/v1/auth', () => {
      expect(shouldNeverCache('/api/v1/auth')).toBe(true)
    })

    it('returns true for /api/v1/auth/login', () => {
      expect(shouldNeverCache('/api/v1/auth/login')).toBe(true)
    })

    it('returns true for /api/v1/auth/refresh', () => {
      expect(shouldNeverCache('/api/v1/auth/refresh')).toBe(true)
    })

    it('returns true for /api/v1/session', () => {
      expect(shouldNeverCache('/api/v1/session')).toBe(true)
    })

    it('returns true for /api/v1/users/me', () => {
      expect(shouldNeverCache('/api/v1/users/me')).toBe(true)
    })
  })

  describe('real-time paths', () => {
    it('returns true for /api/v1/ws', () => {
      expect(shouldNeverCache('/api/v1/ws')).toBe(true)
    })

    it('returns true for /api/v1/sse', () => {
      expect(shouldNeverCache('/api/v1/sse')).toBe(true)
    })

    it('returns true for /api/v1/notifications', () => {
      expect(shouldNeverCache('/api/v1/notifications')).toBe(true)
    })
  })

  describe('settings paths', () => {
    it('returns true for /api/v1/settings', () => {
      expect(shouldNeverCache('/api/v1/settings')).toBe(true)
    })

    it('returns true for /api/v1/preferences', () => {
      expect(shouldNeverCache('/api/v1/preferences')).toBe(true)
    })
  })

  describe('cacheable paths', () => {
    it('returns false for /api/v1/findings', () => {
      expect(shouldNeverCache('/api/v1/findings')).toBe(false)
    })

    it('returns false for /api/v1/assets', () => {
      expect(shouldNeverCache('/api/v1/assets')).toBe(false)
    })

    it('returns false for /api/v1/scans', () => {
      expect(shouldNeverCache('/api/v1/scans')).toBe(false)
    })

    it('returns false for /api/v1/dashboard', () => {
      expect(shouldNeverCache('/api/v1/dashboard')).toBe(false)
    })

    it('returns false for /api/v1/tools', () => {
      expect(shouldNeverCache('/api/v1/tools')).toBe(false)
    })

    it('returns false for /api/v1/exposures', () => {
      expect(shouldNeverCache('/api/v1/exposures')).toBe(false)
    })
  })

  describe('sub-paths of never-cache paths', () => {
    it('returns true for /api/v1/notifications/unread (prefix match)', () => {
      expect(shouldNeverCache('/api/v1/notifications/unread')).toBe(true)
    })

    it('returns true for /api/v1/settings/general (prefix match)', () => {
      expect(shouldNeverCache('/api/v1/settings/general')).toBe(true)
    })
  })

  describe('all NEVER_CACHE_PATHS are covered', () => {
    it.each(NEVER_CACHE_PATHS)('returns true for %s', (path) => {
      expect(shouldNeverCache(path)).toBe(true)
    })
  })
})

// ============================================
// getTTL
// ============================================

describe('getTTL', () => {
  describe('dashboard path', () => {
    it('returns 60 for /api/v1/dashboard', () => {
      expect(getTTL('/api/v1/dashboard')).toBe(60)
    })

    it('returns 60 for /api/v1/dashboard/stats (prefix match)', () => {
      expect(getTTL('/api/v1/dashboard/stats')).toBe(60)
    })
  })

  describe('static/reference data paths', () => {
    it('returns 300 for /api/v1/tools', () => {
      expect(getTTL('/api/v1/tools')).toBe(300)
    })

    it('returns 300 for /api/v1/capabilities', () => {
      expect(getTTL('/api/v1/capabilities')).toBe(300)
    })

    it('returns 300 for /api/v1/tool-categories', () => {
      expect(getTTL('/api/v1/tool-categories')).toBe(300)
    })

    it('returns 300 for /api/v1/asset-types', () => {
      expect(getTTL('/api/v1/asset-types')).toBe(300)
    })

    it('returns 300 for /api/v1/modules', () => {
      expect(getTTL('/api/v1/modules')).toBe(300)
    })
  })

  describe('list paths', () => {
    it('returns 30 for /api/v1/findings', () => {
      expect(getTTL('/api/v1/findings')).toBe(30)
    })

    it('returns 30 for /api/v1/assets', () => {
      expect(getTTL('/api/v1/assets')).toBe(30)
    })

    it('returns 30 for /api/v1/scans', () => {
      expect(getTTL('/api/v1/scans')).toBe(30)
    })

    it('returns 30 for /api/v1/exposures', () => {
      expect(getTTL('/api/v1/exposures')).toBe(30)
    })
  })

  describe('default TTL', () => {
    it('returns DEFAULT_TTL for an unknown path', () => {
      expect(getTTL('/api/v1/unknown-path')).toBe(DEFAULT_TTL)
    })

    it('returns DEFAULT_TTL (30) for paths not matching any prefix', () => {
      expect(getTTL('/api/v1/some-other-endpoint')).toBe(30)
    })

    it('DEFAULT_TTL is 30 seconds', () => {
      expect(DEFAULT_TTL).toBe(30)
    })
  })

  describe('all CACHE_TTLS entries are covered', () => {
    it.each(Object.entries(CACHE_TTLS))('returns correct TTL for %s (expected %d)', (path, ttl) => {
      expect(getTTL(path)).toBe(ttl)
    })
  })
})
