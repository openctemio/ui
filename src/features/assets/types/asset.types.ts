/**
 * Asset Types
 *
 * Type definitions for assets in the security platform
 */

import type { Status } from '@/features/shared/types'

/**
 * Asset Type Categories (CTEM-aligned)
 *
 * External Attack Surface: domain, certificate, ip_address
 * Applications: website, api, mobile_app
 * Cloud: cloud_account, compute, storage, serverless
 * Infrastructure: host, container, database, network
 * Code & CI/CD: repository (unified asset type for git repos)
 *
 * Legacy types (deprecated, kept for backwards compatibility):
 * - service: Use specific service detection instead
 * - cloud: Use cloud_account, compute, storage, or serverless
 * - credential: Moved to Identities module
 * - mobile: Use mobile_app instead
 */
export type AssetType =
  // External Attack Surface
  | 'domain'
  | 'certificate'
  | 'ip_address'
  // Applications
  | 'website'
  | 'api'
  | 'mobile_app'
  | 'application' // Network services/applications
  | 'endpoint' // Service endpoints
  // Cloud
  | 'cloud_account'
  | 'compute'
  | 'storage'
  | 'serverless'
  // Infrastructure
  | 'host'
  | 'server' // Physical/virtual servers
  | 'container'
  | 'database'
  | 'network'
  // Code & CI/CD
  | 'repository' // Git repositories (unified asset type)
  // Unclassified
  | 'unclassified' // Assets not yet classified
  // Legacy types (deprecated - kept for backwards compatibility)
  | 'service' // @deprecated - Use application instead
  | 'credential' // @deprecated - Moved to Identities module
  | 'mobile' // @deprecated - Use mobile_app instead

/**
 * Asset Type Category for grouping in UI
 */
export type AssetTypeCategory = 'external' | 'applications' | 'cloud' | 'infrastructure' | 'code'

export const ASSET_TYPE_CATEGORIES: Record<
  AssetTypeCategory,
  {
    label: string
    description: string
    types: AssetType[]
  }
> = {
  external: {
    label: 'External Attack Surface',
    description: 'Internet-facing assets and entry points',
    types: ['domain', 'certificate', 'ip_address'],
  },
  applications: {
    label: 'Applications',
    description: 'Web, mobile, API, and network services',
    types: ['website', 'api', 'mobile_app', 'service', 'application', 'endpoint'],
  },
  cloud: {
    label: 'Cloud',
    description: 'Cloud infrastructure and services',
    types: ['cloud_account', 'compute', 'storage', 'serverless'],
  },
  infrastructure: {
    label: 'Infrastructure',
    description: 'Servers, containers, and network infrastructure',
    types: ['host', 'server', 'container', 'database', 'network'],
  },
  code: {
    label: 'Code & CI/CD',
    description: 'Source code repositories and pipelines',
    types: ['repository'],
  },
}

/**
 * Legacy asset types that are deprecated but still supported
 */
export const LEGACY_ASSET_TYPES: AssetType[] = ['service', 'credential', 'mobile', 'endpoint']

/**
 * Check if an asset type is deprecated
 */
export const isLegacyAssetType = (type: AssetType): boolean => {
  return LEGACY_ASSET_TYPES.includes(type)
}

/**
 * Asset Scope - Ownership/location perspective
 * Indicates who owns or manages the asset
 */
export type AssetScope =
  | 'internal' // Company-owned internal infrastructure
  | 'external' // Internet-facing company assets
  | 'cloud' // Cloud-hosted resources (AWS, GCP, Azure)
  | 'partner' // Partner/affiliate managed assets
  | 'vendor' // Third-party vendor systems
  | 'shadow' // Unknown/shadow IT assets

export const ASSET_SCOPE_LABELS: Record<AssetScope, string> = {
  internal: 'Internal',
  external: 'External',
  cloud: 'Cloud',
  partner: 'Partner',
  vendor: 'Vendor',
  shadow: 'Shadow IT',
}

export const ASSET_SCOPE_DESCRIPTIONS: Record<AssetScope, string> = {
  internal: 'Company-owned internal infrastructure',
  external: 'Internet-facing company assets',
  cloud: 'Cloud-hosted resources (AWS, GCP, Azure)',
  partner: 'Partner or affiliate managed assets',
  vendor: 'Third-party vendor systems',
  shadow: 'Unknown or shadow IT assets',
}

