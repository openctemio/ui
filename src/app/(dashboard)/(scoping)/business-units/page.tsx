'use client'

import { useState, useMemo, useEffect } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { Main } from '@/components/layout'
import {
  PageHeader,
  DataTable,
  DataTableColumnHeader,
  DataTableRowActions,
  RiskScoreBadge,
  MetricStrip,
  type MetricStripItem,
  SheetBody,
} from '@/features/shared'
import { Can, Permission } from '@/lib/permissions'
import { useCsvExport, type ExportFieldConfig } from '@/hooks/use-csv-export'
import { useUrlFilter } from '@/hooks/use-url-param'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Plus,
  Download,
  Eye,
  Pencil,
  Trash2,
  Building2,
  Mail,
  ChevronRight,
  ChevronsUpDown,
  Check,
  Search,
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { cn } from '@/lib/utils'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { type BusinessUnit, type Criticality, type RiskTolerance } from '@/features/business-units'
import {
  useBusinessUnits,
  useCreateBusinessUnit,
  useUpdateBusinessUnit,
} from '@/features/business-units/api/use-business-units'
import { del } from '@/lib/api/client'
import {
  CRITICALITY_BADGE_SOFT,
  CRITICALITY_LABELS,
  CRITICALITY_DOT_COLORS,
} from '@/lib/criticality-colors'

const criticalityColors: Record<Criticality, string> = CRITICALITY_BADGE_SOFT

const riskToleranceLabels: Record<RiskTolerance, string> = {
  very_low: 'Very Low',
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  very_high: 'Very High',
}

const riskToleranceColors: Record<RiskTolerance, string> = {
  very_low:
    'bg-green-500/10 text-green-500 border-green-500/20 dark:bg-green-900/30 dark:text-green-400',
  low: 'bg-blue-500/10 text-blue-500 border-blue-500/20 dark:bg-blue-900/30 dark:text-blue-400',
  medium:
    'bg-yellow-500/10 text-yellow-500 border-yellow-500/20 dark:bg-yellow-900/30 dark:text-yellow-400',
  high: 'bg-orange-500/10 text-orange-500 border-orange-500/20 dark:bg-orange-900/30 dark:text-orange-400',
  very_high: 'bg-red-500/10 text-red-500 border-red-500/20 dark:bg-red-900/30 dark:text-red-400',
}

/** Filter children of a given parent from the full list */
function getChildUnits(allUnits: BusinessUnit[], parentId: string): BusinessUnit[] {
  return allUnits.filter((bu) => bu.parentId === parentId)
}

/** Collect all transitive descendant ids of a unit (to prevent parent cycles). */
function getDescendantIds(allUnits: BusinessUnit[], rootId: string): Set<string> {
  const result = new Set<string>()
  const stack = [rootId]
  while (stack.length > 0) {
    const current = stack.pop() as string
    for (const bu of allUnits) {
      if (bu.parentId === current && !result.has(bu.id)) {
        result.add(bu.id)
        stack.push(bu.id)
      }
    }
  }
  return result
}

/** Backend accepts only critical|high|medium|low for criticality. */
const CRITICALITY_OPTIONS: Criticality[] = ['critical', 'high', 'medium', 'low']
/** Backend accepts only low|medium|high for risk tolerance. */
const RISK_TOLERANCE_OPTIONS: RiskTolerance[] = ['low', 'medium', 'high']

/**
 * Searchable parent-unit combobox. Excludes the unit being edited (`excludeId`)
 * and all of its descendants so a cycle can't be created. The "None" option
 * clears the parent (sends `""`).
 */
