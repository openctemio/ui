'use client'

import { useState, useMemo } from 'react'
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from '@tanstack/react-table'
import { Main } from '@/components/layout'
import { PageHeader, StatusBadge, RiskScoreBadge } from '@/features/shared'
import { AssetDetailSheet, StatCardCentered, StatsGrid, SectionTitle } from '@/features/assets'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { getErrorMessage } from '@/lib/api/error-handler'
import {
  Plus,
  Server,
  Search as SearchIcon,
  MoreHorizontal,
  Eye,
  Pencil,
  Trash2,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Download,
  Shield,
  AlertTriangle,
  CheckCircle,
  Copy,
  RefreshCw,
  Network,
} from 'lucide-react'
import {
  useAssets,
  createAsset,
  updateAsset,
  deleteAsset,
  bulkDeleteAssets,
  getAssetRelationships,
  ClassificationBadges,
  type Asset,
} from '@/features/assets'
import { Can, Permission, usePermissions } from '@/lib/permissions'
import { AssetGroupSelect } from '@/features/asset-groups'
import type { Status } from '@/features/shared/types'

// Filter types
type StatusFilter = Status | 'all'
type ProtocolFilter = 'all' | 'tcp' | 'udp'

const statusFilters: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'pending', label: 'Pending' },
]

// Common ports for quick selection
const commonPorts = [
  { port: 22, name: 'SSH' },
  { port: 80, name: 'HTTP' },
  { port: 443, name: 'HTTPS' },
  { port: 3306, name: 'MySQL' },
  { port: 5432, name: 'PostgreSQL' },
  { port: 6379, name: 'Redis' },
  { port: 27017, name: 'MongoDB' },
  { port: 8080, name: 'HTTP Alt' },
  { port: 3389, name: 'RDP' },
  { port: 21, name: 'FTP' },
]

// Empty form state
const emptyServiceForm = {
  name: '',
  description: '',
  groupId: '',
  port: '',
  protocol: 'tcp',
  version: '',
  banner: '',
  tags: '',
}

