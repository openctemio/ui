'use client'

import { useState, useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Main } from '@/components/layout'
import {
  PageHeader,
  MetricStrip,
  type MetricStripItem,
  DataTable,
  DataTableColumnHeader,
  DataTableRowActions,
  EmptyState,
  SheetBody,
  SheetInfoRow,
} from '@/features/shared'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Download, Eye, Pencil, ClipboardCheck, Shield } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { type ControlStatus, type Priority } from '@/features/compliance'
import {
  useFrameworks,
  useFrameworkStats,
  useFrameworkControls,
  useAssessments,
  useUpdateAssessment,
  useComplianceStats,
  type ComplianceFrameworkApi,
  type ComplianceControlApi,
  type ComplianceAssessmentApi,
} from '@/features/compliance/api/use-compliance-api'
import { mutate as swrMutate } from 'swr'
import { exportToCsv } from '@/hooks/use-csv-export'
import { useUrlFilter } from '@/hooks/use-url-param'
import { CRITICALITY_BADGE_SOFT } from '@/lib/criticality-colors'

// ── Local view types ──────────────────────────────────────────────────────────

interface ControlRow {
  id: string // control UUID
  frameworkId: string
  frameworkName: string
  controlId: string // e.g. "CIS 1"
  title: string
  description: string
  category: string
  status: ControlStatus
  priority: Priority
  owner: string
  dueDate?: string
  evidenceCount: number
  findingCount: number
  lastAssessed?: string
  notes?: string
  assessmentId?: string // present if previously assessed
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function mapAssessmentStatus(s: string | undefined): ControlStatus {
  if (s === 'implemented') return 'implemented'
  if (s === 'partial') return 'partial'
  if (s === 'not_implemented') return 'not_implemented'
  if (s === 'not_applicable') return 'not_applicable'
  return 'not_implemented'
}

function mapAssessmentPriority(p: string | undefined): Priority {
  if (p === 'critical') return 'critical'
  if (p === 'high') return 'high'
  if (p === 'medium') return 'medium'
  if (p === 'low') return 'low'
  return 'medium'
}

const statusLabels: Record<ControlStatus, string> = {
  implemented: 'Implemented',
  partial: 'Partial',
  not_implemented: 'Not implemented',
  not_applicable: 'N/A',
}

// Theme tokens only: a missing control is the one state worth colouring.
function ControlStatusBadge({ status }: { status: ControlStatus }) {
  const label = statusLabels[status] ?? status
  if (status === 'implemented') return <Badge variant="secondary">{label}</Badge>
  return (
    <Badge
      variant="outline"
      className={
        status === 'not_implemented'
          ? 'text-destructive'
          : status === 'not_applicable'
            ? 'text-muted-foreground'
            : undefined
      }
    >
      {label}
    </Badge>
  )
}

// Priority shares the criticality scale's colours (critical/high/medium/low).
function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <Badge variant="outline" className={`capitalize ${CRITICALITY_BADGE_SOFT[priority] ?? ''}`}>
      {priority}
    </Badge>
  )
}