export const ASSET_SCOPE_COLORS: Record<AssetScope, { bg: string; text: string; border: string }> =
  {
    internal: { bg: 'bg-blue-500/15', text: 'text-blue-600', border: 'border-blue-500/30' },
    external: { bg: 'bg-purple-500/15', text: 'text-purple-600', border: 'border-purple-500/30' },
    cloud: { bg: 'bg-cyan-500/15', text: 'text-cyan-600', border: 'border-cyan-500/30' },
    partner: { bg: 'bg-amber-500/15', text: 'text-amber-600', border: 'border-amber-500/30' },
    vendor: { bg: 'bg-orange-500/15', text: 'text-orange-600', border: 'border-orange-500/30' },
    shadow: { bg: 'bg-slate-500/15', text: 'text-slate-600', border: 'border-slate-500/30' },
  }

/**
 * Exposure Level - Network accessibility perspective
 * Indicates how accessible the asset is from the internet
 */
export type ExposureLevel =
  | 'public' // Directly accessible from internet
  | 'restricted' // Behind authentication/VPN but externally accessible
  | 'private' // Only accessible from internal network
  | 'isolated' // Air-gapped or highly restricted
  | 'unknown' // Exposure not yet determined

export const EXPOSURE_LEVEL_LABELS: Record<ExposureLevel, string> = {
  public: 'Public',
  restricted: 'Restricted',
  private: 'Private',
  isolated: 'Isolated',
  unknown: 'Unknown',
}

export const EXPOSURE_LEVEL_DESCRIPTIONS: Record<ExposureLevel, string> = {
  public: 'Directly accessible from the internet',
  restricted: 'Behind authentication or VPN but externally accessible',
  private: 'Only accessible from internal network',
  isolated: 'Air-gapped or highly restricted environment',
  unknown: 'Exposure level not yet determined',
}

export const EXPOSURE_LEVEL_COLORS: Record<
  ExposureLevel,
  { bg: string; text: string; border: string }
> = {
  public: { bg: 'bg-red-500/15', text: 'text-red-600', border: 'border-red-500/30' },
  restricted: { bg: 'bg-yellow-500/15', text: 'text-yellow-600', border: 'border-yellow-500/30' },
  private: { bg: 'bg-green-500/15', text: 'text-green-600', border: 'border-green-500/30' },
  isolated: { bg: 'bg-emerald-500/15', text: 'text-emerald-600', border: 'border-emerald-500/30' },
  unknown: { bg: 'bg-slate-500/15', text: 'text-slate-600', border: 'border-slate-500/30' },
}

export const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  // External Attack Surface
  domain: 'Domain',
  certificate: 'Certificate',
  ip_address: 'IP Address',
  // Applications
  website: 'Website',
  api: 'API',
  mobile_app: 'Mobile App',
  application: 'Application',
  endpoint: 'Endpoint',
  // Cloud
  cloud_account: 'Cloud Account',
  compute: 'Compute',
  storage: 'Storage',
  serverless: 'Serverless',
  // Infrastructure
  host: 'Host',
  server: 'Server',
  container: 'Container',
  database: 'Database',
  network: 'Network',
  // Code & CI/CD
  repository: 'Repository',
  // Unclassified
  unclassified: 'Unclassified',
  // Legacy types (deprecated)
  service: 'Service',
  credential: 'Credential',
  mobile: 'Mobile App',
}

export const ASSET_TYPE_ICONS: Record<AssetType, string> = {
  domain: 'Globe',
  certificate: 'ShieldCheck',
  ip_address: 'Network',
  website: 'MonitorSmartphone',
  api: 'Zap',
  mobile_app: 'Smartphone',
  application: 'AppWindow',
  endpoint: 'Link',
  cloud_account: 'Cloud',
  compute: 'Server',
  storage: 'HardDrive',
  serverless: 'Cpu',
  host: 'Server',
  server: 'Server',
  container: 'Boxes',
  database: 'Database',
  network: 'Network',
  repository: 'GitBranch',
  unclassified: 'HelpCircle',
  // Legacy types (deprecated)
  service: 'Zap',
  credential: 'KeyRound',
  mobile: 'Smartphone',
}

