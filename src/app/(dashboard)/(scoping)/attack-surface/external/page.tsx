'use client'

import { useState, useMemo } from 'react'
import { Main } from '@/components/layout'
import { PageHeader } from '@/features/shared'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Globe,
  Plus,
  MoreHorizontal,
  Eye,
  Pencil,
  Trash2,
  ExternalLink,
  Shield,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Server,
  Lock,
  Unlock,
  RefreshCw,
  Download,
  Filter,
  X,
  Search as SearchIcon,
  ArrowUpRight,
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

type AssetStatus = 'active' | 'inactive' | 'monitoring'
type RiskLevel = 'critical' | 'high' | 'medium' | 'low'
type AssetType = 'domain' | 'subdomain' | 'service' | 'certificate'

interface ExternalAsset {
  id: string
  name: string
  type: AssetType
  parentDomain?: string
  ipAddress?: string
  port?: number
  status: AssetStatus
  riskLevel: RiskLevel
  sslExpiry?: string
  lastSeen: string
  discoveredAt: string
  findingsCount: number
  technologies?: string[]
  notes?: string
}

const daysAgo = (days: number) => {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date.toISOString()
}

const daysFromNow = (days: number) => {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString()
}

const mockExternalAssets: ExternalAsset[] = [
  {
    id: 'ext-001',
    name: 'techcombank.com.vn',
    type: 'domain',
    ipAddress: '203.162.4.100',
    status: 'active',
    riskLevel: 'low',
    sslExpiry: daysFromNow(120),
    lastSeen: daysAgo(0),
    discoveredAt: daysAgo(365),
    findingsCount: 2,
    technologies: ['Nginx', 'React', 'Node.js'],
  },
  {
    id: 'ext-002',
    name: 'api.techcombank.com.vn',
    type: 'subdomain',
    parentDomain: 'techcombank.com.vn',
    ipAddress: '203.162.4.101',
    port: 443,
    status: 'active',
    riskLevel: 'medium',
    sslExpiry: daysFromNow(90),
    lastSeen: daysAgo(0),
    discoveredAt: daysAgo(300),
    findingsCount: 5,
    technologies: ['Kong Gateway', 'Express.js'],
  },
  {
    id: 'ext-003',
    name: 'mail.techcombank.com.vn',
    type: 'service',
    parentDomain: 'techcombank.com.vn',
    ipAddress: '203.162.4.102',
    port: 25,
    status: 'active',
    riskLevel: 'critical',
    lastSeen: daysAgo(0),
    discoveredAt: daysAgo(365),
    findingsCount: 8,
    technologies: ['Postfix', 'Dovecot'],
    notes: 'Open relay detected - requires immediate attention',
  },
  {
    id: 'ext-004',
    name: 'vpn.techcombank.com.vn',
    type: 'service',
    parentDomain: 'techcombank.com.vn',
    ipAddress: '203.162.4.103',
    port: 443,
    status: 'active',
    riskLevel: 'high',
    sslExpiry: daysFromNow(30),
    lastSeen: daysAgo(0),
    discoveredAt: daysAgo(200),
    findingsCount: 3,
    technologies: ['OpenVPN', 'FortiGate'],
    notes: 'SSL certificate expiring soon',
  },
  {
    id: 'ext-005',
    name: 'cdn.techcombank.com.vn',
    type: 'subdomain',
    parentDomain: 'techcombank.com.vn',
    ipAddress: '104.16.88.20',
    status: 'active',
    riskLevel: 'low',
    sslExpiry: daysFromNow(200),
    lastSeen: daysAgo(0),
    discoveredAt: daysAgo(180),
    findingsCount: 0,
    technologies: ['Cloudflare'],
  },
  {
    id: 'ext-006',
    name: 'staging.techcombank.com.vn',
    type: 'subdomain',
    parentDomain: 'techcombank.com.vn',
    ipAddress: '10.0.5.50',
    status: 'monitoring',
    riskLevel: 'high',
    lastSeen: daysAgo(1),
    discoveredAt: daysAgo(30),
    findingsCount: 12,
    technologies: ['Docker', 'Kubernetes'],
    notes: 'Staging environment exposed to internet',
  },
  {
    id: 'ext-007',
    name: 'dev.techcombank.com.vn',
    type: 'subdomain',
    parentDomain: 'techcombank.com.vn',
    ipAddress: '10.0.5.51',
    status: 'inactive',
    riskLevel: 'medium',
    lastSeen: daysAgo(7),
    discoveredAt: daysAgo(60),
    findingsCount: 4,
  },
  {
    id: 'ext-008',
    name: 'ftp.techcombank.com.vn',
    type: 'service',
    parentDomain: 'techcombank.com.vn',
    ipAddress: '203.162.4.110',
    port: 21,
    status: 'active',
    riskLevel: 'critical',
    lastSeen: daysAgo(0),
    discoveredAt: daysAgo(365),
    findingsCount: 15,
    technologies: ['vsftpd'],
    notes: 'FTP should be replaced with SFTP',
  },
]

