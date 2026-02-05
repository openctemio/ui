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
import {
  Plus,
  Download,
  Filter,
  MoreHorizontal,
  Eye,
  Pencil,
  Trash2,
  Crown,
  AlertTriangle,
  Lock,
  Database,
  Server,
  AppWindow,
  HardDrive,
  Lightbulb,
  DollarSign,
  Users,
  Mail,
  Link2,
  X,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  Clock,
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
  mockCrownJewels,
  getDependencies,
  type CrownJewel,
  type AssetCategory,
  type ProtectionLevel,
  type DataClassification,
  type JewelStatus,
} from '@/features/crown-jewels'

const statusColors: Record<JewelStatus, string> = {
  protected: 'bg-green-500/10 text-green-500 border-green-500/20',
  at_risk: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  exposed: 'bg-red-500/10 text-red-500 border-red-500/20',
  under_review: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
}

const statusIcons: Record<JewelStatus, React.ElementType> = {
  protected: ShieldCheck,
  at_risk: ShieldAlert,
  exposed: ShieldX,
  under_review: Clock,
}

const protectionColors: Record<ProtectionLevel, string> = {
  maximum: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  high: 'bg-red-500/10 text-red-500 border-red-500/20',
  standard: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  basic: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
}

const classificationColors: Record<DataClassification, string> = {
  top_secret: 'bg-red-500/10 text-red-500 border-red-500/20',
  confidential: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  internal: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  public: 'bg-green-500/10 text-green-500 border-green-500/20',
}

const categoryIcons: Record<AssetCategory, React.ElementType> = {
  data: Database,
  system: Server,
  application: AppWindow,
  infrastructure: HardDrive,
  intellectual_property: Lightbulb,
  financial: DollarSign,
}

const categoryLabels: Record<AssetCategory, string> = {
  data: 'Data',
  system: 'System',
  application: 'Application',
  infrastructure: 'Infrastructure',
  intellectual_property: 'IP',
  financial: 'Financial',
}

