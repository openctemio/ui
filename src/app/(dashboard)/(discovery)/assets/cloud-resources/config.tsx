'use client'

import { Badge } from '@/components/ui/badge'
import { Cloud, MapPin, AlertTriangle, Shield, CheckCircle } from 'lucide-react'
import type { Asset } from '@/features/assets'
import type { AssetPageConfig } from '@/features/assets/types/page-config.types'

// Provider styling
const providerStyles: Record<string, { bg: string; text: string; icon: string }> = {
  aws: {
    bg: 'bg-orange-100 dark:bg-orange-900/30',
    text: 'text-orange-700 dark:text-orange-300',
    icon: 'text-orange-500',
  },
  gcp: {
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    text: 'text-blue-700 dark:text-blue-300',
    icon: 'text-blue-500',
  },
  azure: {
    bg: 'bg-cyan-100 dark:bg-cyan-900/30',
    text: 'text-cyan-700 dark:text-cyan-300',
    icon: 'text-cyan-500',
  },
}

// Regions by provider
const regionsByProvider: Record<string, string[]> = {
  aws: [
    'us-east-1',
    'us-east-2',
    'us-west-1',
    'us-west-2',
    'ap-southeast-1',
    'ap-southeast-2',
    'ap-northeast-1',
    'eu-west-1',
    'eu-central-1',
  ],
  gcp: ['us-central1', 'us-east1', 'us-west1', 'asia-southeast1', 'asia-east1', 'europe-west1'],
  azure: ['East US', 'West US', 'Southeast Asia', 'East Asia', 'West Europe', 'North Europe'],
}

// Resource types by provider
const resourceTypesByProvider: Record<string, string[]> = {
  aws: ['EC2', 'S3 Bucket', 'RDS', 'Lambda', 'VPC', 'EKS', 'ECS', 'CloudFront'],
  gcp: ['GCE', 'GCS Bucket', 'Cloud SQL', 'GKE Cluster', 'VPC', 'Cloud Run', 'BigQuery'],
  azure: ['VM', 'Blob Storage', 'SQL Server', 'AKS', 'VNet', 'Functions', 'Cosmos DB'],
}

// All resource types combined for form select options
const allResourceTypes = [
  ...new Set([
    ...resourceTypesByProvider.aws,
    ...resourceTypesByProvider.gcp,
    ...resourceTypesByProvider.azure,
  ]),
].map((t) => ({ label: t, value: t }))

// All regions combined for form select options
const allRegions = [
  ...new Set([...regionsByProvider.aws, ...regionsByProvider.gcp, ...regionsByProvider.azure]),
].map((r) => ({ label: r, value: r }))

