'use client'

import { useState, useMemo, useEffect } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { Main } from '@/components/layout'
import { PageHeader, DataTable, DataTableColumnHeader } from '@/features/shared'
import { Can, Permission } from '@/lib/permissions'
import { useCsvExport, type ExportFieldConfig } from '@/hooks/use-csv-export'
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
  getDependencies,
  type CrownJewel,
  type AssetCategory,
  type ProtectionLevel,
  type DataClassification,
} from '@/features/crown-jewels'
import {
  useCrownJewels,
  useAllAssets,
  useDesignateCrownJewel,
  useUndesignateCrownJewel,
} from '@/features/crown-jewels/api/use-crown-jewels'
import { mutate } from 'swr'

const categoryIcons: Record<AssetCategory, React.ElementType> = {
  data: Database,
  system: Server,
  application: AppWindow,
  infrastructure: HardDrive,
  intellectual_property: Lightbulb,
  financial: DollarSign,
}

const CROWN_JEWELS_KEY = '/api/v1/assets?is_crown_jewel=true&per_page=100'

const CROWN_JEWEL_EXPORT_FIELDS: ExportFieldConfig<CrownJewel>[] = [
  { header: 'Name', accessor: (j) => j.name },
  { header: 'Category', accessor: (j) => j.category },
  { header: 'Description', accessor: (j) => j.description ?? '' },
  { header: 'Status', accessor: (j) => j.status },
  { header: 'Owner', accessor: (j) => j.owner },
  { header: 'Business Unit', accessor: (j) => j.businessUnit },
  { header: 'Risk Score', accessor: (j) => j.riskScore },
  { header: 'Exposures', accessor: (j) => j.exposureCount ?? 0 },
  { header: 'Tags', accessor: (j) => (j.tags ?? []).join('; ') },
]

// Risk band → color + label (mirrors the asset risk_score 0-100 scale).
function riskBand(score: number) {
  if (score >= 70)
    return { text: 'text-red-600', bar: 'bg-red-600', dot: 'bg-red-600', label: 'Critical' }
  if (score >= 40)
    return { text: 'text-orange-600', bar: 'bg-orange-500', dot: 'bg-orange-500', label: 'High' }
  if (score >= 20)
    return { text: 'text-amber-600', bar: 'bg-amber-500', dot: 'bg-amber-500', label: 'Medium' }
  return { text: 'text-green-600', bar: 'bg-green-600', dot: 'bg-green-600', label: 'Low' }
}

// Real reachability → exposed vs not (drives the "Exposure" signal).
function isExposed(j: CrownJewel) {
  return Boolean(j.isInternetAccessible) || j.exposure === 'internet' || j.exposure === 'external'
}

// Compact findings-by-severity chips (only non-zero bands).
function SeverityChips({ sev }: { sev?: CrownJewel['findingSeverity'] }) {
  if (!sev) return <span className="text-muted-foreground text-xs">—</span>
  const parts: { n: number; cls: string; k: string }[] = [
    { n: sev.critical, cls: 'bg-red-600', k: 'C' },
    { n: sev.high, cls: 'bg-orange-500', k: 'H' },
    { n: sev.medium, cls: 'bg-amber-500', k: 'M' },
    { n: sev.low, cls: 'bg-slate-500', k: 'L' },
  ].filter((p) => p.n > 0)
  if (parts.length === 0) return <span className="text-muted-foreground text-xs">None</span>
  return (
    <span className="inline-flex items-center gap-1">
      {parts.map((p) => (
        <span
          key={p.k}
          className={`rounded px-1.5 py-0.5 text-[10px] font-bold text-white ${p.cls}`}
        >
          {p.n}
          {p.k}
        </span>
      ))}
    </span>
  )
}

