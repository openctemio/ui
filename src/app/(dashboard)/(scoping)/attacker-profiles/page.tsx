'use client'

import { useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import useSWR from 'swr'
import { Main } from '@/components/layout'
import { PageHeader, EmptyState, DataTable, DataTableColumnHeader } from '@/features/shared'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus, Trash2, Lock, Target } from 'lucide-react'
import { get, post, del } from '@/lib/api/client'
import { Can, Permission } from '@/lib/permissions'
import { toast } from 'sonner'

interface AttackerProfile {
  id: string
  name: string
  description: string
  profile_type: string
  capabilities: {
    network_access?: string
    credential_level?: string
    persistence?: boolean
    tools?: string[]
  }
  assumptions?: string
  is_default: boolean
  created_at: string
  updated_at: string
}

interface PaginatedResponse {
  data: AttackerProfile[]
  total: number
  page: number
  per_page: number
}

// Profile-type values mirror the backend's attacker-profile taxonomy
// (external_unauth, external_stolen_creds, malicious_insider,
// supplier_compromise, custom). The UI previously used a different, invented
// set (nation_state/…) that never matched what the API stored.
const profileTypeColors: Record<string, string> = {
  external_unauth: 'bg-red-500/10 text-red-500 border-red-500/20',
  external_stolen_creds: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  malicious_insider: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  supplier_compromise: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  custom: 'bg-muted text-muted-foreground',
}

const profileTypeLabels: Record<string, string> = {
  external_unauth: 'External (Unauthenticated)',
  external_stolen_creds: 'External (Stolen Credentials)',
  malicious_insider: 'Malicious Insider',
  supplier_compromise: 'Supply Chain Compromise',
  custom: 'Custom',
}

const NETWORK_ACCESS_OPTIONS = ['external', 'internal', 'dmz'] as const
const CREDENTIAL_LEVEL_OPTIONS = ['none', 'user', 'admin'] as const

