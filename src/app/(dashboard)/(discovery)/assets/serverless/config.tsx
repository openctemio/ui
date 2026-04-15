'use client'

import { Badge } from '@/components/ui/badge'
import { Cpu, CheckCircle, AlertTriangle, Shield, Zap, Network } from 'lucide-react'
import type { AssetPageConfig } from '@/features/assets/types/page-config.types'
import { toStringArray } from '@/features/assets/lib/property-utils'

const runtimeColors: Record<string, string> = {
  nodejs: 'bg-green-500/10 text-green-500',
  python: 'bg-blue-500/10 text-blue-500',
  java: 'bg-orange-500/10 text-orange-500',
  dotnet: 'bg-purple-500/10 text-purple-500',
  go: 'bg-cyan-500/10 text-cyan-500',
}

const providerColors: Record<string, string> = {
  aws: 'bg-orange-500/10 text-orange-500',
  gcp: 'bg-blue-500/10 text-blue-500',
  azure: 'bg-cyan-500/10 text-cyan-500',
}

const getRuntimeCategory = (runtime: string): string => {
  const r = runtime.toLowerCase()
  if (r.includes('node')) return 'nodejs'
  if (r.includes('python')) return 'python'
  if (r.includes('java')) return 'java'
  if (r.includes('dotnet') || r.includes('.net')) return 'dotnet'
  if (r.includes('go')) return 'go'
  return 'nodejs'
}

