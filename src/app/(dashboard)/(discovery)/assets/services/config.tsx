'use client'

import { Badge } from '@/components/ui/badge'
import { Server, Network, CheckCircle, AlertTriangle, Shield } from 'lucide-react'
import type { AssetPageConfig } from '@/features/assets/types/page-config.types'

export const servicesConfig: AssetPageConfig = {
  type: 'service',
  label: 'Service',
  labelPlural: 'Services',
  description: 'Manage your network services and ports',
  icon: Server,
  iconColor: 'text-blue-500',
  gradientFrom: 'from-blue-500/20',
  gradientVia: 'via-blue-500/10',

  columns: [
    {
      accessorKey: 'metadata.port',
      header: 'Port',
      cell: ({ row }) => {
        const port = row.original.metadata.port
        if (!port) return '-'
        return (
          <Badge variant="outline" className="font-mono">
            {port}
          </Badge>
        )
      },
    },
    {
      accessorKey: 'metadata.protocol',
      header: 'Protocol',
      cell: ({ row }) => {
        const protocol = (row.original.metadata.protocol as string)?.toUpperCase() || 'TCP'
        return (
          <Badge
            variant="secondary"
            className={protocol === 'UDP' ? 'bg-purple-500/10 text-purple-500' : ''}
          >
            {protocol}
          </Badge>
        )
      },
    },
    {
      accessorKey: 'metadata.version',
      header: 'Version',
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.metadata.version || '-'}
        </span>
      ),
    },
    {
      id: 'technology',
      header: 'Technology',
      cell: ({ row }) => {
        const tech = (row.original.metadata.technology as string[]) || []
        if (tech.length === 0) return <span className="text-muted-foreground">-</span>
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
  ],

  formFields: [
    {
      name: 'name',
      label: 'Service Name',
      type: 'text',
      placeholder: 'e.g., api.example.com',
      required: true,
    },
    {
      name: 'description',
      label: 'Description',
      type: 'textarea',
      placeholder: 'Optional description',
    },
    {
      name: 'port',
      label: 'Port',
      type: 'number',
      placeholder: '443',
      isMetadata: true,
      required: true,
    },
    {
      name: 'protocol',
      label: 'Protocol',
      type: 'select',
      isMetadata: true,
      defaultValue: 'tcp',
      options: [
        { label: 'TCP', value: 'tcp' },
        { label: 'UDP', value: 'udp' },
      ],
    },
    {
      name: 'version',
      label: 'Version',
      type: 'text',
      placeholder: 'e.g., OpenSSH 8.4',
      isMetadata: true,
    },
    {
      name: 'technology',
      label: 'Technology',
      type: 'tags',
      placeholder: 'Nginx, Node.js, React',
      isMetadata: true,
    },
    {
      name: 'banner',
      label: 'Banner',
      type: 'textarea',
      placeholder: 'Service banner response',
      isMetadata: true,
    },
    { name: 'tags', label: 'Tags', type: 'tags', placeholder: 'production, critical' },
  ],

  statsCards: [
    {
      title: 'Active',
      icon: CheckCircle,
      compute: (assets) => assets.filter((a) => a.status === 'active').length,
      variant: 'success',
    },
    {
      title: 'TCP Services',
      icon: Network,
      compute: (assets) =>
        assets.filter((a) => (a.metadata.protocol as string)?.toLowerCase() === 'tcp').length,
    },
    {
      title: 'With Findings',
      icon: AlertTriangle,
      compute: (assets) => assets.filter((a) => a.findingCount > 0).length,
      variant: 'warning',
    },
  ],

  customFilter: {
    label: 'Protocol',
    options: [
      { label: 'TCP', value: 'tcp' },
      { label: 'UDP', value: 'udp' },
    ],
    filterFn: (asset, value) => (asset.metadata.protocol as string)?.toLowerCase() === value,
  },

  copyAction: {
    label: 'Copy Service Info',
    getValue: (asset) => `${asset.name}:${asset.metadata.port}/${asset.metadata.protocol || 'tcp'}`,
  },

  detailStats: [
    {
      icon: Network,
      iconBg: 'bg-blue-500/10',
      iconColor: 'text-blue-500',
      label: 'Port',
      getValue: (asset) => asset.metadata.port || '-',
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
      title: 'Service Information',
      fields: [
        {
          label: 'Protocol',
          getValue: (asset) => (
            <Badge variant="secondary">
              {(asset.metadata.protocol as string)?.toUpperCase() || 'TCP'}
            </Badge>
          ),
        },
        {
          label: 'Version',
          getValue: (asset) => asset.metadata.version || '-',
        },
        {
          label: 'Banner',
          fullWidth: true,
          getValue: (asset) => {
            const banner = asset.metadata.banner as string
            if (!banner) return '-'
            return (
              <code className="block text-xs bg-muted p-2 rounded overflow-x-auto">{banner}</code>
            )
          },
        },
      ],
    },
    {
      title: 'Technology Stack',
      fields: [
        {
          label: 'Technologies',
          fullWidth: true,
          getValue: (asset) => {
            const tech = (asset.metadata.technology as string[]) || []
            if (tech.length === 0) return '-'
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
        },
      ],
    },
  ],

  exportFields: [
    { header: 'Name', accessor: (a) => a.name },
    { header: 'Port', accessor: (a) => a.metadata.port },
    { header: 'Protocol', accessor: (a) => a.metadata.protocol || 'tcp' },
    { header: 'Version', accessor: (a) => a.metadata.version || '' },
    {
      header: 'Technologies',
      accessor: (a) => ((a.metadata.technology as string[]) || []).join(';'),
    },
    { header: 'Status', accessor: (a) => a.status },
    { header: 'Risk Score', accessor: (a) => a.riskScore },
    { header: 'Findings', accessor: (a) => a.findingCount },
  ],

  includeGroupSelect: true,
}
