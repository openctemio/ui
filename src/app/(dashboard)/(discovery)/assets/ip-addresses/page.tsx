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
import { AssetDetailSheet, StatCard, StatsGrid, SectionTitle } from '@/features/assets'
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { getErrorMessage } from '@/lib/api/error-handler'
import {
  Plus,
  Network,
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
  Globe,
  Lock,
  Server,
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
import type { Status } from '@/features/shared/types'
import {
  ScopeBadge,
  ScopeCoverageCard,
  getScopeMatchesForAsset,
  calculateScopeCoverage,
  getActiveScopeTargets,
  getActiveScopeExclusions,
  type ScopeMatchResult,
} from '@/features/scope'

// Filter types
type StatusFilter = Status | 'all'
type IpTypeFilter = 'all' | 'public' | 'private'

const statusFilters: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'pending', label: 'Pending' },
]

// Empty form state
const emptyIpForm = {
  address: '',
  version: 'ipv4' as 'ipv4' | 'ipv6',
  description: '',
  asn: '',
  organization: '',
  tags: '',
}

// Helper to determine if IP is public or private
function isPublicIp(address: string): boolean {
  // Check for private IPv4 ranges
  if (
    address.startsWith('10.') ||
    address.startsWith('192.168.') ||
    address.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./)
  ) {
    return false
  }
  // Check for localhost
  if (address.startsWith('127.') || address === '::1') {
    return false
  }
  // Check for link-local
  if (address.startsWith('169.254.') || address.toLowerCase().startsWith('fe80:')) {
    return false
  }
  return true
}

// Helper to detect IP version
function getIpVersion(address: string): 'ipv4' | 'ipv6' {
  return address.includes(':') ? 'ipv6' : 'ipv4'
}

