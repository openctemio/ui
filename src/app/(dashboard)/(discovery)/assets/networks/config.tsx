'use client'

import { Badge } from '@/components/ui/badge'
import { Network, Layers, Route, Shield, AlertTriangle } from 'lucide-react'
import type { AssetPageConfig } from '@/features/assets/types/page-config.types'

const getNetworkTypeLabel = (type: string) => {
  switch (type) {
    case 'lan':
      return 'LAN'
    case 'dmz':
      return 'DMZ'
    case 'management':
      return 'Management'
    case 'backup':
      return 'Backup'
    case 'vpc':
      return 'VPC'
    case 'vlan':
      return 'VLAN'
    default:
      return type || 'Unknown'
  }
}

const getNetworkTypeVariant = (type: string): 'default' | 'secondary' | 'outline' => {
  switch (type) {
    case 'dmz':
      return 'default'
    case 'management':
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
      accessorKey: 'metadata.network_type',
      header: 'Type',
      cell: ({ row }) => {
        const meta = row.original.metadata as Record<string, unknown>
        const networkType = (meta.network_type as string) || (meta.networkType as string) || ''
        if (!networkType) return <span className="text-muted-foreground">-</span>
        return (
          <Badge variant={getNetworkTypeVariant(networkType)}>
            {getNetworkTypeLabel(networkType)}
          </Badge>
        )
      },
    },
    {
      accessorKey: 'metadata.cidr',
      header: 'CIDR',
      cell: ({ row }) => {
        const meta = row.original.metadata as Record<string, unknown>
        const cidr = (meta.cidr as string) || (meta.vpcCidr as string) || ''
        if (!cidr) return <span className="text-muted-foreground">-</span>
        return <span className="font-mono text-sm">{cidr}</span>
      },
    },
    {
      accessorKey: 'metadata.vlan_id',
      header: 'VLAN',
      cell: ({ row }) => {
        const meta = row.original.metadata as Record<string, unknown>
        const vlan = meta.vlan_id ?? meta.vlanId
        if (!vlan) return <span className="text-muted-foreground">-</span>
        return <span className="font-mono text-sm">{String(vlan)}</span>
      },
    },
    {
      accessorKey: 'metadata.gateway',
      header: 'Gateway',
      cell: ({ row }) => {
        const meta = row.original.metadata as Record<string, unknown>
        const gw = (meta.gateway as string) || ''
        if (!gw) return <span className="text-muted-foreground">-</span>
        return <span className="font-mono text-sm">{gw}</span>
      },
    },
  ],

  formFields: [
    {
      name: 'name',
      label: 'Network Name',
      type: 'text',
      placeholder: 'e.g., PROD-LAN, DMZ',
      required: true,
    },
    {
      name: 'description',
      label: 'Description',
      type: 'textarea',
      placeholder: 'Optional description',
    },
    {
      name: 'network_type',
      label: 'Network Type',
      type: 'select',
      isMetadata: true,
      options: [
        { label: 'LAN', value: 'lan' },
        { label: 'DMZ', value: 'dmz' },
        { label: 'Management', value: 'management' },
        { label: 'Backup', value: 'backup' },
        { label: 'VPC', value: 'vpc' },
        { label: 'VLAN', value: 'vlan' },
      ],
    },
    {
      name: 'cidr',
      label: 'CIDR Block',
      type: 'text',
      placeholder: 'e.g., 10.0.0.0/16',
      isMetadata: true,
    },
    {
      name: 'vlan_id',
      label: 'VLAN ID',
      type: 'number',
      placeholder: 'e.g., 100',
      isMetadata: true,
    },
    {
      name: 'gateway',
      label: 'Gateway',
      type: 'text',
      placeholder: 'e.g., 10.0.0.1',
      isMetadata: true,
    },
    { name: 'tags', label: 'Tags', type: 'tags', placeholder: 'production, critical' },
  ],

  statsCards: [
    {
      title: 'LAN/VLAN',
      icon: Layers,
      compute: (assets) => {
        return assets.filter((a) => {
          const t = (a.metadata as Record<string, unknown>).network_type as string
          return t === 'lan' || t === 'vlan'
        }).length
      },
    },
    {
      title: 'DMZ',
      icon: Shield,
      compute: (assets) => {
        return assets.filter((a) => (a.metadata as Record<string, unknown>).network_type === 'dmz')
          .length
      },
    },
    {
      title: 'Management',
      icon: Route,
      compute: (assets) => {
        return assets.filter(
          (a) => (a.metadata as Record<string, unknown>).network_type === 'management'
        ).length
      },
    },
  ],

  customFilter: {
    label: 'Network Type',
    options: [
      { label: 'LAN', value: 'lan' },
      { label: 'DMZ', value: 'dmz' },
      { label: 'Management', value: 'management' },
      { label: 'Backup', value: 'backup' },
      { label: 'VPC', value: 'vpc' },
      { label: 'VLAN', value: 'vlan' },
    ],
    filterFn: (asset, value) => {
      const meta = asset.metadata as Record<string, unknown>
      return (meta.network_type as string) === value || (meta.networkType as string) === value
    },
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
            const meta = asset.metadata as Record<string, unknown>
            const networkType = (meta.network_type as string) || (meta.networkType as string) || '-'
            return (
              <Badge variant={getNetworkTypeVariant(networkType)}>
                {getNetworkTypeLabel(networkType)}
              </Badge>
            )
          },
        },
        {
          label: 'CIDR Block',
          getValue: (asset) => {
            const meta = asset.metadata as Record<string, unknown>
            const cidr = (meta.cidr as string) || (meta.vpcCidr as string)
            if (!cidr) return '-'
            return <code className="text-sm bg-muted px-2 py-0.5 rounded">{cidr as string}</code>
          },
        },
        {
          label: 'VLAN ID',
          getValue: (asset) => {
            const meta = asset.metadata as Record<string, unknown>
            return String(meta.vlan_id ?? meta.vlanId ?? '-')
          },
        },
        {
          label: 'Gateway',
          getValue: (asset) => {
            const meta = asset.metadata as Record<string, unknown>
            const gw = meta.gateway as string
            if (!gw) return '-'
            return <code className="text-sm bg-muted px-2 py-0.5 rounded">{gw}</code>
          },
        },
        {
          label: 'DNS Servers',
          getValue: (asset) => {
            const meta = asset.metadata as Record<string, unknown>
            const dns = meta.dns_servers
            if (!Array.isArray(dns) || dns.length === 0) return '-'
            return (dns as string[]).join(', ')
          },
        },
      ],
    },
  ],

  exportFields: [
    { header: 'Name', accessor: (a) => a.name },
    { header: 'Type', accessor: (a) => (a.metadata as Record<string, unknown>).network_type || '' },
    { header: 'CIDR', accessor: (a) => (a.metadata as Record<string, unknown>).cidr || '' },
    { header: 'VLAN', accessor: (a) => (a.metadata as Record<string, unknown>).vlan_id || '' },
    { header: 'Gateway', accessor: (a) => (a.metadata as Record<string, unknown>).gateway || '' },
    { header: 'Status', accessor: (a) => a.status },
    { header: 'Risk Score', accessor: (a) => a.riskScore },
    { header: 'Findings', accessor: (a) => a.findingCount },
  ],

  includeGroupSelect: true,
}