/** One framework's score. Its own component so its stats hook is stable. */
function FrameworkCard({
  fw,
  onOpen,
}: {
  fw: ComplianceFrameworkApi
  onOpen: (id: string) => void
}) {
  const { data: fwStats } = useFrameworkStats(fw.id)
  const total = fwStats?.TotalControls ?? fw.total_controls
  const implemented = fwStats?.Implemented ?? 0
  const partial = fwStats?.Partial ?? 0
  const notImpl = fwStats?.NotImplemented ?? 0
  const notApplicable = fwStats?.NotApplicable ?? 0
  const score = total > 0 ? Math.round(((implemented + partial * 0.5) / total) * 100) : 0
  const counts = [
    { label: 'Implemented', value: implemented },
    { label: 'Partial', value: partial },
    { label: 'Missing', value: notImpl, danger: true },
    { label: 'N/A', value: notApplicable },
  ]
  return (
    <Card
      role="button"
      tabIndex={0}
      aria-label={`Open ${fw.name} controls`}
      className="cursor-pointer transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      onClick={() => onOpen(fw.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpen(fw.id)
        }
      }}
    >
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div className="min-w-0 space-y-1.5">
          <CardTitle>{fw.name}</CardTitle>
          <CardDescription className="line-clamp-2">{fw.description}</CardDescription>
        </div>
        <div className="shrink-0 text-end">
          <div className="text-2xl font-semibold tabular-nums">{score}%</div>
          <p className="text-xs text-muted-foreground">compliant</p>
        </div>
      </CardHeader>
      <CardContent>
        <Progress value={score} className="mb-4" />
        <dl className="grid grid-cols-4 gap-2 text-sm">
          {counts.map((c) => (
            <div key={c.label}>
              <dd
                className={`font-medium tabular-nums ${c.danger && c.value > 0 ? 'text-destructive' : ''}`}
              >
                {c.value}
              </dd>
              <dt className="text-xs text-muted-foreground">{c.label}</dt>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  )
}

export default function CompliancePage() {
  // ── API data ──────────────────────────────────────────────────────────────
  const { data: frameworksData, isLoading: loadingFrameworks } = useFrameworks()
  const { data: apiStats } = useComplianceStats()

  const frameworks = useMemo(() => frameworksData?.data ?? [], [frameworksData])

  // Selected framework for controls tab
  // Filters and the active tab live in the URL so a view can be linked.
  const [selectedFrameworkId, setSelectedFrameworkId] = useUrlFilter('framework', 'all')
  const [statusParam, setSelectedStatus] = useUrlFilter('status', 'all')
  const selectedStatus = statusParam as ControlStatus | 'all'
  const [tabParam, setTab] = useUrlFilter('tab', 'frameworks')
  const activeTab = tabParam === 'controls' ? 'controls' : 'frameworks'
  const [viewRequirement, setViewRequirement] = useState<ControlRow | null>(null)
  const [editRequirement, setEditRequirement] = useState<ControlRow | null>(null)

  const [formData, setFormData] = useState({
    status: 'partial' as ControlStatus,
    priority: 'medium' as Priority,
    owner: '',
    dueDate: '',
    notes: '',
  })

  // Fetch controls + assessments for the selected framework (or first framework)
  const activeFrameworkId =
    selectedFrameworkId !== 'all' ? selectedFrameworkId : (frameworks[0]?.id ?? '')
  const { data: controlsData, isLoading: loadingControls } = useFrameworkControls(
    activeFrameworkId,
    1,
    200
  )
  const { data: assessmentsData } = useAssessments(activeFrameworkId, 1, 200)

  // Build control rows by merging controls + assessments
  const controlRows: ControlRow[] = useMemo(() => {
    const controls: ComplianceControlApi[] = controlsData?.data ?? []
    const assessments: ComplianceAssessmentApi[] = assessmentsData?.data ?? []
    const fw = frameworks.find((f) => f.id === activeFrameworkId)
    const fwName = fw?.name ?? ''

    // Index assessments by control_id
    const assessmentByControlId = new Map<string, ComplianceAssessmentApi>()
    for (const a of assessments) {
      assessmentByControlId.set(a.control_id, a)
    }

    return controls.map((c) => {
      const a = assessmentByControlId.get(c.id)
      return {
        id: c.id,
        frameworkId: c.framework_id,
        frameworkName: fwName,
        controlId: c.control_id,
        title: c.title,
        description: c.description,
        category: c.category,
        status: a ? mapAssessmentStatus(a.status) : 'not_implemented',
        priority: mapAssessmentPriority(a?.priority),
        owner: a?.owner ?? '',
        dueDate: a?.due_date,
        evidenceCount: a?.evidence_count ?? 0,
        findingCount: a?.finding_count ?? 0,
        lastAssessed: a?.assessed_at,
        notes: a?.notes,
        assessmentId: a?.id,
      }
    })
  }, [controlsData, assessmentsData, frameworks, activeFrameworkId])

  const filteredRows = useMemo(() => {
    return controlRows.filter((row) => {
      if (selectedStatus !== 'all' && row.status !== selectedStatus) return false
      return true
    })
  }, [controlRows, selectedStatus])

  const stats = useMemo(() => {
    return {
      totalFrameworks: apiStats?.total_frameworks ?? frameworks.length,
      totalControls: apiStats?.total_controls ?? 0,
      byStatus: {
        implemented: controlRows.filter((r) => r.status === 'implemented').length,
        partial: controlRows.filter((r) => r.status === 'partial').length,
        not_implemented: controlRows.filter((r) => r.status === 'not_implemented').length,
        not_applicable: controlRows.filter((r) => r.status === 'not_applicable').length,
      },
      averageComplianceScore: (() => {
        const total = controlRows.length
        if (!total) return 0
        const implemented = controlRows.filter((r) => r.status === 'implemented').length
        const partial = controlRows.filter((r) => r.status === 'partial').length
        return Math.round(((implemented + partial * 0.5) / total) * 100)
      })(),
      overdueControls: apiStats?.overdue_controls ?? 0,
    }
  }, [apiStats, frameworks, controlRows])

  // Update assessment mutation (keyed per control)
  const { trigger: updateAssessment, isMutating: isSaving } = useUpdateAssessment(
    editRequirement?.id ?? ''
  )

  const handleEditSave = async () => {
    if (!editRequirement) return
    try {
      await updateAssessment({
        framework_id: editRequirement.frameworkId,
        status: formData.status,
        priority: formData.priority,
        owner: formData.owner || undefined,
        notes: formData.notes || undefined,
        due_date: formData.dueDate || undefined,
      })
      // Invalidate assessments cache
      await swrMutate(
        `/api/v1/compliance/assessments?framework_id=${editRequirement.frameworkId}&page=1&per_page=200`
      )
      toast.success('Control assessment updated')
      setEditRequirement(null)
    } catch {
      toast.error('Failed to save assessment')
    }
  }

  const handleExport = () => {
    exportToCsv(
      filteredRows,
      [
        { header: 'Framework', accessor: (r) => r.frameworkName },
        { header: 'Control ID', accessor: (r) => r.controlId },
        { header: 'Title', accessor: (r) => r.title },
        { header: 'Category', accessor: (r) => r.category },
        { header: 'Status', accessor: (r) => statusLabels[r.status] },
        { header: 'Priority', accessor: (r) => r.priority },
        { header: 'Owner', accessor: (r) => r.owner },
        { header: 'Due Date', accessor: (r) => r.dueDate ?? '' },
        { header: 'Evidence', accessor: (r) => r.evidenceCount },
        { header: 'Findings', accessor: (r) => r.findingCount },
      ],
      'compliance-controls'
    )
  }

  const openEdit = (req: ControlRow) => {
    setFormData({
      status: req.status,
      priority: req.priority,
      owner: req.owner,
      dueDate: req.dueDate ? req.dueDate.split('T')[0] : '',
      notes: req.notes || '',
    })
    setEditRequirement(req)
  }

  const metrics: MetricStripItem[] = [
    { key: 'frameworks', label: 'Frameworks', value: stats.totalFrameworks },
    {
      key: 'controls',
      label: 'Controls',
      value: apiStats?.total_controls ?? stats.totalControls,
      hint: `${stats.byStatus.implemented} implemented`,
    },
    { key: 'score', label: 'Avg compliance', value: `${stats.averageComplianceScore}%` },
    { key: 'overdue', label: 'Overdue', value: stats.overdueControls, tone: 'danger' },
  ]

  const columns: ColumnDef<ControlRow>[] = [
    {
      accessorKey: 'title',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Control" />,
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="font-medium">{row.original.title}</p>
          <p className="text-xs text-muted-foreground">
            <span className="font-mono">{row.original.controlId}</span>
            {row.original.category ? ` · ${row.original.category}` : ''}
          </p>
        </div>
      ),
    },
    {
      accessorKey: 'frameworkName',
      header: 'Framework',
      cell: ({ row }) => <Badge variant="outline">{row.original.frameworkName}</Badge>,
    },
    {
      accessorKey: 'status',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      cell: ({ row }) => <ControlStatusBadge status={row.original.status} />,
    },
    {
      accessorKey: 'priority',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Priority" />,
      cell: ({ row }) => <PriorityBadge priority={row.original.priority} />,
    },
    {
      accessorKey: 'evidenceCount',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Evidence" />,
      cell: ({ row }) => (
        <span className="text-sm tabular-nums text-muted-foreground">
          {row.original.evidenceCount}
        </span>
      ),
    },
    {
      id: 'actions',
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => (
        <DataTableRowActions
          actions={[
            { label: 'View details', icon: Eye, onClick: () => setViewRequirement(row.original) },
            { label: 'Update status', icon: Pencil, onClick: () => openEdit(row.original) },
          ]}
        />
      ),
    },
  ]

  // Two filter dimensions: dropdowns in the table toolbar.
  const filterSelects = (
    <>
      <Select value={selectedFrameworkId} onValueChange={setSelectedFrameworkId}>
        <SelectTrigger className="h-9 w-44" aria-label="Framework">
          <SelectValue placeholder="Framework" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">First framework</SelectItem>
          {frameworks.map((fw) => (
            <SelectItem key={fw.id} value={fw.id}>
              {fw.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={selectedStatus} onValueChange={setSelectedStatus}>
        <SelectTrigger className="h-9 w-40" aria-label="Status">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          <SelectItem value="implemented">Implemented</SelectItem>
          <SelectItem value="partial">Partial</SelectItem>
          <SelectItem value="not_implemented">Not implemented</SelectItem>
          <SelectItem value="not_applicable">N/A</SelectItem>
        </SelectContent>
      </Select>
    </>
  )

  return (
    <>
      <Main>
        <PageHeader
          title="Compliance"
          description="How far each compliance framework's controls are implemented."
        >
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 sm:me-2" />
            <span className="hidden sm:inline">Export</span>
          </Button>
        </PageHeader>

        <Tabs
          value={activeTab}
          onValueChange={(v) => setTab(v === 'controls' ? 'controls' : 'frameworks')}
          className="mt-4"
        >
          <TabsList>
            <TabsTrigger value="frameworks">Frameworks</TabsTrigger>
            <TabsTrigger value="controls">Controls</TabsTrigger>
          </TabsList>

          <MetricStrip className="mt-5" items={metrics} />

          <TabsContent value="frameworks" className="mt-5">
            {loadingFrameworks ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {Array.from({ length: 2 }).map((_, i) => (
                  <Skeleton key={i} className="h-48 rounded-xl" />
                ))}
              </div>
            ) : frameworks.length === 0 ? (
              <EmptyState
                icon={Shield}
                title="No frameworks yet"
                description="Compliance frameworks appear here once they are configured."
              />
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {frameworks.map((fw) => (
                  <FrameworkCard
                    key={fw.id}
                    fw={fw}
                    onOpen={(id) => {
                      setSelectedFrameworkId(id)
                      setTab('controls')
                    }}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="controls" className="mt-5">
            {loadingControls ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : controlRows.length === 0 ? (
              <EmptyState
                icon={ClipboardCheck}
                title="No controls"
                description="This framework has no controls yet."
              />
            ) : (
              <DataTable
                columns={columns}
                data={filteredRows}
                searchPlaceholder="Search controls…"
                toolbarEnd={filterSelects}
                onRowClick={setViewRequirement}
                emptyMessage="No controls match these filters"
                emptyDescription="Try a different status."
              />
            )}
          </TabsContent>
        </Tabs>
      </Main>

      {/* View Sheet */}
      <Sheet open={!!viewRequirement} onOpenChange={(open) => !open && setViewRequirement(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          {viewRequirement && (
            <>
              <SheetHeader>
                <SheetTitle>{viewRequirement.title}</SheetTitle>
                <SheetDescription>
                  {viewRequirement.frameworkName} · {viewRequirement.controlId}
                </SheetDescription>
              </SheetHeader>

              <SheetBody className="space-y-5">
                {viewRequirement.description && (
                  <p className="text-sm text-muted-foreground">{viewRequirement.description}</p>
                )}

                <div className="divide-y">
                  <SheetInfoRow label="Status">
                    <ControlStatusBadge status={viewRequirement.status} />
                  </SheetInfoRow>
                  <SheetInfoRow label="Priority">
                    <PriorityBadge priority={viewRequirement.priority} />
                  </SheetInfoRow>
                  <SheetInfoRow label="Owner">
                    <span className="text-sm">{viewRequirement.owner || '—'}</span>
                  </SheetInfoRow>
                  <SheetInfoRow label="Evidence">
                    <span className="text-sm tabular-nums">{viewRequirement.evidenceCount}</span>
                  </SheetInfoRow>
                  <SheetInfoRow label="Findings">
                    <span
                      className={`text-sm tabular-nums ${viewRequirement.findingCount > 0 ? 'font-medium text-destructive' : ''}`}
                    >
                      {viewRequirement.findingCount}
                    </span>
                  </SheetInfoRow>
                  {viewRequirement.dueDate && (
                    <SheetInfoRow label="Due date">
                      <span className="text-sm">
                        {new Date(viewRequirement.dueDate).toLocaleDateString()}
                      </span>
                    </SheetInfoRow>
                  )}
                  {viewRequirement.lastAssessed && (
                    <SheetInfoRow label="Last assessed">
                      <span className="text-sm">
                        {new Date(viewRequirement.lastAssessed).toLocaleDateString()}
                      </span>
                    </SheetInfoRow>
                  )}
                </div>

                {viewRequirement.notes && (
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold">Notes</h3>
                    <p className="text-sm text-muted-foreground">{viewRequirement.notes}</p>
                  </div>
                )}

                <Button className="w-full" onClick={() => openEdit(viewRequirement)}>
                  <Pencil className="me-2 h-4 w-4" />
                  Update status
                </Button>
              </SheetBody>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Edit Dialog */}
      <Dialog open={!!editRequirement} onOpenChange={(open) => !open && setEditRequirement(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Update control status</DialogTitle>
            <DialogDescription>
              {editRequirement && `${editRequirement.frameworkName} · ${editRequirement.controlId}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(v) => setFormData({ ...formData, status: v as ControlStatus })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="implemented">Implemented</SelectItem>
                    <SelectItem value="partial">Partial</SelectItem>
                    <SelectItem value="not_implemented">Not implemented</SelectItem>
                    <SelectItem value="not_applicable">N/A</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(v) => setFormData({ ...formData, priority: v as Priority })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Owner</Label>
              <Input
                value={formData.owner}
                onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Due date</Label>
              <Input
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditRequirement(null)}>
              Cancel
            </Button>
            <Button onClick={handleEditSave} disabled={isSaving}>
              {isSaving ? 'Saving…' : 'Save changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
