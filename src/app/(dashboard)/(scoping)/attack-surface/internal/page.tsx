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
  Network,
  Plus,
  MoreHorizontal,
  Eye,
  Pencil,
  Trash2,
  Server,
  Shield,
  AlertTriangle,
  CheckCircle2,
  Layers,
  MonitorSmartphone,
  Database,
  Router,
  HardDrive,
  RefreshCw,
  Download,
  Filter,
  X,
  Search as SearchIcon,
  Wifi,
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

type AssetStatus = 'online' | 'offline' | 'unknown'
type RiskLevel = 'critical' | 'high' | 'medium' | 'low'
type AssetType = 'server' | 'workstation' | 'network_device' | 'database' | 'storage'
type NetworkZone = 'dmz' | 'internal' | 'restricted' | 'guest'

interface InternalAsset {
  id: string
  hostname: string
  type: AssetType
  ipAddress: string
  macAddress?: string
  networkZone: NetworkZone
  vlan?: string
  operatingSystem?: string
  status: AssetStatus
  riskLevel: RiskLevel
  lastSeen: string
  discoveredAt: string
  findingsCount: number
  openPorts?: number[]
  services?: string[]
  owner?: string
  notes?: string
}

const daysAgo = (days: number) => {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date.toISOString()
}

const mockInternalAssets: InternalAsset[] = [
  {
    id: 'int-001',
    hostname: 'dc01.internal.tcb.vn',
    type: 'server',
    ipAddress: '10.0.1.10',
    macAddress: '00:1A:2B:3C:4D:5E',
    networkZone: 'internal',
    vlan: 'VLAN 10',
    operatingSystem: 'Windows Server 2022',
    status: 'online',
    riskLevel: 'high',
    lastSeen: daysAgo(0),
    discoveredAt: daysAgo(365),
    findingsCount: 3,
    openPorts: [53, 88, 135, 389, 445, 636],
    services: ['Active Directory', 'DNS', 'LDAP'],
    owner: 'IT Infrastructure',
  },
  {
    id: 'int-002',
    hostname: 'sql01.internal.tcb.vn',
    type: 'database',
    ipAddress: '10.0.2.20',
    macAddress: '00:1A:2B:3C:4D:5F',
    networkZone: 'restricted',
    vlan: 'VLAN 20',
    operatingSystem: 'Windows Server 2019',
    status: 'online',
    riskLevel: 'critical',
    lastSeen: daysAgo(0),
    discoveredAt: daysAgo(300),
    findingsCount: 5,
    openPorts: [1433, 1434, 3389],
    services: ['SQL Server', 'RDP'],
    owner: 'Database Team',
    notes: 'Contains PII data - requires strict access control',
  },
  {
    id: 'int-003',
    hostname: 'web-internal.tcb.vn',
    type: 'server',
    ipAddress: '10.0.3.30',
    networkZone: 'dmz',
    vlan: 'VLAN 30',
    operatingSystem: 'Ubuntu 22.04 LTS',
    status: 'online',
    riskLevel: 'medium',
    lastSeen: daysAgo(0),
    discoveredAt: daysAgo(200),
    findingsCount: 2,
    openPorts: [80, 443, 22],
    services: ['Nginx', 'SSH'],
    owner: 'Web Team',
  },
  {
    id: 'int-004',
    hostname: 'fw-core01',
    type: 'network_device',
    ipAddress: '10.0.0.1',
    macAddress: '00:1A:2B:3C:4D:60',
    networkZone: 'internal',
    operatingSystem: 'Palo Alto PAN-OS 10.2',
    status: 'online',
    riskLevel: 'low',
    lastSeen: daysAgo(0),
    discoveredAt: daysAgo(365),
    findingsCount: 0,
    openPorts: [443, 22],
    services: ['Management Interface'],
    owner: 'Network Team',
  },
  {
    id: 'int-005',
    hostname: 'nas01.internal.tcb.vn',
    type: 'storage',
    ipAddress: '10.0.4.40',
    macAddress: '00:1A:2B:3C:4D:61',
    networkZone: 'internal',
    vlan: 'VLAN 40',
    operatingSystem: 'Synology DSM 7.2',
    status: 'online',
    riskLevel: 'high',
    lastSeen: daysAgo(0),
    discoveredAt: daysAgo(180),
    findingsCount: 4,
    openPorts: [445, 5000, 5001, 22],
    services: ['SMB', 'HTTP/HTTPS', 'SSH'],
    owner: 'IT Operations',
    notes: 'Contains backup data and shared files',
  },
  {
    id: 'int-006',
    hostname: 'ws-dev-001',
    type: 'workstation',
    ipAddress: '10.0.100.50',
    macAddress: '00:1A:2B:3C:4D:62',
    networkZone: 'internal',
    vlan: 'VLAN 100',
    operatingSystem: 'Windows 11 Pro',
    status: 'online',
    riskLevel: 'medium',
    lastSeen: daysAgo(0),
    discoveredAt: daysAgo(90),
    findingsCount: 2,
    owner: 'Development Team',
  },
  {
    id: 'int-007',
    hostname: 'switch-floor2',
    type: 'network_device',
    ipAddress: '10.0.0.22',
    macAddress: '00:1A:2B:3C:4D:63',
    networkZone: 'internal',
    operatingSystem: 'Cisco IOS 15.2',
    status: 'online',
    riskLevel: 'low',
    lastSeen: daysAgo(0),
    discoveredAt: daysAgo(365),
    findingsCount: 1,
    openPorts: [22, 23],
    services: ['SSH', 'Telnet'],
    owner: 'Network Team',
    notes: 'Telnet should be disabled',
  },
  {
    id: 'int-008',
    hostname: 'guest-ap01',
    type: 'network_device',
    ipAddress: '10.255.0.10',
    networkZone: 'guest',
    operatingSystem: 'Ubiquiti UniFi',
    status: 'online',
    riskLevel: 'low',
    lastSeen: daysAgo(0),
    discoveredAt: daysAgo(120),
    findingsCount: 0,
    owner: 'Network Team',
  },
  {
    id: 'int-009',
    hostname: 'legacy-app01',
    type: 'server',
    ipAddress: '10.0.5.100',
    networkZone: 'internal',
    vlan: 'VLAN 50',
    operatingSystem: 'Windows Server 2012 R2',
    status: 'online',
    riskLevel: 'critical',
    lastSeen: daysAgo(0),
    discoveredAt: daysAgo(365),
    findingsCount: 12,
    openPorts: [80, 443, 3389, 445],
    services: ['IIS', 'RDP', 'SMB'],
    owner: 'Legacy Systems',
    notes: 'End of life OS - migration planned',
  },
  {
    id: 'int-010',
    hostname: 'backup-srv01',
    type: 'server',
    ipAddress: '10.0.6.60',
    networkZone: 'restricted',
    vlan: 'VLAN 60',
    operatingSystem: 'Windows Server 2022',
    status: 'offline',
    riskLevel: 'medium',
    lastSeen: daysAgo(2),
    discoveredAt: daysAgo(200),
    findingsCount: 1,
    services: ['Veeam Backup'],
    owner: 'IT Operations',
    notes: 'Scheduled maintenance',
  },
]

