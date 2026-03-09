'use client'

import { Badge } from '@/components/ui/badge'
import { Cloud, MapPin, AlertTriangle, Shield } from 'lucide-react'
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
  type: 'compute',
  types: ['compute', 'storage', 'serverless'],
  label: 'Cloud Asset',
  labelPlural: 'Cloud Assets',
  description: 'Manage your cloud infrastructure resources across AWS, GCP, and Azure',
  icon: Cloud,
  iconColor: 'text-sky-500',
  gradientFrom: 'from-sky-500/20',
  gradientVia: 'via-sky-500/10',

  columns: [
    {
      accessorKey: 'metadata.cloudProvider',
      header: 'Provider',
      cell: ({ row }) => {
        const provider = row.original.metadata.cloudProvider as string
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
          {row.original.metadata.region as string}
        </span>
      ),
    },
    {
      accessorKey: 'metadata.resourceType',
      header: 'Type',
      cell: ({ row }) => (
        <Badge variant="outline">{row.original.metadata.resourceType as string}</Badge>
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
      name: 'cloudProvider',
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
      name: 'resourceType',
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
      title: 'AWS',
      icon: Cloud,
      compute: (assets: Asset[]) =>
        assets.filter((a) => (a.metadata.cloudProvider as string) === 'aws').length,
    },
    {
      title: 'GCP',
      icon: Cloud,
      compute: (assets: Asset[]) =>
        assets.filter((a) => (a.metadata.cloudProvider as string) === 'gcp').length,
    },
    {
      title: 'Azure',
      icon: Cloud,
      compute: (assets: Asset[]) =>
        assets.filter((a) => (a.metadata.cloudProvider as string) === 'azure').length,
    },
    {
      title: 'With Findings',
      icon: AlertTriangle,
      compute: (assets: Asset[]) => assets.filter((a) => a.findingCount > 0).length,
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
    filterFn: (asset: Asset, value: string) => (asset.metadata.cloudProvider as string) === value,
  },

  detailStats: [
    {
      icon: Cloud,
      iconBg: 'bg-sky-500/10',
      iconColor: 'text-sky-500',
      label: 'Provider',
      getValue: (asset: Asset) => (asset.metadata.cloudProvider as string)?.toUpperCase() || '-',
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
            const provider = asset.metadata.cloudProvider as string
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
              {asset.metadata.region as string}
            </span>
          ),
        },
        {
          label: 'Resource Type',
          getValue: (asset: Asset) => (
            <Badge variant="outline">{asset.metadata.resourceType as string}</Badge>
          ),
        },
      ],
    },
  ],

  exportFields: [
    { header: 'Name', accessor: (a: Asset) => a.name },
    { header: 'Provider', accessor: (a: Asset) => a.metadata.cloudProvider || '' },
    { header: 'Region', accessor: (a: Asset) => a.metadata.region || '' },
    { header: 'Type', accessor: (a: Asset) => a.metadata.resourceType || '' },
    { header: 'Status', accessor: (a: Asset) => a.status },
    { header: 'Risk Score', accessor: (a: Asset) => a.riskScore },
    { header: 'Findings', accessor: (a: Asset) => a.findingCount },
  ],

  includeGroupSelect: true,
}
