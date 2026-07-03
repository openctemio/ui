'use client'

import { useState, useMemo, useEffect } from 'react'
import { useAssets } from '@/features/assets'
import { Main } from '@/components/layout'
import { PageHeader } from '@/features/shared'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Cloud,
  Plus,
  MoreHorizontal,
  Eye,
  Pencil,
  Trash2,
  Shield,
  AlertTriangle,
  CheckCircle2,
  Server,
  Database,
  HardDrive,
  Key,
  Lock,
  Globe,
  RefreshCw,
  Download,
  Filter,
  X,
  Search as SearchIcon,
  Box,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { toast } from 'sonner'
import { Can, Permission } from '@/lib/permissions'

type CloudProvider = 'aws' | 'azure' | 'gcp' | 'other'
type ResourceType = 'compute' | 'storage' | 'database' | 'network' | 'iam' | 'serverless'
type RiskLevel = 'critical' | 'high' | 'medium' | 'low'
type ResourceStatus = 'running' | 'stopped' | 'terminated' | 'unknown'
type ExposureLevel = 'public' | 'private' | 'internal'

interface CloudResource {
  id: string
  name: string
  provider: CloudProvider
  resourceType: ResourceType
  region: string
  accountId: string
  accountName?: string
  status: ResourceStatus
  exposure: ExposureLevel
  riskLevel: RiskLevel
  lastSeen: string
  discoveredAt: string
  findingsCount: number
  tags?: Record<string, string>
  publicIp?: string
  privateIp?: string
  notes?: string
}

const providerColors: Record<CloudProvider, string> = {
  aws: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  azure: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  gcp: 'bg-red-500/10 text-red-500 border-red-500/20',
  other: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
}

const providerLabels: Record<CloudProvider, string> = {
  aws: 'AWS',
  azure: 'Azure',
  gcp: 'GCP',
  other: 'Other',
}

const statusColors: Record<ResourceStatus, string> = {
  running: 'bg-green-500/10 text-green-500 border-green-500/20',
  stopped: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  terminated: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
  unknown: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
}

const exposureColors: Record<ExposureLevel, string> = {
  public: 'bg-red-500/10 text-red-500 border-red-500/20',
  private: 'bg-green-500/10 text-green-500 border-green-500/20',
  internal: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
}

const riskColors: Record<RiskLevel, string> = {
  critical: 'bg-red-500/10 text-red-500 border-red-500/20',
  high: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  medium: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  low: 'bg-green-500/10 text-green-500 border-green-500/20',
}

const typeIcons: Record<ResourceType, React.ElementType> = {
  compute: Server,
  storage: HardDrive,
  database: Database,
  network: Globe,
  iam: Key,
  serverless: Box,
}