export default function AttackerProfilesPage() {
  const {
    data: response,
    isLoading,
    mutate,
  } = useSWR<PaginatedResponse>('/api/v1/attacker-profiles?per_page=100', get, {
    revalidateOnFocus: false,
  })

  const profiles = response?.data ?? []

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [deleteProfile, setDeleteProfile] = useState<AttackerProfile | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    profile_type: 'custom' as string,
    networkAccess: 'external',
    credentialLevel: 'none',
    persistence: false,
    tools: '',
    assumptions: '',
  })

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      profile_type: 'custom',
      networkAccess: 'external',
      credentialLevel: 'none',
      persistence: false,
      tools: '',
      assumptions: '',
    })
  }

  const handleCreate = async () => {
    if (!formData.name) {
      toast.error('Please provide a profile name')
      return
    }
    try {
      // The backend requires `capabilities` as a structured object, not a
      // string array — sending an array 400s and the create silently failed.
      await post('/api/v1/attacker-profiles', {
        name: formData.name,
        description: formData.description,
        profile_type: formData.profile_type,
        capabilities: {
          network_access: formData.networkAccess,
          credential_level: formData.credentialLevel,
          persistence: formData.persistence,
          tools: formData.tools
            .split(',')
            .map((c) => c.trim())
            .filter(Boolean),
        },
        assumptions: formData.assumptions || undefined,
      })
      await mutate()
      toast.success('Attacker profile created')
      setIsCreateOpen(false)
      resetForm()
    } catch {
      toast.error('Failed to create attacker profile')
    }
  }

  const handleDelete = async () => {
    if (!deleteProfile) return
    try {
      await del(`/api/v1/attacker-profiles/${deleteProfile.id}`)
      await mutate()
      toast.success('Attacker profile deleted')
      setDeleteProfile(null)
    } catch {
      toast.error('Failed to delete attacker profile')
    }
  }

  const columns = useMemo<ColumnDef<AttackerProfile>[]>(
    () => [
      {
        accessorKey: 'name',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
        cell: ({ row }) => {
          const profile = row.original
          return (
            <div className="flex items-center gap-2 font-medium">
              {profile.name}
              {profile.is_default && <Lock className="h-3 w-3 text-muted-foreground" />}
            </div>
          )
        },
      },
      {
        accessorKey: 'profile_type',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Type" />,
        cell: ({ row }) => {
          const profile = row.original
          return (
            <Badge
              variant="outline"
              className={profileTypeColors[profile.profile_type] || profileTypeColors.custom}
            >
              {profileTypeLabels[profile.profile_type] || profile.profile_type}
            </Badge>
          )
        },
      },
      {
        id: 'capabilities',
        header: 'Capabilities',
        enableSorting: false,
        cell: ({ row }) => {
          const profile = row.original
          const caps = profile.capabilities ?? {}
          const items: string[] = []
          if (caps.network_access) items.push(`net: ${caps.network_access}`)
          if (caps.credential_level) items.push(`cred: ${caps.credential_level}`)
          if (caps.persistence) items.push('persistent')
          if (Array.isArray(caps.tools)) {
            items.push(...caps.tools.slice(0, 2))
          }
          return (
            <div className="flex flex-wrap gap-1">
              {items.slice(0, 3).map((cap, i) => (
                <Badge key={`${cap}-${i}`} variant="secondary" className="text-xs">
                  {cap}
                </Badge>
              ))}
              {items.length > 3 && (
                <Badge variant="secondary" className="text-xs">
                  +{items.length - 3}
                </Badge>
              )}
            </div>
          )
        },
      },
      {
        accessorKey: 'is_default',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Default" />,
        cell: ({ row }) =>
          row.original.is_default ? (
            <Badge variant="outline">Default</Badge>
          ) : (
            <span className="text-muted-foreground text-sm">Custom</span>
          ),
      },
      {
        id: 'actions',
        header: 'Actions',
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) => {
          const profile = row.original
          if (profile.is_default) return null
          return (
            <div className="text-end">
              <Can permission={Permission.AttackerProfilesWrite}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDeleteProfile(profile)}
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </Can>
            </div>
          )
        },
      },
    ],
    []
  )

  return (
    <>
      <Main>
        <PageHeader
          title="Attacker Profiles"
          description="Define threat actor profiles for exposure assessment"
        >
          <Can permission={Permission.AttackerProfilesWrite}>
            <Button size="sm" onClick={() => setIsCreateOpen(true)}>
              <Plus className="me-2 h-4 w-4" />
              New Profile
            </Button>
          </Can>
        </PageHeader>

        <Card>
          <CardHeader>
            <CardTitle>All Profiles</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : profiles.length === 0 ? (
              <EmptyState
                icon={Target}
                title="No attacker profiles yet."
                description="Create one to get started."
                card={false}
              />
            ) : (
              <DataTable columns={columns} data={profiles} searchPlaceholder="Search profiles..." />
            )}
          </CardContent>
        </Card>
      </Main>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Attacker Profile</DialogTitle>
            <DialogDescription>Define a new threat actor profile for scoping</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Financially Motivated APT"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe the attacker profile..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile_type">Profile Type</Label>
              <Select
                value={formData.profile_type}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    profile_type: value as AttackerProfile['profile_type'],
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="external_unauth">External (Unauthenticated)</SelectItem>
                  <SelectItem value="external_stolen_creds">
                    External (Stolen Credentials)
                  </SelectItem>
                  <SelectItem value="malicious_insider">Malicious Insider</SelectItem>
                  <SelectItem value="supplier_compromise">Supply Chain Compromise</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="network_access">Network Access</Label>
                <Select
                  value={formData.networkAccess}
                  onValueChange={(value) => setFormData({ ...formData, networkAccess: value })}
                >
                  <SelectTrigger id="network_access">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {NETWORK_ACCESS_OPTIONS.map((o) => (
                      <SelectItem key={o} value={o} className="capitalize">
                        {o}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="credential_level">Credential Level</Label>
                <Select
                  value={formData.credentialLevel}
                  onValueChange={(value) => setFormData({ ...formData, credentialLevel: value })}
                >
                  <SelectTrigger id="credential_level">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CREDENTIAL_LEVEL_OPTIONS.map((o) => (
                      <SelectItem key={o} value={o} className="capitalize">
                        {o}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="persistence"
                checked={formData.persistence}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, persistence: checked as boolean })
                }
              />
              <Label htmlFor="persistence" className="cursor-pointer">
                Can establish persistence
              </Label>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tools">Tools</Label>
              <Input
                id="tools"
                value={formData.tools}
                onChange={(e) => setFormData({ ...formData, tools: e.target.value })}
                placeholder="Comma-separated, e.g., nmap, metasploit, commodity"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="assumptions">Assumptions</Label>
              <Textarea
                id="assumptions"
                value={formData.assumptions}
                onChange={(e) => setFormData({ ...formData, assumptions: e.target.value })}
                placeholder="What this threat actor is assumed to be able to do"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteProfile}
        onOpenChange={(open) => !open && setDeleteProfile(null)}
        title="Delete Attacker Profile?"
        desc={
          <>
            Are you sure you want to delete &quot;{deleteProfile?.name}&quot;? This action cannot be
            undone.
          </>
        }
        confirmText="Delete"
        destructive
        handleConfirm={handleDelete}
      />
    </>
  )
}
