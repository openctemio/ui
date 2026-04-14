'use client'

import { Badge } from '@/components/ui/badge'
import { Network, Globe, Lock, Server, Shield, AlertTriangle } from 'lucide-react'
import type { AssetPageConfig } from '@/features/assets/types/page-config.types'
import type { Asset } from '@/features/assets'

// Helper to determine if IP is public or private
function isPublicIp(address: string): boolean {
  if (
    address.startsWith('10.') ||
    address.startsWith('192.168.') ||
    address.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./)
  ) {
    return false
  }
  if (address.startsWith('127.') || address === '::1') {
    return false
  }
  if (address.startsWith('169.254.') || address.toLowerCase().startsWith('fe80:')) {
    return false
  }
  return true
}

// Helper to detect IP version
function getIpVersion(address: string): 'ipv4' | 'ipv6' {
  return address.includes(':') ? 'ipv6' : 'ipv4'
}

export const ipAddressesConfig: AssetPageConfig = {
  type: 'ip_address',
  label: 'IP Address',
  labelPlural: 'IP Addresses',
  description: 'IPv4 and IPv6 addresses in your infrastructure',
  icon: Network,
  iconColor: 'text-blue-500',
  gradientFrom: 'from-blue-500/20',
  gradientVia: 'via-blue-500/10',

  columns: [
    {
      id: 'asnOrg',
      header: 'ASN / Organization',
      cell: ({ row }) => {
        const ip = row.original
        const asn = (ip.metadata?.asn as string) || '-'
        const org = (ip.metadata?.asnOrganization as string) || '-'
        return (
          <div>
            <p className="font-medium">{asn}</p>
            <p className="text-sm text-muted-foreground">{org}</p>
          </div>
        )
      },
    },
    {
      id: 'ipType',
      header: 'Type',
      cell: ({ row }) => {
        const isPublic = isPublicIp(row.original.name)
        return (
          <Badge variant={isPublic ? 'default' : 'secondary'}>
            {isPublic ? 'Public' : 'Private'}
          </Badge>
        )
      },
    },
    {
      id: 'openPorts',
      header: 'Open Ports',
      cell: ({ row }) => {
        const raw = row.original.metadata?.openPorts
        const ports: (string | number)[] = Array.isArray(raw)
          ? raw
          : raw
            ? String(raw)
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean)
            : []
        if (ports.length === 0) {
          return <span className="text-muted-foreground">-</span>
        }
        return (
          <div className="flex flex-wrap gap-1">
            {ports.slice(0, 3).map((port) => (
              <Badge key={port} variant="outline" className="text-xs font-mono">
                {port}
              </Badge>
            ))}
            {ports.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{ports.length - 3}
              </Badge>
            )}
          </div>
        )
      },
    },
  ],

  formFields: [
    {
      name: 'name',
      label: 'IP Address',
      type: 'text',
      placeholder: '192.168.1.1 or 2001:db8::1',
      required: true,
    },
    { name: 'asn', label: 'ASN', type: 'text', placeholder: 'AS12345', isMetadata: true },
    {
      name: 'asnOrganization',
      label: 'Organization',
      type: 'text',
      placeholder: 'Example Corp',
      isMetadata: true,
    },
    {
      name: 'description',
      label: 'Description',
      type: 'textarea',
      placeholder: 'Optional description',
      fullWidth: true,
    },
    { name: 'tags', label: 'Tags', type: 'tags', placeholder: 'production, web-server' },
  ],

  statsCards: [
    {
      title: 'Public',
      icon: Globe,
      compute: (assets: Asset[]) => assets.filter((a) => isPublicIp(a.name)).length,
    },
    {
      title: 'Private',
      icon: Lock,
      compute: (assets: Asset[]) => assets.filter((a) => !isPublicIp(a.name)).length,
    },
    {
      title: 'IPv6',
      icon: Server,
      compute: (assets: Asset[]) => assets.filter((a) => getIpVersion(a.name) === 'ipv6').length,
    },
  ],

  customFilter: {
    label: 'IP Type',
    options: [
      { label: 'Public', value: 'public' },
      { label: 'Private', value: 'private' },
    ],
    filterFn: (asset: Asset, value: string) => {
      const isPublic = isPublicIp(asset.name)
      return value === 'public' ? isPublic : !isPublic
    },
  },

  copyAction: {
    label: 'Copy Address',
    getValue: (asset: Asset) => asset.name,
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
      title: 'IP Information',
      fields: [
        {
          label: 'Version',
          getValue: (asset: Asset) => getIpVersion(asset.name).toUpperCase(),
        },
        {
          label: 'Type',
          getValue: (asset: Asset) => (isPublicIp(asset.name) ? 'Public' : 'Private'),
        },
        {
          label: 'ASN',
          getValue: (asset: Asset) => (asset.metadata?.asn as string) || '-',
        },
        {
          label: 'Organization',
          getValue: (asset: Asset) => (asset.metadata?.asnOrganization as string) || '-',
        },
        {
          label: 'Open Ports',
          fullWidth: true,
          getValue: (asset: Asset) => {
            const raw = asset.metadata?.openPorts
            const ports: (string | number)[] = Array.isArray(raw)
              ? raw
              : raw
                ? String(raw)
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean)
                : []
            if (ports.length === 0) {
              return <span className="text-muted-foreground">None</span>
            }
            return (
              <div className="flex flex-wrap gap-1">
                {ports.map((port) => (
                  <Badge key={port} variant="outline" className="text-xs font-mono">
                    {port}
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
    { header: 'IP Address', accessor: (a: Asset) => a.name },
    { header: 'Version', accessor: (a: Asset) => getIpVersion(a.name) },
    { header: 'Type', accessor: (a: Asset) => (isPublicIp(a.name) ? 'Public' : 'Private') },
    { header: 'ASN', accessor: (a: Asset) => (a.metadata?.asn as string) || '' },
    {
      header: 'Organization',
      accessor: (a: Asset) => (a.metadata?.asnOrganization as string) || '',
    },
    { header: 'Status', accessor: (a: Asset) => a.status },
    { header: 'Risk Score', accessor: (a: Asset) => a.riskScore },
    { header: 'Findings', accessor: (a: Asset) => a.findingCount },
  ],

  includeGroupSelect: false,
}
