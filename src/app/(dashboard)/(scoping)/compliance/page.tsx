'use client'

import { useState, useMemo } from 'react'
import { Main } from '@/components/layout'
import { PageHeader } from '@/features/shared'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Download,
  Filter,
  MoreHorizontal,
  Eye,
  Pencil,
  ClipboardCheck,
  Shield,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  AlertCircle,
  X,
  Calendar,
  ChevronRight,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import {
  mockFrameworkSummaries,
  mockRequirements,
  frameworkNames,
  type ComplianceRequirement,
  type ComplianceFramework,
  type ControlStatus,
  type Priority,
} from '@/features/compliance'

const statusColors: Record<ControlStatus, string> = {
  implemented: 'bg-green-500/10 text-green-500 border-green-500/20',
  partial: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  not_implemented: 'bg-red-500/10 text-red-500 border-red-500/20',
  not_applicable: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
}

const statusLabels: Record<ControlStatus, string> = {
  implemented: 'Implemented',
  partial: 'Partial',
  not_implemented: 'Not Implemented',
  not_applicable: 'N/A',
}

const statusIcons: Record<ControlStatus, React.ElementType> = {
  implemented: CheckCircle2,
  partial: Clock,
  not_implemented: XCircle,
  not_applicable: AlertCircle,
}

const priorityColors: Record<Priority, string> = {
  critical: 'bg-red-500/10 text-red-500 border-red-500/20',
  high: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  medium: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  low: 'bg-green-500/10 text-green-500 border-green-500/20',
}

