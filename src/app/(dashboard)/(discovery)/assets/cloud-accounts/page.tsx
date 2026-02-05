'use client'

import { useState, useMemo } from 'react'
import { Main } from '@/components/layout'
import { PageHeader } from '@/features/shared'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Cloud, Plus, Shield, AlertTriangle, DollarSign } from 'lucide-react'
import {
  ScopeBadge,
  ScopeCoverageCard,
  getScopeMatchesForAsset,
  calculateScopeCoverage,
  getActiveScopeTargets,
  getActiveScopeExclusions,
  type ScopeMatchResult,
} from '@/features/scope'

const mockCloudAccounts = [
  {
    id: 'ca-1',
    name: 'Production AWS',
    provider: 'aws' as const,
    accountId: '123456789012',
    alias: 'prod-main',
    resourceCount: 245,
    mfaEnabled: true,
    ssoEnabled: true,
    monthlySpend: 45000,
    riskScore: 35,
  },
  {
    id: 'ca-2',
    name: 'Development GCP',
    provider: 'gcp' as const,
    accountId: 'dev-project-123',
    alias: 'dev-gcp',
    resourceCount: 89,
    mfaEnabled: true,
    ssoEnabled: false,
    monthlySpend: 8500,
    riskScore: 45,
  },
  {
    id: 'ca-3',
    name: 'Staging Azure',
    provider: 'azure' as const,
    accountId: 'sub-abc-123',
    alias: 'staging-azure',
    resourceCount: 56,
    mfaEnabled: false,
    ssoEnabled: true,
    monthlySpend: 12000,
    riskScore: 65,
  },
]

const providerColors = {
  aws: 'bg-orange-500/15 text-orange-600',
  gcp: 'bg-blue-500/15 text-blue-600',
  azure: 'bg-sky-500/15 text-sky-600',
}

const providerLabels = {
  aws: 'AWS',
  gcp: 'GCP',
  azure: 'Azure',
}

export default function CloudAccountsPage() {
  const [searchQuery, setSearchQuery] = useState('')

  const filteredAccounts = mockCloudAccounts.filter(
    (account) =>
      account.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      account.accountId.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getRiskColor = (score: number) => {
    if (score >= 70) return 'text-red-600 bg-red-500/15'
    if (score >= 40) return 'text-yellow-600 bg-yellow-500/15'
    return 'text-green-600 bg-green-500/15'
  }

  // Scope data
  const scopeTargets = useMemo(() => getActiveScopeTargets(), [])
  const scopeExclusions = useMemo(() => getActiveScopeExclusions(), [])

  // Compute scope matches for each cloud account
  const scopeMatchesMap = useMemo(() => {
    const map = new Map<string, ScopeMatchResult>()
    mockCloudAccounts.forEach((account) => {
      const match = getScopeMatchesForAsset(
        { id: account.id, type: 'cloud_account', name: account.name },
        scopeTargets,
        scopeExclusions
      )
      map.set(account.id, match)
    })
    return map
  }, [scopeTargets, scopeExclusions])

  // Calculate scope coverage for all cloud accounts
  const scopeCoverage = useMemo(() => {
    const assets = mockCloudAccounts.map((a) => ({
      id: a.id,
      name: a.name,
      type: 'cloud_account',
    }))
    return calculateScopeCoverage(assets, scopeTargets, scopeExclusions)
  }, [scopeTargets, scopeExclusions])

  return (
    <>
      <Main>
        <PageHeader
          title="Cloud Accounts"
          description="AWS accounts, GCP projects, and Azure subscriptions"
        />

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Accounts</CardTitle>
              <Cloud className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{mockCloudAccounts.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Resources</CardTitle>
              <Shield className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {mockCloudAccounts.reduce((acc, a) => acc + a.resourceCount, 0)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Without MFA</CardTitle>
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {mockCloudAccounts.filter((a) => !a.mfaEnabled).length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Spend</CardTitle>
              <DollarSign className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                ${(mockCloudAccounts.reduce((acc, a) => acc + a.monthlySpend, 0) / 1000).toFixed(0)}
                k
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Scope Coverage */}
        <div className="mb-6">
          <ScopeCoverageCard
            coverage={scopeCoverage}
            title="Scope Coverage"
            showBreakdown={false}
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between mb-4">
          <input
            type="text"
            placeholder="Search cloud accounts..."
            className="max-w-sm px-3 py-2 border rounded-md bg-background"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Connect Account
          </Button>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <table className="w-full">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="text-left p-4 font-medium">Account</th>
                  <th className="text-left p-4 font-medium">Provider</th>
                  <th className="text-left p-4 font-medium">Resources</th>
                  <th className="text-left p-4 font-medium">Security</th>
                  <th className="text-left p-4 font-medium">Scope</th>
                  <th className="text-left p-4 font-medium">Risk Score</th>
                </tr>
              </thead>
              <tbody>
                {filteredAccounts.map((account) => (
                  <tr key={account.id} className="border-b last:border-0 hover:bg-muted/50">
                    <td className="p-4">
                      <div className="font-medium">{account.name}</div>
                      <div className="text-sm text-muted-foreground font-mono">
                        {account.accountId}
                      </div>
                    </td>
                    <td className="p-4">
                      <Badge className={providerColors[account.provider]}>
                        {providerLabels[account.provider]}
                      </Badge>
                    </td>
                    <td className="p-4 font-medium">{account.resourceCount}</td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        <Badge
                          variant={account.mfaEnabled ? 'default' : 'destructive'}
                          className="text-xs"
                        >
                          {account.mfaEnabled ? 'MFA' : 'No MFA'}
                        </Badge>
                        {account.ssoEnabled && (
                          <Badge variant="secondary" className="text-xs">
                            SSO
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      {scopeMatchesMap.get(account.id) ? (
                        <ScopeBadge match={scopeMatchesMap.get(account.id)!} />
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-medium ${getRiskColor(account.riskScore)}`}
                      >
                        {account.riskScore}
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
