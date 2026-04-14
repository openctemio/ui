'use client'

/**
 * Asset Inventory Overview Page
 *
 * Provides a high-level view of all assets organized by category:
 * - External Attack Surface (domains, certificates, IP addresses)
 * - Applications (websites, APIs, mobile apps, services)
 * - Cloud (cloud accounts, compute, storage, serverless)
 * - Infrastructure (hosts, containers, databases, networks)
 * - Code & CI/CD (repositories)
 */

import Link from 'next/link'
import { Main } from '@/components/layout'
import { PageHeader } from '@/features/shared'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Container,
  Globe,
  MonitorSmartphone,
  Zap,
  Server,
  Boxes,
  Database,
  Smartphone,
  GitBranch,
  Cloud,
  ShieldCheck,
  Network,
  HardDrive,
  Cpu,
  ArrowRight,
  AlertTriangle,
  TrendingUp,
  Target,
  Plus,
  type LucideIcon,
} from 'lucide-react'
import { useMemo } from 'react'
import { useAssetStats } from '@/features/assets/hooks/use-assets'
import {
  ASSET_TYPE_CATEGORIES,
  LEGACY_ASSET_TYPES,
  type AssetTypeCategory,
  type AssetType,
} from '@/features/assets/types/asset.types'
import { useTenantModules } from '@/features/integrations/api/use-tenant-modules'

// Category icons mapping
const CATEGORY_ICONS: Record<AssetTypeCategory, LucideIcon> = {
  external: Globe,
  applications: MonitorSmartphone,
  infrastructure: Server,
  network: Network,
  cloud: Cloud,
  data: Database,
  identity: ShieldCheck,
  code: GitBranch,
}

// Category colors mapping
const CATEGORY_COLORS: Record<AssetTypeCategory, { bg: string; text: string; border: string }> = {
  external: { bg: 'bg-purple-500/10', text: 'text-purple-600', border: 'border-purple-500/20' },
  applications: { bg: 'bg-cyan-500/10', text: 'text-cyan-600', border: 'border-cyan-500/20' },
  infrastructure: { bg: 'bg-slate-500/10', text: 'text-slate-600', border: 'border-slate-500/20' },
  network: { bg: 'bg-orange-500/10', text: 'text-orange-600', border: 'border-orange-500/20' },
  cloud: { bg: 'bg-sky-500/10', text: 'text-sky-600', border: 'border-sky-500/20' },
  data: { bg: 'bg-emerald-500/10', text: 'text-emerald-600', border: 'border-emerald-500/20' },
  identity: { bg: 'bg-pink-500/10', text: 'text-pink-600', border: 'border-pink-500/20' },
  code: { bg: 'bg-fuchsia-500/10', text: 'text-fuchsia-600', border: 'border-fuchsia-500/20' },
}

// Asset type to URL mapping
const ASSET_TYPE_URLS: Record<string, string> = {
  domain: '/assets/domains',
  subdomain: '/assets/domains',
  certificate: '/assets/certificates',
  ip_address: '/assets/ip-addresses',
  application: '/assets/websites',
  service: '/assets/services',
  host: '/assets/hosts',
  container: '/assets/containers',
  kubernetes: '/assets/containers',
  network: '/assets/networks',
  cloud_account: '/assets/cloud-accounts',
  storage: '/assets/storage',
  database: '/assets/databases',
  identity: '/assets/identity',
  repository: '/assets/repositories',
  unclassified: '/assets/overview',
}

const ASSET_TYPE_ICONS: Record<string, LucideIcon> = {
  domain: Globe,
  subdomain: Globe,
  certificate: ShieldCheck,
  ip_address: Network,
  application: MonitorSmartphone,
  service: Zap,
  host: Server,
  container: Boxes,
  kubernetes: Container,
  network: Network,
  cloud_account: Cloud,
  storage: HardDrive,
  database: Database,
  identity: ShieldCheck,
  repository: GitBranch,
  unclassified: Boxes,
}

const ASSET_TYPE_NAMES: Record<string, string> = {
  domain: 'Domains',
  subdomain: 'Subdomains',
  certificate: 'Certificates',
  ip_address: 'IP Addresses',
  application: 'Applications',
  service: 'Services',
  host: 'Hosts',
  container: 'Containers',
  kubernetes: 'Kubernetes',
  network: 'Network Devices',
  cloud_account: 'Cloud Accounts',
  storage: 'Storage',
  database: 'Databases',
  identity: 'Identity',
  repository: 'Repositories',
  unclassified: 'Unclassified',
}

