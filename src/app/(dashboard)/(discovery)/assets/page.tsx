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
  cloud: Cloud,
  infrastructure: Server,
  code: GitBranch,
}

// Category colors mapping
const CATEGORY_COLORS: Record<AssetTypeCategory, { bg: string; text: string; border: string }> = {
  external: { bg: 'bg-purple-500/10', text: 'text-purple-600', border: 'border-purple-500/20' },
  applications: { bg: 'bg-cyan-500/10', text: 'text-cyan-600', border: 'border-cyan-500/20' },
  cloud: { bg: 'bg-sky-500/10', text: 'text-sky-600', border: 'border-sky-500/20' },
  infrastructure: { bg: 'bg-slate-500/10', text: 'text-slate-600', border: 'border-slate-500/20' },
  code: { bg: 'bg-fuchsia-500/10', text: 'text-fuchsia-600', border: 'border-fuchsia-500/20' },
}

// Asset type to URL mapping
const ASSET_TYPE_URLS: Record<string, string> = {
  domain: '/assets/domains',
  certificate: '/assets/certificates',
  ip_address: '/assets/ip-addresses',
  website: '/assets/websites',
  api: '/assets/apis',
  mobile_app: '/assets/mobile',
  service: '/assets/services',
  application: '/assets/services',
  endpoint: '/assets/apis',
  cloud_account: '/assets/cloud-accounts',
  compute: '/assets/compute',
  storage: '/assets/storage',
  serverless: '/assets/serverless',
  cloud: '/assets/cloud',
  host: '/assets/hosts',
  server: '/assets/hosts',
  container: '/assets/containers',
  database: '/assets/databases',
  network: '/assets/networks',
  repository: '/assets/repositories',
}

// Asset type icons
const ASSET_TYPE_ICONS: Record<string, LucideIcon> = {
  domain: Globe,
  certificate: ShieldCheck,
  ip_address: Network,
  website: MonitorSmartphone,
  api: Zap,
  mobile_app: Smartphone,
  service: Zap,
  application: Zap,
  endpoint: Zap,
  cloud_account: Cloud,
  compute: Server,
  storage: HardDrive,
  serverless: Cpu,
  cloud: Cloud,
  host: Server,
  server: Server,
  container: Boxes,
  database: Database,
  network: Network,
  repository: GitBranch,
}

// Asset type display names
const ASSET_TYPE_NAMES: Record<string, string> = {
  domain: 'Domains',
  certificate: 'Certificates',
  ip_address: 'IP Addresses',
  website: 'Websites',
  api: 'APIs',
  mobile_app: 'Mobile Apps',
  service: 'Services',
  application: 'Applications',
  endpoint: 'Endpoints',
  cloud_account: 'Cloud Accounts',
  compute: 'Compute',
  storage: 'Storage',
  serverless: 'Serverless',
  cloud: 'Cloud Resources',
  host: 'Hosts',
  server: 'Servers',
  container: 'Kubernetes',
  database: 'Databases',
  network: 'Networks',
  repository: 'Repositories',
}

// Mapping from asset type to sub-module slug (for filtering based on module visibility)
const ASSET_TYPE_TO_SUBMODULE: Record<string, string> = {
  domain: 'domains',
  certificate: 'certificates',
  ip_address: 'ip-addresses',
  website: 'websites',
  api: 'apis',
  mobile_app: 'mobile',
  service: 'services',
  application: 'services', // Maps to services sub-module
  endpoint: 'apis', // Maps to apis sub-module
  cloud_account: 'cloud-accounts',
  compute: 'compute',
  storage: 'storage',
  serverless: 'serverless',
  cloud: 'cloud',
  host: 'hosts',
  server: 'hosts', // Maps to hosts sub-module
  container: 'containers',
  database: 'databases',
  network: 'networks',
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
        if (!subModule) return false // Hide if not found in API response

        // Hide if inactive or disabled
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

  // Get count for an asset type
  const getTypeCount = (type: string): number => {
    return stats.byType[type] ?? 0
  }

  // Calculate category total based on filtered types
  const getCategoryTotal = (category: AssetTypeCategory): number => {
    const types = filteredCategoryTypes[category] || []
    return types.reduce((sum, type) => sum + getTypeCount(type), 0)
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

        {/* Asset Categories */}
        <div className="mt-8 grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
          {(Object.keys(ASSET_TYPE_CATEGORIES) as AssetTypeCategory[])
            .filter((categoryKey) => {
              // Hide categories with no visible types
              const types = filteredCategoryTypes[categoryKey] || []
              return types.length > 0
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
                      {(filteredCategoryTypes[categoryKey] || [])
                        .slice(0, 6) // Limit to 6 types per category
                        .map((type) => {
                          const TypeIcon = ASSET_TYPE_ICONS[type] || Container
                          const count = getTypeCount(type)
                          const url = ASSET_TYPE_URLS[type]
                          const name = ASSET_TYPE_NAMES[type] || type

                          return (
                            <Link
                              key={type}
                              href={url}
                              className="flex items-center justify-between p-2 rounded-lg hover:bg-accent/50 transition-colors group"
                            >
                              <div className="flex items-center gap-2">
                                <TypeIcon className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm">{name}</span>
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
