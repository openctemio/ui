'use client'

/**
 * Category Templates for Asset Types
 *
 * Groups related asset types into categories with shared defaults.
 * Each template provides sensible defaults that individual types can override.
 *
 * Categories:
 * - External: domain, subdomain, certificate, ip_address
 * - Applications: website, web_application, api, mobile_app, service
 * - Cloud: cloud_account, compute, storage, serverless, container_registry
 * - Infrastructure: host, container, database, network, vpc, subnet, load_balancer, firewall, k8s
 * - Code: repository
 * - Identity: iam_user, iam_role, service_account
 * - Recon: http_service, open_port, discovered_url
 */

import type { AssetPageConfig } from '../types/page-config.types'
import {
  buildAssetPageConfig,
  metadataTextColumn,
  metadataBadgeColumn,
  metadataBoolColumn,
  commonFormFields,
  metadataExportFields,
  metadataDetailSection,
} from './config-builder'
import {
  User,
  Key,
  UserCheck,
  Radio,
  LockOpen,
  Link2,
  Container,
  Network as NetworkIcon,
} from 'lucide-react'

// =============================================================================
// IDENTITY CATEGORY — iam_user, iam_role, service_account
// =============================================================================

export const iamUserConfig: AssetPageConfig = buildAssetPageConfig({
  type: 'identity',
  label: 'IAM User',
  labelPlural: 'IAM Users',
  description: 'Manage IAM user accounts across cloud providers',
  icon: User,
  iconColor: 'text-indigo-500',
  gradientFrom: 'from-indigo-500/20',
  gradientVia: 'via-indigo-500/10',
  columns: [
    metadataTextColumn('email', 'Email'),
    metadataTextColumn('provider', 'Provider'),
    metadataBoolColumn('mfaEnabled', 'MFA'),
    metadataBadgeColumn('lastActivity', 'Last Activity'),
  ],
  formFields: [
    commonFormFields.provider([
      { label: 'AWS', value: 'aws' },
      { label: 'GCP', value: 'gcp' },
      { label: 'Azure', value: 'azure' },
    ]),
    {
      name: 'email',
      label: 'Email',
      type: 'text',
      placeholder: 'user@example.com',
      isMetadata: true,
    },
    { name: 'mfaEnabled', label: 'MFA Enabled', type: 'boolean', isMetadata: true },
  ],
  detailSections: [
    metadataDetailSection('Identity Details', [
      { label: 'Email', key: 'email' },
      { label: 'Provider', key: 'provider' },
      { label: 'MFA Enabled', key: 'mfaEnabled' },
      { label: 'Last Activity', key: 'lastActivity' },
      { label: 'Access Keys', key: 'accessKeyCount' },
      { label: 'Groups', key: 'groupCount' },
    ]),
  ],
  exportFields: metadataExportFields(
    { header: 'Email', key: 'email' },
    { header: 'Provider', key: 'provider' },
    { header: 'MFA', key: 'mfaEnabled' }
  ),
})

export const iamRoleConfig: AssetPageConfig = buildAssetPageConfig({
  type: 'identity',
  label: 'IAM Role',
  labelPlural: 'IAM Roles',
  description: 'Manage IAM roles and their permissions',
  icon: Key,
  iconColor: 'text-amber-500',
  gradientFrom: 'from-amber-500/20',
  gradientVia: 'via-amber-500/10',
  columns: [
    metadataTextColumn('provider', 'Provider'),
    metadataTextColumn('trustPolicy', 'Trust Policy'),
    metadataBadgeColumn('permissionBoundary', 'Boundary'),
  ],
  formFields: [
    commonFormFields.provider([
      { label: 'AWS', value: 'aws' },
      { label: 'GCP', value: 'gcp' },
      { label: 'Azure', value: 'azure' },
    ]),
    { name: 'trustPolicy', label: 'Trust Policy', type: 'text', isMetadata: true },
  ],
  exportFields: metadataExportFields(
    { header: 'Provider', key: 'provider' },
    { header: 'Trust Policy', key: 'trustPolicy' }
  ),
})

export const serviceAccountConfig: AssetPageConfig = buildAssetPageConfig({
  type: 'identity',
  label: 'Service Account',
  labelPlural: 'Service Accounts',
  description: 'Manage service accounts and machine identities',
  icon: UserCheck,
  iconColor: 'text-teal-500',
  gradientFrom: 'from-teal-500/20',
  gradientVia: 'via-teal-500/10',
  columns: [
    metadataTextColumn('provider', 'Provider'),
    metadataTextColumn('email', 'Email'),
    metadataBadgeColumn('keyAge', 'Key Age'),
  ],
  formFields: [
    commonFormFields.provider([
      { label: 'AWS', value: 'aws' },
      { label: 'GCP', value: 'gcp' },
      { label: 'Azure', value: 'azure' },
      { label: 'Kubernetes', value: 'kubernetes' },
    ]),
    { name: 'email', label: 'Email / ID', type: 'text', isMetadata: true },
  ],
  exportFields: metadataExportFields(
    { header: 'Provider', key: 'provider' },
    { header: 'Email', key: 'email' }
  ),
})

// =============================================================================
// RECON CATEGORY — http_service, open_port, discovered_url
// =============================================================================

