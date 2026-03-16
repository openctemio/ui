/**
 * Cache Store Abstraction
 *
 * Provides a cache-aside pattern implementation with pluggable backends.
 * Currently uses an in-memory Map with TTL-based expiration.
 *
 * In-memory cache store. Replace with Redis-backed store for multi-instance deployments.
 *
 * Architecture:
 * - CacheStore interface defines get/set/delete/clear operations
 * - InMemoryCacheStore implements in-memory caching with automatic TTL cleanup
 * - Singleton instance exported for use across API routes
 *
 * Memory safety:
 * - Maximum 1000 entries to prevent unbounded memory growth
 * - Automatic cleanup of expired entries every 60 seconds
 * - LRU-style eviction when max entries exceeded (oldest entries removed first)
 */

export interface CacheEntry {
  body: string
  ttl: number
  expiresAt: number
}

export interface CacheStore {
  get(key: string): Promise<CacheEntry | null>
  set(key: string, body: string, ttl: number): Promise<void>
  delete(key: string): Promise<void>
  clear(): Promise<void>
  size(): number
}

// ============================================
// IN-MEMORY CACHE STORE
// ============================================

const MAX_ENTRIES = 1000
const CLEANUP_INTERVAL_MS = 60_000 // 60 seconds

class InMemoryCacheStore implements CacheStore {
  private store = new Map<string, CacheEntry>()
  private cleanupTimer: ReturnType<typeof setInterval> | null = null

  constructor() {
    // Start periodic cleanup of expired entries
    this.cleanupTimer = setInterval(() => {
      this.evictExpired()
    }, CLEANUP_INTERVAL_MS)

    // Ensure timer doesn't prevent process exit
    if (
      this.cleanupTimer &&
      typeof this.cleanupTimer === 'object' &&
      'unref' in this.cleanupTimer
    ) {
      this.cleanupTimer.unref()
    }
  }

  async get(key: string): Promise<CacheEntry | null> {
    const entry = this.store.get(key)
    if (!entry) {
      return null
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key)
      return null
    }

    // Move to end of Map for LRU ordering (Map preserves insertion order)
    this.store.delete(key)
    this.store.set(key, entry)

    return entry
  }

  async set(key: string, body: string, ttl: number): Promise<void> {
    // Enforce max entries limit
    if (this.store.size >= MAX_ENTRIES && !this.store.has(key)) {
      this.evictOldest()
    }

    this.store.set(key, {
      body,
      ttl,
      expiresAt: Date.now() + ttl * 1000,
    })
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key)
  }

  async clear(): Promise<void> {
    this.store.clear()
  }

  size(): number {
    return this.store.size
  }

  /**
   * Remove all expired entries
   */
  private evictExpired(): void {
    const now = Date.now()
    for (const [key, entry] of this.store) {
      if (now > entry.expiresAt) {
        this.store.delete(key)
      }
    }
  }

  /**
   * Remove oldest entries when at capacity
   * Map maintains insertion order, so first entries are oldest
   */
  private evictOldest(): void {
    const entriesToRemove = Math.max(1, Math.floor(MAX_ENTRIES * 0.1)) // Remove 10%
    let removed = 0
    for (const key of this.store.keys()) {
      if (removed >= entriesToRemove) break
      this.store.delete(key)
      removed++
    }
  }

  /**
   * Cleanup resources (for testing or shutdown)
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = null
    }
    this.store.clear()
  }
}

// ============================================
// SINGLETON INSTANCE
// ============================================

/**
 * Global cache store instance.
 *
 * Uses Node.js global to persist across hot module reloads in development.
 * In production, this lives for the lifetime of the server process.
 */

// Extend globalThis to avoid TypeScript errors
const globalForCache = globalThis as typeof globalThis & {
  __cacheStore?: InMemoryCacheStore
}

export const cacheStore: CacheStore = globalForCache.__cacheStore ?? new InMemoryCacheStore()

if (process.env.NODE_ENV !== 'production') {
  globalForCache.__cacheStore = cacheStore as InMemoryCacheStore
}
