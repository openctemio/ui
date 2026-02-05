/**
 * Tenant Logo Storage Utility
 *
 * Manages tenant logo cache in localStorage.
 * Extracted from use-tenant-logo.ts for use in non-React contexts.
 */

const LOGO_CACHE_PREFIX = 'app_tenant_logo_'
const LEGACY_LOGO_CACHE_PREFIX = 'rediver_tenant_logo_'

/**
 * Clear logo cache for a specific tenant
 */
export function clearTenantLogoCache(tenantId: string): void {
  if (typeof window === 'undefined') return

  try {
    // Clear both old and new key formats
    localStorage.removeItem(`${LOGO_CACHE_PREFIX}${tenantId}`)
    localStorage.removeItem(`${LEGACY_LOGO_CACHE_PREFIX}${tenantId}`)
  } catch {
    // Ignore errors
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
      if (key?.startsWith(LOGO_CACHE_PREFIX) || key?.startsWith(LEGACY_LOGO_CACHE_PREFIX)) {
        keysToRemove.push(key)
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key))
  } catch {
    // Ignore errors
  }
}
