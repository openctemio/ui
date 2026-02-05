/**
 * API Transformation Utilities
 *
 * Transform API responses to UI types
 */

import type { ApiComponent, ApiComponentListResponse, ApiVulnerableComponent } from '../api/component-api.types'
import type {
  Component,
  ComponentStats,
  ComponentEcosystem,
  ComponentType,
  LicenseCategory,
  LicenseRisk,
} from '../types'

// ============================================
// ECOSYSTEM MAPPING
// ============================================

const ecosystemMap: Record<string, ComponentEcosystem> = {
  npm: 'npm',
  pypi: 'pypi',
  maven: 'maven',
  gradle: 'gradle',
  nuget: 'nuget',
  go: 'go',
  cargo: 'cargo',
  rubygems: 'rubygems',
  composer: 'composer',
  cocoapods: 'cocoapods',
  swift: 'swift',
  pub: 'pub',
  hex: 'hex',
  packagist: 'packagist',
  crates: 'crates',
  apt: 'apt',
  yum: 'yum',
  apk: 'apk',
  homebrew: 'homebrew',
  docker: 'docker',
  oci: 'oci',
}

function mapEcosystem(apiEcosystem: string): ComponentEcosystem {
  return ecosystemMap[apiEcosystem.toLowerCase()] || 'npm'
}

// ============================================
// LICENSE RISK MAPPING
// ============================================

const licenseRiskMap: Record<string, LicenseRisk> = {
  critical: 'critical',
  high: 'high',
  medium: 'medium',
  low: 'low',
  none: 'none',
  unknown: 'unknown',
}

function mapLicenseRisk(risk?: string): LicenseRisk {
  if (!risk) return 'unknown'
  return licenseRiskMap[risk.toLowerCase()] || 'unknown'
}

// ============================================
// LICENSE CATEGORY DETECTION
// ============================================

function detectLicenseCategory(licenseId?: string): LicenseCategory {
  if (!licenseId) return 'unknown'

  const id = licenseId.toUpperCase()

  // Permissive licenses
  if (['MIT', 'APACHE-2.0', 'BSD-2-CLAUSE', 'BSD-3-CLAUSE', 'ISC'].some(l => id.includes(l))) {
    return 'permissive'
  }

  // Strong Copyleft
  if (['GPL-2.0', 'GPL-3.0', 'AGPL'].some(l => id.includes(l))) {
    return 'copyleft'
  }

  // Weak Copyleft
  if (['LGPL', 'MPL', 'EPL'].some(l => id.includes(l))) {
    return 'weak-copyleft'
  }

  // Public Domain
  if (['CC0', 'UNLICENSE'].some(l => id.includes(l))) {
    return 'public-domain'
  }

  return 'unknown'
}

// ============================================
// TRANSFORM FUNCTIONS
// ============================================

/**
 * Transform API component to UI component type
 */
export function transformApiComponent(api: ApiComponent): Component {
  const ecosystem = mapEcosystem(api.ecosystem)
  const licenseCategory = detectLicenseCategory(api.license)
  const isDirect = api.dependency_type === 'direct'

  // Extract additional info from metadata if available
  const metadata = api.metadata || {}

  return {
    id: api.id,
    name: api.name,
    version: api.version,
    ecosystem,
    type: 'library' as ComponentType,
    purl: api.purl,
    description: (metadata.description as string) || undefined,
    homepage: (metadata.homepage as string) || undefined,
    repositoryUrl: (metadata.repository_url as string) || undefined,
    sources: [],
    sourceCount: 0,
    isDirect,
    depth: isDirect ? 0 : 1,
    latestVersion: (metadata.latest_version as string) || null,
    isOutdated: (metadata.outdated as boolean) || false,
    vulnerabilities: [],
    vulnerabilityCount: {
      critical: 0,
      high: 0,
      medium: 0,
      low: api.vulnerability_count || 0,
      info: 0,
    },
    riskScore: (metadata.risk_score as number) || 0,
    license: api.license || null,
    licenseId: api.license || null,
    licenseCategory,
    licenseRisk: mapLicenseRisk((metadata.license_risk as string) || undefined),
    author: (metadata.author as string) || undefined,
    publishedAt: (metadata.published_at as string) || undefined,
    status: 'active' as const,
    firstSeen: api.created_at,
    lastSeen: api.updated_at,
    createdAt: api.created_at,
    updatedAt: api.updated_at,
  }
}

