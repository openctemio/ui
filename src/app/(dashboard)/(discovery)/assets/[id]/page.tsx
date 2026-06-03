/**
 * Generic asset detail page — `/assets/{id}`.
 *
 * Catches deep-links from blast-radius views (Vuln Detail Sheet → "Affected
 * Assets" tab → click row, Component Detail Sheet → "Used By Assets" tab →
 * click row). Without this route those clicks 404'd.
 *
 * Behavior:
 *  - Fetch asset by id.
 *  - Repository assets have a rich dedicated page at /assets/repositories/{id};
 *    redirect there.
 *  - Other asset types: render a minimal detail layout (header + key fields)
 *    plus a CTA back to the typed listing.
 */

'use client'

import * as React from 'react'
import { useRouter, useParams } from 'next/navigation'
import { AlertCircle, ArrowLeft, Globe, Loader2, Server, Shield } from 'lucide-react'
import { Main } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/features/shared'
import { useAsset } from '@/features/assets'
import { cn } from '@/lib/utils'

const CRITICALITY_COLOR: Record<string, string> = {
  critical: 'text-red-600',
  high: 'text-orange-600',
  medium: 'text-yellow-600',
  low: 'text-blue-600',
}

// Map asset_type → category route slug used in /assets/<slug>/ listings.
// Matches the directory structure in app/(dashboard)/(discovery)/assets/.
const TYPE_TO_LISTING_SLUG: Record<string, string> = {
  repository: 'repositories',
  web_application: 'web-applications',
  website: 'websites',
  api: 'apis',
  mobile_app: 'mobile',
  domain: 'domains',
  subdomain: 'domains',
  certificate: 'certificates',
  ip_address: 'ip-addresses',
  host: 'hosts',
  server: 'hosts',
  container: 'containers',
  kubernetes_cluster: 'cloud-resources',
  kubernetes_namespace: 'cloud-resources',
  database: 'databases',
  data_store: 'databases',
  s3_bucket: 'storage',
  storage: 'storage',
  cloud_account: 'cloud-accounts',
  compute: 'cloud-resources',
  serverless: 'serverless',
  service: 'services',
  network: 'networks',
  vpc: 'vpcs',
  iam_user: 'iam-users',
  iam_role: 'iam-roles',
  service_account: 'service-accounts',
}

export default function AssetDetailPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const assetId = params?.id ?? null

  const { asset, isLoading, error } = useAsset(assetId)

  // Repository has a rich dedicated page — redirect there.
  React.useEffect(() => {
    if (asset && asset.type === 'repository') {
      router.replace(`/assets/repositories/${asset.id}`)
    }
  }, [asset, router])

  if (isLoading) {
    return (
      <Main>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </Main>
    )
  }

  if (error || !asset) {
    return (
      <Main>
        <PageHeader title="Asset not found" className="mb-6" />
        <Card className="border-destructive/40">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-destructive mb-3" />
            <p className="text-base font-medium">
              {error ? 'Failed to load asset details' : 'No asset with this ID'}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              The asset may have been deleted or you may not have access.
            </p>
            <Button variant="outline" className="mt-4" onClick={() => router.push('/assets')}>
              <ArrowLeft className="me-2 h-4 w-4" />
              Back to assets
            </Button>
          </CardContent>
        </Card>
      </Main>
    )
  }

  const listingSlug = TYPE_TO_LISTING_SLUG[asset.type] ?? null
  const typeLabel = asset.type.replace(/_/g, ' ')

  return (
    <Main>
      <div className="mb-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="me-2 h-4 w-4" />
          Back
        </Button>
      </div>

      <PageHeader title={asset.name} description={`Asset · ${typeLabel}`} className="mb-6" />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Criticality
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p
              className={cn('text-2xl font-bold capitalize', CRITICALITY_COLOR[asset.criticality])}
            >
              {asset.criticality}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Server className="h-4 w-4" />
              Risk Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{asset.riskScore}/100</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Exposure
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="outline" className="text-base capitalize">
              {asset.exposure}
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Findings</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={cn('text-2xl font-bold', asset.findingCount > 0 ? 'text-red-500' : '')}>
              {asset.findingCount}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Properties</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <DetailRow label="ID" value={<code className="text-xs font-mono">{asset.id}</code>} />
          <DetailRow label="Type" value={<span className="capitalize">{typeLabel}</span>} />
          <DetailRow
            label="Status"
            value={
              <Badge variant="outline" className="capitalize">
                {asset.status}
              </Badge>
            }
          />
          <DetailRow
            label="Scope"
            value={
              <Badge variant="outline" className="capitalize">
                {asset.scope}
              </Badge>
            }
          />
          {asset.description && <DetailRow label="Description" value={asset.description} />}
          {asset.tags && asset.tags.length > 0 && (
            <DetailRow
              label="Tags"
              value={
                <div className="flex flex-wrap gap-1">
                  {asset.tags.map((t) => (
                    <Badge key={t} variant="secondary" className="text-xs">
                      {t}
                    </Badge>
                  ))}
                </div>
              }
            />
          )}
        </CardContent>
      </Card>

      {/* CTA to richer typed listing */}
      {listingSlug && (
        <Card className="mt-4 bg-muted/30">
          <CardContent className="flex items-center justify-between py-4">
            <div>
              <p className="text-sm font-medium">Looking for richer details?</p>
              <p className="text-xs text-muted-foreground mt-1">
                The {typeLabel} listing page has full filters, scans, and findings context.
              </p>
            </div>
            <Button variant="outline" onClick={() => router.push(`/assets/${listingSlug}`)}>
              Open {typeLabel} list
            </Button>
          </CardContent>
        </Card>
      )}
    </Main>
  )
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b last:border-0">
      <span className="text-sm text-muted-foreground shrink-0">{label}</span>
      <div className="text-sm text-end">{value}</div>
    </div>
  )
}
