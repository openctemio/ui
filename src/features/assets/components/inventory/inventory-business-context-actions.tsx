'use client'

/**
 * Bulk "Add to business unit" and "Add to business service" for the inventory
 * selection bar, so business context can be filled in where the assets are.
 * Each action shows only when its module is on and the user holds the write
 * permission the API enforces (assets:write for units, business services
 * write for services). Links are additive: an asset can be in several units
 * and serve several services.
 */

import { useState } from 'react'
import { toast } from 'sonner'
import { Building, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
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
import { Permission, useNavItemAccess } from '@/lib/permissions'
import {
  useBusinessUnits,
  addAssetToBusinessUnit,
} from '@/features/business-units/api/use-business-units'
import {
  DEPENDENCY_TYPES,
  linkServiceAsset,
  useBusinessServiceOptions,
  type DependencyType,
} from '@/features/business-services/api/business-service-assets'
import { linkInBatches } from '../link-assets-dialog'
import type { Asset } from '../../types/asset.types'

type Target = 'unit' | 'service'

export function InventoryBusinessContextActions({
  selected,
  onDone,
}: {
  selected: Asset[]
  onDone: () => void
}) {
  const allowed = useNavItemAccess()
  const canUnit = allowed({ module: 'business_units', permission: Permission.AssetsWrite })
  const canService = allowed({
    module: 'business_services',
    permission: Permission.BusinessServicesWrite,
  })
  const [dialog, setDialog] = useState<Target | null>(null)
  const [targetId, setTargetId] = useState('')
  const [dependency, setDependency] = useState<DependencyType>('runs_on')
  const [submitting, setSubmitting] = useState(false)

  const { data: units } = useBusinessUnits(undefined, dialog === 'unit')
  const { data: services } = useBusinessServiceOptions(dialog === 'service')
  const options =
    dialog === 'unit'
      ? (units?.data ?? []).map((u) => ({ id: u.id, name: u.name }))
      : (services?.data ?? []).map((s) => ({ id: s.id, name: s.name }))

  if (!canUnit && !canService) return null

  const count = selected.length
  const close = () => {
    setDialog(null)
    setTargetId('')
    setDependency('runs_on')
  }

  const apply = async () => {
    const target = options.find((o) => o.id === targetId)
    if (!dialog || !target) return
    setSubmitting(true)
    try {
      const failed = await linkInBatches(selected, (a) =>
        dialog === 'unit'
          ? addAssetToBusinessUnit(target.id, a.id)
          : linkServiceAsset(target.id, a.id, dependency)
      )
      const n = (k: number) => `${k} asset${k === 1 ? '' : 's'}`
      if (failed === 0) toast.success(`Added ${n(count)} to ${target.name}`)
      else if (failed < count)
        toast.warning(`Added ${n(count - failed)} to ${target.name}; ${failed} failed`)
      else {
        toast.error(`Could not add ${n(count)} to ${target.name}`)
        return
      }
      close()
      onDone()
    } finally {
      setSubmitting(false)
    }
  }

  const noun = dialog === 'unit' ? 'business unit' : 'business service'

  return (
    <>
      {canUnit && (
        <Button variant="ghost" size="sm" onClick={() => setDialog('unit')}>
          <Building2 className="me-2 h-4 w-4" />
          Add to unit
        </Button>
      )}
      {canService && (
        <Button variant="ghost" size="sm" onClick={() => setDialog('service')}>
          <Building className="me-2 h-4 w-4" />
          Add to service
        </Button>
      )}

      <Dialog open={dialog !== null} onOpenChange={(o) => !o && close()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add to {noun}</DialogTitle>
            <DialogDescription>
              {dialog === 'unit'
                ? `Add ${count} selected asset${count === 1 ? '' : 's'} to a business unit. They take on its criticality when that is higher than their own.`
                : `Link ${count} selected asset${count === 1 ? '' : 's'} to a business service. A cycle scoped to the service covers them.`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bulk-context-target">
                {dialog === 'unit' ? 'Business unit' : 'Business service'}
              </Label>
              <Select value={targetId} onValueChange={setTargetId}>
                <SelectTrigger id="bulk-context-target" className="w-full">
                  <SelectValue placeholder={`Choose a ${noun}`} />
                </SelectTrigger>
                <SelectContent>
                  {options.length === 0 ? (
                    <div className="px-2 py-3 text-sm text-muted-foreground">
                      No {noun}s yet. Create one under Scoping › Business context.
                    </div>
                  ) : (
                    options.map((o) => (
                      <SelectItem key={o.id} value={o.id}>
                        {o.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            {dialog === 'service' && (
              <div className="space-y-2">
                <Label htmlFor="bulk-context-dependency">How the service uses them</Label>
                <Select
                  value={dependency}
                  onValueChange={(v) => setDependency(v as DependencyType)}
                >
                  <SelectTrigger id="bulk-context-dependency" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DEPENDENCY_TYPES.map((d) => (
                      <SelectItem key={d.value} value={d.value}>
                        {d.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={close}>
              Cancel
            </Button>
            <Button onClick={apply} disabled={submitting || !targetId}>
              {submitting ? 'Adding…' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
