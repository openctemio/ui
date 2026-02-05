/**
 * Scope Matcher Utility
 *
 * Provides functions to match assets against scope targets and exclusions.
 * Used to link discovered assets with their corresponding scope rules.
 *
 * Security improvements:
 * - Pattern length limits to prevent ReDoS
 * - Safe wildcard matching without regex
 * - Input validation and sanitization
 */

import type {
  ScopeTarget,
  ScopeExclusion,
  ScopeMatchResult,
  ScopeCoverage,
  ScopeTargetType,
} from '../types'
import { SCOPE_TO_ASSET_TYPE_MAP } from '../types'

// Constants for security limits
const MAX_PATTERN_LENGTH = 500
const MAX_VALUE_LENGTH = 2000
const MAX_WILDCARD_SEGMENTS = 10

/**
 * Validate and sanitize pattern input
 * Returns null if pattern is invalid
 */
export const validatePattern = (pattern: string): string | null => {
  if (!pattern || typeof pattern !== 'string') return null
  if (pattern.length > MAX_PATTERN_LENGTH) return null

  // Count wildcard segments to prevent excessive matching
  const wildcardCount = (pattern.match(/\*/g) || []).length
  if (wildcardCount > MAX_WILDCARD_SEGMENTS) return null

  return pattern.trim()
}

/**
 * Scope Pattern Matcher
 * Uses compiled RegEx for performance
 */

// Cache for compiled RegEx patterns to avoid re-compiling on every check
const patternCache = new Map<string, RegExp>()

/**
 * Compile a wildcard pattern to a RegExp
 * Memoized for performance
 */
export const compilePattern = (pattern: string): RegExp => {
  if (patternCache.has(pattern)) {
    return patternCache.get(pattern)!
  }

  // Escape special regex characters except *
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&')

  // Convert * to .*
  const regexString = '^' + escaped.replace(/\*/g, '.*') + '$'
  const regex = new RegExp(regexString, 'i') // Case insensitive

  patternCache.set(pattern, regex)
  return regex
}

/**
 * Check if a value matches a wildcard pattern
 * Uses memoized RegEx
 */
export const matchWildcard = (pattern: string, value: string): boolean => {
  if (!pattern || !value) return false
  if (pattern.length > MAX_PATTERN_LENGTH || value.length > MAX_VALUE_LENGTH) {
    return false
  }

  try {
    const regex = compilePattern(pattern.trim())
    return regex.test(value.trim())
  } catch {
    return false
  }
}

/**
 * Check if an IP address falls within a CIDR range
 * Includes input validation for security
 */
export const matchCIDR = (cidr: string, ip: string): boolean => {
  try {
    // Validate inputs
    if (!cidr || !ip) return false
    if (cidr.length > 50 || ip.length > 50) return false

    const [range, bits] = cidr.split('/')
    if (!range || !bits) return false

    const mask = parseInt(bits, 10)
    if (isNaN(mask) || mask < 0 || mask > 32) return false

    const ipToLong = (ipStr: string): number => {
      // Validate IP format
      if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(ipStr)) return -1

      const parts = ipStr.split('.').map(Number)
      if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
        return -1
      }
      return parts.reduce((acc, octet) => (acc << 8) + octet, 0) >>> 0
    }

    const rangeLong = ipToLong(range)
    const ipLong = ipToLong(ip)

    if (rangeLong === -1 || ipLong === -1) return false

    const maskBits = mask === 0 ? 0 : (~0 << (32 - mask)) >>> 0
    return (rangeLong & maskBits) === (ipLong & maskBits)
  } catch {
    return false
  }
}

/**
 * Check if a domain matches a domain pattern (supports wildcards)
 * Uses RegExp implementation
 */
export const matchDomain = (pattern: string, domain: string): boolean => {
  return matchWildcard(pattern, domain)
}

/**
 * Check if a repository matches a repository pattern
 */
export const matchRepository = (pattern: string, repo: string): boolean => {
  // Validate inputs
  if (!pattern || !repo) return false
  if (pattern.length > MAX_PATTERN_LENGTH || repo.length > MAX_VALUE_LENGTH) {
    return false
  }

  const normalizedPattern = pattern.toLowerCase().trim()
  const normalizedRepo = repo.toLowerCase().trim()

  // Handle explicit /* suffix special case for GitHub orgs
  if (normalizedPattern.endsWith('/*')) {
    const basePattern = normalizedPattern.slice(0, -1) // Remove *
    return normalizedRepo.startsWith(basePattern)
  }

  return matchWildcard(normalizedPattern, normalizedRepo)
}

/**
 * Check if a cloud account matches a pattern
 */
export const matchCloudAccount = (pattern: string, account: string): boolean => {
  // Validate inputs
  if (!pattern || !account) return false
  if (pattern.length > MAX_PATTERN_LENGTH || account.length > MAX_VALUE_LENGTH) {
    return false
  }

  const normalizedPattern = pattern.toUpperCase().trim()
  const normalizedAccount = account.toUpperCase().trim()

  return normalizedPattern === normalizedAccount
}

/**
 * Check if asset type is compatible with scope target type
 * Uses the centralized SCOPE_TO_ASSET_TYPE_MAP from types
 */
const checkTypeCompatibility = (scopeType: ScopeTargetType, assetType: string): boolean => {
  return SCOPE_TO_ASSET_TYPE_MAP[scopeType]?.includes(assetType) ?? false
}

/**
 * Check if an asset matches a scope target
 */
