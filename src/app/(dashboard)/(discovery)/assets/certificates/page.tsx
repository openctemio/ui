'use client'

import { useState, useMemo } from 'react'
import { Main } from '@/components/layout'
import { PageHeader } from '@/features/shared'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ShieldCheck, Plus, AlertTriangle, Clock, CheckCircle, XCircle } from 'lucide-react'
import {
  ScopeBadgeSimple,
  ScopeCoverageCard,
  getScopeMatchesForAsset,
  calculateScopeCoverage,
  getActiveScopeTargets,
  getActiveScopeExclusions,
} from '@/features/scope'

// Mock data for certificates
const mockCertificates = [
  {
    id: 'cert-1',
    name: '*.example.com',
    issuer: "Let's Encrypt",
    subject: '*.example.com',
    validFrom: '2024-01-15',
    validTo: '2025-01-15',
    daysUntilExpiry: 180,
    status: 'valid' as const,
    isWildcard: true,
    sans: ['example.com', '*.example.com'],
  },
  {
    id: 'cert-2',
    name: 'api.example.com',
    issuer: 'DigiCert',
    subject: 'api.example.com',
    validFrom: '2024-06-01',
    validTo: '2024-12-01',
    daysUntilExpiry: 15,
    status: 'expiring' as const,
    isWildcard: false,
    sans: ['api.example.com'],
  },
  {
    id: 'cert-3',
    name: 'old.example.com',
    issuer: 'Comodo',
    subject: 'old.example.com',
    validFrom: '2023-01-01',
    validTo: '2024-01-01',
    daysUntilExpiry: -30,
    status: 'expired' as const,
    isWildcard: false,
    sans: ['old.example.com'],
  },
]

const stats = {
  total: mockCertificates.length,
  valid: mockCertificates.filter((c) => c.status === 'valid').length,
  expiring: mockCertificates.filter((c) => c.status === 'expiring').length,
  expired: mockCertificates.filter((c) => c.status === 'expired').length,
}

export default function CertificatesPage() {
  const [searchQuery, setSearchQuery] = useState('')

  // Scope data
  const scopeTargets = useMemo(() => getActiveScopeTargets(), [])
  const scopeExclusions = useMemo(() => getActiveScopeExclusions(), [])

  // Compute scope matches for each certificate
  const scopeMatchesMap = useMemo(() => {
    const map = new Map<string, { inScope: boolean; excluded: boolean }>()
    mockCertificates.forEach((cert) => {
      const match = getScopeMatchesForAsset(
        { id: cert.id, type: 'certificate', name: cert.name },
        scopeTargets,
        scopeExclusions
      )
      map.set(cert.id, {
        inScope: match.inScope,
        excluded: match.matchedExclusions.length > 0,
      })
    })
    return map
  }, [scopeTargets, scopeExclusions])

  // Calculate scope coverage
  const scopeCoverage = useMemo(() => {
    const assets = mockCertificates.map((cert) => ({
      id: cert.id,
      name: cert.name,
      type: 'certificate',
    }))
    return calculateScopeCoverage(assets, scopeTargets, scopeExclusions)
  }, [scopeTargets, scopeExclusions])

  const filteredCertificates = mockCertificates.filter(
    (cert) =>
      cert.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cert.issuer.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'valid':
        return 'text-green-600 bg-green-500/15'
      case 'expiring':
        return 'text-yellow-600 bg-yellow-500/15'
      case 'expired':
        return 'text-red-600 bg-red-500/15'
      default:
        return 'text-slate-600 bg-slate-500/15'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'valid':
        return <CheckCircle className="h-4 w-4" />
      case 'expiring':
        return <Clock className="h-4 w-4" />
      case 'expired':
        return <XCircle className="h-4 w-4" />
      default:
        return <AlertTriangle className="h-4 w-4" />
    }
  }

  return (
    <>
      <Main>
        <PageHeader
          title="Certificates"
          description="SSL/TLS certificates across your infrastructure"
        />

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Certificates</CardTitle>
              <ShieldCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Valid</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.valid}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.expiring}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Expired</CardTitle>
              <XCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.expired}</div>
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
            placeholder="Search certificates..."
            className="max-w-sm px-3 py-2 border rounded-md bg-background"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Certificate
          </Button>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <table className="w-full">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="text-left p-4 font-medium">Certificate</th>
                  <th className="text-left p-4 font-medium">Issuer</th>
                  <th className="text-left p-4 font-medium">Valid Until</th>
                  <th className="text-left p-4 font-medium">Days Left</th>
                  <th className="text-left p-4 font-medium">Scope</th>
                  <th className="text-left p-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredCertificates.map((cert) => (
                  <tr key={cert.id} className="border-b last:border-0 hover:bg-muted/50">
                    <td className="p-4">
                      <div className="font-medium">{cert.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {cert.isWildcard && 'Wildcard - '}
                        {cert.sans.length} SAN(s)
                      </div>
                    </td>
                    <td className="p-4 text-muted-foreground">{cert.issuer}</td>
                    <td className="p-4 text-muted-foreground">{cert.validTo}</td>
                    <td className="p-4">
                      <span className={cert.daysUntilExpiry < 30 ? 'text-red-600 font-medium' : ''}>
                        {cert.daysUntilExpiry > 0 ? cert.daysUntilExpiry : 'Expired'}
                      </span>
                    </td>
                    <td className="p-4">
                      {scopeMatchesMap.get(cert.id) && (
                        <ScopeBadgeSimple
                          inScope={scopeMatchesMap.get(cert.id)!.inScope}
                          excluded={scopeMatchesMap.get(cert.id)!.excluded}
                        />
                      )}
                    </td>
                    <td className="p-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(cert.status)}`}
                      >
                        {getStatusIcon(cert.status)}
                        {cert.status.charAt(0).toUpperCase() + cert.status.slice(1)}
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
