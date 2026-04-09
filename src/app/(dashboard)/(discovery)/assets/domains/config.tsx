'use client'

import type { ColumnDef } from '@tanstack/react-table'
import type { AssetPageConfig } from '@/features/assets/types/page-config.types'
import type { Asset } from '@/features/assets'
import { flattenDomainTreeForTable, type DomainTableRow } from '@/features/assets'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  Globe,
  CheckCircle,
  Clock,
  AlertTriangle,
  Shield,
  CornerDownRight,
  ChevronRight,
} from 'lucide-react'

export interface DomainsConfigOptions {
  /**
   * Set of root domain names that are currently expanded. `null`
   * means "always show every row" — used when the user is filtering
   * (search / tags) so query results aren't hidden by a collapsed
   * parent.
   */
  expandedRoots: Set<string> | null
  /** Toggle expansion for a single root domain. */
  toggleRoot: (rootName: string) => void
}

/**
 * Build the AssetPage config for the Domains page. The shape is the
 * same as the previous static export — the only difference is that
 * `dataTransform` and the type column close over the page's expansion
 * state, so the table can collapse/expand without AssetPage knowing
 * about the tree.
 */
export function buildDomainsConfig({
  expandedRoots,
  toggleRoot,
}: DomainsConfigOptions): AssetPageConfig {
  const isExpanded = (rootName: string) =>
    expandedRoots === null ? true : expandedRoots.has(rootName)

  const columns: ColumnDef<Asset>[] = [
    {
      id: 'hierarchy',
      header: 'Type',
      cell: ({ row }) => {
        const domainRow = row.original as DomainTableRow
        const level = '_level' in domainRow ? domainRow._level : 0
        const isRoot = '_isRoot' in domainRow ? domainRow._isRoot : true
        const subdomainCount = '_subdomainCount' in domainRow ? domainRow._subdomainCount : 0
        const expanded = isExpanded(domainRow._rootDomain ?? domainRow.name)
        const hasChildren = isRoot && subdomainCount > 0

        return (
          <div className="flex items-center gap-1.5">
            {/*
              Indentation rail for subdomain rows. The corner-arrow
              still gives the visual cue that this row belongs to the
              root above it.
            */}
            {level > 0 && (
              <div className="flex items-center" style={{ width: `${level * 16}px` }}>
                <CornerDownRight className="h-3 w-3 text-muted-foreground/50 ml-auto" />
              </div>
            )}

            {/*
              Chevron toggle for root rows that have subdomains. We
              don't render anything for childless roots so the type
              column doesn't shift around. The chevron is wrapped in
              a button with stopPropagation so toggling expansion
              doesn't also open the asset detail sheet (which is
              triggered by row click).
            */}
            {hasChildren ? (
              <button
                type="button"
                aria-label={expanded ? 'Collapse subdomains' : 'Expand subdomains'}
                aria-expanded={expanded}
                onClick={(e) => {
                  e.stopPropagation()
                  toggleRoot(domainRow._rootDomain ?? domainRow.name)
                }}
                className="flex h-5 w-5 items-center justify-center rounded hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
              >
                <ChevronRight
                  className={cn('h-3.5 w-3.5 transition-transform', expanded && 'rotate-90')}
                />
              </button>
            ) : (
              isRoot && <span className="inline-block w-5" />
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

  return {
    type: 'domain',
    label: 'Domain',
    labelPlural: 'Domains',
    description: 'Manage your domain assets and track domain hierarchy',
    icon: Globe,
    iconColor: 'text-blue-500',
    gradientFrom: 'from-blue-500/20',
    gradientVia: 'via-blue-500/10',

    // Build the full flat list, then drop subdomains whose root is
    // collapsed. When the page passes `expandedRoots: null` (filter
    // active) we keep every row so search results aren't hidden.
    dataTransform: (assets) => {
      const allRows = flattenDomainTreeForTable(assets)
      if (expandedRoots === null) {
        return allRows as Asset[]
      }
      return allRows.filter((row) => row._isRoot || expandedRoots.has(row._rootDomain)) as Asset[]
    },

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

    // Intentionally NO defaultSort. The shared AssetPage sorts the rows
    // by `row.original.name` which would scramble the parent/child
    // grouping (e.g. "a.ipas.com.vn" < "ipas.com.vn" alphabetically, so
    // the subdomain ends up ABOVE its root). Without a default sort the
    // table preserves the order returned by `flattenDomainTreeForTable`,
    // which is already grouped: roots in alpha order, each followed by
    // its subs in alpha order. The user can still click the Name column
    // header to opt in to a flat alphabetical sort if they explicitly
    // want it, but the default view stays hierarchical.
  }
}
