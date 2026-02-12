/**
 * Asset Relationship Types
 *
 * Defines relationships between assets following CMDB best practices
 * (ServiceNow, BMC patterns) for attack surface management.
 */

import type { AssetType } from './asset.types'

// ============================================
// Relationship Type Definitions
// ============================================

/**
 * 16 CTEM-optimized relationship types organized by pillar:
 * - Attack Surface Mapping: runs_on, deployed_to, contains, exposes, member_of, resolves_to
 * - Attack Path Analysis: depends_on, sends_data_to, stores_data_in, authenticates_to, granted_to, load_balances
 * - Control & Ownership: protected_by, monitors, manages, owned_by
 */
export type RelationshipType =
  // Attack Surface Mapping
  | 'runs_on'
  | 'deployed_to'
  | 'contains'
  | 'exposes'
  | 'member_of'
  | 'resolves_to'
  // Attack Path Analysis
  | 'depends_on'
  | 'sends_data_to'
  | 'stores_data_in'
  | 'authenticates_to'
  | 'granted_to'
  | 'load_balances'
  // Control & Ownership
  | 'protected_by'
  | 'monitors'
  | 'manages'
  | 'owned_by'

/**
 * Direction of relationship from an asset's perspective
 */
export type RelationshipDirection = 'outgoing' | 'incoming'

/**
 * Confidence level for relationship discovery
 */
export type RelationshipConfidence = 'high' | 'medium' | 'low'

/**
 * How the relationship was discovered
 */
export type DiscoveryMethod = 'automatic' | 'manual' | 'imported' | 'inferred'

// ============================================
// Relationship Labels (Bidirectional)
// ============================================

export interface RelationshipLabelPair {
  direct: string
  inverse: string
  description: string
}

/**
 * Human-readable labels for each relationship type
 * Each relationship has a direct and inverse label for bidirectional display
 */
export const RELATIONSHIP_LABELS: Record<RelationshipType, RelationshipLabelPair> = {
  // === Attack Surface Mapping ===
  runs_on: {
    direct: 'Runs On',
    inverse: 'Runs',
    description: 'Workload runs on compute (service/container → host/node/cluster)',
  },
  deployed_to: {
    direct: 'Deployed To',
    inverse: 'Has Deployment',
    description: 'Artifact deployed to target (repo/build → cluster/host/env)',
  },
  contains: {
    direct: 'Contains',
    inverse: 'Contained By',
    description: 'Hierarchical parent-child (org → app → service; cluster → namespace)',
  },
  exposes: {
    direct: 'Exposes',
    inverse: 'Exposed By',
    description: 'Asset exposes access surface (api/service → port/endpoint/public interface)',
  },
  member_of: {
    direct: 'Member Of',
    inverse: 'Has Member',
    description: 'Membership (user → group; host → cluster; namespace → cluster)',
  },
  resolves_to: {
    direct: 'Resolves To',
    inverse: 'Resolved By',
    description: 'DNS resolution (domain/subdomain → IP/CDN/load balancer)',
  },

  // === Attack Path Analysis ===
  depends_on: {
    direct: 'Depends On',
    inverse: 'Used By',
    description: 'A needs B to function (service → database; web_app → api)',
  },
  sends_data_to: {
    direct: 'Sends Data To',
    inverse: 'Receives Data From',
    description: 'Data flow in-transit (service → service; producer → queue)',
  },
  stores_data_in: {
    direct: 'Stores Data In',
    inverse: 'Stores Data For',
    description: 'Data at-rest (service/app → database/bucket/data store)',
  },
  authenticates_to: {
    direct: 'Authenticates To',
    inverse: 'Authenticates',
    description: 'Auth relationship (user/service → IdP/app/api)',
  },
  granted_to: {
    direct: 'Granted To',
    inverse: 'Has Grant',
    description: 'IAM privilege (role/policy → principal/resource)',
  },
  load_balances: {
    direct: 'Load Balances',
    inverse: 'Load Balanced By',
    description: 'Traffic distribution (load_balancer → service/web_app)',
  },

  // === Control & Ownership ===
  protected_by: {
    direct: 'Protected By',
    inverse: 'Protects',
    description: 'Security control (web_app → WAF; host → EDR; cloud → CSPM)',
  },
  monitors: {
    direct: 'Monitors',
    inverse: 'Monitored By',
    description: 'Observability (SIEM/EDR/APM → asset)',
  },
  manages: {
    direct: 'Manages',
    inverse: 'Managed By',
    description: 'Control-plane management (cloud_account/IAM → resource/workload)',
  },
  owned_by: {
    direct: 'Owned By',
    inverse: 'Owns',
    description: 'Accountability (asset → team/owner)',
  },
}

