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
import { PageHeader, RiskScoreBadge } from '@/features/shared'
import { ContainerDetailSheet, StatCard, StatsGrid, SectionTitle } from '@/features/assets'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import {
  Search as SearchIcon,
  MoreHorizontal,
  Eye,
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
  Copy,
  RefreshCw,
  Cpu,
  HardDrive,
  Layers,
  Server,
  Box,
  Container,
  AlertCircle,
  Network,
  Plus,
  Pencil,
  Trash2,
} from 'lucide-react'
import {
  getK8sClusters,
  getK8sWorkloads,
  getContainerImages,
  type K8sCluster,
  type K8sWorkload,
  type ContainerImage,
} from '@/features/assets'
import {
  ScopeBadge,
  ScopeCoverageCard,
  getScopeMatchesForAsset,
  calculateScopeCoverage,
  getActiveScopeTargets,
  getActiveScopeExclusions,
  type ScopeMatchResult,
} from '@/features/scope'

// Status colors and labels
const clusterStatusConfig: Record<
  K8sCluster['status'],
  { label: string; color: string; icon: typeof CheckCircle }
> = {
  healthy: { label: 'Healthy', color: 'text-green-500 bg-green-500/10', icon: CheckCircle },
  warning: { label: 'Warning', color: 'text-yellow-500 bg-yellow-500/10', icon: AlertTriangle },
  critical: { label: 'Critical', color: 'text-red-500 bg-red-500/10', icon: AlertCircle },
  unknown: { label: 'Unknown', color: 'text-gray-500 bg-gray-500/10', icon: AlertCircle },
}

const workloadStatusConfig: Record<K8sWorkload['status'], { label: string; color: string }> = {
  running: { label: 'Running', color: 'text-green-500 bg-green-500/10' },
  pending: { label: 'Pending', color: 'text-yellow-500 bg-yellow-500/10' },
  failed: { label: 'Failed', color: 'text-red-500 bg-red-500/10' },
  unknown: { label: 'Unknown', color: 'text-gray-500 bg-gray-500/10' },
}

const workloadTypeConfig: Record<K8sWorkload['type'], { label: string; color: string }> = {
  deployment: { label: 'Deployment', color: 'bg-blue-500/10 text-blue-500' },
  statefulset: { label: 'StatefulSet', color: 'bg-purple-500/10 text-purple-500' },
  daemonset: { label: 'DaemonSet', color: 'bg-orange-500/10 text-orange-500' },
  job: { label: 'Job', color: 'bg-cyan-500/10 text-cyan-500' },
  cronjob: { label: 'CronJob', color: 'bg-teal-500/10 text-teal-500' },
  replicaset: { label: 'ReplicaSet', color: 'bg-indigo-500/10 text-indigo-500' },
}

const providerConfig: Record<K8sCluster['provider'], { label: string; color: string }> = {
  eks: { label: 'AWS EKS', color: 'bg-orange-500/10 text-orange-500' },
  gke: { label: 'Google GKE', color: 'bg-blue-500/10 text-blue-500' },
  aks: { label: 'Azure AKS', color: 'bg-cyan-500/10 text-cyan-500' },
  'self-managed': { label: 'Self-Managed', color: 'bg-gray-500/10 text-gray-500' },
  k3s: { label: 'K3s', color: 'bg-green-500/10 text-green-500' },
  openshift: { label: 'OpenShift', color: 'bg-red-500/10 text-red-500' },
}

type MainTab = 'clusters' | 'workloads' | 'images'
type ClusterFilter = 'all' | string
type WorkloadTypeFilter = 'all' | K8sWorkload['type']

// Form types
interface ClusterFormData {
  name: string
  provider: K8sCluster['provider']
  version: string
  region: string
}

interface WorkloadFormData {
  name: string
  type: K8sWorkload['type']
  clusterId: string
  namespace: string
  image: string
  replicas: number
}

interface ImageFormData {
  name: string
  tag: string
  registry: string
}

const defaultClusterForm: ClusterFormData = {
  name: '',
  provider: 'eks',
  version: '1.28',
  region: '',
}

const defaultWorkloadForm: WorkloadFormData = {
  name: '',
  type: 'deployment',
  clusterId: '',
  namespace: 'default',
  image: '',
  replicas: 1,
}

const defaultImageForm: ImageFormData = {
  name: '',
  tag: 'latest',
  registry: 'docker.io',
}

