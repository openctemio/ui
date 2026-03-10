'use client'

import { Badge } from '@/components/ui/badge'
import { Network, Layers, Route, Shield, AlertTriangle } from 'lucide-react'
import type { AssetPageConfig } from '@/features/assets/types/page-config.types'

const getNetworkTypeLabel = (type: string) => {
  switch (type) {
    case 'vpc':
      return 'VPC'
    case 'load_balancer':
      return 'Load Balancer'
    case 'firewall':
      return 'Firewall'
    case 'route_table':
      return 'Route Table'
    default:
      return type
  }
}

const getNetworkTypeVariant = (type: string): 'default' | 'secondary' | 'outline' => {
  switch (type) {
    case 'vpc':
      return 'default'
    case 'load_balancer':
      return 'secondary'
    case 'firewall':
      return 'outline'
    default:
      return 'secondary'
  }
}

export const networksConfig: AssetPageConfig = {
  type: 'network',
  label: 'Network',
  labelPlural: 'Networks',
  description: 'VPCs, firewalls, and load balancers',
  icon: Network,
  iconColor: 'text-cyan-500',
  gradientFrom: 'from-cyan-500/20',
  gradientVia: 'via-cyan-500/10',

  columns: [
    {
      accessorKey: 'metadata.networkType',
      header: 'Type',
      cell: ({ row }) => {
        const networkType = (row.original.metadata.networkType as string) || ''
        return (
          <Badge variant={getNetworkTypeVariant(networkType)}>
            {getNetworkTypeLabel(networkType)}
          </Badge>
        )
      },
    },
    {
      accessorKey: 'metadata.cloudProvider',
      header: 'Provider / Region',
      cell: ({ row }) => {
        const provider = (row.original.metadata.cloudProvider as string) || '-'
        const region = (row.original.metadata.region as string) || '-'
        return (
          <div>
            <div className="font-medium">{provider}</div>
            <div className="text-sm text-muted-foreground">{region}</div>
          </div>
        )
      },
    },
    {
      accessorKey: 'metadata.vpcCidr',
      header: 'CIDR',
      cell: ({ row }) => {
        const cidr = (row.original.metadata.vpcCidr as string) || '-'
        return <span className="font-mono text-sm">{cidr}</span>
      },
    },
    {
      id: 'subnets',
      header: 'Subnets',
      cell: ({ row }) => {
        const subnetCidrs = row.original.metadata.subnetCidrs
        const count = Array.isArray(subnetCidrs) ? subnetCidrs.length : 0
        if (count === 0) return <span className="text-muted-foreground">-</span>
        return <span className="text-sm">{count}</span>
      },
    },
  ],

  formFields: [
    {
      name: 'name',
      label: 'Network Name',
      type: 'text',
      placeholder: 'e.g., production-vpc',
      required: true,
    },
    {
      name: 'description',
      label: 'Description',
      type: 'textarea',
      placeholder: 'Optional description',
    },
    {
      name: 'networkType',
      label: 'Network Type',
      type: 'select',
      isMetadata: true,
      required: true,
      options: [
        { label: 'VPC', value: 'vpc' },
        { label: 'Load Balancer', value: 'load_balancer' },
        { label: 'Firewall', value: 'firewall' },
        { label: 'Route Table', value: 'route_table' },
      ],
    },
    {
      name: 'cloudProvider',
      label: 'Provider',
      type: 'text',
      placeholder: 'e.g., AWS',
      isMetadata: true,
    },
    {
      name: 'region',
      label: 'Region',
      type: 'text',
      placeholder: 'e.g., us-east-1',
      isMetadata: true,
    },
    {
      name: 'vpcCidr',
      label: 'CIDR Block',
      type: 'text',
      placeholder: 'e.g., 10.0.0.0/16',
      isMetadata: true,
    },
    { name: 'tags', label: 'Tags', type: 'tags', placeholder: 'production, critical' },
  ],

  statsCards: [
    {
      title: 'VPCs',
      icon: Layers,
      compute: (assets) => assets.filter((a) => a.metadata.networkType === 'vpc').length,
    },
    {
      title: 'Load Balancers',
      icon: Route,
      compute: (assets) => assets.filter((a) => a.metadata.networkType === 'load_balancer').length,
    },
    {
      title: 'Firewalls',
      icon: Shield,
      compute: (assets) => assets.filter((a) => a.metadata.networkType === 'firewall').length,
    },
  ],

  customFilter: {
    label: 'Network Type',
    options: [
      { label: 'VPC', value: 'vpc' },
      { label: 'Load Balancer', value: 'load_balancer' },
      { label: 'Firewall', value: 'firewall' },
      { label: 'Route Table', value: 'route_table' },
    ],
    filterFn: (asset, value) => (asset.metadata.networkType as string) === value,
  },

  detailStats: [
    {
      icon: Layers,
      iconBg: 'bg-cyan-500/10',
      iconColor: 'text-cyan-500',
      label: 'Subnets',
      getValue: (asset) => {
        const cidrs = asset.metadata.subnetCidrs
        return Array.isArray(cidrs) ? cidrs.length : 0
      },
    },
    {
      icon: Shield,
      iconBg: 'bg-orange-500/10',
      iconColor: 'text-orange-500',
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
      title: 'Network Information',
      fields: [
        {
          label: 'Network Type',
          getValue: (asset) => {
            const networkType = (asset.metadata.networkType as string) || '-'
            return (
              <Badge variant={getNetworkTypeVariant(networkType)}>
                {getNetworkTypeLabel(networkType)}
              </Badge>
            )
          },
        },
        {
          label: 'Provider',
          getValue: (asset) => (asset.metadata.cloudProvider as string) || '-',
        },
        {
          label: 'Region',
          getValue: (asset) => (asset.metadata.region as string) || '-',
        },
        {
          label: 'CIDR Block',
          getValue: (asset) => {
            const cidr = asset.metadata.vpcCidr
            if (!cidr) return '-'
            return <code className="text-sm bg-muted px-2 py-0.5 rounded">{cidr}</code>
          },
        },
        {
          label: 'Subnets',
          getValue: (asset) => {
            const cidrs = asset.metadata.subnetCidrs
            return Array.isArray(cidrs) ? cidrs.length : 0
          },
        },
      ],
    },
  ],

  exportFields: [
    { header: 'Name', accessor: (a) => a.name },
    { header: 'Network Type', accessor: (a) => a.metadata.networkType || '' },
    { header: 'Provider', accessor: (a) => a.metadata.cloudProvider || '' },
    { header: 'Region', accessor: (a) => a.metadata.region || '' },
    { header: 'CIDR', accessor: (a) => a.metadata.vpcCidr || '' },
    {
      header: 'Subnets',
      accessor: (a) => (Array.isArray(a.metadata.subnetCidrs) ? a.metadata.subnetCidrs.length : 0),
    },
    { header: 'Status', accessor: (a) => a.status },
    { header: 'Risk Score', accessor: (a) => a.riskScore },
    { header: 'Findings', accessor: (a) => a.findingCount },
  ],

  includeGroupSelect: true,
}
