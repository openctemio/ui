import type { ColumnDef } from '@tanstack/react-table'
import type { AssetPageConfig } from '@/features/assets/types/page-config.types'
import type { Asset } from '@/features/assets'
import { Badge } from '@/components/ui/badge'
import { MonitorSmartphone, ShieldCheck, ShieldX, AlertTriangle, Shield, Zap } from 'lucide-react'

const columns: ColumnDef<Asset>[] = [
  {
    id: 'technology',
    header: 'Technology',
    cell: ({ row }) => {
      const raw = row.original.metadata.technology
      const tech: string[] = Array.isArray(raw) ? raw : raw ? [String(raw)] : []
      return (
        <div className="flex flex-wrap gap-1 max-w-[150px]">
          {tech.slice(0, 2).map((t) => (
            <Badge key={t} variant="outline" className="text-xs">
              {t}
            </Badge>
          ))}
          {tech.length > 2 && (
            <Badge variant="outline" className="text-xs">
              +{tech.length - 2}
            </Badge>
          )}
        </div>
      )
    },
  },
  {
    id: 'ssl',
    header: 'SSL',
    cell: ({ row }) =>
      row.original.metadata.ssl ? (
        <div className="flex items-center gap-1 text-green-500">
          <ShieldCheck className="h-4 w-4" />
          <span className="text-xs">Secure</span>
        </div>
      ) : (
        <div className="flex items-center gap-1 text-red-500">
          <ShieldX className="h-4 w-4" />
          <span className="text-xs">Insecure</span>
        </div>
      ),
  },
  {
    id: 'httpStatus',
    header: 'Status Code',
    cell: ({ row }) => {
      const status = (row.original.metadata.httpStatus as number) || 200
      const statusClass =
        status >= 200 && status < 300
          ? 'text-green-500 bg-green-500/10'
          : status >= 300 && status < 400
            ? 'text-blue-500 bg-blue-500/10'
            : status >= 400 && status < 500
              ? 'text-orange-500 bg-orange-500/10'
              : 'text-red-500 bg-red-500/10'
      return (
        <Badge variant="outline" className={statusClass}>
          {status}
        </Badge>
      )
    },
  },
]

export const websitesConfig: AssetPageConfig = {
  type: 'application',
  subType: 'website',
  label: 'Website',
  labelPlural: 'Websites',
  description: 'Manage your web application assets',
  icon: MonitorSmartphone,
  iconColor: 'text-blue-500',
  gradientFrom: 'from-blue-500/20',
  gradientVia: 'via-blue-500/10',

  columns,

  formFields: [
    {
      name: 'name',
      label: 'URL',
      type: 'text',
      placeholder: 'https://example.com',
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
      name: 'technology',
      label: 'Technology (comma separated)',
      type: 'text',
      placeholder: 'React, Node.js, PostgreSQL',
      isMetadata: true,
    },
    {
      name: 'httpStatus',
      label: 'HTTP Status Code',
      type: 'number',
      placeholder: '200',
      isMetadata: true,
    },
    {
      name: 'responseTime',
      label: 'Response Time (ms)',
      type: 'number',
      placeholder: '150',
      isMetadata: true,
    },
    {
      name: 'server',
      label: 'Server',
      type: 'text',
      placeholder: 'nginx/1.21.0',
      isMetadata: true,
    },
    {
      name: 'ssl',
      label: 'SSL/TLS Enabled',
      type: 'boolean',
      isMetadata: true,
      defaultValue: true,
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
      // metadata.ssl isn't aggregated — current page only
      title: 'SSL Secure',
      icon: ShieldCheck,
      compute: (assets) => assets.filter((a) => a.metadata.ssl).length,
      variant: 'success',
    },
    {
      title: 'SSL Insecure',
      icon: ShieldX,
      compute: (assets) => assets.filter((a) => !a.metadata.ssl).length,
      variant: 'danger',
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
    {
      icon: Zap,
      iconBg: 'bg-blue-500/10',
      iconColor: 'text-blue-500',
      label: 'Response (ms)',
      getValue: (asset) => (asset.metadata.responseTime as number) || '-',
    },
  ],

  detailSections: [
    {
      title: 'Website Information',
      fields: [
        {
          label: 'HTTP Status',
          getValue: (asset) => {
            const status = (asset.metadata.httpStatus as number) || 200
            return (
              <Badge variant="outline" className={status < 400 ? 'text-green-500' : 'text-red-500'}>
                {status}
              </Badge>
            )
          },
        },
        {
          label: 'SSL Certificate',
          getValue: (asset) => (asset.metadata.ssl ? 'Valid' : 'Invalid/Missing'),
        },
        {
          label: 'Server',
          getValue: (asset) => (asset.metadata.server as string) || '-',
          fullWidth: true,
        },
      ],
    },
    {
      title: 'Technology Stack',
      fields: [
        {
          label: 'Technologies',
          getValue: (asset) => {
            const tech = (() => {
              const r = asset.metadata.technology
              return Array.isArray(r) ? r : r ? [String(r)] : []
            })()
            if (!tech.length) return '-'
            return (
              <div className="flex flex-wrap gap-2">
                {tech.map((t) => (
                  <Badge key={t} variant="secondary">
                    {t}
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
    { header: 'URL', accessor: (a) => a.name },
    {
      header: 'Technology',
      accessor: (a) => {
        const raw = a.metadata.technology
        const tech: string[] = Array.isArray(raw)
          ? raw
          : raw
            ? String(raw)
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean)
            : []
        return tech.join(';')
      },
    },
    { header: 'SSL', accessor: (a) => (a.metadata.ssl ? 'Yes' : 'No') },
    { header: 'HTTP Status', accessor: (a) => (a.metadata.httpStatus as number) || 200 },
    { header: 'Status', accessor: (a) => a.status },
    { header: 'Risk Score', accessor: (a) => a.riskScore },
    { header: 'Findings', accessor: (a) => a.findingCount },
  ],

  copyAction: {
    label: 'Copy URL',
    getValue: (asset) => asset.name,
  },

  customFilter: {
    label: 'SSL Status',
    options: [
      { label: 'Secure', value: 'secure' },
      { label: 'Insecure', value: 'insecure' },
    ],
    filterFn: (asset, value) => (value === 'secure' ? !!asset.metadata.ssl : !asset.metadata.ssl),
  },
}
