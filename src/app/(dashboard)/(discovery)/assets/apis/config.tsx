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
  type: 'application',
  subType: 'api',
  label: 'API',
  labelPlural: 'APIs',
  description: 'Manage your API assets and endpoints',
  icon: Webhook,
  iconColor: 'text-cyan-500',
  gradientFrom: 'from-cyan-500/20',
  gradientVia: 'via-cyan-500/10',

  columns: [
    {
      accessorKey: 'metadata.api_type',
      header: 'Type',
      cell: ({ row }) => {
        const meta = row.original.metadata as Record<string, unknown>
        const apiType = (meta.api_type as string) || 'rest'
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
      accessorKey: 'metadata.auth_type',
      header: 'Auth',
      cell: ({ row }) => {
        const meta = row.original.metadata as Record<string, unknown>
        const authType = (meta.auth_type as string) || 'none'
        return (
          <div className="flex items-center gap-1.5">
            <Lock className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-sm">{authTypeLabels[authType] || authType}</span>
          </div>
        )
      },
    },
    {
      accessorKey: 'metadata.endpoint_count',
      header: 'Endpoints',
      cell: ({ row }) => {
        const meta = row.original.metadata as Record<string, unknown>
        return <Badge variant="secondary">{(meta.endpoint_count as number) ?? 0}</Badge>
      },
    },
    {
      accessorKey: 'metadata.base_url',
      header: 'Base URL',
      cell: ({ row }) => {
        const meta = row.original.metadata as Record<string, unknown>
        const url = meta.base_url as string
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
      name: 'api_type',
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
      name: 'base_url',
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
      name: 'auth_type',
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
      name: 'documentation_url',
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
      name: 'open_api_spec',
      label: 'Has OpenAPI Spec',
      type: 'boolean',
      isMetadata: true,
    },
    {
      name: 'cors_enabled',
      label: 'CORS Enabled',
      type: 'boolean',
      isMetadata: true,
    },
    {
      name: 'rate_limit_enabled',
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
      // metadata.endpoint_count isn't aggregated — current page only
      title: 'Total Endpoints',
      icon: Zap,
      compute: (assets) =>
        assets.reduce(
          (acc, a) =>
            acc + (((a.metadata as Record<string, unknown>).endpoint_count as number) || 0),
          0
        ),
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
    filterFn: (asset, value) => (asset.metadata as Record<string, unknown>).api_type === value,
  },

  copyAction: {
    label: 'Copy URL',
    getValue: (asset) =>
      ((asset.metadata as Record<string, unknown>).base_url as string) || asset.name,
  },

  rowActions: [
    {
      label: 'View Docs',
      icon: ExternalLink,
      onClick: (asset) => {
        const url = (asset.metadata as Record<string, unknown>).documentation_url as string
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
      getValue: (asset) =>
        ((asset.metadata as Record<string, unknown>).endpoint_count as number) || 0,
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
          getValue: (asset) => {
            const meta = asset.metadata as Record<string, unknown>
            return meta.api_type ? (
              <Badge variant="outline" className="uppercase">
                {meta.api_type as string}
              </Badge>
            ) : null
          },
        },
        {
          label: 'Version',
          getValue: (asset) =>
            ((asset.metadata as Record<string, unknown>).version as string) || null,
        },
        {
          label: 'Authentication',
          // Auth type defaults to 'none' which is a meaningful claim
          // ("we know there's no auth") so we keep showing it.
          getValue: (asset) => {
            const meta = asset.metadata as Record<string, unknown>
            const authType = (meta.auth_type as string) || 'none'
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
          // Fall back to the asset's name when metadata.base_url is
          // missing — for ingested API assets the name IS the URL
          // (e.g. `https://api.vndirect.com.vn/v2`). The previous
          // code showed "-" in that case which was the most jarring
          // empty cell on the screen.
          getValue: (asset) => {
            const meta = asset.metadata as Record<string, unknown>
            const url =
              (meta.base_url as string) || (asset.name?.startsWith('http') ? asset.name : null)
            if (!url) return null
            return <code className="text-xs bg-muted px-1.5 py-0.5 rounded break-all">{url}</code>
          },
        },
        {
          label: 'TLS Version',
          getValue: (asset) =>
            ((asset.metadata as Record<string, unknown>).tls_version as string) || null,
        },
        {
          label: 'Documentation',
          getValue: (asset) => {
            const meta = asset.metadata as Record<string, unknown>
            const url = meta.documentation_url as string
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
            const meta = asset.metadata as Record<string, unknown>
            const cors = meta.cors_enabled as boolean | undefined
            const rl = meta.rate_limit_enabled as boolean | undefined
            const oas = meta.open_api_spec as boolean | undefined
            // If all three are undefined, the whole row is meaningless.
            if (cors === undefined && rl === undefined && oas === undefined) return null
            const corsLabel = cors === true ? 'Enabled' : cors === false ? 'Disabled' : 'Unknown'
            const rlLabel =
              rl === true
                ? `(${(meta.rate_limit as number) ?? '?'}/min)`
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
            const meta = asset.metadata as Record<string, unknown>
            const reqPerDay = meta.requests_per_day as number
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
                    <p className="text-sm font-bold">{meta.avg_response_time as number}ms</p>
                    <p className="text-xs text-muted-foreground">Avg Response</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  <div>
                    <p className="text-sm font-bold">
                      {(((meta.error_rate as number) || 0) * 100).toFixed(2)}%
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
    {
      header: 'Type',
      accessor: (a) => ((a.metadata as Record<string, unknown>).api_type as string) || 'rest',
    },
    {
      header: 'Base URL',
      accessor: (a) => ((a.metadata as Record<string, unknown>).base_url as string) || '',
    },
    {
      header: 'Version',
      accessor: (a) => ((a.metadata as Record<string, unknown>).version as string) || '',
    },
    {
      header: 'Auth Type',
      accessor: (a) => ((a.metadata as Record<string, unknown>).auth_type as string) || 'none',
    },
    {
      header: 'Endpoints',
      accessor: (a) => ((a.metadata as Record<string, unknown>).endpoint_count as number) || 0,
    },
    { header: 'Status', accessor: (a) => a.status },
    { header: 'Risk Score', accessor: (a) => a.riskScore },
    { header: 'Findings', accessor: (a) => a.findingCount },
    { header: 'Tags', accessor: (a) => (a.tags || []).join('; ') },
  ],

  includeGroupSelect: true,
}
