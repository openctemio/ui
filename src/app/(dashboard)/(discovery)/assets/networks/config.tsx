'use client'

import { Badge } from '@/components/ui/badge'
import { Network, Shield, AlertTriangle, Router, Server } from 'lucide-react'
import type { AssetPageConfig } from '@/features/assets/types/page-config.types'
import type { Asset } from '@/features/assets'

/** Get management IP from properties with fallback: management_ip → ip → ip_addresses[0] */
const getManagementIP = (asset: Asset): string => {
  const meta = asset.metadata as Record<string, unknown>
  if (meta.management_ip) return meta.management_ip as string
  if (meta.ip) return meta.ip as string
  const ips = meta.ip_addresses as string[] | undefined
  if (ips && ips.length > 0) return ips[0]
  return ''
}

const getDeviceTypeLabel = (asset: Asset): string => {
  // After type consolidation: all network devices have type='network', sub_type differentiates
  const subType = asset.subType || ''
  switch (subType) {
    case 'firewall':
      return 'Firewall'
    case 'load_balancer':
      return 'Load Balancer'
    case 'switch':
      return 'Switch'
    case 'router':
      return 'Router'
    case 'wireless_ap':
      return 'Wireless AP'
    case 'ids_ips':
      return 'IDS/IPS'
    default:
      return 'Network Device'
  }
}

const getDeviceTypeColor = (label: string): string => {
  switch (label) {
    case 'Firewall':
      return 'bg-red-500/20 text-red-600 dark:text-red-400'
    case 'Load Balancer':
      return 'bg-blue-500/20 text-blue-600 dark:text-blue-400'
    case 'Switch':
      return 'bg-purple-500/20 text-purple-600 dark:text-purple-400'
    case 'Router':
      return 'bg-orange-500/20 text-orange-600 dark:text-orange-400'
    case 'Wireless AP':
      return 'bg-green-500/20 text-green-600 dark:text-green-400'
    default:
      return 'bg-gray-500/20 text-gray-600 dark:text-gray-400'
  }
}

