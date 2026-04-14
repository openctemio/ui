'use client'

import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { toast } from 'sonner'
import {
  GitBranch,
  Github,
  GitlabIcon,
  Cloud,
  Lock,
  Globe,
  Users,
  CheckCircle,
  AlertTriangle,
  Package,
  Activity,
  Play,
  RefreshCw,
  ExternalLink,
  Shield,
  Link2,
  ArrowRight,
  XCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { sanitizeExternalUrl } from '@/lib/utils'
import { getErrorMessage } from '@/lib/api/error-handler'
import { useSCMConnections } from '@/features/repositories/hooks/use-repositories'
import { invalidateRepositoriesCache, SCM_PROVIDER_LABELS } from '@/features/repositories'
import type { Asset } from '@/features/assets'
import type { AssetPageConfig } from '@/features/assets/types/page-config.types'

// ============================================
// Constants
// ============================================

const SCM_PROVIDER_COLORS: Record<string, string> = {
  github: 'bg-gray-900 text-white',
  gitlab: 'bg-orange-600 text-white',
  bitbucket: 'bg-blue-600 text-white',
  azure_devops: 'bg-blue-500 text-white',
  codecommit: 'bg-yellow-600 text-white',
  local: 'bg-gray-500 text-white',
}

// ============================================
// Helper Components
// ============================================

function ProviderIcon({ provider, className }: { provider?: string; className?: string }) {
  switch (provider) {
    case 'github':
      return <Github className={cn('h-4 w-4', className)} />
    case 'gitlab':
      return <GitlabIcon className={cn('h-4 w-4', className)} />
    case 'bitbucket':
    case 'azure_devops':
      return <Cloud className={cn('h-4 w-4', className)} />
    default:
      return <GitBranch className={cn('h-4 w-4', className)} />
  }
}

function VisibilityCell({ visibility }: { visibility?: string }) {
  switch (visibility) {
    case 'public':
      return (
        <span className="flex items-center gap-1 text-sm text-green-500">
          <Globe className="h-3 w-3 shrink-0" /> Public
        </span>
      )
    case 'internal':
      return (
        <span className="flex items-center gap-1 text-sm text-blue-500">
          <Users className="h-3 w-3 shrink-0" /> Internal
        </span>
      )
    default:
      return (
        <span className="flex items-center gap-1 text-sm text-muted-foreground">
          <Lock className="h-3 w-3 shrink-0" /> Private
        </span>
      )
  }
}

function LanguageCell({ asset }: { asset: Asset }) {
  const primaryLang = asset.metadata.language || asset.repository?.language
  const languages: Record<string, number> | undefined =
    asset.metadata.languages || asset.repository?.languages

  if (languages && Object.keys(languages).length > 0) {
    const totalBytes = Object.values(languages).reduce(
      (sum: number, bytes: number) => sum + bytes,
      0
    )
    const sortedLangs = Object.entries(languages)
      .sort(([, a], [, b]) => b - a)
      .map(([lang, bytes]) => ({
        lang,
        percentage: totalBytes > 0 ? ((bytes / totalBytes) * 100).toFixed(1) : '0',
      }))
    const topLang = sortedLangs[0]?.lang
    const otherCount = sortedLangs.length - 1

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1">
              <Badge variant="secondary" className="text-xs">
                {topLang || primaryLang || '-'}
              </Badge>
              {otherCount > 0 && (
                <span className="text-xs text-muted-foreground">+{otherCount}</span>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-[200px]">
            <div className="space-y-1">
              {sortedLangs.map(({ lang, percentage }) => (
                <div key={lang} className="flex items-center justify-between gap-4 text-xs">
                  <span>{lang}</span>
                  <span className="text-muted-foreground">{percentage}%</span>
                </div>
              ))}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return (
    <Badge variant="secondary" className="text-xs">
      {primaryLang || '-'}
    </Badge>
  )
}

// ============================================
// SCM Connections Banner (headerContent)
// ============================================

export function SCMConnectionsBanner() {
  const router = useRouter()
  const { data: connectionsData, isLoading } = useSCMConnections()

  const connections = Array.isArray(connectionsData)
    ? connectionsData
    : (((connectionsData as unknown as { data?: unknown[] })?.data as typeof connectionsData) ?? [])

  const connectedCount = connections.filter((c) => c.status === 'connected').length
  const hasConnections = connections.length > 0

  if (isLoading) {
    return (
      <Card className="bg-muted/30">
        <CardContent className="py-4">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div className="flex-1">
              <Skeleton className="h-4 w-48 mb-2" />
              <Skeleton className="h-3 w-64" />
            </div>
            <Skeleton className="h-9 w-32" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card
      className={cn(
        'border',
        hasConnections && connectedCount > 0
          ? 'bg-green-500/5 border-green-500/20'
          : 'bg-blue-500/5 border-blue-500/20'
      )}
    >
      <CardContent className="py-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-lg',
                hasConnections && connectedCount > 0 ? 'bg-green-500/10' : 'bg-blue-500/10'
              )}
            >
              <Link2
                className={cn(
                  'h-5 w-5',
                  hasConnections && connectedCount > 0 ? 'text-green-500' : 'text-blue-500'
                )}
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-medium">SCM Connections</h4>
                {hasConnections && (
                  <Badge variant="secondary" className="text-xs">
                    {connectedCount} / {connections.length} connected
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {hasConnections
                  ? 'Manage your source control connections to import and sync repositories'
                  : 'Connect GitHub, GitLab, or Bitbucket to import repositories automatically'}
              </p>
            </div>
          </div>
          <Button
            variant={hasConnections ? 'outline' : 'default'}
            onClick={() => router.push('/settings/integrations/scm')}
            className="shrink-0"
          >
            {hasConnections ? 'Manage Connections' : 'Add Connection'}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================
// Action Helpers
// ============================================

async function triggerScan(assetId: string, name: string) {
  try {
    const response = await fetch(`/api/v1/assets/${assetId}/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }))
      throw new Error(error.message || 'Failed to trigger scan')
    }
    const result = await response.json()
    toast.success(result.message || `Scan triggered for "${name}"`)
  } catch (error) {
    toast.error(getErrorMessage(error, 'Failed to trigger scan'))
  }
}

async function syncRepository(assetId: string, name: string) {
  try {
    const response = await fetch(`/api/v1/assets/${assetId}/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }))
      throw new Error(error.message || 'Failed to sync repository')
    }
    const result = await response.json()
    if (result.updated_fields?.length > 0) {
      toast.success(`Synced "${name}": Updated ${result.updated_fields.join(', ')}`)
    } else {
      toast.success(result.message || `Repository "${name}" is up to date`)
    }
    await invalidateRepositoriesCache()
  } catch (error) {
    toast.error(getErrorMessage(error, 'Failed to sync'))
  }
}

function getProviderFromAsset(asset: Asset): string {
  const meta = asset.metadata as Record<string, unknown>
  return (
    asset.provider ||
    (meta.project_provider as string) ||
    (meta.repo_provider as string) ||
    'github'
  )
}

function getWebUrl(asset: Asset): string | undefined {
  return asset.repository?.webUrl
}

// ============================================
// Config
// ============================================

export const repositoriesConfig: AssetPageConfig = {
  type: 'repository',
  label: 'Repository',
  labelPlural: 'Repositories',
  description: 'Manage your source code repositories and security scans',
  icon: GitBranch,
  iconColor: 'text-primary',
  gradientFrom: 'from-primary/20',
  gradientVia: 'via-primary/10',

  headerContent: SCMConnectionsBanner,

  columns: [
    {
      id: 'scm_connection',
      header: 'Source',
      cell: ({ row }) => {
        const provider = getProviderFromAsset(row.original)
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1.5">
                  <Badge variant="outline" className={cn('text-xs', SCM_PROVIDER_COLORS[provider])}>
                    <ProviderIcon provider={provider} className="h-3 w-3 mr-1" />
                    {SCM_PROVIDER_LABELS[provider as keyof typeof SCM_PROVIDER_LABELS] || provider}
                  </Badge>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="font-medium">
                  {row.original.repository?.scmOrganization || 'Manual'}
                </p>
                {row.original.repository?.webUrl && (
                  <p className="text-xs text-muted-foreground">{row.original.repository.webUrl}</p>
                )}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )
      },
    },
    {
      accessorKey: 'metadata.visibility',
      header: 'Visibility',
      cell: ({ row }) => (
        <VisibilityCell
          visibility={row.original.metadata.visibility || row.original.repository?.visibility}
        />
      ),
    },
    {
      id: 'language',
      header: 'Language',
      cell: ({ row }) => <LanguageCell asset={row.original} />,
    },
  ],

  formFields: [
    {
      name: 'name',
      label: 'Repository Name',
      type: 'text',
      placeholder: 'e.g., my-app',
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
      name: 'visibility',
      label: 'Visibility',
      type: 'select',
      isMetadata: true,
      defaultValue: 'private',
      options: [
        { label: 'Private', value: 'private' },
        { label: 'Internal', value: 'internal' },
        { label: 'Public', value: 'public' },
      ],
    },
    {
      name: 'language',
      label: 'Primary Language',
      type: 'text',
      placeholder: 'e.g., TypeScript',
      isMetadata: true,
    },
    {
      name: 'default_branch',
      label: 'Default Branch',
      type: 'text',
      placeholder: 'main',
      isMetadata: true,
      defaultValue: 'main',
    },
    { name: 'tags', label: 'Tags', type: 'tags', placeholder: 'backend, production, critical' },
  ],

  statsCards: [
    {
      title: 'Active',
      icon: CheckCircle,
      compute: (_assets, stats) => stats.byStatus.active ?? 0,
      variant: 'success',
    },
    {
      title: 'With Findings',
      icon: AlertTriangle,
      compute: (_assets, stats) => stats.withFindings,
      variant: 'warning',
    },
    {
      // repository.componentCount isn't aggregated by /assets/stats — current page only
      title: 'Components',
      icon: Package,
      compute: (assets) => assets.reduce((acc, a) => acc + (a.repository?.componentCount || 0), 0),
    },
    {
      // Backend exposes risk_score_avg across the type-filtered set
      title: 'Avg Risk Score',
      icon: Activity,
      compute: (_assets, stats) => Math.round(stats.averageRiskScore),
    },
  ],

  statusFilters: [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'archived', label: 'Archived' },
  ],

  customFilter: {
    label: 'Provider',
    options: [
      { label: 'GitHub', value: 'github' },
      { label: 'GitLab', value: 'gitlab' },
      { label: 'Bitbucket', value: 'bitbucket' },
      { label: 'Azure DevOps', value: 'azure_devops' },
    ],
    filterFn: (asset, value) => getProviderFromAsset(asset) === value,
  },

  copyAction: {
    label: 'Copy URL',
    getValue: (asset) => getWebUrl(asset) || asset.name,
  },

  rowActions: [
    {
      label: 'Trigger Scan',
      icon: Play,
      onClick: (asset) => triggerScan(asset.id, asset.name),
    },
    {
      label: 'Sync Now',
      icon: RefreshCw,
      onClick: (asset) => {
        const provider = getProviderFromAsset(asset)
        if (provider === 'local' || !asset.repository?.fullName) {
          toast.warning('Repository was added manually. Connect to an SCM provider to enable sync.')
          return
        }
        syncRepository(asset.id, asset.name)
      },
    },
    {
      label: 'Open in Browser',
      icon: ExternalLink,
      onClick: (asset) => {
        const url = getWebUrl(asset)
        if (url) {
          window.open(sanitizeExternalUrl(url), '_blank', 'noopener,noreferrer')
        } else {
          toast.warning('Repository URL not available')
        }
      },
    },
  ],

  bulkActions: [
    {
      label: 'Scan Selected',
      icon: Play,
      onClick: async (assets) => {
        const results = await Promise.allSettled(
          assets.map((a) =>
            fetch(`/api/v1/assets/${a.id}/scan`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
            })
          )
        )
        const successCount = results.filter(
          (r) => r.status === 'fulfilled' && (r.value as Response).ok
        ).length
        const failedCount = assets.length - successCount
        if (failedCount > 0) {
          toast.warning(`Triggered scan for ${successCount} repositories, ${failedCount} failed`)
        } else {
          toast.success(`Triggered scan for ${successCount} repositories`)
        }
      },
    },
    {
      label: 'Sync Selected',
      icon: RefreshCw,
      onClick: async (assets) => {
        const syncable = assets.filter((a) => {
          const provider = getProviderFromAsset(a)
          return provider !== 'local' && a.repository?.fullName
        })
        if (syncable.length === 0) {
          toast.warning('None of the selected repositories can be synced.')
          return
        }
        if (syncable.length < assets.length) {
          toast.info(
            `Syncing ${syncable.length} of ${assets.length} repositories (${assets.length - syncable.length} cannot be synced)`
          )
        }
        const results = await Promise.allSettled(
          syncable.map((a) =>
            fetch(`/api/v1/assets/${a.id}/sync`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
            })
          )
        )
        const successCount = results.filter(
          (r) => r.status === 'fulfilled' && (r.value as Response).ok
        ).length
        const failedCount = syncable.length - successCount
        if (failedCount > 0) {
          toast.warning(`Synced ${successCount} repositories, ${failedCount} failed`)
        } else {
          toast.success(`Synced ${successCount} repositories`)
        }
        await invalidateRepositoriesCache()
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
      icon: Package,
      iconBg: 'bg-blue-500/10',
      iconColor: 'text-blue-500',
      label: 'Components',
      getValue: (asset) => asset.repository?.componentCount || 0,
    },
  ],

  detailSections: [
    {
      title: 'Repository Information',
      fields: [
        {
          label: 'Provider',
          getValue: (asset) => {
            const provider = getProviderFromAsset(asset)
            return (
              <Badge variant="outline" className={cn('text-xs', SCM_PROVIDER_COLORS[provider])}>
                <ProviderIcon provider={provider} className="h-3 w-3 mr-1" />
                {SCM_PROVIDER_LABELS[provider as keyof typeof SCM_PROVIDER_LABELS] || provider}
              </Badge>
            )
          },
        },
        {
          label: 'Visibility',
          getValue: (asset) => (
            <VisibilityCell
              visibility={asset.metadata.visibility || asset.repository?.visibility}
            />
          ),
        },
        {
          label: 'Language',
          getValue: (asset) => {
            const lang = asset.metadata.language || asset.repository?.language
            return lang ? <Badge variant="secondary">{lang}</Badge> : '-'
          },
        },
        {
          label: 'Default Branch',
          getValue: (asset) => {
            const branch =
              ((asset.metadata as Record<string, unknown>).default_branch as string) ||
              asset.repository?.defaultBranch
            return branch ? (
              <code className="text-xs bg-muted px-2 py-1 rounded">{branch}</code>
            ) : (
              '-'
            )
          },
        },
        {
          label: 'Organization',
          getValue: (asset) => asset.repository?.scmOrganization || '-',
        },
        {
          label: 'Full Name',
          getValue: (asset) => {
            const fullName = asset.repository?.fullName
            return fullName ? <code className="text-xs font-mono">{fullName}</code> : '-'
          },
        },
      ],
    },
    {
      title: 'Repository Stats',
      fields: [
        {
          label: 'Stats',
          fullWidth: true,
          getValue: (asset) => {
            const repo = asset.repository
            if (!repo) return '-'
            return (
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Stars</p>
                  <p className="font-medium">{repo.stars ?? 0}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Forks</p>
                  <p className="font-medium">{repo.forks ?? 0}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Issues</p>
                  <p className="font-medium">{repo.openIssues ?? 0}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Branches</p>
                  <p className="font-medium">{repo.branchCount ?? 0}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Contributors</p>
                  <p className="font-medium">{repo.contributorsCount ?? 0}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Components</p>
                  <p className="font-medium">
                    {repo.componentCount ?? 0}
                    {(repo.vulnerableComponentCount ?? 0) > 0 && (
                      <span className="text-red-500 ml-1">
                        ({repo.vulnerableComponentCount} vulnerable)
                      </span>
                    )}
                  </p>
                </div>
              </div>
            )
          },
        },
      ],
    },
    {
      title: 'Security Features',
      fields: [
        {
          label: 'Features',
          fullWidth: true,
          getValue: (asset) => {
            const features = [
              { key: 'hasSecurityPolicy', label: 'Security Policy' },
              { key: 'branchProtection', label: 'Branch Protection' },
              { key: 'secretScanningEnabled', label: 'Secret Scanning' },
              { key: 'dependabotEnabled', label: 'Dependabot' },
            ]
            return (
              <div className="grid grid-cols-2 gap-2">
                {features.map(({ key, label }) => {
                  const enabled = asset.metadata[key as keyof typeof asset.metadata]
                  return (
                    <div
                      key={key}
                      className={cn(
                        'flex items-center gap-2 p-2 rounded-lg border text-sm',
                        enabled ? 'bg-green-500/5 border-green-500/20' : 'bg-muted/30'
                      )}
                    >
                      {enabled ? (
                        <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                      ) : (
                        <XCircle className="h-4 w-4 text-muted-foreground shrink-0" />
                      )}
                      <span className={cn('text-xs', !enabled && 'text-muted-foreground')}>
                        {label}
                      </span>
                    </div>
                  )
                })}
              </div>
            )
          },
        },
      ],
    },
  ],

  exportFields: [
    { header: 'Name', accessor: (a) => a.name },
    { header: 'Provider', accessor: (a) => getProviderFromAsset(a) },
    {
      header: 'Visibility',
      accessor: (a) => a.metadata.visibility || a.repository?.visibility || 'private',
    },
    { header: 'Language', accessor: (a) => a.metadata.language || a.repository?.language || '' },
    { header: 'Risk Score', accessor: (a) => a.riskScore },
    { header: 'Findings', accessor: (a) => a.findingCount },
    { header: 'Components', accessor: (a) => a.repository?.componentCount || 0 },
    { header: 'Status', accessor: (a) => a.status },
    { header: 'Tags', accessor: (a) => (a.tags || []).join('; ') },
  ],

  includeGroupSelect: true,
}