export default function ServicesPage() {
  // Permission checks
  const { can } = usePermissions()
  const canWriteAssets = can(Permission.AssetsWrite)
  const canDeleteAssets = can(Permission.AssetsDelete)

  // Fetch services from API
  const {
    assets: services,
    isLoading,
    isError: _isError,
    error: _fetchError,
    mutate,
  } = useAssets({
    types: ['service'],
  })

  const [selectedService, setSelectedService] = useState<Asset | null>(null)
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [protocolFilter, setProtocolFilter] = useState<ProtocolFilter>('all')
  const [rowSelection, setRowSelection] = useState({})
  const [_isSubmitting, setIsSubmitting] = useState(false)

  // Dialog states
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [serviceToDelete, setServiceToDelete] = useState<Asset | null>(null)

  // Form state
  const [formData, setFormData] = useState(emptyServiceForm)

  // Filter data
  const filteredData = useMemo(() => {
    let data = [...services]
    if (statusFilter !== 'all') {
      data = data.filter((s) => s.status === statusFilter)
    }
    if (protocolFilter !== 'all') {
      data = data.filter((s) => s.metadata.protocol?.toLowerCase() === protocolFilter)
    }
    return data
  }, [services, statusFilter, protocolFilter])

  // Status counts
  const statusCounts = useMemo(
    () => ({
      all: services.length,
      active: services.filter((s) => s.status === 'active').length,
      inactive: services.filter((s) => s.status === 'inactive').length,
      pending: services.filter((s) => s.status === 'pending').length,
    }),
    [services]
  )

  // Protocol counts
  const protocolCounts = useMemo(
    () => ({
      tcp: services.filter((s) => s.metadata.protocol?.toLowerCase() === 'tcp').length,
      udp: services.filter((s) => s.metadata.protocol?.toLowerCase() === 'udp').length,
    }),
    [services]
  )

  // Table columns
  const columns: ColumnDef<Asset>[] = [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && 'indeterminate')
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
    },
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="-ml-4"
        >
          Service
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Server className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="min-w-0">
            <p className="font-medium truncate">{row.original.name}</p>
            <p className="text-muted-foreground text-xs truncate">{row.original.groupName}</p>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'metadata.port',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="-ml-4"
        >
          Port
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <Badge variant="outline" className="font-mono">
          {row.original.metadata.port}
        </Badge>
      ),
    },
    {
      accessorKey: 'metadata.protocol',
      header: 'Protocol',
      cell: ({ row }) => {
        const protocol = row.original.metadata.protocol?.toUpperCase() || 'TCP'
        return (
          <Badge
            variant="secondary"
            className={protocol === 'UDP' ? 'bg-purple-500/10 text-purple-500' : ''}
          >
            {protocol}
          </Badge>
        )
      },
    },
    {
      accessorKey: 'metadata.version',
      header: 'Version',
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.metadata.version || '-'}
        </span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      id: 'classification',
      header: 'Classification',
      cell: ({ row }) => (
        <ClassificationBadges
          scope={row.original.scope}
          exposure={row.original.exposure}
          size="sm"
          showTooltips
        />
      ),
    },
    {
      accessorKey: 'findingCount',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="-ml-4"
        >
          Findings
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const count = row.original.findingCount
        if (count === 0) return <span className="text-muted-foreground">0</span>
        return <Badge variant={count > 5 ? 'destructive' : 'secondary'}>{count}</Badge>
      },
    },
    {
      accessorKey: 'riskScore',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="-ml-4"
        >
          Risk
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => <RiskScoreBadge score={row.original.riskScore} size="sm" />,
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const service = row.original
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation()
                  setSelectedService(service)
                }}
              >
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>
              <Can permission={Permission.AssetsWrite}>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation()
                    handleOpenEdit(service)
                  }}
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
              </Can>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation()
                  handleCopyService(service)
                }}
              >
                <Copy className="mr-2 h-4 w-4" />
                Copy Info
              </DropdownMenuItem>
              <Can permission={Permission.AssetsDelete}>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-red-400"
                  onClick={(e) => {
                    e.stopPropagation()
                    setServiceToDelete(service)
                    setDeleteDialogOpen(true)
                  }}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </Can>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

  const table = useReactTable({
    data: filteredData,
    columns,
    state: { sorting, globalFilter, rowSelection },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  // Handlers
  const handleCopyService = (service: Asset) => {
    const info = `${service.name}:${service.metadata.port}/${service.metadata.protocol || 'tcp'}`
    navigator.clipboard.writeText(info)
    toast.success('Service info copied to clipboard')
  }

  const handleOpenEdit = (service: Asset) => {
    setFormData({
      name: service.name,
      description: service.description || '',
      groupId: service.groupId || '',
      port: String(service.metadata.port || ''),
      protocol: service.metadata.protocol || 'tcp',
      version: service.metadata.version || '',
      banner: service.metadata.banner || '',
      tags: service.tags?.join(', ') || '',
    })
    setSelectedService(service)
    setEditDialogOpen(true)
  }

  const handleAddService = async () => {
    if (!formData.name) {
      toast.error('Please fill in required fields')
      return
    }

    setIsSubmitting(true)
    try {
      await createAsset({
        name: formData.name,
        type: 'service',
        criticality: 'medium',
        description: formData.description,
        scope: 'internal',
        exposure: 'private',
        tags: formData.tags
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      })
      await mutate()
      setFormData(emptyServiceForm)
      setAddDialogOpen(false)
      toast.success('Service added successfully')
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to add service'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditService = async () => {
    if (!selectedService || !formData.name) {
      toast.error('Please fill in required fields')
      return
    }

    setIsSubmitting(true)
    try {
      await updateAsset(selectedService.id, {
        name: formData.name,
        description: formData.description,
        tags: formData.tags
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      })
      await mutate()
      setFormData(emptyServiceForm)
      setEditDialogOpen(false)
      setSelectedService(null)
      toast.success('Service updated successfully')
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to update service'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteService = async () => {
    if (!serviceToDelete) return
    setIsSubmitting(true)
    try {
      await deleteAsset(serviceToDelete.id)
      await mutate()
      setDeleteDialogOpen(false)
      setServiceToDelete(null)
      toast.success('Service deleted successfully')
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to delete service'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleBulkDelete = async () => {
    const selectedServiceIds = table.getSelectedRowModel().rows.map((r) => r.original.id)
    if (selectedServiceIds.length === 0) return

    setIsSubmitting(true)
    try {
      await bulkDeleteAssets(selectedServiceIds)
      await mutate()
      setRowSelection({})
      toast.success(`Deleted ${selectedServiceIds.length} services`)
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to delete services'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleExport = () => {
    const csv = [
      ['Name', 'Port', 'Protocol', 'Version', 'Status', 'Risk Score', 'Findings'].join(','),
      ...services.map((s) =>
        [
          s.name,
          s.metadata.port,
          s.metadata.protocol || 'tcp',
          s.metadata.version || '',
          s.status,
          s.riskScore,
          s.findingCount,
        ].join(',')
      ),
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'services.csv'
    a.click()
    toast.success('Services exported')
  }

  return (
    <>
      <Main>
        <PageHeader
          title="Service Assets"
          description={`${services.length} services in your infrastructure`}
        >
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Can permission={Permission.AssetsWrite}>
              <Button
                onClick={() => {
                  setFormData(emptyServiceForm)
                  setAddDialogOpen(true)
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Service
              </Button>
            </Can>
          </div>
        </PageHeader>

        {/* Stats Cards */}
        <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Card
            className="cursor-pointer hover:border-primary transition-colors"
            onClick={() => setStatusFilter('all')}
          >
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Server className="h-4 w-4" />
                Total Services
              </CardDescription>
              {isLoading ? (
                <Skeleton className="h-9 w-16 mt-1" />
              ) : (
                <CardTitle className="text-3xl">{statusCounts.all}</CardTitle>
              )}
            </CardHeader>
          </Card>
          <Card
            className={`cursor-pointer hover:border-green-500 transition-colors ${statusFilter === 'active' ? 'border-green-500' : ''}`}
            onClick={() => setStatusFilter(statusFilter === 'active' ? 'all' : 'active')}
          >
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Active
              </CardDescription>
              {isLoading ? (
                <Skeleton className="h-9 w-16 mt-1" />
              ) : (
                <CardTitle className="text-3xl text-green-500">{statusCounts.active}</CardTitle>
              )}
            </CardHeader>
          </Card>
          <Card
            className={`cursor-pointer hover:border-blue-500 transition-colors ${protocolFilter === 'tcp' ? 'border-blue-500' : ''}`}
            onClick={() => setProtocolFilter(protocolFilter === 'tcp' ? 'all' : 'tcp')}
          >
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Network className="h-4 w-4 text-blue-500" />
                TCP Services
              </CardDescription>
              {isLoading ? (
                <Skeleton className="h-9 w-16 mt-1" />
              ) : (
                <CardTitle className="text-3xl text-blue-500">{protocolCounts.tcp}</CardTitle>
              )}
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                With Findings
              </CardDescription>
              {isLoading ? (
                <Skeleton className="h-9 w-16 mt-1" />
              ) : (
                <CardTitle className="text-3xl text-orange-500">
                  {services.filter((s) => s.findingCount > 0).length}
                </CardTitle>
              )}
            </CardHeader>
          </Card>
        </div>

        {/* Table Card */}
        <Card className="mt-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Server className="h-5 w-5" />
                  All Services
                </CardTitle>
                <CardDescription>Manage your network services and ports</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Quick Filter Tabs */}
            <Tabs
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as StatusFilter)}
              className="mb-4"
            >
              <TabsList>
                {statusFilters.map((filter) => (
                  <TabsTrigger key={filter.value} value={filter.value} className="gap-1.5">
                    {filter.label}
                    <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                      {statusCounts[filter.value as keyof typeof statusCounts] || 0}
                    </Badge>
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            {/* Search and Actions */}
            <div className="flex flex-col gap-4 mb-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative flex-1 max-w-sm">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search services..."
                  value={globalFilter}
                  onChange={(e) => setGlobalFilter(e.target.value)}
                  className="pl-9"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {Object.keys(rowSelection).length > 0 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        {Object.keys(rowSelection).length} selected
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => toast.info('Scanning selected services...')}>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Rescan Selected
                      </DropdownMenuItem>
                      <Can permission={Permission.AssetsDelete}>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-400" onClick={handleBulkDelete}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete Selected
                        </DropdownMenuItem>
                      </Can>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>

            {/* Table */}
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <TableHead key={header.id}>
                          {header.isPlaceholder
                            ? null
                            : flexRender(header.column.columnDef.header, header.getContext())}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {table.getRowModel().rows?.length ? (
                    table.getRowModel().rows.map((row) => (
                      <TableRow
                        key={row.id}
                        data-state={row.getIsSelected() && 'selected'}
                        className="cursor-pointer"
                        onClick={(e) => {
                          if (
                            (e.target as HTMLElement).closest('[role="checkbox"]') ||
                            (e.target as HTMLElement).closest('button')
                          ) {
                            return
                          }
                          setSelectedService(row.original)
                        }}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id}>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={columns.length} className="h-24 text-center">
                        No services found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                {table.getFilteredSelectedRowModel().rows.length} of{' '}
                {table.getFilteredRowModel().rows.length} row(s) selected
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.setPageIndex(0)}
                  disabled={!table.getCanPreviousPage()}
                >
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm">
                  Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                  disabled={!table.getCanNextPage()}
                >
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </Main>

      {/* Service Details Sheet */}
      <AssetDetailSheet
        asset={selectedService}
        open={!!selectedService && !editDialogOpen}
        onOpenChange={() => setSelectedService(null)}
        icon={Server}
        iconColor="text-blue-500"
        gradientFrom="from-blue-500/20"
        gradientVia="via-blue-500/10"
        assetTypeName="Service"
        relationships={selectedService ? getAssetRelationships(selectedService.id) : []}
        onEdit={() => selectedService && handleOpenEdit(selectedService)}
        onDelete={() => {
          if (selectedService) {
            setServiceToDelete(selectedService)
            setDeleteDialogOpen(true)
            setSelectedService(null)
          }
        }}
        canEdit={canWriteAssets}
        canDelete={canDeleteAssets}
        quickActions={
          selectedService && (
            <Button size="sm" variant="outline" onClick={() => handleCopyService(selectedService)}>
              <Copy className="mr-2 h-4 w-4" />
              Copy
            </Button>
          )
        }
        statsContent={
          selectedService && (
            <StatsGrid columns={3}>
              <StatCardCentered
                icon={Network}
                iconBg="bg-blue-500/10"
                iconColor="text-blue-500"
                value={selectedService.metadata.port || '-'}
                label="Port"
              />
              <StatCardCentered
                icon={Shield}
                iconBg="bg-orange-500/10"
                iconColor="text-orange-500"
                value={selectedService.riskScore}
                label="Risk"
              />
              <StatCardCentered
                icon={AlertTriangle}
                iconBg="bg-red-500/10"
                iconColor="text-red-500"
                value={selectedService.findingCount}
                label="Findings"
              />
            </StatsGrid>
          )
        }
        overviewContent={
          selectedService && (
            <div className="rounded-xl border p-4 bg-card space-y-3">
              <SectionTitle>Service Information</SectionTitle>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Protocol</p>
                  <Badge variant="secondary">
                    {selectedService.metadata.protocol?.toUpperCase() || 'TCP'}
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground">Version</p>
                  <p className="font-medium">{selectedService.metadata.version || '-'}</p>
                </div>
              </div>
              {selectedService.metadata.banner && (
                <div>
                  <p className="text-muted-foreground text-sm mb-1">Banner</p>
                  <code className="block text-xs bg-muted p-2 rounded overflow-x-auto">
                    {selectedService.metadata.banner}
                  </code>
                </div>
              )}
            </div>
          )
        }
      />

      {/* Add Service Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              Add Service
            </DialogTitle>
            <DialogDescription>Add a new service to your asset inventory</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="space-y-2">
              <Label htmlFor="name">Service Name *</Label>
              <Input
                id="name"
                placeholder="e.g., api.example.com"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="groupId">Asset Group *</Label>
              <AssetGroupSelect
                value={formData.groupId}
                onValueChange={(value) => setFormData({ ...formData, groupId: value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="port">Port *</Label>
                <Input
                  id="port"
                  type="number"
                  placeholder="443"
                  value={formData.port}
                  onChange={(e) => setFormData({ ...formData, port: e.target.value })}
                />
                <div className="flex flex-wrap gap-1">
                  {commonPorts.slice(0, 4).map((p) => (
                    <Button
                      key={p.port}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-6 text-xs"
                      onClick={() => setFormData({ ...formData, port: String(p.port) })}
                    >
                      {p.port}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="protocol">Protocol</Label>
                <Select
                  value={formData.protocol}
                  onValueChange={(value) => setFormData({ ...formData, protocol: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tcp">TCP</SelectItem>
                    <SelectItem value="udp">UDP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="version">Version</Label>
              <Input
                id="version"
                placeholder="e.g., OpenSSH 8.4"
                value={formData.version}
                onChange={(e) => setFormData({ ...formData, version: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="banner">Banner</Label>
              <Textarea
                id="banner"
                placeholder="Service banner response"
                value={formData.banner}
                onChange={(e) => setFormData({ ...formData, banner: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Optional description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tags">Tags (comma separated)</Label>
              <Input
                id="tags"
                placeholder="production, critical"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddService}>
              <Plus className="mr-2 h-4 w-4" />
              Add Service
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Service Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5" />
              Edit Service
            </DialogTitle>
            <DialogDescription>Update service information</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Service Name *</Label>
              <Input
                id="edit-name"
                placeholder="e.g., api.example.com"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-groupId">Asset Group *</Label>
              <AssetGroupSelect
                value={formData.groupId}
                onValueChange={(value) => setFormData({ ...formData, groupId: value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-port">Port *</Label>
                <Input
                  id="edit-port"
                  type="number"
                  placeholder="443"
                  value={formData.port}
                  onChange={(e) => setFormData({ ...formData, port: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-protocol">Protocol</Label>
                <Select
                  value={formData.protocol}
                  onValueChange={(value) => setFormData({ ...formData, protocol: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tcp">TCP</SelectItem>
                    <SelectItem value="udp">UDP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-version">Version</Label>
              <Input
                id="edit-version"
                placeholder="e.g., OpenSSH 8.4"
                value={formData.version}
                onChange={(e) => setFormData({ ...formData, version: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-banner">Banner</Label>
              <Textarea
                id="edit-banner"
                placeholder="Service banner response"
                value={formData.banner}
                onChange={(e) => setFormData({ ...formData, banner: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                placeholder="Optional description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-tags">Tags (comma separated)</Label>
              <Input
                id="edit-tags"
                placeholder="production, critical"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditService}>
              <CheckCircle className="mr-2 h-4 w-4" />
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Service</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{serviceToDelete?.name}</strong>? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 hover:bg-red-600"
              onClick={handleDeleteService}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
