import { Badge } from '@/components/ui/badge'
import type { Asset } from '@/features/assets'
import type { AssetPageConfig } from '@/features/assets/types/page-config.types'
import { Database, Lock, Save, HardDrive, CheckCircle, Shield, AlertTriangle } from 'lucide-react'

const engineColors: Record<string, string> = {
  mysql: 'bg-blue-500/10 text-blue-500',
  postgresql: 'bg-indigo-500/10 text-indigo-500',
  mongodb: 'bg-green-500/10 text-green-500',
  redis: 'bg-red-500/10 text-red-500',
  elasticsearch: 'bg-yellow-500/10 text-yellow-500',
  mssql: 'bg-purple-500/10 text-purple-500',
  oracle: 'bg-orange-500/10 text-orange-500',
}

export const databasesConfig: AssetPageConfig = {
  type: 'database',
  label: 'Database',
  labelPlural: 'Databases',
  description: 'Manage your database assets',
  icon: Database,
  iconColor: 'text-indigo-500',
  gradientFrom: 'from-indigo-500/20',
  gradientVia: 'via-indigo-500/10',

  columns: [
    {
      accessorKey: 'metadata.engine',
      header: 'Engine',
      cell: ({ row }) => {
        const engine = row.original.metadata.engine as string
        const version = row.original.metadata.db_version as string
        return (
          <div>
            <Badge variant="secondary" className={engineColors[engine || 'postgresql']}>
              {engine || 'postgresql'}
            </Badge>
            {version && <p className="text-xs text-muted-foreground mt-1">{version}</p>}
          </div>
        )
      },
    },
    {
      accessorKey: 'metadata.size_gb',
      header: 'Size',
      cell: ({ row }) => {
        const size = row.original.metadata.size_gb as unknown as string
        return (
          <div className="flex items-center gap-1">
            <HardDrive className="h-3 w-3 text-muted-foreground" />
            <span className="text-sm">{size ? `${size} GB` : '-'}</span>
          </div>
        )
      },
    },
    {
      accessorKey: 'metadata.encryption',
      header: 'Security',
      cell: ({ row }) => {
        const encrypted = row.original.metadata.encryption as boolean
        const backup = row.original.metadata.backupEnabled as boolean
        return (
          <div className="flex items-center gap-1">
            {encrypted && (
              <Badge variant="outline" className="gap-1 text-green-500 border-green-500/30">
                <Lock className="h-3 w-3" />
              </Badge>
            )}
            {backup && (
              <Badge variant="outline" className="gap-1 text-blue-500 border-blue-500/30">
                <Save className="h-3 w-3" />
              </Badge>
            )}
            {!encrypted && !backup && <span className="text-muted-foreground">-</span>}
          </div>
        )
      },
    },
  ],

  statsCards: [
    {
      title: 'Active',
      icon: CheckCircle,
      compute: (_assets, stats) => stats.byStatus.active ?? 0,
      variant: 'success',
    },
    {
      // metadata.encryption isn't aggregated — current page only
      title: 'Encrypted',
      icon: Lock,
      compute: (assets) => assets.filter((a) => a.metadata.encryption).length,
    },
    {
      // metadata.backupEnabled isn't aggregated — current page only
      title: 'With Backup',
      icon: Save,
      compute: (assets) => assets.filter((a) => a.metadata.backupEnabled).length,
    },
  ],

  formFields: [
    {
      name: 'name',
      label: 'Database Name',
      type: 'text',
      placeholder: 'prod-mysql-01',
      required: true,
    },
    {
      name: 'engine',
      label: 'Engine',
      type: 'select',
      required: true,
      isMetadata: true,
      defaultValue: 'postgresql',
      options: [
        { label: 'MySQL', value: 'mysql' },
        { label: 'PostgreSQL', value: 'postgresql' },
        { label: 'MongoDB', value: 'mongodb' },
        { label: 'Redis', value: 'redis' },
        { label: 'Elasticsearch', value: 'elasticsearch' },
        { label: 'MS SQL Server', value: 'mssql' },
        { label: 'Oracle', value: 'oracle' },
      ],
    },
    {
      name: 'db_version',
      label: 'Version',
      type: 'text',
      placeholder: '8.0, 14.1, etc.',
      isMetadata: true,
    },
    {
      name: 'db_host',
      label: 'Host',
      type: 'text',
      placeholder: 'db.example.com',
      required: true,
      isMetadata: true,
    },
    {
      name: 'db_port',
      label: 'Port',
      type: 'number',
      placeholder: '3306, 5432...',
      isMetadata: true,
    },
    {
      name: 'description',
      label: 'Description',
      type: 'textarea',
      placeholder: 'Optional description',
      fullWidth: true,
    },
    {
      name: 'size_gb',
      label: 'Size (GB)',
      type: 'number',
      placeholder: '100',
      isMetadata: true,
    },
    {
      name: 'replication',
      label: 'Replication',
      type: 'select',
      isMetadata: true,
      defaultValue: 'single',
      options: [
        { label: 'Single', value: 'single' },
        { label: 'Replica Set', value: 'replica-set' },
        { label: 'Cluster', value: 'cluster' },
      ],
    },
    {
      name: 'encryption',
      label: 'Encryption Enabled',
      type: 'boolean',
      isMetadata: true,
      defaultValue: false,
    },
    {
      name: 'backupEnabled',
      label: 'Backup Enabled',
      type: 'boolean',
      isMetadata: true,
      defaultValue: false,
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
      title: 'Database Configuration',
      fields: [
        {
          label: 'Engine',
          getValue: (asset) => (
            <span className="capitalize">{(asset.metadata.engine as string) || '-'}</span>
          ),
        },
        {
          label: 'Version',
          getValue: (asset) => (asset.metadata.db_version as string) || '-',
        },
        {
          label: 'Size',
          getValue: (asset) => (asset.metadata.size_gb ? `${asset.metadata.size_gb} GB` : '-'),
        },
        {
          label: 'Replication',
          getValue: (asset) => (
            <span className="capitalize">{(asset.metadata.replication as string) || 'single'}</span>
          ),
        },
      ],
    },
    {
      title: 'Security & Backup',
      fields: [
        {
          label: 'Encryption',
          getValue: (asset) => (
            <div className="flex items-center gap-2">
              <Lock
                className={`h-4 w-4 ${asset.metadata.encryption ? 'text-green-500' : 'text-muted-foreground'}`}
              />
              <span>{asset.metadata.encryption ? 'Encrypted' : 'Not Encrypted'}</span>
            </div>
          ),
        },
        {
          label: 'Backup',
          getValue: (asset) => (
            <div className="flex items-center gap-2">
              <Save
                className={`h-4 w-4 ${asset.metadata.backupEnabled ? 'text-blue-500' : 'text-muted-foreground'}`}
              />
              <span>{asset.metadata.backupEnabled ? 'Enabled' : 'Disabled'}</span>
            </div>
          ),
        },
      ],
    },
  ],

  copyAction: {
    label: 'Copy Connection',
    getValue: (asset) => `${asset.metadata.db_host}:${asset.metadata.db_port}`,
  },

  exportFields: [
    { header: 'Name', accessor: (a: Asset) => a.name },
    { header: 'Engine', accessor: (a: Asset) => (a.metadata.engine as string) || '' },
    { header: 'Version', accessor: (a: Asset) => (a.metadata.db_version as string) || '' },
    { header: 'Host', accessor: (a: Asset) => (a.metadata.db_host as string) || '' },
    { header: 'Port', accessor: (a: Asset) => String(a.metadata.db_port ?? '') },
    { header: 'Size (GB)', accessor: (a: Asset) => String(a.metadata.size_gb ?? '') },
    {
      header: 'Encrypted',
      accessor: (a: Asset) => a.metadata.encryption,
      transform: (v: unknown) => (v ? 'Yes' : 'No'),
    },
    {
      header: 'Backup',
      accessor: (a: Asset) => a.metadata.backupEnabled,
      transform: (v: unknown) => (v ? 'Yes' : 'No'),
    },
    { header: 'Status', accessor: (a: Asset) => a.status },
    { header: 'Risk Score', accessor: (a: Asset) => a.riskScore },
  ],

  customFilter: {
    label: 'Engine',
    options: [
      { label: 'MySQL', value: 'mysql' },
      { label: 'PostgreSQL', value: 'postgresql' },
      { label: 'MongoDB', value: 'mongodb' },
      { label: 'Redis', value: 'redis' },
      { label: 'Elasticsearch', value: 'elasticsearch' },
      { label: 'MS SQL', value: 'mssql' },
      { label: 'Oracle', value: 'oracle' },
    ],
    filterFn: (asset, value) => (asset.metadata.engine as string) === value,
  },
}
