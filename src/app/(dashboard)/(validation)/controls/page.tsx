'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { Main } from '@/components/layout'
import { PageHeader } from '@/features/shared'
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus, Trash2, FlaskConical } from 'lucide-react'
import { get, post, del, patch } from '@/lib/api/client'
import { toast } from 'sonner'

interface CompensatingControl {
  id: string
  name: string
  description: string
  control_type: 'preventive' | 'detective' | 'corrective' | 'compensating'
  status: 'active' | 'inactive' | 'pending'
  reduction_factor: number
  last_tested_at: string | null
  test_result: 'pass' | 'fail' | 'partial' | null
  created_at: string
  updated_at: string
}

interface PaginatedResponse {
  data: CompensatingControl[]
  total: number
  page: number
  per_page: number
}

const controlTypeColors: Record<string, string> = {
  preventive: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  detective: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  corrective: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  compensating: 'bg-green-500/10 text-green-500 border-green-500/20',
}

const statusColors: Record<string, string> = {
  active: 'bg-green-500/10 text-green-500 border-green-500/20',
  inactive: 'bg-muted text-muted-foreground',
  pending: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
}

const testResultColors: Record<string, string> = {
  pass: 'bg-green-500/10 text-green-500 border-green-500/20',
  fail: 'bg-red-500/10 text-red-500 border-red-500/20',
  partial: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
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
  const [testResult, setTestResult] = useState<'pass' | 'fail' | 'partial'>('pass')
  const [deleteControl, setDeleteControl] = useState<CompensatingControl | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    control_type: 'compensating' as CompensatingControl['control_type'],
    reduction_factor: '20',
  })

  const resetForm = () => {
    setFormData({ name: '', description: '', control_type: 'compensating', reduction_factor: '20' })
  }

  const handleCreate = async () => {
    if (!formData.name) {
      toast.error('Please provide a control name')
      return
    }
    try {
      await post('/api/v1/compensating-controls', {
        name: formData.name,
        description: formData.description,
        control_type: formData.control_type,
        reduction_factor: Number(formData.reduction_factor),
      })
      await mutate()
      toast.success('Compensating control created')
      setIsCreateOpen(false)
      resetForm()
    } catch {
      toast.error('Failed to create control')
    }
  }

  const handleRecordTest = async () => {
    if (!testControlId) return
    try {
      await patch(`/api/v1/compensating-controls/${testControlId}/test`, {
        test_result: testResult,
      })
      await mutate()
      toast.success('Test result recorded')
      setTestControlId(null)
    } catch {
      toast.error('Failed to record test result')
    }
  }

  const handleDelete = async () => {
    if (!deleteControl) return
    try {
      await del(`/api/v1/compensating-controls/${deleteControl.id}`)
      await mutate()
      toast.success('Control deleted')
      setDeleteControl(null)
    } catch {
      toast.error('Failed to delete control')
    }
  }

  return (
    <>
      <Main>
        <PageHeader
          title="Compensating Controls"
          description="Manage compensating controls that reduce finding risk scores"
        >
          <Button size="sm" onClick={() => setIsCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Control
          </Button>
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
                No compensating controls yet. Create one to get started.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Reduction</TableHead>
                    <TableHead>Last Tested</TableHead>
                    <TableHead>Test Result</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {controls.map((control) => (
                    <TableRow key={control.id}>
                      <TableCell className="font-medium">{control.name}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={controlTypeColors[control.control_type] || ''}
                        >
                          {control.control_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusColors[control.status] || ''}>
                          {control.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-sm">{control.reduction_factor}%</span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(control.last_tested_at)}
                      </TableCell>
                      <TableCell>
                        {control.test_result ? (
                          <Badge
                            variant="outline"
                            className={testResultColors[control.test_result] || ''}
                          >
                            {control.test_result}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setTestControlId(control.id)
                              setTestResult('pass')
                            }}
                          >
                            <FlaskConical className="mr-1 h-3 w-3" />
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
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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
                      control_type: value as CompensatingControl['control_type'],
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="preventive">Preventive</SelectItem>
                    <SelectItem value="detective">Detective</SelectItem>
                    <SelectItem value="corrective">Corrective</SelectItem>
                    <SelectItem value="compensating">Compensating</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="reduction_factor">Reduction Factor (%)</Label>
                <Input
                  id="reduction_factor"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.reduction_factor}
                  onChange={(e) => setFormData({ ...formData, reduction_factor: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate}>Create</Button>
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
                  <SelectItem value="pass">Pass</SelectItem>
                  <SelectItem value="fail">Fail</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTestControlId(null)}>
              Cancel
            </Button>
            <Button onClick={handleRecordTest}>Record</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteControl} onOpenChange={(open) => !open && setDeleteControl(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Control?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleteControl?.name}&quot;? This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
