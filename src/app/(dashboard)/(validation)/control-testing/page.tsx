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
  ShieldCheck,
  ShieldAlert,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Play,
  RefreshCw,
  FileSearch,
  Settings,
} from 'lucide-react'

// Mock data for control testing
const controlStats = {
  totalControls: 48,
  passed: 38,
  failed: 6,
  notTested: 4,
  overallScore: 79,
}

const securityControls = [
  {
    id: 'ctrl-001',
    name: 'Firewall Rules Validation',
    category: 'Network Security',
    framework: 'CIS Controls',
    lastTested: '2024-03-10',
    status: 'passed',
    score: 95,
    findings: 0,
  },
  {
    id: 'ctrl-002',
    name: 'Endpoint Protection Status',
    category: 'Endpoint Security',
    framework: 'NIST CSF',
    lastTested: '2024-03-09',
    status: 'passed',
    score: 88,
    findings: 2,
  },
  {
    id: 'ctrl-003',
    name: 'Access Control Policies',
    category: 'Identity & Access',
    framework: 'ISO 27001',
    lastTested: '2024-03-08',
    status: 'failed',
    score: 45,
    findings: 5,
  },
  {
    id: 'ctrl-004',
    name: 'Data Encryption at Rest',
    category: 'Data Protection',
    framework: 'PCI-DSS',
    lastTested: '2024-03-07',
    status: 'passed',
    score: 92,
    findings: 1,
  },
  {
    id: 'ctrl-005',
    name: 'Logging & Monitoring',
    category: 'Detection',
    framework: 'CIS Controls',
    lastTested: '2024-03-06',
    status: 'failed',
    score: 38,
    findings: 8,
  },
  {
    id: 'ctrl-006',
    name: 'Patch Management',
    category: 'Vulnerability Mgmt',
    framework: 'NIST CSF',
    lastTested: '2024-03-05',
    status: 'passed',
    score: 85,
    findings: 3,
  },
  {
    id: 'ctrl-007',
    name: 'Backup & Recovery',
    category: 'Business Continuity',
    framework: 'ISO 27001',
    lastTested: '2024-03-04',
    status: 'testing',
    score: 0,
    findings: 0,
  },
  {
    id: 'ctrl-008',
    name: 'Security Awareness Training',
    category: 'Human Security',
    framework: 'CIS Controls',
    lastTested: '2024-03-03',
    status: 'passed',
    score: 78,
    findings: 2,
  },
]

const controlCategories = [
  { name: 'Network Security', controls: 12, passed: 10, score: 88 },
  { name: 'Endpoint Security', controls: 8, passed: 7, score: 85 },
  { name: 'Identity & Access', controls: 10, passed: 6, score: 62 },
  { name: 'Data Protection', controls: 6, passed: 5, score: 90 },
  { name: 'Detection', controls: 5, passed: 3, score: 55 },
  { name: 'Vulnerability Mgmt', controls: 7, passed: 7, score: 92 },
]

const recentTests = [
  {
    control: 'Firewall Rules Validation',
    result: 'Passed',
    duration: '2m 34s',
    timestamp: '10 mins ago',
  },
  {
    control: 'Access Control Policies',
    result: 'Failed',
    duration: '5m 12s',
    timestamp: '1 hour ago',
  },
  {
    control: 'Endpoint Protection Status',
    result: 'Passed',
    duration: '3m 45s',
    timestamp: '2 hours ago',
  },
  {
    control: 'Logging & Monitoring',
    result: 'Failed',
    duration: '8m 23s',
    timestamp: '3 hours ago',
  },
  {
    control: 'Data Encryption at Rest',
    result: 'Passed',
    duration: '1m 58s',
    timestamp: '5 hours ago',
  },
]

const statusConfig: Record<string, { icon: React.ReactNode; color: string; bgColor: string }> = {
  passed: {
    icon: <CheckCircle className="h-4 w-4" />,
    color: 'text-green-400',
    bgColor: 'bg-green-500/20',
  },
  failed: {
    icon: <XCircle className="h-4 w-4" />,
    color: 'text-red-400',
    bgColor: 'bg-red-500/20',
  },
  testing: {
    icon: <RefreshCw className="h-4 w-4 animate-spin" />,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
  },
  not_tested: {
    icon: <Clock className="h-4 w-4" />,
    color: 'text-gray-400',
    bgColor: 'bg-gray-500/20',
  },
}