export const ASSET_TYPE_DESCRIPTIONS: Record<AssetType, string> = {
  domain: 'Root domains and subdomains',
  certificate: 'SSL/TLS certificates',
  ip_address: 'IPv4/IPv6 addresses and ASN information',
  website: 'Web applications and sites',
  api: 'REST, GraphQL, gRPC endpoints',
  mobile_app: 'iOS and Android applications',
  application: 'Software applications',
  endpoint: 'Service endpoints',
  cloud_account: 'AWS accounts, GCP projects, Azure subscriptions',
  compute: 'Virtual machines and instances',
  storage: 'S3 buckets, Azure Blobs, GCS buckets',
  serverless: 'Lambda functions, Cloud Functions, Cloud Run',
  host: 'Physical and virtual servers',
  server: 'Physical and virtual servers',
  container: 'Docker and Kubernetes workloads',
  database: 'Database instances and clusters',
  network: 'VPCs, firewalls, load balancers',
  repository: 'Source code repositories',
  unclassified: 'Assets not yet classified',
  // Legacy types (deprecated)
  service: 'Network services (SSH, HTTP, DB services)',
  credential: 'Credentials (deprecated - moved to Identities)',
  mobile: 'Mobile applications (deprecated - use mobile_app)',
}

/**
 * Asset type colors for UI badges and indicators
 */
export const ASSET_TYPE_COLORS: Record<AssetType, { bg: string; text: string }> = {
  // External Attack Surface
  domain: { bg: 'bg-blue-500/15', text: 'text-blue-600' },
  certificate: { bg: 'bg-green-500/15', text: 'text-green-600' },
  ip_address: { bg: 'bg-purple-500/15', text: 'text-purple-600' },
  // Applications
  website: { bg: 'bg-cyan-500/15', text: 'text-cyan-600' },
  api: { bg: 'bg-indigo-500/15', text: 'text-indigo-600' },
  mobile_app: { bg: 'bg-pink-500/15', text: 'text-pink-600' },
  application: { bg: 'bg-lime-500/15', text: 'text-lime-600' },
  endpoint: { bg: 'bg-emerald-500/15', text: 'text-emerald-600' },
  // Cloud
  cloud_account: { bg: 'bg-sky-500/15', text: 'text-sky-600' },
  compute: { bg: 'bg-orange-500/15', text: 'text-orange-600' },
  storage: { bg: 'bg-amber-500/15', text: 'text-amber-600' },
  serverless: { bg: 'bg-violet-500/15', text: 'text-violet-600' },
  // Infrastructure
  host: { bg: 'bg-slate-500/15', text: 'text-slate-600' },
  server: { bg: 'bg-slate-500/15', text: 'text-slate-600' },
  container: { bg: 'bg-teal-500/15', text: 'text-teal-600' },
  database: { bg: 'bg-emerald-500/15', text: 'text-emerald-600' },
  network: { bg: 'bg-rose-500/15', text: 'text-rose-600' },
  // Code & CI/CD
  repository: { bg: 'bg-fuchsia-500/15', text: 'text-fuchsia-600' },
  // Unclassified
  unclassified: { bg: 'bg-gray-500/15', text: 'text-gray-600' },
  // Legacy types (deprecated)
  service: { bg: 'bg-yellow-500/15', text: 'text-yellow-600' },
  credential: { bg: 'bg-red-500/15', text: 'text-red-600' },
  mobile: { bg: 'bg-pink-500/15', text: 'text-pink-600' },
}

/**
 * Asset Criticality Level
 * Indicates the business importance of the asset
 */
export type Criticality = 'low' | 'medium' | 'high' | 'critical'

export const CRITICALITY_LABELS: Record<Criticality, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
}

export const CRITICALITY_DESCRIPTIONS: Record<Criticality, string> = {
  low: 'Non-critical asset with minimal business impact',
  medium: 'Standard business asset with moderate impact',
  high: 'Important asset with significant business impact',
  critical: 'Mission-critical asset essential to business operations',
}

export const CRITICALITY_COLORS: Record<Criticality, { bg: string; text: string; border: string }> =
  {
    low: { bg: 'bg-slate-500/15', text: 'text-slate-600', border: 'border-slate-500/30' },
    medium: { bg: 'bg-blue-500/15', text: 'text-blue-600', border: 'border-blue-500/30' },
    high: { bg: 'bg-orange-500/15', text: 'text-orange-600', border: 'border-orange-500/30' },
    critical: { bg: 'bg-red-500/15', text: 'text-red-600', border: 'border-red-500/30' },
  }

