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
  Swords,
  Play,
  CheckCircle,
  XCircle,
  Clock,
  Shield,
  AlertTriangle,
  RefreshCw,
  Plus,
  Target,
} from 'lucide-react'
import { useSimulations, type Simulation } from '@/features/simulation/api/use-simulation-api'

const statusConfig: Record<string, { icon: React.ReactNode; color: string; bgColor: string }> = {
  draft: {
    icon: <Clock className="h-4 w-4" />,
    color: 'text-gray-400',
    bgColor: 'bg-gray-500/20',
  },
  active: {
    icon: <Play className="h-4 w-4" />,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
  },
  completed: {
    icon: <CheckCircle className="h-4 w-4" />,
    color: 'text-green-400',
    bgColor: 'bg-green-500/20',
  },
  paused: {
    icon: <AlertTriangle className="h-4 w-4" />,
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/20',
  },
}

const resultConfig: Record<string, string> = {
  detected: 'bg-green-500/20 text-green-400',
  prevented: 'bg-blue-500/20 text-blue-400',
  bypassed: 'bg-red-500/20 text-red-400',
  partial: 'bg-yellow-500/20 text-yellow-400',
  error: 'bg-gray-500/20 text-gray-400',
}

function SimulationRow({ sim }: { sim: Simulation }) {
  const status = statusConfig[sim.status] ?? statusConfig.draft
  const result = resultConfig[sim.last_result] ?? ''

  return (
    <TableRow className="cursor-pointer hover:bg-muted/50">
      <TableCell>
        <div>
          <p className="font-medium">{sim.name}</p>
          <p className="text-muted-foreground text-xs">
            {sim.mitre_technique_id && `${sim.mitre_technique_id} — `}
            {sim.mitre_technique_name || sim.simulation_type}
          </p>
        </div>
      </TableCell>
      <TableCell>
        <Badge variant="outline" className="text-xs">
          {sim.mitre_tactic || sim.simulation_type}
        </Badge>
      </TableCell>
      <TableCell className="text-muted-foreground text-sm">
        {sim.last_run_at ? new Date(sim.last_run_at).toLocaleDateString() : 'Never'}
      </TableCell>
      <TableCell>
        <div className="flex flex-wrap items-center gap-2">
          <Progress value={sim.detection_rate} className="h-2 w-16" />
          <span className="text-sm">{Math.round(sim.detection_rate)}%</span>
        </div>
      </TableCell>
      <TableCell>
        {sim.last_result ? (
          <Badge className={`${result} border-0`}>{sim.last_result}</Badge>
        ) : (
          <span className="text-muted-foreground text-xs">-</span>
        )}
      </TableCell>
      <TableCell>
        <Badge className={`${status.bgColor} ${status.color} border-0`}>
          {status.icon}
          <span className="ml-1 capitalize">{sim.status}</span>
        </Badge>
      </TableCell>
    </TableRow>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="bg-muted flex h-16 w-16 items-center justify-center rounded-full mb-4">
        <Swords className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="font-semibold mb-1">No Simulations Yet</h3>
      <p className="text-muted-foreground text-sm mb-4">
        Create your first attack simulation to validate security controls.
      </p>
      <Button size="sm">
        <Plus className="mr-2 h-4 w-4" />
        Create Simulation
      </Button>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <Main>
      <Skeleton className="mb-6 h-8 w-64" />
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>
      <Skeleton className="mt-6 h-96 rounded-lg" />
    </Main>
  )
}

export default function AttackSimulationPage() {
  const { data, isLoading } = useSimulations()

  const stats = useMemo(() => {
    const sims = data?.data ?? []
    const total = sims.length
    const completed = sims.filter(
      (s) => s.last_result === 'detected' || s.last_result === 'prevented'
    ).length
    const failed = sims.filter((s) => s.last_result === 'bypassed').length
    const active = sims.filter((s) => s.status === 'active').length
    const avgDetection = total > 0 ? sims.reduce((sum, s) => sum + s.detection_rate, 0) / total : 0

    return { total, completed, failed, active, avgDetection }
  }, [data])

  if (isLoading) return <LoadingSkeleton />

  const simulations = data?.data ?? []

  return (
    <Main>
      <PageHeader
        title="Breach & Attack Simulation"
        description="Validate security controls against real-world attack techniques"
      >
        <Button size="sm">
          <Plus className="mr-2 h-4 w-4" />
          New Simulation
        </Button>
      </PageHeader>

      {/* Stats */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Swords className="h-4 w-4" />
              Total Simulations
            </CardDescription>
            <CardTitle className="text-3xl">{stats.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Detected / Prevented
            </CardDescription>
            <CardTitle className="text-3xl text-green-500">{stats.completed}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <XCircle className="h-4 w-4" />
              Bypassed
            </CardDescription>
            <CardTitle className="text-3xl text-red-500">{stats.failed}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Avg Detection Rate
            </CardDescription>
            <CardTitle className="text-3xl">{Math.round(stats.avgDetection)}%</CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={stats.avgDetection} className="h-2" />
          </CardContent>
        </Card>
      </div>

      {/* Simulations Table */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Attack Simulations</CardTitle>
          <CardDescription>MITRE ATT&CK mapped simulation campaigns</CardDescription>
        </CardHeader>
        <CardContent>
          {simulations.length === 0 ? (
            <EmptyState />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Technique</TableHead>
                  <TableHead>Tactic</TableHead>
                  <TableHead>Last Run</TableHead>
                  <TableHead>Detection Rate</TableHead>
                  <TableHead>Result</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {simulations.map((sim) => (
                  <SimulationRow key={sim.id} sim={sim} />
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Quick Simulations</CardTitle>
          <CardDescription>Run common attack scenarios</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[
              { name: 'Phishing Test', icon: Target, desc: 'Email-based attack' },
              { name: 'Ransomware Sim', icon: AlertTriangle, desc: 'Encryption attack' },
              { name: 'Network Scan', icon: Shield, desc: 'Port discovery' },
              { name: 'Data Leak Test', icon: Swords, desc: 'Exfiltration attempt' },
            ].map((action) => (
              <Card key={action.name} className="cursor-pointer hover:bg-muted/50">
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-lg">
                    <action.icon className="text-primary h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{action.name}</p>
                    <p className="text-muted-foreground text-xs">{action.desc}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </Main>
  )
}
