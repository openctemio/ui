'use client'

import { useState, useMemo } from 'react'
import { Main } from '@/components/layout'
import { PageHeader } from '@/features/shared'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Network, Plus, Shield, Layers, Route } from 'lucide-react'
import {
  ScopeBadgeSimple,
  ScopeCoverageCard,
  getScopeMatchesForAsset,
  calculateScopeCoverage,
  getActiveScopeTargets,
  getActiveScopeExclusions,
} from '@/features/scope'

// Mock data for network assets
const mockNetworks = [
  {
    id: 'net-1',
    name: 'production-vpc',
    type: 'vpc' as const,
    provider: 'AWS',
    region: 'us-east-1',
    cidr: '10.0.0.0/16',
    subnets: 6,
    status: 'active' as const,
    riskScore: 35,
  },
  {
    id: 'net-2',
    name: 'web-alb',
    type: 'load_balancer' as const,
    provider: 'AWS',
    region: 'us-east-1',
    cidr: '-',
    subnets: 0,
    status: 'active' as const,
    riskScore: 25,
  },
  {
    id: 'net-3',
    name: 'main-firewall',
    type: 'firewall' as const,
    provider: 'GCP',
    region: 'us-central1',
    cidr: '-',
    subnets: 0,
    status: 'active' as const,
    riskScore: 45,
  },
  {
    id: 'net-4',
    name: 'staging-vpc',
    type: 'vpc' as const,
    provider: 'AWS',
    region: 'us-west-2',
    cidr: '10.1.0.0/16',
    subnets: 4,
    status: 'active' as const,
    riskScore: 20,
  },
  {
    id: 'net-5',
    name: 'dev-network',
    type: 'vpc' as const,
    provider: 'Azure',
    region: 'eastus',
    cidr: '10.2.0.0/16',
    subnets: 3,
    status: 'inactive' as const,
    riskScore: 15,
  },
  {
    id: 'net-6',
    name: 'api-gateway-lb',
    type: 'load_balancer' as const,
    provider: 'AWS',
    region: 'eu-west-1',
    cidr: '-',
    subnets: 0,
    status: 'active' as const,
    riskScore: 30,
  },
  {
    id: 'net-7',
    name: 'ingress-firewall',
    type: 'firewall' as const,
    provider: 'AWS',
    region: 'us-east-1',
    cidr: '-',
    subnets: 0,
    status: 'active' as const,
    riskScore: 55,
  },
  {
    id: 'net-8',
    name: 'internal-route-table',
    type: 'route_table' as const,
    provider: 'AWS',
    region: 'us-east-1',
    cidr: '-',
    subnets: 0,
    status: 'active' as const,
    riskScore: 10,
  },
]

const stats = {
  total: mockNetworks.length,
  vpcs: mockNetworks.filter((n) => n.type === 'vpc').length,
  loadBalancers: mockNetworks.filter((n) => n.type === 'load_balancer').length,
  firewalls: mockNetworks.filter((n) => n.type === 'firewall').length,
}

export default function NetworksPage() {
  const [searchQuery, setSearchQuery] = useState('')

  // Scope data
  const scopeTargets = useMemo(() => getActiveScopeTargets(), [])
  const scopeExclusions = useMemo(() => getActiveScopeExclusions(), [])

  // Compute scope matches for each network
  const scopeMatchesMap = useMemo(() => {
    const map = new Map<string, { inScope: boolean; excluded: boolean }>()
    mockNetworks.forEach((network) => {
      const match = getScopeMatchesForAsset(
        { id: network.id, type: 'network', name: network.name },
        scopeTargets,
        scopeExclusions
      )
      map.set(network.id, {
        inScope: match.inScope,
        excluded: match.matchedExclusions.length > 0,
      })
    })
    return map
  }, [scopeTargets, scopeExclusions])

  // Calculate scope coverage
  const scopeCoverage = useMemo(() => {
    const assets = mockNetworks.map((network) => ({
      id: network.id,
      name: network.name,
      type: 'network',
    }))
    return calculateScopeCoverage(assets, scopeTargets, scopeExclusions)
  }, [scopeTargets, scopeExclusions])

  const filteredNetworks = mockNetworks.filter(
    (network) =>
      network.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      network.provider.toLowerCase().includes(searchQuery.toLowerCase()) ||
      network.region.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getRiskColor = (score: number) => {
    if (score >= 70) return 'text-red-600 bg-red-500/15'
    if (score >= 40) return 'text-yellow-600 bg-yellow-500/15'
    return 'text-green-600 bg-green-500/15'
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'vpc':
        return 'VPC'
      case 'load_balancer':
        return 'Load Balancer'
      case 'firewall':
        return 'Firewall'
      case 'route_table':
        return 'Route Table'
      default:
        return type
    }
  }

  const getTypeVariant = (type: string): 'default' | 'secondary' | 'outline' => {
    switch (type) {
      case 'vpc':
        return 'default'
      case 'load_balancer':
        return 'secondary'
      case 'firewall':
        return 'outline'
      default:
        return 'secondary'
    }
  }

  return (
    <>
      <Main>
        <PageHeader title="Networks" description="VPCs, firewalls, and load balancers" />

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Resources</CardTitle>
              <Network className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">VPCs</CardTitle>
              <Layers className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.vpcs}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Load Balancers</CardTitle>
              <Route className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{stats.loadBalancers}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Firewalls</CardTitle>
              <Shield className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.firewalls}</div>
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
            placeholder="Search networks..."
            className="max-w-sm px-3 py-2 border rounded-md bg-background"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Network
          </Button>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <table className="w-full">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="text-left p-4 font-medium">Name</th>
                  <th className="text-left p-4 font-medium">Type</th>
                  <th className="text-left p-4 font-medium">Provider / Region</th>
                  <th className="text-left p-4 font-medium">CIDR</th>
                  <th className="text-left p-4 font-medium">Scope</th>
                  <th className="text-left p-4 font-medium">Status</th>
                  <th className="text-left p-4 font-medium">Risk Score</th>
                </tr>
              </thead>
              <tbody>
                {filteredNetworks.map((network) => (
                  <tr key={network.id} className="border-b last:border-0 hover:bg-muted/50">
                    <td className="p-4">
                      <div className="font-medium">{network.name}</div>
                      {network.subnets > 0 && (
                        <div className="text-sm text-muted-foreground">
                          {network.subnets} subnets
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      <Badge variant={getTypeVariant(network.type)}>
                        {getTypeLabel(network.type)}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <div className="font-medium">{network.provider}</div>
                      <div className="text-sm text-muted-foreground">{network.region}</div>
                    </td>
                    <td className="p-4">
                      <span className="font-mono text-sm">
                        {network.cidr !== '-' ? network.cidr : '-'}
                      </span>
                    </td>
                    <td className="p-4">
                      {scopeMatchesMap.get(network.id) && (
                        <ScopeBadgeSimple
                          inScope={scopeMatchesMap.get(network.id)!.inScope}
                          excluded={scopeMatchesMap.get(network.id)!.excluded}
                        />
                      )}
                    </td>
                    <td className="p-4">
                      <Badge variant={network.status === 'active' ? 'default' : 'secondary'}>
                        {network.status}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-medium ${getRiskColor(network.riskScore)}`}
                      >
                        {network.riskScore}
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