// ============================================
// Extended Asset Types (for relationships)
// ============================================

/**
 * Extended asset types including specialized types for relationships
 */
export type ExtendedAssetType =
  | AssetType
  | 'k8s_cluster'
  | 'k8s_workload'
  | 'container_image'
  | 'api_collection'
  | 'api_endpoint'
  | 'network'
  | 'load_balancer'
  | 'identity_provider'

/**
 * Labels for extended asset types
 */
export const EXTENDED_ASSET_TYPE_LABELS: Record<ExtendedAssetType, string> = {
  // Base asset types - External Attack Surface
  domain: 'Domain',
  certificate: 'Certificate',
  ip_address: 'IP Address',
  // Base asset types - Applications
  website: 'Website',
  api: 'API',
  mobile_app: 'Mobile App',
  application: 'Application',
  endpoint: 'Endpoint',
  // Base asset types - Cloud
  cloud_account: 'Cloud Account',
  compute: 'Compute',
  storage: 'Storage',
  serverless: 'Serverless',
  // Base asset types - Infrastructure
  host: 'Host',
  server: 'Server',
  container: 'Container',
  database: 'Database',
  network: 'Network',
  // Base asset types - Code
  repository: 'Repository',
  // Unclassified
  unclassified: 'Unclassified',
  // Legacy base types (deprecated)
  service: 'Service',
  credential: 'Credential',
  mobile: 'Mobile App',
  // Extended types
  k8s_cluster: 'Kubernetes Cluster',
  k8s_workload: 'Kubernetes Workload',
  container_image: 'Container Image',
  api_collection: 'API Collection',
  api_endpoint: 'API Endpoint',
  load_balancer: 'Load Balancer',
  identity_provider: 'Identity Provider',
}

// ============================================
// Asset Relationship Interface
// ============================================

/**
 * Represents a relationship between two assets
 */
export interface AssetRelationship {
  id: string
  type: RelationshipType

  // Source asset (the asset initiating the relationship)
  sourceAssetId: string
  sourceAssetName: string
  sourceAssetType: ExtendedAssetType

  // Target asset (the asset being related to)
  targetAssetId: string
  targetAssetName: string
  targetAssetType: ExtendedAssetType

  // Metadata
  description?: string
  confidence: RelationshipConfidence
  discoveryMethod: DiscoveryMethod

  // Impact analysis
  impactWeight: number // 1-10, how critical is this relationship

  // Tags for filtering
  tags?: string[]

  // Timestamps
  createdAt: string
  updatedAt: string
  lastVerified?: string
}

/**
 * Input for creating a new relationship
 */
export interface CreateRelationshipInput {
  type: RelationshipType
  sourceAssetId: string
  targetAssetId: string
  description?: string
  confidence?: RelationshipConfidence
  discoveryMethod?: DiscoveryMethod
  impactWeight?: number
  tags?: string[]
}

/**
 * Input for updating a relationship
 */
export interface UpdateRelationshipInput {
  description?: string
  confidence?: RelationshipConfidence
  impactWeight?: number
  tags?: string[]
  lastVerified?: string
}

// ============================================
// Relationship Constraints
// ============================================

export interface RelationshipConstraint {
  sourceTypes: ExtendedAssetType[]
  targetTypes: ExtendedAssetType[]
}

/**
 * Valid relationship constraints - defines which asset types can be related
 * This is used for validation when creating relationships
 */
