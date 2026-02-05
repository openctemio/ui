/**
 * Asset Relationship Mock Data
 *
 * Realistic relationships between Vietnamese company assets for development and testing.
 * These relationships follow CMDB best practices and represent typical enterprise infrastructure.
 */

import type {
  AssetRelationship,
  RelationshipType,
  RelationshipGraph,
  RelationshipGraphNode,
  RelationshipGraphEdge,
  RelationshipStats,
  AttackPath,
} from '../types'

// Helper to generate dates
const daysAgo = (days: number) => {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date.toISOString()
}

// ============================================
// Asset Relationships
// ============================================

export const assetRelationships: AssetRelationship[] = [
  // ============================================
  // Domain → Website/API (exposes)
  // ============================================
  {
    id: 'rel-001',
    type: 'exposes',
    sourceAssetId: 'dom-001',
    sourceAssetName: 'vingroup.vn',
    sourceAssetType: 'domain',
    targetAssetId: 'web-003',
    targetAssetName: 'shop.vinmart.vn',
    targetAssetType: 'website',
    description: 'Primary domain exposes VinMart e-commerce website',
    confidence: 'high',
    discoveryMethod: 'automatic',
    impactWeight: 9,
    tags: ['critical', 'customer-facing'],
    createdAt: daysAgo(180),
    updatedAt: daysAgo(1),
    lastVerified: daysAgo(0),
  },
  {
    id: 'rel-002',
    type: 'exposes',
    sourceAssetId: 'dom-004',
    sourceAssetName: 'techcombank.com.vn',
    sourceAssetType: 'domain',
    targetAssetId: 'web-002',
    targetAssetName: 'ebanking.techcombank.com.vn',
    targetAssetType: 'website',
    description: 'Banking domain exposes internet banking application',
    confidence: 'high',
    discoveryMethod: 'automatic',
    impactWeight: 10,
    tags: ['critical', 'banking', 'customer-facing'],
    createdAt: daysAgo(400),
    updatedAt: daysAgo(0),
    lastVerified: daysAgo(0),
  },
  {
    id: 'rel-003',
    type: 'exposes',
    sourceAssetId: 'dom-002',
    sourceAssetName: 'fpt.com.vn',
    sourceAssetType: 'domain',
    targetAssetId: 'web-001',
    targetAssetName: 'portal.fpt.com.vn',
    targetAssetType: 'website',
    description: 'FPT domain exposes customer portal',
    confidence: 'high',
    discoveryMethod: 'automatic',
    impactWeight: 8,
    tags: ['production'],
    createdAt: daysAgo(200),
    updatedAt: daysAgo(2),
    lastVerified: daysAgo(1),
  },
  {
    id: 'rel-004',
    type: 'exposes',
    sourceAssetId: 'dom-004',
    sourceAssetName: 'techcombank.com.vn',
    sourceAssetType: 'domain',
    targetAssetId: 'api-001',
    targetAssetName: 'Core Banking API',
    targetAssetType: 'api',
    description: 'Banking domain exposes Core Banking API',
    confidence: 'high',
    discoveryMethod: 'automatic',
    impactWeight: 10,
    tags: ['critical', 'api'],
    createdAt: daysAgo(350),
    updatedAt: daysAgo(1),
    lastVerified: daysAgo(0),
  },

  // ============================================
  // Website → API (depends_on)
  // ============================================
  {
    id: 'rel-005',
    type: 'depends_on',
    sourceAssetId: 'web-002',
    sourceAssetName: 'ebanking.techcombank.com.vn',
    sourceAssetType: 'website',
    targetAssetId: 'api-001',
    targetAssetName: 'Core Banking API',
    targetAssetType: 'api',
    description: 'Internet banking frontend depends on Core Banking API',
    confidence: 'high',
    discoveryMethod: 'automatic',
    impactWeight: 10,
    tags: ['critical', 'banking'],
    createdAt: daysAgo(400),
    updatedAt: daysAgo(0),
    lastVerified: daysAgo(0),
  },
  {
    id: 'rel-006',
    type: 'depends_on',
    sourceAssetId: 'web-003',
    sourceAssetName: 'shop.vinmart.vn',
    sourceAssetType: 'website',
    targetAssetId: 'api-002',
    targetAssetName: 'Payment Gateway API',
    targetAssetType: 'api',
    description: 'E-commerce site depends on Payment Gateway',
    confidence: 'high',
    discoveryMethod: 'automatic',
    impactWeight: 9,
    tags: ['payment', 'e-commerce'],
    createdAt: daysAgo(180),
    updatedAt: daysAgo(1),
    lastVerified: daysAgo(0),
  },
  {
    id: 'rel-007',
    type: 'depends_on',
    sourceAssetId: 'web-001',
    sourceAssetName: 'portal.fpt.com.vn',
    sourceAssetType: 'website',
    targetAssetId: 'api-003',
    targetAssetName: 'Customer Data API',
    targetAssetType: 'api',
    description: 'Customer portal depends on Customer Data API',
    confidence: 'high',
    discoveryMethod: 'automatic',
    impactWeight: 8,
    tags: ['customer-data'],
    createdAt: daysAgo(200),
    updatedAt: daysAgo(2),
    lastVerified: daysAgo(1),
  },

  // ============================================
  // API → Database (depends_on)
  // ============================================
  {
    id: 'rel-008',
    type: 'depends_on',
    sourceAssetId: 'api-001',
    sourceAssetName: 'Core Banking API',
    sourceAssetType: 'api',
    targetAssetId: 'db-001',
    targetAssetName: 'Oracle - core-banking.db.vn',
    targetAssetType: 'database',
    description: 'Core Banking API connects to Oracle database',
    confidence: 'high',
    discoveryMethod: 'automatic',
    impactWeight: 10,
    tags: ['critical', 'database'],
    createdAt: daysAgo(400),
    updatedAt: daysAgo(0),
    lastVerified: daysAgo(0),
  },
  {
    id: 'rel-009',
    type: 'depends_on',
    sourceAssetId: 'api-002',
    sourceAssetName: 'Payment Gateway API',
    sourceAssetType: 'api',
    targetAssetId: 'db-002',
    targetAssetName: 'PostgreSQL - payments.db.vn',
    targetAssetType: 'database',
    description: 'Payment API uses PostgreSQL for transactions',
    confidence: 'high',
    discoveryMethod: 'automatic',
    impactWeight: 10,
    tags: ['critical', 'payment'],
    createdAt: daysAgo(300),
    updatedAt: daysAgo(1),
    lastVerified: daysAgo(0),
  },
  {
    id: 'rel-010',
    type: 'depends_on',
    sourceAssetId: 'api-003',
    sourceAssetName: 'Customer Data API',
    sourceAssetType: 'api',
    targetAssetId: 'db-003',
    targetAssetName: 'MongoDB - analytics.db.vn',
    targetAssetType: 'database',
    description: 'Customer Data API uses MongoDB for analytics',
    confidence: 'high',
    discoveryMethod: 'automatic',
    impactWeight: 7,
    tags: ['analytics'],
    createdAt: daysAgo(200),
    updatedAt: daysAgo(2),
    lastVerified: daysAgo(1),
  },

  // ============================================
  // API → Service (depends_on) - Cache, Queue
  // ============================================
  {
    id: 'rel-011',
    type: 'depends_on',
    sourceAssetId: 'api-001',
    sourceAssetName: 'Core Banking API',
    sourceAssetType: 'api',
    targetAssetId: 'svc-003',
    targetAssetName: 'Redis - cache.internal.vn:6379',
    targetAssetType: 'service',
    description: 'Core Banking API uses Redis for session caching',
    confidence: 'high',
    discoveryMethod: 'automatic',
    impactWeight: 8,
    tags: ['cache'],
    createdAt: daysAgo(350),
    updatedAt: daysAgo(1),
    lastVerified: daysAgo(0),
  },
  {
    id: 'rel-012',
    type: 'depends_on',
    sourceAssetId: 'api-002',
    sourceAssetName: 'Payment Gateway API',
    sourceAssetType: 'api',
    targetAssetId: 'svc-004',
    targetAssetName: 'Kafka - events.internal.vn:9092',
    targetAssetType: 'service',
    description: 'Payment API publishes events to Kafka',
    confidence: 'high',
    discoveryMethod: 'automatic',
    impactWeight: 9,
    tags: ['event-driven', 'messaging'],
    createdAt: daysAgo(280),
    updatedAt: daysAgo(1),
    lastVerified: daysAgo(0),
  },

  // ============================================
  // K8s Cluster → Workload (contains)
  // ============================================
  {
    id: 'rel-013',
    type: 'contains',
    sourceAssetId: 'cluster-001',
    sourceAssetName: 'prod-gke-cluster',
    sourceAssetType: 'k8s_cluster',
    targetAssetId: 'workload-001',
    targetAssetName: 'user-service',
    targetAssetType: 'k8s_workload',
    description: 'Production GKE cluster contains user-service deployment',
    confidence: 'high',
    discoveryMethod: 'automatic',
    impactWeight: 8,
    tags: ['kubernetes', 'production'],
    createdAt: daysAgo(250),
    updatedAt: daysAgo(0),
    lastVerified: daysAgo(0),
  },
  {
    id: 'rel-014',
    type: 'contains',
    sourceAssetId: 'cluster-001',
    sourceAssetName: 'prod-gke-cluster',
    sourceAssetType: 'k8s_cluster',
    targetAssetId: 'workload-002',
    targetAssetName: 'payment-processor',
    targetAssetType: 'k8s_workload',
    description: 'Production GKE cluster contains payment-processor deployment',
    confidence: 'high',
    discoveryMethod: 'automatic',
    impactWeight: 10,
    tags: ['kubernetes', 'production', 'critical'],
    createdAt: daysAgo(250),
    updatedAt: daysAgo(0),
    lastVerified: daysAgo(0),
  },
  {
    id: 'rel-015',
    type: 'contains',
    sourceAssetId: 'cluster-001',
    sourceAssetName: 'prod-gke-cluster',
    sourceAssetType: 'k8s_cluster',
    targetAssetId: 'workload-003',
    targetAssetName: 'api-gateway',
    targetAssetType: 'k8s_workload',
    description: 'Production GKE cluster contains api-gateway deployment',
    confidence: 'high',
    discoveryMethod: 'automatic',
    impactWeight: 9,
    tags: ['kubernetes', 'production'],
    createdAt: daysAgo(250),
    updatedAt: daysAgo(0),
    lastVerified: daysAgo(0),
  },
  {
    id: 'rel-016',
    type: 'contains',
    sourceAssetId: 'cluster-002',
    sourceAssetName: 'staging-eks-cluster',
    sourceAssetType: 'k8s_cluster',
    targetAssetId: 'workload-005',
    targetAssetName: 'user-service-staging',
    targetAssetType: 'k8s_workload',
    description: 'Staging EKS cluster contains user-service-staging deployment',
    confidence: 'high',
    discoveryMethod: 'automatic',
    impactWeight: 5,
    tags: ['kubernetes', 'staging'],
    createdAt: daysAgo(200),
    updatedAt: daysAgo(1),
    lastVerified: daysAgo(0),
  },

  // ============================================
  // Workload → Container Image (depends_on)
  // ============================================
  {
    id: 'rel-017',
    type: 'depends_on',
    sourceAssetId: 'workload-001',
    sourceAssetName: 'user-service',
    sourceAssetType: 'k8s_workload',
    targetAssetId: 'image-002',
    targetAssetName: 'vingroup/user-service:v2.5.1',
    targetAssetType: 'container_image',
    description: 'user-service workload uses vingroup/user-service image',
    confidence: 'high',
    discoveryMethod: 'automatic',
    impactWeight: 8,
    tags: ['container'],
    createdAt: daysAgo(7),
    updatedAt: daysAgo(0),
    lastVerified: daysAgo(0),
  },
  {
    id: 'rel-018',
    type: 'depends_on',
    sourceAssetId: 'workload-002',
    sourceAssetName: 'payment-processor',
    sourceAssetType: 'k8s_workload',
    targetAssetId: 'image-003',
    targetAssetName: 'vingroup/payment-processor:v3.1.0',
    targetAssetType: 'container_image',
    description: 'payment-processor workload uses vingroup/payment-processor image',
    confidence: 'high',
    discoveryMethod: 'automatic',
    impactWeight: 10,
    tags: ['container', 'critical'],
    createdAt: daysAgo(14),
    updatedAt: daysAgo(0),
    lastVerified: daysAgo(0),
  },
  {
    id: 'rel-019',
    type: 'depends_on',
    sourceAssetId: 'workload-003',
    sourceAssetName: 'api-gateway',
    sourceAssetType: 'k8s_workload',
    targetAssetId: 'image-001',
    targetAssetName: 'nginx:1.25-alpine',
    targetAssetType: 'container_image',
    description: 'api-gateway workload uses nginx image',
    confidence: 'high',
    discoveryMethod: 'automatic',
    impactWeight: 9,
    tags: ['container'],
    createdAt: daysAgo(30),
    updatedAt: daysAgo(0),
    lastVerified: daysAgo(0),
  },

  // ============================================
  // API → K8s Workload (runs_on)
  // ============================================
  {
    id: 'rel-020',
    type: 'runs_on',
    sourceAssetId: 'api-001',
    sourceAssetName: 'Core Banking API',
    sourceAssetType: 'api',
    targetAssetId: 'workload-002',
    targetAssetName: 'payment-processor',
    targetAssetType: 'k8s_workload',
    description: 'Core Banking API runs on payment-processor workload',
    confidence: 'high',
    discoveryMethod: 'automatic',
    impactWeight: 10,
    tags: ['kubernetes', 'critical'],
    createdAt: daysAgo(250),
    updatedAt: daysAgo(0),
    lastVerified: daysAgo(0),
  },
  {
    id: 'rel-021',
    type: 'runs_on',
    sourceAssetId: 'api-003',
    sourceAssetName: 'Customer Data API',
    sourceAssetType: 'api',
    targetAssetId: 'workload-001',
    targetAssetName: 'user-service',
    targetAssetType: 'k8s_workload',
    description: 'Customer Data API runs on user-service workload',
    confidence: 'high',
    discoveryMethod: 'automatic',
    impactWeight: 8,
    tags: ['kubernetes'],
    createdAt: daysAgo(200),
    updatedAt: daysAgo(0),
    lastVerified: daysAgo(0),
  },

  // ============================================
  // Database → Host/Cloud (runs_on / hosted_on)
  // ============================================
  {
    id: 'rel-022',
    type: 'hosted_on',
    sourceAssetId: 'db-001',
    sourceAssetName: 'Oracle - core-banking.db.vn',
    sourceAssetType: 'database',
    targetAssetId: 'cloud-001',
    targetAssetName: 'aws-prod-vpc-01',
    targetAssetType: 'cloud_account',
    description: 'Oracle database hosted on AWS production VPC',
    confidence: 'high',
    discoveryMethod: 'automatic',
    impactWeight: 10,
    tags: ['cloud_account', 'aws', 'critical'],
    createdAt: daysAgo(400),
    updatedAt: daysAgo(0),
    lastVerified: daysAgo(0),
  },
  {
    id: 'rel-023',
    type: 'hosted_on',
    sourceAssetId: 'db-002',
    sourceAssetName: 'PostgreSQL - payments.db.vn',
    sourceAssetType: 'database',
    targetAssetId: 'cloud-002',
    targetAssetName: 'gcp-prod-project',
    targetAssetType: 'cloud_account',
    description: 'PostgreSQL database hosted on GCP production project',
    confidence: 'high',
    discoveryMethod: 'automatic',
    impactWeight: 10,
    tags: ['cloud_account', 'gcp', 'critical'],
    createdAt: daysAgo(300),
    updatedAt: daysAgo(1),
    lastVerified: daysAgo(0),
  },
  {
    id: 'rel-024',
    type: 'runs_on',
    sourceAssetId: 'db-004',
    sourceAssetName: 'Redis - session.cache.vn',
    sourceAssetType: 'database',
    targetAssetId: 'host-002',
    targetAssetName: 'web-server-02.internal.vn',
    targetAssetType: 'host',
    description: 'Redis cache runs on internal server',
    confidence: 'high',
    discoveryMethod: 'automatic',
    impactWeight: 7,
    tags: ['cache', 'on-premise'],
    createdAt: daysAgo(200),
    updatedAt: daysAgo(2),
    lastVerified: daysAgo(1),
  },

  // ============================================
  // Service → Host (runs_on)
  // ============================================
  {
    id: 'rel-025',
    type: 'runs_on',
    sourceAssetId: 'svc-001',
    sourceAssetName: 'SSH - bastion.internal.vn:22',
    sourceAssetType: 'service',
    targetAssetId: 'host-001',
    targetAssetName: 'db-server-01.internal.vn',
    targetAssetType: 'host',
    description: 'SSH service runs on database server',
    confidence: 'high',
    discoveryMethod: 'automatic',
    impactWeight: 8,
    tags: ['ssh', 'management'],
    createdAt: daysAgo(365),
    updatedAt: daysAgo(1),
    lastVerified: daysAgo(0),
  },
  {
    id: 'rel-026',
    type: 'runs_on',
    sourceAssetId: 'svc-002',
    sourceAssetName: 'HTTPS - api.internal.vn:443',
    sourceAssetType: 'service',
    targetAssetId: 'host-003',
    targetAssetName: 'api-gateway-01.internal.vn',
    targetAssetType: 'host',
    description: 'HTTPS API service runs on API gateway server',
    confidence: 'high',
    discoveryMethod: 'automatic',
    impactWeight: 9,
    tags: ['api', 'https'],
    createdAt: daysAgo(300),
    updatedAt: daysAgo(0),
    lastVerified: daysAgo(0),
  },

  // ============================================
  // Cloud → K8s Cluster (manages)
  // ============================================
  {
    id: 'rel-027',
    type: 'manages',
    sourceAssetId: 'cloud-002',
    sourceAssetName: 'gcp-prod-project',
    sourceAssetType: 'cloud_account',
    targetAssetId: 'cluster-001',
    targetAssetName: 'prod-gke-cluster',
    targetAssetType: 'k8s_cluster',
    description: 'GCP project manages production GKE cluster',
    confidence: 'high',
    discoveryMethod: 'automatic',
    impactWeight: 9,
    tags: ['gcp', 'kubernetes'],
    createdAt: daysAgo(250),
    updatedAt: daysAgo(0),
    lastVerified: daysAgo(0),
  },
  {
    id: 'rel-028',
    type: 'manages',
    sourceAssetId: 'cloud-001',
    sourceAssetName: 'aws-prod-vpc-01',
    sourceAssetType: 'cloud_account',
    targetAssetId: 'cluster-002',
    targetAssetName: 'staging-eks-cluster',
    targetAssetType: 'k8s_cluster',
    description: 'AWS VPC manages staging EKS cluster',
    confidence: 'high',
    discoveryMethod: 'automatic',
    impactWeight: 6,
    tags: ['aws', 'kubernetes', 'staging'],
    createdAt: daysAgo(200),
    updatedAt: daysAgo(1),
    lastVerified: daysAgo(0),
  },

  // ============================================
  // Host → Container (contains)
  // ============================================
  {
    id: 'rel-029',
    type: 'contains',
    sourceAssetId: 'host-004',
    sourceAssetName: 'container-host-01.internal.vn',
    sourceAssetType: 'host',
    targetAssetId: 'container-001',
    targetAssetName: 'nginx-proxy-prod',
    targetAssetType: 'container',
    description: 'Container host runs nginx proxy container',
    confidence: 'high',
    discoveryMethod: 'automatic',
    impactWeight: 7,
    tags: ['docker', 'proxy'],
    createdAt: daysAgo(150),
    updatedAt: daysAgo(1),
    lastVerified: daysAgo(0),
  },

  // ============================================
  // Mobile → API (depends_on)
  // ============================================
  {
    id: 'rel-030',
    type: 'depends_on',
    sourceAssetId: 'mobile-001',
    sourceAssetName: 'VinBank Mobile',
    sourceAssetType: 'mobile',
    targetAssetId: 'api-001',
    targetAssetName: 'Core Banking API',
    targetAssetType: 'api',
    description: 'VinBank mobile app depends on Core Banking API',
    confidence: 'high',
    discoveryMethod: 'automatic',
    impactWeight: 10,
    tags: ['mobile', 'banking'],
    createdAt: daysAgo(300),
    updatedAt: daysAgo(0),
    lastVerified: daysAgo(0),
  },
  {
    id: 'rel-031',
    type: 'depends_on',
    sourceAssetId: 'mobile-001',
    sourceAssetName: 'VinBank Mobile',
    sourceAssetType: 'mobile',
    targetAssetId: 'api-002',
    targetAssetName: 'Payment Gateway API',
    targetAssetType: 'api',
    description: 'VinBank mobile app depends on Payment Gateway API',
    confidence: 'high',
    discoveryMethod: 'automatic',
    impactWeight: 10,
    tags: ['mobile', 'payment'],
    createdAt: daysAgo(280),
    updatedAt: daysAgo(0),
    lastVerified: daysAgo(0),
  },

  // ============================================
  // API → API (authenticates_to)
  // ============================================
  {
    id: 'rel-032',
    type: 'authenticates_to',
    sourceAssetId: 'api-002',
    sourceAssetName: 'Payment Gateway API',
    sourceAssetType: 'api',
    targetAssetId: 'api-005',
    targetAssetName: 'Identity Provider API',
    targetAssetType: 'api',
    description: 'Payment Gateway authenticates via Identity Provider',
    confidence: 'high',
    discoveryMethod: 'automatic',
    impactWeight: 10,
    tags: ['oauth', 'authentication'],
    createdAt: daysAgo(280),
    updatedAt: daysAgo(0),
    lastVerified: daysAgo(0),
  },
  {
    id: 'rel-033',
    type: 'authenticates_to',
    sourceAssetId: 'api-001',
    sourceAssetName: 'Core Banking API',
    sourceAssetType: 'api',
    targetAssetId: 'api-005',
    targetAssetName: 'Identity Provider API',
    targetAssetType: 'api',
    description: 'Core Banking API authenticates via Identity Provider',
    confidence: 'high',
    discoveryMethod: 'automatic',
    impactWeight: 10,
    tags: ['oauth', 'authentication'],
    createdAt: daysAgo(350),
    updatedAt: daysAgo(0),
    lastVerified: daysAgo(0),
  },

  // ============================================
  // Database → Database (provides_dr_for)
  // ============================================
  {
    id: 'rel-034',
    type: 'provides_dr_for',
    sourceAssetId: 'db-005',
    sourceAssetName: 'Elasticsearch - logs.elastic.vn',
    sourceAssetType: 'database',
    targetAssetId: 'db-003',
    targetAssetName: 'MongoDB - analytics.db.vn',
    targetAssetType: 'database',
    description: 'Elasticsearch provides disaster recovery for MongoDB analytics',
    confidence: 'medium',
    discoveryMethod: 'manual',
    impactWeight: 6,
    tags: ['dr', 'backup'],
    createdAt: daysAgo(100),
    updatedAt: daysAgo(5),
    lastVerified: daysAgo(5),
  },

  // ============================================
  // Service → Service (connected_to)
  // ============================================
  {
    id: 'rel-035',
    type: 'connected_to',
    sourceAssetId: 'svc-003',
    sourceAssetName: 'Redis - cache.internal.vn:6379',
    sourceAssetType: 'service',
    targetAssetId: 'svc-004',
    targetAssetName: 'Kafka - events.internal.vn:9092',
    targetAssetType: 'service',
    description: 'Redis connects to Kafka for cache invalidation events',
    confidence: 'medium',
    discoveryMethod: 'automatic',
    impactWeight: 7,
    tags: ['event-driven'],
    createdAt: daysAgo(200),
    updatedAt: daysAgo(2),
    lastVerified: daysAgo(1),
  },

  // ============================================
  // API → Service (sends_data_to)
  // ============================================
  {
    id: 'rel-036',
    type: 'sends_data_to',
    sourceAssetId: 'api-001',
    sourceAssetName: 'Core Banking API',
    sourceAssetType: 'api',
    targetAssetId: 'svc-004',
    targetAssetName: 'Kafka - events.internal.vn:9092',
    targetAssetType: 'service',
    description: 'Core Banking API sends transaction events to Kafka',
    confidence: 'high',
    discoveryMethod: 'automatic',
    impactWeight: 9,
    tags: ['event-driven', 'transactions'],
    createdAt: daysAgo(300),
    updatedAt: daysAgo(0),
    lastVerified: daysAgo(0),
  },

  // ============================================
  // Load Balancer relationships
  // ============================================
  {
    id: 'rel-037',
    type: 'load_balances',
    sourceAssetId: 'cloud-003',
    sourceAssetName: 'azure-prod-rg',
    sourceAssetType: 'cloud_account',
    targetAssetId: 'workload-003',
    targetAssetName: 'api-gateway',
    targetAssetType: 'k8s_workload',
    description: 'Azure Load Balancer distributes traffic to API gateway',
    confidence: 'high',
    discoveryMethod: 'automatic',
    impactWeight: 9,
    tags: ['load-balancer', 'azure'],
    createdAt: daysAgo(180),
    updatedAt: daysAgo(1),
    lastVerified: daysAgo(0),
  },

  // ============================================
  // Repository → Container Image (contains - builds)
  // ============================================
  {
    id: 'rel-038',
    type: 'contains',
    sourceAssetId: 'proj-001',
    sourceAssetName: 'vingroup/core-banking-api',
    sourceAssetType: 'repository',
    targetAssetId: 'image-003',
    targetAssetName: 'vingroup/payment-processor:v3.1.0',
    targetAssetType: 'container_image',
    description: 'Core banking repository builds payment-processor image',
    confidence: 'high',
    discoveryMethod: 'automatic',
    impactWeight: 8,
    tags: ['ci-cd', 'build'],
    createdAt: daysAgo(14),
    updatedAt: daysAgo(0),
    lastVerified: daysAgo(0),
  },
  {
    id: 'rel-039',
    type: 'contains',
    sourceAssetId: 'proj-002',
    sourceAssetName: 'fpt/customer-portal',
    sourceAssetType: 'repository',
    targetAssetId: 'image-002',
    targetAssetName: 'vingroup/user-service:v2.5.1',
    targetAssetType: 'container_image',
    description: 'Customer portal project builds user-service image',
    confidence: 'high',
    discoveryMethod: 'automatic',
    impactWeight: 7,
    tags: ['ci-cd', 'build'],
    createdAt: daysAgo(7),
    updatedAt: daysAgo(0),
    lastVerified: daysAgo(0),
  },

  // ============================================
  // Workload → Database (depends_on)
  // ============================================
  {
    id: 'rel-040',
    type: 'depends_on',
    sourceAssetId: 'workload-001',
    sourceAssetName: 'user-service',
    sourceAssetType: 'k8s_workload',
    targetAssetId: 'db-002',
    targetAssetName: 'PostgreSQL - payments.db.vn',
    targetAssetType: 'database',
    description: 'User service workload connects to PostgreSQL database',
    confidence: 'high',
    discoveryMethod: 'automatic',
    impactWeight: 9,
    tags: ['kubernetes', 'database'],
    createdAt: daysAgo(200),
    updatedAt: daysAgo(0),
    lastVerified: daysAgo(0),
  },
]