function ParentUnitSelect({
  units,
  value,
  onChange,
  excludeId,
}: {
  units: BusinessUnit[]
  value: string
  onChange: (id: string) => void
  excludeId?: string
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const candidates = useMemo(() => {
    const excluded = new Set<string>()
    if (excludeId) {
      excluded.add(excludeId)
      for (const id of getDescendantIds(units, excludeId)) excluded.add(id)
    }
    const q = search.trim().toLowerCase()
    return units.filter((u) => !excluded.has(u.id) && (!q || u.name.toLowerCase().includes(q)))
  }, [units, excludeId, search])

  const selected = units.find((u) => u.id === value)

  return (
    <Popover
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen)
        if (!isOpen) setSearch('')
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          <span className={selected ? '' : 'text-muted-foreground'}>
            {selected ? selected.name : 'None (top-level)'}
          </span>
          <ChevronsUpDown className="ms-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Filter units..." value={search} onValueChange={setSearch} />
          <CommandList>
            <CommandEmpty>No business units found.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="__none__"
                onSelect={() => {
                  onChange('')
                  setOpen(false)
                  setSearch('')
                }}
              >
                <Check className={cn('me-2 h-4 w-4', !value ? 'opacity-100' : 'opacity-0')} />
                None (top-level)
              </CommandItem>
              {candidates.map((u) => (
                <CommandItem
                  key={u.id}
                  value={u.id}
                  onSelect={() => {
                    onChange(u.id)
                    setOpen(false)
                    setSearch('')
                  }}
                >
                  <Check
                    className={cn('me-2 h-4 w-4', value === u.id ? 'opacity-100' : 'opacity-0')}
                  />
                  {u.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

const BUSINESS_UNIT_EXPORT_FIELDS: ExportFieldConfig<BusinessUnit>[] = [
  { header: 'Name', accessor: (bu) => bu.name },
  { header: 'Description', accessor: (bu) => bu.description ?? '' },
  { header: 'Owner', accessor: (bu) => bu.owner },
  { header: 'Owner Email', accessor: (bu) => bu.ownerEmail },
  { header: 'Assets', accessor: (bu) => bu.assetCount },
  { header: 'Risk Score', accessor: (bu) => bu.riskScore ?? '' },
  { header: 'Criticality', accessor: (bu) => bu.criticality },
  { header: 'Tags', accessor: (bu) => (bu.tags ?? []).join('; ') },
]

export default function BusinessUnitsPage() {
  // Fetch from API, fallback to mock data if API returns empty
  const { data: apiData, mutate: refreshList } = useBusinessUnits()
  const { trigger: createBU } = useCreateBusinessUnit()
  const { trigger: updateBU } = useUpdateBusinessUnit()
  const apiBUs: BusinessUnit[] = useMemo(() => {
    if (!apiData?.data?.length) return []
    return apiData.data.map(
      (bu) =>
        ({
          id: bu.id,
          name: bu.name,
          description: bu.description || '',
          owner: bu.owner_name || 'Unassigned',
          ownerEmail: bu.owner_email || '',
          criticality: (bu.criticality || 'medium') as Criticality,
          riskTolerance: (bu.risk_tolerance || 'medium') as RiskTolerance,
          assetCount: bu.asset_count,
          findingCount: bu.finding_count,
          riskScore: bu.avg_risk_score,
          criticalFindingCount: bu.critical_finding_count,
          regulatoryFrameworks: [],
          tags: bu.tags || [],
          parentId: bu.parent_id ?? undefined,
          childCount: 0,
          createdAt: bu.created_at,
          updatedAt: bu.updated_at,
        }) as unknown as BusinessUnit
    )
  }, [apiData])
  const [businessUnits, setBusinessUnits] = useState<BusinessUnit[]>([])
  useEffect(() => {
    setBusinessUnits(apiBUs)
  }, [apiBUs])
  const { handleExport } = useCsvExport(
    businessUnits,
    BUSINESS_UNIT_EXPORT_FIELDS,
    'business-units'
  )
  const [viewUnit, setViewUnit] = useState<BusinessUnit | null>(null)
  const [editUnit, setEditUnit] = useState<BusinessUnit | null>(null)
  const [deleteUnit, setDeleteUnit] = useState<BusinessUnit | null>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  // Filters and search live in the URL so a filtered view can be linked to.
  const [filterCriticality, setFilterCriticality] = useUrlFilter('criticality', 'all')
  const [filterRiskTolerance, setFilterRiskTolerance] = useUrlFilter('risk_tolerance', 'all')
  const [searchQuery, setSearchQuery] = useUrlFilter('q', '')

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
    const count = businessUnits.length
    return {
      total: count,
      critical: businessUnits.filter((bu) => bu.criticality === 'critical').length,
      totalAssets: businessUnits.reduce((acc, bu) => acc + bu.assetCount, 0),
      // Guard against divide-by-zero on an empty tenant and missing per-unit
      // fields (the API adapter doesn't always populate score fields) — both
      // were rendering "NaN".
      averageRiskScore: count
        ? Math.round(businessUnits.reduce((acc, bu) => acc + (bu.riskScore ?? 0), 0) / count)
        : 0,
    }
  }, [businessUnits])

  const filteredUnits = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return businessUnits.filter((unit) => {
      if (filterCriticality !== 'all' && unit.criticality !== filterCriticality) return false
      if (filterRiskTolerance !== 'all' && unit.riskTolerance !== filterRiskTolerance) return false
      if (q && !unit.name.toLowerCase().includes(q) && !unit.owner.toLowerCase().includes(q))
        return false
      return true
    })
  }, [businessUnits, filterCriticality, filterRiskTolerance, searchQuery])

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

  const handleCreate = async () => {
    if (!formData.name || !formData.owner || !formData.ownerEmail) {
      toast.error('Please fill in all required fields')
      return
    }
    try {
      await createBU({
        name: formData.name,
        description: formData.description || '',
        owner_name: formData.owner,
        owner_email: formData.ownerEmail,
        criticality: formData.criticality,
        risk_tolerance: formData.riskTolerance,
        parent_id: formData.parentId, // '' = top-level (no parent)
        tags: formData.tags
          ? formData.tags
              .split(',')
              .map((t) => t.trim())
              .filter(Boolean)
          : [],
      })
      await refreshList()
      toast.success('Business unit created successfully')
      setIsCreateOpen(false)
      resetForm()
    } catch {
      toast.error('Failed to create business unit')
    }
  }

  const handleEdit = async () => {
    if (!editUnit || !formData.name || !formData.owner || !formData.ownerEmail) {
      toast.error('Please fill in all required fields')
      return
    }
    try {
      await updateBU({
        id: editUnit.id,
        name: formData.name,
        description: formData.description || '',
        owner_name: formData.owner,
        owner_email: formData.ownerEmail,
        criticality: formData.criticality,
        risk_tolerance: formData.riskTolerance,
        parent_id: formData.parentId, // '' = clear parent
        tags: formData.tags
          ? formData.tags
              .split(',')
              .map((t) => t.trim())
              .filter(Boolean)
          : [],
      })
      await refreshList()
      toast.success('Business unit updated successfully')
      setEditUnit(null)
      resetForm()
    } catch {
      toast.error('Failed to update business unit')
    }
  }

  const handleDelete = async () => {
    if (!deleteUnit) return
    try {
      await del(`/api/v1/business-units/${deleteUnit.id}`)
      await refreshList()
      toast.success('Business unit deleted successfully')
      setDeleteUnit(null)
    } catch {
      toast.error('Failed to delete business unit')
    }
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
      header: ({ column }) => <DataTableColumnHeader column={column} title="Business unit" />,
      cell: ({ row }) => {
        const unit = row.original
        const children = getChildUnits(businessUnits, unit.id)
        const parent = unit.parentId ? businessUnits.find((u) => u.id === unit.parentId) : undefined
        const context = [
          parent ? `in ${parent.name}` : unit.parentId ? 'Sub-unit' : '',
          children.length > 0 ? `${children.length} sub-units` : '',
        ]
          .filter(Boolean)
          .join(' · ')
        return (
          <div className="flex min-w-0 items-center gap-2.5">
            <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <div className="truncate font-medium">{unit.name}</div>
              {context && <div className="text-xs text-muted-foreground">{context}</div>}
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
          {CRITICALITY_LABELS[row.original.criticality]}
        </Badge>
      ),
      filterFn: (row, id, value) => value.includes(row.getValue(id)),
    },
    {
      accessorKey: 'riskTolerance',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Risk tolerance" />,
      cell: ({ row }) => (
        <Badge variant="outline" className={riskToleranceColors[row.original.riskTolerance]}>
          {riskToleranceLabels[row.original.riskTolerance]}
        </Badge>
      ),
    },
    {
      accessorKey: 'assetCount',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Assets" />,
      cell: ({ row }) => <span className="tabular-nums">{row.original.assetCount}</span>,
    },
    {
      accessorKey: 'riskScore',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Risk score" />,
      cell: ({ row }) => <RiskScoreBadge score={row.original.riskScore} />,
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
            <DataTableRowActions
              actions={[
                { label: 'View details', icon: Eye, onClick: () => setViewUnit(unit) },
                {
                  label: 'Edit',
                  icon: Pencil,
                  onClick: () => openEdit(unit),
                  permission: Permission.ScopeWrite,
                },
                {
                  label: 'Delete',
                  icon: Trash2,
                  onClick: () => setDeleteUnit(unit),
                  destructive: true,
                  separatorBefore: true,
                  permission: Permission.ScopeDelete,
                },
              ]}
            />
          </Can>
        )
      },
    },
  ]

  const criticalOnly = filterCriticality === 'critical'
  const metrics: MetricStripItem[] = [
    {
      key: 'total',
      label: 'Business units',
      value: stats.total,
      onClick: () => {
        setFilterCriticality('all')
        setFilterRiskTolerance('all')
      },
      active: filterCriticality === 'all' && filterRiskTolerance === 'all',
    },
    {
      key: 'critical',
      label: 'Critical units',
      value: stats.critical,
      tone: 'danger',
      onClick: () => setFilterCriticality(criticalOnly ? 'all' : 'critical'),
      active: criticalOnly,
    },
    { key: 'assets', label: 'Assets', value: stats.totalAssets },
    {
      key: 'risk',
      label: 'Average risk score',
      value: stats.averageRiskScore,
      hint: 'of 100',
    },
  ]

  const formFields = (
    <div className="space-y-4">
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
          <Label htmlFor="criticality">Criticality</Label>
          <Select
            value={formData.criticality}
            onValueChange={(v) => setFormData({ ...formData, criticality: v as Criticality })}
          >
            <SelectTrigger id="criticality">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CRITICALITY_OPTIONS.map((level) => (
                <SelectItem key={level} value={level}>
                  <span className="flex items-center gap-2">
                    <span className={cn('h-2 w-2 rounded-full', CRITICALITY_DOT_COLORS[level])} />
                    {CRITICALITY_LABELS[level]}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="riskTolerance">Risk tolerance</Label>
          <Select
            value={formData.riskTolerance}
            onValueChange={(v) => setFormData({ ...formData, riskTolerance: v as RiskTolerance })}
          >
            <SelectTrigger id="riskTolerance">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RISK_TOLERANCE_OPTIONS.map((level) => (
                <SelectItem key={level} value={level}>
                  {riskToleranceLabels[level]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Parent unit</Label>
        <ParentUnitSelect
          units={businessUnits}
          value={formData.parentId}
          onChange={(id) => setFormData({ ...formData, parentId: id })}
          excludeId={editUnit?.id}
        />
        <p className="text-xs text-muted-foreground">
          Optional. Nest this unit under a parent to build your org hierarchy.
        </p>
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
          <Label htmlFor="ownerEmail">Owner email *</Label>
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
          title="Business units"
          description="Your organizational structure, so security priorities follow the business."
        >
          <Can permission={Permission.ScopeWrite}>
            <Button size="sm" onClick={() => setIsCreateOpen(true)}>
              <Plus className="me-2 h-4 w-4" />
              New business unit
            </Button>
          </Can>
        </PageHeader>

        <MetricStrip className="mt-5" loading={!apiData} items={metrics} />

        <div className="mt-5">
          <DataTable
            columns={columns}
            data={filteredUnits}
            showSearch={false}
            toolbarStart={
              <>
                <div className="relative min-w-0 flex-1 sm:max-w-xs">
                  <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search name or owner…"
                    aria-label="Search business units"
                    className="h-9 ps-9"
                  />
                </div>
                <Select value={filterCriticality} onValueChange={setFilterCriticality}>
                  <SelectTrigger className="h-9 w-auto min-w-36" aria-label="Filter by criticality">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All criticalities</SelectItem>
                    {CRITICALITY_OPTIONS.map((level) => (
                      <SelectItem key={level} value={level}>
                        {CRITICALITY_LABELS[level]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterRiskTolerance} onValueChange={setFilterRiskTolerance}>
                  <SelectTrigger
                    className="h-9 w-auto min-w-36"
                    aria-label="Filter by risk tolerance"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All risk tolerances</SelectItem>
                    {RISK_TOLERANCE_OPTIONS.map((level) => (
                      <SelectItem key={level} value={level}>
                        {riskToleranceLabels[level]} tolerance
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            }
            toolbarEnd={
              <Button
                variant="outline"
                size="sm"
                className="h-9"
                onClick={handleExport}
                disabled={businessUnits.length === 0}
              >
                <Download className="h-4 w-4 md:me-2" />
                <span className="hidden md:inline">Export</span>
              </Button>
            }
            emptyMessage={
              businessUnits.length === 0 ? 'No business units yet' : 'No business units match'
            }
            emptyDescription={
              businessUnits.length === 0
                ? 'Create a business unit to map assets to the organization.'
                : 'Try adjusting your search or filters.'
            }
            onRowClick={(unit) => setViewUnit(unit)}
          />
        </div>
      </Main>

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>New business unit</DialogTitle>
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
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit business unit</DialogTitle>
            <DialogDescription>Update business unit details</DialogDescription>
          </DialogHeader>
          {formFields}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUnit(null)}>
              Cancel
            </Button>
            <Button onClick={handleEdit}>Save changes</Button>
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
                  <Building2 className="h-5 w-5 shrink-0 text-muted-foreground" />
                  <div>
                    <SheetTitle>{viewUnit.name}</SheetTitle>
                    <SheetDescription>{viewUnit.description}</SheetDescription>
                  </div>
                </div>
              </SheetHeader>

              <SheetBody>
                <Tabs defaultValue="overview" className="mt-2">
                  <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="hierarchy">Hierarchy</TabsTrigger>
                  </TabsList>

                  <TabsContent value="overview" className="mt-4">
                    {/* One definition list with dividers, not a stack of cards. */}
                    <dl className="divide-y rounded-lg border">
                      <div className="flex items-center justify-between gap-4 px-4 py-3">
                        <dt className="text-sm text-muted-foreground">Criticality</dt>
                        <dd>
                          <Badge
                            variant="outline"
                            className={criticalityColors[viewUnit.criticality]}
                          >
                            {CRITICALITY_LABELS[viewUnit.criticality]}
                          </Badge>
                        </dd>
                      </div>
                      <div className="flex items-center justify-between gap-4 px-4 py-3">
                        <dt className="text-sm text-muted-foreground">Risk tolerance</dt>
                        <dd>
                          <Badge
                            variant="outline"
                            className={riskToleranceColors[viewUnit.riskTolerance]}
                          >
                            {riskToleranceLabels[viewUnit.riskTolerance]}
                          </Badge>
                        </dd>
                      </div>
                      <div className="flex items-center justify-between gap-4 px-4 py-3">
                        <dt className="text-sm text-muted-foreground">Assets</dt>
                        <dd className="text-sm font-medium tabular-nums">{viewUnit.assetCount}</dd>
                      </div>
                      <div className="flex items-center justify-between gap-4 px-4 py-3">
                        <dt className="text-sm text-muted-foreground">Risk score</dt>
                        <dd className="flex items-center gap-3">
                          <Progress value={viewUnit.riskScore ?? 0} className="h-1.5 w-24" />
                          <RiskScoreBadge score={viewUnit.riskScore} />
                        </dd>
                      </div>
                      <div className="flex items-center justify-between gap-4 px-4 py-3">
                        <dt className="text-sm text-muted-foreground">Owner</dt>
                        <dd className="min-w-0 text-end">
                          <p className="text-sm font-medium">{viewUnit.owner}</p>
                          {viewUnit.ownerEmail && (
                            <p className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
                              <Mail className="h-3 w-3" />
                              {viewUnit.ownerEmail}
                            </p>
                          )}
                        </dd>
                      </div>
                      {viewUnit.tags.length > 0 && (
                        <div className="flex items-start justify-between gap-4 px-4 py-3">
                          <dt className="text-sm text-muted-foreground">Tags</dt>
                          <dd className="flex flex-wrap justify-end gap-1.5">
                            {viewUnit.tags.map((tag) => (
                              <Badge key={tag} variant="secondary">
                                {tag}
                              </Badge>
                            ))}
                          </dd>
                        </div>
                      )}
                    </dl>
                  </TabsContent>

                  <TabsContent value="hierarchy" className="mt-4">
                    {viewUnit.parentId &&
                      (() => {
                        const parent = businessUnits.find((u) => u.id === viewUnit.parentId)
                        return (
                          <div className="mb-4">
                            <p className="mb-2 text-sm text-muted-foreground">Parent unit</p>
                            <button
                              type="button"
                              disabled={!parent}
                              className="flex w-full items-center gap-2 rounded-lg border p-3 text-start enabled:hover:bg-muted/50"
                              onClick={() => parent && setViewUnit(parent)}
                            >
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">{parent?.name ?? 'Unknown unit'}</span>
                            </button>
                          </div>
                        )
                      })()}

                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Sub-units</p>
                      {getChildUnits(businessUnits, viewUnit.id).length > 0 ? (
                        <div className="divide-y rounded-lg border">
                          {getChildUnits(businessUnits, viewUnit.id).map((child) => (
                            <div key={child.id} className="p-3">
                              <div className="flex items-center justify-between">
                                <div className="flex flex-wrap items-center gap-2">
                                  <Building2 className="h-4 w-4 text-muted-foreground" />
                                  <span className="font-medium">{child.name}</span>
                                </div>
                                <Badge
                                  variant="outline"
                                  className={criticalityColors[child.criticality]}
                                >
                                  {CRITICALITY_LABELS[child.criticality]}
                                </Badge>
                              </div>
                            </div>
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
                    <Pencil className="me-2 h-4 w-4" />
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
                    <Trash2 className="me-2 h-4 w-4" />
                    Delete
                  </Button>
                </div>
              </SheetBody>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteUnit}
        onOpenChange={(open) => !open && setDeleteUnit(null)}
        title="Delete business unit?"
        desc={
          <>
            Are you sure you want to delete &quot;{deleteUnit?.name}&quot;? This action cannot be
            undone.
            {getChildUnits(businessUnits, deleteUnit?.id || '').length > 0 && (
              <span className="block mt-2 text-destructive">
                Warning: This unit has sub-units that will also be affected.
              </span>
            )}
          </>
        }
        confirmText="Delete"
        destructive
        handleConfirm={handleDelete}
      />
    </>
  )
}