export default function KubernetesPage() {
  // Main tab state
  const [mainTab, setMainTab] = useState<MainTab>('clusters')

  // Data states
  const [clusters, setClusters] = useState<K8sCluster[]>(getK8sClusters())
  const [workloads, setWorkloads] = useState<K8sWorkload[]>(getK8sWorkloads())
  const [images, setImages] = useState<ContainerImage[]>(getContainerImages())

  // Filter states
  const [clusterFilter, setClusterFilter] = useState<ClusterFilter>('all')
  const [workloadTypeFilter, setWorkloadTypeFilter] = useState<WorkloadTypeFilter>('all')
  const [globalFilter, setGlobalFilter] = useState('')

  // Table states
  const [clusterSorting, setClusterSorting] = useState<SortingState>([])
  const [workloadSorting, setWorkloadSorting] = useState<SortingState>([])
  const [imageSorting, setImageSorting] = useState<SortingState>([])
  const [clusterSelection, setClusterSelection] = useState({})
  const [workloadSelection, setWorkloadSelection] = useState({})
  const [imageSelection, setImageSelection] = useState({})

  // Detail sheet states
  const [selectedCluster, setSelectedCluster] = useState<K8sCluster | null>(null)
  const [selectedWorkload, setSelectedWorkload] = useState<K8sWorkload | null>(null)
  const [selectedImage, setSelectedImage] = useState<ContainerImage | null>(null)

  // Dialog states
  const [isClusterDialogOpen, setIsClusterDialogOpen] = useState(false)
  const [isWorkloadDialogOpen, setIsWorkloadDialogOpen] = useState(false)
  const [isImageDialogOpen, setIsImageDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{
    type: MainTab
    item: K8sCluster | K8sWorkload | ContainerImage
  } | null>(null)

  // Form states
  const [clusterForm, setClusterForm] = useState<ClusterFormData>(defaultClusterForm)
  const [workloadForm, setWorkloadForm] = useState<WorkloadFormData>(defaultWorkloadForm)
  const [imageForm, setImageForm] = useState<ImageFormData>(defaultImageForm)
  const [editingCluster, setEditingCluster] = useState<K8sCluster | null>(null)
  const [editingWorkload, setEditingWorkload] = useState<K8sWorkload | null>(null)
  const [editingImage, setEditingImage] = useState<ContainerImage | null>(null)

  // Stats
  const stats = useMemo(
    () => ({
      totalClusters: clusters.length,
      healthyClusters: clusters.filter((c) => c.status === 'healthy').length,
      totalWorkloads: workloads.length,
      runningWorkloads: workloads.filter((w) => w.status === 'running').length,
      totalImages: images.length,
      vulnerableImages: images.filter(
        (i) => i.vulnerabilities.critical > 0 || i.vulnerabilities.high > 0
      ).length,
      totalPods: clusters.reduce((acc, c) => acc + c.podCount, 0),
      totalNodes: clusters.reduce((acc, c) => acc + c.nodeCount, 0),
    }),
    [clusters, workloads, images]
  )

  // Scope data
  const scopeTargets = useMemo(() => getActiveScopeTargets(), [])
  const scopeExclusions = useMemo(() => getActiveScopeExclusions(), [])

  // Compute scope matches for each container image
  const scopeMatchesMap = useMemo(() => {
    const map = new Map<string, ScopeMatchResult>()
    images.forEach((image) => {
      const match = getScopeMatchesForAsset(
        { id: image.id, type: 'container', name: image.fullName },
        scopeTargets,
        scopeExclusions
      )
      map.set(image.id, match)
    })
    return map
  }, [images, scopeTargets, scopeExclusions])

  // Calculate scope coverage for container images
  const scopeCoverage = useMemo(() => {
    const assets = images.map((i) => ({
      id: i.id,
      name: i.fullName,
      type: 'container',
    }))
    return calculateScopeCoverage(assets, scopeTargets, scopeExclusions)
  }, [images, scopeTargets, scopeExclusions])

  // Filtered data
  const filteredWorkloads = useMemo(() => {
    let data = [...workloads]
    if (clusterFilter !== 'all') {
      data = data.filter((w) => w.clusterId === clusterFilter)
    }
    if (workloadTypeFilter !== 'all') {
      data = data.filter((w) => w.type === workloadTypeFilter)
    }
    return data
  }, [workloads, clusterFilter, workloadTypeFilter])

  // CRUD handlers - Clusters
  const handleAddCluster = () => {
    setEditingCluster(null)
    setClusterForm(defaultClusterForm)
    setIsClusterDialogOpen(true)
  }

  const handleEditCluster = (cluster: K8sCluster) => {
    setEditingCluster(cluster)
    setClusterForm({
      name: cluster.name,
      provider: cluster.provider,
      version: cluster.version,
      region: cluster.region || '',
    })
    setIsClusterDialogOpen(true)
  }

  const handleSaveCluster = () => {
    if (!clusterForm.name) {
      toast.error('Cluster name is required')
      return
    }

    if (editingCluster) {
      setClusters((prev) =>
        prev.map((c) =>
          c.id === editingCluster.id
            ? {
                ...c,
                name: clusterForm.name,
                provider: clusterForm.provider,
                version: clusterForm.version,
                region: clusterForm.region,
              }
            : c
        )
      )
      toast.success('Cluster updated')
    } else {
      const newCluster: K8sCluster = {
        id: `cluster-${Date.now()}`,
        name: clusterForm.name,
        provider: clusterForm.provider,
        version: clusterForm.version,
        region: clusterForm.region,
        nodeCount: 0,
        namespaceCount: 1,
        workloadCount: 0,
        podCount: 0,
        status: 'unknown',
        riskScore: 0,
        findingCount: 0,
        createdAt: new Date().toISOString(),
        lastSeen: new Date().toISOString(),
      }
      setClusters((prev) => [newCluster, ...prev])
      toast.success('Cluster added')
    }
    setIsClusterDialogOpen(false)
  }

  // CRUD handlers - Workloads
  const handleAddWorkload = () => {
    setEditingWorkload(null)
    setWorkloadForm({ ...defaultWorkloadForm, clusterId: clusters[0]?.id || '' })
    setIsWorkloadDialogOpen(true)
  }

  const handleEditWorkload = (workload: K8sWorkload) => {
    setEditingWorkload(workload)
    setWorkloadForm({
      name: workload.name,
      type: workload.type,
      clusterId: workload.clusterId,
      namespace: workload.namespace,
      image: workload.images[0] || '',
      replicas: workload.replicas,
    })
    setIsWorkloadDialogOpen(true)
  }

  const handleSaveWorkload = () => {
    if (!workloadForm.name || !workloadForm.clusterId) {
      toast.error('Workload name and cluster are required')
      return
    }

    const cluster = clusters.find((c) => c.id === workloadForm.clusterId)

    if (editingWorkload) {
      setWorkloads((prev) =>
        prev.map((w) =>
          w.id === editingWorkload.id
            ? {
                ...w,
                name: workloadForm.name,
                type: workloadForm.type,
                clusterId: workloadForm.clusterId,
                clusterName: cluster?.name || '',
                namespace: workloadForm.namespace,
                images: workloadForm.image ? [workloadForm.image] : [],
                replicas: workloadForm.replicas,
              }
            : w
        )
      )
      toast.success('Workload updated')
    } else {
      const newWorkload: K8sWorkload = {
        id: `workload-${Date.now()}`,
        name: workloadForm.name,
        type: workloadForm.type,
        clusterId: workloadForm.clusterId,
        clusterName: cluster?.name || '',
        namespace: workloadForm.namespace,
        replicas: workloadForm.replicas,
        readyReplicas: 0,
        images: workloadForm.image ? [workloadForm.image] : [],
        status: 'pending',
        riskScore: 0,
        findingCount: 0,
        createdAt: new Date().toISOString(),
        lastSeen: new Date().toISOString(),
      }
      setWorkloads((prev) => [newWorkload, ...prev])
      toast.success('Workload added')
    }
    setIsWorkloadDialogOpen(false)
  }

  // CRUD handlers - Images
  const handleAddImage = () => {
    setEditingImage(null)
    setImageForm(defaultImageForm)
    setIsImageDialogOpen(true)
  }

  const handleEditImage = (image: ContainerImage) => {
    setEditingImage(image)
    setImageForm({
      name: image.name,
      tag: image.tag,
      registry: image.registry,
    })
    setIsImageDialogOpen(true)
  }

  const handleSaveImage = () => {
    if (!imageForm.name) {
      toast.error('Image name is required')
      return
    }

    if (editingImage) {
      setImages((prev) =>
        prev.map((i) =>
          i.id === editingImage.id
            ? {
                ...i,
                name: imageForm.name,
                tag: imageForm.tag,
                registry: imageForm.registry,
                fullName: `${imageForm.name}:${imageForm.tag}`,
              }
            : i
        )
      )
      toast.success('Image updated')
    } else {
      const newImage: ContainerImage = {
        id: `image-${Date.now()}`,
        name: imageForm.name,
        tag: imageForm.tag,
        fullName: `${imageForm.name}:${imageForm.tag}`,
        registry: imageForm.registry,
        workloadCount: 0,
        vulnerabilities: { critical: 0, high: 0, medium: 0, low: 0 },
        riskScore: 0,
        createdAt: new Date().toISOString(),
      }
      setImages((prev) => [newImage, ...prev])
      toast.success('Image added')
    }
    setIsImageDialogOpen(false)
  }

  // Delete handlers
  const handleDeleteClick = (type: MainTab, item: K8sCluster | K8sWorkload | ContainerImage) => {
    setDeleteTarget({ type, item })
    setIsDeleteDialogOpen(true)
  }

  const handleConfirmDelete = () => {
    if (!deleteTarget) return

    if (deleteTarget.type === 'clusters') {
      setClusters((prev) => prev.filter((c) => c.id !== deleteTarget.item.id))
      toast.success('Cluster deleted')
    } else if (deleteTarget.type === 'workloads') {
      setWorkloads((prev) => prev.filter((w) => w.id !== deleteTarget.item.id))
      toast.success('Workload deleted')
    } else {
      setImages((prev) => prev.filter((i) => i.id !== deleteTarget.item.id))
      toast.success('Image deleted')
    }

    setIsDeleteDialogOpen(false)
    setDeleteTarget(null)
  }

  // Bulk delete handlers
  const handleBulkDelete = () => {
    if (mainTab === 'clusters') {
      const selectedIds = Object.keys(clusterSelection)
      setClusters((prev) => prev.filter((c) => !selectedIds.includes(c.id)))
      setClusterSelection({})
      toast.success(`${selectedIds.length} cluster(s) deleted`)
    } else if (mainTab === 'workloads') {
      const selectedIds = Object.keys(workloadSelection)
      setWorkloads((prev) => prev.filter((w) => !selectedIds.includes(w.id)))
      setWorkloadSelection({})
      toast.success(`${selectedIds.length} workload(s) deleted`)
    } else {
      const selectedIds = Object.keys(imageSelection)
      setImages((prev) => prev.filter((i) => !selectedIds.includes(i.id)))
      setImageSelection({})
      toast.success(`${selectedIds.length} image(s) deleted`)
    }
  }

  const getSelectedCount = () => {
    if (mainTab === 'clusters') return Object.keys(clusterSelection).length
    if (mainTab === 'workloads') return Object.keys(workloadSelection).length
    return Object.keys(imageSelection).length
  }

  // Cluster columns
  const clusterColumns: ColumnDef<K8sCluster>[] = [
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
          Cluster
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Server className="h-4 w-4 text-blue-500 shrink-0" />
          <div className="min-w-0">
            <p className="font-medium truncate">{row.original.name}</p>
            <p className="text-muted-foreground text-xs truncate">{row.original.version}</p>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'provider',
      header: 'Provider',
      cell: ({ row }) => {
        const provider = providerConfig[row.original.provider]
        return (
          <Badge variant="secondary" className={provider.color}>
            {provider.label}
          </Badge>
        )
      },
    },
    {
      accessorKey: 'nodeCount',
      header: 'Nodes',
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5">
          <Server className="h-3.5 w-3.5 text-muted-foreground" />
          <span>{row.original.nodeCount}</span>
        </div>
      ),
    },
    {
      accessorKey: 'workloadCount',
      header: 'Workloads',
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5">
          <Layers className="h-3.5 w-3.5 text-muted-foreground" />
          <span>{row.original.workloadCount}</span>
        </div>
      ),
    },
    {
      accessorKey: 'podCount',
      header: 'Pods',
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5">
          <Box className="h-3.5 w-3.5 text-muted-foreground" />
          <span>{row.original.podCount}</span>
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = clusterStatusConfig[row.original.status]
        const Icon = status.icon
        return (
          <Badge variant="secondary" className={status.color}>
            <Icon className="h-3 w-3 mr-1" />
            {status.label}
          </Badge>
        )
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
      cell: ({ row }) => (
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
                setSelectedCluster(row.original)
              }}
            >
              <Eye className="mr-2 h-4 w-4" />
              View Details
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation()
                handleEditCluster(row.original)
              }}
            >
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation()
                setClusterFilter(row.original.id)
                setMainTab('workloads')
              }}
            >
              <Layers className="mr-2 h-4 w-4" />
              View Workloads
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation()
                toast.info('Scanning cluster...')
              }}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Rescan
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation()
                handleDeleteClick('clusters', row.original)
              }}
              className="text-red-600"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  // Workload columns
  const workloadColumns: ColumnDef<K8sWorkload>[] = [
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
          Workload
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="flex flex-wrap items-center gap-2">
          <Layers className="h-4 w-4 text-purple-500" />
          <div>
            <p className="font-medium">{row.original.name}</p>
            <p className="text-muted-foreground text-xs">{row.original.namespace}</p>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'type',
      header: 'Type',
      cell: ({ row }) => {
        const type = workloadTypeConfig[row.original.type]
        return (
          <Badge variant="secondary" className={type.color}>
            {type.label}
          </Badge>
        )
      },
    },
    {
      accessorKey: 'clusterName',
      header: 'Cluster',
      cell: ({ row }) => <span className="text-sm">{row.original.clusterName}</span>,
    },
    {
      accessorKey: 'replicas',
      header: 'Replicas',
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <span
            className={
              row.original.readyReplicas === row.original.replicas
                ? 'text-green-500'
                : 'text-yellow-500'
            }
          >
            {row.original.readyReplicas}
          </span>
          <span className="text-muted-foreground">/</span>
          <span>{row.original.replicas}</span>
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = workloadStatusConfig[row.original.status]
        return (
          <Badge variant="secondary" className={status.color}>
            {status.label}
          </Badge>
        )
      },
    },
    {
      accessorKey: 'findingCount',
      header: 'Findings',
      cell: ({ row }) => {
        const count = row.original.findingCount
        if (count === 0) return <span className="text-muted-foreground">0</span>
        return <Badge variant={count > 3 ? 'destructive' : 'secondary'}>{count}</Badge>
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
      cell: ({ row }) => (
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
                setSelectedWorkload(row.original)
              }}
            >
              <Eye className="mr-2 h-4 w-4" />
              View Details
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation()
                handleEditWorkload(row.original)
              }}
            >
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation()
                navigator.clipboard.writeText(row.original.images[0] || '')
                toast.success('Image copied')
              }}
            >
              <Copy className="mr-2 h-4 w-4" />
              Copy Image
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation()
                handleDeleteClick('workloads', row.original)
              }}
              className="text-red-600"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  // Image columns
  const imageColumns: ColumnDef<ContainerImage>[] = [
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
      accessorKey: 'fullName',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="-ml-4"
        >
          Image
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="flex flex-wrap items-center gap-2">
          <Container className="h-4 w-4 text-cyan-500" />
          <div>
            <p className="font-medium font-mono text-sm">{row.original.name}</p>
            <p className="text-muted-foreground text-xs">{row.original.tag}</p>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'registry',
      header: 'Registry',
      cell: ({ row }) => <span className="text-sm">{row.original.registry}</span>,
    },
    {
      accessorKey: 'size',
      header: 'Size',
      cell: ({ row }) => <span className="text-sm">{row.original.size} MB</span>,
    },
    {
      accessorKey: 'workloadCount',
      header: 'Used By',
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Layers className="h-3.5 w-3.5 text-muted-foreground" />
          <span>{row.original.workloadCount} workloads</span>
        </div>
      ),
    },
    {
      id: 'vulnerabilities',
      header: 'Vulnerabilities',
      cell: ({ row }) => {
        const vulns = row.original.vulnerabilities
        const total = vulns.critical + vulns.high + vulns.medium + vulns.low
        if (total === 0) return <span className="text-muted-foreground">None</span>
        return (
          <div className="flex items-center gap-1">
            {vulns.critical > 0 && (
              <Badge variant="destructive" className="text-xs px-1.5">
                {vulns.critical}C
              </Badge>
            )}
            {vulns.high > 0 && (
              <Badge className="bg-orange-500/10 text-orange-500 text-xs px-1.5">
                {vulns.high}H
              </Badge>
            )}
            {vulns.medium > 0 && (
              <Badge className="bg-yellow-500/10 text-yellow-500 text-xs px-1.5">
                {vulns.medium}M
              </Badge>
            )}
            {vulns.low > 0 && (
              <Badge className="bg-blue-500/10 text-blue-500 text-xs px-1.5">{vulns.low}L</Badge>
            )}
          </div>
        )
      },
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
      cell: ({ row }) => (
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
                setSelectedImage(row.original)
              }}
            >
              <Eye className="mr-2 h-4 w-4" />
              View Details
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation()
                handleEditImage(row.original)
              }}
            >
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation()
                navigator.clipboard.writeText(row.original.fullName)
                toast.success('Image name copied')
              }}
            >
              <Copy className="mr-2 h-4 w-4" />
              Copy Full Name
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation()
                toast.info('Scanning image...')
              }}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Rescan
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation()
                handleDeleteClick('images', row.original)
              }}
              className="text-red-600"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  // Tables
  const clusterTable = useReactTable({
    data: clusters,
    columns: clusterColumns,
    state: { sorting: clusterSorting, globalFilter, rowSelection: clusterSelection },
    onSortingChange: setClusterSorting,
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: setClusterSelection,
    getRowId: (row) => row.id,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  const workloadTable = useReactTable({
    data: filteredWorkloads,
    columns: workloadColumns,
    state: { sorting: workloadSorting, globalFilter, rowSelection: workloadSelection },
    onSortingChange: setWorkloadSorting,
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: setWorkloadSelection,
    getRowId: (row) => row.id,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  const imageTable = useReactTable({
    data: images,
    columns: imageColumns,
    state: { sorting: imageSorting, globalFilter, rowSelection: imageSelection },
    onSortingChange: setImageSorting,
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: setImageSelection,
    getRowId: (row) => row.id,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  // Export handler
  const handleExport = () => {
    let csv = ''
    if (mainTab === 'clusters') {
      csv = [
        ['Name', 'Provider', 'Version', 'Nodes', 'Workloads', 'Pods', 'Status', 'Risk Score'].join(
          ','
        ),
        ...clusters.map((c) =>
          [
            c.name,
            c.provider,
            c.version,
            c.nodeCount,
            c.workloadCount,
            c.podCount,
            c.status,
            c.riskScore,
          ].join(',')
        ),
      ].join('\n')
    } else if (mainTab === 'workloads') {
      csv = [
        [
          'Name',
          'Type',
          'Cluster',
          'Namespace',
          'Replicas',
          'Status',
          'Findings',
          'Risk Score',
        ].join(','),
        ...filteredWorkloads.map((w) =>
          [
            w.name,
            w.type,
            w.clusterName,
            w.namespace,
            `${w.readyReplicas}/${w.replicas}`,
            w.status,
            w.findingCount,
            w.riskScore,
          ].join(',')
        ),
      ].join('\n')
    } else {
      csv = [
        [
          'Image',
          'Tag',
          'Registry',
          'Size (MB)',
          'Workloads',
          'Critical',
          'High',
          'Medium',
          'Low',
          'Risk Score',
        ].join(','),
        ...images.map((i) =>
          [
            i.name,
            i.tag,
            i.registry,
            i.size,
            i.workloadCount,
            i.vulnerabilities.critical,
            i.vulnerabilities.high,
            i.vulnerabilities.medium,
            i.vulnerabilities.low,
            i.riskScore,
          ].join(',')
        ),
      ].join('\n')
    }
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `kubernetes-${mainTab}.csv`
    a.click()
    toast.success(`${mainTab} exported`)
  }

  // Get add button config based on current tab
  const getAddButtonConfig = () => {
    switch (mainTab) {
      case 'clusters':
        return { label: 'Add Cluster', onClick: handleAddCluster }
      case 'workloads':
        return { label: 'Add Workload', onClick: handleAddWorkload }
      case 'images':
        return { label: 'Add Image', onClick: handleAddImage }
    }
  }

  const addButtonConfig = getAddButtonConfig()

  // Render table helper
  const renderTable = <T,>(
    table: ReturnType<typeof useReactTable<T>>,
    columns: ColumnDef<T>[],
    emptyMessage: string
  ) => (
    <>
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
                    )
                      return
                    if (mainTab === 'clusters')
                      setSelectedCluster(row.original as unknown as K8sCluster)
                    else if (mainTab === 'workloads')
                      setSelectedWorkload(row.original as unknown as K8sWorkload)
                    else setSelectedImage(row.original as unknown as ContainerImage)
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
                  {emptyMessage}
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
    </>
  )

  return (
    <>
      <Main>
        <PageHeader
          title="Kubernetes"
          description={`${stats.totalClusters} clusters, ${stats.totalWorkloads} workloads, ${stats.totalImages} images`}
        >
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Button onClick={addButtonConfig.onClick}>
              <Plus className="mr-2 h-4 w-4" />
              {addButtonConfig.label}
            </Button>
          </div>
        </PageHeader>

        {/* Stats Cards */}
        <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Card
            className="cursor-pointer hover:border-blue-500 transition-colors"
            onClick={() => setMainTab('clusters')}
          >
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Server className="h-4 w-4 text-blue-500" />
                Clusters
              </CardDescription>
              <CardTitle className="text-3xl">{stats.totalClusters}</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm text-muted-foreground">
                <span className="text-green-500">{stats.healthyClusters}</span> healthy
              </p>
            </CardContent>
          </Card>
          <Card
            className="cursor-pointer hover:border-purple-500 transition-colors"
            onClick={() => setMainTab('workloads')}
          >
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-purple-500" />
                Workloads
              </CardDescription>
              <CardTitle className="text-3xl">{stats.totalWorkloads}</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm text-muted-foreground">
                <span className="text-green-500">{stats.runningWorkloads}</span> running
              </p>
            </CardContent>
          </Card>
          <Card
            className="cursor-pointer hover:border-cyan-500 transition-colors"
            onClick={() => setMainTab('images')}
          >
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Container className="h-4 w-4 text-cyan-500" />
                Images
              </CardDescription>
              <CardTitle className="text-3xl">{stats.totalImages}</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm text-muted-foreground">
                <span className="text-red-500">{stats.vulnerableImages}</span> vulnerable
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Box className="h-4 w-4 text-orange-500" />
                Total Pods
              </CardDescription>
              <CardTitle className="text-3xl">{stats.totalPods}</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm text-muted-foreground">
                across <span className="font-medium">{stats.totalNodes}</span> nodes
              </p>
            </CardContent>
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

        {/* Main Content */}
        <Card className="mt-6">
          <CardHeader>
            <Tabs value={mainTab} onValueChange={(v) => setMainTab(v as MainTab)}>
              <TabsList>
                <TabsTrigger value="clusters" className="gap-1.5">
                  <Server className="h-4 w-4" />
                  Clusters
                  <Badge variant="secondary" className="ml-1">
                    {clusters.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="workloads" className="gap-1.5">
                  <Layers className="h-4 w-4" />
                  Workloads
                  <Badge variant="secondary" className="ml-1">
                    {workloads.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="images" className="gap-1.5">
                  <Container className="h-4 w-4" />
                  Images
                  <Badge variant="secondary" className="ml-1">
                    {images.length}
                  </Badge>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="flex flex-col gap-4 mb-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative flex-1 max-w-sm">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={`Search ${mainTab}...`}
                  value={globalFilter}
                  onChange={(e) => setGlobalFilter(e.target.value)}
                  className="pl-9"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {mainTab === 'workloads' && (
                  <>
                    <Select
                      value={clusterFilter}
                      onValueChange={(v) => setClusterFilter(v as ClusterFilter)}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="All Clusters" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Clusters</SelectItem>
                        {clusters.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={workloadTypeFilter}
                      onValueChange={(v) => setWorkloadTypeFilter(v as WorkloadTypeFilter)}
                    >
                      <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="All Types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="deployment">Deployment</SelectItem>
                        <SelectItem value="statefulset">StatefulSet</SelectItem>
                        <SelectItem value="daemonset">DaemonSet</SelectItem>
                        <SelectItem value="job">Job</SelectItem>
                        <SelectItem value="cronjob">CronJob</SelectItem>
                      </SelectContent>
                    </Select>
                  </>
                )}

                {getSelectedCount() > 0 && (
                  <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete ({getSelectedCount()})
                  </Button>
                )}
              </div>
            </div>

            {/* Tables */}
            {mainTab === 'clusters' &&
              renderTable(clusterTable, clusterColumns, 'No clusters found.')}
            {mainTab === 'workloads' &&
              renderTable(workloadTable, workloadColumns, 'No workloads found.')}
            {mainTab === 'images' && renderTable(imageTable, imageColumns, 'No images found.')}
          </CardContent>
        </Card>
      </Main>

      {/* Add/Edit Cluster Dialog */}
      <Dialog open={isClusterDialogOpen} onOpenChange={setIsClusterDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCluster ? 'Edit Cluster' : 'Add Cluster'}</DialogTitle>
            <DialogDescription>
              {editingCluster
                ? 'Update the cluster details.'
                : 'Add a new Kubernetes cluster to monitor.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="cluster-name">Cluster Name *</Label>
              <Input
                id="cluster-name"
                value={clusterForm.name}
                onChange={(e) => setClusterForm({ ...clusterForm, name: e.target.value })}
                placeholder="prod-cluster"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cluster-provider">Provider</Label>
              <Select
                value={clusterForm.provider}
                onValueChange={(v) =>
                  setClusterForm({ ...clusterForm, provider: v as K8sCluster['provider'] })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="eks">AWS EKS</SelectItem>
                  <SelectItem value="gke">Google GKE</SelectItem>
                  <SelectItem value="aks">Azure AKS</SelectItem>
                  <SelectItem value="k3s">K3s</SelectItem>
                  <SelectItem value="openshift">OpenShift</SelectItem>
                  <SelectItem value="self-managed">Self-Managed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cluster-version">Kubernetes Version</Label>
              <Input
                id="cluster-version"
                value={clusterForm.version}
                onChange={(e) => setClusterForm({ ...clusterForm, version: e.target.value })}
                placeholder="1.28"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cluster-region">Region</Label>
              <Input
                id="cluster-region"
                value={clusterForm.region}
                onChange={(e) => setClusterForm({ ...clusterForm, region: e.target.value })}
                placeholder="us-east-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsClusterDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveCluster}>{editingCluster ? 'Update' : 'Add'} Cluster</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Workload Dialog */}
      <Dialog open={isWorkloadDialogOpen} onOpenChange={setIsWorkloadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingWorkload ? 'Edit Workload' : 'Add Workload'}</DialogTitle>
            <DialogDescription>
              {editingWorkload
                ? 'Update the workload details.'
                : 'Add a new workload to a cluster.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="workload-name">Workload Name *</Label>
              <Input
                id="workload-name"
                value={workloadForm.name}
                onChange={(e) => setWorkloadForm({ ...workloadForm, name: e.target.value })}
                placeholder="api-server"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="workload-type">Type</Label>
              <Select
                value={workloadForm.type}
                onValueChange={(v) =>
                  setWorkloadForm({ ...workloadForm, type: v as K8sWorkload['type'] })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="deployment">Deployment</SelectItem>
                  <SelectItem value="statefulset">StatefulSet</SelectItem>
                  <SelectItem value="daemonset">DaemonSet</SelectItem>
                  <SelectItem value="job">Job</SelectItem>
                  <SelectItem value="cronjob">CronJob</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="workload-cluster">Cluster *</Label>
              <Select
                value={workloadForm.clusterId}
                onValueChange={(v) => setWorkloadForm({ ...workloadForm, clusterId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select cluster" />
                </SelectTrigger>
                <SelectContent>
                  {clusters.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="workload-namespace">Namespace</Label>
              <Input
                id="workload-namespace"
                value={workloadForm.namespace}
                onChange={(e) => setWorkloadForm({ ...workloadForm, namespace: e.target.value })}
                placeholder="default"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="workload-image">Container Image</Label>
              <Input
                id="workload-image"
                value={workloadForm.image}
                onChange={(e) => setWorkloadForm({ ...workloadForm, image: e.target.value })}
                placeholder="nginx:latest"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="workload-replicas">Replicas</Label>
              <Input
                id="workload-replicas"
                type="number"
                min="1"
                value={workloadForm.replicas}
                onChange={(e) =>
                  setWorkloadForm({ ...workloadForm, replicas: parseInt(e.target.value) || 1 })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsWorkloadDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveWorkload}>
              {editingWorkload ? 'Update' : 'Add'} Workload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Image Dialog */}
      <Dialog open={isImageDialogOpen} onOpenChange={setIsImageDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingImage ? 'Edit Image' : 'Add Image'}</DialogTitle>
            <DialogDescription>
              {editingImage ? 'Update the image details.' : 'Add a new container image to track.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="image-name">Image Name *</Label>
              <Input
                id="image-name"
                value={imageForm.name}
                onChange={(e) => setImageForm({ ...imageForm, name: e.target.value })}
                placeholder="nginx"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="image-tag">Tag</Label>
              <Input
                id="image-tag"
                value={imageForm.tag}
                onChange={(e) => setImageForm({ ...imageForm, tag: e.target.value })}
                placeholder="latest"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="image-registry">Registry</Label>
              <Input
                id="image-registry"
                value={imageForm.registry}
                onChange={(e) => setImageForm({ ...imageForm, registry: e.target.value })}
                placeholder="docker.io"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsImageDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveImage}>{editingImage ? 'Update' : 'Add'} Image</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the {deleteTarget?.type.slice(0, -1)} &quot;
              {(deleteTarget?.item as { name?: string })?.name ||
                (deleteTarget?.item as ContainerImage)?.fullName}
              &quot;. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cluster Details Sheet */}
      <ContainerDetailSheet
        asset={selectedCluster}
        open={!!selectedCluster}
        onOpenChange={() => setSelectedCluster(null)}
        icon={Server}
        iconColor="text-teal-500"
        gradientFrom="from-teal-500/20"
        gradientVia="via-teal-500/10"
        assetTypeName="Cluster"
        subtitle={
          selectedCluster
            ? `${providerConfig[selectedCluster.provider].label} - ${selectedCluster.version}`
            : undefined
        }
        onEdit={() => {
          if (selectedCluster) {
            setSelectedCluster(null)
            handleEditCluster(selectedCluster)
          }
        }}
        findingCount={selectedCluster?.findingCount || 0}
        statusBadge={
          selectedCluster && (
            <Badge
              variant="secondary"
              className={clusterStatusConfig[selectedCluster.status].color}
            >
              {clusterStatusConfig[selectedCluster.status].label}
            </Badge>
          )
        }
        quickActions={
          selectedCluster && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setClusterFilter(selectedCluster.id)
                  setMainTab('workloads')
                  setSelectedCluster(null)
                }}
              >
                <Layers className="mr-2 h-4 w-4" />
                View Workloads
              </Button>
              <Button size="sm" variant="outline" onClick={() => toast.info('Scanning cluster...')}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Rescan
              </Button>
            </>
          )
        }
        overviewContent={
          selectedCluster && (
            <>
              {/* Stats Grid */}
              <StatsGrid columns={2}>
                <StatCard
                  icon={Server}
                  iconBg="bg-blue-500/10"
                  iconColor="text-blue-500"
                  value={selectedCluster.nodeCount}
                  label="Nodes"
                />
                <StatCard
                  icon={Layers}
                  iconBg="bg-purple-500/10"
                  iconColor="text-purple-500"
                  value={selectedCluster.workloadCount}
                  label="Workloads"
                />
                <StatCard
                  icon={Box}
                  iconBg="bg-orange-500/10"
                  iconColor="text-orange-500"
                  value={selectedCluster.podCount}
                  label="Pods"
                />
                <StatCard
                  icon={Network}
                  iconBg="bg-green-500/10"
                  iconColor="text-green-500"
                  value={selectedCluster.namespaceCount}
                  label="Namespaces"
                />
              </StatsGrid>

              {/* Cluster Info */}
              <div className="rounded-xl border p-4 bg-card space-y-3">
                <SectionTitle>Cluster Information</SectionTitle>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Provider</p>
                    <p className="font-medium">{providerConfig[selectedCluster.provider].label}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Version</p>
                    <p className="font-medium">{selectedCluster.version}</p>
                  </div>
                  {selectedCluster.region && (
                    <div>
                      <p className="text-muted-foreground">Region</p>
                      <p className="font-medium">{selectedCluster.region}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-muted-foreground">Risk Score</p>
                    <RiskScoreBadge score={selectedCluster.riskScore} size="sm" />
                  </div>
                </div>
              </div>

              {/* API Server */}
              {selectedCluster.apiServerUrl && (
                <div className="rounded-xl border p-4 bg-card">
                  <SectionTitle>API Server</SectionTitle>
                  <code className="text-xs bg-muted px-2 py-1 rounded block overflow-x-auto">
                    {selectedCluster.apiServerUrl}
                  </code>
                </div>
              )}

              {/* Timeline */}
              <div className="rounded-xl border p-4 bg-card">
                <SectionTitle>Timeline</SectionTitle>
                <div className="space-y-3 mt-3">
                  <div className="flex items-start gap-3">
                    <div className="h-6 w-6 rounded-full bg-green-500/20 flex items-center justify-center mt-0.5">
                      <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Created</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(selectedCluster.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="h-6 w-6 rounded-full bg-blue-500/20 flex items-center justify-center mt-0.5">
                      <Clock className="h-3.5 w-3.5 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Last Seen</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(selectedCluster.lastSeen).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )
        }
      />

      {/* Workload Details Sheet */}
      <ContainerDetailSheet
        asset={selectedWorkload}
        open={!!selectedWorkload}
        onOpenChange={() => setSelectedWorkload(null)}
        icon={Layers}
        iconColor="text-blue-500"
        gradientFrom="from-blue-500/20"
        gradientVia="via-blue-500/10"
        assetTypeName="Workload"
        subtitle={
          selectedWorkload
            ? `${selectedWorkload.namespace} / ${selectedWorkload.clusterName}`
            : undefined
        }
        onEdit={() => {
          if (selectedWorkload) {
            setSelectedWorkload(null)
            handleEditWorkload(selectedWorkload)
          }
        }}
        findingCount={selectedWorkload?.findingCount || 0}
        statusBadge={
          selectedWorkload && (
            <Badge variant="secondary" className={workloadTypeConfig[selectedWorkload.type].color}>
              {workloadTypeConfig[selectedWorkload.type].label}
            </Badge>
          )
        }
        quickActions={
          selectedWorkload && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(selectedWorkload.images[0] || '')
                toast.success('Image copied')
              }}
            >
              <Copy className="mr-2 h-4 w-4" />
              Copy Image
            </Button>
          )
        }
        overviewContent={
          selectedWorkload && (
            <>
              {/* Stats */}
              <StatsGrid columns={2}>
                <StatCard
                  icon={CheckCircle}
                  iconBg="bg-green-500/10"
                  iconColor="text-green-500"
                  value={`${selectedWorkload.readyReplicas}/${selectedWorkload.replicas}`}
                  label="Replicas Ready"
                />
                <StatCard
                  icon={Shield}
                  iconBg="bg-orange-500/10"
                  iconColor="text-orange-500"
                  value={selectedWorkload.riskScore}
                  label="Risk Score"
                />
              </StatsGrid>

              {/* Images */}
              <div className="rounded-xl border p-4 bg-card">
                <SectionTitle>Container Images</SectionTitle>
                <div className="space-y-2 mt-2">
                  {selectedWorkload.images.map((image, i) => (
                    <code
                      key={i}
                      className="text-xs bg-muted px-2 py-1 rounded block overflow-x-auto"
                    >
                      {image}
                    </code>
                  ))}
                </div>
              </div>

              {/* Resource Limits */}
              <div className="rounded-xl border p-4 bg-card space-y-3">
                <SectionTitle>Resource Configuration</SectionTitle>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <Cpu className="h-4 w-4 text-blue-500" />
                    <div>
                      <p className="text-muted-foreground">CPU Request/Limit</p>
                      <p className="font-medium">
                        {selectedWorkload.cpuRequest || '-'} / {selectedWorkload.cpuLimit || '-'}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <HardDrive className="h-4 w-4 text-purple-500" />
                    <div>
                      <p className="text-muted-foreground">Memory Request/Limit</p>
                      <p className="font-medium">
                        {selectedWorkload.memoryRequest || '-'} /{' '}
                        {selectedWorkload.memoryLimit || '-'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Labels */}
              {selectedWorkload.labels && Object.keys(selectedWorkload.labels).length > 0 && (
                <div className="rounded-xl border p-4 bg-card">
                  <SectionTitle>Labels</SectionTitle>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {Object.entries(selectedWorkload.labels).map(([key, value]) => (
                      <Badge key={key} variant="outline" className="text-xs">
                        {key}: {value}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Timeline */}
              <div className="rounded-xl border p-4 bg-card">
                <SectionTitle>Timeline</SectionTitle>
                <div className="space-y-3 mt-3">
                  <div className="flex items-start gap-3">
                    <div className="h-6 w-6 rounded-full bg-green-500/20 flex items-center justify-center mt-0.5">
                      <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Created</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(selectedWorkload.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="h-6 w-6 rounded-full bg-blue-500/20 flex items-center justify-center mt-0.5">
                      <Clock className="h-3.5 w-3.5 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Last Seen</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(selectedWorkload.lastSeen).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )
        }
      />

      {/* Image Details Sheet */}
      <ContainerDetailSheet
        asset={selectedImage}
        open={!!selectedImage}
        onOpenChange={() => setSelectedImage(null)}
        icon={Container}
        iconColor="text-purple-500"
        gradientFrom="from-purple-500/20"
        gradientVia="via-purple-500/10"
        assetTypeName="Image"
        subtitle={selectedImage ? `${selectedImage.tag} - ${selectedImage.registry}` : undefined}
        onEdit={() => {
          if (selectedImage) {
            setSelectedImage(null)
            handleEditImage(selectedImage)
          }
        }}
        showFindingsTab={false}
        quickActions={
          selectedImage && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(selectedImage.fullName)
                  toast.success('Image name copied')
                }}
              >
                <Copy className="mr-2 h-4 w-4" />
                Copy Full Name
              </Button>
              <Button size="sm" variant="outline" onClick={() => toast.info('Scanning image...')}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Rescan
              </Button>
            </>
          )
        }
        overviewContent={
          selectedImage && (
            <>
              {/* Vulnerability Summary */}
              <div className="rounded-xl border p-4 bg-card">
                <SectionTitle>Vulnerability Summary</SectionTitle>
                <div className="grid grid-cols-4 gap-2 mt-3">
                  <div className="text-center p-3 rounded-lg bg-red-500/10">
                    <p className="text-2xl font-bold text-red-500">
                      {selectedImage.vulnerabilities.critical}
                    </p>
                    <p className="text-xs text-muted-foreground">Critical</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-orange-500/10">
                    <p className="text-2xl font-bold text-orange-500">
                      {selectedImage.vulnerabilities.high}
                    </p>
                    <p className="text-xs text-muted-foreground">High</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-yellow-500/10">
                    <p className="text-2xl font-bold text-yellow-500">
                      {selectedImage.vulnerabilities.medium}
                    </p>
                    <p className="text-xs text-muted-foreground">Medium</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-blue-500/10">
                    <p className="text-2xl font-bold text-blue-500">
                      {selectedImage.vulnerabilities.low}
                    </p>
                    <p className="text-xs text-muted-foreground">Low</p>
                  </div>
                </div>
              </div>

              {/* Image Info */}
              <div className="rounded-xl border p-4 bg-card space-y-3">
                <SectionTitle>Image Information</SectionTitle>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Registry</p>
                    <p className="font-medium">{selectedImage.registry}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Size</p>
                    <p className="font-medium">{selectedImage.size} MB</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">OS</p>
                    <p className="font-medium">{selectedImage.os || '-'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Architecture</p>
                    <p className="font-medium">{selectedImage.architecture || '-'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Used By</p>
                    <p className="font-medium">{selectedImage.workloadCount} workloads</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Risk Score</p>
                    <RiskScoreBadge score={selectedImage.riskScore} size="sm" />
                  </div>
                </div>
              </div>

              {/* Digest */}
              {selectedImage.digest && (
                <div className="rounded-xl border p-4 bg-card">
                  <SectionTitle>Image Digest</SectionTitle>
                  <code className="text-xs bg-muted px-2 py-1 rounded block overflow-x-auto mt-2">
                    {selectedImage.digest}
                  </code>
                </div>
              )}

              {/* Timeline */}
              <div className="rounded-xl border p-4 bg-card">
                <SectionTitle>Timeline</SectionTitle>
                <div className="space-y-3 mt-3">
                  {selectedImage.lastScanned && (
                    <div className="flex items-start gap-3">
                      <div className="h-6 w-6 rounded-full bg-green-500/20 flex items-center justify-center mt-0.5">
                        <RefreshCw className="h-3.5 w-3.5 text-green-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Last Scanned</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(selectedImage.lastScanned).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  )}
                  {selectedImage.pushedAt && (
                    <div className="flex items-start gap-3">
                      <div className="h-6 w-6 rounded-full bg-blue-500/20 flex items-center justify-center mt-0.5">
                        <HardDrive className="h-3.5 w-3.5 text-blue-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Pushed</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(selectedImage.pushedAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-start gap-3">
                    <div className="h-6 w-6 rounded-full bg-purple-500/20 flex items-center justify-center mt-0.5">
                      <Clock className="h-3.5 w-3.5 text-purple-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">First Discovered</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(selectedImage.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )
        }
      />
    </>
  )
}