/**
 * Cloud Provider type
 */
export type CloudProvider = 'aws' | 'gcp' | 'azure' | 'oci' | 'alibaba' | 'digitalocean'

export const CLOUD_PROVIDER_LABELS: Record<CloudProvider, string> = {
  aws: 'Amazon Web Services',
  gcp: 'Google Cloud Platform',
  azure: 'Microsoft Azure',
  oci: 'Oracle Cloud',
  alibaba: 'Alibaba Cloud',
  digitalocean: 'DigitalOcean',
}

/**
 * Domain Discovery Source
 * How the domain was discovered
 */
export type DomainDiscoverySource =
  | 'dns' // DNS enumeration
  | 'cert_transparency' // Certificate Transparency logs
  | 'bruteforce' // Subdomain bruteforce
  | 'passive' // Passive recon (search engines, etc.)
  | 'manual' // Manually added
  | 'api_discovery' // Discovered via API endpoints
  | 'web_crawl' // Web crawler discovery

/**
 * Asset metadata varies by asset type
 */
export interface AssetMetadata {
  // ============================================
  // Domain-specific - Hierarchy (NEW - Best Practice)
  // ============================================
  /** Root/apex domain (e.g., "techviet.vn") */
  rootDomain?: string
  /** Domain level: 1=root, 2=subdomain, 3=sub-subdomain, etc. */
  domainLevel?: number
  /** Parent domain (e.g., "api.techviet.vn" -> "techviet.vn") */
  parentDomain?: string
  /** Is this a wildcard domain (*.domain.com) */
  isWildcard?: boolean
  /** How the domain was discovered */
  discoverySource?: DomainDiscoverySource

  // ============================================
  // Domain-specific - DNS Information
  // ============================================
  /** DNS record types (A, AAAA, CNAME, MX, NS, TXT, etc.) */
  dnsRecordTypes?: string[]
  /** IP addresses this domain resolves to */
  resolvedIPs?: string[]
  /** MX (mail exchange) records */
  mxRecords?: string[]
  /** CNAME target if applicable */
  cnameTarget?: string
  /** DNS TTL in seconds */
  ttl?: number

  // ============================================
  // Domain-specific - WHOIS & Registration
  // ============================================
  registrar?: string
  expiryDate?: string
  nameservers?: string[]
  whoisOrganization?: string
  registrationDate?: string
  updatedDate?: string

  // ============================================
  // Domain-specific - Security
  // ============================================
  dnssecEnabled?: boolean
  /** CAA record value */
  caa?: string
  /** SPF record */
  spf?: string
  /** DKIM record */
  dkim?: string
  /** DMARC record */
  dmarc?: string
  /** Has linked SSL/TLS certificate */
  hasCertificate?: boolean
  /** Link to certificate asset ID */
  certificateAssetId?: string

  // ============================================
  // Certificate-specific (NEW)
  // ============================================
  certIssuer?: string
  certSubject?: string
  certSerialNumber?: string
  certNotBefore?: string
  certNotAfter?: string
  certDaysUntilExpiry?: number
  certSignatureAlgorithm?: string
  certKeySize?: number
  certSans?: string[] // Subject Alternative Names
  certChainValid?: boolean
  certIsWildcard?: boolean
  certTransparencyLogged?: boolean

  // ============================================
  // IP Address-specific (NEW)
  // ============================================
  ipVersion?: 'ipv4' | 'ipv6'
  ipAddress?: string
  asn?: string
  asnOrganization?: string
  ipCountry?: string
  ipCity?: string
  ipIsp?: string
  ipReverseDns?: string
  ipIsPublic?: boolean
  ipOpenPorts?: number[]
  ipServices?: string[]

  // ============================================
  // Website-specific
  // ============================================
  technology?: string[]
  ssl?: boolean
  sslExpiry?: string
  httpStatus?: number
  responseTime?: number
  server?: string
  wafDetected?: string
  cdnDetected?: string

  // ============================================
  // API-specific
  // ============================================
  apiType?: 'rest' | 'graphql' | 'grpc' | 'websocket' | 'soap'
  baseUrl?: string
  apiVersion?: string
  authType?: 'none' | 'api_key' | 'oauth2' | 'jwt' | 'basic' | 'mtls'
  endpointCount?: number
  documentationUrl?: string
  openApiSpec?: boolean
  rateLimit?: number
  lastActivity?: string

