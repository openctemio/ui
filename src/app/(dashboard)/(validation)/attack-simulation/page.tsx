'use client'

import { useState } from 'react'
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
  Swords,
  Play,
  Pause,
  CheckCircle,
  XCircle,
  Clock,
  Target,
  Shield,
  AlertTriangle,
  RefreshCw,
  ChevronRight,
} from 'lucide-react'

// Mock data for attack simulations
const simulationStats = {
  totalSimulations: 24,
  passed: 18,
  failed: 4,
  inProgress: 2,
  avgSuccessRate: 75,
}

const attackTechniques = [
  {
    id: 'att-001',
    name: 'Phishing Campaign',
    category: 'Initial Access',
    mitreId: 'T1566',
    lastRun: '2024-03-10',
    status: 'passed',
    successRate: 92,
    controlsTested: 5,
  },
  {
    id: 'att-002',
    name: 'Credential Stuffing',
    category: 'Credential Access',
    mitreId: 'T1110',
    lastRun: '2024-03-09',
    status: 'failed',
    successRate: 45,
    controlsTested: 3,
  },
  {
    id: 'att-003',
    name: 'SQL Injection',
    category: 'Exploitation',
    mitreId: 'T1190',
    lastRun: '2024-03-08',
    status: 'passed',
    successRate: 88,
    controlsTested: 4,
  },
  {
    id: 'att-004',
    name: 'Lateral Movement',
    category: 'Lateral Movement',
    mitreId: 'T1021',
    lastRun: '2024-03-07',
    status: 'running',
    successRate: 0,
    controlsTested: 6,
  },
  {
    id: 'att-005',
    name: 'Data Exfiltration',
    category: 'Exfiltration',
    mitreId: 'T1041',
    lastRun: '2024-03-06',
    status: 'passed',
    successRate: 78,
    controlsTested: 4,
  },
  {
    id: 'att-006',
    name: 'Privilege Escalation',
    category: 'Privilege Escalation',
    mitreId: 'T1068',
    lastRun: '2024-03-05',
    status: 'failed',
    successRate: 35,
    controlsTested: 5,
  },
]

const recentResults = [
  {
    simulation: 'Phishing Campaign - Wave 3',
    target: 'Finance Department',
    result: 'Blocked',
    detectionTime: '2.3s',
    timestamp: '10 mins ago',
  },
  {
    simulation: 'Port Scan Detection',
    target: 'DMZ Network',
    result: 'Detected',
    detectionTime: '0.8s',
    timestamp: '25 mins ago',
  },
  {
    simulation: 'Malware Execution',
    target: 'Endpoint-PC-042',
    result: 'Blocked',
    detectionTime: '1.2s',
    timestamp: '1 hour ago',
  },
  {
    simulation: 'Credential Theft',
    target: 'Active Directory',
    result: 'Partial',
    detectionTime: '5.1s',
    timestamp: '2 hours ago',
  },
  {
    simulation: 'Ransomware Simulation',
    target: 'File Server',
    result: 'Blocked',
    detectionTime: '0.5s',
    timestamp: '3 hours ago',
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
  running: {
    icon: <RefreshCw className="h-4 w-4 animate-spin" />,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
  },
}

const resultConfig: Record<string, string> = {
  Blocked: 'bg-green-500/20 text-green-400',
  Detected: 'bg-blue-500/20 text-blue-400',
  Partial: 'bg-yellow-500/20 text-yellow-400',
  Failed: 'bg-red-500/20 text-red-400',
}

export default function AttackSimulationPage() {
  const [_activeCategory, _setActiveCategory] = useState<string | null>(null)

  return (
    <>
      <Main>
        <PageHeader
          title="Breach & Attack Simulation"
          description="Validate security controls against real-world attack techniques"
        />

        {/* Stats */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Swords className="h-4 w-4" />
                Total Simulations
              </CardDescription>
              <CardTitle className="text-3xl">{simulationStats.totalSimulations}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Passed
              </CardDescription>
              <CardTitle className="text-3xl text-green-500">{simulationStats.passed}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <XCircle className="h-4 w-4" />
                Failed
              </CardDescription>
              <CardTitle className="text-3xl text-red-500">{simulationStats.failed}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                In Progress
              </CardDescription>
              <CardTitle className="text-3xl text-blue-500">{simulationStats.inProgress}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Success Rate
              </CardDescription>
              <CardTitle className="text-3xl">{simulationStats.avgSuccessRate}%</CardTitle>
            </CardHeader>
            <CardContent>
              <Progress value={simulationStats.avgSuccessRate} className="h-2" />
            </CardContent>
          </Card>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          {/* Attack Techniques */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Attack Techniques</CardTitle>
                  <CardDescription>MITRE ATT&CK based simulations</CardDescription>
                </div>
                <Button size="sm">
                  <Play className="mr-2 h-4 w-4" />
                  Run All
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Technique</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Last Run</TableHead>
                    <TableHead>Success Rate</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[50px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attackTechniques.map((technique) => {
                    const status = statusConfig[technique.status]
                    return (
                      <TableRow key={technique.id} className="cursor-pointer hover:bg-muted/50">
                        <TableCell>
                          <div>
                            <p className="font-medium">{technique.name}</p>
                            <p className="text-muted-foreground text-xs">{technique.mitreId}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {technique.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {technique.lastRun}
                        </TableCell>
                        <TableCell>
                          {technique.status !== 'running' ? (
                            <div className="flex flex-wrap items-center gap-2">
                              <Progress value={technique.successRate} className="h-2 w-16" />
                              <span className="text-sm">{technique.successRate}%</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">Running...</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={`${status.bgColor} ${status.color} border-0`}>
                            {status.icon}
                            <span className="ml-1 capitalize">{technique.status}</span>
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            {technique.status === 'running' ? (
                              <Pause className="h-4 w-4" />
                            ) : (
                              <Play className="h-4 w-4" />
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Recent Results */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-base">Recent Results</CardTitle>
              <CardDescription>Latest simulation outcomes</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentResults.map((result, idx) => (
                <div key={idx} className="flex items-start justify-between rounded-lg border p-3">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{result.simulation}</p>
                    <p className="text-muted-foreground text-xs">{result.target}</p>
                    <div className="flex items-center gap-2 text-xs">
                      <Clock className="text-muted-foreground h-3 w-3" />
                      <span className="text-muted-foreground">{result.detectionTime}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge className={`${resultConfig[result.result]} border-0`}>
                      {result.result}
                    </Badge>
                    <p className="text-muted-foreground mt-1 text-xs">{result.timestamp}</p>
                  </div>
                </div>
              ))}
              <Button variant="ghost" className="w-full" size="sm">
                View All Results
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </div>

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
    </>
  )
}