export const VALID_RELATIONSHIP_CONSTRAINTS: Record<RelationshipType, RelationshipConstraint[]> = {
  // === Attack Surface Mapping ===

  runs_on: [
    {
      sourceTypes: ['service', 'api', 'website'],
      targetTypes: ['host', 'container', 'k8s_workload', 'cloud_account'],
    },
    {
      sourceTypes: ['database'],
      targetTypes: ['host', 'container', 'cloud_account'],
    },
    {
      sourceTypes: ['k8s_workload'],
      targetTypes: ['k8s_cluster'],
    },
    {
      sourceTypes: ['container'],
      targetTypes: ['host', 'k8s_workload'],
    },
  ],

  deployed_to: [
    {
      sourceTypes: ['repository', 'container_image'],
      targetTypes: ['k8s_cluster', 'k8s_workload', 'cloud_account', 'host'],
    },
    {
      sourceTypes: ['service', 'api'],
      targetTypes: ['k8s_cluster', 'cloud_account', 'host'],
    },
  ],

  contains: [
    {
      sourceTypes: ['k8s_cluster'],
      targetTypes: ['k8s_workload'],
    },
    {
      sourceTypes: ['api_collection', 'api'],
      targetTypes: ['api_endpoint'],
    },
    {
      sourceTypes: ['host'],
      targetTypes: ['container', 'service', 'database'],
    },
    {
      sourceTypes: ['repository'],
      targetTypes: ['container_image'],
    },
    {
      sourceTypes: ['network'],
      targetTypes: ['host', 'cloud_account', 'load_balancer'],
    },
    {
      sourceTypes: ['cloud_account'],
      targetTypes: ['host', 'database', 'k8s_cluster', 'network', 'storage', 'serverless'],
    },
  ],

  exposes: [
    {
      sourceTypes: ['host', 'k8s_workload', 'container'],
      targetTypes: ['api_endpoint', 'service', 'api'],
    },
    {
      sourceTypes: ['domain'],
      targetTypes: ['website', 'api', 'service'],
    },
    {
      sourceTypes: ['load_balancer'],
      targetTypes: ['api', 'service', 'website'],
    },
  ],

  member_of: [
    {
      sourceTypes: ['host', 'container', 'k8s_workload'],
      targetTypes: ['k8s_cluster', 'network'],
    },
    {
      sourceTypes: ['service', 'api'],
      targetTypes: ['network'],
    },
  ],

  resolves_to: [
    {
      sourceTypes: ['domain'],
      targetTypes: ['ip_address', 'load_balancer', 'cloud_account', 'host'],
    },
  ],

  // === Attack Path Analysis ===

  depends_on: [
    {
      sourceTypes: ['service', 'api', 'website'],
      targetTypes: ['database', 'api', 'service', 'credential'],
    },
    {
      sourceTypes: ['k8s_workload'],
      targetTypes: ['container_image', 'database', 'api', 'service'],
    },
    {
      sourceTypes: ['mobile'],
      targetTypes: ['api', 'service'],
    },
  ],

  sends_data_to: [
    {
      sourceTypes: ['service', 'api', 'website', 'mobile'],
      targetTypes: ['database', 'api', 'service', 'cloud_account'],
    },
    {
      sourceTypes: ['database'],
      targetTypes: ['database'], // Replication
    },
  ],

  stores_data_in: [
    {
      sourceTypes: ['service', 'api', 'website'],
      targetTypes: ['database', 'storage', 'cloud_account'],
    },
    {
      sourceTypes: ['k8s_workload'],
      targetTypes: ['database', 'storage'],
    },
  ],

  authenticates_to: [
    {
      sourceTypes: ['api', 'service', 'website', 'mobile'],
      targetTypes: ['identity_provider', 'service', 'api'],
    },
    {
      sourceTypes: ['k8s_workload'],
      targetTypes: ['identity_provider', 'service'],
    },
  ],

  granted_to: [
    {
      sourceTypes: ['credential', 'service'],
      targetTypes: ['cloud_account', 'database', 'api', 'service', 'k8s_cluster'],
    },
  ],

  load_balances: [
    {
      sourceTypes: ['load_balancer', 'service', 'cloud_account'],
      targetTypes: ['host', 'k8s_workload', 'service', 'container'],
    },
  ],

  // === Control & Ownership ===

  protected_by: [
    {
      sourceTypes: ['website', 'api', 'service'],
      targetTypes: ['load_balancer', 'service'], // WAF, CDN as load_balancer/service
    },
    {
      sourceTypes: ['host', 'compute'],
      targetTypes: ['service'], // EDR, AV as service
    },
    {
      sourceTypes: ['cloud_account'],
      targetTypes: ['service'], // CSPM, GuardDuty as service
    },
  ],

  monitors: [
    {
      sourceTypes: ['service'], // SIEM, EDR, APM as service
      targetTypes: [
        'host',
        'k8s_cluster',
        'cloud_account',
        'api',
        'service',
        'database',
        'network',
      ],
    },
  ],

  manages: [
    {
      sourceTypes: ['cloud_account'],
      targetTypes: ['host', 'database', 'k8s_cluster', 'network', 'load_balancer'],
    },
    {
      sourceTypes: ['k8s_cluster'],
      targetTypes: ['k8s_workload', 'container'],
    },
  ],

  owned_by: [
    {
      sourceTypes: [
        'domain',
        'website',
        'service',
        'repository',
        'cloud_account',
        'host',
        'database',
        'api',
        'mobile',
        'k8s_cluster',
      ],
      targetTypes: ['service'], // Team/owner represented as service type
    },
  ],
}

