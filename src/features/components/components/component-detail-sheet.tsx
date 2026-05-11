/**
 * Component Detail Sheet
 *
 * Beautiful sheet component for viewing software component details
 * Following the design patterns from AssetDetailSheet
 */

'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import {
  Package,
  ExternalLink,
  GitBranch,
  Clock,
  Shield,
  Scale,
  AlertTriangle,
  CheckCircle,
  Copy,
  Globe,
  Layers,
  Loader2,
  Server,
  ChevronRight,
  Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { TooltipProvider } from '@/components/ui/tooltip'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import { copyToClipboard } from '@/lib/clipboard'
import { cn, sanitizeExternalUrl } from '@/lib/utils'
import { toast } from 'sonner'
import { EcosystemBadge } from './ecosystem-badge'
import { SeverityBadge } from './severity-badge'
import { LicenseRiskBadge, LicenseCategoryBadge } from './license-badge'
import {
  RiskScoreBadge,
  SheetDetailToolbar,
  SheetInfoRow as InfoRow,
  SheetPaginationFooter as PaginationFooter,
  SheetStatCard as StatCard,
} from '@/features/shared'
import type { Component } from '../types'
import { useComponentAssetsApi, useComponentVulnsApi } from '../api/use-components-api'
import { VulnerabilityDetailSheet } from '@/features/vulnerabilities'
import type { Vulnerability } from '@/features/vulnerabilities'
import type { Severity } from '@/features/shared/types'
import type { ApiComponentVulnerability } from '../api/component-api.types'

// ============================================
// Types
// ============================================

interface ComponentDetailSheetProps {
  /** The component to display (null when sheet is closed) */
  component: Component | null

  /** Whether the sheet is open */
  open: boolean

  /** Callback when open state changes */
  onOpenChange: (open: boolean) => void
}

// ============================================
// Helper Components
// ============================================

// StatCard, InfoRow, PaginationFooter are imported as aliases from
// @/features/shared (sheet-primitives) — see imports above.

/**
 * Build a partial Vulnerability object from a row in the component-vulns API.
 * Used as `fallback` for VulnerabilityDetailSheet so its header renders
 * immediately while the full /vulnerabilities/{id} fetch is in flight.
 */
function vulnFallbackFromRow(v: ApiComponentVulnerability): Vulnerability {
  return {
    id: v.vulnerability_id,
    cve_id: v.cve_id,
    title: v.title,
    severity: v.severity as Severity,
    cvss_score: v.cvss_score ?? undefined,
    epss_score: v.epss_score ?? undefined,
    exploit_available: v.exploit_available,
    exploit_maturity: (v.exploit_maturity ?? 'none') as Vulnerability['exploit_maturity'],
    fixed_versions: v.fixed_versions,
    status: 'open',
    risk_score: 0,
    created_at: v.first_detected_at,
    updated_at: v.last_seen_at,
  }
}

// ============================================
// Component
// ============================================

const CRITICALITY_BADGE: Record<string, string> = {
  critical: 'bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30',
  high: 'bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30',
  medium: 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/30',
  low: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30',
}

const VULNS_PER_PAGE = 10
const ASSETS_PER_PAGE = 10

