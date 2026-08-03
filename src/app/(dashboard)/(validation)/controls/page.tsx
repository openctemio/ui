'use client'

import { useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import useSWR from 'swr'
import { Main } from '@/components/layout'
import { PageHeader, DataTable, DataTableColumnHeader } from '@/features/shared'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus, Trash2, FlaskConical, Link2 } from 'lucide-react'
import { get, post, del } from '@/lib/api/client'
import { getErrorMessage } from '@/lib/api/error-handler'
import { Can, Permission } from '@/lib/permissions'
import { toast } from 'sonner'
import { LinkAssetsDialog } from '@/features/controls/components/link-assets-dialog'
import {
  CONTROL_TYPES,
  MAX_REDUCTION_PERCENT,
  MIN_REDUCTION_PERCENT,
  TEST_RESULTS,
  factorToPercent,
  humanizeControlValue,
  isValidReductionPercent,
  percentToFactor,
  type ControlStatus,
  type ControlType,
  type TestResult,
} from '@/features/controls/vocabulary'

interface CompensatingControl {
  id: string
  name: string
  description: string
  control_type: ControlType
  status: ControlStatus
  reduction_factor: number
  last_tested_at: string | null
  test_result: TestResult | null
  created_at: string
  updated_at: string
}

interface PaginatedResponse {
  data: CompensatingControl[]
  total: number
  page: number
  per_page: number
}

// Control type is a category, not a risk level — a neutral badge is honest and
// keeps this page free of hardcoded light/dark colour pairs.
const statusColors: Record<string, string> = {
  active:
    'bg-green-500/10 text-green-500 border-green-500/20 dark:bg-green-900/30 dark:text-green-400',
  inactive: 'bg-muted text-muted-foreground',
  expired: 'bg-destructive/10 text-destructive border-destructive/20',
  untested: 'bg-muted text-muted-foreground',
}

const testResultColors: Record<string, string> = {
  pass: 'bg-green-500/10 text-green-500 border-green-500/20 dark:bg-green-900/30 dark:text-green-400',
  fail: 'bg-red-500/10 text-red-500 border-red-500/20 dark:bg-red-900/30 dark:text-red-400',
  partial:
    'bg-yellow-500/10 text-yellow-500 border-yellow-500/20 dark:bg-yellow-900/30 dark:text-yellow-400',
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'Never'
  return new Date(dateStr).toLocaleDateString()
}