  // ============================================
  // Mobile App-specific
  // ============================================
  platform?: 'ios' | 'android' | 'cross-platform'
  bundleId?: string
  appVersion?: string
  buildNumber?: string
  minSdkVersion?: string
  targetSdkVersion?: string
  storeUrl?: string
  lastRelease?: string
  downloads?: number
  rating?: number
  permissions?: string[]
  sdks?: string[]

  // ============================================
  // Cloud Account-specific (NEW)
  // ============================================
  cloudProvider?: CloudProvider
  accountId?: string
  accountAlias?: string
  organizationId?: string
  rootEmail?: string
  mfaEnabled?: boolean
  ssoEnabled?: boolean
  resourceCount?: number
  monthlySpend?: number
  complianceFrameworks?: string[]

  // ============================================
  // Compute-specific (NEW - VM/Instance)
  // ============================================
  instanceId?: string
  instanceType?: string
  instanceState?: 'running' | 'stopped' | 'terminated' | 'pending'
  availabilityZone?: string
  vpcId?: string
  subnetId?: string
  privateIp?: string
  publicIp?: string
  securityGroups?: string[]
  iamRole?: string
  launchTime?: string
  imageId?: string // AMI ID

  // ============================================
  // Storage-specific (NEW - S3/Blob/GCS)
  // ============================================
  bucketName?: string
  storageClass?: string
  bucketRegion?: string
  isPubliclyAccessible?: boolean
  encryptionEnabled?: boolean
  encryptionType?: 'none' | 'sse-s3' | 'sse-kms' | 'sse-c'
  versioningEnabled?: boolean
  loggingEnabled?: boolean
  lifecycleRules?: number
  objectCount?: number
  totalSizeGB?: number
  lastModified?: string

  // ============================================
  // Serverless-specific (NEW)
  // ============================================
  functionName?: string
  functionRuntime?: string
  functionHandler?: string
  functionMemory?: number
  functionTimeout?: number
  functionCodeSize?: number
  functionLastModified?: string
  functionTriggers?: string[]
  functionEnvVars?: number
  functionLayers?: string[]
  functionVpcEnabled?: boolean

  // ============================================
  // Host-specific
  // ============================================
  ip?: string
  hostname?: string
  os?: string
  osVersion?: string
  architecture?: 'x86' | 'x64' | 'arm64'
  cpuCores?: number
  memoryGB?: number
  isVirtual?: boolean
  hypervisor?: string
  openPorts?: number[]
  lastBoot?: string

  // ============================================
  // Container-specific
  // ============================================
  image?: string
  imageTag?: string
  registry?: string
  runtime?: 'docker' | 'containerd' | 'cri-o'
  orchestrator?: 'kubernetes' | 'docker-swarm' | 'ecs' | 'standalone'
  namespace?: string
  cluster?: string
  replicas?: number
  cpuLimit?: string
  memoryLimit?: string
  containerPorts?: number[]
  containerVulnerabilities?: number

  // ============================================
  // Database-specific
  // ============================================
  engine?:
    | 'mysql'
    | 'postgresql'
    | 'mongodb'
    | 'redis'
    | 'elasticsearch'
    | 'mssql'
    | 'oracle'
    | 'dynamodb'
    | 'cosmosdb'
  dbVersion?: string
  dbHost?: string
  dbPort?: number
  sizeGB?: number
  encryption?: boolean
  backupEnabled?: boolean
  lastBackup?: string
  replication?: 'single' | 'replica-set' | 'cluster'
  connections?: number
  dbPubliclyAccessible?: boolean

  // ============================================
  // Network-specific (NEW)
  // ============================================
  networkType?:
    | 'vpc'
    | 'vnet'
    | 'firewall'
    | 'load_balancer'
    | 'nat_gateway'
    | 'vpn'
    | 'transit_gateway'
  vpcCidr?: string
  subnetCidrs?: string[]
  routeTableCount?: number
  networkAclCount?: number
  peeringConnections?: string[]
  flowLogsEnabled?: boolean
  // Firewall specific
  firewallRules?: number
  allowedPorts?: number[]
  deniedPorts?: number[]
  // Load balancer specific
  lbType?: 'application' | 'network' | 'classic' | 'gateway'
  lbScheme?: 'internet-facing' | 'internal'
  lbTargetGroups?: number
  lbListeners?: number
  healthCheckEnabled?: boolean

