'use client'

import { Badge } from '@/components/ui/badge'
import { Server, CheckCircle, Play, AlertTriangle, Shield, Cloud } from 'lucide-react'
import type { AssetPageConfig } from '@/features/assets/types/page-config.types'

const providerConfig: Record<string, { label: string; color: string }> = {
  aws: { label: 'AWS EC2', color: 'bg-orange-500/10 text-orange-500' },
  gcp: { label: 'GCP GCE', color: 'bg-blue-500/10 text-blue-500' },
  azure: { label: 'Azure VM', color: 'bg-cyan-500/10 text-cyan-500' },
}

const stateConfig: Record<string, { label: string; color: string; icon: typeof Play }> = {
  running: { label: 'Running', color: 'text-green-500 bg-green-500/10', icon: Play },
  stopped: { label: 'Stopped', color: 'text-gray-500 bg-gray-500/10', icon: Server },
  pending: { label: 'Pending', color: 'text-yellow-500 bg-yellow-500/10', icon: Server },
  terminated: { label: 'Terminated', color: 'text-red-500 bg-red-500/10', icon: Server },
}

export const computeConfig: AssetPageConfig = {
  type: 'compute',
  label: 'Compute Instance',
  labelPlural: 'Compute',
  description: 'Manage compute instances across cloud providers',
  icon: Server,
  iconColor: 'text-orange-500',
  gradientFrom: 'from-orange-500/20',
  gradientVia: 'via-orange-500/10',

  columns: [
    {
      accessorKey: 'metadata.cloudProvider',
      header: 'Provider',
      cell: ({ row }) => {
        const provider = providerConfig[row.original.metadata.cloudProvider as string] || {
          label: row.original.metadata.cloudProvider,
          color: '',
        }
        return (
          <Badge variant="secondary" className={provider.color}>
            {provider.label}
          </Badge>
        )
      },
    },
    {
      accessorKey: 'metadata.instanceType',
      header: 'Type',
      cell: ({ row }) => (
        <span className="text-sm font-mono">
          {(row.original.metadata.instanceType as string) || '-'}
        </span>
      ),
    },
    {
      accessorKey: 'metadata.instanceState',
      header: 'State',
      cell: ({ row }) => {
        const stateKey = (row.original.metadata.instanceState as string) || 'pending'
        const state = stateConfig[stateKey] || stateConfig.pending
        const Icon = state.icon
        return (
          <Badge variant="secondary" className={state.color}>
            <Icon className="h-3 w-3 mr-1" />
            {state.label}
          </Badge>
        )
      },
    },
    {
      accessorKey: 'metadata.region',
      header: 'Region',
      cell: ({ row }) => (
        <div>
          <p className="text-sm">{(row.original.metadata.region as string) || '-'}</p>
          <p className="text-xs text-muted-foreground">
            {(row.original.metadata.availabilityZone as string) || ''}
          </p>
        </div>
      ),
    },
  ],

  formFields: [
    {
      name: 'name',
      label: 'Instance Name',
      type: 'text',
      placeholder: 'e.g., prod-web-server-01',
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
      label: 'Provider',
      type: 'select',
      isMetadata: true,
      defaultValue: 'aws',
      options: [
        { label: 'AWS', value: 'aws' },
        { label: 'GCP', value: 'gcp' },
        { label: 'Azure', value: 'azure' },
      ],
    },
    {
      name: 'instanceId',
      label: 'Instance ID',
      type: 'text',
      placeholder: 'e.g., i-0a1b2c3d4e5f',
      isMetadata: true,
    },
    {
      name: 'instanceType',
      label: 'Instance Type',
      type: 'text',
      placeholder: 'e.g., t3.large',
      isMetadata: true,
    },
    {
      name: 'instanceState',
      label: 'State',
      type: 'select',
      isMetadata: true,
      defaultValue: 'running',
      options: [
        { label: 'Running', value: 'running' },
        { label: 'Stopped', value: 'stopped' },
        { label: 'Pending', value: 'pending' },
        { label: 'Terminated', value: 'terminated' },
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
      name: 'availabilityZone',
      label: 'Availability Zone',
      type: 'text',
      placeholder: 'e.g., us-east-1a',
      isMetadata: true,
    },
    {
      name: 'privateIp',
      label: 'Private IP',
      type: 'text',
      placeholder: '10.0.1.100',
      isMetadata: true,
    },
    {
      name: 'publicIp',
      label: 'Public IP',
      type: 'text',
      placeholder: '54.123.45.67',
      isMetadata: true,
    },
    { name: 'vpcId', label: 'VPC ID', type: 'text', placeholder: 'vpc-12345678', isMetadata: true },
    {
      name: 'os',
      label: 'Operating System',
      type: 'text',
      placeholder: 'e.g., Ubuntu 22.04 LTS',
      isMetadata: true,
    },
    { name: 'tags', label: 'Tags', type: 'tags', placeholder: 'production, web' },
  ],

  statsCards: [
    {
      title: 'Active',
      icon: CheckCircle,
      compute: (assets) => assets.filter((a) => a.status === 'active').length,
      variant: 'success',
    },
    {
      title: 'Running',
      icon: Play,
      compute: (assets) =>
        assets.filter((a) => (a.metadata.instanceState as string) === 'running').length,
    },
    {
      title: 'With Findings',
      icon: AlertTriangle,
      compute: (assets) => assets.filter((a) => a.findingCount > 0).length,
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
    filterFn: (asset, value) => asset.metadata.cloudProvider?.toLowerCase() === value,
  },

  copyAction: {
    label: 'Copy Instance ID',
    getValue: (asset) => (asset.metadata.instanceId as string) || asset.name,
  },

  detailStats: [
    {
      icon: Cloud,
      iconBg: 'bg-orange-500/10',
      iconColor: 'text-orange-500',
      label: 'Provider',
      getValue: (asset) => {
        const key = (asset.metadata.cloudProvider as string) || ''
        return providerConfig[key]?.label || key || '-'
      },
    },
    {
      icon: Shield,
      iconBg: 'bg-blue-500/10',
      iconColor: 'text-blue-500',
      label: 'Risk',
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
      title: 'Instance Information',
      fields: [
        {
          label: 'Instance ID',
          getValue: (asset) => (
            <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
              {(asset.metadata.instanceId as string) || '-'}
            </code>
          ),
        },
        {
          label: 'Instance Type',
          getValue: (asset) => (
            <span className="font-mono text-sm">
              {(asset.metadata.instanceType as string) || '-'}
            </span>
          ),
        },
        {
          label: 'Provider',
          getValue: (asset) => {
            const key = (asset.metadata.cloudProvider as string) || ''
            const provider = providerConfig[key]
            if (!provider) return '-'
            return (
              <Badge variant="secondary" className={provider.color}>
                {provider.label}
              </Badge>
            )
          },
        },
        {
          label: 'State',
          getValue: (asset) => {
            const stateKey = (asset.metadata.instanceState as string) || 'pending'
            const state = stateConfig[stateKey] || stateConfig.pending
            return (
              <Badge variant="secondary" className={state.color}>
                {state.label}
              </Badge>
            )
          },
        },
        {
          label: 'Operating System',
          getValue: (asset) => (asset.metadata.os as string) || '-',
        },
        {
          label: 'VPC ID',
          getValue: (asset) => (
            <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
              {(asset.metadata.vpcId as string) || '-'}
            </code>
          ),
        },
      ],
    },
    {
      title: 'Network',
      fields: [
        {
          label: 'Region',
          getValue: (asset) => (asset.metadata.region as string) || '-',
        },
        {
          label: 'Availability Zone',
          getValue: (asset) => (asset.metadata.availabilityZone as string) || '-',
        },
        {
          label: 'Private IP',
          getValue: (asset) => (
            <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
              {(asset.metadata.privateIp as string) || '-'}
            </code>
          ),
        },
        {
          label: 'Public IP',
          getValue: (asset) => {
            const ip = asset.metadata.publicIp as string
            if (!ip) return <span className="text-muted-foreground">None</span>
            return <code className="text-xs bg-muted px-2 py-1 rounded font-mono">{ip}</code>
          },
        },
      ],
    },
  ],

  exportFields: [
    { header: 'Name', accessor: (a) => a.name },
    { header: 'Instance ID', accessor: (a) => a.metadata.instanceId || '' },
    { header: 'Provider', accessor: (a) => a.metadata.cloudProvider || '' },
    { header: 'Instance Type', accessor: (a) => a.metadata.instanceType || '' },
    { header: 'State', accessor: (a) => a.metadata.instanceState || '' },
    { header: 'Region', accessor: (a) => a.metadata.region || '' },
    { header: 'Private IP', accessor: (a) => a.metadata.privateIp || '' },
    { header: 'Public IP', accessor: (a) => a.metadata.publicIp || '' },
    { header: 'OS', accessor: (a) => a.metadata.os || '' },
    { header: 'Status', accessor: (a) => a.status },
    { header: 'Risk Score', accessor: (a) => a.riskScore },
    { header: 'Findings', accessor: (a) => a.findingCount },
  ],

  includeGroupSelect: true,
}
