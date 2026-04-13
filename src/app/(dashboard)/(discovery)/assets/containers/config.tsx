'use client'

import { Boxes, CheckCircle, AlertTriangle, Layers, Cpu } from 'lucide-react'
import type { AssetPageConfig } from '@/features/assets/types/page-config.types'
import type { Asset } from '@/features/assets'

/**
 * Containers & Kubernetes asset page config.
 *
 * Covers both standalone containers (Docker workloads) and full Kubernetes
 * clusters under a single sidebar entry. The previous implementation was a
 * 2,215 LOC mock-data custom page; replaced by the shared AssetPage template
 * for parity with all other asset types (tag filter, accurate counts, scope
 * coverage, etc.).
 */
export const containersConfig: AssetPageConfig = {
  type: 'container',
  types: ['container', 'kubernetes'],
  label: 'Container',
  labelPlural: 'Containers & Kubernetes',
  description: 'Container workloads and Kubernetes clusters',
  icon: Boxes,
  iconColor: 'text-blue-500',
  gradientFrom: 'from-blue-500/20',
  gradientVia: 'via-blue-500/10',

  columns: [
    {
      accessorKey: 'metadata.kind',
      header: 'Kind',
      cell: ({ row }) => {
        const subType = row.original.subType
        const t = row.original.type
        const label =
          subType === 'cluster'
            ? 'K8s Cluster'
            : subType === 'namespace'
              ? 'K8s Namespace'
              : t === 'kubernetes'
                ? 'Kubernetes'
                : 'Container'
        return <span className="text-sm">{label}</span>
      },
    },
    {
      accessorKey: 'metadata.provider',
      header: 'Provider',
      cell: ({ row }) => (
        <span className="text-sm">{(row.original.metadata.provider as string) || '-'}</span>
      ),
    },
    {
      accessorKey: 'metadata.version',
      header: 'Version',
      cell: ({ row }) => (
        <span className="text-sm">{(row.original.metadata.version as string) || '-'}</span>
      ),
    },
    {
      accessorKey: 'metadata.namespace',
      header: 'Namespace',
      cell: ({ row }) => (
        <span className="text-sm font-mono text-muted-foreground">
          {(row.original.metadata.namespace as string) || '-'}
        </span>
      ),
    },
  ],

  formFields: [
    {
      name: 'name',
      label: 'Name',
      type: 'text',
      placeholder: 'prod-cluster / nginx-pod',
      required: true,
    },
    {
      name: 'provider',
      label: 'Provider',
      type: 'select',
      isMetadata: true,
      options: [
        { label: 'EKS (AWS)', value: 'eks' },
        { label: 'GKE (GCP)', value: 'gke' },
        { label: 'AKS (Azure)', value: 'aks' },
        { label: 'Self-hosted', value: 'self-hosted' },
        { label: 'Docker', value: 'docker' },
      ],
    },
    {
      name: 'version',
      label: 'Version',
      type: 'text',
      placeholder: '1.28',
      isMetadata: true,
    },
    {
      name: 'namespace',
      label: 'Namespace',
      type: 'text',
      placeholder: 'default',
      isMetadata: true,
    },
    {
      name: 'description',
      label: 'Description',
      type: 'textarea',
      placeholder: 'Optional description',
      fullWidth: true,
    },
    { name: 'tags', label: 'Tags', type: 'tags', placeholder: 'production, eks' },
  ],

  statsCards: [
    {
      title: 'Active',
      icon: CheckCircle,
      compute: (_assets, stats) => stats.byStatus.active ?? 0,
      variant: 'success',
    },
    {
      title: 'Clusters',
      icon: Layers,
      compute: (assets) =>
        assets.filter((a) => a.type === 'kubernetes' || a.subType === 'cluster').length,
    },
    {
      title: 'With Findings',
      icon: AlertTriangle,
      compute: (_assets, stats) => stats.withFindings,
      variant: 'warning',
    },
  ],

  copyAction: {
    label: 'Copy Name',
    getValue: (asset: Asset) => asset.name,
  },

  detailStats: [
    {
      icon: Cpu,
      iconBg: 'bg-blue-500/10',
      iconColor: 'text-blue-500',
      label: 'Risk Score',
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
      title: 'Workload',
      fields: [
        {
          label: 'Provider',
          getValue: (asset: Asset) => (asset.metadata.provider as string) || '-',
        },
        {
          label: 'Version',
          getValue: (asset: Asset) => (asset.metadata.version as string) || '-',
        },
        {
          label: 'Namespace',
          getValue: (asset: Asset) => (asset.metadata.namespace as string) || '-',
        },
        {
          label: 'Image',
          getValue: (asset: Asset) => (asset.metadata.image as string) || '-',
        },
      ],
    },
  ],

  exportFields: [
    { header: 'Name', accessor: (a: Asset) => a.name },
    { header: 'Type', accessor: (a: Asset) => a.type },
    { header: 'Provider', accessor: (a: Asset) => (a.metadata.provider as string) || '' },
    { header: 'Version', accessor: (a: Asset) => (a.metadata.version as string) || '' },
    { header: 'Namespace', accessor: (a: Asset) => (a.metadata.namespace as string) || '' },
    { header: 'Status', accessor: (a: Asset) => a.status },
    { header: 'Risk Score', accessor: (a: Asset) => a.riskScore },
    { header: 'Findings', accessor: (a: Asset) => a.findingCount },
  ],

  includeGroupSelect: true,
}
