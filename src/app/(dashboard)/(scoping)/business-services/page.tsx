'use client'

import { useMemo, useState } from 'react'
import useSWR from 'swr'
import { Main } from '@/components/layout'
import { PageHeader } from '@/features/shared'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Briefcase,
  AlertTriangle,
  ShieldCheck,
  DollarSign,
} from 'lucide-react'
import { toast } from 'sonner'
import { get, post, put, del } from '@/lib/api/client'

type Criticality = 'critical' | 'high' | 'medium' | 'low'

interface BusinessService {
  id: string
  name: string
  description: string
  criticality: Criticality
  compliance_scope: string[]
  handles_pii: boolean
  handles_phi: boolean
  handles_financial: boolean
  availability_target?: number
  rpo_minutes?: number
  rto_minutes?: number
  owner_name: string
  owner_email: string
  created_at: string
  updated_at: string
}

interface ListResponse {
  data?: BusinessService[]
}

const COMPLIANCE_FRAMEWORKS = ['PCI-DSS', 'HIPAA', 'SOC2', 'GDPR', 'ISO27001', 'NIST'] as const

const criticalityColors: Record<Criticality, string> = {
  critical: 'bg-red-500/10 text-red-500 border-red-500/20',
  high: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  medium: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  low: 'bg-green-500/10 text-green-500 border-green-500/20',
}

interface FormState {
  name: string
  description: string
  criticality: Criticality
  compliance_scope: string[]
  handles_pii: boolean
  handles_phi: boolean
  handles_financial: boolean
  availability_target: string
  rpo_minutes: string
  rto_minutes: string
  owner_name: string
  owner_email: string
}

const emptyForm: FormState = {
  name: '',
  description: '',
  criticality: 'medium',
  compliance_scope: [],
  handles_pii: false,
  handles_phi: false,
  handles_financial: false,
  availability_target: '',
  rpo_minutes: '',
  rto_minutes: '',
  owner_name: '',
  owner_email: '',
}

