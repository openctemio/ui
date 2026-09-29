'use client'

import { useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Main } from '@/components/layout'
import {
  PageHeader,
  StatsCard,
  DataTable,
  DataTableColumnHeader,
  EmptyState,
} from '@/features/shared'
import { ValidationCoverageCard } from '@/features/validation/components/validation-coverage-card'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { SEVERITY_BADGE_SOFT } from '@/lib/severity-colors'
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
import { ShieldCheck, CheckCircle, XCircle, Plus, FlaskConical, Percent } from 'lucide-react'
import {
  useControlTests,
  useControlTestStats,
  useCreateControlTest,
  useRecordControlTestResult,
  useSimulations,
  type ControlTest,
  type FrameworkStats,
} from '@/features/simulation/api/use-simulation-api'
import { CONTROL_TEST_RESULTS } from '@/features/simulation/vocabulary'
import { useModuleEnabled } from '@/features/integrations/api/use-tenant-modules'
import { Can, Permission } from '@/lib/permissions'
import { toast } from 'sonner'
import { mutate } from 'swr'

// ─────────────────────────────────────────────────────────
// Status config
// ─────────────────────────────────────────────────────────

// Theme tokens only: a failed control is the one state worth colouring.
function ControlStatusBadge({ status }: { status: string }) {
  const label = status.replace(/_/g, ' ')
  if (status === 'pass')
    return (
      <Badge variant="secondary" className="capitalize">
        {label}
      </Badge>
    )
  return (
    <Badge
      variant="outline"
      className={
        status === 'fail'
          ? 'capitalize text-destructive'
          : status === 'partial'
            ? 'capitalize'
            : 'capitalize text-muted-foreground'
      }
    >
      {label}
    </Badge>
  )
}

const riskColors: Record<string, string> = { ...SEVERITY_BADGE_SOFT }

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
        <CardTitle className="text-2xl font-semibold tabular-nums">{passRate}% passing</CardTitle>
      </CardHeader>
      <CardContent>
        <Progress value={passRate} className="mb-2 h-2" />
        <div className="flex gap-3 text-xs tabular-nums text-muted-foreground">
          <span>{stats.passed} pass</span>
          <span className={stats.failed > 0 ? 'text-destructive' : undefined}>
            {stats.failed} fail
          </span>
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

const mitreColumns: ColumnDef<MitreCoverage>[] = [
  {
    accessorKey: 'techniqueName',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Technique" />,
    cell: ({ row }) => (
      <div>
        <p className="text-sm font-medium">
          {row.original.techniqueName || row.original.techniqueId}
        </p>
        <p className="font-mono text-xs text-muted-foreground">{row.original.techniqueId}</p>
      </div>
    ),
  },
  {
    accessorKey: 'tactic',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Tactic" />,
    cell: ({ row }) => (
      <Badge variant="outline" className="capitalize">
        {row.original.tactic.replace(/_/g, ' ')}
      </Badge>
    ),
  },
  {
    accessorKey: 'detectionRate',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Detection rate" />,
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <Progress value={row.original.detectionRate} className="h-1.5 w-20" />
        <span className="text-xs tabular-nums text-muted-foreground">
          {row.original.detectionRate}%
        </span>
      </div>
    ),
  },
  {
    accessorKey: 'preventionRate',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Prevention rate" />,
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <Progress value={row.original.preventionRate} className="h-1.5 w-20" />
        <span className="text-xs tabular-nums text-muted-foreground">
          {row.original.preventionRate}%
        </span>
      </div>
    ),
  },
  {
    accessorKey: 'simulationCount',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Simulations" />,
    cell: ({ row }) => (
      <span className="text-sm tabular-nums text-muted-foreground">
        {row.original.simulationCount}
      </span>
    ),
  },
]

// ─────────────────────────────────────────────────────────
// Control tests table
// ─────────────────────────────────────────────────────────

/** The row's "Record result" action; owns its dialog so each row opens its own. */
function RecordResultAction({ ct }: { ct: ControlTest }) {
  const [recordOpen, setRecordOpen] = useState(false)
  return (
    <Can permission={Permission.PentestWrite}>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setRecordOpen(true)}
        aria-label={`Record a test result for ${ct.name}`}
      >
        <FlaskConical className="size-4" />
        <span className="ms-1 hidden sm:inline">Record result</span>
      </Button>
      <RecordResultDialog ct={ct} open={recordOpen} onOpenChange={setRecordOpen} />
    </Can>
  )
}

