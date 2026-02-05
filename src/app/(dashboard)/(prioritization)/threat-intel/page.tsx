'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Main } from '@/components/layout'
import { cn } from '@/lib/utils'
import {
  TrendingUp,
  AlertOctagon,
  Shield,
  Search,
  RefreshCw,
  Loader2,
  ExternalLink,
  Info,
} from 'lucide-react'
import { toast } from 'sonner'
import { useTenant } from '@/context/tenant-provider'

import { useThreatIntelStats, enrichCVE } from '@/features/threat-intel/hooks'
import {
  ThreatIntelOverview,
  SyncStatusManager,
  CompactSyncStatus,
} from '@/features/threat-intel/components'
import { EPSSScoreBadge, EPSSScoreMeter } from '@/features/shared/components/epss-score-badge'
import { KEVIndicatorBadge, KEVStatus } from '@/features/shared/components/kev-indicator-badge'
import type { CVEEnrichment } from '@/lib/api/threatintel-types'

export default function ThreatIntelPage() {
  const { currentTenant } = useTenant()
  const tenantId = currentTenant?.id || null

  // Use unified stats hook - single API call for all data
  const {
    epssStats,
    kevStats,
    syncStatuses,
    isLoading,
    mutate: refresh,
  } = useThreatIntelStats(tenantId)

  const handleRefreshAll = () => {
    refresh()
  }

  const lastSync = syncStatuses.length > 0 ? syncStatuses[0].last_sync_at : undefined

  return (
    <>
      <Main>
        <div className="space-y-6">
          {/* Page Header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Threat Intelligence</h1>
              <p className="text-muted-foreground">
                EPSS and CISA KEV data for vulnerability prioritization
              </p>
            </div>
            <div className="flex items-center gap-4">
              <CompactSyncStatus statuses={syncStatuses} />
              <Button variant="outline" onClick={handleRefreshAll} disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Refresh
              </Button>
            </div>
          </div>

          {/* Main Content */}
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="lookup">CVE Lookup</TabsTrigger>
              <TabsTrigger value="sync">Sync Status</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-4">
              <ThreatIntelOverview
                epssStats={epssStats}
                kevStats={kevStats}
                lastSyncAt={lastSync}
                isLoading={isLoading}
              />

              {/* Info Cards */}
              <div className="grid gap-4 md:grid-cols-2">
                <InfoCard
                  title="What is EPSS?"
                  icon={TrendingUp}
                  iconColor="text-orange-500"
                  description="The Exploit Prediction Scoring System (EPSS) provides a probability score (0-1) indicating the likelihood that a vulnerability will be exploited in the next 30 days."
                  links={[{ label: 'FIRST EPSS', url: 'https://www.first.org/epss/' }]}
                />
                <InfoCard
                  title="What is CISA KEV?"
                  icon={AlertOctagon}
                  iconColor="text-red-500"
                  description="The CISA Known Exploited Vulnerabilities (KEV) catalog lists vulnerabilities that are being actively exploited in the wild and require immediate remediation attention."
                  links={[
                    {
                      label: 'CISA KEV Catalog',
                      url: 'https://www.cisa.gov/known-exploited-vulnerabilities-catalog',
                    },
                  ]}
                />
              </div>
            </TabsContent>

            {/* CVE Lookup Tab */}
            <TabsContent value="lookup" className="space-y-4">
              <CVELookup />
            </TabsContent>

            {/* Sync Status Tab */}
            <TabsContent value="sync" className="space-y-4">
              <SyncStatusManager statuses={syncStatuses} onRefresh={refresh} />
            </TabsContent>
          </Tabs>
        </div>
      </Main>
    </>
  )
}

interface InfoCardProps {
  title: string
  icon: typeof Shield
  iconColor: string
  description: string
  links?: Array<{ label: string; url: string }>
}