/**
 * Transform API component list to UI component array
 */
export function transformApiComponents(response: ApiComponentListResponse): Component[] {
  return response.data.map(transformApiComponent)
}

/**
 * Calculate stats from components array
 */
export function calculateComponentStats(components: Component[]): ComponentStats {
  const ecosystemCounts = components.reduce((acc, c) => {
    acc[c.ecosystem] = (acc[c.ecosystem] || 0) + 1
    return acc
  }, {} as Record<ComponentEcosystem, number>)

  const typeCounts = components.reduce((acc, c) => {
    acc[c.type] = (acc[c.type] || 0) + 1
    return acc
  }, {} as Record<ComponentType, number>)

  const licenseRiskCounts = components.reduce((acc, c) => {
    acc[c.licenseRisk] = (acc[c.licenseRisk] || 0) + 1
    return acc
  }, {} as Record<LicenseRisk, number>)

  const licenseCategoryCounts = components.reduce((acc, c) => {
    acc[c.licenseCategory] = (acc[c.licenseCategory] || 0) + 1
    return acc
  }, {} as Record<LicenseCategory, number>)

  const vulnTotals = components.reduce(
    (acc, c) => ({
      critical: acc.critical + c.vulnerabilityCount.critical,
      high: acc.high + c.vulnerabilityCount.high,
      medium: acc.medium + c.vulnerabilityCount.medium,
      low: acc.low + c.vulnerabilityCount.low,
      info: acc.info + c.vulnerabilityCount.info,
    }),
    { critical: 0, high: 0, medium: 0, low: 0, info: 0 }
  )

  return {
    totalComponents: components.length,
    directDependencies: components.filter((c) => c.isDirect).length,
    transitiveDependencies: components.filter((c) => !c.isDirect).length,
    byEcosystem: ecosystemCounts as Record<ComponentEcosystem, number>,
    byType: typeCounts as Record<ComponentType, number>,
    totalVulnerabilities:
      vulnTotals.critical + vulnTotals.high + vulnTotals.medium + vulnTotals.low + vulnTotals.info,
    vulnerabilitiesBySeverity: vulnTotals,
    componentsWithVulnerabilities: components.filter(
      (c) =>
        c.vulnerabilityCount.critical > 0 ||
        c.vulnerabilityCount.high > 0 ||
        c.vulnerabilityCount.medium > 0
    ).length,
    componentsInCisaKev: components.filter((c) =>
      c.vulnerabilities.some((v) => v.inCisaKev)
    ).length,
    byLicenseRisk: licenseRiskCounts as Record<LicenseRisk, number>,
    byLicenseCategory: licenseCategoryCounts as Record<LicenseCategory, number>,
    outdatedComponents: components.filter((c) => c.isOutdated).length,
    averageRiskScore: components.length
      ? Math.round(components.reduce((acc, c) => acc + c.riskScore, 0) / components.length)
      : 0,
  }
}

/**
 * Calculate ecosystem stats from components
 */
export function calculateEcosystemStats(components: Component[]) {
  const ecosystemMap = new Map<ComponentEcosystem, {
    count: number
    vulnerabilities: number
    outdated: number
    totalRisk: number
  }>()

  components.forEach((c) => {
    const existing = ecosystemMap.get(c.ecosystem) || {
      count: 0,
      vulnerabilities: 0,
      outdated: 0,
      totalRisk: 0,
    }

    existing.count++
    existing.vulnerabilities +=
      c.vulnerabilityCount.critical +
      c.vulnerabilityCount.high +
      c.vulnerabilityCount.medium
    if (c.isOutdated) existing.outdated++
    existing.totalRisk += c.riskScore

    ecosystemMap.set(c.ecosystem, existing)
  })

  return Array.from(ecosystemMap.entries())
    .map(([ecosystem, data]) => ({
      ecosystem,
      count: data.count,
      vulnerabilities: data.vulnerabilities,
      outdated: data.outdated,
      avgRiskScore: data.count ? Math.round(data.totalRisk / data.count) : 0,
    }))
    .sort((a, b) => b.count - a.count)
}

/**
 * Calculate license stats from components
 */