export const networksConfig: AssetPageConfig = {
  type: 'network',
  // After Phase 3: all network devices consolidated to type='network'
  // Backward compat: also fetch old types during transition
  // All network devices now type='network' after consolidation
  // Also include hosts tagged as network-device via tag filter
  label: 'Network Device',
  labelPlural: 'Network & Security Devices',
  description: 'Firewalls, switches, routers, load balancers, and other network infrastructure',
  icon: Network,
  iconColor: 'text-cyan-500',
  gradientFrom: 'from-cyan-500/20',
  gradientVia: 'via-cyan-500/10',

  defaultSort: { field: 'updatedAt', direction: 'desc' },

  columns: [
    {
      accessorKey: 'subType',
      header: 'Device Type',
      cell: ({ row }) => {
        const label = getDeviceTypeLabel(row.original)
        return <Badge className={`${getDeviceTypeColor(label)} border-0 text-xs`}>{label}</Badge>
      },
    },
    {
      accessorKey: 'metadata.vendor',
      header: 'Vendor / Model',
      cell: ({ row }) => {
        const meta = row.original.metadata as Record<string, unknown>
        const vendor = (meta.vendor as string) || ''
        const model = (meta.model as string) || ''
        if (!vendor && !model) return <span className="text-muted-foreground">-</span>
        return (
          <div className="max-w-[180px]">
            {vendor && <p className="text-sm font-medium truncate">{vendor}</p>}
            {model && <p className="text-xs text-muted-foreground truncate">{model}</p>}
          </div>
        )
      },
    },
    {
      accessorKey: 'metadata.firmware_version',
      header: 'Firmware',
      cell: ({ row }) => {
        const meta = row.original.metadata as Record<string, unknown>
        const fw = (meta.firmware_version as string) || ''
        if (!fw) return <span className="text-muted-foreground">-</span>
        return <span className="text-sm font-mono">{fw}</span>
      },
    },
    {
      accessorKey: 'metadata.management_ip',
      header: 'Management IP',
      cell: ({ row }) => {
        const ip = getManagementIP(row.original)
        if (!ip) return <span className="text-muted-foreground">-</span>
        return <span className="text-sm font-mono">{ip}</span>
      },
    },
  ],

  formFields: [
    {
      name: 'name',
      label: 'Device Name',
      type: 'text',
      placeholder: 'e.g., FW-PERIMETER-01',
      required: true,
    },
    {
      name: 'description',
      label: 'Description',
      type: 'textarea',
      placeholder: 'Optional description',
    },
    {
      name: 'vendor',
      label: 'Vendor',
      type: 'text',
      placeholder: 'Cisco, Palo Alto, Fortinet...',
      isMetadata: true,
    },
    {
      name: 'model',
      label: 'Model',
      type: 'text',
      placeholder: 'PA-3260, Catalyst 9500...',
      isMetadata: true,
    },
    {
      name: 'firmware_version',
      label: 'Firmware Version',
      type: 'text',
      placeholder: 'PAN-OS 11.1.2, IOS-XE 17.9.4...',
      isMetadata: true,
    },
    {
      name: 'management_ip',
      label: 'Management IP',
      type: 'text',
      placeholder: '10.20.0.10',
      isMetadata: true,
    },
    {
      name: 'serial_number',
      label: 'Serial Number',
      type: 'text',
      placeholder: 'Optional',
      isMetadata: true,
    },
    { name: 'tags', label: 'Tags', type: 'tags', placeholder: 'firewall, cisco, perimeter' },
  ],

  statsCards: [
    {
      title: 'Firewalls',
      icon: Shield,
      compute: (_assets, stats) => stats.bySubType?.firewall ?? 0,
    },
    {
      title: 'Load Balancers',
      icon: Router,
      compute: (_assets, stats) => stats.bySubType?.load_balancer ?? 0,
    },
    {
      title: 'Switches/Routers',
      icon: Server,
      compute: (_assets, stats) => (stats.bySubType?.switch ?? 0) + (stats.bySubType?.router ?? 0),
    },
    {
      title: 'With Findings',
      icon: AlertTriangle,
      compute: (_assets, stats) => stats.withFindings,
      variant: 'warning',
    },
  ],

  // Filters are handled dynamically by PropertyFilter (fetches from /assets/facets)

  copyAction: {
    label: 'Copy IP',
    getValue: (asset: Asset) => {
      const meta = asset.metadata as Record<string, unknown>
      return getManagementIP(asset) || asset.name
    },
  },

  detailStats: [
    {
      icon: Shield,
      iconBg: 'bg-orange-500/10',
      iconColor: 'text-orange-500',
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
      title: 'Device Information',
      fields: [
        {
          label: 'Device Type',
          getValue: (asset: Asset) => {
            const label = getDeviceTypeLabel(asset)
            return <Badge className={`${getDeviceTypeColor(label)} border-0`}>{label}</Badge>
          },
        },
        {
          label: 'Vendor',
          getValue: (asset: Asset) =>
            ((asset.metadata as Record<string, unknown>).vendor as string) || '-',
        },
        {
          label: 'Model',
          getValue: (asset: Asset) =>
            ((asset.metadata as Record<string, unknown>).model as string) || '-',
        },
        {
          label: 'Firmware',
          getValue: (asset: Asset) =>
            ((asset.metadata as Record<string, unknown>).firmware_version as string) || '-',
        },
        {
          label: 'Serial Number',
          getValue: (asset: Asset) =>
            ((asset.metadata as Record<string, unknown>).serial_number as string) || '-',
        },
        {
          label: 'Management IP',
          getValue: (asset: Asset) => {
            const ip = getManagementIP(asset)
            if (!ip) return '-'
            return <code className="text-sm bg-muted px-2 py-0.5 rounded">{ip}</code>
          },
        },
        {
          label: 'HA Mode',
          getValue: (asset: Asset) =>
            ((asset.metadata as Record<string, unknown>).ha_mode as string) || '-',
        },
      ],
    },
  ],

  exportFields: [
    { header: 'Name', accessor: (a) => a.name },
    { header: 'Device Type', accessor: (a) => getDeviceTypeLabel(a) },
    { header: 'Vendor', accessor: (a) => (a.metadata as Record<string, unknown>).vendor || '' },
    { header: 'Model', accessor: (a) => (a.metadata as Record<string, unknown>).model || '' },
    {
      header: 'Firmware',
      accessor: (a) => (a.metadata as Record<string, unknown>).firmware_version || '',
    },
    {
      header: 'Management IP',
      accessor: (a) => getManagementIP(a),
    },
    {
      header: 'Serial',
      accessor: (a) => (a.metadata as Record<string, unknown>).serial_number || '',
    },
    { header: 'Last Update', accessor: (a) => a.updatedAt || '' },
    { header: 'Status', accessor: (a) => a.status },
    { header: 'Risk Score', accessor: (a) => a.riskScore },
    { header: 'Findings', accessor: (a) => a.findingCount },
  ],

  includeGroupSelect: true,
}
