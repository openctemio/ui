'use client'

import { useState, useMemo } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { Main } from '@/components/layout'
import { PageHeader, DataTable, DataTableColumnHeader, RiskScoreBadge } from '@/features/shared'
import { Can, Permission } from '@/lib/permissions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Plus,
  Download,
  Filter,
  MoreHorizontal,
  Eye,
  Pencil,
  Trash2,
  Layers,
  Users,
  Shield,
  AlertTriangle,
  Building2,
  Mail,
  ChevronRight,
  X,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import {
  mockBusinessUnits,
  getChildBusinessUnits,
  type BusinessUnit,
  type Criticality,
  type RiskTolerance,
} from '@/features/business-units'

const criticalityColors: Record<Criticality, string> = {
  critical: 'bg-red-500/10 text-red-500 border-red-500/20',
  high: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  medium: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  low: 'bg-green-500/10 text-green-500 border-green-500/20',
}

const riskToleranceLabels: Record<RiskTolerance, string> = {
  very_low: 'Very Low',
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  very_high: 'Very High',
}

const riskToleranceColors: Record<RiskTolerance, string> = {
  very_low: 'bg-green-500/10 text-green-500 border-green-500/20',
  low: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  medium: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  high: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  very_high: 'bg-red-500/10 text-red-500 border-red-500/20',
}