// ============================================
// Helper Functions
// ============================================

/**
 * Get all relationships for a specific asset
 */
export const getAssetRelationships = (assetId: string): AssetRelationship[] =>
  assetRelationships.filter((rel) => rel.sourceAssetId === assetId || rel.targetAssetId === assetId)

/**
 * Get outgoing relationships (where asset is the source)
 */
export const getOutgoingRelationships = (assetId: string): AssetRelationship[] =>
  assetRelationships.filter((rel) => rel.sourceAssetId === assetId)

/**
 * Get incoming relationships (where asset is the target)
 */
export const getIncomingRelationships = (assetId: string): AssetRelationship[] =>
  assetRelationships.filter((rel) => rel.targetAssetId === assetId)

/**
 * Get relationships by type
 */
export const getRelationshipsByType = (type: RelationshipType): AssetRelationship[] =>
  assetRelationships.filter((rel) => rel.type === type)

/**
 * Get assets that depend on a specific asset (impact analysis)
 */
export const getDependentAssets = (assetId: string): string[] => {
  const dependents = assetRelationships
    .filter((rel) => rel.targetAssetId === assetId && rel.type === 'depends_on')
    .map((rel) => rel.sourceAssetId)
  return [...new Set(dependents)]
}

/**
 * Get assets that a specific asset depends on
 */