export const serverlessConfig: AssetPageConfig = {
  type: 'host',
  subType: 'serverless',
  label: 'Serverless Function',
  labelPlural: 'Serverless Functions',
  description: 'Lambda functions, Cloud Functions, and Azure Functions',
  icon: Cpu,
  iconColor: 'text-violet-500',
  gradientFrom: 'from-violet-500/20',
  gradientVia: 'via-violet-500/10',

  columns: [
    {
      accessorKey: 'metadata.function_runtime',
      header: 'Runtime',
      cell: ({ row }) => {
        const runtime = (row.original.metadata.function_runtime as string) || ''
        const category = getRuntimeCategory(runtime)
        return (
          <Badge variant="secondary" className={runtimeColors[category]}>
            {runtime}
          </Badge>
        )
      },
    },
    {
      accessorKey: 'metadata.cloud_provider',
      header: 'Provider',
      cell: ({ row }) => {
        const provider = (row.original.metadata.cloud_provider as string) || 'aws'
        return (
          <Badge variant="secondary" className={providerColors[provider]}>
            {provider.toUpperCase()}
          </Badge>
        )
      },
    },
    {
      accessorKey: 'metadata.function_memory',
      header: 'Memory',
      cell: ({ row }) => {
        const memory = row.original.metadata.function_memory
        return <span className="text-sm">{memory ? `${memory} MB` : '-'}</span>
      },
    },
    {
      accessorKey: 'metadata.function_timeout',
      header: 'Timeout',
      cell: ({ row }) => {
        const timeout = row.original.metadata.function_timeout
        return <span className="text-sm">{timeout ? `${timeout}s` : '-'}</span>
      },
    },
  ],

  formFields: [
    {
      name: 'name',
      label: 'Function Name',
      type: 'text',
      placeholder: 'e.g., my-lambda-function',
      required: true,
    },
    {
      name: 'description',
      label: 'Description',
      type: 'textarea',
      placeholder: 'Optional description',
    },
    {
      name: 'function_runtime',
      label: 'Runtime',
      type: 'text',
      placeholder: 'e.g., nodejs18.x',
      isMetadata: true,
    },
    {
      name: 'function_handler',
      label: 'Handler',
      type: 'text',
      placeholder: 'e.g., index.handler',
      isMetadata: true,
    },
    {
      name: 'function_memory',
      label: 'Memory (MB)',
      type: 'number',
      placeholder: '128',
      isMetadata: true,
    },
    {
      name: 'function_timeout',
      label: 'Timeout (s)',
      type: 'number',
      placeholder: '30',
      isMetadata: true,
    },
    {
      name: 'cloud_provider',
      label: 'Cloud Provider',
      type: 'select',
      isMetadata: true,
      defaultValue: 'aws',
      options: [
        { label: 'AWS Lambda', value: 'aws' },
        { label: 'GCP Functions', value: 'gcp' },
        { label: 'Azure Functions', value: 'azure' },
      ],
    },
    {
      name: 'region',
      label: 'Region',
      type: 'text',
      placeholder: 'e.g., us-east-1',
      isMetadata: true,
    },
    {
      name: 'function_vpc_enabled',
      label: 'VPC Enabled',
      type: 'boolean',
      isMetadata: true,
      defaultValue: false,
    },
    { name: 'tags', label: 'Tags', type: 'tags', placeholder: 'production, critical' },
  ],

  countBy: ['function_vpc_enabled'],

  statsCards: [
    {
      title: 'Active',
      icon: CheckCircle,
      compute: (_assets, stats) => stats.byStatus.active ?? 0,
      variant: 'success',
    },
    {
      title: 'VPC Enabled',
      icon: Network,
      compute: (_assets, stats) => stats.metadataCounts?.function_vpc_enabled?.true ?? 0,
    },
    {
      title: 'With Findings',
      icon: AlertTriangle,
      compute: (_assets, stats) => stats.withFindings,
      variant: 'warning',
    },
  ],

  customFilter: {
    label: 'Runtime',
    options: [
      { label: 'Node.js', value: 'nodejs' },
      { label: 'Python', value: 'python' },
      { label: 'Java', value: 'java' },
      { label: '.NET', value: 'dotnet' },
      { label: 'Go', value: 'go' },
    ],
    filterFn: (asset, value) => {
      const runtime = (asset.metadata.function_runtime as string) || ''
      return getRuntimeCategory(runtime) === value
    },
  },

  copyAction: {
    label: 'Copy ARN',
    getValue: (asset) =>
      `arn:${asset.metadata.cloud_provider}:lambda:${asset.metadata.region}:${asset.metadata.function_name}`,
  },

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
  ],

  detailSections: [
    {
      title: 'Function Configuration',
      fields: [
        {
          label: 'Runtime',
          getValue: (asset) => {
            const runtime = (asset.metadata.function_runtime as string) || ''
            if (!runtime) return '-'
            const category = getRuntimeCategory(runtime)
            return (
              <Badge variant="secondary" className={runtimeColors[category]}>
                {runtime}
              </Badge>
            )
          },
        },
        {
          label: 'Handler',
          getValue: (asset) => (
            <span className="font-mono text-xs">
              {(asset.metadata.function_handler as string) || '-'}
            </span>
          ),
        },
        {
          label: 'Memory',
          getValue: (asset) =>
            asset.metadata.function_memory ? `${asset.metadata.function_memory} MB` : '-',
        },
        {
          label: 'Timeout',
          getValue: (asset) =>
            asset.metadata.function_timeout ? `${asset.metadata.function_timeout}s` : '-',
        },
        {
          label: 'Code Size',
          getValue: (asset) =>
            asset.metadata.function_code_size
              ? `${((asset.metadata.function_code_size as number) / 1024).toFixed(1)} MB`
              : '-',
        },
        {
          label: 'Environment Variables',
          getValue: (asset) => String(asset.metadata.function_env_vars || 0),
        },
      ],
    },
    {
      title: 'Cloud and Network',
      fields: [
        {
          label: 'Provider',
          getValue: (asset) => {
            const provider = (asset.metadata.cloud_provider as string) || ''
            if (!provider) return '-'
            return (
              <Badge variant="secondary" className={providerColors[provider]}>
                {provider.toUpperCase()}
              </Badge>
            )
          },
        },
        {
          label: 'VPC',
          getValue: (asset) => (
            <Badge variant={asset.metadata.function_vpc_enabled ? 'default' : 'secondary'}>
              {asset.metadata.function_vpc_enabled ? 'Enabled' : 'Disabled'}
            </Badge>
          ),
        },
        {
          label: 'Region',
          getValue: (asset) => (asset.metadata.region as string) || '-',
        },
      ],
    },
    {
      title: 'Triggers',
      fields: [
        {
          label: 'Triggers',
          fullWidth: true,
          getValue: (asset) => {
            const raw = asset.metadata.function_triggers
            const triggers = toStringArray(raw)
            if (triggers.length === 0) return '-'
            return (
              <div className="flex flex-wrap gap-1">
                {triggers.map((trigger, i) => (
                  <Badge key={i} variant="outline" className="gap-1">
                    <Zap className="h-3 w-3" />
                    {trigger}
                  </Badge>
                ))}
              </div>
            )
          },
        },
      ],
    },
    {
      title: 'Layers',
      fields: [
        {
          label: 'Layers',
          fullWidth: true,
          getValue: (asset) => {
            const raw = asset.metadata.function_layers
            const layers = toStringArray(raw)
            if (layers.length === 0) return '-'
            return (
              <div className="flex flex-wrap gap-1">
                {layers.map((layer, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">
                    {layer}
                  </Badge>
                ))}
              </div>
            )
          },
        },
      ],
    },
  ],

  exportFields: [
    { header: 'Name', accessor: (a) => a.name },
    { header: 'Runtime', accessor: (a) => (a.metadata.function_runtime as string) || '' },
    { header: 'Provider', accessor: (a) => (a.metadata.cloud_provider as string) || '' },
    { header: 'Memory (MB)', accessor: (a) => (a.metadata.function_memory as number) || '' },
    { header: 'Timeout (s)', accessor: (a) => (a.metadata.function_timeout as number) || '' },
    { header: 'VPC Enabled', accessor: (a) => (a.metadata.function_vpc_enabled ? 'Yes' : 'No') },
    { header: 'Status', accessor: (a) => a.status },
    { header: 'Risk Score', accessor: (a) => a.riskScore },
    { header: 'Findings', accessor: (a) => a.findingCount },
  ],

  includeGroupSelect: true,
}
