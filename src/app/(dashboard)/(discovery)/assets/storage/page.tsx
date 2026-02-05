'use client'

import { useState, useMemo } from 'react'
import { Main } from '@/components/layout'
import { PageHeader } from '@/features/shared'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { HardDrive, Plus, Globe, Lock, AlertTriangle, Database } from 'lucide-react'
import {
  ScopeBadge,
  ScopeCoverageCard,
  getScopeMatchesForAsset,
  calculateScopeCoverage,
  getActiveScopeTargets,
  getActiveScopeExclusions,
  type ScopeMatchResult,
} from '@/features/scope'

const mockStorageBuckets = [
  {
    id: 'storage-1',
    name: 'prod-assets-bucket',
    provider: 'aws' as const,
    region: 'us-east-1',
    sizeGB: 1250,
    objectCount: 45000,
    isPublic: false,
    encryptionEnabled: true,
    versioningEnabled: true,
    riskScore: 15,
  },
  {
    id: 'storage-2',
    name: 'dev-uploads-bucket',
    provider: 'aws' as const,
    region: 'us-west-2',
    sizeGB: 320,
    objectCount: 12500,
    isPublic: false,
    encryptionEnabled: true,
    versioningEnabled: false,
    riskScore: 35,
  },
  {
    id: 'storage-3',
    name: 'public-cdn-assets',
    provider: 'gcp' as const,
    region: 'us-central1',
    sizeGB: 890,
    objectCount: 28000,
    isPublic: true,
    encryptionEnabled: true,
    versioningEnabled: true,
    riskScore: 55,
  },
  {
    id: 'storage-4',
    name: 'backup-storage-prod',
    provider: 'azure' as const,
    region: 'eastus',
    sizeGB: 4500,
    objectCount: 156000,
    isPublic: false,
    encryptionEnabled: true,
    versioningEnabled: true,
    riskScore: 10,
  },
  {
    id: 'storage-5',
    name: 'staging-media-bucket',
    provider: 'gcp' as const,
    region: 'europe-west1',
    sizeGB: 180,
    objectCount: 5600,
    isPublic: false,
    encryptionEnabled: false,
    versioningEnabled: false,
    riskScore: 65,
  },
]

const providerColors = {
  aws: 'bg-orange-500/15 text-orange-600',
  gcp: 'bg-blue-500/15 text-blue-600',
  azure: 'bg-sky-500/15 text-sky-600',
}

const providerLabels = {
  aws: 'S3',
  gcp: 'GCS',
  azure: 'Blob',
}

