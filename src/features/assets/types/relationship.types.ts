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
 * Supported relationship types between assets
 * Based on ServiceNow CMDB relationship patterns
 */
export type RelationshipType =
  | 'runs_on'
  | 'hosted_on'
  | 'depends_on'
  | 'contains'
  | 'connected_to'
  | 'authenticates_to'
  | 'sends_data_to'
  | 'exposes'
  | 'manages'
  | 'virtualized_by'
  | 'member_of'
  | 'provides_dr_for'
  | 'load_balances'
  | 'owned_by'
  | 'deployed_to'

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
  runs_on: {
    direct: 'Runs On',
    inverse: 'Runs',
    description: 'Service or application runs on infrastructure',
  },
  hosted_on: {
    direct: 'Hosted On',
    inverse: 'Hosts',
    description: 'Resource is hosted on a platform or server',
  },
  depends_on: {
    direct: 'Depends On',
    inverse: 'Used By',
    description: 'Asset requires another asset to function',
  },
  contains: {
    direct: 'Contains',
    inverse: 'Contained By',
    description: 'Parent-child containment relationship',
  },
  connected_to: {
    direct: 'Connected To',
    inverse: 'Connected By',
    description: 'Network or logical connection between assets',
  },
  authenticates_to: {
    direct: 'Authenticates To',
    inverse: 'Authenticates',
    description: 'Authentication relationship (OAuth, SSO, etc.)',
  },
  sends_data_to: {
    direct: 'Sends Data To',
    inverse: 'Receives Data From',
    description: 'Data flow direction between assets',
  },
  exposes: {
    direct: 'Exposes',
    inverse: 'Exposed By',
    description: 'Asset exposes an endpoint or service',
  },
  manages: {
    direct: 'Manages',
    inverse: 'Managed By',
    description: 'Management or control relationship',
  },
  virtualized_by: {
    direct: 'Virtualized By',
    inverse: 'Virtualizes',
    description: 'Virtualization relationship',
  },
  member_of: {
    direct: 'Member Of',
    inverse: 'Has Member',
    description: 'Membership in a group or cluster',
  },
  provides_dr_for: {
    direct: 'Provides DR For',
    inverse: 'DR Provided By',
    description: 'Disaster recovery relationship',
  },
  load_balances: {
    direct: 'Load Balances',
    inverse: 'Load Balanced By',
    description: 'Load balancing relationship',
  },
  owned_by: {
    direct: 'Owned By',
    inverse: 'Owns',
    description: 'Ownership relationship (team, user)',
  },
  deployed_to: {
    direct: 'Deployed To',
    inverse: 'Has Deployment',
    description: 'Deployment target relationship',
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
  ],

  hosted_on: [
    {
      sourceTypes: ['website', 'api'],
      targetTypes: ['cloud_account', 'host', 'k8s_cluster'],
    },
    {
      sourceTypes: ['domain'],
      targetTypes: ['cloud_account'], // DNS hosting
    },
    {
      sourceTypes: ['database'],
      targetTypes: ['cloud_account', 'host'],
    },
  ],

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
      targetTypes: ['container_image'], // Source code builds image
    },
    {
      sourceTypes: ['network'],
      targetTypes: ['host', 'cloud_account', 'load_balancer'],
    },
  ],

  connected_to: [
    {
      sourceTypes: ['service', 'api', 'host', 'database'],
      targetTypes: ['service', 'api', 'host', 'database', 'cloud_account'],
    },
    {
      sourceTypes: ['k8s_workload'],
      targetTypes: ['k8s_workload', 'database', 'service'],
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

  virtualized_by: [
    {
      sourceTypes: ['host'],
      targetTypes: ['cloud_account', 'host'],
    },
    {
      sourceTypes: ['container'],
      targetTypes: ['host', 'k8s_workload'],
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

  provides_dr_for: [
    {
      sourceTypes: ['database', 'host', 'cloud_account'],
      targetTypes: ['database', 'host', 'cloud_account'],
    },
  ],

  load_balances: [
    {
      sourceTypes: ['load_balancer', 'service', 'cloud_account'],
      targetTypes: ['host', 'k8s_workload', 'service', 'container'],
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

  deployed_to: [
    {
      sourceTypes: ['repository', 'container_image'],
      targetTypes: ['k8s_cluster', 'k8s_workload', 'cloud_account', 'host'],
    },
    {
      sourceTypes: ['service', 'api'],
      targetTypes: ['k8s_cluster', 'cloud_account'],
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