export function calculateLicenseStats(components: Component[]) {
  const licenses = new Map<string, { count: number; risk: LicenseRisk; category: LicenseCategory }>()

  components.forEach((c) => {
    if (c.licenseId) {
      const existing = licenses.get(c.licenseId)
      if (existing) {
        existing.count++
      } else {
        licenses.set(c.licenseId, {
          count: 1,
          risk: c.licenseRisk,
          category: c.licenseCategory,
        })
      }
    }
  })

  return Array.from(licenses.entries())
    .map(([id, data]) => ({
      licenseId: id,
      ...data,
    }))
    .sort((a, b) => b.count - a.count)
}

// ============================================
// VULNERABLE COMPONENT TRANSFORMATION
// ============================================

/**
 * Calculate risk score from vulnerability counts
 * Higher weights for more severe vulnerabilities
 */
function calculateRiskScore(critical: number, high: number, medium: number, low: number): number {
  // Weighted calculation: critical=40, high=20, medium=5, low=1, capped at 100
  const score = critical * 40 + high * 20 + medium * 5 + low * 1
  return Math.min(100, score)
}

/**
 * Transform API vulnerable component to UI Component type
 * Used for the vulnerable components page
 */
export function transformVulnerableComponent(api: ApiVulnerableComponent): Component {
  const ecosystem = mapEcosystem(api.ecosystem)
  const licenseCategory = detectLicenseCategory(api.license)
  const riskScore = calculateRiskScore(
    api.critical_count,
    api.high_count,
    api.medium_count,
    api.low_count
  )

  // Create placeholder vulnerabilities to support UI features
  // The count tells us there are vulnerabilities, but we don't have full details
  const vulnerabilities: Component['vulnerabilities'] = []

  // Add a placeholder for each severity level to enable filtering
  if (api.critical_count > 0) {
    vulnerabilities.push({
      id: `${api.id}-critical`,
      cveId: `${api.critical_count} Critical`,
      severity: 'critical',
      cvssScore: 9.5,
      cvssVector: null,
      title: `${api.critical_count} critical vulnerabilities`,
      description: '',
      fixedVersion: null,
      fixAvailable: false,
      exploitAvailable: false,
      exploitMaturity: 'not-defined',
      inCisaKev: api.in_cisa_kev,
      epssScore: null,
      epssPercentile: null,
      references: [],
      publishedAt: new Date().toISOString(),
      lastModifiedAt: new Date().toISOString(),
    })
  }

  if (api.high_count > 0) {
    vulnerabilities.push({
      id: `${api.id}-high`,
      cveId: `${api.high_count} High`,
      severity: 'high',
      cvssScore: 8.0,
      cvssVector: null,
      title: `${api.high_count} high vulnerabilities`,
      description: '',
      fixedVersion: null,
      fixAvailable: false,
      exploitAvailable: false,
      exploitMaturity: 'not-defined',
      inCisaKev: false,
      epssScore: null,
      epssPercentile: null,
      references: [],
      publishedAt: new Date().toISOString(),
      lastModifiedAt: new Date().toISOString(),
    })
  }

  const now = new Date().toISOString()

  return {
    id: api.id,
    name: api.name,
    version: api.version,
    ecosystem,
    type: 'library',
    purl: api.purl,
    description: undefined,
    homepage: undefined,
    repositoryUrl: undefined,
    sources: [],
    sourceCount: 1, // At least found in one source
    isDirect: true, // Default to direct since we don't know
    depth: 0,
    latestVersion: null,
    isOutdated: false,
    vulnerabilities,
    vulnerabilityCount: {
      critical: api.critical_count,
      high: api.high_count,
      medium: api.medium_count,
      low: api.low_count,
      info: 0,
    },
    riskScore,
    license: api.license || null,
    licenseId: api.license || null,
    licenseCategory,
    licenseRisk: api.license ? mapLicenseRisk(undefined) : 'unknown',
    author: undefined,
    publishedAt: undefined,
    status: 'active',
    firstSeen: now,
    lastSeen: now,
    createdAt: now,
    updatedAt: now,
  }
}

/**
 * Transform API vulnerable components array to UI Component array
 */
export function transformVulnerableComponents(apis: ApiVulnerableComponent[]): Component[] {
  return apis.map(transformVulnerableComponent)
}