  // ============================================
  // Project-specific (Git repositories)
  // ============================================
  projectProvider?: 'github' | 'gitlab' | 'bitbucket' | 'azure_devops' | 'codecommit'
  /** @deprecated Use projectProvider instead */
  repoProvider?: 'github' | 'gitlab' | 'bitbucket' | 'azure_devops' | 'codecommit'
  visibility?: 'public' | 'private' | 'internal'
  language?: string
  languages?: Record<string, number> // language -> percentage
  stars?: number
  forks?: number
  openIssues?: number
  defaultBranch?: string
  lastCommit?: string
  contributors?: number
  hasSecurityPolicy?: boolean
  branchProtection?: boolean
  secretScanningEnabled?: boolean
  dependabotEnabled?: boolean

  // ============================================
  // Credential Leak specific (for credential assets)
  // ============================================
  /** The actual leaked secret value (password, API key, etc.) */
  secretValue?: string
  /** Type of credential (password, api_key, aws_key, database_cred, etc.) */
  credentialType?: string

  // ============================================
  // Legacy fields (deprecated, for migration)
  // ============================================
  /** @deprecated Use repoProvider instead */
  provider?: 'github' | 'gitlab' | 'bitbucket'
  /** @deprecated Use specific port fields instead */
  port?: number
  /** @deprecated Use apiType service detection instead */
  protocol?: string
  /** @deprecated Use appropriate version field instead */
  version?: string
  /** @deprecated Use ipServices instead */
  banner?: string
  /** @deprecated Use dedicated region fields instead */
  region?: string
  /** @deprecated Compute type is now a separate asset type */
  resourceType?: string
  /** @deprecated Moved to Identities module */
  source?: string
  /** @deprecated Moved to Identities module */
  username?: string
  /** @deprecated Moved to Identities module */
  leakDate?: string
  /** @deprecated Use containerVulnerabilities instead */
  vulnerabilities?: number
}

/**
 * Asset represents a single discoverable asset
 */
export interface Asset {
  id: string
  type: AssetType
  name: string
  description?: string
  criticality: Criticality // Business importance level
  status: Status
  scope: AssetScope // Ownership/location classification
  exposure: ExposureLevel // Network accessibility classification
  riskScore: number // 0-100, calculated from criticality, exposure, and findings
  findingCount: number
  groupId?: string // Optional - asset can be ungrouped
  groupName?: string
  metadata: AssetMetadata
  tags?: string[]
  firstSeen: string
  lastSeen: string
  createdAt: string
  updatedAt: string
}

/**
 * Input for creating a new asset
 * Used when creating assets independently or within a group
 */
export interface CreateAssetInput {
  type: AssetType
  name: string
  description?: string
  criticality?: Criticality // Defaults to 'medium' if not provided
  scope?: AssetScope // Defaults to 'internal' if not provided
  exposure?: ExposureLevel // Defaults to 'unknown' if not provided
  groupId?: string // Optional - can create ungrouped assets
  metadata?: Partial<AssetMetadata>
  tags?: string[]
}

/**
 * Input for updating an asset
 */
export interface UpdateAssetInput {
  name?: string
  description?: string
  criticality?: Criticality
  scope?: AssetScope
  exposure?: ExposureLevel
  groupId?: string | null // null to remove from group
  metadata?: Partial<AssetMetadata>
  tags?: string[]
}

/**
 * Bulk operation to assign assets to a group
 */
export interface AssignAssetsToGroupInput {
  assetIds: string[]
  groupId: string
}

/**
 * Bulk operation to remove assets from their groups
 */
export interface UnassignAssetsInput {
  assetIds: string[]
}

/**
 * Asset statistics summary
 */
export interface AssetStats {
  totalAssets: number
  byType: Record<AssetType, number>
  byStatus: Record<Status, number>
  byCriticality: Record<Criticality, number>
  byScope: Record<AssetScope, number>
  byExposure: Record<ExposureLevel, number>
  averageRiskScore: number
  highRiskCount: number // Assets with risk_score >= 70
  totalFindings: number
}

// ============================================
// Repository Extension Types (for repository assets)
// ============================================

/**
 * Repository visibility
 */
