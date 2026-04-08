'use client'

import { Badge } from '@/components/ui/badge'
import {
  Webhook,
  Lock,
  Shield,
  AlertTriangle,
  CheckCircle,
  Zap,
  Activity,
  ExternalLink,
} from 'lucide-react'
import { toast } from 'sonner'
import { sanitizeExternalUrl } from '@/lib/utils'
import type { AssetPageConfig } from '@/features/assets/types/page-config.types'

// ============================================
// Constants
// ============================================

const authTypeLabels: Record<string, string> = {
  none: 'No Auth',
  api_key: 'API Key',
  oauth2: 'OAuth 2.0',
  jwt: 'JWT',
  basic: 'Basic Auth',
  mtls: 'mTLS',
}

const apiTypeColors: Record<string, string> = {
  rest: 'bg-blue-500',
  graphql: 'bg-pink-500',
  grpc: 'bg-green-500',
  websocket: 'bg-purple-500',
  soap: 'bg-orange-500',
}

// ============================================
// Config
// ============================================

export const apisConfig: AssetPageConfig = {
  type: 'api',
  label: 'API',
  labelPlural: 'APIs',
  description: 'Manage your API assets and endpoints',
  icon: Webhook,
  iconColor: 'text-cyan-500',
  gradientFrom: 'from-cyan-500/20',
  gradientVia: 'via-cyan-500/10',

  columns: [
    {
      accessorKey: 'metadata.apiType',
      header: 'Type',
      cell: ({ row }) => {
        const apiType = row.original.metadata.apiType || 'rest'
        return (
          <div className="flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full ${apiTypeColors[apiType] || 'bg-gray-500'}`} />
            <Badge variant="outline" className="uppercase text-xs">
              {apiType}
            </Badge>
          </div>
        )
      },
    },
    {
      accessorKey: 'metadata.authType',
      header: 'Auth',
      cell: ({ row }) => {
        const authType = row.original.metadata.authType || 'none'
        return (
          <div className="flex items-center gap-1.5">
            <Lock className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-sm">{authTypeLabels[authType] || authType}</span>
          </div>
        )
      },
    },
    {
      accessorKey: 'metadata.endpointCount',
      header: 'Endpoints',
      cell: ({ row }) => (
        <Badge variant="secondary">{row.original.metadata.endpointCount ?? 0}</Badge>
      ),
    },
    {
      accessorKey: 'metadata.baseUrl',
      header: 'Base URL',
      cell: ({ row }) => {
        const url = row.original.metadata.baseUrl
        if (!url) return <span className="text-muted-foreground">-</span>
        return (
          <span className="text-xs text-muted-foreground truncate max-w-[200px] block">{url}</span>
        )
      },
    },
  ],

  formFields: [
    {
      name: 'name',
      label: 'API Name',
      type: 'text',
      placeholder: 'e.g., Payment API',
      required: true,
    },
    {
      name: 'apiType',
      label: 'API Type',
      type: 'select',
      isMetadata: true,
      defaultValue: 'rest',
      options: [
        { label: 'REST', value: 'rest' },
        { label: 'GraphQL', value: 'graphql' },
        { label: 'gRPC', value: 'grpc' },
        { label: 'WebSocket', value: 'websocket' },
        { label: 'SOAP', value: 'soap' },
      ],
    },
    {
      name: 'baseUrl',
      label: 'Base URL',
      type: 'text',
      placeholder: 'https://api.example.com/v1',
      isMetadata: true,
      required: true,
      fullWidth: true,
    },
    {
      name: 'version',
      label: 'Version',
      type: 'text',
      placeholder: '1.0.0',
      isMetadata: true,
    },
    {
      name: 'authType',
      label: 'Authentication',
      type: 'select',
      isMetadata: true,
      defaultValue: 'none',
      options: [
        { label: 'No Auth', value: 'none' },
        { label: 'API Key', value: 'api_key' },
        { label: 'OAuth 2.0', value: 'oauth2' },
        { label: 'JWT', value: 'jwt' },
        { label: 'Basic Auth', value: 'basic' },
        { label: 'mTLS', value: 'mtls' },
      ],
    },
    {
      name: 'description',
      label: 'Description',
      type: 'textarea',
      placeholder: 'Optional description',
      fullWidth: true,
    },
    {
      name: 'documentationUrl',
      label: 'Documentation URL',
      type: 'text',
      placeholder: 'https://docs.example.com',
      isMetadata: true,
      fullWidth: true,
    },
    {
      name: 'owner',
      label: 'Owner',
      type: 'text',
      placeholder: 'Team or person',
      isMetadata: true,
    },
    {
      name: 'team',
      label: 'Team',
      type: 'text',
      placeholder: 'Team name',
      isMetadata: true,
    },
    {
      name: 'openApiSpec',
      label: 'Has OpenAPI Spec',
      type: 'boolean',
      isMetadata: true,
    },
    {
      name: 'corsEnabled',
      label: 'CORS Enabled',
      type: 'boolean',
      isMetadata: true,
    },
    {
      name: 'rateLimitEnabled',
      label: 'Rate Limited',
      type: 'boolean',
      isMetadata: true,
    },
    { name: 'tags', label: 'Tags', type: 'tags', placeholder: 'production, critical' },
  ],

  statsCards: [
    {
      title: 'Active',
      icon: CheckCircle,
      compute: (_assets, stats) => stats.byStatus.active ?? 0,
      variant: 'success',
    },
    {
      // metadata.endpointCount isn't aggregated — current page only
      title: 'Total Endpoints',
      icon: Zap,
      compute: (assets) => assets.reduce((acc, a) => acc + (a.metadata.endpointCount || 0), 0),
    },
    {
      title: 'With Findings',
      icon: AlertTriangle,
      compute: (_assets, stats) => stats.withFindings,
      variant: 'warning',
    },
  ],

  statusFilters: [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'deprecated', label: 'Deprecated' },
    { value: 'development', label: 'Development' },
  ],

  customFilter: {
    label: 'Type',
    options: [
      { label: 'REST', value: 'rest' },
      { label: 'GraphQL', value: 'graphql' },
      { label: 'gRPC', value: 'grpc' },
      { label: 'WebSocket', value: 'websocket' },
      { label: 'SOAP', value: 'soap' },
    ],
    filterFn: (asset, value) => asset.metadata.apiType === value,
  },

  copyAction: {
    label: 'Copy URL',
    getValue: (asset) => asset.metadata.baseUrl || asset.name,
  },

  rowActions: [
    {
      label: 'View Docs',
      icon: ExternalLink,
      onClick: (asset) => {
        const url = asset.metadata.documentationUrl
        if (url) {
          window.open(sanitizeExternalUrl(url), '_blank', 'noopener,noreferrer')
        } else {
          toast.info('No documentation URL configured')
        }
      },
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
      label: 'Endpoints',
      getValue: (asset) => asset.metadata.endpointCount || 0,
    },
  ],

  detailSections: [
    {
      title: 'API Information',
      fields: [
        {
          label: 'Type',
          getValue: (asset) => (
            <Badge variant="outline" className="uppercase">
              {asset.metadata.apiType || 'REST'}
            </Badge>
          ),
        },
        {
          label: 'Version',
          getValue: (asset) => asset.metadata.version || '-',
        },
        {
          label: 'Authentication',
          getValue: (asset) => {
            const authType = asset.metadata.authType || 'none'
            return (
              <span className="flex items-center gap-1">
                <Lock className="h-3.5 w-3.5" />
                {authTypeLabels[authType] || authType}
              </span>
            )
          },
        },
        {
          label: 'Base URL',
          getValue: (asset) => {
            const url = asset.metadata.baseUrl
            if (!url) return '-'
            return <code className="text-xs bg-muted px-1.5 py-0.5 rounded break-all">{url}</code>
          },
        },
        {
          label: 'TLS Version',
          getValue: (asset) => asset.metadata.tlsVersion || '-',
        },
        {
          label: 'Documentation',
          getValue: (asset) => {
            const url = asset.metadata.documentationUrl
            if (!url) return '-'
            return (
              <a
                href={sanitizeExternalUrl(url)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline flex items-center gap-1"
              >
                <ExternalLink className="h-3 w-3" />
                View Docs
              </a>
            )
          },
        },
      ],
    },
    {
      title: 'Security Settings',
      fields: [
        {
          label: 'Settings',
          fullWidth: true,
          getValue: (asset) => (
            <div className="flex flex-wrap gap-2">
              <Badge variant={asset.metadata.corsEnabled ? 'default' : 'secondary'}>
                CORS {asset.metadata.corsEnabled ? 'Enabled' : 'Disabled'}
              </Badge>
              <Badge variant={asset.metadata.rateLimitEnabled ? 'default' : 'secondary'}>
                Rate Limit{' '}
                {asset.metadata.rateLimitEnabled ? `(${asset.metadata.rateLimit}/min)` : 'Disabled'}
              </Badge>
              <Badge variant={asset.metadata.openApiSpec ? 'default' : 'secondary'}>
                OpenAPI {asset.metadata.openApiSpec ? 'Available' : 'N/A'}
              </Badge>
            </div>
          ),
        },
      ],
    },
    {
      title: 'Ownership',
      fields: [
        {
          label: 'Owner',
          getValue: (asset) => asset.metadata.owner || '-',
        },
        {
          label: 'Team',
          getValue: (asset) => asset.metadata.team || '-',
        },
      ],
    },
    {
      title: 'Traffic Statistics',
      fields: [
        {
          label: 'Stats',
          fullWidth: true,
          getValue: (asset) => {
            const reqPerDay = asset.metadata.requestsPerDay
            if (!reqPerDay) return '-'
            const formatNum = (n: number) => {
              if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
              if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
              return n.toString()
            }
            return (
              <div className="grid grid-cols-3 gap-4">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-green-500" />
                  <div>
                    <p className="text-sm font-bold">{formatNum(reqPerDay)}</p>
                    <p className="text-xs text-muted-foreground">Req/Day</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-blue-500" />
                  <div>
                    <p className="text-sm font-bold">{asset.metadata.avgResponseTime}ms</p>
                    <p className="text-xs text-muted-foreground">Avg Response</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  <div>
                    <p className="text-sm font-bold">
                      {((asset.metadata.errorRate || 0) * 100).toFixed(2)}%
                    </p>
                    <p className="text-xs text-muted-foreground">Error Rate</p>
                  </div>
                </div>
              </div>
            )
          },
        },
      ],
    },
  ],

  exportFields: [
    { header: 'Name', accessor: (a) => a.name },
    { header: 'Type', accessor: (a) => a.metadata.apiType || 'rest' },
    { header: 'Base URL', accessor: (a) => a.metadata.baseUrl || '' },
    { header: 'Version', accessor: (a) => a.metadata.version || '' },
    { header: 'Auth Type', accessor: (a) => a.metadata.authType || 'none' },
    { header: 'Endpoints', accessor: (a) => a.metadata.endpointCount || 0 },
    { header: 'Status', accessor: (a) => a.status },
    { header: 'Risk Score', accessor: (a) => a.riskScore },
    { header: 'Findings', accessor: (a) => a.findingCount },
    { header: 'Tags', accessor: (a) => (a.tags || []).join('; ') },
  ],

  includeGroupSelect: true,
}