const controlColumns: ColumnDef<ControlTest>[] = [
  {
    accessorKey: 'name',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Control" />,
    cell: ({ row }) => (
      <div>
        <p className="font-medium">{row.original.name}</p>
        <p className="text-xs text-muted-foreground">{row.original.control_id}</p>
      </div>
    ),
  },
  {
    accessorKey: 'framework',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Framework" />,
    cell: ({ row }) => <Badge variant="outline">{row.original.framework}</Badge>,
  },
  {
    accessorKey: 'category',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Category" />,
    cell: ({ row }) =>
      row.original.category ? (
        <Badge variant="outline">{row.original.category}</Badge>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
  {
    accessorKey: 'risk_level',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Risk" />,
    cell: ({ row }) => (
      <Badge
        variant="outline"
        className={`capitalize ${riskColors[row.original.risk_level] ?? ''}`}
      >
        {row.original.risk_level}
      </Badge>
    ),
  },
  {
    accessorKey: 'status',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
    cell: ({ row }) => <ControlStatusBadge status={row.original.status} />,
  },
  {
    accessorKey: 'last_tested_at',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Last tested" />,
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {row.original.last_tested_at
          ? new Date(row.original.last_tested_at).toLocaleDateString()
          : 'Never'}
      </span>
    ),
  },
  {
    id: 'actions',
    enableSorting: false,
    enableHiding: false,
    cell: ({ row }) => <RecordResultAction ct={row.original} />,
  },
]

// ─────────────────────────────────────────────────────────
// Record test result dialog
// ─────────────────────────────────────────────────────────

function RecordResultDialog({
  ct,
  open,
  onOpenChange,
}: {
  ct: ControlTest
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [status, setStatus] = useState<string>('pass')
  const [evidence, setEvidence] = useState('')
  const [notes, setNotes] = useState('')

  const { trigger: recordResult, isMutating } = useRecordControlTestResult(ct.id)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      await recordResult({ status, evidence, notes })
      toast.success('Test result recorded')
      await mutate(
        (key: unknown) => typeof key === 'string' && key.startsWith('/api/v1/control-tests'),
        undefined,
        { revalidate: true }
      )
      onOpenChange(false)
      setEvidence('')
      setNotes('')
      setStatus('pass')
    } catch {
      toast.error('Could not record the test result')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record test result</DialogTitle>
          <DialogDescription>
            {ct.name}
            {ct.control_id ? ` · ${ct.control_id}` : ''}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="ct-result">Result</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger id="ct-result" className="cursor-pointer">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CONTROL_TEST_RESULTS.map((r) => (
                  <SelectItem key={r.value} value={r.value} className="cursor-pointer">
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {ct.expected_result ? (
            <div className="grid gap-1">
              <Label className="text-muted-foreground text-xs">Expected result</Label>
              <p className="text-sm">{ct.expected_result}</p>
            </div>
          ) : null}

          <div className="grid gap-2">
            <Label htmlFor="ct-evidence">Evidence</Label>
            <Textarea
              id="ct-evidence"
              value={evidence}
              onChange={(e) => setEvidence(e.target.value)}
              placeholder="What was observed, and where it can be checked"
              rows={3}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="ct-notes">Notes</Label>
            <Textarea
              id="ct-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="cursor-pointer"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isMutating} className="cursor-pointer">
              {isMutating ? 'Recording…' : 'Record result'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
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
          <DialogTitle>Add control test</DialogTitle>
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
      <Skeleton className="h-8 w-48" />
      <Skeleton className="mt-2 h-4 w-96 max-w-full" />
      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <Skeleton className="mt-5 h-96 rounded-xl" />
    </Main>
  )
}

// ─────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────

export default function ControlTestingPage() {
  const [dialogOpen, setDialogOpen] = useState(false)

  const { data: testsData, isLoading: testsLoading, mutate: reloadTests } = useControlTests()
  const { data: statsData, isLoading: statsLoading } = useControlTestStats()
  // The MITRE coverage panel is derived from the (Phase-3 gated) attack_simulation
  // module. When it's disabled the /simulations fetch 403s — skip it and hide the
  // panel. Fail-open on OSS (no modules reported).
  const simulationEnabled = useModuleEnabled('attack_simulation')
  const { data: simulationsData } = useSimulations({ enabled: simulationEnabled })

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
        title="Control testing"
        description="Track whether your security controls pass their tests, framework by framework."
      >
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 sm:me-2" />
          <span className="hidden sm:inline">Add control test</span>
        </Button>
      </PageHeader>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Controls" value={summaryStats.total} icon={ShieldCheck} />
        <StatsCard title="Passed" value={summaryStats.passed} icon={CheckCircle} />
        <StatsCard
          title="Failed"
          value={summaryStats.failed}
          icon={XCircle}
          valueClassName={summaryStats.failed > 0 ? 'text-destructive' : undefined}
        />
        <StatsCard
          title="Coverage"
          value={`${summaryStats.coveragePct}%`}
          icon={Percent}
          description={`${summaryStats.untested} untested`}
        />
      </div>

      {/* Validation coverage KPI: how much exposure has been re-checked. */}
      <div className="mt-5">
        <ValidationCoverageCard />
      </div>

      {frameworkStats.length > 0 && (
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {frameworkStats.map((fw) => (
            <FrameworkCard key={fw.framework} stats={fw} />
          ))}
        </div>
      )}

      {/* MITRE ATT&CK coverage from simulations — only when attack_simulation is enabled */}
      {simulationEnabled && mitreCoverage.length > 0 && (
        <section className="mt-5 space-y-3">
          <div>
            <h2 className="text-base font-semibold">MITRE ATT&CK coverage</h2>
            <p className="text-sm text-muted-foreground">
              Detection and prevention rates per technique, from simulations.
            </p>
          </div>
          <DataTable
            columns={mitreColumns}
            data={mitreCoverage}
            searchPlaceholder="Search techniques…"
          />
        </section>
      )}

      <section className="mt-5 space-y-3">
        <h2 className="text-base font-semibold">Security controls</h2>
        {controlTests.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title="No control tests yet"
            description="Add control tests to track security control effectiveness across frameworks."
            action={
              <Button size="sm" onClick={() => setDialogOpen(true)}>
                <Plus className="me-2 h-4 w-4" />
                Add control test
              </Button>
            }
          />
        ) : (
          <DataTable
            columns={controlColumns}
            data={controlTests}
            searchPlaceholder="Search controls…"
          />
        )}
      </section>

      <CreateControlTestDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={reloadTests}
      />
    </Main>
  )
}