// Mapping from asset type to sub-module slug (for filtering based on module visibility)
const ASSET_TYPE_TO_SUBMODULE: Record<string, string> = {
  // Core types → sub-module slugs (must match Module Management config)
  domain: 'domains',
  subdomain: 'domains',
  certificate: 'certificates',
  ip_address: 'ip-addresses',
  application: 'websites',
  service: 'services',
  host: 'hosts',
  container: 'containers',
  kubernetes: 'containers',
  network: 'networks',
  cloud_account: 'cloud-accounts',
  storage: 'storage',
  database: 'databases',
  identity: 'identity',
  repository: 'repositories',
}

export default function AssetsOverviewPage() {
  // Fetch assets data with permission check (built into hook)
  const { stats, isLoading: statsLoading } = useAssetStats()

  // Fetch sub-modules for filtering
  const { subModules } = useTenantModules()

  // Filter all category types based on sub-module visibility
  const filteredCategoryTypes = useMemo(() => {
    // Get asset sub-modules inside useMemo to avoid stale dependency issues
    const assetSubModules = subModules['assets'] || []
    const result: Record<AssetTypeCategory, AssetType[]> = {} as Record<
      AssetTypeCategory,
      AssetType[]
    >

    for (const categoryKey of Object.keys(ASSET_TYPE_CATEGORIES) as AssetTypeCategory[]) {
      const types = ASSET_TYPE_CATEGORIES[categoryKey].types
        .filter((type) => !LEGACY_ASSET_TYPES.includes(type))
        .filter((type) => ASSET_TYPE_URLS[type]) // Only show types with pages

      // If no sub-modules configured yet, show all types
      if (assetSubModules.length === 0) {
        result[categoryKey] = types
        continue
      }

      // Filter based on sub-module visibility
      result[categoryKey] = types.filter((type) => {
        const subModuleSlug = ASSET_TYPE_TO_SUBMODULE[type]
        if (!subModuleSlug) return true // Show types without mapping

        const subModule = assetSubModules.find((m) => m.slug === subModuleSlug)
        if (!subModule) return true // Show if sub-module not configured (graceful fallback)

        // Hide only if explicitly inactive or disabled
        if (!subModule.is_active) return false
        if (subModule.release_status === 'disabled') return false

        return true
      })
    }

    return result
  }, [subModules])

  // Extract stats values (hook returns empty defaults if no permission)
  const totalAssets = stats.total
  const averageRiskScore = stats.averageRiskScore
  const highRiskCount = stats.highRiskCount
  const totalFindings = stats.totalFindings

  // Get count for an asset type or sub_type
  const getItemCount = (key: string): number => {
    // Check sub_type first (more specific), then type
    return stats.bySubType[key] ?? stats.byType[key] ?? 0
  }

  // Calculate category total based on type counts
  const getCategoryTotal = (category: AssetTypeCategory): number => {
    const config = ASSET_TYPE_CATEGORIES[category]
    return config.types.reduce((sum, type) => sum + (stats.byType[type] ?? 0), 0)
  }

  return (
    <>
      <Main>
        <PageHeader
          title="Asset Inventory"
          description="Complete visibility into your organization's digital assets and attack surface"
        >
          <Link href="/attack-surface">
            <Button>
              <Target className="mr-2 h-4 w-4" />
              Attack Surface
            </Button>
          </Link>
        </PageHeader>

        {/* Key Metrics */}
        <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
              <Container className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{totalAssets.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground mt-1">Across all categories</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card className={highRiskCount > 0 ? 'border-red-500/50' : ''}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">High Risk Assets</CardTitle>
              <AlertTriangle
                className={`h-4 w-4 ${highRiskCount > 0 ? 'text-red-500' : 'text-muted-foreground'}`}
              />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className={`text-2xl font-bold ${highRiskCount > 0 ? 'text-red-500' : ''}`}>
                    {highRiskCount.toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Risk score 70+</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Risk Score</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{averageRiskScore.toFixed(1)}</div>
                  <p className="text-xs text-muted-foreground mt-1">Out of 100</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Open Findings</CardTitle>
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className="text-2xl font-bold text-yellow-600">
                    {totalFindings.toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Across all assets</p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Empty state — when the tenant has zero assets across the board,
            show an onboarding CTA instead of an empty grid. This is the
            "first-run" experience: clarifies the next step rather than
            leaving the user staring at an empty page. */}
        {!statsLoading && totalAssets === 0 && (
          <Card className="mt-8 border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="rounded-full bg-muted p-4 mb-4">
                <Container className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-1">No assets discovered yet</h3>
              <p className="text-sm text-muted-foreground max-w-md mb-6">
                Run a discovery scan, connect a cloud provider, or add assets manually to start
                building your inventory.
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                <Link href="/scans">
                  <Button>
                    <Target className="mr-2 h-4 w-4" />
                    Run Discovery Scan
                  </Button>
                </Link>
                <Link href="/integrations">
                  <Button variant="outline">Connect Provider</Button>
                </Link>
                <Link href="/scope-config">
                  <Button variant="outline">Configure Scope</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Asset Categories — hide empty categories once stats finish loading
            so the overview only surfaces what the tenant actually has. While
            stats are loading we keep all visible categories so the layout
            doesn't pop in. */}
        <div className="mt-8 grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
          {(Object.keys(ASSET_TYPE_CATEGORIES) as AssetTypeCategory[])
            .filter((categoryKey) => {
              // Hide categories with no visible types (sub-module gating)
              const types = filteredCategoryTypes[categoryKey] || []
              if (types.length === 0) return false
              // Once stats are loaded, hide categories with zero assets
              if (!statsLoading && getCategoryTotal(categoryKey) === 0) return false
              return true
            })
            .map((categoryKey) => {
              const category = ASSET_TYPE_CATEGORIES[categoryKey]
              const CategoryIcon = CATEGORY_ICONS[categoryKey]
              const colors = CATEGORY_COLORS[categoryKey]
              const categoryTotal = getCategoryTotal(categoryKey)

              return (
                <Card key={categoryKey} className={`${colors.border}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${colors.bg}`}>
                          <CategoryIcon className={`h-5 w-5 ${colors.text}`} />
                        </div>
                        <div>
                          <CardTitle className="text-base">{category.label}</CardTitle>
                          <CardDescription className="text-xs">
                            {category.description}
                          </CardDescription>
                        </div>
                      </div>
                      {statsLoading ? (
                        <Skeleton className="h-6 w-12" />
                      ) : (
                        <Badge variant="secondary" className="text-sm">
                          {categoryTotal.toLocaleString()}
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-2">
                      {(category.items || [])
                        .filter((item) => statsLoading || getItemCount(item.countKey) > 0)
                        .slice(0, 8)
                        .map((item) => {
                          const TypeIcon =
                            ASSET_TYPE_ICONS[item.key] ||
                            ASSET_TYPE_ICONS[item.countKey] ||
                            Container
                          const count = getItemCount(item.countKey)

                          return (
                            <Link
                              key={item.key}
                              href={item.url}
                              className="flex items-center justify-between p-2 rounded-lg hover:bg-accent/50 transition-colors group"
                            >
                              <div className="flex items-center gap-2">
                                <TypeIcon className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm">{item.label}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                {statsLoading ? (
                                  <Skeleton className="h-5 w-8" />
                                ) : (
                                  <span className="text-sm text-muted-foreground">
                                    {count.toLocaleString()}
                                  </span>
                                )}
                                <ArrowRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                              </div>
                            </Link>
                          )
                        })}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
        </div>

        {/* Quick Actions */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Quick Actions
            </CardTitle>
            <CardDescription>Common asset management tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Link href="/scans">
                <Button variant="outline" className="w-full justify-start">
                  <Target className="mr-2 h-4 w-4" />
                  Run Discovery Scan
                </Button>
              </Link>
              <Link href="/asset-groups">
                <Button variant="outline" className="w-full justify-start">
                  <Container className="mr-2 h-4 w-4" />
                  Manage Asset Groups
                </Button>
              </Link>
              <Link href="/scope-config">
                <Button variant="outline" className="w-full justify-start">
                  <Target className="mr-2 h-4 w-4" />
                  Configure Scope
                </Button>
              </Link>
              <Link href="/findings">
                <Button variant="outline" className="w-full justify-start">
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  View All Findings
                  {totalFindings > 0 && (
                    <Badge variant="secondary" className="ml-auto">
                      {totalFindings}
                    </Badge>
                  )}
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </Main>
    </>
  )
}
