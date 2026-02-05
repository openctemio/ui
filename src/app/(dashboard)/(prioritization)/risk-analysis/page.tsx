'use client'

import { Main } from '@/components/layout'
import { PageHeader, SeverityBadge } from '@/features/shared'
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
  BarChart3,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Shield,
  Target,
  Zap,
  Clock,
  ArrowUpRight,
} from 'lucide-react'
import type { Severity } from '@/features/shared/types'

// Mock data for risk analysis
const riskMetrics = {
  overallRiskScore: 72,
  criticalRisks: 4,
  highRisks: 8,
  avgTimeToRemediate: '12 days',
  riskTrend: -5,
}

const riskByCategory = [
  { category: 'Network Security', score: 85, findings: 12, trend: 'up' },
  { category: 'Application Security', score: 72, findings: 18, trend: 'down' },
  { category: 'Data Protection', score: 65, findings: 8, trend: 'stable' },
  { category: 'Access Control', score: 58, findings: 14, trend: 'up' },
  { category: 'Cloud Security', score: 78, findings: 6, trend: 'down' },
  { category: 'Endpoint Security', score: 82, findings: 4, trend: 'stable' },
]

const topRisks = [
  {
    id: 'risk-001',
    title: 'SQL Injection in Payment API',
    severity: 'critical' as Severity,
    cvss: 9.8,
    asset: 'api.techcombank.com.vn',
    exploitability: 'High',
    businessImpact: 'Critical',
    daysOpen: 5,
  },
  {
    id: 'risk-002',
    title: 'Outdated SSL Certificate',
    severity: 'high' as Severity,
    cvss: 7.5,
    asset: 'mail.techcombank.com.vn',
    exploitability: 'Medium',
    businessImpact: 'High',
    daysOpen: 12,
  },
  {
    id: 'risk-003',
    title: 'Exposed Admin Panel',
    severity: 'critical' as Severity,
    cvss: 9.1,
    asset: 'admin.tcb.vn',
    exploitability: 'High',
    businessImpact: 'Critical',
    daysOpen: 3,
  },
  {
    id: 'risk-004',
    title: 'Weak Password Policy',
    severity: 'high' as Severity,
    cvss: 7.2,
    asset: 'auth.techcombank.com.vn',
    exploitability: 'Low',
    businessImpact: 'High',
    daysOpen: 30,
  },
  {
    id: 'risk-005',
    title: 'Missing Security Headers',
    severity: 'medium' as Severity,
    cvss: 5.3,
    asset: 'www.techcombank.com.vn',
    exploitability: 'Low',
    businessImpact: 'Medium',
    daysOpen: 45,
  },
]

const riskMatrix = [
  { impact: 'Critical', likelihood: 'High', count: 2, color: 'bg-red-500' },
  { impact: 'Critical', likelihood: 'Medium', count: 1, color: 'bg-red-400' },
  { impact: 'Critical', likelihood: 'Low', count: 1, color: 'bg-orange-500' },
  { impact: 'High', likelihood: 'High', count: 3, color: 'bg-red-400' },
  { impact: 'High', likelihood: 'Medium', count: 5, color: 'bg-orange-500' },
  { impact: 'High', likelihood: 'Low', count: 2, color: 'bg-yellow-500' },
  { impact: 'Medium', likelihood: 'High', count: 4, color: 'bg-orange-400' },
  { impact: 'Medium', likelihood: 'Medium', count: 6, color: 'bg-yellow-400' },
  { impact: 'Medium', likelihood: 'Low', count: 3, color: 'bg-green-400' },
]

const exploitabilityConfig: Record<string, string> = {
  High: 'bg-red-500/20 text-red-400',
  Medium: 'bg-yellow-500/20 text-yellow-400',
  Low: 'bg-green-500/20 text-green-400',
}

