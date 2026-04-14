'use client'

import { useMemo } from 'react'
import { Main } from '@/components/layout'
import { PageHeader } from '@/features/shared'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
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
  CheckCircle,
  XCircle,
  MinusCircle,
  Clock,
  AlertTriangle,
  Plus,
} from 'lucide-react'
import {
  useControlTests,
  useControlTestStats,
  type ControlTest,
  type FrameworkStats,
} from '@/features/simulation/api/use-simulation-api'

const statusConfig: Record<string, { icon: React.ReactNode; color: string; bgColor: string }> = {
  pass: {
    icon: <CheckCircle className="h-4 w-4" />,
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-500/20',
  },
  fail: {
    icon: <XCircle className="h-4 w-4" />,
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-500/20',
  },
  partial: {
    icon: <AlertTriangle className="h-4 w-4" />,
    color: 'text-yellow-600 dark:text-yellow-400',
    bgColor: 'bg-yellow-500/20',
  },
  untested: {
    icon: <Clock className="h-4 w-4" />,
    color: 'text-gray-500 dark:text-gray-400',
    bgColor: 'bg-gray-500/20',
  },
  not_applicable: {
    icon: <MinusCircle className="h-4 w-4" />,
    color: 'text-slate-500 dark:text-slate-400',
    bgColor: 'bg-slate-500/20',
  },
}

const riskColors: Record<string, string> = {
  critical: 'bg-red-500/20 text-red-600 dark:text-red-400',
  high: 'bg-orange-500/20 text-orange-600 dark:text-orange-400',
  medium: 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400',
  low: 'bg-blue-500/20 text-blue-600 dark:text-blue-400',
}

function FrameworkCard({ stats }: { stats: FrameworkStats }) {
  const total = stats.total || 1
  const passRate = Math.round((stats.passed / total) * 100)

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{stats.framework}</CardDescription>
        <CardTitle className="text-2xl">{passRate}%</CardTitle>
      </CardHeader>
      <CardContent>
        <Progress value={passRate} className="h-2 mb-2" />
        <div className="flex gap-2 text-xs text-muted-foreground">
          <span className="text-green-600">{stats.passed} pass</span>
          <span className="text-red-600">{stats.failed} fail</span>
          <span>{stats.untested} untested</span>
        </div>
      </CardContent>
    </Card>
  )
}

function ControlTestRow({ ct }: { ct: ControlTest }) {
  const config = statusConfig[ct.status] ?? statusConfig.untested

  return (
    <TableRow>
      <TableCell>
        <div>
          <p className="font-medium">{ct.name}</p>
          <p className="text-muted-foreground text-xs">{ct.control_id}</p>
        </div>
      </TableCell>
      <TableCell>
        <Badge variant="outline" className="text-xs">
          {ct.framework}
        </Badge>
      </TableCell>
      <TableCell>
        <Badge variant="outline" className="text-xs">
          {ct.category || '-'}
        </Badge>
      </TableCell>
      <TableCell>
        <Badge className={`${riskColors[ct.risk_level] ?? ''} border-0 text-xs`}>
          {ct.risk_level}
        </Badge>
      </TableCell>
      <TableCell>
        <Badge className={`${config.bgColor} ${config.color} border-0`}>
          {config.icon}
          <span className="ml-1 capitalize">{ct.status.replace(/_/g, ' ')}</span>
        </Badge>
      </TableCell>
      <TableCell className="text-muted-foreground text-sm">
        {ct.last_tested_at ? new Date(ct.last_tested_at).toLocaleDateString() : 'Never'}
      </TableCell>
    </TableRow>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="bg-muted flex h-16 w-16 items-center justify-center rounded-full mb-4">
        <ShieldCheck className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="font-semibold mb-1">No Control Tests Yet</h3>
      <p className="text-muted-foreground text-sm mb-4">
        Create control tests to track security control effectiveness across frameworks.
      </p>
      <Button size="sm">
        <Plus className="mr-2 h-4 w-4" />
        Add Control Test
      </Button>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <Main>
      <Skeleton className="mb-6 h-8 w-48" />
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-lg" />
        ))}
      </div>
      <Skeleton className="mt-6 h-96 rounded-lg" />
    </Main>
  )
}

export default function ControlTestingPage() {
  const { data: testsData, isLoading: testsLoading } = useControlTests()
  const { data: statsData, isLoading: statsLoading } = useControlTestStats()

  const isLoading = testsLoading || statsLoading

  const summaryStats = useMemo(() => {
    const tests = testsData?.data ?? []
    const total = tests.length
    const passed = tests.filter((t) => t.status === 'pass').length
    const failed = tests.filter((t) => t.status === 'fail').length
    const untested = tests.filter((t) => t.status === 'untested').length
    return { total, passed, failed, untested }
  }, [testsData])

  if (isLoading) return <LoadingSkeleton />

  const controlTests = testsData?.data ?? []
  const frameworkStats = statsData ?? []

  return (
    <Main>
      <PageHeader
        title="Control Testing"
        description="Track and validate security control effectiveness across compliance frameworks"
      >
        <Button size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Add Control Test
        </Button>
      </PageHeader>

      {/* Summary Stats */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Controls</CardDescription>
            <CardTitle className="text-3xl">{summaryStats.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Passed</CardDescription>
            <CardTitle className="text-3xl text-green-500">{summaryStats.passed}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Failed</CardDescription>
            <CardTitle className="text-3xl text-red-500">{summaryStats.failed}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Untested</CardDescription>
            <CardTitle className="text-3xl text-gray-500">{summaryStats.untested}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Framework Breakdown */}
      {frameworkStats.length > 0 && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {frameworkStats.map((fw) => (
            <FrameworkCard key={fw.framework} stats={fw} />
          ))}
        </div>
      )}

      {/* Control Tests Table */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Security Controls</CardTitle>
          <CardDescription>All control tests across frameworks</CardDescription>
        </CardHeader>
        <CardContent>
          {controlTests.length === 0 ? (
            <EmptyState />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Control</TableHead>
                  <TableHead>Framework</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Risk</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Tested</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {controlTests.map((ct) => (
                  <ControlTestRow key={ct.id} ct={ct} />
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </Main>
  )
}