export const cloudConfig: AssetPageConfig = {
  type: 'cloud_account',
  types: ['cloud_account', 'storage'],
  label: 'Cloud Asset',
  labelPlural: 'Cloud Assets',
  description: 'Manage your cloud infrastructure resources across AWS, GCP, and Azure',
  icon: Cloud,
  iconColor: 'text-sky-500',
  gradientFrom: 'from-sky-500/20',
  gradientVia: 'via-sky-500/10',

  columns: [
    {
      accessorKey: 'metadata.cloud_provider',
      header: 'Provider',
      cell: ({ row }) => {
        const provider = (row.original.metadata.cloud_provider as string) || '-'
        const style = providerStyles[provider || ''] || providerStyles.aws
        return (
          <Badge className={`${style.bg} ${style.text} border-0 uppercase font-semibold`}>
            {provider}
          </Badge>
        )
      },
    },
    {
      accessorKey: 'metadata.region',
      header: 'Region',
      cell: ({ row }) => (
        <span className="flex items-center gap-1 text-sm">
          <MapPin className="h-3 w-3 text-muted-foreground" />
          {(row.original.metadata.region as string) || '-'}
        </span>
      ),
    },
    {
      accessorKey: 'metadata.resource_type',
      header: 'Type',
      cell: ({ row }) => (
        <Badge variant="outline">{(row.original.metadata.resource_type as string) || '-'}</Badge>
      ),
    },
  ],

  formFields: [
    {
      name: 'name',
      label: 'Resource Name',
      type: 'text',
      placeholder: 'e.g., aws-prod-ec2-main',
      required: true,
    },
    {
      name: 'description',
      label: 'Description',
      type: 'textarea',
      placeholder: 'Optional description',
    },
    {
      name: 'cloud_provider',
      label: 'Cloud Provider',
      type: 'select',
      isMetadata: true,
      required: true,
      defaultValue: 'aws',
      options: [
        { label: 'AWS', value: 'aws' },
        { label: 'GCP', value: 'gcp' },
        { label: 'Azure', value: 'azure' },
      ],
    },
    {
      name: 'region',
      label: 'Region',
      type: 'select',
      isMetadata: true,
      required: true,
      options: allRegions,
    },
    {
      name: 'resource_type',
      label: 'Resource Type',
      type: 'select',
      isMetadata: true,
      required: true,
      options: allResourceTypes,
    },
    {
      name: 'tags',
      label: 'Tags',
      type: 'tags',
      placeholder: 'production, critical, database',
    },
  ],

  statsCards: [
    {
      title: 'Active',
      icon: CheckCircle,
      compute: (_assets, stats) => stats.byStatus?.active ?? 0,
      variant: 'success',
    },
    {
      title: 'With Findings',
      icon: AlertTriangle,
      compute: (_assets, stats) => stats.withFindings,
      variant: 'warning',
    },
  ],

  customFilter: {
    label: 'Provider',
    options: [
      { label: 'AWS', value: 'aws' },
      { label: 'GCP', value: 'gcp' },
      { label: 'Azure', value: 'azure' },
    ],
    filterFn: (asset: Asset, value: string) => (asset.metadata.cloud_provider as string) === value,
  },

  detailStats: [
    {
      icon: Cloud,
      iconBg: 'bg-sky-500/10',
      iconColor: 'text-sky-500',
      label: 'Provider',
      getValue: (asset: Asset) => (asset.metadata.cloud_provider as string)?.toUpperCase() || '-',
    },
    {
      icon: Shield,
      iconBg: 'bg-orange-500/10',
      iconColor: 'text-orange-500',
      label: 'Risk',
      getValue: (asset: Asset) => asset.riskScore,
    },
    {
      icon: AlertTriangle,
      iconBg: 'bg-red-500/10',
      iconColor: 'text-red-500',
      label: 'Findings',
      getValue: (asset: Asset) => asset.findingCount,
    },
  ],

  detailSections: [
    {
      title: 'Resource Information',
      fields: [
        {
          label: 'Provider',
          getValue: (asset: Asset) => {
            const provider = (asset.metadata.cloud_provider as string) || '-'
            const style = providerStyles[provider || ''] || providerStyles.aws
            return (
              <Badge className={`${style.bg} ${style.text} border-0 uppercase font-semibold`}>
                {provider}
              </Badge>
            )
          },
        },
        {
          label: 'Region',
          getValue: (asset: Asset) => (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {(asset.metadata.region as string) || '-'}
            </span>
          ),
        },
        {
          label: 'Resource Type',
          getValue: (asset: Asset) => (
            <Badge variant="outline">{(asset.metadata.resource_type as string) || '-'}</Badge>
          ),
        },
      ],
    },
  ],

  exportFields: [
    { header: 'Name', accessor: (a: Asset) => a.name },
    { header: 'Provider', accessor: (a: Asset) => (a.metadata.cloud_provider as string) || '' },
    { header: 'Region', accessor: (a: Asset) => (a.metadata.region as string) || '' },
    { header: 'Type', accessor: (a: Asset) => (a.metadata.resource_type as string) || '' },
    { header: 'Status', accessor: (a: Asset) => a.status },
    { header: 'Risk Score', accessor: (a: Asset) => a.riskScore },
    { header: 'Findings', accessor: (a: Asset) => a.findingCount },
  ],

  includeGroupSelect: true,
}
