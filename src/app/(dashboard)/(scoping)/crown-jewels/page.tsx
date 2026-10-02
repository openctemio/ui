'use client'

import { useState, useMemo, useEffect } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { Main } from '@/components/layout'
import {
  DataTable,
  DataTableColumnHeader,
  DataTableRowActions,
  GatedSectionTabs,
  getRiskLevel,
  MetricStrip,
  PageHeader,
  RiskScoreBadge,
  SheetBody,
  type MetricStripItem,
} from '@/features/shared'
import { BUSINESS_CONTEXT_SECTION_TABS } from '@/config/section-tabs'
import { Can, Permission } from '@/lib/permissions'
import { useCsvExport, type ExportFieldConfig } from '@/hooks/use-csv-export'
import { useUrlFilter } from '@/hooks/use-url-param'
import { SEVERITY_BADGE_SOLID, type SeverityLevel } from '@/lib/severity-colors'
import { useRiskThresholds } from '@/context/risk-scoring-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Plus,
  Download,
  Search,
  Eye,
  Pencil,
  Trash2,
  Crown,
  Database,
  Server,
  AppWindow,
  HardDrive,
  Lightbulb,
  DollarSign,
  Users,
  Mail,
  Link2,
  ShieldCheck,
  ShieldX,
} from 'lucide-react'
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
import { ConfirmDialog } from '@/components/confirm-dialog'
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
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { CRITICALITY_BADGE_SOFT, type CriticalityLevel } from '@/lib/criticality-colors'

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

function impactLabel(score: number) {
  return score >= 67 ? 'High' : score >= 34 ? 'Medium' : 'Low'
}

// Real reachability → exposed vs not (drives the "Exposure" signal).
function isExposed(j: CrownJewel) {
  return Boolean(j.isInternetAccessible) || j.exposure === 'internet' || j.exposure === 'external'
}

// Compact findings-by-severity chips (only non-zero bands).
function SeverityChips({ sev }: { sev?: CrownJewel['findingSeverity'] }) {
  if (!sev) return <span className="text-muted-foreground text-xs">—</span>
  const parts: { n: number; level: SeverityLevel; k: string }[] = [
    { n: sev.critical, level: 'critical' as const, k: 'C' },
    { n: sev.high, level: 'high' as const, k: 'H' },
    { n: sev.medium, level: 'medium' as const, k: 'M' },
    { n: sev.low, level: 'low' as const, k: 'L' },
  ].filter((p) => p.n > 0)
  if (parts.length === 0) return <span className="text-muted-foreground text-xs">None</span>
  return (
    <span className="inline-flex items-center gap-1">
      {parts.map((p) => (
        <span
          key={p.k}
          title={`${p.n} ${p.level}`}
          className={cn(
            'rounded px-1.5 py-0.5 text-[10px] font-semibold tabular-nums',
            SEVERITY_BADGE_SOLID[p.level]
          )}
        >
          {p.n}
          {p.k}
        </span>
      ))}
    </span>
  )
}