const resultConfig: Record<string, string> = {
  Passed: 'bg-green-500/20 text-green-400',
  Failed: 'bg-red-500/20 text-red-400',
  Pending: 'bg-yellow-500/20 text-yellow-400',
}

export default function ControlTestingPage() {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500'
    if (score >= 60) return 'text-yellow-500'
    if (score >= 40) return 'text-orange-500'
    return 'text-red-500'
  }

  return (
    <>
      <Main>
        <PageHeader
          title="Security Control Testing"
          description="Validate the effectiveness of security controls against compliance frameworks"
        />

        {/* Stats */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" />
                Total Controls
              </CardDescription>
              <CardTitle className="text-3xl">{controlStats.totalControls}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Passed
              </CardDescription>
              <CardTitle className="text-3xl text-green-500">{controlStats.passed}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <XCircle className="h-4 w-4" />
                Failed
              </CardDescription>
              <CardTitle className="text-3xl text-red-500">{controlStats.failed}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Not Tested
              </CardDescription>
              <CardTitle className="text-3xl text-gray-500">{controlStats.notTested}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4" />
                Overall Score
              </CardDescription>
              <CardTitle className={`text-3xl ${getScoreColor(controlStats.overallScore)}`}>
                {controlStats.overallScore}%
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Progress value={controlStats.overallScore} className="h-2" />
            </CardContent>
          </Card>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          {/* Control Categories */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-base">Control Categories</CardTitle>
              <CardDescription>Score by security domain</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {controlCategories.map((cat) => (
                <div key={cat.name} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{cat.name}</span>
                    <span className={`text-sm font-bold ${getScoreColor(cat.score)}`}>
                      {cat.score}%
                    </span>
                  </div>
                  <Progress value={cat.score} className="h-1.5" />
                  <p className="text-muted-foreground text-xs">
                    {cat.passed}/{cat.controls} controls passed
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Recent Tests */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Recent Test Results</CardTitle>
                  <CardDescription>Latest control validation outcomes</CardDescription>
                </div>
                <Button size="sm">
                  <Play className="mr-2 h-4 w-4" />
                  Run All Tests
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentTests.map((test, idx) => (
                <div key={idx} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{test.control}</p>
                    <div className="text-muted-foreground flex items-center gap-3 text-xs">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {test.duration}
                      </span>
                      <span>{test.timestamp}</span>
                    </div>
                  </div>
                  <Badge className={`${resultConfig[test.result]} border-0`}>{test.result}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Security Controls Table */}
        <Card className="mt-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Security Controls</CardTitle>
                <CardDescription>All configured security controls and their status</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline">
                  <Settings className="mr-2 h-4 w-4" />
                  Configure
                </Button>
                <Button size="sm" variant="outline">
                  <FileSearch className="mr-2 h-4 w-4" />
                  Export Report
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Control Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Framework</TableHead>
                  <TableHead>Last Tested</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Findings</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[50px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {securityControls.map((control) => {
                  const status = statusConfig[control.status]
                  return (
                    <TableRow key={control.id} className="cursor-pointer hover:bg-muted/50">
                      <TableCell>
                        <p className="font-medium">{control.name}</p>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {control.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {control.framework}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {control.lastTested}
                      </TableCell>
                      <TableCell>
                        {control.status !== 'testing' && control.status !== 'not_tested' ? (
                          <span className={`font-mono ${getScoreColor(control.score)}`}>
                            {control.score}%
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-sm">--</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {control.findings > 0 ? (
                          <Badge className="bg-yellow-500/20 text-yellow-400 border-0">
                            <AlertTriangle className="mr-1 h-3 w-3" />
                            {control.findings}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={`${status.bgColor} ${status.color} border-0`}>
                          {status.icon}
                          <span className="ml-1 capitalize">
                            {control.status.replace('_', ' ')}
                          </span>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <Play className="h-4 w-4" />
                        </Button>
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
