'use client'

import { useMemo, useState } from 'react'
import { Main } from '@/components/layout'
import { PageHeader } from '@/features/shared'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  useCreateControlTest,
  useSimulations,
  type ControlTest,
  type FrameworkStats,
} from '@/features/simulation/api/use-simulation-api'
import { toast } from 'sonner'
import { mutate } from 'swr'

// ─────────────────────────────────────────────────────────
// Status config
// ─────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────
// Framework card
// ─────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────
// MITRE technique coverage (derived from simulations)
// ─────────────────────────────────────────────────────────

interface MitreCoverage {
  techniqueId: string
  techniqueName: string
  tactic: string
  detectionRate: number
  preventionRate: number
  simulationCount: number
}

function MitreCoverageTable({ coverage }: { coverage: MitreCoverage[] }) {
  if (coverage.length === 0) return null

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="text-base">MITRE ATT&CK Coverage</CardTitle>
        <CardDescription>
          Detection and prevention rates per technique from simulations
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Technique</TableHead>
              <TableHead>Tactic</TableHead>
              <TableHead>Detection Rate</TableHead>
              <TableHead>Prevention Rate</TableHead>
              <TableHead>Simulations</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {coverage.map((c) => (
              <TableRow key={c.techniqueId}>
                <TableCell>
                  <div>
                    <p className="font-medium text-sm">{c.techniqueName || c.techniqueId}</p>
                    <p className="text-muted-foreground text-xs font-mono">{c.techniqueId}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs capitalize">
                    {c.tactic.replace(/_/g, ' ')}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Progress value={c.detectionRate} className="h-1.5 w-20" />
                    <span className="text-xs text-muted-foreground">{c.detectionRate}%</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Progress value={c.preventionRate} className="h-1.5 w-20" />
                    <span className="text-xs text-muted-foreground">{c.preventionRate}%</span>
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{c.simulationCount}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

// ─────────────────────────────────────────────────────────
// Control test row
// ─────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────
// Create control test dialog
// ─────────────────────────────────────────────────────────

const FRAMEWORKS = [
  'NIST CSF',
  'ISO 27001',
  'SOC 2',
  'CIS Controls',
  'PCI DSS',
  'HIPAA',
  'MITRE ATT&CK',
  'Custom',
]
const RISK_LEVELS = ['critical', 'high', 'medium', 'low']
const CATEGORIES = [
  'Access Control',
  'Detection',
  'Prevention',
  'Response',
  'Recovery',
  'Audit',
  'Endpoint Security',
  'Network Security',
  'Application Security',
  'Data Protection',
  'Custom',
]

interface CreateControlTestDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

function CreateControlTestDialog({ open, onOpenChange, onSuccess }: CreateControlTestDialogProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [framework, setFramework] = useState('')
  const [controlId, setControlId] = useState('')
  const [controlName, setControlName] = useState('')
  const [category, setCategory] = useState('')
  const [riskLevel, setRiskLevel] = useState('medium')
  const [testProcedure, setTestProcedure] = useState('')
  const [expectedResult, setExpectedResult] = useState('')

  const { trigger: createControlTest, isMutating } = useCreateControlTest()

  function resetForm() {
    setName('')
    setDescription('')
    setFramework('')
    setControlId('')
    setControlName('')
    setCategory('')
    setRiskLevel('medium')
    setTestProcedure('')
    setExpectedResult('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name || !framework) {
      toast.error('Name and framework are required')
      return
    }
    try {
      await createControlTest({
        name,
        description,
        framework,
        control_id: controlId,
        control_name: controlName,
        category,
        risk_level: riskLevel,
        test_procedure: testProcedure,
        expected_result: expectedResult,
      } as Partial<ControlTest>)
      toast.success('Control test created')
      await mutate(
        (key: unknown) => typeof key === 'string' && key.startsWith('/api/v1/control-tests'),
        undefined,
        { revalidate: true }
      )
      onSuccess()
      onOpenChange(false)
      resetForm()
    } catch {
      toast.error('Failed to create control test')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Control Test</DialogTitle>
          <DialogDescription>
            Create a new control test to track security control effectiveness.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-2">
              <Label htmlFor="ct-name">Name *</Label>
              <Input
                id="ct-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. MFA Enforcement Test"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ct-framework">Framework *</Label>
              <Select value={framework} onValueChange={setFramework} required>
                <SelectTrigger id="ct-framework">
                  <SelectValue placeholder="Select framework" />
                </SelectTrigger>
                <SelectContent>
                  {FRAMEWORKS.map((f) => (
                    <SelectItem key={f} value={f}>
                      {f}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ct-risk">Risk level</Label>
              <Select value={riskLevel} onValueChange={setRiskLevel}>
                <SelectTrigger id="ct-risk">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RISK_LEVELS.map((r) => (
                    <SelectItem key={r} value={r} className="capitalize">
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ct-control-id">Control ID</Label>
              <Input
                id="ct-control-id"
                value={controlId}
                onChange={(e) => setControlId(e.target.value)}
                placeholder="e.g. AC-2, T1078"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ct-category">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id="ct-category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2 space-y-2">
              <Label htmlFor="ct-description">Description</Label>
              <Textarea
                id="ct-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What does this control test validate?"
                rows={2}
              />
            </div>

            <div className="col-span-2 space-y-2">
              <Label htmlFor="ct-procedure">Test procedure</Label>
              <Textarea
                id="ct-procedure"
                value={testProcedure}
                onChange={(e) => setTestProcedure(e.target.value)}
                placeholder="Step-by-step test procedure..."
                rows={2}
              />
            </div>

            <div className="col-span-2 space-y-2">
              <Label htmlFor="ct-expected">Expected result</Label>
              <Input
                id="ct-expected"
                value={expectedResult}
                onChange={(e) => setExpectedResult(e.target.value)}
                placeholder="e.g. Alert triggered within 60s"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onOpenChange(false)
                resetForm()
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isMutating}>
              {isMutating ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─────────────────────────────────────────────────────────
// Skeleton & empty state
// ─────────────────────────────────────────────────────────

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

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="bg-muted flex h-16 w-16 items-center justify-center rounded-full mb-4">
        <ShieldCheck className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="font-semibold mb-1">No Control Tests Yet</h3>
      <p className="text-muted-foreground text-sm mb-4">
        Create control tests to track security control effectiveness across frameworks.
      </p>
      <Button size="sm" onClick={onAdd}>
        <Plus className="mr-2 h-4 w-4" />
        Add Control Test
      </Button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────

export default function ControlTestingPage() {
  const [dialogOpen, setDialogOpen] = useState(false)

  const { data: testsData, isLoading: testsLoading, mutate: reloadTests } = useControlTests()
  const { data: statsData, isLoading: statsLoading } = useControlTestStats()
  const { data: simulationsData } = useSimulations()

  const isLoading = testsLoading || statsLoading

  // Derive summary stats from test list
  const summaryStats = useMemo(() => {
    const tests = testsData?.data ?? []
    const total = tests.length
    const passed = tests.filter((t) => t.status === 'pass').length
    const failed = tests.filter((t) => t.status === 'fail').length
    const untested = tests.filter((t) => t.status === 'untested').length
    const coveragePct = total > 0 ? Math.round(((passed + failed) / total) * 100) : 0
    return { total, passed, failed, untested, coveragePct }
  }, [testsData])

  // Derive MITRE coverage from simulations
  const mitreCoverage = useMemo((): MitreCoverage[] => {
    const sims = simulationsData?.data ?? []
    const byTechnique = new Map<string, MitreCoverage>()
    for (const sim of sims) {
      if (!sim.mitre_technique_id) continue
      const existing = byTechnique.get(sim.mitre_technique_id)
      if (existing) {
        const n = existing.simulationCount
        existing.detectionRate = Math.round(
          (existing.detectionRate * n + sim.detection_rate * 100) / (n + 1)
        )
        existing.preventionRate = Math.round(
          (existing.preventionRate * n + sim.prevention_rate * 100) / (n + 1)
        )
        existing.simulationCount += 1
      } else {
        byTechnique.set(sim.mitre_technique_id, {
          techniqueId: sim.mitre_technique_id,
          techniqueName: sim.mitre_technique_name,
          tactic: sim.mitre_tactic,
          detectionRate: Math.round(sim.detection_rate * 100),
          preventionRate: Math.round(sim.prevention_rate * 100),
          simulationCount: 1,
        })
      }
    }
    return Array.from(byTechnique.values()).sort((a, b) => b.detectionRate - a.detectionRate)
  }, [simulationsData])

  if (isLoading) return <LoadingSkeleton />

  const controlTests = testsData?.data ?? []
  const frameworkStats = statsData ?? []

  return (
    <Main>
      <PageHeader
        title="Control Testing"
        description="Track and validate security control effectiveness across compliance frameworks"
      >
        <Button size="sm" onClick={() => setDialogOpen(true)}>
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
            <CardDescription>Coverage</CardDescription>
            <CardTitle className="text-3xl">{summaryStats.coveragePct}%</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <Progress value={summaryStats.coveragePct} className="h-1.5" />
          </CardContent>
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

      {/* MITRE ATT&CK Coverage from simulations */}
      <MitreCoverageTable coverage={mitreCoverage} />

      {/* Control Tests Table */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Security Controls</CardTitle>
          <CardDescription>All control tests across frameworks</CardDescription>
        </CardHeader>
        <CardContent>
          {controlTests.length === 0 ? (
            <EmptyState onAdd={() => setDialogOpen(true)} />
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

      <CreateControlTestDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={reloadTests}
      />
    </Main>
  )
}
