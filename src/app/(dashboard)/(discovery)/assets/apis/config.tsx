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

  // detailSections rendering rule (asset-page.tsx): a field whose
  // getValue returns null/undefined is skipped, and a section whose
  // fields all return null is hidden entirely. We use this to avoid
  // the previous wall-of-dashes when API metadata is sparse.
  //
  // The Ownership section that used to live here was deleted on
  // purpose: it read free-text `metadata.owner` / `metadata.team`
  // strings that nothing populates, while the AUTHORITATIVE owner
  // data lives in the asset_owners table and is shown in the
  // Owners tab. Two data paths for the same concept is a bug.
  detailSections: [
    {
      title: 'API Information',
      fields: [
        {
          label: 'Type',
          // Don't default to "REST" — that's a confident claim about
          // an API protocol that we may not actually know.
          getValue: (asset) =>
            asset.metadata.apiType ? (
              <Badge variant="outline" className="uppercase">
                {asset.metadata.apiType}
              </Badge>
            ) : null,
        },
        {
          label: 'Version',
          getValue: (asset) => asset.metadata.version || null,
        },
        {
          label: 'Authentication',
          // Auth type defaults to 'none' which is a meaningful claim
          // ("we know there's no auth") so we keep showing it.
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
          // Fall back to the asset's name when metadata.baseUrl is
          // missing — for ingested API assets the name IS the URL
          // (e.g. `https://api.vndirect.com.vn/v2`). The previous
          // code showed "-" in that case which was the most jarring
          // empty cell on the screen.
          getValue: (asset) => {
            const url =
              asset.metadata.baseUrl || (asset.name?.startsWith('http') ? asset.name : null)
            if (!url) return null
            return <code className="text-xs bg-muted px-1.5 py-0.5 rounded break-all">{url}</code>
          },
        },
        {
          label: 'TLS Version',
          getValue: (asset) => asset.metadata.tlsVersion || null,
        },
        {
          label: 'Documentation',
          getValue: (asset) => {
            const url = asset.metadata.documentationUrl
            if (!url) return null
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
          // Tri-state: Enabled (true) / Disabled (false) / Unknown
          // (undefined). The previous version mapped undefined → "Disabled"
          // which is a false negative — it claims we verified the API
          // has no rate limiting when in fact we just never asked.
          getValue: (asset) => {
            const cors = asset.metadata.corsEnabled
            const rl = asset.metadata.rateLimitEnabled
            const oas = asset.metadata.openApiSpec
            // If all three are undefined, the whole row is meaningless.
            if (cors === undefined && rl === undefined && oas === undefined) return null
            const corsLabel = cors === true ? 'Enabled' : cors === false ? 'Disabled' : 'Unknown'
            const rlLabel =
              rl === true
                ? `(${asset.metadata.rateLimit ?? '?'}/min)`
                : rl === false
                  ? 'Disabled'
                  : 'Unknown'
            const oasLabel = oas === true ? 'Available' : oas === false ? 'N/A' : 'Unknown'
            const tone = (v: boolean | undefined): 'default' | 'secondary' | 'outline' =>
              v === true ? 'default' : v === false ? 'secondary' : 'outline'
            return (
              <div className="flex flex-wrap gap-2">
                <Badge variant={tone(cors)}>CORS {corsLabel}</Badge>
                <Badge variant={tone(rl)}>Rate Limit {rlLabel}</Badge>
                <Badge variant={tone(oas)}>OpenAPI {oasLabel}</Badge>
              </div>
            )
          },
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
            // No traffic data → return null. The renderer will skip
            // this field, the section will end up empty, and the
            // whole "Traffic Statistics" card disappears instead of
            // showing a "Stats: -" placeholder.
            if (!reqPerDay) return null
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
