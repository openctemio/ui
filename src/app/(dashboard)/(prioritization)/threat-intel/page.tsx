'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Main } from '@/components/layout'
import { PageHeader, EmptyState } from '@/features/shared'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { useUrlFilter } from '@/hooks/use-url-param'
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
  ThreatActorsPanel,
} from '@/features/threat-intel/components'
import { EPSSScoreBadge, EPSSScoreMeter } from '@/features/shared/components/epss-score-badge'
import { KEVIndicatorBadge, KEVStatus } from '@/features/shared/components/kev-indicator-badge'
import type { CVEEnrichment } from '@/lib/api/threatintel-types'

const TABS = ['overview', 'actors', 'lookup', 'sync']

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

  const [tabParam, setTab] = useUrlFilter('tab', 'overview')
  const activeTab = TABS.includes(tabParam) ? tabParam : 'overview'

  return (
    <Main>
      <PageHeader
        title="Threat intelligence"
        description="Exploit likelihood (EPSS), known-exploited CVEs (CISA KEV) and tracked threat actors."
      >
        <CompactSyncStatus statuses={syncStatuses} />
        <Button variant="outline" size="sm" onClick={handleRefreshAll} disabled={isLoading}>
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin sm:me-2" />
          ) : (
            <RefreshCw className="h-4 w-4 sm:me-2" />
          )}
          <span className="hidden sm:inline">Refresh</span>
        </Button>
      </PageHeader>

      {/* The active tab lives in the URL (?tab=) so each view can be linked. */}
      <Tabs value={activeTab} onValueChange={setTab} className="mt-4">
        <TabsList>
          <TabsTrigger value="overview">Threat landscape</TabsTrigger>
          <TabsTrigger value="actors">Threat actors</TabsTrigger>
          <TabsTrigger value="lookup">CVE lookup</TabsTrigger>
          <TabsTrigger value="sync">Sync status</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-5 space-y-5">
          <ThreatIntelOverview
            epssStats={epssStats}
            kevStats={kevStats}
            lastSyncAt={lastSync}
            isLoading={isLoading}
          />

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <InfoCard
              title="What is EPSS?"
              icon={TrendingUp}
              description="The Exploit Prediction Scoring System (EPSS) provides a probability score (0-1) indicating the likelihood that a vulnerability will be exploited in the next 30 days."
              links={[{ label: 'FIRST EPSS', url: 'https://www.first.org/epss/' }]}
            />
            <InfoCard
              title="What is CISA KEV?"
              icon={AlertOctagon}
              description="The CISA Known Exploited Vulnerabilities (KEV) catalog lists vulnerabilities that are being actively exploited in the wild and require immediate remediation attention."
              links={[
                {
                  label: 'CISA KEV catalog',
                  url: 'https://www.cisa.gov/known-exploited-vulnerabilities-catalog',
                },
              ]}
            />
          </div>
        </TabsContent>

        <TabsContent value="actors" className="mt-5">
          <ThreatActorsPanel />
        </TabsContent>

        <TabsContent value="lookup" className="mt-5">
          <CVELookup />
        </TabsContent>

        <TabsContent value="sync" className="mt-5">
          <SyncStatusManager statuses={syncStatuses} onRefresh={refresh} />
        </TabsContent>
      </Tabs>
    </Main>
  )
}

interface InfoCardProps {
  title: string
  icon: typeof Shield
  description: string
  links?: Array<{ label: string; url: string }>
}

function InfoCard({ title, icon: Icon, description, links }: InfoCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="h-4 w-4 text-muted-foreground" />
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
    <div className="space-y-5">
      {/* Search Input */}
      <Card>
        <CardHeader>
          <CardTitle>CVE lookup</CardTitle>
          <CardDescription>Look up the EPSS score and KEV status of any CVE.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <div className="relative min-w-0 flex-1">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="CVE ID, e.g. CVE-2021-44228"
                aria-label="CVE ID"
                value={cveId}
                onChange={(e) => setCveId(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
                className="ps-9"
              />
            </div>
            <Button onClick={handleLookup} disabled={isLookingUp}>
              {isLookingUp ? (
                <Loader2 className="me-2 h-4 w-4 animate-spin" />
              ) : (
                <Search className="me-2 h-4 w-4" />
              )}
              Lookup
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error State */}
      {error && (
        <Alert variant="destructive">
          <Info />
          <AlertTitle>Lookup failed</AlertTitle>
          <AlertDescription>
            <p>{error}</p>
            <Button variant="outline" size="sm" className="mt-2" onClick={handleLookup}>
              <RefreshCw className="me-2 h-4 w-4" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-4">
          {/* CVE Header */}
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="font-mono">{result.cve_id}</CardTitle>
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
                Enriched {new Date(result.enriched_at).toLocaleString()}
              </CardDescription>
            </CardHeader>
          </Card>

          {/* EPSS Details */}
          {result.epss && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  EPSS score
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Score</p>
                    <p className="text-2xl font-semibold tabular-nums">
                      {(result.epss.score * 100).toFixed(2)}%
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Probability of exploitation in next 30 days
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Percentile</p>
                    <p className="text-2xl font-semibold tabular-nums">
                      {result.epss.percentile.toFixed(1)}%
                    </p>
                    <p className="text-xs text-muted-foreground">Higher than this % of all CVEs</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Model version</p>
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
                <CardTitle className="flex items-center gap-2 text-base">
                  <AlertOctagon className="h-4 w-4 text-muted-foreground" />
                  CISA KEV entry
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

                <div className="space-y-3 border-t pt-4">
                  <div>
                    <p className="text-sm font-medium">Vendor / product</p>
                    <p className="text-sm text-muted-foreground">
                      {result.kev.vendor_project} - {result.kev.product}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Vulnerability name</p>
                    <p className="text-sm text-muted-foreground">{result.kev.vulnerability_name}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Description</p>
                    <p className="text-sm text-muted-foreground">{result.kev.short_description}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Required action</p>
                    <p className="text-sm text-muted-foreground">{result.kev.required_action}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Shield className="h-5 w-5" />
                  <span>This CVE is not in the CISA KEV catalog</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* No Data State */}
          {!result.epss && !result.kev && (
            <EmptyState icon={Info} title="No threat intelligence data available for this CVE" />
          )}
        </div>
      )}
    </div>
  )
}