export default function CrownJewelsPage() {
  // Fetch from API, fallback to mock if no API data
  const { data: apiCrownJewels } = useCrownJewels()
  const { trigger: designate, isMutating: isDesignating } = useDesignateCrownJewel()
  const { trigger: undesignate, isMutating: isUndesignating } = useUndesignateCrownJewel()

  // Asset search for the "designate" create dialog
  const [assetSearch, setAssetSearch] = useState('')
  const [selectedAssetId, setSelectedAssetId] = useState<string>('')
  const { data: allAssets } = useAllAssets(assetSearch)
  const apiMapped: CrownJewel[] = useMemo(() => {
    if (!apiCrownJewels?.data?.length) return []
    return apiCrownJewels.data.map((a: Record<string, unknown>) => {
      const props = (a.properties as Record<string, unknown>) || {}
      const sev = (a.finding_severity_counts as Record<string, number>) || {}
      const owner = a.primary_owner as { name?: string; email?: string } | undefined
      const biz = Number(props.business_impact_score ?? 0)
      const cls = (a.data_classification as string) || ''
      return {
        id: a.id,
        name: a.name,
        description: (a.description as string) || '',
        // Real fields from the assets API.
        assetType: (a.type as string) || 'asset',
        riskScore: (a.risk_score as number) || 0,
        businessImpactScore: biz,
        findingCount: (a.finding_count as number) || 0,
        findingSeverity: {
          critical: sev.critical || 0,
          high: sev.high || 0,
          medium: sev.medium || 0,
          low: sev.low || 0,
        },
        exposure: (a.exposure as string) || 'unknown',
        isInternetAccessible: Boolean(a.is_internet_accessible),
        criticality: (a.criticality as string) || '',
        dataClassification: (cls || 'internal') as DataClassification,
        piiExposed: Boolean(a.pii_data_exposed),
        phiExposed: Boolean(a.phi_data_exposed),
        owner: owner?.name || (a.owner_ref as string) || 'Unassigned',
        ownerEmail: owner?.email || '',
        tags: (a.tags as string[]) || [],
        exposureCount: (a.exposure_count as number) || 0,
        dependencyCount: 0,
        createdAt: (a.created_at as string) || '',
        lastAssessed: (a.updated_at as string) || '',
        updatedAt: (a.updated_at as string) || '',
      } as unknown as CrownJewel
    })
  }, [apiCrownJewels])
  const [crownJewels, setCrownJewels] = useState<CrownJewel[]>([])
  const { handleExport } = useCsvExport(crownJewels, CROWN_JEWEL_EXPORT_FIELDS, 'crown-jewels')
  useEffect(() => {
    setCrownJewels(apiMapped)
  }, [apiMapped])
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
      totalExposures: jewels.reduce((acc, j) => acc + (j.exposureCount ?? 0), 0),
      // Guard against divide-by-zero on an empty tenant (was rendering "NaN").
      averageRiskScore: jewels.length
        ? Math.round(jewels.reduce((acc, j) => acc + (j.riskScore ?? 0), 0) / jewels.length)
        : 0,
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

  const handleCreate = async () => {
    if (!selectedAssetId) {
      toast.error('Please select an asset to designate as a Crown Jewel')
      return
    }
    if (!formData.businessImpact) {
      toast.error('Please provide a business impact description')
      return
    }
    try {
      await designate({
        assetId: selectedAssetId,
        businessImpactScore: 75,
        businessImpactNotes: formData.businessImpact,
      })
      await mutate(CROWN_JEWELS_KEY)
      toast.success('Asset designated as Crown Jewel')
      setIsCreateOpen(false)
      setSelectedAssetId('')
      setAssetSearch('')
      resetForm()
    } catch {
      toast.error('Failed to designate Crown Jewel')
    }
  }

  const handleEdit = async () => {
    if (!editJewel || !formData.businessImpact) {
      toast.error('Please fill in all required fields')
      return
    }
    try {
      await designate({
        assetId: editJewel.id as string,
        businessImpactScore: 75,
        businessImpactNotes: formData.businessImpact,
      })
      await mutate(CROWN_JEWELS_KEY)
      toast.success('Crown jewel updated successfully')
      setEditJewel(null)
      resetForm()
    } catch {
      toast.error('Failed to update Crown Jewel')
    }
  }

  const handleDelete = async () => {
    if (!deleteJewel) return
    try {
      await undesignate({ assetId: deleteJewel.id as string })
      await mutate(CROWN_JEWELS_KEY)
      toast.success('Crown jewel removed successfully')
      setDeleteJewel(null)
    } catch {
      toast.error('Failed to remove Crown Jewel')
    }
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
      header: ({ column }) => <DataTableColumnHeader column={column} title="Asset" />,
      cell: ({ row }) => {
        const jewel = row.original
        // Icon by real asset category when known, else a neutral default —
        // never render an undefined element.
        const CategoryIcon = categoryIcons[jewel.category] ?? Database
        return (
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10">
              <CategoryIcon className="h-5 w-5 text-amber-500" />
            </div>
            <div className="min-w-0">
              <div className="font-medium flex items-center gap-1.5">
                <span className="truncate font-mono text-[13px]">{jewel.name}</span>
                <Crown className="h-3 w-3 shrink-0 text-amber-500" />
              </div>
              <div className="text-xs text-muted-foreground capitalize">
                {jewel.assetType ?? 'asset'}
                {jewel.criticality ? ` · ${jewel.criticality}` : ''}
              </div>
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: 'riskScore',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Risk" />,
      cell: ({ row }) => {
        const s = row.original.riskScore
        const band = riskBand(s)
        return (
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 font-semibold tabular-nums ${band.text}`}
            >
              <span className={`h-2 w-2 rounded-full ${band.dot}`} />
              {s}
            </span>
            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
              <div className={`h-full rounded-full ${band.bar}`} style={{ width: `${s}%` }} />
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: 'businessImpactScore',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Business impact" />,
      cell: ({ row }) => {
        const b = row.original.businessImpactScore ?? 0
        return (
          <div className="flex items-center gap-2">
            <span className="font-semibold tabular-nums text-amber-600">
              {b}
              <span className="text-muted-foreground text-xs font-normal">/100</span>
            </span>
            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-amber-500" style={{ width: `${b}%` }} />
            </div>
          </div>
        )
      },
    },
    {
      id: 'findings',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Findings" />,
      cell: ({ row }) => <SeverityChips sev={row.original.findingSeverity} />,
    },
    {
      id: 'exposure',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Exposure" />,
      cell: ({ row }) => {
        const exposed = isExposed(row.original)
        return exposed ? (
          <Badge variant="outline" className="border-red-300 bg-red-500/5 text-red-600">
            <ShieldX className="me-1 h-3 w-3" />
            Internet-exposed
          </Badge>
        ) : (
          <Badge variant="outline" className="border-green-300 bg-green-500/5 text-green-600">
            <ShieldCheck className="me-1 h-3 w-3" />
            Not exposed
          </Badge>
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
                  <Eye className="me-2 h-4 w-4" />
                  View Details
                </DropdownMenuItem>
                <Can permission={Permission.ScopeWrite}>
                  <DropdownMenuItem onClick={() => openEdit(jewel)}>
                    <Pencil className="me-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                </Can>
                <Can permission={Permission.ScopeDelete}>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setDeleteJewel(jewel)}
                    className="text-destructive"
                  >
                    <Trash2 className="me-2 h-4 w-4" />
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

  return (
    <>
      <Main>
        <PageHeader
          title="Crown Jewels"
          description="Identify and protect your most critical assets"
        >
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={crownJewels.length === 0}
          >
            <Download className="me-2 h-4 w-4" />
            Export
          </Button>
          <Can permission={Permission.ScopeWrite}>
            <Button size="sm" onClick={() => setIsCreateOpen(true)}>
              <Plus className="me-2 h-4 w-4" />
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
                  <X className="me-1 h-3 w-3" />
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
      <Dialog
        open={isCreateOpen}
        onOpenChange={(open) => {
          setIsCreateOpen(open)
          if (!open) {
            setSelectedAssetId('')
            setAssetSearch('')
            resetForm()
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Designate Crown Jewel</DialogTitle>
            <DialogDescription>
              Select an existing asset to designate as a Crown Jewel requiring special protection
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="asset-search">Search Asset *</Label>
              <Input
                id="asset-search"
                value={assetSearch}
                onChange={(e) => {
                  setAssetSearch(e.target.value)
                  setSelectedAssetId('')
                }}
                placeholder="Type to search assets..."
              />
              {allAssets?.data && allAssets.data.length > 0 && (
                <div className="border rounded-md max-h-64 overflow-y-auto overscroll-contain">
                  {allAssets.data.map((a) => (
                    <button
                      key={a.id as string}
                      type="button"
                      className={`w-full text-start px-3 py-2 text-sm hover:bg-muted transition-colors ${
                        selectedAssetId === a.id ? 'bg-muted font-medium' : ''
                      }`}
                      onClick={() => {
                        setSelectedAssetId(a.id as string)
                        setAssetSearch(a.name as string)
                      }}
                    >
                      <span className="font-medium">{a.name as string}</span>
                      {(a.type as string | undefined) && (
                        <span className="ms-2 text-xs text-muted-foreground">
                          {a.type as string}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
              {selectedAssetId && (
                <p className="text-xs text-green-600">Asset selected: {assetSearch}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="businessImpact">Business Impact Notes *</Label>
              <Textarea
                id="businessImpact"
                value={formData.businessImpact}
                onChange={(e) => setFormData({ ...formData, businessImpact: e.target.value })}
                placeholder="Describe the impact if this asset is compromised..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={isDesignating}>
              {isDesignating ? 'Designating...' : 'Designate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog
        open={!!editJewel}
        onOpenChange={(open) => {
          if (!open) {
            setEditJewel(null)
            resetForm()
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Crown Jewel</DialogTitle>
            <DialogDescription>
              Update business impact notes for {editJewel?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-businessImpact">Business Impact Notes *</Label>
              <Textarea
                id="edit-businessImpact"
                value={formData.businessImpact}
                onChange={(e) => setFormData({ ...formData, businessImpact: e.target.value })}
                placeholder="Describe the impact if this asset is compromised..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditJewel(null)}>
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={isDesignating}>
              {isDesignating ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Sheet */}
      <Sheet open={!!viewJewel} onOpenChange={(open) => !open && setViewJewel(null)}>
        <SheetContent className="w-full overflow-x-hidden overflow-y-auto sm:max-w-xl">
          {viewJewel && (
            <>
              <SheetHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10">
                    <Crown className="h-6 w-6 text-amber-500" />
                  </div>
                  <div className="min-w-0">
                    <SheetTitle className="break-all font-mono text-base">
                      {viewJewel.name}
                    </SheetTitle>
                    <SheetDescription className="capitalize">
                      {viewJewel.assetType ?? 'asset'}
                      {viewJewel.description ? ` · ${viewJewel.description}` : ''}
                    </SheetDescription>
                  </div>
                </div>
              </SheetHeader>

              <Tabs defaultValue="overview" className="mt-6 px-4">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="dependencies">Dependencies</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4 mt-4">
                  {/* The three things that actually matter for a crown jewel. */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-lg border p-3 text-center">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Risk
                      </p>
                      <p
                        className={`mt-1 text-2xl font-bold tabular-nums ${riskBand(viewJewel.riskScore).text}`}
                      >
                        {viewJewel.riskScore}
                      </p>
                      <p className={`text-xs font-semibold ${riskBand(viewJewel.riskScore).text}`}>
                        {riskBand(viewJewel.riskScore).label}
                      </p>
                    </div>
                    <div className="rounded-lg border border-amber-200 bg-amber-500/5 p-3 text-center">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Business impact
                      </p>
                      <p className="mt-1 text-2xl font-bold tabular-nums text-amber-600">
                        {viewJewel.businessImpactScore ?? 0}
                      </p>
                      <p className="text-xs font-semibold text-amber-600">
                        {(viewJewel.businessImpactScore ?? 0) >= 67
                          ? 'High'
                          : (viewJewel.businessImpactScore ?? 0) >= 34
                            ? 'Medium'
                            : 'Low'}
                      </p>
                    </div>
                    <div className="rounded-lg border p-3 text-center">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Exposure
                      </p>
                      <p
                        className={`mt-1 flex justify-center ${isExposed(viewJewel) ? 'text-red-600' : 'text-green-600'}`}
                      >
                        {isExposed(viewJewel) ? (
                          <ShieldX className="h-7 w-7" />
                        ) : (
                          <ShieldCheck className="h-7 w-7" />
                        )}
                      </p>
                      <p
                        className={`text-xs font-semibold ${isExposed(viewJewel) ? 'text-red-600' : 'text-green-600'}`}
                      >
                        {isExposed(viewJewel) ? 'Exposed' : 'Not exposed'}
                      </p>
                    </div>
                  </div>

                  {/* Why it's a crown jewel — one honest sentence. */}
                  <div className="rounded-lg border border-amber-200 bg-amber-500/5 p-3 text-sm leading-relaxed">
                    <span className="font-medium">Why it&apos;s critical: </span>
                    compromise would have{' '}
                    {(viewJewel.businessImpactScore ?? 0) >= 67
                      ? 'high'
                      : (viewJewel.businessImpactScore ?? 0) >= 34
                        ? 'moderate'
                        : 'limited'}{' '}
                    business impact ({viewJewel.businessImpactScore ?? 0}/100)
                    {viewJewel.piiExposed ? ' and it handles PII' : ''}.{' '}
                    {isExposed(viewJewel)
                      ? 'It is reachable from the internet — reducing its exposure is the priority.'
                      : 'It is not internet-reachable, which keeps its risk contained.'}
                  </div>

                  {/* Open findings by severity — real signal, not an empty card. */}
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Open findings
                    </p>
                    {(viewJewel.findingCount ?? 0) > 0 ? (
                      <div className="flex items-center gap-3">
                        <SeverityChips sev={viewJewel.findingSeverity} />
                        <span className="text-sm text-muted-foreground">
                          {viewJewel.findingCount} total
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-500/5 px-3 py-2 text-sm text-green-700">
                        <ShieldCheck className="h-4 w-4" /> No open findings on this asset.
                      </div>
                    )}
                  </div>

                  {/* Reachability — honest empty/real state. */}
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Reachability
                    </p>
                    {isExposed(viewJewel) ? (
                      <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-500/5 px-3 py-2 text-sm text-red-700">
                        <ShieldX className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>
                          Reachable from the internet ({viewJewel.exposure}). This drives its risk —
                          review attack paths in Exposure Chains.
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-start gap-2 rounded-lg border border-green-200 bg-green-500/5 px-3 py-2 text-sm text-green-700">
                        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>
                          Not reachable from the internet — no public attack path reaches this
                          asset.
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Details — only real, populated fields. */}
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Details
                    </p>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Type</span>
                        <span className="font-medium capitalize">
                          {viewJewel.assetType ?? 'asset'}
                        </span>
                      </div>
                      {viewJewel.criticality && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Criticality</span>
                          <span className="font-medium capitalize">{viewJewel.criticality}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Data classification</span>
                        <span className="font-medium capitalize">
                          {viewJewel.dataClassification.replace('_', ' ')}
                        </span>
                      </div>
                      {(viewJewel.piiExposed || viewJewel.phiExposed) && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Sensitive data</span>
                          <span className="font-medium text-amber-600">
                            {[viewJewel.piiExposed && 'PII', viewJewel.phiExposed && 'PHI']
                              .filter(Boolean)
                              .join(', ')}
                          </span>
                        </div>
                      )}
                      {viewJewel.lastAssessed && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Last assessed</span>
                          <span className="font-medium">
                            {new Date(viewJewel.lastAssessed).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Owner */}
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Owner
                    </p>
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
                        <Users className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium">{viewJewel.owner}</p>
                        {viewJewel.ownerEmail ? (
                          <p className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            {viewJewel.ownerEmail}
                          </p>
                        ) : (
                          <p className="text-xs text-muted-foreground">
                            Assign an owner so alerts route correctly
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {viewJewel.tags.length > 0 && (
                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Tags
                      </p>
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

              <div className="mt-6 flex gap-2 px-4 pb-4">
                <Button variant="outline" className="flex-1" onClick={() => openEdit(viewJewel)}>
                  <Pencil className="me-2 h-4 w-4" />
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
                  <Trash2 className="me-2 h-4 w-4" />
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
              disabled={isUndesignating}
            >
              {isUndesignating ? 'Removing...' : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