const statusColors: Record<AssetStatus, string> = {
  active: 'bg-green-500/10 text-green-500 border-green-500/20',
  inactive: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
  monitoring: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
}

const riskColors: Record<RiskLevel, string> = {
  critical: 'bg-red-500/10 text-red-500 border-red-500/20',
  high: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  medium: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  low: 'bg-green-500/10 text-green-500 border-green-500/20',
}

const typeIcons: Record<AssetType, React.ElementType> = {
  domain: Globe,
  subdomain: ArrowUpRight,
  service: Server,
  certificate: Lock,
}

export default function ExternalSurfacePage() {
  const [assets, setAssets] = useState<ExternalAsset[]>(mockExternalAssets)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<AssetType | 'all'>('all')
  const [filterRisk, setFilterRisk] = useState<RiskLevel | 'all'>('all')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [viewAsset, setViewAsset] = useState<ExternalAsset | null>(null)
  const [editAsset, setEditAsset] = useState<ExternalAsset | null>(null)
  const [deleteAsset, setDeleteAsset] = useState<ExternalAsset | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    type: 'subdomain' as AssetType,
    parentDomain: '',
    ipAddress: '',
    port: '',
    status: 'active' as AssetStatus,
    riskLevel: 'medium' as RiskLevel,
    notes: '',
  })

  // Use lazy state initialization for current time
  const [currentTime] = useState(() => Date.now())

  const stats = useMemo(() => {
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000
    return {
      total: assets.length,
      active: assets.filter((a) => a.status === 'active').length,
      critical: assets.filter((a) => a.riskLevel === 'critical').length,
      totalFindings: assets.reduce((acc, a) => acc + a.findingsCount, 0),
      expiringCerts: assets.filter((a) => {
        if (!a.sslExpiry) return false
        const expiryTime = new Date(a.sslExpiry).getTime()
        return expiryTime - currentTime <= thirtyDaysMs
      }).length,
    }
  }, [assets, currentTime])

  const filteredAssets = useMemo(() => {
    return assets.filter((asset) => {
      if (searchQuery && !asset.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false
      }
      if (filterType !== 'all' && asset.type !== filterType) return false
      if (filterRisk !== 'all' && asset.riskLevel !== filterRisk) return false
      return true
    })
  }, [assets, searchQuery, filterType, filterRisk])

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'subdomain',
      parentDomain: '',
      ipAddress: '',
      port: '',
      status: 'active',
      riskLevel: 'medium',
      notes: '',
    })
  }

  const handleCreate = () => {
    if (!formData.name) {
      toast.error('Please enter an asset name')
      return
    }
    const newAsset: ExternalAsset = {
      id: `ext-${Date.now()}`,
      name: formData.name,
      type: formData.type,
      parentDomain: formData.parentDomain || undefined,
      ipAddress: formData.ipAddress || undefined,
      port: formData.port ? parseInt(formData.port) : undefined,
      status: formData.status,
      riskLevel: formData.riskLevel,
      lastSeen: new Date().toISOString(),
      discoveredAt: new Date().toISOString(),
      findingsCount: 0,
      notes: formData.notes || undefined,
    }
    setAssets((prev) => [...prev, newAsset])
    toast.success('External asset added successfully')
    setIsCreateOpen(false)
    resetForm()
  }

  const handleEdit = () => {
    if (!editAsset || !formData.name) {
      toast.error('Please enter an asset name')
      return
    }
    setAssets((prev) =>
      prev.map((a) =>
        a.id === editAsset.id
          ? {
              ...a,
              name: formData.name,
              type: formData.type,
              parentDomain: formData.parentDomain || undefined,
              ipAddress: formData.ipAddress || undefined,
              port: formData.port ? parseInt(formData.port) : undefined,
              status: formData.status,
              riskLevel: formData.riskLevel,
              notes: formData.notes || undefined,
            }
          : a
      )
    )
    toast.success('External asset updated successfully')
    setEditAsset(null)
    resetForm()
  }

  const handleDelete = () => {
    if (!deleteAsset) return
    setAssets((prev) => prev.filter((a) => a.id !== deleteAsset.id))
    toast.success('External asset deleted successfully')
    setDeleteAsset(null)
  }

  const openEdit = (asset: ExternalAsset) => {
    setFormData({
      name: asset.name,
      type: asset.type,
      parentDomain: asset.parentDomain || '',
      ipAddress: asset.ipAddress || '',
      port: asset.port?.toString() || '',
      status: asset.status,
      riskLevel: asset.riskLevel,
      notes: asset.notes || '',
    })
    setEditAsset(asset)
  }

  const formFields = (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Asset Name *</Label>
          <Input
            placeholder="e.g., api.example.com"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Type</Label>
          <Select
            value={formData.type}
            onValueChange={(v) => setFormData({ ...formData, type: v as AssetType })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="domain">Domain</SelectItem>
              <SelectItem value="subdomain">Subdomain</SelectItem>
              <SelectItem value="service">Service</SelectItem>
              <SelectItem value="certificate">Certificate</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Parent Domain</Label>
          <Input
            placeholder="e.g., example.com"
            value={formData.parentDomain}
            onChange={(e) => setFormData({ ...formData, parentDomain: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>IP Address</Label>
          <Input
            placeholder="e.g., 192.168.1.1"
            value={formData.ipAddress}
            onChange={(e) => setFormData({ ...formData, ipAddress: e.target.value })}
          />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Port</Label>
          <Input
            type="number"
            placeholder="e.g., 443"
            value={formData.port}
            onChange={(e) => setFormData({ ...formData, port: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Status</Label>
          <Select
            value={formData.status}
            onValueChange={(v) => setFormData({ ...formData, status: v as AssetStatus })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="monitoring">Monitoring</SelectItem>
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
          title="External Attack Surface"
          description="Monitor and manage internet-facing assets and their exposure"
        >
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <RefreshCw className="mr-2 h-4 w-4" />
              Scan Now
            </Button>
            <Button variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Can permission={Permission.ScopeWrite}>
              <Button size="sm" onClick={() => setIsCreateOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Asset
              </Button>
            </Can>
          </div>
        </PageHeader>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-5 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
              <Globe className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">{stats.active} active</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Critical Risk</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">{stats.critical}</div>
              <p className="text-xs text-muted-foreground">Needs immediate attention</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Findings</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalFindings}</div>
              <p className="text-xs text-muted-foreground">Across all assets</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Expiring Certs</CardTitle>
              <Clock className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-500">{stats.expiringCerts}</div>
              <p className="text-xs text-muted-foreground">Within 30 days</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Coverage</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">94%</div>
              <Progress value={94} className="mt-2" />
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search assets..."
                    className="pl-9"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select
                  value={filterType}
                  onValueChange={(v) => setFilterType(v as AssetType | 'all')}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="domain">Domain</SelectItem>
                    <SelectItem value="subdomain">Subdomain</SelectItem>
                    <SelectItem value="service">Service</SelectItem>
                    <SelectItem value="certificate">Certificate</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={filterRisk}
                  onValueChange={(v) => setFilterRisk(v as RiskLevel | 'all')}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Risk" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Risks</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
                {(filterType !== 'all' || filterRisk !== 'all' || searchQuery) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setFilterType('all')
                      setFilterRisk('all')
                      setSearchQuery('')
                    }}
                  >
                    <X className="mr-1 h-3 w-3" />
                    Clear
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Assets Table */}
        <Card>
          <CardHeader>
            <CardTitle>External Assets</CardTitle>
            <CardDescription>
              {filteredAssets.length} of {assets.length} assets
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Asset</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>IP / Port</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Risk</TableHead>
                  <TableHead>Findings</TableHead>
                  <TableHead>Last Seen</TableHead>
                  <TableHead className="w-[50px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAssets.map((asset) => {
                  const TypeIcon = typeIcons[asset.type]
                  return (
                    <TableRow
                      key={asset.id}
                      className="cursor-pointer"
                      onClick={() => setViewAsset(asset)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                            <TypeIcon className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{asset.name}</p>
                            {asset.parentDomain && (
                              <p className="text-xs text-muted-foreground">{asset.parentDomain}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {asset.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs">
                          {asset.ipAddress}
                          {asset.port && `:${asset.port}`}
                        </code>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusColors[asset.status]}>
                          {asset.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={riskColors[asset.riskLevel]}>
                          {asset.riskLevel}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span
                          className={asset.findingsCount > 0 ? 'text-orange-500 font-medium' : ''}
                        >
                          {asset.findingsCount}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(asset.lastSeen).toLocaleDateString()}
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
                              <DropdownMenuItem onClick={() => setViewAsset(asset)}>
                                <Eye className="mr-2 h-4 w-4" />
                                View Details
                              </DropdownMenuItem>
                              <Can permission={Permission.ScopeWrite}>
                                <DropdownMenuItem onClick={() => openEdit(asset)}>
                                  <Pencil className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                              </Can>
                              <Can permission={Permission.ScopeDelete}>
                                <DropdownMenuItem
                                  className="text-red-500"
                                  onClick={() => setDeleteAsset(asset)}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
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
            <DialogTitle>Add External Asset</DialogTitle>
            <DialogDescription>Add a new internet-facing asset to monitor</DialogDescription>
          </DialogHeader>
          {formFields}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate}>Add Asset</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editAsset} onOpenChange={(open) => !open && setEditAsset(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit External Asset</DialogTitle>
            <DialogDescription>Update asset information</DialogDescription>
          </DialogHeader>
          {formFields}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditAsset(null)}>
              Cancel
            </Button>
            <Button onClick={handleEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteAsset} onOpenChange={(open) => !open && setDeleteAsset(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Asset</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{deleteAsset?.name}&quot;? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteAsset(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Sheet */}
      <Sheet open={!!viewAsset} onOpenChange={(open) => !open && setViewAsset(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          {viewAsset && (
            <>
              <SheetHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                    <Globe className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <SheetTitle>{viewAsset.name}</SheetTitle>
                    <SheetDescription>{viewAsset.type}</SheetDescription>
                  </div>
                </div>
              </SheetHeader>

              <div className="mt-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Status</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Badge variant="outline" className={statusColors[viewAsset.status]}>
                        {viewAsset.status}
                      </Badge>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Risk Level</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Badge variant="outline" className={riskColors[viewAsset.riskLevel]}>
                        {viewAsset.riskLevel}
                      </Badge>
                    </CardContent>
                  </Card>
                </div>

                {viewAsset.ipAddress && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Network</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="font-mono text-sm">
                        {viewAsset.ipAddress}
                        {viewAsset.port && `:${viewAsset.port}`}
                      </p>
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
                        className={`text-2xl font-bold ${viewAsset.findingsCount > 0 ? 'text-orange-500' : ''}`}
                      >
                        {viewAsset.findingsCount}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">SSL Expiry</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap items-center gap-2">
                        {viewAsset.sslExpiry ? (
                          <Lock className="h-4 w-4 text-green-500" />
                        ) : (
                          <Unlock className="h-4 w-4 text-gray-500" />
                        )}
                        <span className="text-sm">
                          {viewAsset.sslExpiry
                            ? new Date(viewAsset.sslExpiry).toLocaleDateString()
                            : 'No SSL'}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {viewAsset.technologies && viewAsset.technologies.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Technologies</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {viewAsset.technologies.map((tech) => (
                          <Badge key={tech} variant="secondary">
                            {tech}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {viewAsset.notes && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Notes</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">{viewAsset.notes}</p>
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Timeline</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Discovered</span>
                      <span>{new Date(viewAsset.discoveredAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Last Seen</span>
                      <span>{new Date(viewAsset.lastSeen).toLocaleDateString()}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="mt-6 flex gap-2">
                <Button className="flex-1" variant="outline" onClick={() => openEdit(viewAsset)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </Button>
                <Button className="flex-1">
                  <ExternalLink className="mr-2 h-4 w-4" />
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
