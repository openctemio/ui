/**
 * Mock Data Helpers
 *
 * Utility functions for generating and enriching mock asset data
 */

import type { Asset, AssetType, AssetScope, ExposureLevel, Criticality } from '../../types'

/**
 * Base asset type without scope, exposure and criticality (to be enriched)
 */
export type BaseAsset = Omit<Asset, 'scope' | 'exposure' | 'criticality'>

/**
 * Derive scope, exposure, and criticality based on asset characteristics
 * This simulates how a real system would classify assets
 */
export const deriveAssetClassification = (
  type: AssetType,
  name: string,
  tags?: string[],
  metadata?: Record<string, unknown>,
  riskScore?: number
): { scope: AssetScope; exposure: ExposureLevel; criticality: Criticality } => {
  const tagsSet = new Set(tags || [])
  const nameLC = name.toLowerCase()

  // Determine scope
  let scope: AssetScope = 'internal'

  if (metadata?.cloudProvider || type === 'cloud_account') {
    scope = 'cloud'
  } else if (tagsSet.has('vendor') || tagsSet.has('third-party') || nameLC.includes('vendor')) {
    scope = 'vendor'
  } else if (tagsSet.has('partner') || nameLC.includes('partner')) {
    scope = 'partner'
  } else if (tagsSet.has('shadow') || tagsSet.has('unknown')) {
    scope = 'shadow'
  } else if (
    type === 'domain' ||
    type === 'website' ||
    type === 'api' ||
    tagsSet.has('customer-facing') ||
    tagsSet.has('public')
  ) {
    scope = 'external'
  }

  // Determine exposure
  let exposure: ExposureLevel = 'private'

  if (type === 'domain' || type === 'website') {
    exposure = 'public'
  } else if (type === 'api' && (nameLC.includes('public') || tagsSet.has('public'))) {
    exposure = 'public'
  } else if (type === 'api') {
    exposure = 'restricted'
  } else if (type === 'mobile') {
    exposure = 'public' // Apps are distributed publicly
  } else if (
    type === 'service' &&
    (tagsSet.has('customer-facing') || nameLC.includes('gateway') || nameLC.includes('api'))
  ) {
    exposure = 'restricted'
  } else if (type === 'repository' && metadata?.visibility === 'public') {
    exposure = 'public'
  } else if (type === 'repository') {
    exposure = 'restricted'
  } else if (type === 'credential') {
    exposure = 'isolated' // Credentials should be highly protected
  } else if (type === 'database' || type === 'container' || type === 'host') {
    exposure = nameLC.includes('staging') || nameLC.includes('dev') ? 'private' : 'private'
  }

  // Determine criticality
  let criticality: Criticality = 'medium'

  if (tagsSet.has('critical') || tagsSet.has('banking') || tagsSet.has('pci-dss')) {
    criticality = 'critical'
  } else if (tagsSet.has('production') || tagsSet.has('prod') || nameLC.includes('prod')) {
    criticality = 'high'
  } else if (type === 'database' && !nameLC.includes('dev') && !nameLC.includes('test')) {
    criticality = 'high'
  } else if (type === 'credential') {
    criticality = 'critical' // Credentials are always critical
  } else if (nameLC.includes('dev') || nameLC.includes('test') || nameLC.includes('staging')) {
    criticality = 'low'
  } else if (riskScore !== undefined) {
    // Derive from risk score if available
    if (riskScore >= 80) criticality = 'critical'
    else if (riskScore >= 60) criticality = 'high'
    else if (riskScore >= 30) criticality = 'medium'
    else criticality = 'low'
  }

  // Override for critical/banking assets
  if (tagsSet.has('critical') || tagsSet.has('banking') || tagsSet.has('pci-dss')) {
    // Critical assets might be isolated or restricted
    if (exposure === 'public' && type !== 'domain' && type !== 'website') {
      exposure = 'restricted'
    }
  }

  return { scope, exposure, criticality }
}

/**
 * @deprecated Use deriveAssetClassification instead
 */
export const deriveScopeAndExposure = (
  type: AssetType,
  name: string,
  tags?: string[],
  metadata?: Record<string, unknown>
): { scope: AssetScope; exposure: ExposureLevel } => {
  const result = deriveAssetClassification(type, name, tags, metadata)
  return { scope: result.scope, exposure: result.exposure }
}

/**
 * Enrich a base asset with derived scope, exposure, and criticality
 */
export const enrichAsset = (asset: BaseAsset): Asset => {
  const { scope, exposure, criticality } = deriveAssetClassification(
    asset.type,
    asset.name,
    asset.tags,
    asset.metadata as Record<string, unknown>,
    asset.riskScore
  )
  return { ...asset, scope, exposure, criticality }
}

/**
 * Helper to generate dates relative to today
 */
export const daysAgo = (days: number): string => {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date.toISOString()
}