export default function BusinessServicesPage() {
  const { data, mutate, isLoading } = useSWR<ListResponse>(
    '/api/v1/business-services',
    (url: string) => get<ListResponse>(url)
  )

  const services: BusinessService[] = useMemo(() => data?.data ?? [], [data])

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingService, setEditingService] = useState<BusinessService | null>(null)
  const [deletingService, setDeletingService] = useState<BusinessService | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [isSaving, setIsSaving] = useState(false)

  const stats = useMemo(() => {
    return {
      total: services.length,
      critical: services.filter((s) => s.criticality === 'critical').length,
      pii: services.filter((s) => s.handles_pii).length,
      financial: services.filter((s) => s.handles_financial).length,
    }
  }, [services])

  function openCreate() {
    setEditingService(null)
    setForm(emptyForm)
    setIsDialogOpen(true)
  }

  function openEdit(service: BusinessService) {
    setEditingService(service)
    setForm({
      name: service.name,
      description: service.description ?? '',
      criticality: service.criticality,
      compliance_scope: service.compliance_scope ?? [],
      handles_pii: service.handles_pii,
      handles_phi: service.handles_phi,
      handles_financial: service.handles_financial,
      availability_target:
        service.availability_target != null ? String(service.availability_target) : '',
      rpo_minutes: service.rpo_minutes != null ? String(service.rpo_minutes) : '',
      rto_minutes: service.rto_minutes != null ? String(service.rto_minutes) : '',
      owner_name: service.owner_name ?? '',
      owner_email: service.owner_email ?? '',
    })
    setIsDialogOpen(true)
  }

  function toggleCompliance(framework: string) {
    setForm((prev) => {
      const exists = prev.compliance_scope.includes(framework)
      return {
        ...prev,
        compliance_scope: exists
          ? prev.compliance_scope.filter((f) => f !== framework)
          : [...prev.compliance_scope, framework],
      }
    })
  }

  async function handleSave() {
    if (!form.name.trim()) {
      toast.error('Name is required')
      return
    }

    const payload: Record<string, unknown> = {
      name: form.name.trim(),
      description: form.description.trim(),
      criticality: form.criticality,
      compliance_scope: form.compliance_scope,
      handles_pii: form.handles_pii,
      handles_phi: form.handles_phi,
      handles_financial: form.handles_financial,
      owner_name: form.owner_name.trim(),
      owner_email: form.owner_email.trim(),
    }

    if (form.availability_target) {
      const val = Number(form.availability_target)
      if (!Number.isNaN(val)) payload.availability_target = val
    }
    if (form.rpo_minutes) {
      const val = Number(form.rpo_minutes)
      if (!Number.isNaN(val)) payload.rpo_minutes = val
    }
    if (form.rto_minutes) {
      const val = Number(form.rto_minutes)
      if (!Number.isNaN(val)) payload.rto_minutes = val
    }

    setIsSaving(true)
    try {
      if (editingService) {
        await put(`/api/v1/business-services/${editingService.id}`, payload)
        toast.success('Business service updated')
      } else {
        await post('/api/v1/business-services', payload)
        toast.success('Business service created')
      }
      setIsDialogOpen(false)
      setEditingService(null)
      setForm(emptyForm)
      await mutate()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save business service'
      toast.error(message)
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete() {
    if (!deletingService) return
    try {
      await del(`/api/v1/business-services/${deletingService.id}`)
      toast.success('Business service deleted')
      setDeletingService(null)
      await mutate()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete business service'
      toast.error(message)
    }
  }

  return (
    <Main>
      <PageHeader
        title="Business Services"
        description="Define business services and their compliance, data handling, and availability requirements."
      >
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Create Service
        </Button>
      </PageHeader>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mt-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Services</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Services</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.critical}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Handles PII</CardTitle>
            <ShieldCheck className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pii}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Handles Financial</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.financial}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Criticality</TableHead>
                <TableHead>Data Handling</TableHead>
                <TableHead>Compliance Scope</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Availability</TableHead>
                <TableHead className="w-[50px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : services.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No business services yet. Click &quot;Create Service&quot; to add one.
                  </TableCell>
                </TableRow>
              ) : (
                services.map((service) => (
                  <TableRow key={service.id}>
                    <TableCell className="font-medium">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="cursor-help">{service.name}</span>
                          </TooltipTrigger>
                          {service.description && (
                            <TooltipContent className="max-w-sm">
                              {service.description}
                            </TooltipContent>
                          )}
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={criticalityColors[service.criticality]}>
                        {service.criticality}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {service.handles_pii && (
                          <Badge variant="secondary" className="text-xs">
                            PII
                          </Badge>
                        )}
                        {service.handles_phi && (
                          <Badge variant="secondary" className="text-xs">
                            PHI
                          </Badge>
                        )}
                        {service.handles_financial && (
                          <Badge variant="secondary" className="text-xs">
                            Financial
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(service.compliance_scope ?? []).map((framework) => (
                          <Badge key={framework} variant="outline" className="text-xs">
                            {framework}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm">{service.owner_name || '—'}</span>
                        {service.owner_email && (
                          <span className="text-xs text-muted-foreground">
                            {service.owner_email}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {service.availability_target != null
                        ? `${service.availability_target.toFixed(2)}%`
                        : '—'}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(service)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-500"
                            onClick={() => setDeletingService(service)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingService ? 'Edit Business Service' : 'Create Business Service'}
            </DialogTitle>
            <DialogDescription>
              Define the business service and its associated compliance and data handling
              properties.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Customer Payment Service"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Briefly describe what this service does"
                rows={3}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="criticality">Criticality</Label>
              <Select
                value={form.criticality}
                onValueChange={(value) => setForm({ ...form, criticality: value as Criticality })}
              >
                <SelectTrigger id="criticality">
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

            <div className="grid gap-2">
              <Label>Compliance Scope</Label>
              <div className="flex flex-wrap gap-2">
                {COMPLIANCE_FRAMEWORKS.map((framework) => {
                  const selected = form.compliance_scope.includes(framework)
                  return (
                    <Badge
                      key={framework}
                      variant={selected ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => toggleCompliance(framework)}
                    >
                      {framework}
                    </Badge>
                  )
                })}
              </div>
            </div>

            <div className="grid gap-3 rounded-md border p-3">
              <Label className="text-sm font-semibold">Data Handling</Label>
              <div className="flex items-center justify-between">
                <Label htmlFor="handles_pii" className="font-normal">
                  Handles PII
                </Label>
                <Switch
                  id="handles_pii"
                  checked={form.handles_pii}
                  onCheckedChange={(checked) => setForm({ ...form, handles_pii: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="handles_phi" className="font-normal">
                  Handles PHI
                </Label>
                <Switch
                  id="handles_phi"
                  checked={form.handles_phi}
                  onCheckedChange={(checked) => setForm({ ...form, handles_phi: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="handles_financial" className="font-normal">
                  Handles Financial Data
                </Label>
                <Switch
                  id="handles_financial"
                  checked={form.handles_financial}
                  onCheckedChange={(checked) => setForm({ ...form, handles_financial: checked })}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="availability_target">Availability (%)</Label>
                <Input
                  id="availability_target"
                  type="number"
                  step="0.01"
                  value={form.availability_target}
                  onChange={(e) => setForm({ ...form, availability_target: e.target.value })}
                  placeholder="99.99"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="rpo_minutes">RPO (min)</Label>
                <Input
                  id="rpo_minutes"
                  type="number"
                  value={form.rpo_minutes}
                  onChange={(e) => setForm({ ...form, rpo_minutes: e.target.value })}
                  placeholder="60"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="rto_minutes">RTO (min)</Label>
                <Input
                  id="rto_minutes"
                  type="number"
                  value={form.rto_minutes}
                  onChange={(e) => setForm({ ...form, rto_minutes: e.target.value })}
                  placeholder="120"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="owner_name">Owner Name</Label>
                <Input
                  id="owner_name"
                  value={form.owner_name}
                  onChange={(e) => setForm({ ...form, owner_name: e.target.value })}
                  placeholder="Jane Doe"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="owner_email">Owner Email</Label>
                <Input
                  id="owner_email"
                  type="email"
                  value={form.owner_email}
                  onChange={(e) => setForm({ ...form, owner_email: e.target.value })}
                  placeholder="jane@example.com"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Saving...' : editingService ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deletingService}
        onOpenChange={(open) => !open && setDeletingService(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete business service?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &quot;{deletingService?.name}&quot;. This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-500 text-white hover:bg-red-600"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Main>
  )
}
