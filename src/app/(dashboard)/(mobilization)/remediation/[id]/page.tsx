'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSWRConfig } from 'swr'
import { Main } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { getErrorMessage } from '@/lib/api/error-handler'
import {
  ArrowLeft,
  Calendar,
  CheckCircle,
  CirclePause,
  Play,
  XCircle,
  Pencil,
  Save,
  X,
  Users,
  Tag,
  Target,
  TrendingDown,
} from 'lucide-react'
import {
  useRemediationCampaign,
  useUpdateRemediationCampaign,
  useUpdateCampaignStatus,
} from '@/features/remediation/api/use-remediation-campaigns'

// --- Status / Priority display helpers ---

const STATUS_CONFIG: Record<
  string,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  draft: { label: 'Draft', variant: 'secondary' },
  active: { label: 'Active', variant: 'default' },
  paused: { label: 'Paused', variant: 'outline' },
  validating: { label: 'Validating', variant: 'secondary' },
  completed: { label: 'Completed', variant: 'default' },
  canceled: { label: 'Canceled', variant: 'destructive' },
}

const PRIORITY_CONFIG: Record<string, { label: string; className: string }> = {
  urgent: {
    label: 'Urgent',
    className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100',
  },
  high: {
    label: 'High',
    className: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100',
  },
  medium: {
    label: 'Medium',
    className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100',
  },
  low: { label: 'Low', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100' },
}

/** Which status transitions are allowed from a given status */
const STATUS_ACTIONS: Record<string, { label: string; status: string; icon: React.ReactNode }[]> = {
  draft: [
    { label: 'Activate', status: 'active', icon: <Play className="mr-2 h-4 w-4" /> },
    { label: 'Cancel', status: 'canceled', icon: <XCircle className="mr-2 h-4 w-4" /> },
  ],
  active: [
    { label: 'Pause', status: 'paused', icon: <CirclePause className="mr-2 h-4 w-4" /> },
    {
      label: 'Start Validation',
      status: 'validating',
      icon: <CheckCircle className="mr-2 h-4 w-4" />,
    },
    { label: 'Cancel', status: 'canceled', icon: <XCircle className="mr-2 h-4 w-4" /> },
  ],
  paused: [
    { label: 'Resume', status: 'active', icon: <Play className="mr-2 h-4 w-4" /> },
    { label: 'Cancel', status: 'canceled', icon: <XCircle className="mr-2 h-4 w-4" /> },
  ],
  validating: [
    { label: 'Complete', status: 'completed', icon: <CheckCircle className="mr-2 h-4 w-4" /> },
    { label: 'Back to Active', status: 'active', icon: <Play className="mr-2 h-4 w-4" /> },
  ],
  completed: [],
  canceled: [
    { label: 'Reopen as Draft', status: 'draft', icon: <Play className="mr-2 h-4 w-4" /> },
  ],
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '--'
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return '--'
  }
}

// --- Loading skeleton ---

function LoadingSkeleton() {
  return (
    <Main>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-9 w-9" />
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-6 w-16" />
        </div>
        <Card>
          <CardContent className="pt-6">
            <Skeleton className="mb-2 h-4 w-48" />
            <Skeleton className="h-3 w-full" />
          </CardContent>
        </Card>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="mb-2 h-4 w-24" />
                <Skeleton className="h-6 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </Main>
  )
}

// --- Main page component ---

