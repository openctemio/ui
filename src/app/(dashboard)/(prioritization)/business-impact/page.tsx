'use client'

import { Main } from '@/components/layout'
import { PageHeader } from '@/features/shared'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Building2,
  DollarSign,
  Users,
  TrendingUp,
  AlertTriangle,
  Shield,
  ArrowRight,
} from 'lucide-react'

// Mock data for business impact analysis
const impactMetrics = {
  totalFinancialRisk: '$2.4M',
  affectedCustomers: '150K+',
  regulatoryExposure: 'High',
  reputationRisk: 'Medium',
}

const businessUnits = [
  {
    name: 'Core Banking',
    assets: 45,
    criticalFindings: 3,
    financialRisk: '$850K',
    customers: '120K',
    compliance: 'PCI-DSS, SOX',
    riskLevel: 'critical',
  },
  {
    name: 'Mobile Banking',
    assets: 28,
    criticalFindings: 2,
    financialRisk: '$620K',
    customers: '85K',
    compliance: 'PCI-DSS',
    riskLevel: 'high',
  },
  {
    name: 'Payment Gateway',
    assets: 15,
    criticalFindings: 4,
    financialRisk: '$450K',
    customers: '50K',
    compliance: 'PCI-DSS, PSD2',
    riskLevel: 'critical',
  },
  {
    name: 'Customer Portal',
    assets: 22,
    criticalFindings: 1,
    financialRisk: '$280K',
    customers: '100K',
    compliance: 'GDPR',
    riskLevel: 'medium',
  },
  {
    name: 'Internal Systems',
    assets: 35,
    criticalFindings: 2,
    financialRisk: '$200K',
    customers: 'N/A',
    compliance: 'SOX, ISO27001',
    riskLevel: 'high',
  },
]

const complianceFrameworks = [
  { name: 'PCI-DSS', status: 'At Risk', issues: 5, deadline: 'Q1 2024', color: 'text-red-400' },
  { name: 'SOX', status: 'Compliant', issues: 0, deadline: 'Ongoing', color: 'text-green-400' },
  { name: 'GDPR', status: 'Partial', issues: 2, deadline: 'Q2 2024', color: 'text-yellow-400' },
  {
    name: 'ISO 27001',
    status: 'Compliant',
    issues: 1,
    deadline: 'Annual',
    color: 'text-green-400',
  },
  { name: 'PSD2', status: 'At Risk', issues: 3, deadline: 'Q1 2024', color: 'text-red-400' },
]

const financialImpactBreakdown = [
  { category: 'Data Breach', amount: '$1.2M', percentage: 50 },
  { category: 'Regulatory Fines', amount: '$600K', percentage: 25 },
  { category: 'Business Disruption', amount: '$400K', percentage: 17 },
  { category: 'Reputation Damage', amount: '$200K', percentage: 8 },
]

const riskLevelConfig: Record<string, { color: string; bgColor: string }> = {
  critical: { color: 'text-red-400', bgColor: 'bg-red-500/20' },
  high: { color: 'text-orange-400', bgColor: 'bg-orange-500/20' },
  medium: { color: 'text-yellow-400', bgColor: 'bg-yellow-500/20' },
  low: { color: 'text-green-400', bgColor: 'bg-green-500/20' },
}

export default function BusinessImpactPage() {
  return (
    <>
      <Main>
        <PageHeader
          title="Business Impact Analysis"
          description="Assess and quantify the business impact of security vulnerabilities"
        />

        {/* Impact Metrics */}
        <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Total Financial Risk
              </CardDescription>
              <CardTitle className="text-3xl text-red-500">
                {impactMetrics.totalFinancialRisk}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-muted-foreground flex items-center gap-1 text-xs">
                <TrendingUp className="h-3 w-3 text-red-400" />
                <span>+15% from last quarter</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Affected Customers
              </CardDescription>
              <CardTitle className="text-3xl">{impactMetrics.affectedCustomers}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-xs">Potential exposure</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Regulatory Exposure
              </CardDescription>
              <CardTitle className="text-3xl text-orange-500">
                {impactMetrics.regulatoryExposure}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-xs">5 compliance issues</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Reputation Risk
              </CardDescription>
              <CardTitle className="text-3xl text-yellow-500">
                {impactMetrics.reputationRisk}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-xs">Brand impact score</p>
            </CardContent>
          </Card>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          {/* Financial Impact Breakdown */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-base">Financial Impact Breakdown</CardTitle>
              <CardDescription>Estimated costs by category</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {financialImpactBreakdown.map((item) => (
                <div key={item.category} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{item.category}</span>
                    <span className="text-sm font-bold">{item.amount}</span>
                  </div>
                  <Progress value={item.percentage} className="h-2" />
                  <p className="text-muted-foreground text-xs">{item.percentage}% of total risk</p>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Compliance Status */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Compliance Status</CardTitle>
                  <CardDescription>Regulatory framework compliance</CardDescription>
                </div>
                <Button size="sm" variant="outline">
                  View Details
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {complianceFrameworks.map((framework) => (
                  <div
                    key={framework.name}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <Shield className={`h-5 w-5 ${framework.color}`} />
                      <div>
                        <p className="text-sm font-medium">{framework.name}</p>
                        <p className="text-muted-foreground text-xs">
                          {framework.issues} open issues
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge
                        className={`${framework.status === 'At Risk' ? 'bg-red-500/20 text-red-400' : framework.status === 'Compliant' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'} border-0`}
                      >
                        {framework.status}
                      </Badge>
                      <span className="text-muted-foreground text-xs">{framework.deadline}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Business Units Impact */}
        <Card className="mt-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Business Unit Impact</CardTitle>
                <CardDescription>Risk assessment by business area</CardDescription>
              </div>
              <Button size="sm">
                <ArrowRight className="mr-2 h-4 w-4" />
                Generate Report
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Business Unit</TableHead>
                  <TableHead>Assets</TableHead>
                  <TableHead>Critical Findings</TableHead>
                  <TableHead>Financial Risk</TableHead>
                  <TableHead>Customers</TableHead>
                  <TableHead>Compliance</TableHead>
                  <TableHead>Risk Level</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {businessUnits.map((unit) => {
                  const riskConfig = riskLevelConfig[unit.riskLevel]
                  return (
                    <TableRow key={unit.name} className="cursor-pointer hover:bg-muted/50">
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-2">
                          <Building2 className="text-muted-foreground h-4 w-4" />
                          <span className="font-medium">{unit.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>{unit.assets}</TableCell>
                      <TableCell>
                        {unit.criticalFindings > 0 ? (
                          <Badge className="bg-red-500/20 text-red-400 border-0">
                            <AlertTriangle className="mr-1 h-3 w-3" />
                            {unit.criticalFindings}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </TableCell>
                      <TableCell className="font-mono">{unit.financialRisk}</TableCell>
                      <TableCell>{unit.customers}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {unit.compliance.split(', ').map((c) => (
                            <Badge key={c} variant="outline" className="text-xs">
                              {c}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={`${riskConfig.bgColor} ${riskConfig.color} border-0 capitalize`}
                        >
                          {unit.riskLevel}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </Main>
    </>
  )
}
