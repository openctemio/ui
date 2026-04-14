'use client'

import type { AssetPageConfig } from '@/features/assets/types/page-config.types'
import type { Asset } from '@/features/assets'
import { Badge } from '@/components/ui/badge'
import { Globe, CheckCircle, Clock, AlertTriangle, Shield } from 'lucide-react'

export const domainsConfig: AssetPageConfig = {
  type: 'domain',
  types: ['domain', 'subdomain'],
  label: 'Domain',
  labelPlural: 'Domains & Subdomains',
  description: 'Manage your domain assets and track domain hierarchy',
  icon: Globe,
  iconColor: 'text-blue-500',
  gradientFrom: 'from-blue-500/20',
  gradientVia: 'via-blue-500/10',

  defaultSort: { field: 'name', direction: 'asc' },

  columns: [
    {
      id: 'domainType',
      header: 'Type',
      cell: ({ row }) => {
        // Use asset_type from DB — reliable regardless of pagination
        const isRoot = row.original.type === 'domain'
        return isRoot ? (
          <Badge variant="default" className="text-xs px-1.5 py-0">
            Root
          </Badge>
        ) : (
          <Badge variant="outline" className="text-xs px-1.5 py-0 text-muted-foreground">
            Sub
          </Badge>
        )
      },
    },
    {
      id: 'dnsInfo',
      header: 'DNS Info',
      cell: ({ row }) => {
        const meta = row.original.metadata as Record<string, unknown>
        const recordType = (meta.record_type as string) || (meta.dns_record_types as string) || ''
        const resolvedIp = (meta.resolved_ip as string) || (meta.resolved_ips as string) || ''
        const cnameTarget = (meta.cname_target as string) || ''
        const registrar = (meta.registrar as string) || ''

        // For root domains: show registrar if available
        if (row.original.type === 'domain' && registrar) {
          return <span className="text-sm">{registrar}</span>
        }

        if (!recordType && !resolvedIp && !cnameTarget) {
          return <span className="text-muted-foreground">-</span>
        }

        return (
          <div className="flex items-center gap-1.5 max-w-[200px]">
            {recordType && (
              <Badge variant="outline" className="text-xs font-mono px-1 py-0">
                {recordType.split(',')[0].trim()}
              </Badge>
            )}
            {resolvedIp && (
              <span className="text-xs font-mono text-muted-foreground truncate">
                {resolvedIp.split(',')[0].trim()}
              </span>
            )}
            {cnameTarget && !resolvedIp && (
              <span className="text-xs font-mono text-muted-foreground truncate">
                {cnameTarget}
              </span>
            )}
          </div>
        )
      },
    },
  ],

  formFields: [
    {
      name: 'name',
      label: 'Domain Name',
      type: 'text',
      placeholder: 'example.com',
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
      name: 'registrar',
      label: 'Registrar',
      type: 'text',
      placeholder: 'GoDaddy, Cloudflare...',
      isMetadata: true,
    },
    {
      name: 'expiry_date',
      label: 'Expiry Date',
      type: 'text',
      placeholder: 'YYYY-MM-DD',
      isMetadata: true,
    },
    {
      name: 'nameservers',
      label: 'Nameservers (comma separated)',
      type: 'text',
      placeholder: 'ns1.example.com, ns2.example.com',
      isMetadata: true,
      fullWidth: true,
    },
    {
      name: 'tags',
      label: 'Tags',
      type: 'tags',
      placeholder: 'production, critical',
      fullWidth: true,
    },
  ],

  includeGroupSelect: true,

  statsCards: [
    {
      title: 'Root Domains',
      icon: Globe,
      compute: (assets) => assets.filter((a) => a.type === 'domain').length,
    },
    {
      title: 'Subdomains',
      icon: Globe,
      compute: (assets) => assets.filter((a) => a.type === 'subdomain').length,
    },
    {
      title: 'With Findings',
      icon: AlertTriangle,
      compute: (_assets, stats) => stats.withFindings,
      variant: 'warning',
    },
  ],

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
      title: 'Domain Information',
      fields: [
        {
          label: 'Registrar',
          getValue: (asset) =>
            ((asset.metadata as Record<string, unknown>).registrar as string) || '-',
        },
        {
          label: 'Expiry Date',
          getValue: (asset) => {
            const d = (asset.metadata as Record<string, unknown>).expiry_date as string
            return d ? new Date(d).toLocaleDateString() : '-'
          },
        },
        {
          label: 'Root Domain',
          getValue: (asset) =>
            ((asset.metadata as Record<string, unknown>).root_domain as string) || '-',
        },
        {
          label: 'Collector',
          getValue: (asset) => {
            const meta = asset.metadata as Record<string, unknown>
            const type = (meta.collector_type as string) || ''
            const source = (meta.collector_source as string) || ''
            if (!type && !source) return '-'
            return `${type}${source ? ` (${source})` : ''}`
          },
        },
      ],
    },
    {
      title: 'DNS Records',
      fields: [
        {
          label: 'Record Types',
          getValue: (asset) => {
            const meta = asset.metadata as Record<string, unknown>
            const types = (meta.dns_record_types as string) || (meta.record_type as string) || ''
            if (!types) return '-'
            return (
              <div className="flex flex-wrap gap-1">
                {types.split(',').map((t) => (
                  <Badge key={t.trim()} variant="outline" className="text-xs font-mono">
                    {t.trim()}
                  </Badge>
                ))}
              </div>
            )
          },
        },
        {
          label: 'Resolved IPs',
          getValue: (asset) => {
            const meta = asset.metadata as Record<string, unknown>
            const ips = (meta.resolved_ips as string) || (meta.resolved_ip as string) || ''
            if (!ips) return '-'
            return (
              <div className="flex flex-wrap gap-1">
                {ips.split(',').map((ip) => (
                  <Badge key={ip.trim()} variant="secondary" className="text-xs font-mono">
                    {ip.trim()}
                  </Badge>
                ))}
              </div>
            )
          },
          fullWidth: true,
        },
        {
          label: 'CNAME Target',
          getValue: (asset) => {
            const target = (asset.metadata as Record<string, unknown>).cname_target as string
            return target ? (
              <code className="text-xs bg-muted px-2 py-0.5 rounded">{target}</code>
            ) : (
              '-'
            )
          },
          fullWidth: true,
        },
      ],
    },
  ],

  exportFields: [
    { header: 'Name', accessor: (a) => a.name },
    { header: 'Type', accessor: (a) => (a.type === 'domain' ? 'Root' : 'Subdomain') },
    {
      header: 'Registrar',
      accessor: (a) => ((a.metadata as Record<string, unknown>).registrar as string) || '',
    },
    {
      header: 'Expiry Date',
      accessor: (a) => ((a.metadata as Record<string, unknown>).expiry_date as string) || '',
    },
    { header: 'Status', accessor: (a) => a.status },
    { header: 'Risk Score', accessor: (a) => a.riskScore },
    { header: 'Findings', accessor: (a) => a.findingCount },
  ],

  copyAction: {
    label: 'Copy Name',
    getValue: (asset) => asset.name,
  },
}
