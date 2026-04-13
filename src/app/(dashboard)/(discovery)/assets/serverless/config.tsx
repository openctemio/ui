'use client'

import { Badge } from '@/components/ui/badge'
import { Cpu, Network, CheckCircle, AlertTriangle, Shield, Zap } from 'lucide-react'
import type { AssetPageConfig } from '@/features/assets/types/page-config.types'

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
      accessorKey: 'metadata.functionRuntime',
      header: 'Runtime',
      cell: ({ row }) => {
        const runtime = (row.original.metadata.functionRuntime as string) || ''
        const category = getRuntimeCategory(runtime)
        return (
          <Badge variant="secondary" className={runtimeColors[category]}>
            {runtime}
          </Badge>
        )
      },
    },
    {
      accessorKey: 'metadata.cloudProvider',
      header: 'Provider',
      cell: ({ row }) => {
        const provider = (row.original.metadata.cloudProvider as string) || 'aws'
        return (
          <Badge variant="secondary" className={providerColors[provider]}>
            {provider.toUpperCase()}
          </Badge>
        )
      },
    },
    {
      accessorKey: 'metadata.functionMemory',
      header: 'Memory',
      cell: ({ row }) => {
        const memory = row.original.metadata.functionMemory
        return <span className="text-sm">{memory ? `${memory} MB` : '-'}</span>
      },
    },
    {
      accessorKey: 'metadata.functionTimeout',
      header: 'Timeout',
      cell: ({ row }) => {
        const timeout = row.original.metadata.functionTimeout
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
      name: 'functionRuntime',
      label: 'Runtime',
      type: 'text',
      placeholder: 'e.g., nodejs18.x',
      isMetadata: true,
    },
    {
      name: 'functionHandler',
      label: 'Handler',
      type: 'text',
      placeholder: 'e.g., index.handler',
      isMetadata: true,
    },
    {
      name: 'functionMemory',
      label: 'Memory (MB)',
      type: 'number',
      placeholder: '128',
      isMetadata: true,
    },
    {
      name: 'functionTimeout',
      label: 'Timeout (s)',
      type: 'number',
      placeholder: '30',
      isMetadata: true,
    },
    {
      name: 'cloudProvider',
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
      name: 'functionVpcEnabled',
      label: 'VPC Enabled',
      type: 'boolean',
      isMetadata: true,
      defaultValue: false,
    },
    { name: 'tags', label: 'Tags', type: 'tags', placeholder: 'production, critical' },
  ],

  statsCards: [
    {
      title: 'Active',
      icon: CheckCircle,
      compute: (_assets, stats) => stats.byStatus.active ?? 0,
      variant: 'success',
    },
    {
      // metadata.functionVpcEnabled isn't aggregated — current page only
      title: 'VPC Enabled',
      icon: Network,
      compute: (assets) => assets.filter((a) => a.metadata.functionVpcEnabled).length,
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
      const runtime = (asset.metadata.functionRuntime as string) || ''
      return getRuntimeCategory(runtime) === value
    },
  },

  copyAction: {
    label: 'Copy ARN',
    getValue: (asset) =>
      `arn:${asset.metadata.cloudProvider}:lambda:${asset.metadata.region}:${asset.metadata.functionName}`,
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
            const runtime = (asset.metadata.functionRuntime as string) || ''
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
              {(asset.metadata.functionHandler as string) || '-'}
            </span>
          ),
        },
        {
          label: 'Memory',
          getValue: (asset) =>
            asset.metadata.functionMemory ? `${asset.metadata.functionMemory} MB` : '-',
        },
        {
          label: 'Timeout',
          getValue: (asset) =>
            asset.metadata.functionTimeout ? `${asset.metadata.functionTimeout}s` : '-',
        },
        {
          label: 'Code Size',
          getValue: (asset) =>
            asset.metadata.functionCodeSize
              ? `${((asset.metadata.functionCodeSize as number) / 1024).toFixed(1)} MB`
              : '-',
        },
        {
          label: 'Environment Variables',
          getValue: (asset) => String(asset.metadata.functionEnvVars || 0),
        },
      ],
    },
    {
      title: 'Cloud and Network',
      fields: [
        {
          label: 'Provider',
          getValue: (asset) => {
            const provider = (asset.metadata.cloudProvider as string) || ''
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
            <Badge variant={asset.metadata.functionVpcEnabled ? 'default' : 'secondary'}>
              {asset.metadata.functionVpcEnabled ? 'Enabled' : 'Disabled'}
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
            const raw = asset.metadata.functionTriggers
            const triggers: string[] = Array.isArray(raw)
              ? raw
              : raw
                ? String(raw)
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean)
                : []
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
            const raw = asset.metadata.functionLayers
            const layers: string[] = Array.isArray(raw)
              ? raw
              : raw
                ? String(raw)
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean)
                : []
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
    { header: 'Runtime', accessor: (a) => a.metadata.functionRuntime || '' },
    { header: 'Provider', accessor: (a) => a.metadata.cloudProvider || '' },
    { header: 'Memory (MB)', accessor: (a) => a.metadata.functionMemory || '' },
    { header: 'Timeout (s)', accessor: (a) => a.metadata.functionTimeout || '' },
    { header: 'VPC Enabled', accessor: (a) => (a.metadata.functionVpcEnabled ? 'Yes' : 'No') },
    { header: 'Status', accessor: (a) => a.status },
    { header: 'Risk Score', accessor: (a) => a.riskScore },
    { header: 'Findings', accessor: (a) => a.findingCount },
  ],

  includeGroupSelect: true,
}
