'use client'

import { useState } from 'react'
import { toast } from 'sonner'

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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Skeleton } from '@/components/ui/skeleton'
import { useTenant } from '@/context/tenant-provider'
import { getErrorMessage } from '@/lib/api/error-handler'
import { usePermissions } from '@/lib/permissions'
import {
  useDataScopePolicy,
  useUpdateDataScopePolicy,
} from '@/features/organization/api/use-data-scope-policy'
import type { MembersWithoutGroupSee } from '@/features/organization/types/settings.types'

const OPTIONS: { value: MembersWithoutGroupSee; label: string; description: string }[] = [
  {
    value: 'everything',
    label: 'Everything',
    description: 'Every asset and finding in the organization.',
  },
  {
    value: 'nothing',
    label: 'Nothing',
    description: 'No assets or findings until they are added to a team.',
  },
]

/**
 * "Members who are in no team see: everything | nothing" — the organization's
 * data-scope policy (tenants.members_without_group_see). Owners and admins
 * only; hidden for everyone else, whom the API refuses. Owners and admins
 * themselves always see everything, and members in a team see that team's
 * assets whichever option is chosen.
 */
export function NoTeamAccessCard({ className }: { className?: string }) {
  const { currentTenant } = useTenant()
  const tenantId = currentTenant?.id
  const { isAdmin } = usePermissions()
  const { policy, isLoading, isError, mutate } = useDataScopePolicy(tenantId)
  const { updatePolicy, isUpdating } = useUpdateDataScopePolicy(tenantId)
  const [pending, setPending] = useState<MembersWithoutGroupSee | null>(null)

  if (!isAdmin()) return null

  const save = async (value: MembersWithoutGroupSee) => {
    try {
      const res = await updatePolicy(value)
      await mutate(res, { revalidate: false })
      toast.success(
        value === 'nothing'
          ? 'Members without a team now see nothing'
          : 'Members without a team now see everything'
      )
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to update data access'))
    } finally {
      setPending(null)
    }
  }

  const onChange = (value: string) => {
    const next = value as MembersWithoutGroupSee
    if (next === policy) return
    // Hiding data from people needs a confirmation; showing it does not.
    if (next === 'nothing') {
      setPending(next)
      return
    }
    void save(next)
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Members without a team</CardTitle>
        <CardDescription>
          What members who are in no team can see. Owners and admins always see everything, and
          members in a team see that team&apos;s assets.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-5 w-64" />
            <Skeleton className="h-5 w-72" />
          </div>
        ) : isError || !policy ? (
          <p className="text-sm text-muted-foreground">This setting could not be loaded.</p>
        ) : (
          <RadioGroup
            value={policy}
            onValueChange={onChange}
            disabled={isUpdating}
            aria-label="What members without a team see"
          >
            {OPTIONS.map((opt) => (
              <div key={opt.value} className="flex items-start gap-3">
                <RadioGroupItem
                  value={opt.value}
                  id={`no-team-${opt.value}`}
                  aria-describedby={`no-team-${opt.value}-desc`}
                  className="mt-0.5"
                />
                <div className="space-y-0.5">
                  <Label htmlFor={`no-team-${opt.value}`}>{opt.label}</Label>
                  <p className="text-sm text-muted-foreground" id={`no-team-${opt.value}-desc`}>
                    {opt.description}
                  </p>
                </div>
              </div>
            ))}
          </RadioGroup>
        )}
      </CardContent>

      <AlertDialog open={pending !== null} onOpenChange={(open) => !open && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hide data from members without a team?</AlertDialogTitle>
            <AlertDialogDescription>
              Members who are in no team will stop seeing every asset and finding right away, until
              you add them to a team. Owners, admins and members in a team are not affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUpdating}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isUpdating}
              onClick={(e) => {
                e.preventDefault()
                if (pending) void save(pending)
              }}
            >
              Hide data
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
