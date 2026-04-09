/**
 * Asset Relationship Types
 *
 * Defines relationships between assets following CMDB best practices
 * (ServiceNow, BMC patterns) for attack surface management.
 *
 * The relationship type IDs, labels, descriptions and constraints are
 * GENERATED from `api/configs/relationship-types.yaml` by the codegen
 * tool at `api/cmd/gen-relationships`. This file re-exports the
 * generated symbols under their existing public names so the rest of
 * the UI code doesn't need to change.
 *
 * To add a new relationship type:
 *   1. Edit `api/configs/relationship-types.yaml`
 *   2. Run `make generate-relationships` from the api directory
 *   3. Commit YAML + the two generated files
 *
 * Do NOT add types here by hand — they will be lost on the next codegen.
 */

import type { AssetType } from './asset.types'
import {
  type GeneratedRelationshipType,
  GENERATED_RELATIONSHIP_LABELS,
  GENERATED_RELATIONSHIP_CONSTRAINTS,
  ALL_GENERATED_RELATIONSHIP_TYPES,
} from './relationship.types.generated'

// ============================================
// Relationship Type Definitions
// ============================================

/**
 * Union of every supported relationship type.
 * Generated from configs/relationship-types.yaml.
 */
export type RelationshipType = GeneratedRelationshipType

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
 * Human-readable labels for each relationship type.
 * Re-exported from the generated registry. The generated value has an
 * extra `category` field that's a no-op for existing consumers.
 */
export const RELATIONSHIP_LABELS: Record<RelationshipType, RelationshipLabelPair> =
  GENERATED_RELATIONSHIP_LABELS

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
  container: 'Container',
  database: 'Database',
  network: 'Network',
  // Base asset types - Infrastructure (extended)
  vpc: 'VPC',
  subnet: 'Subnet',
  load_balancer: 'Load Balancer',
  firewall: 'Firewall',
  kubernetes_cluster: 'Kubernetes Cluster',
  kubernetes_namespace: 'Kubernetes Namespace',
  container_registry: 'Container Registry',
  // Base asset types - Data
  data_store: 'Data Store',
  s3_bucket: 'S3 Bucket',
  // Base asset types - Identity
  iam_user: 'IAM User',
  iam_role: 'IAM Role',
  service_account: 'Service Account',
  // Base asset types - Code
  repository: 'Repository',
  // Base asset types - Recon
  http_service: 'HTTP Service',
  open_port: 'Open Port',
  discovered_url: 'Discovered URL',
  // Base asset types - Discovery
  subdomain: 'Subdomain',
  web_application: 'Web Application',
  // Unclassified
  unclassified: 'Unclassified',
  // Legacy base types (deprecated)
  service: 'Service',
  credential: 'Credential',
  mobile: 'Mobile App',
  // Extended types (only those NOT already in AssetType)
  k8s_cluster: 'Kubernetes Cluster',
  k8s_workload: 'Kubernetes Workload',
  container_image: 'Container Image',
  api_collection: 'API Collection',
  api_endpoint: 'API Endpoint',
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
 * Valid relationship constraints — defines which asset type pairs are
 * legal for each relationship type. Re-exported from the generated
 * registry. The generated value uses the same field names so the cast
 * is structural.
 */
export const VALID_RELATIONSHIP_CONSTRAINTS: Record<RelationshipType, RelationshipConstraint[]> =
  GENERATED_RELATIONSHIP_CONSTRAINTS as Record<RelationshipType, RelationshipConstraint[]>

/**
 * Ordered list of every relationship type ID. Generated.
 */
export const ALL_RELATIONSHIP_TYPES: RelationshipType[] = ALL_GENERATED_RELATIONSHIP_TYPES

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
