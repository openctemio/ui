'use client'

import type { ColumnDef } from '@tanstack/react-table'
import type { AssetPageConfig } from '@/features/assets/types/page-config.types'
import type { Asset } from '@/features/assets'
import { flattenDomainTreeForTable, type DomainTableRow } from '@/features/assets'
import { Badge } from '@/components/ui/badge'
import { Globe, CheckCircle, Clock, AlertTriangle, Shield, CornerDownRight } from 'lucide-react'

const columns: ColumnDef<Asset>[] = [
  {
    id: 'hierarchy',
    header: 'Type',
    cell: ({ row }) => {
      const domainRow = row.original as DomainTableRow
      const level = '_level' in domainRow ? domainRow._level : 0
      const isRoot = '_isRoot' in domainRow ? domainRow._isRoot : true
      const subdomainCount = '_subdomainCount' in domainRow ? domainRow._subdomainCount : 0

      return (
        <div className="flex items-center gap-1.5">
          {level > 0 && (
            <div className="flex items-center" style={{ width: `${level * 16}px` }}>
              <CornerDownRight className="h-3 w-3 text-muted-foreground/50 ml-auto" />
            </div>
          )}
          {isRoot ? (
            <Badge variant="default" className="text-xs px-1.5 py-0">
              Root
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs px-1.5 py-0 text-muted-foreground">
              Sub
            </Badge>
          )}
          {isRoot && subdomainCount > 0 && (
            <Badge variant="secondary" className="text-xs px-1.5 py-0">
              {subdomainCount}
            </Badge>
          )}
        </div>
      )
    },
  },
  {
    id: 'registrar',
    header: 'Registrar',
    cell: ({ row }) => (
      <span className="text-sm">{(row.original.metadata.registrar as string) || '-'}</span>
    ),
  },
  {
    id: 'expiry',
    header: 'Expiry',
    cell: ({ row }) => {
      const date = row.original.metadata.expiryDate as string
      if (!date) return <span className="text-muted-foreground">-</span>
      const expiry = new Date(date)
      const now = new Date()
      const daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      const isExpiringSoon = daysLeft <= 30
      return (
        <div className="flex items-center gap-1">
          <span className={isExpiringSoon ? 'text-orange-500' : ''}>
            {expiry.toLocaleDateString()}
          </span>
          {isExpiringSoon && <AlertTriangle className="h-3 w-3 text-orange-500" />}
        </div>
      )
    },
  },
]

export const domainsConfig: AssetPageConfig = {
  type: 'domain',
  label: 'Domain',
  labelPlural: 'Domains',
  description: 'Manage your domain assets and track domain hierarchy',
  icon: Globe,
  iconColor: 'text-blue-500',
  gradientFrom: 'from-blue-500/20',
  gradientVia: 'via-blue-500/10',

  dataTransform: (assets) => flattenDomainTreeForTable(assets) as Asset[],

  columns,

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
      name: 'expiryDate',
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
      label: 'Tags (comma separated)',
      type: 'tags',
      placeholder: 'production, critical',
      fullWidth: true,
    },
  ],

  includeGroupSelect: true,

  statsCards: [
    {
      title: 'Active',
      icon: CheckCircle,
      compute: (_assets, stats) => stats.byStatus.active ?? 0,
      variant: 'success',
    },
    {
      title: 'Inactive',
      icon: Clock,
      compute: (_assets, stats) => stats.byStatus.inactive ?? 0,
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
          getValue: (asset) => (asset.metadata.registrar as string) || '-',
        },
        {
          label: 'Expiry Date',
          getValue: (asset) =>
            asset.metadata.expiryDate
              ? new Date(asset.metadata.expiryDate as string).toLocaleDateString()
              : '-',
        },
        {
          label: 'Nameservers',
          getValue: (asset) => {
            const ns = asset.metadata.nameservers as string[] | undefined
            if (!ns || ns.length === 0) return '-'
            return (
              <div className="flex flex-wrap gap-1">
                {ns.map((n) => (
                  <Badge key={n} variant="outline" className="text-xs">
                    {n}
                  </Badge>
                ))}
              </div>
            )
          },
          fullWidth: true,
        },
      ],
    },
  ],

  exportFields: [
    { header: 'Name', accessor: (a) => a.name },
    { header: 'Registrar', accessor: (a) => (a.metadata.registrar as string) || '' },
    { header: 'Expiry Date', accessor: (a) => (a.metadata.expiryDate as string) || '' },
    { header: 'Status', accessor: (a) => a.status },
    { header: 'Risk Score', accessor: (a) => a.riskScore },
    { header: 'Findings', accessor: (a) => a.findingCount },
  ],

  copyAction: {
    label: 'Copy Name',
    getValue: (asset) => asset.name,
  },

  defaultSort: { field: 'name', direction: 'asc' },
}
