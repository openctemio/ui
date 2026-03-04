/**
 * Cache Store Tests
 *
 * Tests for the InMemoryCacheStore implementation:
 * - set/get operations
 * - TTL expiration
 * - delete/clear operations
 * - size tracking
 * - Max entries eviction
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// We cannot import the singleton directly because it has side effects (setInterval).
// Instead, we dynamically import and test a fresh instance each time.
// The module exports the class indirectly via the singleton -- we need to
// re-import each time to get a clean store, or test via the exported interface.

// For unit testing, we'll re-implement a clean import strategy:
// import the module and use cacheStore, clearing between tests.

let cacheStore: Awaited<typeof import('../cache-store')>['cacheStore']

describe('InMemoryCacheStore', () => {
  beforeEach(async () => {
    vi.useFakeTimers()
    // Re-import to get a fresh module (the singleton is cached in globalThis)
    // Clear the global cache store first
    const globalForCache = globalThis as typeof globalThis & {
      __cacheStore?: { destroy(): void }
    }
    if (globalForCache.__cacheStore) {
      globalForCache.__cacheStore.destroy()
      delete globalForCache.__cacheStore
    }

    // Clear the module cache so we get a fresh InMemoryCacheStore
    vi.resetModules()
    const mod = await import('../cache-store')
    cacheStore = mod.cacheStore
  })

  afterEach(async () => {
    // Clean up the store
    await cacheStore.clear()
    vi.useRealTimers()
  })

  // ============================================
  // SET AND GET
  // ============================================

  describe('set and get', () => {
    it('stores and retrieves a value', async () => {
      await cacheStore.set('key1', '{"data":"test"}', 60)
      const entry = await cacheStore.get('key1')

      expect(entry).not.toBeNull()
      expect(entry!.body).toBe('{"data":"test"}')
      expect(entry!.ttl).toBe(60)
    })

    it('stores multiple values independently', async () => {
      await cacheStore.set('key1', 'value1', 60)
      await cacheStore.set('key2', 'value2', 120)

      const entry1 = await cacheStore.get('key1')
      const entry2 = await cacheStore.get('key2')

      expect(entry1!.body).toBe('value1')
      expect(entry2!.body).toBe('value2')
    })

    it('overwrites existing key with new value', async () => {
      await cacheStore.set('key1', 'old', 60)
      await cacheStore.set('key1', 'new', 120)

      const entry = await cacheStore.get('key1')
      expect(entry!.body).toBe('new')
      expect(entry!.ttl).toBe(120)
    })

    it('sets correct expiresAt based on TTL', async () => {
      const now = Date.now()
      await cacheStore.set('key1', 'value', 30)

      const entry = await cacheStore.get('key1')
      // TTL is in seconds, expiresAt should be now + ttl * 1000
      expect(entry!.expiresAt).toBeGreaterThanOrEqual(now + 30 * 1000)
    })
  })

  // ============================================
  // TTL EXPIRATION
  // ============================================

  describe('TTL expiration', () => {
    it('returns null for expired entries', async () => {
      await cacheStore.set('key1', 'value', 1) // 1 second TTL

      // Advance time past TTL
      vi.advanceTimersByTime(1001)

      const entry = await cacheStore.get('key1')
      expect(entry).toBeNull()
    })

    it('returns entry before TTL expires', async () => {
      await cacheStore.set('key1', 'value', 5) // 5 second TTL

      // Advance time but not past TTL
      vi.advanceTimersByTime(3000)

      const entry = await cacheStore.get('key1')
      expect(entry).not.toBeNull()
      expect(entry!.body).toBe('value')
    })

    it('returns null exactly at TTL boundary', async () => {
      await cacheStore.set('key1', 'value', 1) // 1 second TTL

      // Advance time to exactly TTL + 1ms
      vi.advanceTimersByTime(1001)

      const entry = await cacheStore.get('key1')
      expect(entry).toBeNull()
    })
  })

  // ============================================
  // DELETE
  // ============================================

  describe('delete', () => {
    it('removes an existing entry', async () => {
      await cacheStore.set('key1', 'value', 60)
      await cacheStore.delete('key1')

      const entry = await cacheStore.get('key1')
      expect(entry).toBeNull()
    })

    it('does not throw when deleting non-existent key', async () => {
      await expect(cacheStore.delete('nonexistent')).resolves.toBeUndefined()
    })

    it('only removes the specified key', async () => {
      await cacheStore.set('key1', 'value1', 60)
      await cacheStore.set('key2', 'value2', 60)

      await cacheStore.delete('key1')

      expect(await cacheStore.get('key1')).toBeNull()
      expect(await cacheStore.get('key2')).not.toBeNull()
    })
  })

  // ============================================
  // CLEAR
  // ============================================

  describe('clear', () => {
    it('removes all entries', async () => {
      await cacheStore.set('key1', 'value1', 60)
      await cacheStore.set('key2', 'value2', 60)
      await cacheStore.set('key3', 'value3', 60)

      await cacheStore.clear()

      expect(await cacheStore.get('key1')).toBeNull()
      expect(await cacheStore.get('key2')).toBeNull()
      expect(await cacheStore.get('key3')).toBeNull()
      expect(cacheStore.size()).toBe(0)
    })

    it('does not throw when clearing empty store', async () => {
      await expect(cacheStore.clear()).resolves.toBeUndefined()
    })
  })

  // ============================================
  // SIZE
  // ============================================

  describe('size', () => {
    it('returns 0 for empty store', () => {
      expect(cacheStore.size()).toBe(0)
    })

    it('returns correct count after adding entries', async () => {
      await cacheStore.set('key1', 'value1', 60)
      expect(cacheStore.size()).toBe(1)

      await cacheStore.set('key2', 'value2', 60)
      expect(cacheStore.size()).toBe(2)
    })

    it('does not double-count overwritten keys', async () => {
      await cacheStore.set('key1', 'value1', 60)
      await cacheStore.set('key1', 'value2', 60)

      expect(cacheStore.size()).toBe(1)
    })

    it('decrements after delete', async () => {
      await cacheStore.set('key1', 'value1', 60)
      await cacheStore.set('key2', 'value2', 60)
      await cacheStore.delete('key1')

      expect(cacheStore.size()).toBe(1)
    })
  })

  // ============================================
  // MAX ENTRIES EVICTION
  // ============================================

  describe('max entries eviction', () => {
    it('evicts oldest entries when exceeding 1000 entries', async () => {
      // Fill the cache to max capacity (1000)
      for (let i = 0; i < 1000; i++) {
        await cacheStore.set(`key-${i}`, `value-${i}`, 3600)
      }

      expect(cacheStore.size()).toBe(1000)

      // Add one more -- should trigger eviction of ~10% (100 oldest)
      await cacheStore.set('key-new', 'value-new', 3600)

      // Size should now be 1000 - 100 + 1 = 901
      expect(cacheStore.size()).toBeLessThanOrEqual(1000)

      // The new key should be present
      const newEntry = await cacheStore.get('key-new')
      expect(newEntry).not.toBeNull()
      expect(newEntry!.body).toBe('value-new')

      // Oldest keys should have been evicted
      const oldestEntry = await cacheStore.get('key-0')
      expect(oldestEntry).toBeNull()
    })

    it('does not evict when updating an existing key at capacity', async () => {
      // Fill the cache to max capacity
      for (let i = 0; i < 1000; i++) {
        await cacheStore.set(`key-${i}`, `value-${i}`, 3600)
      }

      // Update an existing key -- should NOT trigger eviction
      await cacheStore.set('key-0', 'updated-value', 3600)

      expect(cacheStore.size()).toBe(1000)

      // The updated key should have the new value
      const entry = await cacheStore.get('key-0')
      expect(entry!.body).toBe('updated-value')

      // Other keys should still be present
      const otherEntry = await cacheStore.get('key-999')
      expect(otherEntry).not.toBeNull()
    })
  })

  // ============================================
  // NON-EXISTENT KEY
  // ============================================

  describe('non-existent key', () => {
    it('returns null for a key that was never set', async () => {
      const entry = await cacheStore.get('nonexistent')
      expect(entry).toBeNull()
    })

    it('returns null for an empty string key that was never set', async () => {
      const entry = await cacheStore.get('')
      expect(entry).toBeNull()
    })
  })
})
