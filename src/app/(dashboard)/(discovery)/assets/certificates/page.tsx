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
  ShieldCheck,
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
  Clock,
  XCircle,
  Copy,
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
type CertStatusFilter = 'all' | 'valid' | 'expiring' | 'expired'

const statusFilters: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'pending', label: 'Pending' },
]

// Empty form state
const emptyCertForm = {
  name: '',
  issuer: '',
  subject: '',
  serialNumber: '',
  notBefore: '',
  notAfter: '',
  signatureAlgorithm: '',
  keySize: '',
  sans: '',
  description: '',
  tags: '',
}

// Helper to compute certificate validity status from metadata
function getCertStatus(asset: Asset): CertStatusFilter {
  const notAfter = asset.metadata?.certNotAfter as string | undefined
  if (!notAfter) return 'valid'

  const expiryDate = new Date(notAfter)
  const now = new Date()
  const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  if (daysUntilExpiry < 0) return 'expired'
  if (daysUntilExpiry <= 30) return 'expiring'
  return 'valid'
}

// Helper to compute days until expiry
function getDaysUntilExpiry(asset: Asset): number | null {
  const notAfter = asset.metadata?.certNotAfter as string | undefined
  if (!notAfter) return null

  const expiryDate = new Date(notAfter)
  const now = new Date()
  return Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

// Badge for certificate validity status
function CertStatusBadge({ status }: { status: CertStatusFilter }) {
  switch (status) {
    case 'valid':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-green-500/15 px-2.5 py-1 text-xs font-medium text-green-600">
          <CheckCircle className="h-3.5 w-3.5" />
          Valid
        </span>
      )
    case 'expiring':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-500/15 px-2.5 py-1 text-xs font-medium text-yellow-600">
          <Clock className="h-3.5 w-3.5" />
          Expiring
        </span>
      )
    case 'expired':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/15 px-2.5 py-1 text-xs font-medium text-red-600">
          <XCircle className="h-3.5 w-3.5" />
          Expired
        </span>
      )
    default:
      return null
  }
}