export type RepoVisibility = 'public' | 'private' | 'internal'

export const REPO_VISIBILITY_LABELS: Record<RepoVisibility, string> = {
  public: 'Public',
  private: 'Private',
  internal: 'Internal',
}

export const REPO_VISIBILITY_COLORS: Record<
  RepoVisibility,
  { bg: string; text: string; border: string }
> = {
  public: { bg: 'bg-green-500/15', text: 'text-green-600', border: 'border-green-500/30' },
  private: { bg: 'bg-amber-500/15', text: 'text-amber-600', border: 'border-amber-500/30' },
  internal: { bg: 'bg-blue-500/15', text: 'text-blue-600', border: 'border-blue-500/30' },
}

/**
 * SCM Provider type
 */
export type SCMProvider =
  | 'github'
  | 'gitlab'
  | 'bitbucket'
  | 'azure_devops'
  | 'codecommit'
  | 'local'

export const SCM_PROVIDER_LABELS: Record<SCMProvider, string> = {
  github: 'GitHub',
  gitlab: 'GitLab',
  bitbucket: 'Bitbucket',
  azure_devops: 'Azure DevOps',
  codecommit: 'AWS CodeCommit',
  local: 'Local',
}

/**
 * RepositoryExtension represents extended data for repository assets.
 * This is returned alongside the Asset when fetching repository-type assets.
 */
export interface RepositoryExtension {
  assetId: string // Link to parent Asset
  repoId?: string // External repo ID from provider
  fullName: string // owner/repo format
  scmOrganization?: string // GitHub org, GitLab group, etc.
  cloneUrl?: string
  webUrl?: string
  sshUrl?: string
  defaultBranch?: string
  visibility: RepoVisibility
  language?: string // Primary language
  languages?: Record<string, number> // {"Go": 45000, "TypeScript": 30000}
  topics?: string[]
  // Repository stats
  stars: number
  forks: number
  watchers: number
  openIssues: number
  contributorsCount: number
  sizeKb: number
  // Branch stats
  branchCount: number
  protectedBranchCount: number
  // Component/dependency stats
  componentCount: number
  vulnerableComponentCount: number
  // Finding stats
  findingCount: number
  // Scan configuration
  scanEnabled: boolean
  scanSchedule?: string // Cron expression
  lastScannedAt?: string
  // External repository timestamps
  repoCreatedAt?: string
  repoUpdatedAt?: string
  repoPushedAt?: string
}

/**
 * Asset with repository extension (combined response)
 */
export interface AssetWithRepository extends Asset {
  repository?: RepositoryExtension
}

/**
 * Input for creating a repository asset
 */
export interface CreateRepositoryAssetInput {
  name: string
  criticality?: Criticality
  scope?: AssetScope
  exposure?: ExposureLevel
  description?: string
  tags?: string[]
  // Repository-specific fields
  provider?: SCMProvider
  externalId?: string
  repoId?: string
  fullName: string
  scmOrganization?: string
  cloneUrl?: string
  webUrl?: string
  sshUrl?: string
  defaultBranch?: string
  visibility?: RepoVisibility
  language?: string
  languages?: Record<string, number>
  topics?: string[]
  stars?: number
  forks?: number
  watchers?: number
  openIssues?: number
  sizeKb?: number
  // Scan settings
  scanEnabled?: boolean
  scanSchedule?: string
  // Timestamps
  repoCreatedAt?: string
  repoUpdatedAt?: string
  repoPushedAt?: string
}

/**
 * Input for updating a repository extension
 */
export interface UpdateRepositoryExtensionInput {
  repoId?: string
  fullName?: string
  scmOrganization?: string
  cloneUrl?: string
  webUrl?: string
  sshUrl?: string
  defaultBranch?: string
  visibility?: RepoVisibility
  language?: string
  languages?: Record<string, number>
  topics?: string[]
  stars?: number
  forks?: number
  watchers?: number
  openIssues?: number
  contributorsCount?: number
  sizeKb?: number
  branchCount?: number
  protectedBranchCount?: number
  componentCount?: number
  // Scan settings
  scanEnabled?: boolean
  scanSchedule?: string
  // Timestamps
  repoCreatedAt?: string
  repoUpdatedAt?: string
  repoPushedAt?: string
}

// ============================================
// Kubernetes Types
// ============================================

