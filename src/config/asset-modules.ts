/**
 * Asset Module Configuration
 *
 * Centralized configuration for managing asset type visibility in the sidebar.
 * This allows easy control over which asset types are shown/hidden during development.
 *
 * Status meanings:
 * - 'enabled': Module is fully developed and shown in sidebar
 * - 'coming_soon': Module is planned but not ready - can show with badge or hide
 * - 'disabled': Module is hidden from sidebar completely
 *
 * Usage:
 * 1. To enable a module: change status from 'coming_soon'/'disabled' to 'enabled'
 * 2. To hide a module: change status to 'disabled'
 * 3. To show "Coming Soon" badge: keep status as 'coming_soon' and set showComingSoon=true in sidebar
 */

export type AssetModuleStatus = 'enabled' | 'coming_soon' | 'disabled'

export interface AssetModuleConfig {
  /** Unique identifier matching the sidebar URL path (e.g., 'domains' for /assets/domains) */
  key: string
  /** Current development status */
  status: AssetModuleStatus
  /** Display label */
  label: string
  /** Optional description */
  description?: string
  /** Expected release quarter (for coming_soon items) */
  expectedRelease?: string
  /** Priority order (lower = higher priority) */
  order: number
}

/**
 * Asset Module Configuration
 *
 * Organized by CTEM categories:
 * 1. External Attack Surface (domains, certificates, ip-addresses)
 * 2. Applications (websites, apis, mobile, services)
 * 3. Cloud (cloud-accounts, cloud, compute, storage, serverless)
 * 4. Infrastructure (hosts, containers, databases, networks)
 * 5. Code & CI/CD (repositories)
 */
export const ASSET_MODULES: Record<string, AssetModuleConfig> = {
  // ========================================
  // External Attack Surface
  // ========================================
  domains: {
    key: 'domains',
    status: 'enabled',
    label: 'Domains',
    description: 'Root domains and subdomains',
    order: 1,
  },
  certificates: {
    key: 'certificates',
    status: 'enabled',
    label: 'Certificates',
    description: 'SSL/TLS certificates',
    order: 2,
  },
  'ip-addresses': {
    key: 'ip-addresses',
    status: 'enabled',
    label: 'IP Addresses',
    description: 'IPv4 and IPv6 addresses',
    order: 3,
  },

  // ========================================
  // Applications
  // ========================================
  websites: {
    key: 'websites',
    status: 'enabled',
    label: 'Websites',
    description: 'Web applications and portals',
    order: 10,
  },
  apis: {
    key: 'apis',
    status: 'enabled',
    label: 'APIs',
    description: 'REST, GraphQL, and SOAP APIs',
    order: 11,
  },
  mobile: {
    key: 'mobile',
    status: 'coming_soon',
    label: 'Mobile Apps',
    description: 'iOS and Android applications',
    expectedRelease: 'Q2 2026',
    order: 12,
  },
  services: {
    key: 'services',
    status: 'coming_soon',
    label: 'Services',
    description: 'Microservices and backend services',
    expectedRelease: 'Q2 2026',
    order: 13,
  },

  // ========================================
  // Cloud Infrastructure
  // ========================================
  'cloud-accounts': {
    key: 'cloud-accounts',
    status: 'coming_soon',
    label: 'Cloud Accounts',
    description: 'AWS, GCP, Azure accounts',
    expectedRelease: 'Q3 2026',
    order: 20,
  },
  cloud: {
    key: 'cloud',
    status: 'coming_soon',
    label: 'Cloud Resources',
    description: 'Cloud resources and services',
    expectedRelease: 'Q3 2026',
    order: 21,
  },
  compute: {
    key: 'compute',
    status: 'coming_soon',
    label: 'Compute',
    description: 'EC2, VMs, instances',
    expectedRelease: 'Q3 2026',
    order: 22,
  },
  storage: {
    key: 'storage',
    status: 'coming_soon',
    label: 'Storage',
    description: 'S3, Blob storage, buckets',
    expectedRelease: 'Q3 2026',
    order: 23,
  },
  serverless: {
    key: 'serverless',
    status: 'coming_soon',
    label: 'Serverless',
    description: 'Lambda, Cloud Functions',
    expectedRelease: 'Q3 2026',
    order: 24,
  },

  // ========================================
  // Infrastructure
  // ========================================
  hosts: {
    key: 'hosts',
    status: 'coming_soon',
    label: 'Hosts',
    description: 'Servers and virtual machines',
    expectedRelease: 'Q2 2026',
    order: 30,
  },
  containers: {
    key: 'containers',
    status: 'coming_soon',
    label: 'Kubernetes',
    description: 'Kubernetes clusters and workloads',
    expectedRelease: 'Q2 2026',
    order: 31,
  },
  databases: {
    key: 'databases',
    status: 'coming_soon',
    label: 'Databases',
    description: 'Database servers and instances',
    expectedRelease: 'Q2 2026',
    order: 32,
  },
  networks: {
    key: 'networks',
    status: 'coming_soon',
    label: 'Networks',
    description: 'VPCs, firewalls, load balancers',
    expectedRelease: 'Q3 2026',
    order: 33,
  },

  // ========================================
  // Code & CI/CD
  // ========================================
  repositories: {
    key: 'repositories',
    status: 'enabled',
    label: 'Repositories',
    description: 'Source code repositories',
    order: 40,
  },
}

// ========================================
// Helper Functions
// ========================================

/**
 * Check if an asset module should be visible in the sidebar
 *
 * @param key - Module key (e.g., 'domains', 'websites')
 * @param showComingSoon - Whether to include coming_soon modules (default: false)
 */
export function isAssetModuleVisible(key: string, showComingSoon = false): boolean {
  const config = ASSET_MODULES[key]
  if (!config) return false
  if (config.status === 'enabled') return true
  if (config.status === 'coming_soon' && showComingSoon) return true
  return false
}

/**
 * Get all enabled asset modules
 */
export function getEnabledAssetModules(): AssetModuleConfig[] {
  return Object.values(ASSET_MODULES)
    .filter((m) => m.status === 'enabled')
    .sort((a, b) => a.order - b.order)
}

/**
 * Get all coming soon asset modules
 */
export function getComingSoonAssetModules(): AssetModuleConfig[] {
  return Object.values(ASSET_MODULES)
    .filter((m) => m.status === 'coming_soon')
    .sort((a, b) => a.order - b.order)
}

/**
 * Get all visible asset modules (enabled + optionally coming_soon)
 */
export function getVisibleAssetModules(includeComingSoon = false): AssetModuleConfig[] {
  return Object.values(ASSET_MODULES)
    .filter((m) => m.status === 'enabled' || (includeComingSoon && m.status === 'coming_soon'))
    .sort((a, b) => a.order - b.order)
}

/**
 * Get module config by key
 */
export function getAssetModuleConfig(key: string): AssetModuleConfig | undefined {
  return ASSET_MODULES[key]
}

/**
 * Check if a module is coming soon
 */
export function isComingSoon(key: string): boolean {
  return ASSET_MODULES[key]?.status === 'coming_soon'
}