export const matchesScopeTarget = (
  target: ScopeTarget,
  asset: { type: string; name: string; metadata?: Record<string, unknown> }
): { matches: boolean; matchType: 'exact' | 'wildcard' | 'cidr' | 'regex' } => {
  const { type: targetType, pattern } = target
  const { type: assetType, name, metadata } = asset

  // Validate pattern
  const validPattern = validatePattern(pattern)
  if (!validPattern) {
    return { matches: false, matchType: 'exact' }
  }

  // Type compatibility check
  const typeMatches = checkTypeCompatibility(targetType, assetType)
  if (!typeMatches) {
    return { matches: false, matchType: 'exact' }
  }

  // Match based on target type
  switch (targetType) {
    case 'domain':
    case 'subdomain':
    case 'certificate':
    case 'email_domain': {
      const domain = name || (metadata?.domain as string) || ''
      if (matchDomain(validPattern, domain)) {
        return {
          matches: true,
          matchType: validPattern.includes('*') ? 'wildcard' : 'exact',
        }
      }
      break
    }

    case 'ip_address': {
      const ip = name || (metadata?.ip as string) || ''
      if (validPattern === ip) {
        return { matches: true, matchType: 'exact' }
      }
      break
    }

    case 'ip_range': {
      const ip =
        name ||
        (metadata?.ip as string) ||
        (metadata?.privateIp as string) ||
        (metadata?.publicIp as string) ||
        ''
      if (matchCIDR(validPattern, ip)) {
        return { matches: true, matchType: 'cidr' }
      }
      break
    }

    case 'project':
    case 'repository': {
      const repo =
        `${metadata?.projectProvider || metadata?.repoProvider || 'github'}.com/${metadata?.org || ''}/${name}` ||
        name
      if (matchRepository(validPattern, repo)) {
        return {
          matches: true,
          matchType: validPattern.includes('*') ? 'wildcard' : 'exact',
        }
      }
      break
    }

    case 'cloud_account': {
      const account = `${(metadata?.cloudProvider as string)?.toUpperCase() || ''}:${metadata?.accountId || name}`
      if (matchCloudAccount(validPattern, account)) {
        return { matches: true, matchType: 'exact' }
      }
      break
    }

    default:
      // Generic wildcard match for other types (api, website, container, etc)
      const valueToCheck =
        name ||
        (metadata?.url as string) ||
        (metadata?.host as string) ||
        (metadata?.image as string) ||
        ''
      if (matchWildcard(validPattern, valueToCheck)) {
        return {
          matches: true,
          matchType: validPattern.includes('*') ? 'wildcard' : 'exact',
        }
      }
  }

  return { matches: false, matchType: 'exact' }
}

/**
 * Get all matching scope targets for an asset
 */
export const getScopeMatchesForAsset = (
  asset: { id: string; type: string; name: string; metadata?: Record<string, unknown> },
  targets: ScopeTarget[],
  exclusions: ScopeExclusion[]
): ScopeMatchResult => {
  const matchedTargets: ScopeMatchResult['matchedTargets'] = []
  const matchedExclusions: ScopeMatchResult['matchedExclusions'] = []

  // Check against all active targets
  for (const target of targets) {
    if (target.status !== 'active') continue

    const { matches, matchType } = matchesScopeTarget(target, asset)
    if (matches) {
      matchedTargets.push({
        targetId: target.id,
        pattern: target.pattern,
        matchType,
      })
    }
  }

  // Check against all active exclusions
  for (const exclusion of exclusions) {
    if (exclusion.status !== 'active') continue

    const { matches } = matchesScopeTarget(
      { ...exclusion, description: '', addedAt: '', addedBy: '' } as ScopeTarget,
      asset
    )
    if (matches) {
      matchedExclusions.push({
        exclusionId: exclusion.id,
        pattern: exclusion.pattern,
        reason: exclusion.reason,
      })
    }
  }

  return {
    assetId: asset.id,
    assetName: asset.name,
    assetType: asset.type,
    matchedTargets,
    matchedExclusions,
    inScope: matchedTargets.length > 0 && matchedExclusions.length === 0,
  }
}

/**
 * Calculate scope coverage for a list of assets
 * Optimized to be a pure function without internal caching overhead.
 * Cache management should be handled by the caller (e.g. useMemo).
 */
export const calculateScopeCoverage = (
  assets: Array<{ id: string; type: string; name: string; metadata?: Record<string, unknown> }>,
  targets: ScopeTarget[],
  exclusions: ScopeExclusion[]
): ScopeCoverage => {
  const byType: ScopeCoverage['byType'] = {}
  let inScopeCount = 0
  let excludedCount = 0

  for (const asset of assets) {
    // Initialize type stats
    if (!byType[asset.type]) {
      byType[asset.type] = { total: 0, inScope: 0, excluded: 0 }
    }
    byType[asset.type].total++

    // Get scope match
    const match = getScopeMatchesForAsset(asset, targets, exclusions)

    if (match.matchedExclusions.length > 0) {
      excludedCount++
      byType[asset.type].excluded++
    } else if (match.matchedTargets.length > 0) {
      inScopeCount++
      byType[asset.type].inScope++
    }
  }

  const totalAssets = assets.length
  const uncoveredAssets = totalAssets - inScopeCount - excludedCount
  const coveragePercent = totalAssets > 0 ? Math.round((inScopeCount / totalAssets) * 100) : 0

  return {
    totalAssets,
    inScopeAssets: inScopeCount,
    excludedAssets: excludedCount,
    uncoveredAssets,
    coveragePercent,
    byType,
  }
}

/**
 * Format scope match for display
 */
export const formatScopeMatch = (match: ScopeMatchResult): string => {
  if (match.matchedExclusions.length > 0) {
    return `Excluded: ${match.matchedExclusions[0].reason}`
  }
  if (match.matchedTargets.length > 0) {
    return `In scope: ${match.matchedTargets.map((t) => t.pattern).join(', ')}`
  }
  return 'Not in scope'
}