// ============================================
// Validation Helpers
// ============================================

/**
 * Check if a relationship type is valid between two asset types
 */
export function isValidRelationship(
  relationshipType: RelationshipType,
  sourceType: ExtendedAssetType,
  targetType: ExtendedAssetType
): boolean {
  const constraints = VALID_RELATIONSHIP_CONSTRAINTS[relationshipType]
  if (!constraints) return false

  return constraints.some(
    (constraint) =>
      constraint.sourceTypes.includes(sourceType) && constraint.targetTypes.includes(targetType)
  )
}

/**
 * Get valid target types for a given relationship and source type
 */
export function getValidTargetTypes(
  relationshipType: RelationshipType,
  sourceType: ExtendedAssetType
): ExtendedAssetType[] {
  const constraints = VALID_RELATIONSHIP_CONSTRAINTS[relationshipType]
  if (!constraints) return []

  const validTargets = new Set<ExtendedAssetType>()

  constraints.forEach((constraint) => {
    if (constraint.sourceTypes.includes(sourceType)) {
      constraint.targetTypes.forEach((t) => validTargets.add(t))
    }
  })

  return Array.from(validTargets)
}

/**
 * Get valid relationship types for a given source type
 */
export function getValidRelationshipTypes(sourceType: ExtendedAssetType): RelationshipType[] {
  const validTypes: RelationshipType[] = []

  ;(Object.keys(VALID_RELATIONSHIP_CONSTRAINTS) as RelationshipType[]).forEach((relType) => {
    const constraints = VALID_RELATIONSHIP_CONSTRAINTS[relType]
    if (constraints.some((c) => c.sourceTypes.includes(sourceType))) {
      validTypes.push(relType)
    }
  })

  return validTypes
}

/**
 * Get the inverse label for a relationship type
 */
export function getInverseLabel(relationshipType: RelationshipType): string {
  return RELATIONSHIP_LABELS[relationshipType]?.inverse || relationshipType
}

/**
 * Get the direct label for a relationship type
 */
export function getDirectLabel(relationshipType: RelationshipType): string {
  return RELATIONSHIP_LABELS[relationshipType]?.direct || relationshipType
}

// ============================================
// Relationship Statistics
// ============================================

export interface RelationshipStats {
  totalRelationships: number
  byType: Record<RelationshipType, number>
  byConfidence: Record<RelationshipConfidence, number>
  byDiscoveryMethod: Record<DiscoveryMethod, number>
  averageImpactWeight: number
}

// ============================================
// Graph Types (for visualization)
// ============================================

export interface RelationshipGraphNode {
  id: string
  name: string
  type: ExtendedAssetType
  riskScore?: number
  findingCount?: number
}

export interface RelationshipGraphEdge {
  id: string
  source: string
  target: string
  type: RelationshipType
  label: string
  impactWeight: number
}

export interface RelationshipGraph {
  nodes: RelationshipGraphNode[]
  edges: RelationshipGraphEdge[]
}

// ============================================
// Attack Path Types
// ============================================

export interface AttackPathStep {
  assetId: string
  assetName: string
  assetType: ExtendedAssetType
  relationshipType: RelationshipType
  relationshipDirection: RelationshipDirection
}

export interface AttackPath {
  id: string
  name: string
  description?: string
  steps: AttackPathStep[]
  totalRiskScore: number
  entryPoint: RelationshipGraphNode
  targetAsset: RelationshipGraphNode
  createdAt: string
}

// ============================================
// Impact Analysis Types
// ============================================

export interface ImpactAnalysis {
  sourceAssetId: string
  directlyImpacted: string[] // Assets directly depending on source
  transitivelyImpacted: string[] // Assets indirectly impacted
  totalImpactedCount: number
  criticalPathsCount: number
  maxDepth: number
}