export default function CrownJewelsPage() {
  // Same bands as RiskScoreBadge, so the sheet's label matches the table's badge.
  const riskThresholds = useRiskThresholds()
  const riskLabel = (score: number) => getRiskLevel(score, riskThresholds).label
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
  // Filters and search live in the URL so a filtered view can be linked to.
  // Exposure and asset type are what the assets API actually returns; the old
  // status/category filters matched fields it never sends, so they emptied the list.
  const [filterExposure, setFilterExposure] = useUrlFilter('exposure', 'all')
  const [filterType, setFilterType] = useUrlFilter('type', 'all')
  const [searchQuery, setSearchQuery] = useUrlFilter('q', '')

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
      exposed: jewels.filter(isExposed).length,
      withCritical: jewels.filter((j) => (j.findingSeverity?.critical ?? 0) > 0).length,
      // Guard against divide-by-zero on an empty tenant (was rendering "NaN").
      averageRiskScore: jewels.length
        ? Math.round(jewels.reduce((acc, j) => acc + (j.riskScore ?? 0), 0) / jewels.length)
        : 0,
    }
  }, [crownJewels])

  const assetTypes = useMemo(
    () => [...new Set(crownJewels.map((j) => j.assetType).filter(Boolean) as string[])].sort(),
    [crownJewels]
  )

  const filteredJewels = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return crownJewels.filter((jewel) => {
      if (filterExposure === 'exposed' && !isExposed(jewel)) return false
      if (filterExposure === 'not_exposed' && isExposed(jewel)) return false
      if (filterType !== 'all' && jewel.assetType !== filterType) return false
      if (q && !jewel.name.toLowerCase().includes(q) && !jewel.owner.toLowerCase().includes(q))
        return false
      return true
    })
  }, [crownJewels, filterExposure, filterType, searchQuery])

  const exposedOnly = filterExposure === 'exposed'
  const metrics: MetricStripItem[] = [
    {
      key: 'total',
      label: 'Crown jewels',
      value: stats.total,
      onClick: () => {
        setFilterExposure('all')
        setFilterType('all')
      },
      active: filterExposure === 'all' && filterType === 'all',
    },
    {
      key: 'exposed',
      label: 'Internet-exposed',
      value: stats.exposed,
      tone: 'danger',
      onClick: () => setFilterExposure(exposedOnly ? 'all' : 'exposed'),
      active: exposedOnly,
    },
    {
      key: 'critical',
      label: 'With critical findings',
      value: stats.withCritical,
      tone: 'danger',
    },
    { key: 'risk', label: 'Average risk score', value: stats.averageRiskScore, hint: 'of 100' },
  ]

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
      toast.error('Please select an asset to designate as a crown jewel')
      return
    }
    if (!formData.businessImpact) {
      toast.error('Please provide a business impact description')
      return
    }
    try {
      // Preserve the selected asset's existing business impact score instead of
      // clobbering it; the designate form only collects notes, not a score.
      const selectedAsset = allAssets?.data?.find((a) => a.id === selectedAssetId)
      const existingScore = Number(
        (selectedAsset?.properties as Record<string, unknown> | undefined)?.business_impact_score ??
          0
      )
      await designate({
        assetId: selectedAssetId,
        businessImpactScore: existingScore > 0 ? existingScore : 75,
        businessImpactNotes: formData.businessImpact,
      })
      await mutate(CROWN_JEWELS_KEY)
      toast.success('Asset designated as a crown jewel')
      setIsCreateOpen(false)
      setSelectedAssetId('')
      setAssetSearch('')
      resetForm()
    } catch {
      toast.error('Failed to designate crown jewel')
    }
  }

  const handleEdit = async () => {
    if (!editJewel || !formData.businessImpact) {
      toast.error('Please fill in all required fields')
      return
    }
    try {
      // Keep the asset's real business impact score; the edit form only lets the
      // user change notes, so it must not overwrite the stored score with a constant.
      await designate({
        assetId: editJewel.id as string,
        businessImpactScore: editJewel.businessImpactScore ?? 75,
        businessImpactNotes: formData.businessImpact,
      })
      await mutate(CROWN_JEWELS_KEY)
      toast.success('Crown jewel updated successfully')
      setEditJewel(null)
      resetForm()
    } catch {
      toast.error('Failed to update crown jewel')
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
      toast.error('Failed to remove crown jewel')
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
          <div className="flex min-w-0 items-center gap-2.5">
            <CategoryIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <div className="truncate font-medium">{jewel.name}</div>
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
      cell: ({ row }) => <RiskScoreBadge score={row.original.riskScore} size="sm" />,
    },
    {
      accessorKey: 'businessImpactScore',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Business impact" />,
      cell: ({ row }) => {
        const b = row.original.businessImpactScore ?? 0
        return (
          <div className="flex items-center gap-2">
            <span className="w-7 text-end font-medium tabular-nums">{b}</span>
            <Progress value={b} className="h-1.5 w-16" aria-label={`Business impact ${b} of 100`} />
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
          <Badge variant="outline" className="border-destructive/30 text-destructive">
            <ShieldX className="me-1 h-3 w-3" />
            Internet-exposed
          </Badge>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <ShieldCheck className="h-3 w-3" />
            Not exposed
          </span>
        )
      },
    },
    {
      accessorKey: 'owner',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Owner" />,
      cell: ({ row }) => (
        <span
          className={cn('text-sm', row.original.owner === 'Unassigned' && 'text-muted-foreground')}
        >
          {row.original.owner}
        </span>
      ),
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const jewel = row.original
        return (
          <Can permission={Permission.AssetsWrite}>
            <DataTableRowActions
              actions={[
                { label: 'View details', icon: Eye, onClick: () => setViewJewel(jewel) },
                {
                  label: 'Edit',
                  icon: Pencil,
                  onClick: () => openEdit(jewel),
                  permission: Permission.AssetsWrite,
                },
                {
                  label: 'Remove',
                  icon: Trash2,
                  onClick: () => setDeleteJewel(jewel),
                  destructive: true,
                  separatorBefore: true,
                  permission: Permission.AssetsWrite,
                },
              ]}
            />
          </Can>
        )
      },
    },
  ]

  return (
    <>
      <Main>
        <PageHeader
          title="Crown jewels"
          description="The assets whose compromise would hurt the business most."
        >
          <Can permission={Permission.AssetsWrite}>
            <Button size="sm" onClick={() => setIsCreateOpen(true)}>
              <Plus className="me-2 h-4 w-4" />
              Designate crown jewel
            </Button>
          </Can>
        </PageHeader>
        <GatedSectionTabs
          tabs={BUSINESS_CONTEXT_SECTION_TABS}
          label="Business context sections"
          className="mt-4 mb-0"
        />

        <MetricStrip className="mt-5" loading={!apiCrownJewels} items={metrics} />

        <div className="mt-5">
          <DataTable
            columns={columns}
            data={filteredJewels}
            showSearch={false}
            toolbarStart={
              <>
                <div className="relative min-w-0 flex-1 sm:max-w-xs">
                  <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search name or owner…"
                    aria-label="Search crown jewels"
                    className="h-9 ps-9"
                  />
                </div>
                <Select value={filterExposure} onValueChange={setFilterExposure}>
                  <SelectTrigger className="h-9 w-auto min-w-36" aria-label="Filter by exposure">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Any exposure</SelectItem>
                    <SelectItem value="exposed">Internet-exposed</SelectItem>
                    <SelectItem value="not_exposed">Not exposed</SelectItem>
                  </SelectContent>
                </Select>
                {assetTypes.length > 1 && (
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger
                      className="h-9 w-auto min-w-32"
                      aria-label="Filter by asset type"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All types</SelectItem>
                      {assetTypes.map((t) => (
                        <SelectItem key={t} value={t} className="capitalize">
                          {t.replace(/_/g, ' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </>
            }
            toolbarEnd={
              <Button
                variant="outline"
                size="sm"
                className="h-9"
                onClick={handleExport}
                disabled={crownJewels.length === 0}
              >
                <Download className="h-4 w-4 md:me-2" />
                <span className="hidden md:inline">Export</span>
              </Button>
            }
            emptyMessage={
              crownJewels.length === 0 ? 'No crown jewels yet' : 'No crown jewels match'
            }
            emptyDescription={
              crownJewels.length === 0
                ? 'Designate a critical asset as a crown jewel to track it here.'
                : 'Try adjusting your search or filters.'
            }
            onRowClick={(jewel) => setViewJewel(jewel)}
          />
        </div>
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
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Designate crown jewel</DialogTitle>
            <DialogDescription>
              Select an existing asset to designate as a crown jewel that needs special protection
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="asset-search">Search asset *</Label>
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
                <p className="text-xs text-muted-foreground">Asset selected: {assetSearch}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="businessImpact">Business impact notes *</Label>
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
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit crown jewel</DialogTitle>
            <DialogDescription>
              Update business impact notes for {editJewel?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-businessImpact">Business impact notes *</Label>
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
              {isDesignating ? 'Saving...' : 'Save changes'}
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
                  <Crown className="h-5 w-5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <SheetTitle className="break-all text-base">{viewJewel.name}</SheetTitle>
                    <SheetDescription className="capitalize">
                      {viewJewel.assetType ?? 'asset'}
                      {viewJewel.description ? ` · ${viewJewel.description}` : ''}
                    </SheetDescription>
                  </div>
                </div>
              </SheetHeader>

              <SheetBody>
                <Tabs defaultValue="overview" className="mt-6">
                  <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="dependencies">Dependencies</TabsTrigger>
                  </TabsList>

                  <TabsContent value="overview" className="mt-4 space-y-5">
                    {/* The three things that actually matter for a crown jewel. */}
                    <MetricStrip
                      items={[
                        {
                          key: 'risk',
                          label: 'Risk',
                          value: viewJewel.riskScore,
                          hint: riskLabel(viewJewel.riskScore),
                        },
                        {
                          key: 'impact',
                          label: 'Business impact',
                          value: viewJewel.businessImpactScore ?? 0,
                          hint: impactLabel(viewJewel.businessImpactScore ?? 0),
                        },
                        {
                          key: 'exposure',
                          label: 'Internet-exposed',
                          value: isExposed(viewJewel) ? 'Yes' : 'No',
                        },
                      ]}
                    />

                    {/* Why it's a crown jewel — one honest sentence. */}
                    <p className="rounded-lg border bg-muted/40 p-3 text-sm leading-relaxed">
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
                    </p>

                    {/* Open findings by severity — real signal, not an empty card. */}
                    <section>
                      <h3 className="mb-2 text-sm font-semibold">Open findings</h3>
                      {(viewJewel.findingCount ?? 0) > 0 ? (
                        <div className="flex items-center gap-3">
                          <SeverityChips sev={viewJewel.findingSeverity} />
                          <span className="text-sm text-muted-foreground">
                            {viewJewel.findingCount} total
                          </span>
                        </div>
                      ) : (
                        <p className="flex items-center gap-2 text-sm text-muted-foreground">
                          <ShieldCheck className="h-4 w-4" /> No open findings on this asset.
                        </p>
                      )}
                    </section>

                    {/* Reachability — honest empty/real state. */}
                    <section>
                      <h3 className="mb-2 text-sm font-semibold">Reachability</h3>
                      {isExposed(viewJewel) ? (
                        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                          <ShieldX className="mt-0.5 h-4 w-4 shrink-0" />
                          <span>
                            Reachable from the internet ({viewJewel.exposure}). This drives its risk
                            — review attack paths in Exposure Chains.
                          </span>
                        </div>
                      ) : (
                        <p className="flex items-start gap-2 text-sm text-muted-foreground">
                          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
                          <span>
                            Not reachable from the internet — no public attack path reaches this
                            asset.
                          </span>
                        </p>
                      )}
                    </section>

                    {/* Details — only real, populated fields. */}
                    <section>
                      <h3 className="mb-2 text-sm font-semibold">Details</h3>
                      <dl className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <dt className="text-muted-foreground">Type</dt>
                          <dd className="font-medium capitalize">
                            {viewJewel.assetType ?? 'asset'}
                          </dd>
                        </div>
                        {viewJewel.criticality && (
                          <div className="flex justify-between">
                            <dt className="text-muted-foreground">Criticality</dt>
                            <dd className="font-medium capitalize">{viewJewel.criticality}</dd>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <dt className="text-muted-foreground">Data classification</dt>
                          <dd className="font-medium capitalize">
                            {viewJewel.dataClassification.replace('_', ' ')}
                          </dd>
                        </div>
                        {(viewJewel.piiExposed || viewJewel.phiExposed) && (
                          <div className="flex justify-between">
                            <dt className="text-muted-foreground">Sensitive data</dt>
                            <dd className="font-medium">
                              {[viewJewel.piiExposed && 'PII', viewJewel.phiExposed && 'PHI']
                                .filter(Boolean)
                                .join(', ')}
                            </dd>
                          </div>
                        )}
                        {viewJewel.lastAssessed && (
                          <div className="flex justify-between">
                            <dt className="text-muted-foreground">Last assessed</dt>
                            <dd className="font-medium">
                              {new Date(viewJewel.lastAssessed).toLocaleDateString()}
                            </dd>
                          </div>
                        )}
                      </dl>
                    </section>

                    {/* Owner */}
                    <section>
                      <h3 className="mb-2 text-sm font-semibold">Owner</h3>
                      <div className="flex items-center gap-3">
                        <Users className="h-4 w-4 shrink-0 text-muted-foreground" />
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
                    </section>

                    {viewJewel.tags.length > 0 && (
                      <section>
                        <h3 className="mb-2 text-sm font-semibold">Tags</h3>
                        <div className="flex flex-wrap gap-2">
                          {viewJewel.tags.map((tag) => (
                            <Badge key={tag} variant="secondary">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </section>
                    )}
                  </TabsContent>

                  <TabsContent value="dependencies" className="mt-4">
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        Assets that this crown jewel depends on or is connected to.
                      </p>
                      {getDependencies(viewJewel.id).length > 0 ? (
                        <div className="divide-y rounded-lg border">
                          {getDependencies(viewJewel.id).map((dep) => (
                            <div key={dep.id} className="p-3">
                              <div className="flex items-center justify-between">
                                <div className="flex flex-wrap items-center gap-2">
                                  <Link2 className="h-4 w-4 text-muted-foreground" />
                                  <span className="font-medium">{dep.dependsOnName}</span>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <Badge variant="outline">{dep.dependencyType}</Badge>
                                  <Badge
                                    variant="outline"
                                    className={cn(
                                      'capitalize',
                                      CRITICALITY_BADGE_SOFT[dep.criticality as CriticalityLevel]
                                    )}
                                  >
                                    {dep.criticality}
                                  </Badge>
                                </div>
                              </div>
                            </div>
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
              </SheetBody>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteJewel}
        onOpenChange={(open) => !open && setDeleteJewel(null)}
        title="Remove crown jewel?"
        desc={
          <>
            Are you sure you want to remove &quot;{deleteJewel?.name}&quot; from your crown jewels?
            This will remove tracking and protection requirements.
          </>
        }
        confirmText={isUndesignating ? 'Removing...' : 'Remove'}
        destructive
        isLoading={isUndesignating}
        handleConfirm={handleDelete}
      />
    </>
  )
}
