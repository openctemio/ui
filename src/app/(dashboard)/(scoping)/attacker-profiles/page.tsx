'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { Main } from '@/components/layout'
import { PageHeader } from '@/features/shared'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { Skeleton } from '@/components/ui/skeleton'
import { Plus, Trash2, Lock } from 'lucide-react'
import { get, post, del } from '@/lib/api/client'
import { toast } from 'sonner'

interface AttackerProfile {
  id: string
  name: string
  description: string
  profile_type:
    | 'nation_state'
    | 'cybercriminal'
    | 'hacktivist'
    | 'insider'
    | 'script_kiddie'
    | 'custom'
  capabilities: {
    network_access?: string
    credential_level?: string
    persistence?: boolean
    tools?: string[]
  }
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

const profileTypeColors: Record<string, string> = {
  nation_state: 'bg-red-500/10 text-red-500 border-red-500/20',
  cybercriminal: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  hacktivist: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  insider: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  script_kiddie: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  custom: 'bg-muted text-muted-foreground',
}

const profileTypeLabels: Record<string, string> = {
  nation_state: 'Nation State',
  cybercriminal: 'Cybercriminal',
  hacktivist: 'Hacktivist',
  insider: 'Insider',
  script_kiddie: 'Script Kiddie',
  custom: 'Custom',
}

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
    profile_type: 'custom' as AttackerProfile['profile_type'],
    capabilities: '',
  })

  const resetForm = () => {
    setFormData({ name: '', description: '', profile_type: 'custom', capabilities: '' })
  }

  const handleCreate = async () => {
    if (!formData.name) {
      toast.error('Please provide a profile name')
      return
    }
    try {
      await post('/api/v1/attacker-profiles', {
        name: formData.name,
        description: formData.description,
        profile_type: formData.profile_type,
        capabilities: formData.capabilities
          .split(',')
          .map((c) => c.trim())
          .filter(Boolean),
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

  return (
    <>
      <Main>
        <PageHeader
          title="Attacker Profiles"
          description="Define threat actor profiles for exposure assessment"
        >
          <Button size="sm" onClick={() => setIsCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Profile
          </Button>
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
              <p className="text-muted-foreground text-center py-8 text-sm">
                No attacker profiles yet. Create one to get started.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Capabilities</TableHead>
                    <TableHead>Default</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {profiles.map((profile) => (
                    <TableRow key={profile.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {profile.name}
                          {profile.is_default && <Lock className="h-3 w-3 text-muted-foreground" />}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            profileTypeColors[profile.profile_type] || profileTypeColors.custom
                          }
                        >
                          {profileTypeLabels[profile.profile_type] || profile.profile_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {(() => {
                            const caps = profile.capabilities ?? {}
                            const items: string[] = []
                            if (caps.network_access) items.push(`net: ${caps.network_access}`)
                            if (caps.credential_level) items.push(`cred: ${caps.credential_level}`)
                            if (caps.persistence) items.push('persistent')
                            if (Array.isArray(caps.tools)) {
                              items.push(...caps.tools.slice(0, 2))
                            }
                            return (
                              <>
                                {items.slice(0, 3).map((cap, i) => (
                                  <Badge
                                    key={`${cap}-${i}`}
                                    variant="secondary"
                                    className="text-xs"
                                  >
                                    {cap}
                                  </Badge>
                                ))}
                                {items.length > 3 && (
                                  <Badge variant="secondary" className="text-xs">
                                    +{items.length - 3}
                                  </Badge>
                                )}
                              </>
                            )
                          })()}
                        </div>
                      </TableCell>
                      <TableCell>
                        {profile.is_default ? (
                          <Badge variant="outline">Default</Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">Custom</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {!profile.is_default && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteProfile(profile)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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
                  <SelectItem value="nation_state">Nation State</SelectItem>
                  <SelectItem value="cybercriminal">Cybercriminal</SelectItem>
                  <SelectItem value="hacktivist">Hacktivist</SelectItem>
                  <SelectItem value="insider">Insider</SelectItem>
                  <SelectItem value="script_kiddie">Script Kiddie</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="capabilities">Capabilities</Label>
              <Input
                id="capabilities"
                value={formData.capabilities}
                onChange={(e) => setFormData({ ...formData, capabilities: e.target.value })}
                placeholder="Comma-separated, e.g., phishing, zero-day, lateral movement"
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

      <AlertDialog open={!!deleteProfile} onOpenChange={(open) => !open && setDeleteProfile(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Attacker Profile?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleteProfile?.name}&quot;? This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