export default function CertificatesPage() {
  // Permission checks
  const { can } = usePermissions()
  const canWriteAssets = can(Permission.AssetsWrite)
  const canDeleteAssets = can(Permission.AssetsDelete)

  // Fetch certificates from API
  const {
    assets: certificates,
    isLoading,
    isError: _isError,
    error: _fetchError,
    mutate,
  } = useAssets({
    types: ['certificate'],
  })

  const [selectedCert, setSelectedCert] = useState<Asset | null>(null)
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [certStatusFilter, setCertStatusFilter] = useState<CertStatusFilter>('all')
  const [rowSelection, setRowSelection] = useState({})
  const [_isSubmitting, setIsSubmitting] = useState(false)

  // Dialog states
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [certToDelete, setCertToDelete] = useState<Asset | null>(null)

  // Form state
  const [formData, setFormData] = useState(emptyCertForm)

  // Filter data
  const filteredData = useMemo(() => {
    let data = [...certificates]

    // Asset status filter
    if (statusFilter !== 'all') {
      data = data.filter((cert) => cert.status === statusFilter)
    }

    // Certificate validity filter
    if (certStatusFilter !== 'all') {
      data = data.filter((cert) => getCertStatus(cert) === certStatusFilter)
    }

    return data
  }, [certificates, statusFilter, certStatusFilter])

  // Status counts
  const statusCounts = useMemo(
    () => ({
      all: certificates.length,
      active: certificates.filter((c) => c.status === 'active').length,
      inactive: certificates.filter((c) => c.status === 'inactive').length,
      pending: certificates.filter((c) => c.status === 'pending').length,
    }),
    [certificates]
  )

  // Certificate validity counts
  const certStatusCounts = useMemo(
    () => ({
      valid: certificates.filter((c) => getCertStatus(c) === 'valid').length,
      expiring: certificates.filter((c) => getCertStatus(c) === 'expiring').length,
      expired: certificates.filter((c) => getCertStatus(c) === 'expired').length,
    }),
    [certificates]
  )

  // Scope data
  const scopeTargets = useMemo(() => getActiveScopeTargets(), [])
  const scopeExclusions = useMemo(() => getActiveScopeExclusions(), [])

  // Compute scope matches for each certificate
  const scopeMatchesMap = useMemo(() => {
    const map = new Map<string, ScopeMatchResult>()
    certificates.forEach((cert) => {
      const match = getScopeMatchesForAsset(
        { id: cert.id, type: 'certificate', name: cert.name },
        scopeTargets,
        scopeExclusions
      )
      map.set(cert.id, match)
    })
    return map
  }, [certificates, scopeTargets, scopeExclusions])

  // Calculate scope coverage
  const scopeCoverage = useMemo(() => {
    const assets = certificates.map((cert) => ({
      id: cert.id,
      name: cert.name,
      type: 'certificate',
    }))
    return calculateScopeCoverage(assets, scopeTargets, scopeExclusions)
  }, [certificates, scopeTargets, scopeExclusions])

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
          Certificate
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const cert = row.original
        const isWildcard = cert.metadata?.certIsWildcard as boolean | undefined
        const sans = cert.metadata?.certSans as string[] | undefined
        return (
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-green-500" />
            <div>
              <p className="font-medium">{cert.name}</p>
              <p className="text-xs text-muted-foreground">
                {isWildcard && 'Wildcard · '}
                {sans ? `${sans.length} SAN(s)` : 'No SANs'}
              </p>
            </div>
          </div>
        )
      },
    },
    {
      id: 'issuer',
      header: 'Issuer',
      cell: ({ row }) => {
        const issuer = (row.original.metadata?.certIssuer as string) || '-'
        return <span className="text-muted-foreground">{issuer}</span>
      },
    },
    {
      id: 'validUntil',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="-ml-4"
        >
          Valid Until
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      accessorFn: (row) => row.metadata?.certNotAfter || '',
      cell: ({ row }) => {
        const notAfter = row.original.metadata?.certNotAfter as string | undefined
        if (!notAfter) return <span className="text-muted-foreground">-</span>
        return <span className="text-sm">{new Date(notAfter).toLocaleDateString()}</span>
      },
    },
    {
      id: 'daysLeft',
      header: 'Days Left',
      cell: ({ row }) => {
        const days = getDaysUntilExpiry(row.original)
        if (days === null) return <span className="text-muted-foreground">-</span>
        if (days < 0)
          return <span className="font-medium text-red-600">Expired {Math.abs(days)}d ago</span>
        if (days <= 30) return <span className="font-medium text-yellow-600">{days}d</span>
        return <span>{days}d</span>
      },
    },
    {
      id: 'certStatus',
      header: 'Validity',
      cell: ({ row }) => <CertStatusBadge status={getCertStatus(row.original)} />,
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
        const cert = row.original
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={(e) => e.stopPropagation()}
                aria-label="Actions"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation()
                  setSelectedCert(cert)
                }}
              >
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>
              <Can permission={Permission.AssetsWrite}>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation()
                    handleOpenEdit(cert)
                  }}
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
              </Can>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation()
                  handleCopyCert(cert)
                }}
              >
                <Copy className="mr-2 h-4 w-4" />
                Copy Name
              </DropdownMenuItem>
              <Can permission={Permission.AssetsDelete}>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-red-400"
                  onClick={(e) => {
                    e.stopPropagation()
                    setCertToDelete(cert)
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
  const handleCopyCert = (cert: Asset) => {
    navigator.clipboard.writeText(cert.name)
    toast.success('Certificate name copied to clipboard')
  }

  const handleOpenEdit = (cert: Asset) => {
    setFormData({
      name: cert.name,
      issuer: (cert.metadata?.certIssuer as string) || '',
      subject: (cert.metadata?.certSubject as string) || '',
      serialNumber: (cert.metadata?.certSerialNumber as string) || '',
      notBefore: (cert.metadata?.certNotBefore as string) || '',
      notAfter: (cert.metadata?.certNotAfter as string) || '',
      signatureAlgorithm: (cert.metadata?.certSignatureAlgorithm as string) || '',
      keySize: cert.metadata?.certKeySize ? String(cert.metadata.certKeySize) : '',
      sans: (cert.metadata?.certSans as string[])?.join(', ') || '',
      description: cert.description || '',
      tags: cert.tags?.join(', ') || '',
    })
    setSelectedCert(cert)
    setEditDialogOpen(true)
  }

  const buildCertMetadata = () => ({
    certIssuer: formData.issuer || undefined,
    certSubject: formData.subject || undefined,
    certSerialNumber: formData.serialNumber || undefined,
    certNotBefore: formData.notBefore || undefined,
    certNotAfter: formData.notAfter || undefined,
    certSignatureAlgorithm: formData.signatureAlgorithm || undefined,
    certKeySize: formData.keySize ? parseInt(formData.keySize, 10) : undefined,
    certSans: formData.sans
      ? formData.sans
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : undefined,
  })

  const handleAddCert = async () => {
    if (!formData.name) {
      toast.error('Please fill in the certificate name')
      return
    }

    setIsSubmitting(true)
    try {
      await createAsset({
        name: formData.name,
        type: 'certificate',
        criticality: 'medium',
        description: formData.description,
        tags: formData.tags
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        metadata: buildCertMetadata(),
      })
      await mutate()
      setFormData(emptyCertForm)
      setAddDialogOpen(false)
      toast.success('Certificate added successfully')
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to add certificate'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditCert = async () => {
    if (!selectedCert || !formData.name) {
      toast.error('Please fill in required fields')
      return
    }

    setIsSubmitting(true)
    try {
      await updateAsset(selectedCert.id, {
        name: formData.name,
        description: formData.description,
        tags: formData.tags
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        metadata: {
          ...selectedCert.metadata,
          ...buildCertMetadata(),
        },
      })
      await mutate()
      setFormData(emptyCertForm)
      setEditDialogOpen(false)
      setSelectedCert(null)
      toast.success('Certificate updated successfully')
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to update certificate'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteCert = async () => {
    if (!certToDelete) return
    setIsSubmitting(true)
    try {
      await deleteAsset(certToDelete.id)
      await mutate()
      setDeleteDialogOpen(false)
      setCertToDelete(null)
      toast.success('Certificate deleted successfully')
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to delete certificate'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleBulkDelete = async () => {
    const selectedIds = table.getSelectedRowModel().rows.map((r) => r.original.id)
    if (selectedIds.length === 0) return

    setIsSubmitting(true)
    try {
      await bulkDeleteAssets(selectedIds)
      await mutate()
      setRowSelection({})
      toast.success(`Deleted ${selectedIds.length} certificates`)
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to delete certificates'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleExport = () => {
    const csv = [
      [
        'Certificate',
        'Issuer',
        'Subject',
        'Valid From',
        'Valid To',
        'Days Left',
        'Status',
        'Risk Score',
        'Findings',
      ].join(','),
      ...certificates.map((cert) => {
        const days = getDaysUntilExpiry(cert)
        return [
          `"${cert.name}"`,
          `"${(cert.metadata?.certIssuer as string) || ''}"`,
          `"${(cert.metadata?.certSubject as string) || ''}"`,
          (cert.metadata?.certNotBefore as string) || '',
          (cert.metadata?.certNotAfter as string) || '',
          days !== null ? days : '',
          getCertStatus(cert),
          cert.riskScore,
          cert.findingCount,
        ].join(',')
      }),
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'certificates.csv'
    a.click()
    toast.success('Certificates exported')
  }

  // Certificate form fields (shared between Add and Edit dialogs)
  const CertFormFields = () => (
    <div className="space-y-4 py-4">
      <div className="space-y-2">
        <Label htmlFor="cert-name">Certificate Name / CN *</Label>
        <Input
          id="cert-name"
          placeholder="*.example.com"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="cert-issuer">Issuer</Label>
          <Input
            id="cert-issuer"
            placeholder="Let's Encrypt, DigiCert..."
            value={formData.issuer}
            onChange={(e) => setFormData({ ...formData, issuer: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cert-subject">Subject</Label>
          <Input
            id="cert-subject"
            placeholder="CN=*.example.com"
            value={formData.subject}
            onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
          />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="cert-not-before">Valid From</Label>
          <Input
            id="cert-not-before"
            type="date"
            value={formData.notBefore}
            onChange={(e) => setFormData({ ...formData, notBefore: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cert-not-after">Valid Until</Label>
          <Input
            id="cert-not-after"
            type="date"
            value={formData.notAfter}
            onChange={(e) => setFormData({ ...formData, notAfter: e.target.value })}
          />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="cert-algorithm">Signature Algorithm</Label>
          <Input
            id="cert-algorithm"
            placeholder="SHA256withRSA"
            value={formData.signatureAlgorithm}
            onChange={(e) => setFormData({ ...formData, signatureAlgorithm: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cert-keysize">Key Size (bits)</Label>
          <Input
            id="cert-keysize"
            placeholder="2048"
            value={formData.keySize}
            onChange={(e) => setFormData({ ...formData, keySize: e.target.value })}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="cert-serial">Serial Number</Label>
        <Input
          id="cert-serial"
          placeholder="03:A1:..."
          value={formData.serialNumber}
          onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="cert-sans">Subject Alternative Names (comma separated)</Label>
        <Input
          id="cert-sans"
          placeholder="example.com, *.example.com, api.example.com"
          value={formData.sans}
          onChange={(e) => setFormData({ ...formData, sans: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="cert-description">Description</Label>
        <Textarea
          id="cert-description"
          placeholder="Optional description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="cert-tags">Tags (comma separated)</Label>
        <Input
          id="cert-tags"
          placeholder="production, wildcard, lets-encrypt"
          value={formData.tags}
          onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
        />
      </div>
    </div>
  )

  return (
    <>
      <Main>
        <PageHeader
          title="Certificates"
          description={`${certificates.length} SSL/TLS certificates across your infrastructure`}
        >
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Can permission={Permission.AssetsWrite}>
              <Button
                onClick={() => {
                  setFormData(emptyCertForm)
                  setAddDialogOpen(true)
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Certificate
              </Button>
            </Can>
          </div>
        </PageHeader>

        {/* Stats Cards */}
        <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Card
            className="cursor-pointer transition-colors hover:border-primary"
            onClick={() => setCertStatusFilter('all')}
          >
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" />
                Total Certificates
              </CardDescription>
              {isLoading ? (
                <Skeleton className="mt-1 h-9 w-16" />
              ) : (
                <CardTitle className="text-3xl">{statusCounts.all}</CardTitle>
              )}
            </CardHeader>
          </Card>
          <Card
            className={`cursor-pointer transition-colors hover:border-green-500 ${certStatusFilter === 'valid' ? 'border-green-500' : ''}`}
            onClick={() => setCertStatusFilter('valid')}
          >
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                Valid
              </CardDescription>
              {isLoading ? (
                <Skeleton className="mt-1 h-9 w-16" />
              ) : (
                <CardTitle className="text-3xl text-green-600">{certStatusCounts.valid}</CardTitle>
              )}
            </CardHeader>
          </Card>
          <Card
            className={`cursor-pointer transition-colors hover:border-yellow-500 ${certStatusFilter === 'expiring' ? 'border-yellow-500' : ''}`}
            onClick={() => setCertStatusFilter('expiring')}
          >
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-yellow-600" />
                Expiring Soon
              </CardDescription>
              {isLoading ? (
                <Skeleton className="mt-1 h-9 w-16" />
              ) : (
                <CardTitle className="text-3xl text-yellow-600">
                  {certStatusCounts.expiring}
                </CardTitle>
              )}
            </CardHeader>
          </Card>
          <Card
            className={`cursor-pointer transition-colors hover:border-red-500 ${certStatusFilter === 'expired' ? 'border-red-500' : ''}`}
            onClick={() => setCertStatusFilter('expired')}
          >
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-600" />
                Expired
              </CardDescription>
              {isLoading ? (
                <Skeleton className="mt-1 h-9 w-16" />
              ) : (
                <CardTitle className="text-3xl text-red-600">{certStatusCounts.expired}</CardTitle>
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
                  <ShieldCheck className="h-5 w-5" />
                  All Certificates
                </CardTitle>
                <CardDescription>Manage your SSL/TLS certificate assets</CardDescription>
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
            <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative max-w-sm flex-1">
                <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search certificates..."
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
                      <Can permission={Permission.AssetsDelete}>
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
            <div className="overflow-x-auto rounded-md border">
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
                          setSelectedCert(row.original)
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
                        No certificates found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            <div className="mt-4 flex items-center justify-between">
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

      {/* Certificate Details Sheet */}
      <AssetDetailSheet
        asset={selectedCert}
        open={!!selectedCert && !editDialogOpen}
        onOpenChange={() => setSelectedCert(null)}
        icon={ShieldCheck}
        iconColor="text-green-500"
        gradientFrom="from-green-500/20"
        gradientVia="via-green-500/10"
        assetTypeName="Certificate"
        relationships={selectedCert ? getAssetRelationships(selectedCert.id) : []}
        onEdit={() => selectedCert && handleOpenEdit(selectedCert)}
        onDelete={() => {
          if (selectedCert) {
            setCertToDelete(selectedCert)
            setDeleteDialogOpen(true)
            setSelectedCert(null)
          }
        }}
        canEdit={canWriteAssets}
        canDelete={canDeleteAssets}
        quickActions={
          selectedCert && (
            <Button size="sm" variant="outline" onClick={() => handleCopyCert(selectedCert)}>
              <Copy className="mr-2 h-4 w-4" />
              Copy
            </Button>
          )
        }
        statsContent={
          selectedCert && (
            <StatsGrid>
              <StatCard
                icon={Shield}
                iconBg="bg-orange-500/10"
                iconColor="text-orange-500"
                value={selectedCert.riskScore}
                label="Risk Score"
              />
              <StatCard
                icon={AlertTriangle}
                iconBg="bg-red-500/10"
                iconColor="text-red-500"
                value={selectedCert.findingCount}
                label="Findings"
              />
            </StatsGrid>
          )
        }
        overviewContent={
          selectedCert && (
            <>
              {/* Scope Status */}
              {scopeMatchesMap.get(selectedCert.id) && (
                <div className="space-y-3 rounded-xl border bg-card p-4">
                  <SectionTitle>Scope Status</SectionTitle>
                  <div className="flex items-center gap-3">
                    <ScopeBadge match={scopeMatchesMap.get(selectedCert.id)!} showDetails />
                  </div>
                </div>
              )}

              {/* Certificate Validity */}
              <div className="space-y-3 rounded-xl border bg-card p-4">
                <SectionTitle>Validity</SectionTitle>
                <div className="flex items-center gap-3">
                  <CertStatusBadge status={getCertStatus(selectedCert)} />
                  {(() => {
                    const days = getDaysUntilExpiry(selectedCert)
                    if (days === null) return null
                    if (days < 0)
                      return (
                        <span className="text-sm text-red-600">
                          Expired {Math.abs(days)} days ago
                        </span>
                      )
                    return (
                      <span className="text-sm text-muted-foreground">{days} days remaining</span>
                    )
                  })()}
                </div>
              </div>

              {/* Certificate Details */}
              <div className="space-y-3 rounded-xl border bg-card p-4">
                <SectionTitle>Certificate Details</SectionTitle>
                <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
                  <div>
                    <p className="text-muted-foreground">Issuer</p>
                    <p className="font-medium">
                      {(selectedCert.metadata?.certIssuer as string) || '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Subject</p>
                    <p className="font-medium">
                      {(selectedCert.metadata?.certSubject as string) || '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Valid From</p>
                    <p className="font-medium">
                      {selectedCert.metadata?.certNotBefore
                        ? new Date(
                            selectedCert.metadata.certNotBefore as string
                          ).toLocaleDateString()
                        : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Valid Until</p>
                    <p className="font-medium">
                      {selectedCert.metadata?.certNotAfter
                        ? new Date(
                            selectedCert.metadata.certNotAfter as string
                          ).toLocaleDateString()
                        : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Algorithm</p>
                    <p className="font-medium">
                      {(selectedCert.metadata?.certSignatureAlgorithm as string) || '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Key Size</p>
                    <p className="font-medium">
                      {selectedCert.metadata?.certKeySize
                        ? `${selectedCert.metadata.certKeySize} bits`
                        : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Serial Number</p>
                    <p className="break-all font-mono text-xs">
                      {(selectedCert.metadata?.certSerialNumber as string) || '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Wildcard</p>
                    <p className="font-medium">
                      {selectedCert.metadata?.certIsWildcard ? 'Yes' : 'No'}
                    </p>
                  </div>
                </div>
                {selectedCert.metadata?.certSans &&
                  (selectedCert.metadata.certSans as string[]).length > 0 && (
                    <div>
                      <p className="mb-2 text-sm text-muted-foreground">
                        Subject Alternative Names
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {(selectedCert.metadata.certSans as string[]).map((san) => (
                          <Badge key={san} variant="outline" className="text-xs">
                            {san}
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

      {/* Add Certificate Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" />
              Add Certificate
            </DialogTitle>
            <DialogDescription>
              Add a new SSL/TLS certificate to your asset inventory
            </DialogDescription>
          </DialogHeader>
          <CertFormFields />
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddCert}>
              <Plus className="mr-2 h-4 w-4" />
              Add Certificate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Certificate Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5" />
              Edit Certificate
            </DialogTitle>
            <DialogDescription>Update certificate information</DialogDescription>
          </DialogHeader>
          <CertFormFields />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditCert}>
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
            <AlertDialogTitle>Delete Certificate</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{certToDelete?.name}</strong>? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-500 hover:bg-red-600" onClick={handleDeleteCert}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