export default function CompensatingControlsPage() {
  const {
    data: response,
    isLoading,
    mutate,
  } = useSWR<PaginatedResponse>('/api/v1/compensating-controls?per_page=100', get, {
    revalidateOnFocus: false,
  })

  const controls = response?.data ?? []

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [testControlId, setTestControlId] = useState<string | null>(null)
  const [testResult, setTestResult] = useState<TestResult>('pass')
  const [deleteControl, setDeleteControl] = useState<CompensatingControl | null>(null)
  const [linkControl, setLinkControl] = useState<CompensatingControl | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    control_type: 'runtime' as ControlType,
    // Percent as the operator types it; converted to the 0-1 fraction the API
    // stores at the boundary in handleCreate.
    reduction_percent: '20',
  })

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      control_type: 'runtime',
      reduction_percent: '20',
    })
  }

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      toast.error('Please provide a control name')
      return
    }
    const percent = Number(formData.reduction_percent)
    if (!isValidReductionPercent(percent)) {
      toast.error('Reduction must be between 1% and 100% — a 0% control would have no effect')
      return
    }
    setIsCreating(true)
    try {
      await post('/api/v1/compensating-controls', {
        name: formData.name.trim(),
        description: formData.description,
        control_type: formData.control_type,
        // The API takes a fraction (DECIMAL(3,2), CHECK 0..1), not a percent.
        reduction_factor: percentToFactor(percent),
      })
      await mutate()
      toast.success('Compensating control created. Link assets to make it reduce their priority.')
      setIsCreateOpen(false)
      resetForm()
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to create control'))
    } finally {
      setIsCreating(false)
    }
  }

  const handleRecordTest = async () => {
    if (!testControlId) return
    try {
      // POST, not PATCH — the route is registered as POST /{id}/test and a
      // PATCH returned 405, so recording a test never worked.
      await post(`/api/v1/compensating-controls/${testControlId}/test`, {
        test_result: testResult,
      })
      await mutate()
      toast.success(
        testResult === 'fail'
          ? 'Test result recorded. A failed control is deactivated and stops reducing priority.'
          : 'Test result recorded'
      )
      setTestControlId(null)
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to record test result'))
    }
  }

  const handleDelete = async () => {
    if (!deleteControl) return
    try {
      await del(`/api/v1/compensating-controls/${deleteControl.id}`)
      await mutate()
      toast.success('Control deleted')
      setDeleteControl(null)
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to delete control'))
    }
  }

  const columns = useMemo<ColumnDef<CompensatingControl>[]>(
    () => [
      {
        accessorKey: 'name',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
        cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
      },
      {
        accessorKey: 'control_type',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Type" />,
        cell: ({ row }) => (
          <Badge variant="outline">{humanizeControlValue(row.original.control_type)}</Badge>
        ),
      },
      {
        accessorKey: 'status',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
        cell: ({ row }) => (
          <Badge variant="outline" className={statusColors[row.original.status] || ''}>
            {humanizeControlValue(row.original.status)}
          </Badge>
        ),
      },
      {
        accessorKey: 'reduction_factor',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Reduction" />,
        // The API stores a 0-1 fraction; render it as the percent the form
        // accepts. Previously the raw fraction was suffixed with "%", so a
        // stored 0.30 displayed as "0.3%".
        cell: ({ row }) => (
          <span className="font-mono text-sm">
            {factorToPercent(row.original.reduction_factor)}%
          </span>
        ),
      },
      {
        accessorKey: 'last_tested_at',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Last Tested" />,
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {formatDate(row.original.last_tested_at)}
          </span>
        ),
      },
      {
        accessorKey: 'test_result',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Test Result" />,
        cell: ({ row }) =>
          row.original.test_result ? (
            <Badge variant="outline" className={testResultColors[row.original.test_result] || ''}>
              {row.original.test_result}
            </Badge>
          ) : (
            <span className="text-muted-foreground text-sm">-</span>
          ),
      },
      {
        id: 'actions',
        header: () => <div className="text-end">Actions</div>,
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) => {
          const control = row.original
          return (
            <Can permission={Permission.CompensatingControlsWrite}>
              <div className="flex items-center justify-end gap-1">
                <Button variant="ghost" size="sm" onClick={() => setLinkControl(control)}>
                  <Link2 className="me-1 h-3 w-3" />
                  Link Assets
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setTestControlId(control.id)
                    setTestResult('pass')
                  }}
                >
                  <FlaskConical className="me-1 h-3 w-3" />
                  Test
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDeleteControl(control)}
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Can>
          )
        },
      },
    ],
    []
  )

  return (
    <>
      <Main>
        <PageHeader
          title="Compensating Controls"
          description="Controls that hold down the priority of findings on the assets they protect. Link assets to a control to apply it."
        >
          <Can permission={Permission.CompensatingControlsWrite}>
            <Button size="sm" onClick={() => setIsCreateOpen(true)}>
              <Plus className="me-2 h-4 w-4" />
              New Control
            </Button>
          </Can>
        </PageHeader>

        <Card>
          <CardHeader>
            <CardTitle>All Controls</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : controls.length === 0 ? (
              <p className="text-muted-foreground text-center py-8 text-sm">
                No compensating controls yet. Create one, then link the assets it protects.
              </p>
            ) : (
              <DataTable columns={columns} data={controls} searchPlaceholder="Search controls..." />
            )}
          </CardContent>
        </Card>
      </Main>

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Compensating Control</DialogTitle>
            <DialogDescription>Add a control that reduces finding risk scores</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., WAF Rate Limiting"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="What this control does"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="control_type">Control Type</Label>
                <Select
                  value={formData.control_type}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      control_type: value as ControlType,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {/* Driven from the shared vocabulary so the form cannot
                        offer a value the backend rejects. */}
                    {CONTROL_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="reduction_percent">Risk Reduction (%)</Label>
                <Input
                  id="reduction_percent"
                  type="number"
                  min={MIN_REDUCTION_PERCENT}
                  max={MAX_REDUCTION_PERCENT}
                  value={formData.reduction_percent}
                  onChange={(e) => setFormData({ ...formData, reduction_percent: e.target.value })}
                />
              </div>
            </div>
            <p className="text-muted-foreground text-xs">
              A control caps the priority of findings on the assets you link to it — a protected
              asset is held at P2 rather than P1. The percentage is recorded and shown as the
              rationale; it does not currently scale the result further.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={isCreating}>
              {isCreating ? 'Creating…' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Record Test Dialog */}
      <Dialog open={!!testControlId} onOpenChange={(open) => !open && setTestControlId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Test Result</DialogTitle>
            <DialogDescription>Record the result of a control effectiveness test</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="test_result">Test Result</Label>
              <Select
                value={testResult}
                onValueChange={(v) => setTestResult(v as typeof testResult)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TEST_RESULTS.map((result) => (
                    <SelectItem key={result} value={result}>
                      {humanizeControlValue(result)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {testResult === 'fail' && (
              <p className="text-muted-foreground text-xs">
                Recording a failure deactivates this control — it will stop reducing the priority of
                findings on its linked assets.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTestControlId(null)}>
              Cancel
            </Button>
            <Button onClick={handleRecordTest}>Record</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Link Assets — the only action that makes a control affect scoring */}
      <LinkAssetsDialog
        control={linkControl}
        onOpenChange={(open) => !open && setLinkControl(null)}
        onLinked={() => {
          void mutate()
        }}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteControl}
        onOpenChange={(open) => !open && setDeleteControl(null)}
        title="Delete Control?"
        desc={
          <>
            Are you sure you want to delete &quot;{deleteControl?.name}&quot;? This action cannot be
            undone.
          </>
        }
        confirmText="Delete"
        destructive
        handleConfirm={handleDelete}
      />
    </>
  )
}