function InfoCard({ title, icon: Icon, iconColor, description, links }: InfoCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Icon className={cn('h-4 w-4', iconColor)} />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">{description}</p>
        {links && links.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {links.map((link) => (
              <a
                key={link.url}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
              >
                {link.label}
                <ExternalLink className="h-3 w-3" />
              </a>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function CVELookup() {
  const [cveId, setCveId] = useState('')
  const [isLookingUp, setIsLookingUp] = useState(false)
  const [result, setResult] = useState<CVEEnrichment | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleLookup = async () => {
    if (!cveId.trim()) {
      toast.error('Please enter a CVE ID')
      return
    }

    // Validate CVE format
    const cveRegex = /^CVE-\d{4}-\d{4,}$/i
    if (!cveRegex.test(cveId.trim())) {
      toast.error('Invalid CVE format. Expected: CVE-YYYY-NNNNN')
      return
    }

    setIsLookingUp(true)
    setError(null)
    setResult(null)

    try {
      const enrichment = await enrichCVE(cveId.trim().toUpperCase())
      setResult(enrichment)
    } catch (err) {
      setError('CVE not found or enrichment data unavailable')
      console.error(err)
    } finally {
      setIsLookingUp(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Search Input */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">CVE Lookup</CardTitle>
          <CardDescription>Look up EPSS score and KEV status for any CVE</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Enter CVE ID (e.g., CVE-2021-44228)"
                value={cveId}
                onChange={(e) => setCveId(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
                className="pl-9"
              />
            </div>
            <Button onClick={handleLookup} disabled={isLookingUp}>
              {isLookingUp ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Search className="mr-2 h-4 w-4" />
              )}
              Lookup
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error State */}
      {error && (
        <Card className="border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
              <Info className="h-5 w-5" />
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-4">
          {/* CVE Header */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">{result.cve_id}</CardTitle>
                <div className="flex items-center gap-2">
                  {result.epss && (
                    <EPSSScoreBadge
                      score={result.epss.score}
                      percentile={result.epss.percentile}
                      showPercentile
                      size="lg"
                    />
                  )}
                  <KEVIndicatorBadge
                    inKEV={!!result.kev}
                    kevData={
                      result.kev
                        ? {
                            date_added: result.kev.date_added,
                            due_date: result.kev.due_date,
                            ransomware_use: result.kev.known_ransomware_campaign_use,
                            notes: result.kev.notes,
                          }
                        : null
                    }
                    size="lg"
                  />
                </div>
              </div>
              <CardDescription>
                Enriched at: {new Date(result.enriched_at).toLocaleString()}
              </CardDescription>
            </CardHeader>
          </Card>

          {/* EPSS Details */}
          {result.epss && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-orange-500" />
                  EPSS Score Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Score</p>
                    <p className="text-2xl font-bold">{(result.epss.score * 100).toFixed(2)}%</p>
                    <p className="text-xs text-muted-foreground">
                      Probability of exploitation in next 30 days
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Percentile</p>
                    <p className="text-2xl font-bold">{result.epss.percentile.toFixed(1)}%</p>
                    <p className="text-xs text-muted-foreground">Higher than this % of all CVEs</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Model Version</p>
                    <p className="text-lg font-medium">{result.epss.model_version}</p>
                    <p className="text-xs text-muted-foreground">
                      Score date: {new Date(result.epss.score_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <EPSSScoreMeter score={result.epss.score} size="lg" showLabel />
              </CardContent>
            </Card>
          )}

          {/* KEV Details */}
          {result.kev ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertOctagon className="h-4 w-4 text-red-500" />
                  CISA KEV Entry
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <KEVStatus
                  inKEV
                  kevData={{
                    date_added: result.kev.date_added,
                    due_date: result.kev.due_date,
                    ransomware_use: result.kev.known_ransomware_campaign_use,
                    notes: result.kev.notes,
                  }}
                />

                <div className="space-y-3 pt-4 border-t">
                  <div>
                    <p className="text-sm font-medium">Vendor / Product</p>
                    <p className="text-sm text-muted-foreground">
                      {result.kev.vendor_project} - {result.kev.product}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Vulnerability Name</p>
                    <p className="text-sm text-muted-foreground">{result.kev.vulnerability_name}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Description</p>
                    <p className="text-sm text-muted-foreground">{result.kev.short_description}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Required Action</p>
                    <p className="text-sm text-muted-foreground">{result.kev.required_action}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 text-muted-foreground">
                  <Shield className="h-5 w-5" />
                  <span>This CVE is not in the CISA KEV catalog</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* No Data State */}
          {!result.epss && !result.kev && (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center text-muted-foreground">
                  <Info className="mx-auto h-8 w-8 mb-2" />
                  <p>No threat intelligence data available for this CVE</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