export default function CrownJewelsPage() {
  const [crownJewels, setCrownJewels] = useState<CrownJewel[]>(mockCrownJewels)
  const [viewJewel, setViewJewel] = useState<CrownJewel | null>(null)
  const [editJewel, setEditJewel] = useState<CrownJewel | null>(null)
  const [deleteJewel, setDeleteJewel] = useState<CrownJewel | null>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterCategory, setFilterCategory] = useState<string>('all')

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'data' as AssetCategory,
    protectionLevel: 'high' as ProtectionLevel,
    dataClassification: 'confidential' as DataClassification,
    businessImpact: '',
    owner: '',
    ownerEmail: '',
    businessUnit: '',
    tags: '',
  })

  const stats = useMemo(() => {
    const jewels = crownJewels
    return {
      total: jewels.length,
      byStatus: {
        protected: jewels.filter((j) => j.status === 'protected').length,
        at_risk: jewels.filter((j) => j.status === 'at_risk').length,
        exposed: jewels.filter((j) => j.status === 'exposed').length,
        under_review: jewels.filter((j) => j.status === 'under_review').length,
      },
      totalExposures: jewels.reduce((acc, j) => acc + j.exposureCount, 0),
      averageRiskScore: Math.round(jewels.reduce((acc, j) => acc + j.riskScore, 0) / jewels.length),
    }
  }, [crownJewels])

  const filteredJewels = useMemo(() => {
    return crownJewels.filter((jewel) => {
      if (filterStatus !== 'all' && jewel.status !== filterStatus) return false
      if (filterCategory !== 'all' && jewel.category !== filterCategory) return false
      return true
    })
  }, [crownJewels, filterStatus, filterCategory])

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category: 'data',
      protectionLevel: 'high',
      dataClassification: 'confidential',
      businessImpact: '',
      owner: '',
      ownerEmail: '',
      businessUnit: '',
      tags: '',
    })
  }

  const handleCreate = () => {
    if (
      !formData.name ||
      !formData.businessImpact ||
      !formData.owner ||
      !formData.ownerEmail ||
      !formData.businessUnit
    ) {
      toast.error('Please fill in all required fields')
      return
    }
    const newJewel: CrownJewel = {
      id: `cj-${Date.now()}`,
      name: formData.name,
      description: formData.description || undefined,
      category: formData.category,
      protectionLevel: formData.protectionLevel,
      dataClassification: formData.dataClassification,
      status: 'under_review',
      businessImpact: formData.businessImpact,
      owner: formData.owner,
      ownerEmail: formData.ownerEmail,
      businessUnit: formData.businessUnit,
      riskScore: 50,
      exposureCount: 0,
      dependencyCount: 0,
      lastAssessed: new Date().toISOString(),
      tags: formData.tags ? formData.tags.split(',').map((t) => t.trim()) : [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    setCrownJewels((prev) => [...prev, newJewel])
    toast.success('Crown jewel added successfully')
    setIsCreateOpen(false)
    resetForm()
  }

  const handleEdit = () => {
    if (
      !editJewel ||
      !formData.name ||
      !formData.businessImpact ||
      !formData.owner ||
      !formData.ownerEmail
    ) {
      toast.error('Please fill in all required fields')
      return
    }
    setCrownJewels((prev) =>
      prev.map((jewel) =>
        jewel.id === editJewel.id
          ? {
              ...jewel,
              name: formData.name,
              description: formData.description || undefined,
              category: formData.category,
              protectionLevel: formData.protectionLevel,
              dataClassification: formData.dataClassification,
              businessImpact: formData.businessImpact,
              owner: formData.owner,
              ownerEmail: formData.ownerEmail,
              businessUnit: formData.businessUnit,
              tags: formData.tags ? formData.tags.split(',').map((t) => t.trim()) : [],
              updatedAt: new Date().toISOString(),
            }
          : jewel
      )
    )
    toast.success('Crown jewel updated successfully')
    setEditJewel(null)
    resetForm()
  }

  const handleDelete = () => {
    if (!deleteJewel) return
    setCrownJewels((prev) => prev.filter((jewel) => jewel.id !== deleteJewel.id))
    toast.success('Crown jewel removed successfully')
    setDeleteJewel(null)
  }

  const openEdit = (jewel: CrownJewel) => {
    setFormData({
      name: jewel.name,
      description: jewel.description || '',
      category: jewel.category,
      protectionLevel: jewel.protectionLevel,
      dataClassification: jewel.dataClassification,
      businessImpact: jewel.businessImpact,
      owner: jewel.owner,
      ownerEmail: jewel.ownerEmail,
      businessUnit: jewel.businessUnit,
      tags: jewel.tags.join(', '),
    })
    setEditJewel(jewel)
  }

  const columns: ColumnDef<CrownJewel>[] = [
    {
      accessorKey: 'name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Crown Jewel" />,
      cell: ({ row }) => {
        const jewel = row.original
        const CategoryIcon = categoryIcons[jewel.category]
        return (
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
              <CategoryIcon className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <div className="font-medium flex items-center gap-2">
                {jewel.name}
                <Crown className="h-3 w-3 text-amber-500" />
              </div>
              <div className="text-xs text-muted-foreground">
                {categoryLabels[jewel.category]} | {jewel.businessUnit}
              </div>
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: 'status',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      cell: ({ row }) => {
        const status = row.original.status
        const StatusIcon = statusIcons[status]
        return (
          <Badge variant="outline" className={statusColors[status]}>
            <StatusIcon className="mr-1 h-3 w-3" />
            {status.replace('_', ' ')}
          </Badge>
        )
      },
    },
    {
      accessorKey: 'protectionLevel',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Protection" />,
      cell: ({ row }) => (
        <Badge variant="outline" className={protectionColors[row.original.protectionLevel]}>
          <Lock className="mr-1 h-3 w-3" />
          {row.original.protectionLevel}
        </Badge>
      ),
    },
    {
      accessorKey: 'dataClassification',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Classification" />,
      cell: ({ row }) => (
        <Badge variant="outline" className={classificationColors[row.original.dataClassification]}>
          {row.original.dataClassification.replace('_', ' ')}
        </Badge>
      ),
    },
    {
      accessorKey: 'riskScore',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Risk Score" />,
      cell: ({ row }) => <RiskScoreBadge score={row.original.riskScore} />,
    },
    {
      accessorKey: 'exposureCount',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Exposures" />,
      cell: ({ row }) => {
        const count = row.original.exposureCount
        return (
          <span className={count > 0 ? 'text-red-500 font-medium' : 'text-muted-foreground'}>
            {count}
          </span>
        )
      },
    },
    {
      accessorKey: 'owner',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Owner" />,
      cell: ({ row }) => (
        <div className="text-sm">
          <div className="font-medium">{row.original.owner}</div>
        </div>
      ),
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const jewel = row.original
        return (
          <Can permission={[Permission.ScopeWrite, Permission.ScopeDelete]}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setViewJewel(jewel)}>
                  <Eye className="mr-2 h-4 w-4" />
                  View Details
                </DropdownMenuItem>
                <Can permission={Permission.ScopeWrite}>
                  <DropdownMenuItem onClick={() => openEdit(jewel)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                </Can>
                <Can permission={Permission.ScopeDelete}>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setDeleteJewel(jewel)}
                    className="text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Remove
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
    <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Name *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., Customer Database"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="category">Category *</Label>
          <Select
            value={formData.category}
            onValueChange={(value) =>
              setFormData({ ...formData, category: value as AssetCategory })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="data">Data</SelectItem>
              <SelectItem value="system">System</SelectItem>
              <SelectItem value="application">Application</SelectItem>
              <SelectItem value="infrastructure">Infrastructure</SelectItem>
              <SelectItem value="intellectual_property">Intellectual Property</SelectItem>
              <SelectItem value="financial">Financial</SelectItem>
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
          placeholder="Describe what this critical asset is..."
          rows={2}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="protectionLevel">Protection Level *</Label>
          <Select
            value={formData.protectionLevel}
            onValueChange={(value) =>
              setFormData({ ...formData, protectionLevel: value as ProtectionLevel })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="maximum">Maximum</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="standard">Standard</SelectItem>
              <SelectItem value="basic">Basic</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="dataClassification">Data Classification *</Label>
          <Select
            value={formData.dataClassification}
            onValueChange={(value) =>
              setFormData({ ...formData, dataClassification: value as DataClassification })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="top_secret">Top Secret</SelectItem>
              <SelectItem value="confidential">Confidential</SelectItem>
              <SelectItem value="internal">Internal</SelectItem>
              <SelectItem value="public">Public</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="businessImpact">Business Impact *</Label>
        <Textarea
          id="businessImpact"
          value={formData.businessImpact}
          onChange={(e) => setFormData({ ...formData, businessImpact: e.target.value })}
          placeholder="Describe the impact if this asset is compromised..."
          rows={2}
        />
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

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="businessUnit">Business Unit *</Label>
          <Input
            id="businessUnit"
            value={formData.businessUnit}
            onChange={(e) => setFormData({ ...formData, businessUnit: e.target.value })}
            placeholder="e.g., Technology & Engineering"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="tags">Tags</Label>
          <Input
            id="tags"
            value={formData.tags}
            onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
            placeholder="Comma-separated, e.g., pii, gdpr"
          />
        </div>
      </div>
    </div>
  )

  return (
    <>
      <Main>
        <PageHeader
          title="Crown Jewels"
          description="Identify and protect your most critical assets"
        >
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Can permission={Permission.ScopeWrite}>
            <Button size="sm" onClick={() => setIsCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Crown Jewel
            </Button>
          </Can>
        </PageHeader>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Jewels</CardTitle>
              <Crown className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">{stats.byStatus.protected} protected</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">At Risk</CardTitle>
              <ShieldAlert className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-500">{stats.byStatus.at_risk}</div>
              <p className="text-xs text-muted-foreground">Needs attention</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Exposed</CardTitle>
              <ShieldX className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">{stats.byStatus.exposed}</div>
              <p className="text-xs text-muted-foreground">
                {stats.totalExposures} total exposures
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Avg Risk Score</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.averageRiskScore}</div>
              <p className="text-xs text-muted-foreground">Across all jewels</p>
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
                <Label className="text-sm">Status:</Label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="protected">Protected</SelectItem>
                    <SelectItem value="at_risk">At Risk</SelectItem>
                    <SelectItem value="exposed">Exposed</SelectItem>
                    <SelectItem value="under_review">Under Review</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Label className="text-sm">Category:</Label>
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="data">Data</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                    <SelectItem value="application">Application</SelectItem>
                    <SelectItem value="infrastructure">Infrastructure</SelectItem>
                    <SelectItem value="intellectual_property">IP</SelectItem>
                    <SelectItem value="financial">Financial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {(filterStatus !== 'all' || filterCategory !== 'all') && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setFilterStatus('all')
                    setFilterCategory('all')
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
            <CardTitle>Crown Jewels</CardTitle>
            <CardDescription>
              {filteredJewels.length} of {crownJewels.length} critical assets
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={columns}
              data={filteredJewels}
              searchPlaceholder="Search crown jewels..."
              searchKey="name"
              onRowClick={(jewel) => setViewJewel(jewel)}
            />
          </CardContent>
        </Card>
      </Main>

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Crown Jewel</DialogTitle>
            <DialogDescription>
              Identify a critical asset that requires special protection
            </DialogDescription>
          </DialogHeader>
          {formFields}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editJewel} onOpenChange={(open) => !open && setEditJewel(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Crown Jewel</DialogTitle>
            <DialogDescription>Update critical asset details</DialogDescription>
          </DialogHeader>
          {formFields}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditJewel(null)}>
              Cancel
            </Button>
            <Button onClick={handleEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Sheet */}
      <Sheet open={!!viewJewel} onOpenChange={(open) => !open && setViewJewel(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          {viewJewel && (
            <>
              <SheetHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10">
                    <Crown className="h-6 w-6 text-amber-500" />
                  </div>
                  <div>
                    <SheetTitle>{viewJewel.name}</SheetTitle>
                    <SheetDescription>{viewJewel.description}</SheetDescription>
                  </div>
                </div>
              </SheetHeader>

              <Tabs defaultValue="overview" className="mt-6">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="dependencies">Dependencies</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Status</p>
                      <Badge variant="outline" className={statusColors[viewJewel.status]}>
                        {viewJewel.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Protection Level</p>
                      <Badge
                        variant="outline"
                        className={protectionColors[viewJewel.protectionLevel]}
                      >
                        {viewJewel.protectionLevel}
                      </Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Category</p>
                      <Badge variant="secondary">{categoryLabels[viewJewel.category]}</Badge>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Classification</p>
                      <Badge
                        variant="outline"
                        className={classificationColors[viewJewel.dataClassification]}
                      >
                        {viewJewel.dataClassification.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Risk Score</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <RiskScoreBadge score={viewJewel.riskScore} />
                    </CardContent>
                  </Card>

                  <div className="grid grid-cols-2 gap-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Exposures</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div
                          className={`text-2xl font-bold ${viewJewel.exposureCount > 0 ? 'text-red-500' : ''}`}
                        >
                          {viewJewel.exposureCount}
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Dependencies</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{viewJewel.dependencyCount}</div>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Business Impact</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm">{viewJewel.businessImpact}</p>
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
                          <p className="font-medium">{viewJewel.owner}</p>
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {viewJewel.ownerEmail}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {viewJewel.tags.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Tags</p>
                      <div className="flex flex-wrap gap-2">
                        {viewJewel.tags.map((tag) => (
                          <Badge key={tag} variant="secondary">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="dependencies" className="mt-4">
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Assets that this crown jewel depends on or is connected to.
                    </p>
                    {getDependencies(viewJewel.id).length > 0 ? (
                      <div className="space-y-2">
                        {getDependencies(viewJewel.id).map((dep) => (
                          <Card key={dep.id} className="p-3">
                            <div className="flex items-center justify-between">
                              <div className="flex flex-wrap items-center gap-2">
                                <Link2 className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">{dep.dependsOnName}</span>
                              </div>
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge variant="outline">{dep.dependencyType}</Badge>
                                <Badge
                                  variant="outline"
                                  className={
                                    dep.criticality === 'critical'
                                      ? 'bg-red-500/10 text-red-500'
                                      : dep.criticality === 'high'
                                        ? 'bg-orange-500/10 text-orange-500'
                                        : ''
                                  }
                                >
                                  {dep.criticality}
                                </Badge>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No dependencies mapped yet.</p>
                    )}
                  </div>
                </TabsContent>
              </Tabs>

              <div className="mt-6 flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => openEdit(viewJewel)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={() => {
                    setViewJewel(null)
                    setDeleteJewel(viewJewel)
                  }}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Remove
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteJewel} onOpenChange={(open) => !open && setDeleteJewel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Crown Jewel?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove &quot;{deleteJewel?.name}&quot; from your crown
              jewels? This will remove tracking and protection requirements.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
