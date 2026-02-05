/**
 * Tenant Logo Hook with LocalStorage Caching
 *
 * Provides cached access to tenant logo data with automatic cache invalidation.
 * Logo data is stored in localStorage to persist across sessions.
 */

import { useState, useEffect, useCallback, useMemo } from 'react'

const LOGO_CACHE_PREFIX = 'app_tenant_logo_'
const LOGO_CACHE_VERSION = 'v1'
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

interface CachedLogo {
  data: string
  version: string
  timestamp: number
  tenantId: string
}

/**
 * Get cached logo from localStorage
 */
function getCachedLogo(tenantId: string): string | null {
  if (typeof window === 'undefined') return null

  try {
    const key = `${LOGO_CACHE_PREFIX}${tenantId}`
    const cached = localStorage.getItem(key)
    if (!cached) return null

    const parsed: CachedLogo = JSON.parse(cached)

    // Check version and TTL
    if (parsed.version !== LOGO_CACHE_VERSION) {
      localStorage.removeItem(key)
      return null
    }

    if (Date.now() - parsed.timestamp > CACHE_TTL_MS) {
      localStorage.removeItem(key)
      return null
    }

    return parsed.data
  } catch {
    return null
  }
}

/**
 * Save logo to localStorage cache
 */
function setCachedLogo(tenantId: string, data: string): void {
  if (typeof window === 'undefined') return

  try {
    const key = `${LOGO_CACHE_PREFIX}${tenantId}`
    const cached: CachedLogo = {
      data,
      version: LOGO_CACHE_VERSION,
      timestamp: Date.now(),
      tenantId,
    }
    localStorage.setItem(key, JSON.stringify(cached))
  } catch {
    // Ignore storage errors (quota exceeded, etc.)
  }
}

/**
 * Remove logo from localStorage cache
 */
function clearCachedLogo(tenantId: string): void {
  if (typeof window === 'undefined') return

  try {
    const key = `${LOGO_CACHE_PREFIX}${tenantId}`
    localStorage.removeItem(key)
  } catch {
    // Ignore errors
  }
}

/**
 * Hook to manage tenant logo with caching
 *
 * @param tenantId - The tenant ID to cache logo for
 * @param serverLogo - Logo data from server (from settings or tenant object)
 * @param fallbackUrl - Fallback URL if no logo data exists
 */
export function useTenantLogo(
  tenantId: string | undefined,
  serverLogo?: string | null,
  fallbackUrl?: string
) {
  // Compute initial logo from cache or server (no setState needed)
  const initialLogo = useMemo(() => {
    if (!tenantId) return null

    // Try cache first
    const cached = getCachedLogo(tenantId)
    if (cached) return cached

    // No cache, use server data or fallback
    if (serverLogo) return serverLogo
    if (fallbackUrl) return fallbackUrl
    return null
  }, [tenantId, serverLogo, fallbackUrl])

  const [logoSrc, setLogoSrc] = useState<string | null>(initialLogo)

  // Sync state when inputs change - this is intentional external state synchronization
  useEffect(() => {
    // Compute new logo value based on current inputs
    let newLogo: string | null = null

    if (tenantId) {
      // Try cache first
      const cached = getCachedLogo(tenantId)
      if (cached) {
        newLogo = cached
      } else if (serverLogo) {
        // Use server data and cache it
        setCachedLogo(tenantId, serverLogo)
        newLogo = serverLogo
      } else if (fallbackUrl) {
        newLogo = fallbackUrl
      }

      // If server has newer data than cache, update
      if (serverLogo && cached && serverLogo !== cached) {
        setCachedLogo(tenantId, serverLogo)
        newLogo = serverLogo
      }
    }

    // Only update state if value changed
    if (newLogo !== logoSrc) {
      setLogoSrc(newLogo)
    }
  }, [tenantId, serverLogo, fallbackUrl, logoSrc])

  const isLoading = false // Logo is computed synchronously now

  // Update logo (also updates cache)
  const updateLogo = useCallback(
    (newLogo: string | null) => {
      if (!tenantId) return

      if (newLogo) {
        setCachedLogo(tenantId, newLogo)
        setLogoSrc(newLogo)
      } else {
        clearCachedLogo(tenantId)
        setLogoSrc(fallbackUrl || null)
      }
    },
    [tenantId, fallbackUrl]
  )

  // Clear cache (useful when tenant changes)
  const clearCache = useCallback(() => {
    if (tenantId) {
      clearCachedLogo(tenantId)
      setLogoSrc(fallbackUrl || null)
    }
  }, [tenantId, fallbackUrl])

  return {
    logoSrc,
    isLoading,
    updateLogo,
    clearCache,
    hasLogo: !!logoSrc,
  }
}

/**
 * Clear all tenant logo caches
 * Useful during logout or cache reset
 */
export function clearAllLogoCaches(): void {
  if (typeof window === 'undefined') return

  try {
    const keysToRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith(LOGO_CACHE_PREFIX)) {
        keysToRemove.push(key)
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key))
  } catch {
    // Ignore errors
  }
}
