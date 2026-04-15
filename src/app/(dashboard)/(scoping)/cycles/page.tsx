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
import { Skeleton } from '@/components/ui/skeleton'
import { Plus, Play, Eye, CheckCircle, RefreshCw } from 'lucide-react'
import { get, post, patch } from '@/lib/api/client'
import { toast } from 'sonner'

interface CtemCycle {
  id: string
  name: string
  description: string
  status: 'planning' | 'active' | 'review' | 'closed'
  start_date: string
  end_date: string
  created_at: string
  updated_at: string
}

interface PaginatedResponse {
  data: CtemCycle[]
  total: number
  page: number
  per_page: number
}

const statusColors: Record<CtemCycle['status'], string> = {
  planning: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  active: 'bg-green-500/10 text-green-500 border-green-500/20',
  review: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  closed: 'bg-muted text-muted-foreground',
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString()
}

export default function CtemCyclesPage() {
  const {
    data: response,
    isLoading,
    mutate,
  } = useSWR<PaginatedResponse>('/api/v1/ctem-cycles?per_page=100', get, {
    revalidateOnFocus: false,
  })

  const cycles = response?.data ?? []

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    start_date: '',
    end_date: '',
  })

  const resetForm = () => {
    setFormData({ name: '', description: '', start_date: '', end_date: '' })
  }

  const handleCreate = async () => {
    if (!formData.name) {
      toast.error('Please provide a cycle name')
      return
    }
    try {
      await post('/api/v1/ctem-cycles', formData)
      await mutate()
      toast.success('CTEM cycle created')
      setIsCreateOpen(false)
      resetForm()
    } catch {
      toast.error('Failed to create cycle')
    }
  }

  const handleStatusChange = async (id: string, action: 'activate' | 'review' | 'close') => {
    const statusMap = { activate: 'active', review: 'review', close: 'closed' } as const
    try {
      await patch(`/api/v1/ctem-cycles/${id}`, { status: statusMap[action] })
      await mutate()
      toast.success(
        `Cycle ${action === 'activate' ? 'activated' : action === 'review' ? 'moved to review' : 'closed'}`
      )
    } catch {
      toast.error('Failed to update cycle status')
    }
  }

  return (
    <>
      <Main>
        <PageHeader
          title="CTEM Cycles"
          description="Manage continuous threat exposure management cycles"
        >
          <Button size="sm" onClick={() => setIsCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Cycle
          </Button>
        </PageHeader>

        <Card>
          <CardHeader>
            <CardTitle>All Cycles</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : cycles.length === 0 ? (
              <p className="text-muted-foreground text-center py-8 text-sm">
                No CTEM cycles yet. Create one to get started.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>End Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cycles.map((cycle) => (
                    <TableRow key={cycle.id}>
                      <TableCell className="font-medium">{cycle.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusColors[cycle.status]}>
                          {cycle.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(cycle.start_date)}</TableCell>
                      <TableCell>{formatDate(cycle.end_date)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {cycle.status === 'planning' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleStatusChange(cycle.id, 'activate')}
                            >
                              <Play className="mr-1 h-3 w-3" />
                              Activate
                            </Button>
                          )}
                          {cycle.status === 'active' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleStatusChange(cycle.id, 'review')}
                            >
                              <Eye className="mr-1 h-3 w-3" />
                              Start Review
                            </Button>
                          )}
                          {cycle.status === 'review' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleStatusChange(cycle.id, 'close')}
                            >
                              <CheckCircle className="mr-1 h-3 w-3" />
                              Close
                            </Button>
                          )}
                          {cycle.status === 'closed' && (
                            <Badge variant="outline" className="text-xs">
                              Completed
                            </Badge>
                          )}
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

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create CTEM Cycle</DialogTitle>
            <DialogDescription>
              Start a new continuous threat exposure management cycle
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Q2 2026 CTEM Cycle"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of cycle goals"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_date">Start Date</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_date">End Date</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
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
    </>
  )
}