const statusColors: Record<AssetStatus, string> = {
  online: 'bg-green-500/10 text-green-500 border-green-500/20',
  offline: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
  unknown: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
}

const riskColors: Record<RiskLevel, string> = {
  critical: 'bg-red-500/10 text-red-500 border-red-500/20',
  high: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  medium: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  low: 'bg-green-500/10 text-green-500 border-green-500/20',
}

const zoneColors: Record<NetworkZone, string> = {
  dmz: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  internal: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  restricted: 'bg-red-500/10 text-red-500 border-red-500/20',
  guest: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
}

const typeIcons: Record<AssetType, React.ElementType> = {
  server: Server,
  workstation: MonitorSmartphone,
  network_device: Router,
  database: Database,
  storage: HardDrive,
}

export default function InternalSurfacePage() {
  const [assets, setAssets] = useState<InternalAsset[]>(mockInternalAssets)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<AssetType | 'all'>('all')
  const [filterZone, setFilterZone] = useState<NetworkZone | 'all'>('all')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [viewAsset, setViewAsset] = useState<InternalAsset | null>(null)
  const [editAsset, setEditAsset] = useState<InternalAsset | null>(null)
  const [deleteAsset, setDeleteAsset] = useState<InternalAsset | null>(null)

  const [formData, setFormData] = useState({
    hostname: '',
    type: 'server' as AssetType,
    ipAddress: '',
    macAddress: '',
    networkZone: 'internal' as NetworkZone,
    vlan: '',
    operatingSystem: '',
    status: 'online' as AssetStatus,
    riskLevel: 'medium' as RiskLevel,
    owner: '',
    notes: '',
  })

  const stats = useMemo(() => {
    return {
      total: assets.length,
      online: assets.filter((a) => a.status === 'online').length,
      critical: assets.filter((a) => a.riskLevel === 'critical').length,
      totalFindings: assets.reduce((acc, a) => acc + a.findingsCount, 0),
      byZone: {
        dmz: assets.filter((a) => a.networkZone === 'dmz').length,
        internal: assets.filter((a) => a.networkZone === 'internal').length,
        restricted: assets.filter((a) => a.networkZone === 'restricted').length,
        guest: assets.filter((a) => a.networkZone === 'guest').length,
      },
    }
  }, [assets])

  const filteredAssets = useMemo(() => {
    return assets.filter((asset) => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        if (
          !asset.hostname.toLowerCase().includes(query) &&
          !asset.ipAddress.toLowerCase().includes(query)
        ) {
          return false
        }
      }
      if (filterType !== 'all' && asset.type !== filterType) return false
      if (filterZone !== 'all' && asset.networkZone !== filterZone) return false
      return true
    })
  }, [assets, searchQuery, filterType, filterZone])

  const resetForm = () => {
    setFormData({
      hostname: '',
      type: 'server',
      ipAddress: '',
      macAddress: '',
      networkZone: 'internal',
      vlan: '',
      operatingSystem: '',
      status: 'online',
      riskLevel: 'medium',
      owner: '',
      notes: '',
    })
  }

  const handleCreate = () => {
    if (!formData.hostname || !formData.ipAddress) {
      toast.error('Please enter hostname and IP address')
      return
    }
    const newAsset: InternalAsset = {
      id: `int-${Date.now()}`,
      hostname: formData.hostname,
      type: formData.type,
      ipAddress: formData.ipAddress,
      macAddress: formData.macAddress || undefined,
      networkZone: formData.networkZone,
      vlan: formData.vlan || undefined,
      operatingSystem: formData.operatingSystem || undefined,
      status: formData.status,
      riskLevel: formData.riskLevel,
      lastSeen: new Date().toISOString(),
      discoveredAt: new Date().toISOString(),
      findingsCount: 0,
      owner: formData.owner || undefined,
      notes: formData.notes || undefined,
    }
    setAssets((prev) => [...prev, newAsset])
    toast.success('Internal asset added successfully')
    setIsCreateOpen(false)
    resetForm()
  }

  const handleEdit = () => {
    if (!editAsset || !formData.hostname || !formData.ipAddress) {
      toast.error('Please enter hostname and IP address')
      return
    }
    setAssets((prev) =>
      prev.map((a) =>
        a.id === editAsset.id
          ? {
              ...a,
              hostname: formData.hostname,
              type: formData.type,
              ipAddress: formData.ipAddress,
              macAddress: formData.macAddress || undefined,
              networkZone: formData.networkZone,
              vlan: formData.vlan || undefined,
              operatingSystem: formData.operatingSystem || undefined,
              status: formData.status,
              riskLevel: formData.riskLevel,
              owner: formData.owner || undefined,
              notes: formData.notes || undefined,
            }
          : a
      )
    )
    toast.success('Internal asset updated successfully')
    setEditAsset(null)
    resetForm()
  }

  const handleDelete = () => {
    if (!deleteAsset) return
    setAssets((prev) => prev.filter((a) => a.id !== deleteAsset.id))
    toast.success('Internal asset deleted successfully')
    setDeleteAsset(null)
  }

  const openEdit = (asset: InternalAsset) => {
    setFormData({
      hostname: asset.hostname,
      type: asset.type,
      ipAddress: asset.ipAddress,
      macAddress: asset.macAddress || '',
      networkZone: asset.networkZone,
      vlan: asset.vlan || '',
      operatingSystem: asset.operatingSystem || '',
      status: asset.status,
      riskLevel: asset.riskLevel,
      owner: asset.owner || '',
      notes: asset.notes || '',
    })
    setEditAsset(asset)
  }

  const formFields = (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Hostname *</Label>
          <Input
            placeholder="e.g., srv-web-01"
            value={formData.hostname}
            onChange={(e) => setFormData({ ...formData, hostname: e.target.value })}
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
              <SelectItem value="server">Server</SelectItem>
              <SelectItem value="workstation">Workstation</SelectItem>
              <SelectItem value="network_device">Network Device</SelectItem>
              <SelectItem value="database">Database</SelectItem>
              <SelectItem value="storage">Storage</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>IP Address *</Label>
          <Input
            placeholder="e.g., 10.0.1.100"
            value={formData.ipAddress}
            onChange={(e) => setFormData({ ...formData, ipAddress: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>MAC Address</Label>
          <Input
            placeholder="e.g., 00:1A:2B:3C:4D:5E"
            value={formData.macAddress}
            onChange={(e) => setFormData({ ...formData, macAddress: e.target.value })}
          />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Network Zone</Label>
          <Select
            value={formData.networkZone}
            onValueChange={(v) => setFormData({ ...formData, networkZone: v as NetworkZone })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="dmz">DMZ</SelectItem>
              <SelectItem value="internal">Internal</SelectItem>
              <SelectItem value="restricted">Restricted</SelectItem>
              <SelectItem value="guest">Guest</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>VLAN</Label>
          <Input
            placeholder="e.g., VLAN 10"
            value={formData.vlan}
            onChange={(e) => setFormData({ ...formData, vlan: e.target.value })}
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
              <SelectItem value="online">Online</SelectItem>
              <SelectItem value="offline">Offline</SelectItem>
              <SelectItem value="unknown">Unknown</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Operating System</Label>
          <Input
            placeholder="e.g., Windows Server 2022"
            value={formData.operatingSystem}
            onChange={(e) => setFormData({ ...formData, operatingSystem: e.target.value })}
          />
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
        <Label>Owner</Label>
        <Input
          placeholder="e.g., IT Operations"
          value={formData.owner}
          onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
        />
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
          title="Internal Attack Surface"
          description="Map and monitor internal network assets and their security posture"
        >
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <RefreshCw className="mr-2 h-4 w-4" />
              Scan Network
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
              <Layers className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">{stats.online} online</p>
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
              <p className="text-xs text-muted-foreground">Security issues</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Network Zones</CardTitle>
              <Network className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">4</div>
              <p className="text-xs text-muted-foreground">Segmented zones</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Coverage</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">87%</div>
              <Progress value={87} className="mt-2" />
            </CardContent>
          </Card>
        </div>

        {/* Network Zone Distribution */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-sm">Network Zone Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className={zoneColors.dmz}>
                  DMZ
                </Badge>
                <span className="text-sm font-medium">{stats.byZone.dmz}</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className={zoneColors.internal}>
                  Internal
                </Badge>
                <span className="text-sm font-medium">{stats.byZone.internal}</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className={zoneColors.restricted}>
                  Restricted
                </Badge>
                <span className="text-sm font-medium">{stats.byZone.restricted}</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className={zoneColors.guest}>
                  Guest
                </Badge>
                <span className="text-sm font-medium">{stats.byZone.guest}</span>
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
                    placeholder="Search by hostname or IP..."
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
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="server">Server</SelectItem>
                    <SelectItem value="workstation">Workstation</SelectItem>
                    <SelectItem value="network_device">Network Device</SelectItem>
                    <SelectItem value="database">Database</SelectItem>
                    <SelectItem value="storage">Storage</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={filterZone}
                  onValueChange={(v) => setFilterZone(v as NetworkZone | 'all')}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Zone" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Zones</SelectItem>
                    <SelectItem value="dmz">DMZ</SelectItem>
                    <SelectItem value="internal">Internal</SelectItem>
                    <SelectItem value="restricted">Restricted</SelectItem>
                    <SelectItem value="guest">Guest</SelectItem>
                  </SelectContent>
                </Select>
                {(filterType !== 'all' || filterZone !== 'all' || searchQuery) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setFilterType('all')
                      setFilterZone('all')
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
            <CardTitle>Internal Assets</CardTitle>
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
                  <TableHead>IP Address</TableHead>
                  <TableHead>Zone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Risk</TableHead>
                  <TableHead>Findings</TableHead>
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
                            <p className="font-medium">{asset.hostname}</p>
                            {asset.operatingSystem && (
                              <p className="text-xs text-muted-foreground">
                                {asset.operatingSystem}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {asset.type.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs">{asset.ipAddress}</code>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={zoneColors[asset.networkZone]}>
                          {asset.networkZone.toUpperCase()}
                        </Badge>
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
            <DialogTitle>Add Internal Asset</DialogTitle>
            <DialogDescription>Add a new internal network asset</DialogDescription>
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
            <DialogTitle>Edit Internal Asset</DialogTitle>
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
              Are you sure you want to delete &quot;{deleteAsset?.hostname}&quot;? This action
              cannot be undone.
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
                    <Network className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <SheetTitle>{viewAsset.hostname}</SheetTitle>
                    <SheetDescription>{viewAsset.ipAddress}</SheetDescription>
                  </div>
                </div>
              </SheetHeader>

              <div className="mt-6 space-y-4">
                <div className="grid grid-cols-3 gap-4">
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
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Zone</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Badge variant="outline" className={zoneColors[viewAsset.networkZone]}>
                        {viewAsset.networkZone.toUpperCase()}
                      </Badge>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Network Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">IP Address</span>
                      <code>{viewAsset.ipAddress}</code>
                    </div>
                    {viewAsset.macAddress && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">MAC Address</span>
                        <code>{viewAsset.macAddress}</code>
                      </div>
                    )}
                    {viewAsset.vlan && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">VLAN</span>
                        <span>{viewAsset.vlan}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {viewAsset.operatingSystem && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Operating System</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm">{viewAsset.operatingSystem}</p>
                    </CardContent>
                  </Card>
                )}

                {viewAsset.openPorts && viewAsset.openPorts.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Open Ports</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {viewAsset.openPorts.map((port) => (
                          <Badge key={port} variant="secondary">
                            {port}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {viewAsset.services && viewAsset.services.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Services</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {viewAsset.services.map((service) => (
                          <Badge key={service} variant="outline">
                            {service}
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
                        className={`text-2xl font-bold ${viewAsset.findingsCount > 0 ? 'text-orange-500' : ''}`}
                      >
                        {viewAsset.findingsCount}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Owner</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm">{viewAsset.owner || 'Unassigned'}</p>
                    </CardContent>
                  </Card>
                </div>

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
                  <Wifi className="mr-2 h-4 w-4" />
                  Scan Asset
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}
