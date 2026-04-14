'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Smartphone,
  Apple,
  AlertTriangle,
  Shield,
  Download,
  Star,
  ExternalLink,
} from 'lucide-react'
import type { Asset } from '@/features/assets'
import type { AssetPageConfig } from '@/features/assets/types/page-config.types'

const platformLabels: Record<string, string> = {
  ios: 'iOS',
  android: 'Android',
  'cross-platform': 'Cross-Platform',
}

const getPlatformIcon = (platform: string) => {
  switch (platform) {
    case 'ios':
      return <Apple className="h-4 w-4" />
    case 'android':
    case 'cross-platform':
    default:
      return <Smartphone className="h-4 w-4" />
  }
}

const formatDownloads = (downloads?: number) => {
  if (!downloads) return 'N/A'
  if (downloads >= 1000000) return `${(downloads / 1000000).toFixed(1)}M`
  if (downloads >= 1000) return `${(downloads / 1000).toFixed(1)}K`
  return downloads.toString()
}

export const mobileConfig: AssetPageConfig = {
  type: 'application',
  subType: 'mobile_app',
  label: 'Mobile App',
  labelPlural: 'Mobile Apps',
  description: 'Manage your mobile application assets',
  icon: Smartphone,
  iconColor: 'text-violet-500',
  gradientFrom: 'from-violet-500/20',
  gradientVia: 'via-violet-500/10',

  columns: [
    {
      accessorKey: 'metadata.app_version',
      header: 'Version',
      cell: ({ row }) => {
        const meta = row.original.metadata as Record<string, unknown>
        const version = meta.app_version as string | undefined
        const build = meta.build_number as string | undefined
        return (
          <div>
            <span className="font-mono">{(version as string) || 'N/A'}</span>
            {build && <span className="text-muted-foreground text-sm"> ({build as string})</span>}
          </div>
        )
      },
    },
  ],

  formFields: [
    {
      name: 'name',
      label: 'App Name',
      type: 'text',
      placeholder: 'My Mobile App',
      required: true,
    },
    {
      name: 'description',
      label: 'Description',
      type: 'textarea',
      placeholder: 'Optional description',
    },
    {
      name: 'bundle_id',
      label: 'Bundle ID',
      type: 'text',
      placeholder: 'com.company.appname',
      isMetadata: true,
      required: true,
    },
    {
      name: 'platform',
      label: 'Platform',
      type: 'select',
      isMetadata: true,
      required: true,
      defaultValue: 'android',
      options: [
        { label: 'Android', value: 'android' },
        { label: 'iOS', value: 'ios' },
        { label: 'Cross-Platform', value: 'cross-platform' },
      ],
    },
    {
      name: 'app_version',
      label: 'Version',
      type: 'text',
      placeholder: '1.0.0',
      isMetadata: true,
    },
    {
      name: 'store_url',
      label: 'Store URL',
      type: 'text',
      placeholder: 'https://play.google.com/store/apps/...',
      isMetadata: true,
      fullWidth: true,
    },
    {
      name: 'tags',
      label: 'Tags',
      type: 'tags',
      placeholder: 'production, critical',
    },
  ],

  statsCards: [
    {
      // metadata.platform isn't aggregated by /assets/stats — current page only
      title: 'iOS Apps',
      icon: Apple,
      compute: (assets) => assets.filter((a) => (a.metadata.platform as string) === 'ios').length,
    },
    {
      title: 'Android Apps',
      icon: Smartphone,
      compute: (assets) =>
        assets.filter((a) => (a.metadata.platform as string) === 'android').length,
      variant: 'success',
    },
    {
      title: 'With Findings',
      icon: AlertTriangle,
      compute: (_assets, stats) => stats.withFindings,
      variant: 'warning',
    },
  ],

  customFilter: {
    label: 'Platform',
    options: [
      { label: 'iOS', value: 'ios' },
      { label: 'Android', value: 'android' },
      { label: 'Cross-Platform', value: 'cross-platform' },
    ],
    filterFn: (asset, value) => (asset.metadata.platform as string) === value,
  },

  copyAction: {
    label: 'Copy Bundle ID',
    getValue: (asset) => (asset.metadata.bundle_id as string) || asset.name,
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
      title: 'Platform Information',
      fields: [
        {
          label: 'Platform',
          getValue: (asset) => (
            <div className="flex items-center gap-2">
              {getPlatformIcon((asset.metadata.platform as string) || 'android')}
              <span>{platformLabels[(asset.metadata.platform as string) || 'android']}</span>
            </div>
          ),
        },
        {
          label: 'Version',
          getValue: (asset) => (
            <span className="font-mono">{(asset.metadata.app_version as string) || '-'}</span>
          ),
        },
        {
          label: 'Build Number',
          getValue: (asset) => (
            <span className="font-mono">{(asset.metadata.build_number as string) || '-'}</span>
          ),
        },
        {
          label: 'Bundle ID',
          getValue: (asset) => (
            <span className="font-mono text-xs break-all">
              {(asset.metadata.bundle_id as string) || '-'}
            </span>
          ),
        },
        {
          label: 'Min SDK',
          getValue: (asset) => (
            <span className="font-mono">{(asset.metadata.min_sdk_version as string) || '-'}</span>
          ),
        },
        {
          label: 'Target SDK',
          getValue: (asset) => (
            <span className="font-mono">
              {(asset.metadata.target_sdk_version as string) || '-'}
            </span>
          ),
        },
      ],
    },
    {
      title: 'Store Information',
      fields: [
        {
          label: 'Downloads',
          getValue: (asset) => (
            <div className="flex items-center gap-2">
              <Download className="h-4 w-4 text-blue-500" />
              <span className="font-bold">
                {formatDownloads(asset.metadata.downloads as number | undefined)}
              </span>
            </div>
          ),
        },
        {
          label: 'Rating',
          getValue: (asset) => (
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-yellow-500" />
              <span className="font-bold">
                {asset.metadata.rating != null ? Number(asset.metadata.rating).toFixed(1) : '-'}
              </span>
            </div>
          ),
        },
        {
          label: 'Last Release',
          getValue: (asset) => {
            const lastRelease = asset.metadata.last_release as string
            if (!lastRelease) return '-'
            return new Date(lastRelease).toLocaleDateString()
          },
        },
        {
          label: 'Store Link',
          getValue: (asset) => {
            const storeUrl = asset.metadata.store_url as string
            if (!storeUrl) return '-'
            return (
              <Button variant="outline" size="sm" onClick={() => window.open(storeUrl, '_blank')}>
                <ExternalLink className="mr-2 h-4 w-4" />
                Open in Store
              </Button>
            )
          },
        },
      ],
    },
    {
      title: 'Permissions',
      fields: [
        {
          label: 'App Permissions',
          fullWidth: true,
          getValue: (asset) => {
            const raw = asset.metadata.permissions
            const permissions: string[] = Array.isArray(raw)
              ? raw
              : raw
                ? String(raw)
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean)
                : []
            if (permissions.length === 0) return '-'
            return (
              <div className="flex flex-wrap gap-1">
                {permissions.map((permission: string, index: number) => (
                  <Badge key={index} variant="outline" className="text-xs font-mono">
                    {permission}
                  </Badge>
                ))}
              </div>
            )
          },
        },
      ],
    },
    {
      title: 'Third-party SDKs',
      fields: [
        {
          label: 'SDKs',
          fullWidth: true,
          getValue: (asset) => {
            const raw = asset.metadata.sdks
            const sdks: string[] = Array.isArray(raw)
              ? raw
              : raw
                ? String(raw)
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean)
                : []
            if (sdks.length === 0) return '-'
            return (
              <div className="flex flex-wrap gap-1">
                {sdks.map((sdk: string, index: number) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {sdk}
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
    { header: 'Name', accessor: (a: Asset) => a.name },
    {
      header: 'Bundle ID',
      accessor: (a: Asset) => (a.metadata.bundle_id as string) || '',
    },
    {
      header: 'Platform',
      accessor: (a: Asset) => (a.metadata.platform as string) || '',
    },
    {
      header: 'Version',
      accessor: (a: Asset) => (a.metadata.app_version as string) || '',
    },
    { header: 'Status', accessor: (a: Asset) => a.status },
    { header: 'Risk Score', accessor: (a: Asset) => a.riskScore },
    { header: 'Findings', accessor: (a: Asset) => a.findingCount },
  ],

  includeGroupSelect: true,
}