export function ComponentDetailSheet({ component, open, onOpenChange }: ComponentDetailSheetProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = React.useState('overview')
  const [vulnsPage, setVulnsPage] = React.useState(1)
  const [assetsPage, setAssetsPage] = React.useState(1)
  // Selected CVE for the nested vulnerability detail sheet (cross-link).
  // We carry both id + a fallback Vulnerability object built from the row data
  // so the nested sheet's header renders instantly while the full detail loads.
  const [selectedVuln, setSelectedVuln] = React.useState<{
    id: string
    fallback: Vulnerability
  } | null>(null)

  // Vulnerabilities and Assets are both fetched as soon as the sheet opens
  // (page 1 only). The `total` from each response feeds the Overview tab
  // counts, and the data is reused when user clicks into the tab.
  // Subsequent page changes refetch via SWR key change.
  const componentId = open ? (component?.id ?? null) : null
  const {
    data: vulnsData,
    isLoading: vulnsLoading,
    error: vulnsError,
  } = useComponentVulnsApi(componentId, {
    page: vulnsPage,
    perPage: VULNS_PER_PAGE,
  })
  const {
    data: assetsData,
    isLoading: assetsLoading,
    error: assetsError,
  } = useComponentAssetsApi(componentId, assetsPage, ASSETS_PER_PAGE)

  // Reset tab + pagination when component changes
  React.useEffect(() => {
    if (component) {
      setActiveTab('overview')
      setVulnsPage(1)
      setAssetsPage(1)
    }
  }, [component])

  if (!component) return null

  const distinctCveCount = vulnsData?.total ?? 0
  const usedByAssetsCount = assetsData?.total ?? 0

  const handleCopyPurl = () => {
    copyToClipboard(component.purl)
    toast.success('PURL copied to clipboard')
  }

  // Determine gradient color based on risk
  const gradientFrom =
    component.riskScore >= 70
      ? 'from-red-500/20'
      : component.riskScore >= 40
        ? 'from-orange-500/20'
        : 'from-blue-500/20'

  const gradientVia =
    component.riskScore >= 70
      ? 'via-red-500/10'
      : component.riskScore >= 40
        ? 'via-orange-500/10'
        : 'via-blue-500/10'

  const iconColor =
    component.riskScore >= 70
      ? 'text-red-500'
      : component.riskScore >= 40
        ? 'text-orange-500'
        : 'text-blue-500'

  const iconBgColor =
    component.riskScore >= 70
      ? 'bg-red-500/20'
      : component.riskScore >= 40
        ? 'bg-orange-500/20'
        : 'bg-blue-500/20'

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className="sm:max-w-xl overflow-y-auto p-0 [&>button]:hidden"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <VisuallyHidden>
          <SheetTitle>Component Details</SheetTitle>
        </VisuallyHidden>

        <TooltipProvider>
          <SheetDetailToolbar
            title="Component Details"
            onClose={() => onOpenChange(false)}
            onCopyId={() => {
              copyToClipboard(component.id)
              toast.success('ID copied to clipboard')
            }}
          />
        </TooltipProvider>

        {/* Header with gradient */}
        <div
          className={cn(
            'px-6 pt-6 pb-4 bg-gradient-to-br to-transparent',
            gradientFrom,
            gradientVia
          )}
        >
          <div className="flex items-start gap-3 mb-3">
            <div
              className={cn(
                'h-12 w-12 rounded-xl flex items-center justify-center shrink-0',
                iconBgColor
              )}
            >
              <Package className={cn('h-6 w-6', iconColor)} />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold truncate">{component.name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="font-mono text-xs">
                  v{component.version}
                </Badge>
                <EcosystemBadge ecosystem={component.ecosystem} />
                {component.isDirect ? (
                  <Badge variant="secondary" className="text-xs">
                    Direct
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs gap-1">
                    <GitBranch className="h-3 w-3" />
                    Transitive
                  </Badge>
                )}
              </div>
            </div>
            <RiskScoreBadge score={component.riskScore} />
          </div>

          {/* PURL with copy button */}
          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 border">
            <code className="text-xs text-muted-foreground flex-1 truncate font-mono">
              {component.purl}
            </code>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 shrink-0"
              onClick={handleCopyPurl}
            >
              <Copy className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap gap-2 mt-4">
            {component.homepage && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() =>
                  window.open(
                    sanitizeExternalUrl(component.homepage!),
                    '_blank',
                    'noopener,noreferrer'
                  )
                }
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Homepage
              </Button>
            )}
            {component.repositoryUrl && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() =>
                  window.open(
                    sanitizeExternalUrl(component.repositoryUrl!),
                    '_blank',
                    'noopener,noreferrer'
                  )
                }
              >
                <GitBranch className="mr-2 h-4 w-4" />
                Repository
              </Button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="px-6 pb-6">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="vulnerabilities" className="gap-1">
              CVEs
              {distinctCveCount > 0 && (
                <Badge variant="destructive" className="h-5 px-1.5 text-xs ml-1">
                  {distinctCveCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="assets" className="gap-1">
              Assets
              {usedByAssetsCount > 0 && (
                <Badge variant="secondary" className="h-5 px-1.5 text-xs ml-1">
                  {usedByAssetsCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4 mt-0">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              <StatCard
                icon={Shield}
                label="Risk Score"
                value={`${component.riskScore}/100`}
                color={
                  component.riskScore >= 70
                    ? 'text-red-500'
                    : component.riskScore >= 40
                      ? 'text-orange-500'
                      : 'text-green-500'
                }
                description={
                  component.riskScore >= 70
                    ? 'Critical risk'
                    : component.riskScore >= 40
                      ? 'Medium risk'
                      : 'Low risk'
                }
              />
              <StatCard
                icon={AlertTriangle}
                label="CVEs"
                value={vulnsLoading && !vulnsData ? '…' : distinctCveCount}
                color={distinctCveCount > 0 ? 'text-red-500' : 'text-green-500'}
                description={
                  // Use the first row's severity as the "worst" indicator —
                  // backend orders by severity → KEV → CVSS so row 0 is the
                  // most concerning CVE. We avoid `data.filter().length` here
                  // because data is paginated (would only count page 1, not
                  // the full set).
                  distinctCveCount === 0
                    ? 'No issues'
                    : vulnsData?.data?.[0]
                      ? `Worst: ${vulnsData.data[0].severity}${
                          vulnsData.data[0].in_cisa_kev ? ' · KEV' : ''
                        }`
                      : 'View list'
                }
              />
            </div>

            {/* Description */}
            {component.description && (
              <Card>
                <CardContent className="pt-4">
                  <p className="text-sm text-muted-foreground">{component.description}</p>
                </CardContent>
              </Card>
            )}

            {/* License Info */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Scale className="h-4 w-4" />
                  License Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <InfoRow label="License">
                  <span className="font-mono text-sm">{component.licenseId || 'Unknown'}</span>
                </InfoRow>
                <Separator />
                <InfoRow label="Category">
                  <LicenseCategoryBadge category={component.licenseCategory} />
                </InfoRow>
                <Separator />
                <InfoRow label="Risk Level">
                  <LicenseRiskBadge risk={component.licenseRisk} showTooltip={false} />
                </InfoRow>
              </CardContent>
            </Card>

            {/* Package Details */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Package Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <InfoRow label="Type">
                  <span className="capitalize text-sm">{component.type}</span>
                </InfoRow>
                <Separator />
                <InfoRow label="Ecosystem">
                  <EcosystemBadge ecosystem={component.ecosystem} />
                </InfoRow>
                <Separator />
                <InfoRow label="Dependency">
                  {component.isDirect ? (
                    <Badge variant="outline" className="gap-1">
                      <CheckCircle className="h-3 w-3 text-green-500" />
                      Direct
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="gap-1">
                      <GitBranch className="h-3 w-3" />
                      Transitive (depth: {component.depth})
                    </Badge>
                  )}
                </InfoRow>
                {component.isOutdated && component.latestVersion && (
                  <>
                    <Separator />
                    <InfoRow label="Update Available">
                      <Badge className="bg-yellow-500 text-white gap-1">
                        <Clock className="h-3 w-3" />
                        {component.latestVersion}
                      </Badge>
                    </InfoRow>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Reach (replaces the old Sources tab — concise summary) */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Server className="h-4 w-4" />
                  Reach in your environment
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <InfoRow label="Used by assets">
                  <button
                    type="button"
                    onClick={() => setActiveTab('assets')}
                    className="inline-flex items-center gap-1 text-sm font-medium hover:underline disabled:no-underline disabled:cursor-default"
                    disabled={usedByAssetsCount === 0}
                  >
                    <span>{usedByAssetsCount}</span>
                    {usedByAssetsCount > 0 && <ChevronRight className="h-3 w-3" />}
                  </button>
                </InfoRow>
                <Separator />
                <InfoRow label="Known CVEs">
                  <button
                    type="button"
                    onClick={() => setActiveTab('vulnerabilities')}
                    className="inline-flex items-center gap-1 text-sm font-medium hover:underline disabled:no-underline disabled:cursor-default"
                    disabled={distinctCveCount === 0}
                  >
                    <span className={cn(distinctCveCount > 0 && 'text-red-500')}>
                      {distinctCveCount}
                    </span>
                    {distinctCveCount > 0 && <ChevronRight className="h-3 w-3" />}
                  </button>
                </InfoRow>
              </CardContent>
            </Card>

            {/* Timestamps */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Timeline
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <InfoRow label="First Seen">
                  <span className="text-sm">
                    {new Date(component.firstSeen).toLocaleDateString()}
                  </span>
                </InfoRow>
                <Separator />
                <InfoRow label="Last Seen">
                  <span className="text-sm">
                    {new Date(component.lastSeen).toLocaleDateString()}
                  </span>
                </InfoRow>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Vulnerabilities Tab — real CVEs paginated, click to drill into VulnDetailSheet */}
          <TabsContent value="vulnerabilities" className="mt-0">
            {vulnsError ? (
              <Card className="border-destructive/50">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <AlertTriangle className="h-12 w-12 text-destructive mb-3" />
                  <h3 className="text-lg font-medium text-destructive">Failed to load CVEs</h3>
                  <p className="text-muted-foreground text-sm text-center mt-1 max-w-xs">
                    {vulnsError instanceof Error
                      ? vulnsError.message
                      : 'Could not fetch vulnerabilities for this component.'}
                  </p>
                </CardContent>
              </Card>
            ) : vulnsLoading && !vulnsData ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : distinctCveCount === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <div className="h-12 w-12 rounded-full bg-green-500/20 flex items-center justify-center mb-4">
                    <CheckCircle className="h-6 w-6 text-green-500" />
                  </div>
                  <h3 className="text-lg font-medium">No CVEs Detected</h3>
                  <p className="text-muted-foreground text-sm text-center">
                    No open findings link this component to any CVE in your tenant.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">
                      {distinctCveCount} distinct CVE{distinctCveCount === 1 ? '' : 's'} affect this
                      component
                    </CardTitle>
                    <CardDescription>
                      Sorted by severity, then KEV status, then CVSS. Click a row for full CVE
                      detail.
                    </CardDescription>
                  </CardHeader>
                </Card>

                <div className="space-y-2">
                  {vulnsData?.data.map((v) => (
                    <Card
                      key={v.vulnerability_id}
                      className={cn(
                        'overflow-hidden cursor-pointer transition-colors hover:border-primary',
                        v.in_cisa_kev && 'border-red-500/50'
                      )}
                      onClick={() =>
                        setSelectedVuln({
                          id: v.vulnerability_id,
                          fallback: vulnFallbackFromRow(v),
                        })
                      }
                    >
                      <div
                        className={cn(
                          'h-1',
                          v.severity === 'critical' && 'bg-red-500',
                          v.severity === 'high' && 'bg-orange-500',
                          v.severity === 'medium' && 'bg-yellow-500',
                          v.severity === 'low' && 'bg-blue-500'
                        )}
                      />
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2 flex-wrap min-w-0">
                            <Badge variant="outline" className="font-mono text-xs">
                              {v.cve_id}
                            </Badge>
                            <SeverityBadge severity={v.severity as Severity} />
                            {v.in_cisa_kev && (
                              <Badge className="bg-red-600 text-white text-xs">CISA KEV</Badge>
                            )}
                            {v.exploit_available && (
                              <Badge
                                variant="outline"
                                className="text-xs gap-1 border-orange-500/50 text-orange-700 dark:text-orange-400"
                              >
                                <Zap className="h-3 w-3" />
                                Exploit
                              </Badge>
                            )}
                          </div>
                          {v.cvss_score != null && (
                            <Badge variant="secondary" className="text-xs shrink-0">
                              CVSS {v.cvss_score.toFixed(1)}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm mb-2 line-clamp-2">{v.title}</p>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <Server className="h-3 w-3" />
                            {v.affected_assets_count} asset
                            {v.affected_assets_count === 1 ? '' : 's'}
                          </span>
                          {v.open_finding_count > 0 ? (
                            <span className="text-red-500">
                              {v.open_finding_count} open / {v.total_finding_count} finding
                              {v.total_finding_count === 1 ? '' : 's'}
                            </span>
                          ) : (
                            <span>{v.total_finding_count} finding(s)</span>
                          )}
                          {v.epss_score != null && (
                            <span>EPSS: {(v.epss_score * 100).toFixed(1)}%</span>
                          )}
                          {v.fixed_versions.length > 0 && (
                            <span className="ml-auto inline-flex items-center gap-1 text-green-600">
                              <CheckCircle className="h-3 w-3" />
                              Fix: {v.fixed_versions[0]}
                              {v.fixed_versions.length > 1 && ` (+${v.fixed_versions.length - 1})`}
                            </span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {(vulnsData?.total_pages ?? 1) > 1 && (
                  <PaginationFooter
                    page={vulnsPage}
                    totalPages={vulnsData?.total_pages ?? 1}
                    pageSize={VULNS_PER_PAGE}
                    total={distinctCveCount}
                    rendered={vulnsData?.data?.length ?? 0}
                    onPageChange={setVulnsPage}
                  />
                )}
              </div>
            )}
          </TabsContent>

          {/* Used By Assets Tab — blast-radius reverse lookup */}
          <TabsContent value="assets" className="mt-0">
            {assetsError ? (
              <Card className="border-destructive/50">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <AlertTriangle className="h-12 w-12 text-destructive mb-3" />
                  <h3 className="text-lg font-medium text-destructive">Failed to load assets</h3>
                  <p className="text-muted-foreground text-sm text-center mt-1 max-w-xs">
                    {assetsError instanceof Error
                      ? assetsError.message
                      : 'Could not fetch assets using this component.'}
                  </p>
                </CardContent>
              </Card>
            ) : assetsLoading && !assetsData ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (assetsData?.data?.length ?? 0) === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
                    <Server className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-medium">Not Used By Any Asset</h3>
                  <p className="text-muted-foreground text-sm text-center">
                    No asset in this tenant currently links to this component.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">
                      Used by {assetsData?.total} asset{(assetsData?.total ?? 0) === 1 ? '' : 's'}
                    </CardTitle>
                    <CardDescription>
                      Sorted by criticality, then risk score. Internet-exposed assets first.
                    </CardDescription>
                  </CardHeader>
                </Card>

                <div className="space-y-2">
                  {assetsData?.data.map((u) => (
                    <Card
                      key={u.dependency_id}
                      className="overflow-hidden cursor-pointer transition-colors hover:border-primary"
                      onClick={() => {
                        onOpenChange(false)
                        router.push(`/assets/${u.asset_id}`)
                      }}
                    >
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <Server className="h-4 w-4 text-muted-foreground shrink-0" />
                              <span className="font-medium truncate">{u.asset_name}</span>
                              <Badge variant="outline" className="text-xs capitalize shrink-0">
                                {u.asset_type.replace(/_/g, ' ')}
                              </Badge>
                              {u.is_internet_accessible && (
                                <Badge
                                  variant="outline"
                                  className="text-xs gap-1 border-orange-500/50 text-orange-700 dark:text-orange-400"
                                >
                                  <Globe className="h-3 w-3" />
                                  Internet
                                </Badge>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                              <Badge
                                variant="outline"
                                className={cn(
                                  'text-xs capitalize',
                                  CRITICALITY_BADGE[u.criticality]
                                )}
                              >
                                {u.criticality}
                              </Badge>
                              <Badge variant="secondary" className="text-xs gap-1">
                                <Layers className="h-3 w-3" />
                                {u.is_direct ? 'direct' : `transitive (depth ${u.depth})`}
                              </Badge>
                              {u.vulnerability_count > 0 && (
                                <Badge variant="destructive" className="text-xs gap-1">
                                  <AlertTriangle className="h-3 w-3" />
                                  {u.vulnerability_count} vuln
                                  {u.vulnerability_count === 1 ? '' : 's'}
                                </Badge>
                              )}
                            </div>
                            {u.manifest_file && (
                              <code className="text-xs text-muted-foreground font-mono block mt-2 truncate">
                                {u.manifest_path
                                  ? `${u.manifest_path} (${u.manifest_file})`
                                  : u.manifest_file}
                              </code>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-xs text-muted-foreground">Risk</div>
                            <div className="text-lg font-bold">{u.risk_score}</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {(assetsData?.total_pages ?? 1) > 1 && (
                  <PaginationFooter
                    page={assetsPage}
                    totalPages={assetsData?.total_pages ?? 1}
                    pageSize={ASSETS_PER_PAGE}
                    total={usedByAssetsCount}
                    rendered={assetsData?.data?.length ?? 0}
                    onPageChange={setAssetsPage}
                  />
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </SheetContent>

      {/* Nested vulnerability detail sheet — opens when user clicks a CVE row */}
      <VulnerabilityDetailSheet
        vulnerabilityId={selectedVuln?.id ?? null}
        fallback={selectedVuln?.fallback ?? null}
        open={selectedVuln !== null}
        onOpenChange={(o) => !o && setSelectedVuln(null)}
      />
    </Sheet>
  )
}