export const getDependencies = (assetId: string): string[] => {
  const dependencies = assetRelationships
    .filter((rel) => rel.sourceAssetId === assetId && rel.type === 'depends_on')
    .map((rel) => rel.targetAssetId)
  return [...new Set(dependencies)]
}

/**
 * Calculate relationship statistics
 */
export const getRelationshipStats = (): RelationshipStats => {
  const byType: Record<RelationshipType, number> = {} as Record<RelationshipType, number>
  const byConfidence: Record<string, number> = { high: 0, medium: 0, low: 0 }
  const byDiscoveryMethod: Record<string, number> = {
    automatic: 0,
    manual: 0,
    imported: 0,
    inferred: 0,
  }
  let totalImpactWeight = 0

  assetRelationships.forEach((rel) => {
    byType[rel.type] = (byType[rel.type] || 0) + 1
    byConfidence[rel.confidence] = (byConfidence[rel.confidence] || 0) + 1
    byDiscoveryMethod[rel.discoveryMethod] = (byDiscoveryMethod[rel.discoveryMethod] || 0) + 1
    totalImpactWeight += rel.impactWeight
  })

  return {
    totalRelationships: assetRelationships.length,
    byType,
    byConfidence: byConfidence as Record<'high' | 'medium' | 'low', number>,
    byDiscoveryMethod: byDiscoveryMethod as Record<
      'automatic' | 'manual' | 'imported' | 'inferred',
      number
    >,
    averageImpactWeight: totalImpactWeight / assetRelationships.length,
  }
}