export default function StoragePage() {
  const [searchQuery, setSearchQuery] = useState('')

  const filteredBuckets = mockStorageBuckets.filter(
    (bucket) =>
      bucket.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bucket.region.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getRiskColor = (score: number) => {
    if (score >= 70) return 'text-red-600 bg-red-500/15'
    if (score >= 40) return 'text-yellow-600 bg-yellow-500/15'
    return 'text-green-600 bg-green-500/15'
  }

  // Scope data
  const scopeTargets = useMemo(() => getActiveScopeTargets(), [])
  const scopeExclusions = useMemo(() => getActiveScopeExclusions(), [])

  // Compute scope matches for each storage bucket
  const scopeMatchesMap = useMemo(() => {
    const map = new Map<string, ScopeMatchResult>()
    mockStorageBuckets.forEach((bucket) => {
      const match = getScopeMatchesForAsset(
        { id: bucket.id, type: 'cloud_resource', name: bucket.name },
        scopeTargets,
        scopeExclusions
      )
      map.set(bucket.id, match)
    })
    return map
  }, [scopeTargets, scopeExclusions])

  // Calculate scope coverage for all storage buckets
  const scopeCoverage = useMemo(() => {
    const assets = mockStorageBuckets.map((b) => ({
      id: b.id,
      name: b.name,
      type: 'cloud_resource',
    }))
    return calculateScopeCoverage(assets, scopeTargets, scopeExclusions)
  }, [scopeTargets, scopeExclusions])

  // Stats calculations
  const totalSize = mockStorageBuckets.reduce((acc, b) => acc + b.sizeGB, 0)
  const totalObjects = mockStorageBuckets.reduce((acc, b) => acc + b.objectCount, 0)
  const publicBuckets = mockStorageBuckets.filter((b) => b.isPublic).length
  const unencryptedBuckets = mockStorageBuckets.filter((b) => !b.encryptionEnabled).length

  return (
    <>
      <Main>
        <PageHeader title="Storage" description="S3 buckets, Azure Blobs, and GCS buckets" />

        {/* Stats */}
        <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <HardDrive className="h-4 w-4" />
                Storage Buckets
              </CardDescription>
              <CardTitle className="text-3xl">{mockStorageBuckets.length}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">S3, GCS, Azure Blob Storage</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Database className="h-4 w-4 text-blue-500" />
                Total Size
              </CardDescription>
              <CardTitle className="text-3xl text-blue-500">
                {totalSize >= 1000 ? `${(totalSize / 1000).toFixed(1)}TB` : `${totalSize}GB`}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {totalObjects.toLocaleString()} objects
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-yellow-500" />
                Public Buckets
              </CardDescription>
              <CardTitle className="text-3xl text-yellow-500">{publicBuckets}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Publicly accessible</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                Unencrypted
              </CardDescription>
              <CardTitle className="text-3xl text-red-500">{unencryptedBuckets}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Missing encryption</p>
            </CardContent>
          </Card>
        </div>

        <div className="mt-4">
          <ScopeCoverageCard
            coverage={scopeCoverage}
            title="Scope Coverage"
            showBreakdown={false}
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between mt-6 mb-4">
          <input
            type="text"
            placeholder="Search storage buckets..."
            className="max-w-sm px-3 py-2 border rounded-md bg-background"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Bucket
          </Button>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <table className="w-full">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="text-left p-4 font-medium">Bucket Name</th>
                  <th className="text-left p-4 font-medium">Provider</th>
                  <th className="text-left p-4 font-medium">Region</th>
                  <th className="text-left p-4 font-medium">Size</th>
                  <th className="text-left p-4 font-medium">Security</th>
                  <th className="text-left p-4 font-medium">Scope</th>
                  <th className="text-left p-4 font-medium">Risk Score</th>
                </tr>
              </thead>
              <tbody>
                {filteredBuckets.map((bucket) => (
                  <tr key={bucket.id} className="border-b last:border-0 hover:bg-muted/50">
                    <td className="p-4">
                      <div className="font-medium">{bucket.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {bucket.objectCount.toLocaleString()} objects
                      </div>
                    </td>
                    <td className="p-4">
                      <Badge className={providerColors[bucket.provider]}>
                        {providerLabels[bucket.provider]}
                      </Badge>
                    </td>
                    <td className="p-4 text-sm">{bucket.region}</td>
                    <td className="p-4 font-medium">
                      {bucket.sizeGB >= 1000
                        ? `${(bucket.sizeGB / 1000).toFixed(1)} TB`
                        : `${bucket.sizeGB} GB`}
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        {bucket.isPublic ? (
                          <Badge variant="destructive" className="text-xs gap-1">
                            <Globe className="h-3 w-3" />
                            Public
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs gap-1">
                            <Lock className="h-3 w-3" />
                            Private
                          </Badge>
                        )}
                        {bucket.encryptionEnabled && (
                          <Badge variant="outline" className="text-xs">
                            Encrypted
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      {scopeMatchesMap.get(bucket.id) ? (
                        <ScopeBadge match={scopeMatchesMap.get(bucket.id)!} />
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-medium ${getRiskColor(bucket.riskScore)}`}
                      >
                        {bucket.riskScore}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </Main>
    </>
  )
}