export default function IpAddressesPage() {
  // Permission checks
  const { can } = usePermissions()
  const canWriteAssets = can(Permission.AssetsWrite)
  const canDeleteAssets = can(Permission.AssetsDelete)

  // Fetch IP addresses from API
  const {
    assets: ipAddresses,
    isLoading,
    isError: _isError,
    error: _fetchError,
    mutate,
  } = useAssets({
    types: ['ip_address'],
  })

  const [selectedIp, setSelectedIp] = useState<Asset | null>(null)
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [ipTypeFilter, setIpTypeFilter] = useState<IpTypeFilter>('all')
  const [rowSelection, setRowSelection] = useState({})
  const [_isSubmitting, setIsSubmitting] = useState(false)

  // Dialog states
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [ipToDelete, setIpToDelete] = useState<Asset | null>(null)

  // Form state
  const [formData, setFormData] = useState(emptyIpForm)

  // Filter data
  const filteredData = useMemo(() => {
    let data = [...ipAddresses]

    // Status filter
    if (statusFilter !== 'all') {
      data = data.filter((ip) => ip.status === statusFilter)
    }

    // IP type filter (public/private)
    if (ipTypeFilter !== 'all') {
      data = data.filter((ip) => {
        const isPublic = isPublicIp(ip.name)
        return ipTypeFilter === 'public' ? isPublic : !isPublic
      })
    }

    return data
  }, [ipAddresses, statusFilter, ipTypeFilter])

  // Status counts
  const statusCounts = useMemo(
    () => ({
      all: ipAddresses.length,
      active: ipAddresses.filter((ip) => ip.status === 'active').length,
      inactive: ipAddresses.filter((ip) => ip.status === 'inactive').length,
      pending: ipAddresses.filter((ip) => ip.status === 'pending').length,
    }),
    [ipAddresses]
  )

  // IP type counts
  const ipTypeCounts = useMemo(
    () => ({
      public: ipAddresses.filter((ip) => isPublicIp(ip.name)).length,
      private: ipAddresses.filter((ip) => !isPublicIp(ip.name)).length,
      ipv6: ipAddresses.filter((ip) => getIpVersion(ip.name) === 'ipv6').length,
    }),
    [ipAddresses]
  )

  // Scope data
  const scopeTargets = useMemo(() => getActiveScopeTargets(), [])
  const scopeExclusions = useMemo(() => getActiveScopeExclusions(), [])

  // Compute scope matches for each IP
  const scopeMatchesMap = useMemo(() => {
    const map = new Map<string, ScopeMatchResult>()
    ipAddresses.forEach((ip) => {
      const match = getScopeMatchesForAsset(
        { id: ip.id, type: 'ip_address', name: ip.name },
        scopeTargets,
        scopeExclusions
      )
      map.set(ip.id, match)
    })
    return map
  }, [ipAddresses, scopeTargets, scopeExclusions])

  // Calculate scope coverage
  const scopeCoverage = useMemo(() => {
    const assets = ipAddresses.map((ip) => ({
      id: ip.id,
      name: ip.name,
      type: 'ip_address',
    }))
    return calculateScopeCoverage(assets, scopeTargets, scopeExclusions)
  }, [ipAddresses, scopeTargets, scopeExclusions])

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
          IP Address
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const ip = row.original
        const version = getIpVersion(ip.name)
        return (
          <div className="flex items-center gap-2">
            <Network className="h-4 w-4 text-blue-500" />
            <div>
              <p className="font-mono font-medium">{ip.name}</p>
              <p className="text-xs text-muted-foreground">{version.toUpperCase()}</p>
            </div>
          </div>
        )
      },
    },
    {
      id: 'asnOrg',
      header: 'ASN / Organization',
      cell: ({ row }) => {
        const ip = row.original
        const asn = ip.metadata?.asn || '-'
        const org = ip.metadata?.asnOrganization || '-'
        return (
          <div>
            <p className="font-medium">{asn}</p>
            <p className="text-sm text-muted-foreground">{org}</p>
          </div>
        )
      },
    },
    {
      id: 'ipType',
      header: 'Type',
      cell: ({ row }) => {
        const isPublic = isPublicIp(row.original.name)
        return (
          <Badge variant={isPublic ? 'default' : 'secondary'}>
            {isPublic ? 'Public' : 'Private'}
          </Badge>
        )
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      id: 'scope',
      header: 'Scope',
      cell: ({ row }) => {
        const match = scopeMatchesMap.get(row.original.id)
        if (!match) return <span className="text-muted-foreground">-</span>
        return <ScopeBadge match={match} />
      },
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
      id: 'openPorts',
      header: 'Open Ports',
      cell: ({ row }) => {
        const ports = row.original.metadata?.openPorts as number[] | undefined
        if (!ports || ports.length === 0) {
          return <span className="text-muted-foreground">-</span>
        }
        return (
          <div className="flex flex-wrap gap-1">
            {ports.slice(0, 3).map((port) => (
              <Badge key={port} variant="outline" className="text-xs font-mono">
                {port}
              </Badge>
            ))}
            {ports.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{ports.length - 3}
              </Badge>
            )}
          </div>
        )
      },
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
        const ip = row.original
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
                  setSelectedIp(ip)
                }}
              >
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>
              <Can permission={Permission.AssetsWrite}>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation()
                    handleOpenEdit(ip)
                  }}
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
              </Can>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation()
                  handleCopyIp(ip)
                }}
              >
                <Copy className="mr-2 h-4 w-4" />
                Copy Address
              </DropdownMenuItem>
              <Can permission={Permission.AssetsDelete}>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-red-400"
                  onClick={(e) => {
                    e.stopPropagation()
                    setIpToDelete(ip)
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
  const handleCopyIp = (ip: Asset) => {
    navigator.clipboard.writeText(ip.name)
    toast.success('IP address copied to clipboard')
  }

  const handleOpenEdit = (ip: Asset) => {
    setFormData({
      address: ip.name,
      version: getIpVersion(ip.name),
      description: ip.description || '',
      asn: ip.metadata?.asn || '',
      organization: ip.metadata?.asnOrganization || '',
      tags: ip.tags?.join(', ') || '',
    })
    setSelectedIp(ip)
    setEditDialogOpen(true)
  }

  const handleAddIp = async () => {
    if (!formData.address) {
      toast.error('Please fill in required fields')
      return
    }

    setIsSubmitting(true)
    try {
      await createAsset({
        name: formData.address,
        type: 'ip_address',
        criticality: 'medium',
        description: formData.description,
        scope: isPublicIp(formData.address) ? 'external' : 'internal',
        exposure: isPublicIp(formData.address) ? 'public' : 'private',
        tags: formData.tags
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        metadata: {
          asn: formData.asn,
          asnOrganization: formData.organization,
          ipVersion: formData.version,
        },
      })
      await mutate()
      setFormData(emptyIpForm)
      setAddDialogOpen(false)
      toast.success('IP address added successfully')
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to add IP address'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditIp = async () => {
    if (!selectedIp || !formData.address) {
      toast.error('Please fill in required fields')
      return
    }

    setIsSubmitting(true)
    try {
      await updateAsset(selectedIp.id, {
        name: formData.address,
        description: formData.description,
        tags: formData.tags
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        metadata: {
          ...selectedIp.metadata,
          asn: formData.asn,
          asnOrganization: formData.organization,
        },
      })
      await mutate()
      setFormData(emptyIpForm)
      setEditDialogOpen(false)
      setSelectedIp(null)
      toast.success('IP address updated successfully')
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to update IP address'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteIp = async () => {
    if (!ipToDelete) return
    setIsSubmitting(true)
    try {
      await deleteAsset(ipToDelete.id)
      await mutate()
      setDeleteDialogOpen(false)
      setIpToDelete(null)
      toast.success('IP address deleted successfully')
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to delete IP address'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleBulkDelete = async () => {
    const selectedIpIds = table.getSelectedRowModel().rows.map((r) => r.original.id)
    if (selectedIpIds.length === 0) return

    setIsSubmitting(true)
    try {
      await bulkDeleteAssets(selectedIpIds)
      await mutate()
      setRowSelection({})
      toast.success(`Deleted ${selectedIpIds.length} IP addresses`)
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to delete IP addresses'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleExport = () => {
    const csv = [
      [
        'IP Address',
        'Version',
        'Type',
        'ASN',
        'Organization',
        'Status',
        'Risk Score',
        'Findings',
      ].join(','),
      ...ipAddresses.map((ip) =>
        [
          ip.name,
          getIpVersion(ip.name),
          isPublicIp(ip.name) ? 'Public' : 'Private',
          ip.metadata?.asn || '',
          ip.metadata?.asnOrganization || '',
          ip.status,
          ip.riskScore,
          ip.findingCount,
        ].join(',')
      ),
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'ip-addresses.csv'
    a.click()
    toast.success('IP addresses exported')
  }

  return (
    <>
      <Main>
        <PageHeader
          title="IP Addresses"
          description={`${ipAddresses.length} IPv4 and IPv6 addresses in your infrastructure`}
        >
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Can permission={Permission.AssetsWrite}>
              <Button
                onClick={() => {
                  setFormData(emptyIpForm)
                  setAddDialogOpen(true)
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add IP Address
              </Button>
            </Can>
          </div>
        </PageHeader>

        {/* Stats Cards */}
        <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Card
            className="cursor-pointer hover:border-primary transition-colors"
            onClick={() => {
              setStatusFilter('all')
              setIpTypeFilter('all')
            }}
          >
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Network className="h-4 w-4" />
                Total IPs
              </CardDescription>
              {isLoading ? (
                <Skeleton className="h-9 w-16 mt-1" />
              ) : (
                <CardTitle className="text-3xl">{statusCounts.all}</CardTitle>
              )}
            </CardHeader>
          </Card>
          <Card
            className={`cursor-pointer hover:border-purple-500 transition-colors ${ipTypeFilter === 'public' ? 'border-purple-500' : ''}`}
            onClick={() => {
              setStatusFilter('all')
              setIpTypeFilter('public')
            }}
          >
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-purple-600" />
                Public
              </CardDescription>
              {isLoading ? (
                <Skeleton className="h-9 w-16 mt-1" />
              ) : (
                <CardTitle className="text-3xl text-purple-600">{ipTypeCounts.public}</CardTitle>
              )}
            </CardHeader>
          </Card>
          <Card
            className={`cursor-pointer hover:border-blue-500 transition-colors ${ipTypeFilter === 'private' ? 'border-blue-500' : ''}`}
            onClick={() => {
              setStatusFilter('all')
              setIpTypeFilter('private')
            }}
          >
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-blue-600" />
                Private
              </CardDescription>
              {isLoading ? (
                <Skeleton className="h-9 w-16 mt-1" />
              ) : (
                <CardTitle className="text-3xl text-blue-600">{ipTypeCounts.private}</CardTitle>
              )}
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Server className="h-4 w-4 text-cyan-600" />
                IPv6
              </CardDescription>
              {isLoading ? (
                <Skeleton className="h-9 w-16 mt-1" />
              ) : (
                <CardTitle className="text-3xl text-cyan-600">{ipTypeCounts.ipv6}</CardTitle>
              )}
            </CardHeader>
          </Card>
        </div>

        {/* Scope Coverage Card */}
        <div className="mt-4">
          <ScopeCoverageCard
            coverage={scopeCoverage}
            title="Scope Coverage"
            showBreakdown={false}
          />
        </div>

        {/* Table Card */}
        <Card className="mt-6">
          <CardHeader>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Network className="h-5 w-5" />
                  All IP Addresses
                </CardTitle>
                <CardDescription>Manage your IP address assets</CardDescription>
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
                  placeholder="Search IP addresses..."
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
                      <DropdownMenuItem onClick={() => toast.info('Scanning selected IPs...')}>
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
                          setSelectedIp(row.original)
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
                        No IP addresses found.
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

      {/* IP Details Sheet */}
      <AssetDetailSheet
        asset={selectedIp}
        open={!!selectedIp && !editDialogOpen}
        onOpenChange={() => setSelectedIp(null)}
        icon={Network}
        iconColor="text-blue-500"
        gradientFrom="from-blue-500/20"
        gradientVia="via-blue-500/10"
        assetTypeName="IP Address"
        relationships={selectedIp ? getAssetRelationships(selectedIp.id) : []}
        onEdit={() => selectedIp && handleOpenEdit(selectedIp)}
        onDelete={() => {
          if (selectedIp) {
            setIpToDelete(selectedIp)
            setDeleteDialogOpen(true)
            setSelectedIp(null)
          }
        }}
        canEdit={canWriteAssets}
        canDelete={canDeleteAssets}
        quickActions={
          selectedIp && (
            <Button size="sm" variant="outline" onClick={() => handleCopyIp(selectedIp)}>
              <Copy className="mr-2 h-4 w-4" />
              Copy
            </Button>
          )
        }
        statsContent={
          selectedIp && (
            <StatsGrid>
              <StatCard
                icon={Shield}
                iconBg="bg-orange-500/10"
                iconColor="text-orange-500"
                value={selectedIp.riskScore}
                label="Risk Score"
              />
              <StatCard
                icon={AlertTriangle}
                iconBg="bg-red-500/10"
                iconColor="text-red-500"
                value={selectedIp.findingCount}
                label="Findings"
              />
            </StatsGrid>
          )
        }
        overviewContent={
          selectedIp && (
            <>
              {/* Scope Status Section */}
              {scopeMatchesMap.get(selectedIp.id) && (
                <div className="rounded-xl border p-4 bg-card space-y-3">
                  <SectionTitle>Scope Status</SectionTitle>
                  <div className="flex items-center gap-3">
                    <ScopeBadge match={scopeMatchesMap.get(selectedIp.id)!} showDetails />
                  </div>
                </div>
              )}

              {/* IP Information Section */}
              <div className="rounded-xl border p-4 bg-card space-y-3">
                <SectionTitle>IP Information</SectionTitle>
                <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
                  <div>
                    <p className="text-muted-foreground">Version</p>
                    <p className="font-medium">{getIpVersion(selectedIp.name).toUpperCase()}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Type</p>
                    <p className="font-medium">
                      {isPublicIp(selectedIp.name) ? 'Public' : 'Private'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">ASN</p>
                    <p className="font-medium">{selectedIp.metadata?.asn || '-'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Organization</p>
                    <p className="font-medium">{selectedIp.metadata?.asnOrganization || '-'}</p>
                  </div>
                </div>
                {selectedIp.metadata?.openPorts &&
                  (selectedIp.metadata.openPorts as number[]).length > 0 && (
                    <div>
                      <p className="text-muted-foreground text-sm mb-2">Open Ports</p>
                      <div className="flex flex-wrap gap-1">
                        {(selectedIp.metadata.openPorts as number[]).map((port) => (
                          <Badge key={port} variant="outline" className="text-xs font-mono">
                            {port}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
              </div>
            </>
          )
        }
      />

      {/* Add IP Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Network className="h-5 w-5" />
              Add IP Address
            </DialogTitle>
            <DialogDescription>Add a new IP address to your asset inventory</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="address">IP Address *</Label>
              <Input
                id="address"
                placeholder="192.168.1.1 or 2001:db8::1"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="asn">ASN</Label>
                <Input
                  id="asn"
                  placeholder="AS12345"
                  value={formData.asn}
                  onChange={(e) => setFormData({ ...formData, asn: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="organization">Organization</Label>
                <Input
                  id="organization"
                  placeholder="Example Corp"
                  value={formData.organization}
                  onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                />
              </div>
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
                placeholder="production, web-server"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddIp}>
              <Plus className="mr-2 h-4 w-4" />
              Add IP Address
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit IP Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5" />
              Edit IP Address
            </DialogTitle>
            <DialogDescription>Update IP address information</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-address">IP Address *</Label>
              <Input
                id="edit-address"
                placeholder="192.168.1.1"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-asn">ASN</Label>
                <Input
                  id="edit-asn"
                  placeholder="AS12345"
                  value={formData.asn}
                  onChange={(e) => setFormData({ ...formData, asn: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-organization">Organization</Label>
                <Input
                  id="edit-organization"
                  placeholder="Example Corp"
                  value={formData.organization}
                  onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                />
              </div>
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
                placeholder="production, web-server"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditIp}>
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
            <AlertDialogTitle>Delete IP Address</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{ipToDelete?.name}</strong>? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-500 hover:bg-red-600" onClick={handleDeleteIp}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
