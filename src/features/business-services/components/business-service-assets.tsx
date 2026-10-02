'use client'

import { useMemo, useState } from 'react'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { LinkedAssetsPanel } from '@/features/assets/components/linked-assets-panel'
import { linkInBatches } from '@/features/assets/components/link-assets-dialog'
import { Permission, usePermissions } from '@/lib/permissions'
import {
  DEPENDENCY_TYPES,
  dependencyLabel,
  linkServiceAsset,
  unlinkServiceAsset,
  useBusinessServiceAssets,
  type DependencyType,
} from '../api/business-service-assets'

/**
 * The assets a business service runs on, with Link and Unlink. A cycle scoped
 * to this service snapshots exactly these assets on Activate, and the
 * service's criticality lifts theirs.
 */
export function BusinessServiceAssets({
  service,
  onChanged,
}: {
  service: { id: string; name: string }
  onChanged?: () => void
}) {
  const { can } = usePermissions()
  const { data, isLoading, error, mutate } = useBusinessServiceAssets(service.id)
  const [dependency, setDependency] = useState<DependencyType>('runs_on')
  const items = useMemo(
    () =>
      (data ?? []).map((l) => ({
        id: l.asset_id,
        name: l.asset_name,
        type: l.asset_type,
        meta: dependencyLabel(l.dependency_type).toLowerCase(),
      })),
    [data]
  )

  const refresh = async () => {
    await mutate()
    onChanged?.()
  }

  return (
    <LinkedAssetsPanel
      targetName={service.name}
      items={data ? items : undefined}
      isLoading={isLoading}
      error={error}
      onRetry={() => mutate()}
      canEdit={can(Permission.BusinessServicesWrite)}
      linkDescription={
        <>
          A cycle scoped to {service.name} covers these assets, and they take on its criticality
          when that is higher than their own.
        </>
      }
      linkFields={
        <div className="space-y-2">
          <Label htmlFor="dependency-type">How the service uses them</Label>
          <Select value={dependency} onValueChange={(v) => setDependency(v as DependencyType)}>
            <SelectTrigger id="dependency-type" className="w-full">
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
      }
      emptyDescription="Link the assets this service runs on so a cycle scoped to it has something to cover."
      onLink={async (ids) => {
        const failed = await linkInBatches(ids, (id) =>
          linkServiceAsset(service.id, id, dependency)
        )
        await refresh()
        return failed
      }}
      onUnlink={async (id) => {
        await unlinkServiceAsset(service.id, id)
        await refresh()
      }}
    />
  )
}