// ============================================
// Graph Data for Visualization
// ============================================

/**
 * Build a relationship graph for visualization
 */
export const buildRelationshipGraph = (assetId?: string): RelationshipGraph => {
  const relevantRelationships = assetId ? getAssetRelationships(assetId) : assetRelationships

  const nodeMap = new Map<string, RelationshipGraphNode>()
  const edges: RelationshipGraphEdge[] = []

  relevantRelationships.forEach((rel) => {
    // Add source node
    if (!nodeMap.has(rel.sourceAssetId)) {
      nodeMap.set(rel.sourceAssetId, {
        id: rel.sourceAssetId,
        name: rel.sourceAssetName,
        type: rel.sourceAssetType,
      })
    }

    // Add target node
    if (!nodeMap.has(rel.targetAssetId)) {
      nodeMap.set(rel.targetAssetId, {
        id: rel.targetAssetId,
        name: rel.targetAssetName,
        type: rel.targetAssetType,
      })
    }

    // Add edge
    edges.push({
      id: rel.id,
      source: rel.sourceAssetId,
      target: rel.targetAssetId,
      type: rel.type,
      label: rel.type.replace(/_/g, ' '),
      impactWeight: rel.impactWeight,
    })
  })

  return {
    nodes: Array.from(nodeMap.values()),
    edges,
  }
}

