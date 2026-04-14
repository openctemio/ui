'use client'

import { Badge } from '@/components/ui/badge'
import {
  Server,
  CheckCircle,
  AlertTriangle,
  Shield,
  Cpu,
  HardDrive,
  Globe,
  Monitor,
} from 'lucide-react'
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
      // IP column: supports both legacy metadata.ip (string) and
      // standardized metadata.ip_addresses (array).
      accessorKey: 'metadata.ip',
      header: 'IP',
      cell: ({ row }) => {
        const meta = row.original.metadata as Record<string, unknown>
        // Collect IPs from all possible sources
        const ips: string[] = []
        // Standard array format
        if (Array.isArray(meta.ip_addresses)) {
          ips.push(...(meta.ip_addresses as string[]))
        }
        // Legacy single IP
        if (typeof meta.ip === 'string' && meta.ip && !ips.includes(meta.ip)) {
          ips.push(meta.ip)
        }
        // Extra IPs
        for (const key of ['public_ip', 'ipv6', 'private_ip']) {
          const v = meta[key]
          if (typeof v === 'string' && v && !ips.includes(v)) {
            ips.push(v)
          }
        }
        if (ips.length === 0) {
          return <span className="text-muted-foreground">-</span>
        }
        return (
          <div className="max-w-[200px]" title={ips.join('\n')}>
            <p className="text-sm font-mono truncate">{ips[0]}</p>
            {ips.length > 1 && (
              <p className="text-xs text-muted-foreground font-mono truncate">
                +{ips.length - 1} more
              </p>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: 'metadata.os',
      header: 'OS',
      cell: ({ row }) => {
        const meta = row.original.metadata as Record<string, unknown>
        const os = (meta.os as string) || ''
        const version = (meta.os_version as string) || ''
        const fullLabel = [os, version].filter(Boolean).join(' ')
        return (
          <div className="max-w-[180px]" title={fullLabel}>
            <p className="text-sm truncate">{os || '-'}</p>
            {version && <p className="text-xs text-muted-foreground truncate">{version}</p>}
          </div>
        )
      },
    },
    {
      accessorKey: 'metadata.cpu_cores',
      header: 'Resources',
      cell: ({ row }) => {
        const meta = row.original.metadata as Record<string, unknown>
        const cpu = String(meta.cpu_cores || '')
        const mem = String(meta.memory_gb || '')
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
      accessorKey: 'metadata.arch',
      header: 'Arch',
      cell: ({ row }) => {
        const arch = (row.original.metadata as Record<string, unknown>).arch as string
        if (!arch) return <span className="text-muted-foreground">-</span>
        return (
          <Badge variant="outline" className="text-xs font-mono">
            {arch}
          </Badge>
        )
      },
    },
    {
      accessorKey: 'metadata.open_ports',
      header: 'Ports',
      cell: ({ row }) => {
        const meta = row.original.metadata as Record<string, unknown>
        const raw = meta.open_ports
        const ports: string[] = Array.isArray(raw)
          ? raw.map(String)
          : raw
            ? String(raw)
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean)
            : []
        if (ports.length === 0) return <span className="text-muted-foreground">-</span>
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
      name: 'os_version',
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
    { name: 'cpu_cores', label: 'CPU Cores', type: 'number', placeholder: '8', isMetadata: true },
    {
      name: 'memory_gb',
      label: 'Memory (GB)',
      type: 'number',
      placeholder: '32',
      isMetadata: true,
    },
    {
      name: 'is_virtual',
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
      name: 'open_ports',
      label: 'Open Ports (comma separated)',
      type: 'text',
      placeholder: '22, 80, 443',
      isMetadata: true,
    },
    { name: 'tags', label: 'Tags', type: 'tags', placeholder: 'production, web, critical' },
  ],

  countBy: ['is_virtual'],

  statsCards: [
    {
      title: 'Active',
      icon: CheckCircle,
      compute: (_assets, stats) => stats.byStatus.active ?? 0,
      variant: 'success',
    },
    {
      title: 'Virtual',
      icon: Monitor,
      compute: (_assets, stats) => stats.metadataCounts?.is_virtual?.true ?? 0,
    },
    {
      title: 'With Findings',
      icon: AlertTriangle,
      compute: (_assets, stats) => stats.withFindings,
      variant: 'warning',
    },
  ],

  customFilter: {
    label: 'OS',
    options: [
      { label: 'Linux', value: 'linux' },
      { label: 'Windows', value: 'windows' },
    ],
    filterFn: (asset: Asset, value: string) => {
      const meta = asset.metadata as Record<string, unknown>
      const os = ((meta.os as string) || '').toLowerCase()
      if (value === 'linux')
        return (
          os.includes('ubuntu') ||
          os.includes('centos') ||
          os.includes('debian') ||
          os.includes('linux')
        )
      if (value === 'windows') return os.includes('windows')
      return true
    },
  },

  copyAction: {
    label: 'Copy IP',
    getValue: (asset: Asset) => {
      const ips = (asset.metadata as Record<string, unknown>).ip_addresses as string[] | undefined
      if (ips && ips.length > 0) return ips.join(', ')
      return (asset.metadata.ip as string) || asset.name
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
      title: 'System Information',
      fields: [
        {
          label: 'IP Addresses',
          getValue: (asset: Asset) => {
            // Support both standard ip_addresses array and legacy ip string
            const ips: string[] = []
            if (Array.isArray((asset.metadata as Record<string, unknown>).ip_addresses)) {
              ips.push(...((asset.metadata as Record<string, unknown>).ip_addresses as string[]))
            }
            const legacyIp = asset.metadata.ip as string | undefined
            if (legacyIp && !ips.includes(legacyIp)) {
              ips.push(legacyIp)
            }
            if (ips.length === 0) return <span className="text-muted-foreground">-</span>
            return (
              <div className="space-y-1">
                {ips.map((ip) => (
                  <div key={ip} className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-purple-500 shrink-0" />
                    <span className="font-mono font-medium text-sm">{ip}</span>
                  </div>
                ))}
              </div>
            )
          },
        },
        {
          label: 'Hostname',
          getValue: (asset: Asset) => (asset.metadata.hostname as string) || '-',
        },
        {
          label: 'Operating System',
          getValue: (asset: Asset) => {
            const meta = asset.metadata as Record<string, unknown>
            const os = (meta.os as string) || ''
            const version = (meta.os_version as string) || ''
            return `${os} ${version}`.trim() || '-'
          },
        },
        {
          label: 'Architecture',
          getValue: (asset: Asset) => {
            const meta = asset.metadata as Record<string, unknown>
            return (meta.architecture as string) || (meta.arch as string) || '-'
          },
        },
        {
          label: 'Type',
          getValue: (asset: Asset) => {
            const meta = asset.metadata as Record<string, unknown>
            const isVirtual = meta.is_virtual
            const hypervisor = (meta.hypervisor as string) || ''
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
            const meta = asset.metadata as Record<string, unknown>
            const cpu = String(meta.cpu_cores || '')
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
            const meta = asset.metadata as Record<string, unknown>
            const mem = String(meta.memory_gb || '')
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
            const meta = asset.metadata as Record<string, unknown>
            const raw = meta.open_ports
            const ports: string[] = Array.isArray(raw)
              ? raw.map(String)
              : raw
                ? String(raw)
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean)
                : []
            if (ports.length === 0) return <span className="text-muted-foreground">None</span>
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
    {
      header: 'IP',
      accessor: (a: Asset) => {
        const m = a.metadata as Record<string, unknown>
        return (m.ip as string) || ''
      },
    },
    {
      header: 'Hostname',
      accessor: (a: Asset) => {
        const m = a.metadata as Record<string, unknown>
        return (m.hostname as string) || ''
      },
    },
    {
      header: 'OS',
      accessor: (a: Asset) => {
        const m = a.metadata as Record<string, unknown>
        return (m.os as string) || ''
      },
    },
    {
      header: 'Version',
      accessor: (a: Asset) => {
        const m = a.metadata as Record<string, unknown>
        return (m.os_version as string) || ''
      },
    },
    {
      header: 'CPU',
      accessor: (a: Asset) => {
        const m = a.metadata as Record<string, unknown>
        return (m.cpu_cores || '') as string
      },
    },
    {
      header: 'Memory',
      accessor: (a: Asset) => {
        const m = a.metadata as Record<string, unknown>
        return (m.memory_gb || '') as string
      },
    },
    { header: 'Status', accessor: (a: Asset) => a.status },
    { header: 'Risk Score', accessor: (a: Asset) => a.riskScore },
    { header: 'Findings', accessor: (a: Asset) => a.findingCount },
  ],

  includeGroupSelect: true,
}