export default function RiskAnalysisPage() {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-red-500'
    if (score >= 60) return 'text-orange-500'
    if (score >= 40) return 'text-yellow-500'
    return 'text-green-500'
  }

  return (
    <>
      <Main>
        <PageHeader
          title="Risk Analysis"
          description="Analyze and prioritize security risks based on impact and likelihood"
        />

        {/* Risk Metrics */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Overall Risk Score
              </CardDescription>
              <CardTitle className={`text-3xl ${getScoreColor(riskMetrics.overallRiskScore)}`}>
                {riskMetrics.overallRiskScore}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Progress value={riskMetrics.overallRiskScore} className="h-2" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Critical Risks
              </CardDescription>
              <CardTitle className="text-3xl text-red-500">{riskMetrics.criticalRisks}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-xs">Immediate action required</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Target className="h-4 w-4" />
                High Risks
              </CardDescription>
              <CardTitle className="text-3xl text-orange-500">{riskMetrics.highRisks}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-xs">Address within 7 days</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Avg. Remediation
              </CardDescription>
              <CardTitle className="text-3xl">{riskMetrics.avgTimeToRemediate}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-xs">Time to fix</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Risk Trend
              </CardDescription>
              <CardTitle className="flex items-center gap-2 text-3xl text-green-500">
                {riskMetrics.riskTrend}%
                <TrendingDown className="h-5 w-5" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-xs">vs last month</p>
            </CardContent>
          </Card>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          {/* Risk by Category */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-base">Risk by Category</CardTitle>
              <CardDescription>Security domain breakdown</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {riskByCategory.map((cat) => (
                <div key={cat.category} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{cat.category}</span>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-sm font-bold ${getScoreColor(cat.score)}`}>
                        {cat.score}
                      </span>
                      {cat.trend === 'up' && <TrendingUp className="h-3 w-3 text-red-400" />}
                      {cat.trend === 'down' && <TrendingDown className="h-3 w-3 text-green-400" />}
                    </div>
                  </div>
                  <Progress value={cat.score} className="h-1.5" />
                  <p className="text-muted-foreground text-xs">{cat.findings} findings</p>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Risk Matrix */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Risk Matrix</CardTitle>
                  <CardDescription>Impact vs Likelihood distribution</CardDescription>
                </div>
                <Button size="sm" variant="outline">
                  <Zap className="mr-2 h-4 w-4" />
                  Run Analysis
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-2">
                <div />
                <div className="text-center text-xs font-medium">Low</div>
                <div className="text-center text-xs font-medium">Medium</div>
                <div className="text-center text-xs font-medium">High</div>

                <div className="flex items-center text-xs font-medium">Critical</div>
                {['Low', 'Medium', 'High'].map((likelihood) => {
                  const cell = riskMatrix.find(
                    (r) => r.impact === 'Critical' && r.likelihood === likelihood
                  )
                  return (
                    <div
                      key={`critical-${likelihood}`}
                      className={`flex h-16 items-center justify-center rounded ${cell?.color || 'bg-gray-500'} text-white font-bold`}
                    >
                      {cell?.count || 0}
                    </div>
                  )
                })}

                <div className="flex items-center text-xs font-medium">High</div>
                {['Low', 'Medium', 'High'].map((likelihood) => {
                  const cell = riskMatrix.find(
                    (r) => r.impact === 'High' && r.likelihood === likelihood
                  )
                  return (
                    <div
                      key={`high-${likelihood}`}
                      className={`flex h-16 items-center justify-center rounded ${cell?.color || 'bg-gray-500'} text-white font-bold`}
                    >
                      {cell?.count || 0}
                    </div>
                  )
                })}

                <div className="flex items-center text-xs font-medium">Medium</div>
                {['Low', 'Medium', 'High'].map((likelihood) => {
                  const cell = riskMatrix.find(
                    (r) => r.impact === 'Medium' && r.likelihood === likelihood
                  )
                  return (
                    <div
                      key={`medium-${likelihood}`}
                      className={`flex h-16 items-center justify-center rounded ${cell?.color || 'bg-gray-500'} text-white font-bold`}
                    >
                      {cell?.count || 0}
                    </div>
                  )
                })}
              </div>
              <div className="text-muted-foreground mt-4 flex justify-center gap-4 text-xs">
                <span>Likelihood (x-axis)</span>
                <span>|</span>
                <span>Impact (y-axis)</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Top Risks Table */}
        <Card className="mt-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Top Priority Risks</CardTitle>
                <CardDescription>Risks requiring immediate attention</CardDescription>
              </div>
              <Button size="sm">
                <ArrowUpRight className="mr-2 h-4 w-4" />
                View All Risks
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Risk</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>CVSS</TableHead>
                  <TableHead>Asset</TableHead>
                  <TableHead>Exploitability</TableHead>
                  <TableHead>Business Impact</TableHead>
                  <TableHead>Days Open</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topRisks.map((risk) => (
                  <TableRow key={risk.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell>
                      <p className="font-medium">{risk.title}</p>
                    </TableCell>
                    <TableCell>
                      <SeverityBadge severity={risk.severity} />
                    </TableCell>
                    <TableCell className="font-mono">{risk.cvss}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{risk.asset}</TableCell>
                    <TableCell>
                      <Badge className={`${exploitabilityConfig[risk.exploitability]} border-0`}>
                        {risk.exploitability}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{risk.businessImpact}</Badge>
                    </TableCell>
                    <TableCell>
                      <span className={risk.daysOpen > 14 ? 'text-red-400' : ''}>
                        {risk.daysOpen} days
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </Main>
    </>
  )
}
