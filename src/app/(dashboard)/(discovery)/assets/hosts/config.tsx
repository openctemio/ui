'use client'

import { Badge } from '@/components/ui/badge'
import { Server, CheckCircle, Network, AlertTriangle, Shield, Cpu, HardDrive } from 'lucide-react'
import type { AssetPageConfig } from '@/features/assets/types/page-config.types'
import type { Asset } from '@/features/assets'

export const hostsConfig: AssetPageConfig = {
  type: 'host',
  label: 'Host',
  labelPlural: 'Hosts',
  description: 'Manage host assets in your infrastructure',
  icon: Server,
  iconColor: 'text-purple-500',
  gradientFrom: 'from-purple-500/20',
  gradientVia: 'via-purple-500/10',

  columns: [
    {
      accessorKey: 'metadata.os',
      header: 'OS',
      cell: ({ row }) => {
        const os = row.original.metadata.os as string
        const version = row.original.metadata.osVersion as string
        return (
          <div>
            <p className="text-sm">{os || '-'}</p>
            {version && <p className="text-xs text-muted-foreground">{version}</p>}
          </div>
        )
      },
    },
    {
      accessorKey: 'metadata.cpuCores',
      header: 'Resources',
      cell: ({ row }) => {
        const cpu = row.original.metadata.cpuCores
        const mem = row.original.metadata.memoryGB
        return (
          <div className="flex flex-wrap items-center gap-2">
            {cpu && (
              <Badge variant="outline" className="gap-1">
                <Cpu className="h-3 w-3" />
                {cpu}
              </Badge>
            )}
            {mem && (
              <Badge variant="outline" className="gap-1">
                <HardDrive className="h-3 w-3" />
                {mem}GB
              </Badge>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: 'metadata.openPorts',
      header: 'Ports',
      cell: ({ row }) => {
        const ports = row.original.metadata.openPorts as string[] | undefined
        if (!ports || ports.length === 0) return <span className="text-muted-foreground">-</span>
        return (
          <div className="flex flex-wrap gap-1">
            {ports.slice(0, 3).map((port: string) => (
              <Badge key={port} variant="secondary" className="text-xs">
                {port}
              </Badge>
            ))}
            {ports.length > 3 && (
              <Badge variant="secondary" className="text-xs">
                +{ports.length - 3}
              </Badge>
            )}
          </div>
        )
      },
    },
  ],

  formFields: [
    { name: 'name', label: 'Host Name', type: 'text', placeholder: 'prod-web-01', required: true },
    {
      name: 'ip',
      label: 'IP Address',
      type: 'text',
      placeholder: '192.168.1.100',
      required: true,
      isMetadata: true,
    },
    {
      name: 'hostname',
      label: 'Hostname',
      type: 'text',
      placeholder: 'prod-web-01.internal.local',
      isMetadata: true,
      fullWidth: true,
    },
    {
      name: 'description',
      label: 'Description',
      type: 'textarea',
      placeholder: 'Optional description',
      fullWidth: true,
    },
    {
      name: 'os',
      label: 'Operating System',
      type: 'text',
      placeholder: 'Ubuntu, Windows Server...',
      isMetadata: true,
    },
    {
      name: 'osVersion',
      label: 'OS Version',
      type: 'text',
      placeholder: '22.04 LTS, 2019...',
      isMetadata: true,
    },
    {
      name: 'architecture',
      label: 'Architecture',
      type: 'select',
      isMetadata: true,
      defaultValue: 'x64',
      options: [
        { label: 'x64', value: 'x64' },
        { label: 'x86', value: 'x86' },
        { label: 'ARM64', value: 'arm64' },
      ],
    },
    { name: 'cpuCores', label: 'CPU Cores', type: 'number', placeholder: '8', isMetadata: true },
    { name: 'memoryGB', label: 'Memory (GB)', type: 'number', placeholder: '32', isMetadata: true },
    {
      name: 'isVirtual',
      label: 'Virtual Machine',
      type: 'boolean',
      isMetadata: true,
      defaultValue: false,
    },
    {
      name: 'hypervisor',
      label: 'Hypervisor',
      type: 'text',
      placeholder: 'VMware, KVM...',
      isMetadata: true,
    },
    {
      name: 'openPorts',
      label: 'Open Ports (comma separated)',
      type: 'text',
      placeholder: '22, 80, 443',
      isMetadata: true,
    },
    { name: 'tags', label: 'Tags', type: 'tags', placeholder: 'production, web, critical' },
  ],

  statsCards: [
    {
      title: 'Active',
      icon: CheckCircle,
      compute: (assets: Asset[]) => assets.filter((a) => a.status === 'active').length,
      variant: 'success',
    },
    {
      title: 'Virtual',
      icon: Network,
      compute: (assets: Asset[]) => assets.filter((a) => a.metadata.isVirtual).length,
    },
    {
      title: 'With Findings',
      icon: AlertTriangle,
      compute: (assets: Asset[]) => assets.filter((a) => a.findingCount > 0).length,
      variant: 'warning',
    },
  ],

  customFilter: {
    label: 'OS',
    options: [
      { label: 'Linux', value: 'linux' },
      { label: 'Windows', value: 'windows' },
      { label: 'macOS', value: 'macos' },
    ],
    filterFn: (asset: Asset, value: string) => {
      const os = (asset.metadata.os as string)?.toLowerCase() || ''
      if (value === 'linux')
        return (
          os.includes('ubuntu') ||
          os.includes('centos') ||
          os.includes('debian') ||
          os.includes('linux')
        )
      if (value === 'windows') return os.includes('windows')
      if (value === 'macos') return os.includes('mac') || os.includes('darwin')
      return true
    },
  },

  copyAction: {
    label: 'Copy IP',
    getValue: (asset: Asset) => (asset.metadata.ip as string) || asset.name,
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
      title: 'System Information',
      fields: [
        {
          label: 'Hostname',
          getValue: (asset: Asset) => (asset.metadata.hostname as string) || '-',
        },
        {
          label: 'Operating System',
          getValue: (asset: Asset) =>
            `${(asset.metadata.os as string) || ''} ${(asset.metadata.osVersion as string) || ''}`.trim() ||
            '-',
        },
        {
          label: 'Architecture',
          getValue: (asset: Asset) => (asset.metadata.architecture as string) || '-',
        },
        {
          label: 'Type',
          getValue: (asset: Asset) => {
            const isVirtual = asset.metadata.isVirtual
            const hypervisor = asset.metadata.hypervisor as string
            return (
              <span>
                {isVirtual ? 'Virtual' : 'Physical'}
                {hypervisor && ` (${hypervisor})`}
              </span>
            )
          },
        },
      ],
    },
    {
      title: 'Resources',
      fields: [
        {
          label: 'CPU Cores',
          getValue: (asset: Asset) => {
            const cpu = asset.metadata.cpuCores
            if (!cpu) return '-'
            return (
              <div className="flex items-center gap-2">
                <Cpu className="h-4 w-4 text-blue-500" />
                <span className="font-bold">{cpu}</span>
              </div>
            )
          },
        },
        {
          label: 'Memory',
          getValue: (asset: Asset) => {
            const mem = asset.metadata.memoryGB
            if (!mem) return '-'
            return (
              <div className="flex items-center gap-2">
                <HardDrive className="h-4 w-4 text-green-500" />
                <span className="font-bold">{mem} GB</span>
              </div>
            )
          },
        },
      ],
    },
    {
      title: 'Open Ports',
      fields: [
        {
          label: 'Ports',
          fullWidth: true,
          getValue: (asset: Asset) => {
            const ports = asset.metadata.openPorts as string[] | undefined
            if (!ports || ports.length === 0)
              return <span className="text-muted-foreground">None</span>
            return (
              <div className="flex flex-wrap gap-1">
                {ports.map((port: string) => (
                  <Badge key={port} variant="outline" className="text-xs">
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
    { header: 'Name', accessor: (a: Asset) => a.name },
    { header: 'IP', accessor: (a: Asset) => a.metadata.ip || '' },
    { header: 'Hostname', accessor: (a: Asset) => a.metadata.hostname || '' },
    { header: 'OS', accessor: (a: Asset) => a.metadata.os || '' },
    { header: 'Version', accessor: (a: Asset) => a.metadata.osVersion || '' },
    { header: 'CPU', accessor: (a: Asset) => a.metadata.cpuCores || '' },
    { header: 'Memory', accessor: (a: Asset) => a.metadata.memoryGB || '' },
    { header: 'Status', accessor: (a: Asset) => a.status },
    { header: 'Risk Score', accessor: (a: Asset) => a.riskScore },
    { header: 'Findings', accessor: (a: Asset) => a.findingCount },
  ],

  includeGroupSelect: true,
}
