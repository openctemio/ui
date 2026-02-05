/**
 * Permission Storage Utility
 *
 * Stores user permissions in localStorage for instant UI rendering.
 * This is part of the real-time permission sync system.
 *
 * Key features:
 * - Stores permissions per tenant for multi-tenant support
 * - Includes version for stale detection
 * - Automatic cleanup of old data
 *
 * Storage format:
 * {
 *   permissions: string[],
 *   version: number,
 *   updatedAt: number (timestamp)
 * }
 */

import { isClient } from './env'

// Storage key prefix
const STORAGE_PREFIX = 'rediver_perms'

// TTL for cached permissions (24 hours)
const CACHE_TTL_MS = 24 * 60 * 60 * 1000

/**
 * Stored permission data structure
 */
export interface StoredPermissions {
  permissions: string[]
  version: number
  updatedAt: number
}

/**
 * Build storage key for a tenant
 */
function buildKey(tenantId: string): string {
  return `${STORAGE_PREFIX}:${tenantId}`
}

/**
 * Get permissions from localStorage
 * Returns null if not found or expired
 */
export function getStoredPermissions(tenantId: string): StoredPermissions | null {
  if (!isClient()) return null

  try {
    const key = buildKey(tenantId)
    const data = localStorage.getItem(key)
    if (!data) return null

    const stored: StoredPermissions = JSON.parse(data)

    // Check if expired
    const now = Date.now()
    if (now - stored.updatedAt > CACHE_TTL_MS) {
      // Remove expired data
      localStorage.removeItem(key)
      return null
    }

    return stored
  } catch {
    // Invalid data, remove it
    localStorage.removeItem(buildKey(tenantId))
    return null
  }
}

/**
 * Store permissions in localStorage
 */
export function storePermissions(tenantId: string, permissions: string[], version: number): void {
  if (!isClient()) return

  try {
    const key = buildKey(tenantId)
    const data: StoredPermissions = {
      permissions,
      version,
      updatedAt: Date.now(),
    }
    localStorage.setItem(key, JSON.stringify(data))
  } catch (error) {
    // localStorage might be full or disabled
    console.warn('[PermissionStorage] Failed to store permissions:', error)
  }
}

/**
 * Remove permissions from localStorage
 */
export function removeStoredPermissions(tenantId: string): void {
  if (!isClient()) return

  try {
    const key = buildKey(tenantId)
    localStorage.removeItem(key)
  } catch {
    // Ignore errors
  }
}

/**
 * Clear all stored permissions (all tenants)
 */
export function clearAllStoredPermissions(): void {
  if (!isClient()) return

  try {
    const keysToRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith(STORAGE_PREFIX)) {
        keysToRemove.push(key)
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key))
  } catch {
    // Ignore errors
  }
}

/**
 * Check if stored permissions are stale (version mismatch)
 */
export function isPermissionStale(tenantId: string, currentVersion: number): boolean {
  const stored = getStoredPermissions(tenantId)
  if (!stored) return true // No stored permissions = stale
  return stored.version !== currentVersion
}

/**
 * Get permission version from localStorage
 * Returns 0 if not found
 */
export function getStoredPermissionVersion(tenantId: string): number {
  const stored = getStoredPermissions(tenantId)
  return stored?.version ?? 0
}

/**
 * Check if user has a specific permission (from localStorage)
 */
export function hasStoredPermission(tenantId: string, permission: string): boolean {
  const stored = getStoredPermissions(tenantId)
  if (!stored) return false
  return stored.permissions.includes(permission)
}

/**
 * Check if user has any of the specified permissions (from localStorage)
 */
export function hasAnyStoredPermission(tenantId: string, permissions: string[]): boolean {
  const stored = getStoredPermissions(tenantId)
  if (!stored) return false
  return permissions.some((p) => stored.permissions.includes(p))
}

/**
 * Check if user has all of the specified permissions (from localStorage)
 */
export function hasAllStoredPermissions(tenantId: string, permissions: string[]): boolean {
  const stored = getStoredPermissions(tenantId)
  if (!stored) return false
  return permissions.every((p) => stored.permissions.includes(p))
}

/**
 * Clean up expired permission caches
 * Call this on app startup
 */
export function cleanupExpiredPermissions(): void {
  if (!isClient()) return

  try {
    const now = Date.now()
    const keysToRemove: string[] = []

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith(STORAGE_PREFIX)) {
        try {
          const data = localStorage.getItem(key)
          if (data) {
            const stored: StoredPermissions = JSON.parse(data)
            if (now - stored.updatedAt > CACHE_TTL_MS) {
              keysToRemove.push(key)
            }
          }
        } catch {
          // Invalid data, mark for removal
          keysToRemove.push(key)
        }
      }
    }

    keysToRemove.forEach((key) => localStorage.removeItem(key))

    if (keysToRemove.length > 0) {
      console.log(`[PermissionStorage] Cleaned up ${keysToRemove.length} expired entries`)
    }
  } catch {
    // Ignore errors
  }
}