export type K8sClusterStatus = 'healthy' | 'warning' | 'critical' | 'unknown'

/**
 * Kubernetes Cluster
 */
export interface K8sCluster {
  id: string
  name: string
  provider: 'eks' | 'gke' | 'aks' | 'self-managed' | 'k3s' | 'openshift'
  version: string
  region?: string
  nodeCount: number
  namespaceCount: number
  workloadCount: number
  podCount: number
  status: K8sClusterStatus
  riskScore: number
  findingCount: number
  apiServerUrl?: string
  createdAt: string
  lastSeen: string
}

export type WorkloadType =
  | 'deployment'
  | 'statefulset'
  | 'daemonset'
  | 'job'
  | 'cronjob'
  | 'replicaset'

/**
 * Kubernetes Workload (Deployment, StatefulSet, DaemonSet, etc.)
 */
export interface K8sWorkload {
  id: string
  name: string
  type: WorkloadType
  clusterId: string
  clusterName: string
  namespace: string
  replicas: number
  readyReplicas: number
  images: string[]
  labels?: Record<string, string>
  status: 'running' | 'pending' | 'failed' | 'unknown'
  riskScore: number
  findingCount: number
  cpuRequest?: string
  cpuLimit?: string
  memoryRequest?: string
  memoryLimit?: string
  createdAt: string
  lastSeen: string
}

/**
 * Container Image
 */
export interface ContainerImage {
  id: string
  name: string
  tag: string
  fullName: string // name:tag
  registry: string
  digest?: string
  size?: number // in MB
  os?: string
  architecture?: string
  workloadCount: number // Number of workloads using this image
  vulnerabilities: {
    critical: number
    high: number
    medium: number
    low: number
  }
  riskScore: number
  lastScanned?: string
  pushedAt?: string
  createdAt: string
}

// ============================================
// API Types
// ============================================

export type ApiType = 'rest' | 'graphql' | 'grpc' | 'websocket' | 'soap'
export type ApiAuthType = 'none' | 'api_key' | 'oauth2' | 'jwt' | 'basic' | 'mtls'
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS'

/**
 * API Endpoint represents a single API endpoint
 */
export interface ApiEndpoint {
  id: string
  apiId: string
  apiName: string
  path: string
  method: HttpMethod
  description?: string
  parameters?: {
    name: string
    in: 'query' | 'path' | 'header' | 'body'
    required: boolean
    type: string
  }[]
  responseType?: string
  authenticated: boolean
  deprecated: boolean
  riskScore: number
  findingCount: number
  lastCalled?: string
  avgResponseTime?: number // in ms
  errorRate?: number // percentage
  createdAt: string
  lastSeen: string
}

/**
 * API represents a collection of endpoints
 */
export interface Api {
  id: string
  name: string
  description?: string
  type: ApiType
  baseUrl: string
  version?: string
  authType: ApiAuthType
  status: 'active' | 'inactive' | 'deprecated' | 'development'
  endpointCount: number
  documentationUrl?: string
  openApiSpec: boolean
  owner?: string
  team?: string
  riskScore: number
  findingCount: number
  // Traffic stats
  requestsPerDay?: number
  avgResponseTime?: number
  errorRate?: number
  // Security
  tlsVersion?: string
  corsEnabled?: boolean
  rateLimitEnabled?: boolean
  rateLimit?: number
  // Timestamps
  createdAt: string
  lastSeen: string
  lastActivity?: string
}

// ============================================
// Finding Types (for asset drill-down)
// ============================================

export type FindingSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info'
export type FindingType =
  | 'vulnerability'
  | 'misconfiguration'
  | 'exposure'
  | 'secret'
  | 'compliance'
export type FindingStatus = 'open' | 'in_progress' | 'resolved' | 'accepted' | 'false_positive'

/**
 * Finding associated with an asset
 */
export interface AssetFinding {
  id: string
  type: FindingType
  severity: FindingSeverity
  status: FindingStatus
  title: string
  description: string
  assetId: string
  assetName: string
  assetType: AssetType
  // Vulnerability specific
  cveId?: string
  cvssScore?: number
  cweId?: string
  // Misconfiguration specific
  rule?: string
  benchmark?: string // CIS, etc.
  // Remediation
  remediation?: string
  references?: string[]
  // Timestamps
  firstSeen: string
  lastSeen: string
  resolvedAt?: string
}
