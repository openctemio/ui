'use client'

import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { DangerZone, DangerZoneItem } from '@/features/shared'
import { useTenant } from '@/context/tenant-provider'
import { usePermissions } from '@/lib/permissions'
import { del } from '@/lib/api/client'
import { getErrorMessage } from '@/lib/api/error-handler'
import { removeCookie } from '@/lib/cookies'
import { env } from '@/lib/env'

/**
 * Organization › General › Danger zone: delete the organization.
 *
 * Owner only, like the API (DELETE /api/v1/tenants/{tenant} behind
 * RequireTeamOwner). The delete cascades every row of the organization
 * (assets, findings, scans, members, roles, settings and its audit log);
 * user accounts survive and keep their other organizations. Confirmation is
 * by typing the organization's name.
 *
 * Afterwards the session moves to another organization the user belongs to,
 * or to onboarding when there is none.
 */
export function DeleteOrganization() {
  const { currentTenant, tenants, switchTeam, loadTenants } = useTenant()
  const { isOwner } = usePermissions()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  if (!currentTenant || !isOwner()) return null
  const name = currentTenant.name

  const handleDelete = async () => {
    setBusy(true)
    try {
      await del(`/api/v1/tenants/${currentTenant.slug}`)
      toast.success(`Organization "${name}" deleted`)
      // A full reload (not router.push) so no cached data of the deleted
      // organization survives; replace() so Back does not return here.
      const next = tenants.find((t) => t.id !== currentTenant.id)
      let target = '/'
      if (next) {
        await switchTeam(next.id)
      } else {
        removeCookie(env.cookies.tenant)
        target = '/onboarding/create-team'
      }
      window.location.replace(target)
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to delete the organization'))
      setBusy(false)
    }
  }

  return (
    <>
      <DangerZone>
        <DangerZoneItem
          title="Delete this organization"
          description="Permanently deletes the organization and everything in it: assets, findings, scans, members, roles, settings and its audit log. Member accounts are kept. This cannot be undone."
          action={
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                loadTenants()
                setOpen(true)
              }}
            >
              <Trash2 className="h-4 w-4" />
              Delete organization
            </Button>
          }
        />
      </DangerZone>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        destructive
        title={`Delete ${name}?`}
        desc="This deletes the organization and all of its data for every member. It cannot be undone."
        typeToConfirm={name}
        confirmText={busy ? 'Deleting…' : 'Delete organization'}
        isLoading={busy}
        handleConfirm={handleDelete}
      />
    </>
  )
}