// ============================================
// Attack Path Mock Data
// ============================================

export const attackPaths: AttackPath[] = [
  {
    id: 'path-001',
    name: 'External to Database via API',
    description:
      'Attack path from external domain through web application and API to reach database',
    steps: [
      {
        assetId: 'dom-004',
        assetName: 'techcombank.com.vn',
        assetType: 'domain',
        relationshipType: 'exposes',
        relationshipDirection: 'outgoing',
      },
      {
        assetId: 'web-002',
        assetName: 'ebanking.techcombank.com.vn',
        assetType: 'website',
        relationshipType: 'depends_on',
        relationshipDirection: 'outgoing',
      },
      {
        assetId: 'api-001',
        assetName: 'Core Banking API',
        assetType: 'api',
        relationshipType: 'depends_on',
        relationshipDirection: 'outgoing',
      },
      {
        assetId: 'db-001',
        assetName: 'Oracle - core-banking.db.vn',
        assetType: 'database',
        relationshipType: 'depends_on',
        relationshipDirection: 'incoming',
      },
    ],
    totalRiskScore: 88,
    entryPoint: {
      id: 'dom-004',
      name: 'techcombank.com.vn',
      type: 'domain',
      riskScore: 82,
    },
    targetAsset: {
      id: 'db-001',
      name: 'Oracle - core-banking.db.vn',
      type: 'database',
      riskScore: 75,
    },
    createdAt: daysAgo(7),
  },
  {
    id: 'path-002',
    name: 'Container Image to Production Cluster',
    description: 'Attack path from vulnerable container image to production Kubernetes workloads',
    steps: [
      {
        assetId: 'image-003',
        assetName: 'vingroup/payment-processor:v3.1.0',
        assetType: 'container_image',
        relationshipType: 'depends_on',
        relationshipDirection: 'incoming',
      },
      {
        assetId: 'workload-002',
        assetName: 'payment-processor',
        assetType: 'k8s_workload',
        relationshipType: 'contains',
        relationshipDirection: 'incoming',
      },
      {
        assetId: 'cluster-001',
        assetName: 'prod-gke-cluster',
        assetType: 'k8s_cluster',
        relationshipType: 'manages',
        relationshipDirection: 'incoming',
      },
    ],
    totalRiskScore: 85,
    entryPoint: {
      id: 'image-003',
      name: 'vingroup/payment-processor:v3.1.0',
      type: 'container_image',
      riskScore: 85,
    },
    targetAsset: {
      id: 'cluster-001',
      name: 'prod-gke-cluster',
      type: 'k8s_cluster',
      riskScore: 65,
    },
    createdAt: daysAgo(3),
  },
  {
    id: 'path-003',
    name: 'Mobile App to Payment Database',
    description: 'Attack path from mobile application through payment API to transaction database',
    steps: [
      {
        assetId: 'mobile-001',
        assetName: 'VinBank Mobile',
        assetType: 'mobile',
        relationshipType: 'depends_on',
        relationshipDirection: 'outgoing',
      },
      {
        assetId: 'api-002',
        assetName: 'Payment Gateway API',
        assetType: 'api',
        relationshipType: 'depends_on',
        relationshipDirection: 'outgoing',
      },
      {
        assetId: 'db-002',
        assetName: 'PostgreSQL - payments.db.vn',
        assetType: 'database',
        relationshipType: 'depends_on',
        relationshipDirection: 'incoming',
      },
    ],
    totalRiskScore: 82,
    entryPoint: {
      id: 'mobile-001',
      name: 'VinBank Mobile',
      type: 'mobile',
      riskScore: 68,
    },
    targetAsset: {
      id: 'db-002',
      name: 'PostgreSQL - payments.db.vn',
      type: 'database',
      riskScore: 72,
    },
    createdAt: daysAgo(5),
  },
]

/**
 * Get attack paths involving a specific asset
 */
export const getAttackPathsForAsset = (assetId: string): AttackPath[] =>
  attackPaths.filter(
    (path) =>
      path.entryPoint.id === assetId ||
      path.targetAsset.id === assetId ||
      path.steps.some((step) => step.assetId === assetId)
  )