export default function CompliancePage() {
  const [requirements, setRequirements] = useState<ComplianceRequirement[]>(mockRequirements)
  const [selectedFramework, setSelectedFramework] = useState<ComplianceFramework | 'all'>('all')
  const [selectedStatus, setSelectedStatus] = useState<ControlStatus | 'all'>('all')
  const [viewRequirement, setViewRequirement] = useState<ComplianceRequirement | null>(null)
  const [editRequirement, setEditRequirement] = useState<ComplianceRequirement | null>(null)

  const [formData, setFormData] = useState({
    status: 'partial' as ControlStatus,
    priority: 'medium' as Priority,
    owner: '',
    dueDate: '',
    notes: '',
  })

  const stats = useMemo(() => {
    return {
      totalFrameworks: mockFrameworkSummaries.length,
      totalControls: requirements.length,
      byStatus: {
        implemented: requirements.filter((r) => r.status === 'implemented').length,
        partial: requirements.filter((r) => r.status === 'partial').length,
        not_implemented: requirements.filter((r) => r.status === 'not_implemented').length,
        not_applicable: requirements.filter((r) => r.status === 'not_applicable').length,
      },
      averageComplianceScore: Math.round(
        mockFrameworkSummaries.reduce((acc, f) => acc + f.complianceScore, 0) /
          mockFrameworkSummaries.length
      ),
      overdueControls: requirements.filter(
        (r) => r.dueDate && new Date(r.dueDate) < new Date() && r.status !== 'implemented'
      ).length,
    }
  }, [requirements])

  const filteredRequirements = useMemo(() => {
    return requirements.filter((req) => {
      if (selectedFramework !== 'all' && req.framework !== selectedFramework) return false
      if (selectedStatus !== 'all' && req.status !== selectedStatus) return false
      return true
    })
  }, [requirements, selectedFramework, selectedStatus])

  const handleEditSave = () => {
    if (!editRequirement) return
    setRequirements((prev) =>
      prev.map((req) =>
        req.id === editRequirement.id
          ? {
              ...req,
              status: formData.status,
              priority: formData.priority,
              owner: formData.owner,
              dueDate: formData.dueDate || undefined,
              notes: formData.notes || undefined,
              lastAssessed: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }
          : req
      )
    )
    // Update view if open
    if (viewRequirement && viewRequirement.id === editRequirement.id) {
      setViewRequirement({
        ...viewRequirement,
        status: formData.status,
        priority: formData.priority,
        owner: formData.owner,
        dueDate: formData.dueDate || undefined,
        notes: formData.notes || undefined,
        lastAssessed: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
    }
    toast.success('Requirement updated successfully')
    setEditRequirement(null)
  }

  const openEdit = (req: ComplianceRequirement) => {
    setFormData({
      status: req.status,
      priority: req.priority,
      owner: req.owner,
      dueDate: req.dueDate ? req.dueDate.split('T')[0] : '',
      notes: req.notes || '',
    })
    setEditRequirement(req)
  }

  return (
    <>
      <Main>
        <PageHeader
          title="Compliance Requirements"
          description="Track compliance frameworks and regulatory requirements"
        >
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export Report
          </Button>
        </PageHeader>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Frameworks</CardTitle>
              <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalFrameworks}</div>
              <p className="text-xs text-muted-foreground">Active frameworks</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Controls</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalControls}</div>
              <p className="text-xs text-muted-foreground">
                {stats.byStatus.implemented} implemented
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Avg Compliance</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">
                {stats.averageComplianceScore}%
              </div>
              <Progress value={stats.averageComplianceScore} className="mt-2" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Overdue</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">{stats.overdueControls}</div>
              <p className="text-xs text-muted-foreground">Controls need attention</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="frameworks" className="space-y-6">
          <TabsList>
            <TabsTrigger value="frameworks">Frameworks</TabsTrigger>
            <TabsTrigger value="controls">All Controls</TabsTrigger>
          </TabsList>

          {/* Frameworks Tab */}
          <TabsContent value="frameworks">
            <div className="grid gap-4 md:grid-cols-2">
              {mockFrameworkSummaries.map((framework) => (
                <Card
                  key={framework.framework}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                          <ClipboardCheck className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{framework.name}</CardTitle>
                          <CardDescription>{framework.description}</CardDescription>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold">{framework.complianceScore}%</div>
                        <p className="text-xs text-muted-foreground">Compliance</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Progress value={framework.complianceScore} className="mb-4" />
                    <div className="grid grid-cols-4 gap-2 text-center text-sm">
                      <div>
                        <div className="font-medium text-green-500">{framework.implemented}</div>
                        <div className="text-xs text-muted-foreground">Implemented</div>
                      </div>
                      <div>
                        <div className="font-medium text-yellow-500">{framework.partial}</div>
                        <div className="text-xs text-muted-foreground">Partial</div>
                      </div>
                      <div>
                        <div className="font-medium text-red-500">{framework.notImplemented}</div>
                        <div className="text-xs text-muted-foreground">Missing</div>
                      </div>
                      <div>
                        <div className="font-medium text-gray-500">{framework.notApplicable}</div>
                        <div className="text-xs text-muted-foreground">N/A</div>
                      </div>
                    </div>
                    {framework.nextAudit && (
                      <div className="mt-4 pt-4 border-t flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Next Audit</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(framework.nextAudit).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Controls Tab */}
          <TabsContent value="controls">
            {/* Filters */}
            <Card className="mb-6">
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Filter className="h-4 w-4" />
                  <CardTitle className="text-sm">Filters</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Label className="text-sm">Framework:</Label>
                    <Select
                      value={selectedFramework}
                      onValueChange={(v) => setSelectedFramework(v as ComplianceFramework | 'all')}
                    >
                      <SelectTrigger className="w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="pci_dss">PCI DSS</SelectItem>
                        <SelectItem value="soc2">SOC 2</SelectItem>
                        <SelectItem value="iso_27001">ISO 27001</SelectItem>
                        <SelectItem value="gdpr">GDPR</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Label className="text-sm">Status:</Label>
                    <Select
                      value={selectedStatus}
                      onValueChange={(v) => setSelectedStatus(v as ControlStatus | 'all')}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="implemented">Implemented</SelectItem>
                        <SelectItem value="partial">Partial</SelectItem>
                        <SelectItem value="not_implemented">Not Implemented</SelectItem>
                        <SelectItem value="not_applicable">N/A</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {(selectedFramework !== 'all' || selectedStatus !== 'all') && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedFramework('all')
                        setSelectedStatus('all')
                      }}
                    >
                      <X className="mr-1 h-3 w-3" />
                      Clear filters
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Requirements List */}
            <Card>
              <CardHeader>
                <CardTitle>Control Requirements</CardTitle>
                <CardDescription>
                  {filteredRequirements.length} of {requirements.length} controls
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {filteredRequirements.map((req) => {
                    const StatusIcon = statusIcons[req.status]
                    return (
                      <div
                        key={req.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer"
                        onClick={() => setViewRequirement(req)}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`p-2 rounded-lg ${statusColors[req.status]}`}>
                            <StatusIcon className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant="outline">{frameworkNames[req.framework]}</Badge>
                              <span className="font-mono text-sm text-muted-foreground">
                                {req.controlId}
                              </span>
                            </div>
                            <p className="font-medium mt-1">{req.title}</p>
                            <p className="text-sm text-muted-foreground">{req.category}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <Badge variant="outline" className={priorityColors[req.priority]}>
                              {req.priority}
                            </Badge>
                            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                              <FileText className="h-3 w-3" />
                              {req.evidenceCount} evidence
                            </div>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setViewRequirement(req)}>
                                <Eye className="mr-2 h-4 w-4" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openEdit(req)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Update Status
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </Main>

      {/* View Sheet */}
      <Sheet open={!!viewRequirement} onOpenChange={(open) => !open && setViewRequirement(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          {viewRequirement && (
            <>
              <SheetHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                    <ClipboardCheck className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <SheetTitle>{viewRequirement.title}</SheetTitle>
                    <SheetDescription>
                      {frameworkNames[viewRequirement.framework]} - {viewRequirement.controlId}
                    </SheetDescription>
                  </div>
                </div>
              </SheetHeader>

              <div className="mt-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Badge variant="outline" className={statusColors[viewRequirement.status]}>
                      {statusLabels[viewRequirement.status]}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Priority</p>
                    <Badge variant="outline" className={priorityColors[viewRequirement.priority]}>
                      {viewRequirement.priority}
                    </Badge>
                  </div>
                </div>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Description</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{viewRequirement.description}</p>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Evidence</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{viewRequirement.evidenceCount}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Findings</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div
                        className={`text-2xl font-bold ${viewRequirement.findingCount > 0 ? 'text-red-500' : ''}`}
                      >
                        {viewRequirement.findingCount}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Owner</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="font-medium">{viewRequirement.owner}</p>
                  </CardContent>
                </Card>

                {viewRequirement.dueDate && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Due Date</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {new Date(viewRequirement.dueDate).toLocaleDateString()}
                      </p>
                    </CardContent>
                  </Card>
                )}

                {viewRequirement.notes && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Notes</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm">{viewRequirement.notes}</p>
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Last Assessed</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">
                      {new Date(viewRequirement.lastAssessed).toLocaleDateString()}
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="mt-6">
                <Button className="w-full" onClick={() => openEdit(viewRequirement)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Update Status
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Edit Dialog */}
      <Dialog open={!!editRequirement} onOpenChange={(open) => !open && setEditRequirement(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Update Control Status</DialogTitle>
            <DialogDescription>
              {editRequirement &&
                `${frameworkNames[editRequirement.framework]} - ${editRequirement.controlId}`}
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
                    <SelectItem value="not_implemented">Not Implemented</SelectItem>
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
              <Label>Due Date</Label>
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
            <Button onClick={handleEditSave}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