export default function CloudSurfacePage() {
  // Fetch real cloud assets from API, fallback to mock for demo
  const { assets: apiAssets } = useAssets({
    types: ['cloud_account'],
    pageSize: 100,
  })

  const apiResources = useMemo<CloudResource[]>(() => {
    if (!apiAssets || apiAssets.length === 0) return []
    return apiAssets.map((a): CloudResource => ({
      id: a.id,
      name: a.name,
      provider: (a.metadata?.cloud_provider as CloudProvider) || 'aws',
      resourceType: (a.metadata?.resource_type as ResourceType) || 'compute',
      region: (a.metadata?.region as string) || 'unknown',
      accountId: (a.metadata?.account_id as string) || '',
      accountName: a.name,
      status: a.status === 'active' ? 'running' : 'stopped',
      exposure: String(a.exposure) === 'external' ? 'public' : 'private',
      riskLevel:
        a.riskScore >= 70
          ? 'critical'
          : a.riskScore >= 50
            ? 'high'
            : a.riskScore >= 30
              ? 'medium'
              : 'low',
      lastSeen: a.updatedAt || a.createdAt,
      discoveredAt: a.createdAt,
      findingsCount: a.findingCount || 0,
      tags: {},
    }))
  }, [apiAssets])

  // Real discovered resources from the assets API; empty until data loads.
  const [resources, setResources] = useState<CloudResource[]>([])
  useEffect(() => {
    setResources(apiResources)
  }, [apiResources])
  const [searchQuery, setSearchQuery] = useState('')
  const [filterProvider, setFilterProvider] = useState<CloudProvider | 'all'>('all')
  const [filterType, setFilterType] = useState<ResourceType | 'all'>('all')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [viewResource, setViewResource] = useState<CloudResource | null>(null)
  const [editResource, setEditResource] = useState<CloudResource | null>(null)
  const [deleteResource, setDeleteResource] = useState<CloudResource | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    provider: 'aws' as CloudProvider,
    resourceType: 'compute' as ResourceType,
    region: '',
    accountId: '',
    accountName: '',
    status: 'running' as ResourceStatus,
    exposure: 'private' as ExposureLevel,
    riskLevel: 'medium' as RiskLevel,
    publicIp: '',
    privateIp: '',
    notes: '',
  })

  const stats = useMemo(() => {
    const total = resources.length
    const clean = resources.filter((r) => r.findingsCount === 0).length
    return {
      total,
      running: resources.filter((r) => r.status === 'running').length,
      publicExposure: resources.filter((r) => r.exposure === 'public').length,
      critical: resources.filter((r) => r.riskLevel === 'critical').length,
      totalFindings: resources.reduce((acc, r) => acc + r.findingsCount, 0),
      // Real "clean rate": share of resources with no findings (was hardcoded 78%).
      cleanRate: total ? Math.round((clean / total) * 100) : 0,
      byProvider: {
        aws: resources.filter((r) => r.provider === 'aws').length,
        azure: resources.filter((r) => r.provider === 'azure').length,
        gcp: resources.filter((r) => r.provider === 'gcp').length,
      },
    }
  }, [resources])

  const filteredResources = useMemo(() => {
    return resources.filter((resource) => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        if (
          !resource.name.toLowerCase().includes(query) &&
          !resource.accountId.toLowerCase().includes(query)
        ) {
          return false
        }
      }
      if (filterProvider !== 'all' && resource.provider !== filterProvider) return false
      if (filterType !== 'all' && resource.resourceType !== filterType) return false
      return true
    })
  }, [resources, searchQuery, filterProvider, filterType])

  const resetForm = () => {
    setFormData({
      name: '',
      provider: 'aws',
      resourceType: 'compute',
      region: '',
      accountId: '',
      accountName: '',
      status: 'running',
      exposure: 'private',
      riskLevel: 'medium',
      publicIp: '',
      privateIp: '',
      notes: '',
    })
  }

  const handleCreate = () => {
    if (!formData.name || !formData.accountId || !formData.region) {
      toast.error('Please fill in all required fields')
      return
    }
    const newResource: CloudResource = {
      id: `cloud-${Date.now()}`,
      name: formData.name,
      provider: formData.provider,
      resourceType: formData.resourceType,
      region: formData.region,
      accountId: formData.accountId,
      accountName: formData.accountName || undefined,
      status: formData.status,
      exposure: formData.exposure,
      riskLevel: formData.riskLevel,
      lastSeen: new Date().toISOString(),
      discoveredAt: new Date().toISOString(),
      findingsCount: 0,
      publicIp: formData.publicIp || undefined,
      privateIp: formData.privateIp || undefined,
      notes: formData.notes || undefined,
    }
    setResources((prev) => [...prev, newResource])
    toast.success('Cloud resource added successfully')
    setIsCreateOpen(false)
    resetForm()
  }

  const handleEdit = () => {
    if (!editResource || !formData.name || !formData.accountId || !formData.region) {
      toast.error('Please fill in all required fields')
      return
    }
    setResources((prev) =>
      prev.map((r) =>
        r.id === editResource.id
          ? {
              ...r,
              name: formData.name,
              provider: formData.provider,
              resourceType: formData.resourceType,
              region: formData.region,
              accountId: formData.accountId,
              accountName: formData.accountName || undefined,
              status: formData.status,
              exposure: formData.exposure,
              riskLevel: formData.riskLevel,
              publicIp: formData.publicIp || undefined,
              privateIp: formData.privateIp || undefined,
              notes: formData.notes || undefined,
            }
          : r
      )
    )
    toast.success('Cloud resource updated successfully')
    setEditResource(null)
    resetForm()
  }

  const handleDelete = () => {
    if (!deleteResource) return
    setResources((prev) => prev.filter((r) => r.id !== deleteResource.id))
    toast.success('Cloud resource deleted successfully')
    setDeleteResource(null)
  }

  const openEdit = (resource: CloudResource) => {
    setFormData({
      name: resource.name,
      provider: resource.provider,
      resourceType: resource.resourceType,
      region: resource.region,
      accountId: resource.accountId,
      accountName: resource.accountName || '',
      status: resource.status,
      exposure: resource.exposure,
      riskLevel: resource.riskLevel,
      publicIp: resource.publicIp || '',
      privateIp: resource.privateIp || '',
      notes: resource.notes || '',
    })
    setEditResource(resource)
  }

  const formFields = (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Resource Name *</Label>
          <Input
            placeholder="e.g., prod-api-server"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Provider</Label>
          <Select
            value={formData.provider}
            onValueChange={(v) => setFormData({ ...formData, provider: v as CloudProvider })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="aws">AWS</SelectItem>
              <SelectItem value="azure">Azure</SelectItem>
              <SelectItem value="gcp">GCP</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Resource Type</Label>
          <Select
            value={formData.resourceType}
            onValueChange={(v) => setFormData({ ...formData, resourceType: v as ResourceType })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="compute">Compute</SelectItem>
              <SelectItem value="storage">Storage</SelectItem>
              <SelectItem value="database">Database</SelectItem>
              <SelectItem value="network">Network</SelectItem>
              <SelectItem value="iam">IAM</SelectItem>
              <SelectItem value="serverless">Serverless</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Region *</Label>
          <Input
            placeholder="e.g., ap-southeast-1"
            value={formData.region}
            onChange={(e) => setFormData({ ...formData, region: e.target.value })}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Account ID *</Label>
          <Input
            placeholder="e.g., 123456789012"
            value={formData.accountId}
            onChange={(e) => setFormData({ ...formData, accountId: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Account Name</Label>
          <Input
            placeholder="e.g., Production"
            value={formData.accountName}
            onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
          />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Status</Label>
          <Select
            value={formData.status}
            onValueChange={(v) => setFormData({ ...formData, status: v as ResourceStatus })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="running">Running</SelectItem>
              <SelectItem value="stopped">Stopped</SelectItem>
              <SelectItem value="terminated">Terminated</SelectItem>
              <SelectItem value="unknown">Unknown</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Exposure</Label>
          <Select
            value={formData.exposure}
            onValueChange={(v) => setFormData({ ...formData, exposure: v as ExposureLevel })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="public">Public</SelectItem>
              <SelectItem value="private">Private</SelectItem>
              <SelectItem value="internal">Internal</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Risk Level</Label>
          <Select
            value={formData.riskLevel}
            onValueChange={(v) => setFormData({ ...formData, riskLevel: v as RiskLevel })}
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
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Public IP</Label>
          <Input
            placeholder="e.g., 54.123.45.67"
            value={formData.publicIp}
            onChange={(e) => setFormData({ ...formData, publicIp: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Private IP</Label>
          <Input
            placeholder="e.g., 10.0.1.50"
            value={formData.privateIp}
            onChange={(e) => setFormData({ ...formData, privateIp: e.target.value })}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Notes</Label>
        <Input
          placeholder="Additional notes..."
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
        />
      </div>
    </div>
  )

  return (
    <>
      <Main>
        <PageHeader
          title="Cloud Attack Surface"
          description="Discover and monitor cloud resources across AWS, Azure, and GCP"
        >
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <RefreshCw className="me-2 h-4 w-4" />
              Sync Resources
            </Button>
            <Button variant="outline" size="sm">
              <Download className="me-2 h-4 w-4" />
              Export
            </Button>
            <Can permission={Permission.ScopeWrite}>
              <Button size="sm" onClick={() => setIsCreateOpen(true)}>
                <Plus className="me-2 h-4 w-4" />
                Add Resource
              </Button>
            </Can>
          </div>
        </PageHeader>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-5 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Resources</CardTitle>
              <Cloud className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">{stats.running} running</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Public Exposure</CardTitle>
              <Globe className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">{stats.publicExposure}</div>
              <p className="text-xs text-muted-foreground">Internet-facing</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Critical Risk</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">{stats.critical}</div>
              <p className="text-xs text-muted-foreground">Needs attention</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Findings</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalFindings}</div>
              <p className="text-xs text-muted-foreground">Misconfigurations</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Clean Resources</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">{stats.cleanRate}%</div>
              <Progress value={stats.cleanRate} className="mt-2" />
              <p className="text-muted-foreground mt-1 text-xs">No findings detected</p>
            </CardContent>
          </Card>
        </div>

        {/* Provider Distribution */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-sm">Cloud Provider Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-6">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className={providerColors.aws}>
                  AWS
                </Badge>
                <span className="text-sm font-medium">{stats.byProvider.aws} resources</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className={providerColors.azure}>
                  Azure
                </Badge>
                <span className="text-sm font-medium">{stats.byProvider.azure} resources</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className={providerColors.gcp}>
                  GCP
                </Badge>
                <span className="text-sm font-medium">{stats.byProvider.gcp} resources</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or account..."
                    className="ps-9"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select
                  value={filterProvider}
                  onValueChange={(v) => setFilterProvider(v as CloudProvider | 'all')}
                >
                  <SelectTrigger className="w-28">
                    <SelectValue placeholder="Provider" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="aws">AWS</SelectItem>
                    <SelectItem value="azure">Azure</SelectItem>
                    <SelectItem value="gcp">GCP</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={filterType}
                  onValueChange={(v) => setFilterType(v as ResourceType | 'all')}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="compute">Compute</SelectItem>
                    <SelectItem value="storage">Storage</SelectItem>
                    <SelectItem value="database">Database</SelectItem>
                    <SelectItem value="network">Network</SelectItem>
                    <SelectItem value="iam">IAM</SelectItem>
                    <SelectItem value="serverless">Serverless</SelectItem>
                  </SelectContent>
                </Select>
                {(filterProvider !== 'all' || filterType !== 'all' || searchQuery) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setFilterProvider('all')
                      setFilterType('all')
                      setSearchQuery('')
                    }}
                  >
                    <X className="me-1 h-3 w-3" />
                    Clear
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Resources Table */}
        <Card>
          <CardHeader>
            <CardTitle>Cloud Resources</CardTitle>
            <CardDescription>
              {filteredResources.length} of {resources.length} resources
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Resource</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Region</TableHead>
                  <TableHead>Exposure</TableHead>
                  <TableHead>Risk</TableHead>
                  <TableHead>Findings</TableHead>
                  <TableHead className="w-[50px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredResources.map((resource) => {
                  const TypeIcon = typeIcons[resource.resourceType]
                  return (
                    <TableRow
                      key={resource.id}
                      className="cursor-pointer"
                      onClick={() => setViewResource(resource)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                            <TypeIcon className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{resource.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {resource.accountName || resource.accountId}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={providerColors[resource.provider]}>
                          {providerLabels[resource.provider]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {resource.resourceType}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">{resource.region}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={exposureColors[resource.exposure]}>
                          {resource.exposure}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={riskColors[resource.riskLevel]}>
                          {resource.riskLevel}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span
                          className={
                            resource.findingsCount > 0 ? 'text-orange-500 font-medium' : ''
                          }
                        >
                          {resource.findingsCount}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Can permission={[Permission.ScopeWrite, Permission.ScopeDelete]}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setViewResource(resource)}>
                                <Eye className="me-2 h-4 w-4" />
                                View Details
                              </DropdownMenuItem>
                              <Can permission={Permission.ScopeWrite}>
                                <DropdownMenuItem onClick={() => openEdit(resource)}>
                                  <Pencil className="me-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                              </Can>
                              <Can permission={Permission.ScopeDelete}>
                                <DropdownMenuItem
                                  className="text-red-500"
                                  onClick={() => setDeleteResource(resource)}
                                >
                                  <Trash2 className="me-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </Can>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </Can>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </Main>

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Cloud Resource</DialogTitle>
            <DialogDescription>Add a new cloud resource to monitor</DialogDescription>
          </DialogHeader>
          {formFields}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate}>Add Resource</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editResource} onOpenChange={(open) => !open && setEditResource(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Cloud Resource</DialogTitle>
            <DialogDescription>Update resource information</DialogDescription>
          </DialogHeader>
          {formFields}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditResource(null)}>
              Cancel
            </Button>
            <Button onClick={handleEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteResource} onOpenChange={(open) => !open && setDeleteResource(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Resource</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{deleteResource?.name}&quot;? This action cannot
              be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteResource(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Sheet */}
      <Sheet open={!!viewResource} onOpenChange={(open) => !open && setViewResource(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          {viewResource && (
            <>
              <SheetHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                    <Cloud className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <SheetTitle>{viewResource.name}</SheetTitle>
                    <SheetDescription>
                      {viewResource.accountName || viewResource.accountId}
                    </SheetDescription>
                  </div>
                </div>
              </SheetHeader>

              <div className="mt-6 space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Provider</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Badge variant="outline" className={providerColors[viewResource.provider]}>
                        {providerLabels[viewResource.provider]}
                      </Badge>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Exposure</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Badge variant="outline" className={exposureColors[viewResource.exposure]}>
                        {viewResource.exposure}
                      </Badge>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Risk Level</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Badge variant="outline" className={riskColors[viewResource.riskLevel]}>
                        {viewResource.riskLevel}
                      </Badge>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Resource Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Type</span>
                      <span className="capitalize">{viewResource.resourceType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Region</span>
                      <span>{viewResource.region}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Account ID</span>
                      <code className="text-xs">{viewResource.accountId}</code>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status</span>
                      <Badge variant="outline" className={statusColors[viewResource.status]}>
                        {viewResource.status}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                {(viewResource.publicIp || viewResource.privateIp) && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Network</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      {viewResource.publicIp && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Public IP</span>
                          <code>{viewResource.publicIp}</code>
                        </div>
                      )}
                      {viewResource.privateIp && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Private IP</span>
                          <code>{viewResource.privateIp}</code>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {viewResource.tags && Object.keys(viewResource.tags).length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Tags</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(viewResource.tags).map(([key, value]) => (
                          <Badge key={key} variant="secondary">
                            {key}: {value}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Findings</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div
                        className={`text-2xl font-bold ${viewResource.findingsCount > 0 ? 'text-orange-500' : ''}`}
                      >
                        {viewResource.findingsCount}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Last Seen</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm">
                        {new Date(viewResource.lastSeen).toLocaleDateString()}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {viewResource.notes && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Notes</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">{viewResource.notes}</p>
                    </CardContent>
                  </Card>
                )}
              </div>

              <div className="mt-6 flex gap-2">
                <Button className="flex-1" variant="outline" onClick={() => openEdit(viewResource)}>
                  <Pencil className="me-2 h-4 w-4" />
                  Edit
                </Button>
                <Button className="flex-1">
                  <Lock className="me-2 h-4 w-4" />
                  View Findings
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}