export default function BusinessUnitsPage() {
  const [businessUnits, setBusinessUnits] = useState<BusinessUnit[]>(mockBusinessUnits)
  const [viewUnit, setViewUnit] = useState<BusinessUnit | null>(null)
  const [editUnit, setEditUnit] = useState<BusinessUnit | null>(null)
  const [deleteUnit, setDeleteUnit] = useState<BusinessUnit | null>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [filterCriticality, setFilterCriticality] = useState<string>('all')
  const [filterRiskTolerance, setFilterRiskTolerance] = useState<string>('all')

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    parentId: '',
    criticality: 'medium' as Criticality,
    riskTolerance: 'medium' as RiskTolerance,
    owner: '',
    ownerEmail: '',
    tags: '',
  })

  const stats = useMemo(() => {
    return {
      total: businessUnits.length,
      active: businessUnits.filter((bu) => bu.status === 'active').length,
      inactive: businessUnits.filter((bu) => bu.status === 'inactive').length,
      totalAssets: businessUnits.reduce((acc, bu) => acc + bu.assetCount, 0),
      averageRiskScore: Math.round(
        businessUnits.reduce((acc, bu) => acc + bu.riskScore, 0) / businessUnits.length
      ),
      averageComplianceScore: Math.round(
        businessUnits.reduce((acc, bu) => acc + bu.complianceScore, 0) / businessUnits.length
      ),
    }
  }, [businessUnits])

  const rootUnits = useMemo(() => {
    return businessUnits.filter((bu) => !bu.parentId)
  }, [businessUnits])

  const filteredUnits = useMemo(() => {
    return businessUnits.filter((unit) => {
      if (filterCriticality !== 'all' && unit.criticality !== filterCriticality) return false
      if (filterRiskTolerance !== 'all' && unit.riskTolerance !== filterRiskTolerance) return false
      return true
    })
  }, [businessUnits, filterCriticality, filterRiskTolerance])

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      parentId: '',
      criticality: 'medium',
      riskTolerance: 'medium',
      owner: '',
      ownerEmail: '',
      tags: '',
    })
  }

  const handleCreate = () => {
    if (!formData.name || !formData.owner || !formData.ownerEmail) {
      toast.error('Please fill in all required fields')
      return
    }
    const newUnit: BusinessUnit = {
      id: `bu-${Date.now()}`,
      name: formData.name,
      description: formData.description || undefined,
      parentId: formData.parentId || undefined,
      status: 'active',
      criticality: formData.criticality,
      riskTolerance: formData.riskTolerance,
      owner: formData.owner,
      ownerEmail: formData.ownerEmail,
      assetCount: 0,
      employeeCount: 0,
      riskScore: 50,
      complianceScore: 80,
      tags: formData.tags ? formData.tags.split(',').map((t) => t.trim()) : [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    setBusinessUnits((prev) => [...prev, newUnit])
    toast.success('Business unit created successfully')
    setIsCreateOpen(false)
    resetForm()
  }

  const handleEdit = () => {
    if (!editUnit || !formData.name || !formData.owner || !formData.ownerEmail) {
      toast.error('Please fill in all required fields')
      return
    }
    setBusinessUnits((prev) =>
      prev.map((unit) =>
        unit.id === editUnit.id
          ? {
              ...unit,
              name: formData.name,
              description: formData.description || undefined,
              parentId: formData.parentId || undefined,
              criticality: formData.criticality,
              riskTolerance: formData.riskTolerance,
              owner: formData.owner,
              ownerEmail: formData.ownerEmail,
              tags: formData.tags ? formData.tags.split(',').map((t) => t.trim()) : [],
              updatedAt: new Date().toISOString(),
            }
          : unit
      )
    )
    toast.success('Business unit updated successfully')
    setEditUnit(null)
    resetForm()
  }

  const handleDelete = () => {
    if (!deleteUnit) return
    setBusinessUnits((prev) => prev.filter((unit) => unit.id !== deleteUnit.id))
    toast.success('Business unit deleted successfully')
    setDeleteUnit(null)
  }

  const openEdit = (unit: BusinessUnit) => {
    setFormData({
      name: unit.name,
      description: unit.description || '',
      parentId: unit.parentId || '',
      criticality: unit.criticality,
      riskTolerance: unit.riskTolerance,
      owner: unit.owner,
      ownerEmail: unit.ownerEmail,
      tags: unit.tags.join(', '),
    })
    setEditUnit(unit)
  }

  const columns: ColumnDef<BusinessUnit>[] = [
    {
      accessorKey: 'name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Business Unit" />,
      cell: ({ row }) => {
        const unit = row.original
        const children = getChildBusinessUnits(unit.id)
        return (
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="font-medium flex items-center gap-2">
                {unit.name}
                {unit.parentId && (
                  <Badge variant="outline" className="text-xs">
                    Sub-unit
                  </Badge>
                )}
              </div>
              <div className="text-xs text-muted-foreground">
                {unit.employeeCount} employees
                {children.length > 0 && ` | ${children.length} sub-units`}
              </div>
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: 'criticality',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Criticality" />,
      cell: ({ row }) => (
        <Badge variant="outline" className={criticalityColors[row.original.criticality]}>
          {row.original.criticality}
        </Badge>
      ),
      filterFn: (row, id, value) => value.includes(row.getValue(id)),
    },
    {
      accessorKey: 'riskTolerance',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Risk Tolerance" />,
      cell: ({ row }) => (
        <Badge variant="outline" className={riskToleranceColors[row.original.riskTolerance]}>
          {riskToleranceLabels[row.original.riskTolerance]}
        </Badge>
      ),
    },
    {
      accessorKey: 'assetCount',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Assets" />,
      cell: ({ row }) => <span className="font-medium">{row.original.assetCount}</span>,
    },
    {
      accessorKey: 'riskScore',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Risk Score" />,
      cell: ({ row }) => <RiskScoreBadge score={row.original.riskScore} />,
    },
    {
      accessorKey: 'complianceScore',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Compliance" />,
      cell: ({ row }) => {
        const score = row.original.complianceScore
        return (
          <div className="flex flex-wrap items-center gap-2">
            <Progress value={score} className="w-16 h-2" />
            <span className="text-sm font-medium">{score}%</span>
          </div>
        )
      },
    },
    {
      accessorKey: 'owner',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Owner" />,
      cell: ({ row }) => (
        <div className="text-sm">
          <div className="font-medium">{row.original.owner}</div>
          <div className="text-muted-foreground text-xs">{row.original.ownerEmail}</div>
        </div>
      ),
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const unit = row.original
        return (
          <Can permission={[Permission.ScopeWrite, Permission.ScopeDelete]}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setViewUnit(unit)}>
                  <Eye className="mr-2 h-4 w-4" />
                  View Details
                </DropdownMenuItem>
                <Can permission={Permission.ScopeWrite}>
                  <DropdownMenuItem onClick={() => openEdit(unit)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                </Can>
                <Can permission={Permission.ScopeDelete}>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setDeleteUnit(unit)}
                    className="text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </Can>
              </DropdownMenuContent>
            </DropdownMenu>
          </Can>
        )
      },
    },
  ]

  const formFields = (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Name *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., Technology & Engineering"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="parentId">Parent Unit</Label>
          <Select
            value={formData.parentId}
            onValueChange={(value) => setFormData({ ...formData, parentId: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="None (Root level)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">None (Root level)</SelectItem>
              {rootUnits.map((unit) => (
                <SelectItem key={unit.id} value={unit.id}>
                  {unit.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Brief description of this business unit..."
          rows={3}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="criticality">Criticality *</Label>
          <Select
            value={formData.criticality}
            onValueChange={(value) =>
              setFormData({ ...formData, criticality: value as Criticality })
            }
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
        <div className="space-y-2">
          <Label htmlFor="riskTolerance">Risk Tolerance *</Label>
          <Select
            value={formData.riskTolerance}
            onValueChange={(value) =>
              setFormData({ ...formData, riskTolerance: value as RiskTolerance })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="very_low">Very Low</SelectItem>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="very_high">Very High</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="owner">Owner *</Label>
          <Input
            id="owner"
            value={formData.owner}
            onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
            placeholder="e.g., John Doe"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ownerEmail">Owner Email *</Label>
          <Input
            id="ownerEmail"
            type="email"
            value={formData.ownerEmail}
            onChange={(e) => setFormData({ ...formData, ownerEmail: e.target.value })}
            placeholder="e.g., john@company.com"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="tags">Tags</Label>
        <Input
          id="tags"
          value={formData.tags}
          onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
          placeholder="Comma-separated tags, e.g., core, technology"
        />
      </div>
    </div>
  )

  return (
    <>
      <Main>
        <PageHeader
          title="Business Units"
          description="Manage organizational structure and align security with business objectives"
        >
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Can permission={Permission.ScopeWrite}>
            <Button size="sm" onClick={() => setIsCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Business Unit
            </Button>
          </Can>
        </PageHeader>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Units</CardTitle>
              <Layers className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">
                {stats.active} active, {stats.inactive} inactive
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalAssets}</div>
              <p className="text-xs text-muted-foreground">Across all units</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Avg Risk Score</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.averageRiskScore}</div>
              <Progress value={stats.averageRiskScore} className="mt-2" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Avg Compliance</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.averageComplianceScore}%</div>
              <Progress value={stats.averageComplianceScore} className="mt-2" />
            </CardContent>
          </Card>
        </div>

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
                <Label className="text-sm">Criticality:</Label>
                <Select value={filterCriticality} onValueChange={setFilterCriticality}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Label className="text-sm">Risk Tolerance:</Label>
                <Select value={filterRiskTolerance} onValueChange={setFilterRiskTolerance}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="very_low">Very Low</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="very_high">Very High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {(filterCriticality !== 'all' || filterRiskTolerance !== 'all') && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setFilterCriticality('all')
                    setFilterRiskTolerance('all')
                  }}
                >
                  <X className="mr-1 h-3 w-3" />
                  Clear filters
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Data Table */}
        <Card>
          <CardHeader>
            <CardTitle>Business Units</CardTitle>
            <CardDescription>
              {filteredUnits.length} of {businessUnits.length} units
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={columns}
              data={filteredUnits}
              searchPlaceholder="Search business units..."
              searchKey="name"
              onRowClick={(unit) => setViewUnit(unit)}
            />
          </CardContent>
        </Card>
      </Main>

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Business Unit</DialogTitle>
            <DialogDescription>
              Add a new business unit to organize your security scope
            </DialogDescription>
          </DialogHeader>
          {formFields}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editUnit} onOpenChange={(open) => !open && setEditUnit(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Business Unit</DialogTitle>
            <DialogDescription>Update business unit details</DialogDescription>
          </DialogHeader>
          {formFields}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUnit(null)}>
              Cancel
            </Button>
            <Button onClick={handleEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Sheet */}
      <Sheet open={!!viewUnit} onOpenChange={(open) => !open && setViewUnit(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          {viewUnit && (
            <>
              <SheetHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                    <Building2 className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <SheetTitle>{viewUnit.name}</SheetTitle>
                    <SheetDescription>{viewUnit.description}</SheetDescription>
                  </div>
                </div>
              </SheetHeader>

              <Tabs defaultValue="overview" className="mt-6">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="hierarchy">Hierarchy</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Criticality</p>
                      <Badge variant="outline" className={criticalityColors[viewUnit.criticality]}>
                        {viewUnit.criticality}
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Risk Tolerance</p>
                      <Badge
                        variant="outline"
                        className={riskToleranceColors[viewUnit.riskTolerance]}
                      >
                        {riskToleranceLabels[viewUnit.riskTolerance]}
                      </Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Assets</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{viewUnit.assetCount}</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Employees</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{viewUnit.employeeCount}</div>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Risk Score</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-4">
                        <RiskScoreBadge score={viewUnit.riskScore} />
                        <Progress value={viewUnit.riskScore} className="flex-1" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Compliance Score</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-4">
                        <span className="text-2xl font-bold">{viewUnit.complianceScore}%</span>
                        <Progress value={viewUnit.complianceScore} className="flex-1" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Owner</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                          <Users className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-medium">{viewUnit.owner}</p>
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {viewUnit.ownerEmail}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {viewUnit.tags.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Tags</p>
                      <div className="flex flex-wrap gap-2">
                        {viewUnit.tags.map((tag) => (
                          <Badge key={tag} variant="secondary">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="hierarchy" className="mt-4">
                  {viewUnit.parentId && (
                    <div className="mb-4">
                      <p className="text-sm text-muted-foreground mb-2">Parent Unit</p>
                      <Card className="p-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">
                            {mockBusinessUnits.find((u) => u.id === viewUnit.parentId)?.name}
                          </span>
                        </div>
                      </Card>
                    </div>
                  )}

                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Sub-units</p>
                    {getChildBusinessUnits(viewUnit.id).length > 0 ? (
                      <div className="space-y-2">
                        {getChildBusinessUnits(viewUnit.id).map((child) => (
                          <Card key={child.id} className="p-3">
                            <div className="flex items-center justify-between">
                              <div className="flex flex-wrap items-center gap-2">
                                <Building2 className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">{child.name}</span>
                              </div>
                              <Badge
                                variant="outline"
                                className={criticalityColors[child.criticality]}
                              >
                                {child.criticality}
                              </Badge>
                            </div>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No sub-units</p>
                    )}
                  </div>
                </TabsContent>
              </Tabs>

              <div className="mt-6 flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => openEdit(viewUnit)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={() => {
                    setViewUnit(null)
                    setDeleteUnit(viewUnit)
                  }}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteUnit} onOpenChange={(open) => !open && setDeleteUnit(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Business Unit?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleteUnit?.name}&quot;? This action cannot be
              undone.
              {getChildBusinessUnits(deleteUnit?.id || '').length > 0 && (
                <span className="block mt-2 text-destructive">
                  Warning: This unit has sub-units that will also be affected.
                </span>
              )}
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
