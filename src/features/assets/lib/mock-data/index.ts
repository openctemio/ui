/**
 * Asset Mock Data - Barrel Export
 *
 * Vietnamese company mock data for development and testing
 */

import type { Asset, AssetType } from '../../types'

// Import helpers
export { daysAgo, enrichAsset, deriveScopeAndExposure } from './helpers'
export type { BaseAsset } from './helpers'

// Import all asset arrays
import { domainAssets } from './domains'
import { websiteAssets } from './websites'
import { serviceAssets } from './services'
import { projectAssets } from './projects'
import { cloudAssets } from './cloud'
import { hostAssets } from './hosts'
import { containerAssets } from './containers'
import { databaseAssets } from './databases'
import { serverlessAssets } from './serverless'
import { mobileAssets } from './mobile'
import { credentialAssets } from './credentials'

// Import API data
import { apiAssets, apiEndpoints } from './apis'

// Import Kubernetes data
import { k8sClusters, k8sWorkloads, containerImages } from './kubernetes'

// Import findings
import { assetFindings } from './findings'

// Import enrichAsset for combining assets
import { enrichAsset } from './helpers'
import type { BaseAsset } from './helpers'

// Re-export individual asset arrays
export { domainAssets } from './domains'
export { websiteAssets } from './websites'
export { serviceAssets } from './services'
export { projectAssets, repositoryAssets } from './projects'
export { cloudAssets } from './cloud'
export { hostAssets } from './hosts'
export { containerAssets } from './containers'
export { databaseAssets } from './databases'
export { serverlessAssets } from './serverless'
export { mobileAssets } from './mobile'
export { credentialAssets } from './credentials'
export { apiAssets, apiEndpoints } from './apis'
export { k8sClusters, k8sWorkloads, containerImages } from './kubernetes'
export { assetFindings } from './findings'

// Combine all base assets
const baseAssets: BaseAsset[] = [
  ...domainAssets,
  ...websiteAssets,
  ...serviceAssets,
  ...projectAssets,
  ...cloudAssets,
  ...hostAssets,
  ...containerAssets,
  ...databaseAssets,
  ...serverlessAssets,
  ...mobileAssets,
  ...credentialAssets,
]

// Enrich all assets with scope and exposure
export const mockAssets: Asset[] = baseAssets.map(enrichAsset)

// ============================================
// Getter Functions
// ============================================

// Filter by type
export const getAssetsByType = (type: AssetType): Asset[] =>
  mockAssets.filter((asset) => asset.type === type)

// Type-specific getters
export const getDomains = () => getAssetsByType('domain')
export const getWebsites = () => getAssetsByType('website')
export const getServices = () => getAssetsByType('service')
export const getRepositories = () => getAssetsByType('repository')
export const getCloudAssets = () => getAssetsByType('cloud_account')
export const getCredentials = () => getAssetsByType('credential')
export const getHosts = () => getAssetsByType('host')
export const getContainers = () => getAssetsByType('container')
export const getDatabases = () => getAssetsByType('database')
export const getServerlessFunctions = () => getAssetsByType('serverless')
export const getMobileApps = () => getAssetsByType('mobile')

// API getters
export const getApis = () => apiAssets
export const getApiEndpoints = (apiId?: string) =>
  apiId ? apiEndpoints.filter((e) => e.apiId === apiId) : apiEndpoints
export const getApiById = (id: string) => apiAssets.find((a) => a.id === id)

// K8s getters
export const getK8sClusters = () => k8sClusters
export const getK8sWorkloads = (clusterId?: string) =>
  clusterId ? k8sWorkloads.filter((w) => w.clusterId === clusterId) : k8sWorkloads
export const getContainerImages = () => containerImages

// Findings getters
export const getAssetFindings = (assetId: string) =>
  assetFindings.filter((f) => f.assetId === assetId)
export const getFindingsBySeverity = (severity: 'critical' | 'high' | 'medium' | 'low' | 'info') =>
  assetFindings.filter((f) => f.severity === severity)

// ============================================
// Stats Functions
// ============================================

export const getAssetStats = () => ({
  total: mockAssets.length,
  domains: getDomains().length,
  websites: getWebsites().length,
  services: getServices().length,
  repositories: getRepositories().length,
  cloud: getCloudAssets().length,
  hosts: getHosts().length,
  containers: getContainers().length,
  databases: getDatabases().length,
  serverless: getServerlessFunctions().length,
  mobileApps: getMobileApps().length,
  credentials: getCredentials().length,
  apis: getApis().length,
  averageRiskScore: Math.round(
    mockAssets.reduce((acc, a) => acc + a.riskScore, 0) / mockAssets.length
  ),
  totalFindings: mockAssets.reduce((acc, a) => acc + a.findingCount, 0),
})

// ============================================
// Ungrouped Assets Helpers
// ============================================

/**
 * Get all assets that don't belong to any group
 */
export const getUngroupedAssets = (): Asset[] => mockAssets.filter((asset) => !asset.groupId)

/**
 * Get ungrouped assets by type
 */
export const getUngroupedAssetsByType = (type: AssetType): Asset[] =>
  mockAssets.filter((asset) => asset.type === type && !asset.groupId)

/**
 * Get assets by group ID
 */
export const getAssetsByGroup = (groupId: string): Asset[] =>
  mockAssets.filter((asset) => asset.groupId === groupId)

/**
 * Get count of ungrouped assets
 */
export const getUngroupedAssetsCount = (): number =>
  mockAssets.filter((asset) => !asset.groupId).length

/**
 * Get ungrouped assets stats by type
 */
export const getUngroupedAssetStats = () => {
  const ungrouped = getUngroupedAssets()
  return {
    total: ungrouped.length,
    byType: {
      domain: ungrouped.filter((a) => a.type === 'domain').length,
      website: ungrouped.filter((a) => a.type === 'website').length,
      service: ungrouped.filter((a) => a.type === 'service').length,
      repository: ungrouped.filter((a) => a.type === 'repository').length,
      cloud: ungrouped.filter((a) => a.type === 'cloud_account').length,
      credential: ungrouped.filter((a) => a.type === 'credential').length,
      host: ungrouped.filter((a) => a.type === 'host').length,
      container: ungrouped.filter((a) => a.type === 'container').length,
      database: ungrouped.filter((a) => a.type === 'database').length,
      serverless: ungrouped.filter((a) => a.type === 'serverless').length,
      mobile: ungrouped.filter((a) => a.type === 'mobile').length,
      api: ungrouped.filter((a) => a.type === 'api').length,
    },
  }
}