export const httpServiceConfig: AssetPageConfig = buildAssetPageConfig({
  type: 'service',
  label: 'HTTP Service',
  labelPlural: 'HTTP Services',
  description: 'HTTP/HTTPS services discovered during reconnaissance',
  icon: Radio,
  iconColor: 'text-cyan-500',
  gradientFrom: 'from-cyan-500/20',
  gradientVia: 'via-cyan-500/10',
  columns: [
    metadataTextColumn('statusCode', 'Status'),
    metadataTextColumn('contentType', 'Content Type'),
    metadataTextColumn('server', 'Server'),
    metadataTextColumn('technology', 'Technology'),
  ],
  formFields: [
    commonFormFields.url('URL', 'https://example.com'),
    { name: 'statusCode', label: 'Status Code', type: 'number', isMetadata: true },
    { name: 'server', label: 'Server', type: 'text', isMetadata: true },
  ],
  exportFields: metadataExportFields(
    { header: 'Status Code', key: 'statusCode' },
    { header: 'Server', key: 'server' },
    { header: 'Technology', key: 'technology' }
  ),
})

export const openPortConfig: AssetPageConfig = buildAssetPageConfig({
  type: 'service',
  label: 'Open Port',
  labelPlural: 'Open Ports',
  description: 'Open ports discovered during network scanning',
  icon: LockOpen,
  iconColor: 'text-red-500',
  gradientFrom: 'from-red-500/20',
  gradientVia: 'via-red-500/10',
  columns: [
    metadataTextColumn('port', 'Port'),
    metadataTextColumn('protocol', 'Protocol'),
    metadataTextColumn('service', 'Service'),
    metadataTextColumn('version', 'Version'),
  ],
  formFields: [
    commonFormFields.ipAddress(),
    commonFormFields.port(),
    {
      name: 'protocol',
      label: 'Protocol',
      type: 'select',
      options: [
        { label: 'TCP', value: 'tcp' },
        { label: 'UDP', value: 'udp' },
      ],
      isMetadata: true,
    },
    { name: 'service', label: 'Service', type: 'text', isMetadata: true },
  ],
  exportFields: metadataExportFields(
    { header: 'Port', key: 'port' },
    { header: 'Protocol', key: 'protocol' },
    { header: 'Service', key: 'service' }
  ),
})

export const discoveredUrlConfig: AssetPageConfig = buildAssetPageConfig({
  type: 'service',
  label: 'Discovered URL',
  labelPlural: 'Discovered URLs',
  description: 'URLs and endpoints discovered during web crawling',
  icon: Link2,
  iconColor: 'text-emerald-500',
  gradientFrom: 'from-emerald-500/20',
  gradientVia: 'via-emerald-500/10',
  columns: [
    metadataTextColumn('method', 'Method'),
    metadataTextColumn('statusCode', 'Status'),
    metadataTextColumn('contentType', 'Type'),
    metadataTextColumn('source', 'Source'),
  ],
  formFields: [
    commonFormFields.url('URL', 'https://example.com/path'),
    {
      name: 'method',
      label: 'Method',
      type: 'select',
      options: [
        { label: 'GET', value: 'GET' },
        { label: 'POST', value: 'POST' },
        { label: 'PUT', value: 'PUT' },
        { label: 'DELETE', value: 'DELETE' },
      ],
      isMetadata: true,
    },
  ],
  exportFields: metadataExportFields(
    { header: 'Method', key: 'method' },
    { header: 'Status Code', key: 'statusCode' },
    { header: 'Source', key: 'source' }
  ),
})

// =============================================================================
// KUBERNETES (subset of Infrastructure)
// =============================================================================

export const kubernetesClusterConfig: AssetPageConfig = buildAssetPageConfig({
  type: 'kubernetes',
  label: 'K8s Cluster',
  labelPlural: 'Kubernetes Clusters',
  description: 'Manage Kubernetes clusters',
  icon: Container,
  iconColor: 'text-blue-500',
  gradientFrom: 'from-blue-500/20',
  gradientVia: 'via-blue-500/10',
  columns: [
    metadataTextColumn('provider', 'Provider'),
    metadataTextColumn('version', 'Version'),
    metadataTextColumn('nodeCount', 'Nodes'),
    metadataTextColumn('namespaceCount', 'Namespaces'),
  ],
  formFields: [
    commonFormFields.provider([
      { label: 'EKS', value: 'eks' },
      { label: 'GKE', value: 'gke' },
      { label: 'AKS', value: 'aks' },
      { label: 'Self-hosted', value: 'self-hosted' },
    ]),
    { name: 'version', label: 'K8s Version', type: 'text', placeholder: '1.28', isMetadata: true },
    commonFormFields.region(),
  ],
  exportFields: metadataExportFields(
    { header: 'Provider', key: 'provider' },
    { header: 'Version', key: 'version' },
    { header: 'Nodes', key: 'nodeCount' }
  ),
})

// =============================================================================
// NETWORK DETAILS (subset of Infrastructure)
// =============================================================================

export const vpcConfig: AssetPageConfig = buildAssetPageConfig({
  type: 'vpc',
  types: ['network'],
  label: 'VPC',
  labelPlural: 'VPCs & Subnets',
  description: 'Virtual Private Clouds and subnets',
  icon: NetworkIcon,
  iconColor: 'text-violet-500',
  gradientFrom: 'from-violet-500/20',
  gradientVia: 'via-violet-500/10',
  columns: [
    metadataTextColumn('cidr', 'CIDR'),
    metadataTextColumn('provider', 'Provider'),
    metadataTextColumn('region', 'Region'),
    metadataBoolColumn('isDefault', 'Default'),
  ],
  formFields: [
    {
      name: 'cidr',
      label: 'CIDR Block',
      type: 'text',
      placeholder: '10.0.0.0/16',
      isMetadata: true,
    },
    commonFormFields.provider([
      { label: 'AWS', value: 'aws' },
      { label: 'GCP', value: 'gcp' },
      { label: 'Azure', value: 'azure' },
    ]),
    commonFormFields.region(),
  ],
  exportFields: metadataExportFields(
    { header: 'CIDR', key: 'cidr' },
    { header: 'Provider', key: 'provider' },
    { header: 'Region', key: 'region' }
  ),
})