export default function CampaignDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { mutate: globalMutate } = useSWRConfig()
  const id = params.id as string

  const { data: campaign, error, isLoading, mutate: mutateCampaign } = useRemediationCampaign(id)
  const { trigger: updateCampaign, isMutating: isUpdating } = useUpdateRemediationCampaign(id)
  const { trigger: updateStatus, isMutating: isStatusUpdating } = useUpdateCampaignStatus(id)

  // Inline edit state
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    priority: '',
  })

  const startEditing = () => {
    if (!campaign) return
    setEditForm({
      name: campaign.name,
      description: campaign.description || '',
      priority: campaign.priority,
    })
    setIsEditing(true)
  }

  const cancelEditing = () => {
    setIsEditing(false)
  }

  const saveEdits = async () => {
    try {
      await updateCampaign({
        name: editForm.name,
        description: editForm.description,
        priority: editForm.priority,
      })
      await mutateCampaign()
      globalMutate(
        (key: unknown) => typeof key === 'string' && key.includes('/remediation/campaigns')
      )
      setIsEditing(false)
      toast.success('Campaign updated')
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to update campaign'))
    }
  }

  const handleStatusChange = async (newStatus: string) => {
    try {
      await updateStatus({ status: newStatus })
      await mutateCampaign()
      globalMutate(
        (key: unknown) => typeof key === 'string' && key.includes('/remediation/campaigns')
      )
      toast.success(`Campaign status changed to ${STATUS_CONFIG[newStatus]?.label || newStatus}`)
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to update status'))
    }
  }

  if (isLoading) {
    return <LoadingSkeleton />
  }

  if (error || !campaign) {
    return (
      <Main>
        <div className="flex h-[50vh] items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-semibold">Campaign Not Found</h2>
            <p className="text-muted-foreground mt-2">
              The campaign with ID &quot;{id}&quot; does not exist.
            </p>
            <Button className="mt-4" onClick={() => router.push('/remediation')}>
              Return to Remediation
            </Button>
          </div>
        </div>
      </Main>
    )
  }

  const statusCfg = STATUS_CONFIG[campaign.status] || {
    label: campaign.status,
    variant: 'secondary' as const,
  }
  const priorityCfg = PRIORITY_CONFIG[campaign.priority] || {
    label: campaign.priority,
    className: '',
  }
  const actions = STATUS_ACTIONS[campaign.status] || []

  return (
    <Main>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => router.push('/remediation')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="min-w-0">
              {isEditing ? (
                <Input
                  value={editForm.name}
                  onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                  className="text-lg font-semibold"
                />
              ) : (
                <h1 className="truncate text-2xl font-semibold tracking-tight">{campaign.name}</h1>
              )}
              <div className="mt-1 flex items-center gap-2">
                <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
                <Badge className={priorityCfg.className} variant="outline">
                  {priorityCfg.label}
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <Button variant="outline" size="sm" onClick={cancelEditing} disabled={isUpdating}>
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
                <Button size="sm" onClick={saveEdits} disabled={isUpdating}>
                  <Save className="mr-2 h-4 w-4" />
                  {isUpdating ? 'Saving...' : 'Save'}
                </Button>
              </>
            ) : (
              <Button variant="outline" size="sm" onClick={startEditing}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Button>
            )}
          </div>
        </div>

        {/* Description (editable) */}
        {isEditing ? (
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div>
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                  rows={3}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Priority</label>
                <Select
                  value={editForm.priority}
                  onValueChange={(v) => setEditForm((f) => ({ ...f, priority: v }))}
                >
                  <SelectTrigger className="mt-1 w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        ) : campaign.description ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground text-sm">{campaign.description}</p>
            </CardContent>
          </Card>
        ) : null}

        {/* Progress */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="h-4 w-4" />
              Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {campaign.resolved_count} of {campaign.finding_count} findings resolved
              </span>
              <span className="font-medium">{campaign.progress}%</span>
            </div>
            <Progress value={campaign.progress} className="h-2" />
          </CardContent>
        </Card>

        {/* Info cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                Start Date
              </div>
              <p className="mt-1 text-lg font-medium">{formatDate(campaign.start_date)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                Due Date
              </div>
              <p className="mt-1 text-lg font-medium">{formatDate(campaign.due_date)}</p>
              {campaign.is_overdue && (
                <Badge variant="destructive" className="mt-1">
                  Overdue
                </Badge>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                Assigned Team
              </div>
              <p className="mt-1 text-lg font-medium">{campaign.assigned_team || '--'}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <TrendingDown className="h-4 w-4" />
                Risk Reduction
              </div>
              <p className="mt-1 text-lg font-medium">
                {campaign.risk_reduction != null ? `${campaign.risk_reduction}%` : '--'}
              </p>
              {campaign.risk_before != null && campaign.risk_after != null && (
                <p className="text-muted-foreground mt-0.5 text-xs">
                  {campaign.risk_before} &rarr; {campaign.risk_after}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Tags */}
        {campaign.tags && campaign.tags.length > 0 && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <Tag className="h-4 w-4" />
                Tags
              </div>
              <div className="flex flex-wrap gap-2">
                {campaign.tags.map((tag) => (
                  <Badge key={tag} variant="outline">
                    {tag}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Status actions */}
        {actions.length > 0 && (
          <>
            <Separator />
            <div className="flex flex-wrap gap-2">
              {actions.map((action) => (
                <Button
                  key={action.status}
                  variant={action.status === 'canceled' ? 'destructive' : 'outline'}
                  size="sm"
                  disabled={isStatusUpdating}
                  onClick={() => handleStatusChange(action.status)}
                >
                  {action.icon}
                  {action.label}
                </Button>
              ))}
            </div>
          </>
        )}

        {/* Completed info */}
        {campaign.completed_at && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Completed on {formatDate(campaign.completed_at)}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Main>
  )
}
