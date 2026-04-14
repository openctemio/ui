'use client'

import { Badge } from '@/components/ui/badge'
import { HardDrive, Globe, Lock, Database, AlertTriangle, Shield, RefreshCw } from 'lucide-react'
import type { Asset } from '@/features/assets'
import type { AssetPageConfig } from '@/features/assets/types/page-config.types'

const providerStyles: Record<string, { bg: string; text: string }> = {
  aws: {
    bg: 'bg-orange-100 dark:bg-orange-900/30',
    text: 'text-orange-700 dark:text-orange-300',
  },
  gcp: {
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    text: 'text-blue-700 dark:text-blue-300',
  },
  azure: {
    bg: 'bg-cyan-100 dark:bg-cyan-900/30',
    text: 'text-cyan-700 dark:text-cyan-300',
  },
}

const providerLabels: Record<string, string> = {
  aws: 'S3',
  gcp: 'GCS',
  azure: 'Blob',
}

export const storageConfig: AssetPageConfig = {
  type: 'storage',
  label: 'Storage Bucket',
  labelPlural: 'Storage Buckets',
  description: 'S3 buckets, Azure Blobs, and GCS buckets',
  icon: HardDrive,
  iconColor: 'text-purple-500',
  gradientFrom: 'from-purple-500/20',
  gradientVia: 'via-purple-500/10',

  columns: [
    {
      accessorKey: 'metadata.cloud_provider',
      header: 'Provider',
      cell: ({ row }) => {
        const provider = row.original.metadata.cloud_provider as string
        const style = providerStyles[provider || ''] || providerStyles.aws
        const label = providerLabels[provider || ''] || provider
        return <Badge className={`${style.bg} ${style.text} border-0 font-semibold`}>{label}</Badge>
      },
    },
    {
      accessorKey: 'metadata.region',
      header: 'Region',
      cell: ({ row }) => (
        <span className="text-sm">{(row.original.metadata.region as string) || '-'}</span>
      ),
    },
    {
      accessorKey: 'metadata.total_size_gb',
      header: 'Size',
      cell: ({ row }) => {
        const size = row.original.metadata.total_size_gb as number
        if (!size) return <span className="text-muted-foreground">-</span>
        return (
          <span className="text-sm font-medium">
            {size >= 1000 ? `${(size / 1000).toFixed(1)} TB` : `${size} GB`}
          </span>
        )
      },
    },
    {
      accessorKey: 'metadata.is_publicly_accessible',
      header: 'Security',
      cell: ({ row }) => {
        const isPublic = row.original.metadata.is_publicly_accessible as boolean
        const encrypted = row.original.metadata.encryption_enabled as boolean
        return (
          <div className="flex items-center gap-1">
            {isPublic ? (
              <Badge variant="destructive" className="text-xs gap-1">
                <Globe className="h-3 w-3" />
                Public
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-xs gap-1">
                <Lock className="h-3 w-3" />
                Private
              </Badge>
            )}
            {encrypted && (
              <Badge variant="outline" className="text-xs">
                Encrypted
              </Badge>
            )}
          </div>
        )
      },
    },
  ],

  countBy: ['is_publicly_accessible', 'encryption_enabled'],

  statsCards: [
    {
      title: 'Public',
      icon: Globe,
      compute: (_assets, stats) => stats.metadataCounts?.is_publicly_accessible?.true ?? 0,
      variant: 'danger',
    },
    {
      title: 'Encrypted',
      icon: Lock,
      compute: (_assets, stats) => stats.metadataCounts?.encryption_enabled?.true ?? 0,
      variant: 'success',
    },
    {
      title: 'With Findings',
      icon: AlertTriangle,
      compute: (_assets, stats) => stats.withFindings,
      variant: 'warning',
    },
  ],

  formFields: [
    {
      name: 'name',
      label: 'Bucket Name',
      type: 'text',
      placeholder: 'e.g., prod-assets-bucket',
      required: true,
    },
    {
      name: 'description',
      label: 'Description',
      type: 'textarea',
      placeholder: 'Optional description',
      fullWidth: true,
    },
    {
      name: 'cloud_provider',
      label: 'Cloud Provider',
      type: 'select',
      isMetadata: true,
      required: true,
      defaultValue: 'aws',
      options: [
        { label: 'AWS (S3)', value: 'aws' },
        { label: 'GCP (GCS)', value: 'gcp' },
        { label: 'Azure (Blob)', value: 'azure' },
      ],
    },
    {
      name: 'region',
      label: 'Region',
      type: 'text',
      placeholder: 'us-east-1',
      isMetadata: true,
      required: true,
    },
    {
      name: 'total_size_gb',
      label: 'Size (GB)',
      type: 'number',
      placeholder: '1250',
      isMetadata: true,
    },
    {
      name: 'object_count',
      label: 'Object Count',
      type: 'number',
      placeholder: '45000',
      isMetadata: true,
    },
    {
      name: 'is_publicly_accessible',
      label: 'Publicly Accessible',
      type: 'boolean',
      isMetadata: true,
      defaultValue: false,
    },
    {
      name: 'encryption_enabled',
      label: 'Encryption Enabled',
      type: 'boolean',
      isMetadata: true,
      defaultValue: false,
    },
    {
      name: 'versioning_enabled',
      label: 'Versioning Enabled',
      type: 'boolean',
      isMetadata: true,
      defaultValue: false,
    },
    {
      name: 'tags',
      label: 'Tags',
      type: 'tags',
      placeholder: 'production, backup, cdn',
      fullWidth: true,
    },
  ],

  includeGroupSelect: true,

  detailStats: [
    {
      icon: Shield,
      iconBg: 'bg-orange-500/10',
      iconColor: 'text-orange-500',
      label: 'Risk Score',
      getValue: (asset) => asset.riskScore,
    },
    {
      icon: AlertTriangle,
      iconBg: 'bg-red-500/10',
      iconColor: 'text-red-500',
      label: 'Findings',
      getValue: (asset) => asset.findingCount,
    },
    {
      icon: Database,
      iconBg: 'bg-blue-500/10',
      iconColor: 'text-blue-500',
      label: 'Objects',
      getValue: (asset) => {
        const count = asset.metadata.object_count as number
        return count ? count.toLocaleString() : '-'
      },
    },
  ],

  detailSections: [
    {
      title: 'Storage Information',
      fields: [
        {
          label: 'Provider',
          getValue: (asset) => {
            const provider = asset.metadata.cloud_provider as string
            const style = providerStyles[provider || ''] || providerStyles.aws
            const label = providerLabels[provider || ''] || provider
            return (
              <Badge className={`${style.bg} ${style.text} border-0 font-semibold`}>{label}</Badge>
            )
          },
        },
        {
          label: 'Region',
          getValue: (asset) => (asset.metadata.region as string) || '-',
        },
        {
          label: 'Size',
          getValue: (asset) => {
            const size = asset.metadata.total_size_gb as number
            if (!size) return '-'
            return size >= 1000 ? `${(size / 1000).toFixed(1)} TB` : `${size} GB`
          },
        },
        {
          label: 'Object Count',
          getValue: (asset) => {
            const count = asset.metadata.object_count as number
            return count ? count.toLocaleString() : '-'
          },
        },
      ],
    },
    {
      title: 'Security & Configuration',
      fields: [
        {
          label: 'Access',
          getValue: (asset) => {
            const isPublic = asset.metadata.is_publicly_accessible as boolean
            return isPublic ? (
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-yellow-500" />
                <span>Public</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-green-500" />
                <span>Private</span>
              </div>
            )
          },
        },
        {
          label: 'Encryption',
          getValue: (asset) => (
            <div className="flex items-center gap-2">
              <Lock
                className={`h-4 w-4 ${asset.metadata.encryption_enabled ? 'text-green-500' : 'text-muted-foreground'}`}
              />
              <span>{asset.metadata.encryption_enabled ? 'Encrypted' : 'Not Encrypted'}</span>
            </div>
          ),
        },
        {
          label: 'Versioning',
          getValue: (asset) => (
            <div className="flex items-center gap-2">
              <RefreshCw
                className={`h-4 w-4 ${asset.metadata.versioning_enabled ? 'text-blue-500' : 'text-muted-foreground'}`}
              />
              <span>{asset.metadata.versioning_enabled ? 'Enabled' : 'Disabled'}</span>
            </div>
          ),
        },
      ],
    },
  ],

  copyAction: {
    label: 'Copy Bucket Name',
    getValue: (asset) => asset.name,
  },

  exportFields: [
    { header: 'Name', accessor: (a: Asset) => a.name },
    { header: 'Provider', accessor: (a: Asset) => (a.metadata.cloud_provider as string) || '' },
    { header: 'Region', accessor: (a: Asset) => (a.metadata.region as string) || '' },
    {
      header: 'Size (GB)',
      accessor: (a: Asset) => String(a.metadata.total_size_gb ?? ''),
    },
    {
      header: 'Objects',
      accessor: (a: Asset) => String(a.metadata.object_count ?? ''),
    },
    {
      header: 'Public',
      accessor: (a: Asset) => a.metadata.is_publicly_accessible,
      transform: (v: unknown) => (v ? 'Yes' : 'No'),
    },
    {
      header: 'Encrypted',
      accessor: (a: Asset) => a.metadata.encryption_enabled,
      transform: (v: unknown) => (v ? 'Yes' : 'No'),
    },
    {
      header: 'Versioning',
      accessor: (a: Asset) => a.metadata.versioning_enabled,
      transform: (v: unknown) => (v ? 'Yes' : 'No'),
    },
    { header: 'Status', accessor: (a: Asset) => a.status },
    { header: 'Risk Score', accessor: (a: Asset) => a.riskScore },
    { header: 'Findings', accessor: (a: Asset) => a.findingCount },
  ],

  customFilter: {
    label: 'Provider',
    options: [
      { label: 'AWS (S3)', value: 'aws' },
      { label: 'GCP (GCS)', value: 'gcp' },
      { label: 'Azure (Blob)', value: 'azure' },
    ],
    filterFn: (asset, value) => (asset.metadata.cloud_provider as string) === value,
  },
}
