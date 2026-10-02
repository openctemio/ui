'use client'

import { useMemo } from 'react'
import { useAssets } from '@/features/assets/hooks/use-assets'
import { LinkedAssetsPanel } from '@/features/assets/components/linked-assets-panel'
import { linkInBatches } from '@/features/assets/components/link-assets-dialog'
import { Permission, usePermissions } from '@/lib/permissions'
import { addAssetToBusinessUnit, removeAssetFromBusinessUnit } from '../api/use-business-units'

const PAGE = 100

/**
 * The assets of one business unit, with Link and Unlink. Members are read
 * through the inventory's own filter (`business_unit_ids`), so this list and
 * "View all in the inventory" always agree. The unit's criticality lifts the
 * effective criticality (and so the priority) of every asset linked here.
 */
export function BusinessUnitAssets({
  unit,
  onChanged,
}: {
  unit: { id: string; name: string }
  /** Called after a link or unlink, so the caller can refresh unit counts. */
  onChanged?: () => void
}) {
  const { can } = usePermissions()
  const { assets, total, isLoading, error, mutate } = useAssets({
    businessUnitIds: [unit.id],
    pageSize: PAGE,
  })
  const items = useMemo(
    () => assets.map((a) => ({ id: a.id, name: a.name, type: a.type, meta: a.criticality })),
    [assets]
  )

  const refresh = async () => {
    await mutate()
    onChanged?.()
  }

  return (
    <LinkedAssetsPanel
      targetName={unit.name}
      items={isLoading ? undefined : items}
      isLoading={isLoading}
      error={error}
      onRetry={() => mutate()}
      total={total}
      viewAllHref={`/assets?business_unit_ids=${unit.id}`}
      canEdit={can(Permission.AssetsWrite)}
      linkDescription={
        <>
          Assets of {unit.name} take on its criticality when that is higher than their own, which
          raises the priority of their findings.
        </>
      }
      emptyDescription="Link the assets this unit owns so its criticality counts in prioritization."
      onLink={async (ids) => {
        const failed = await linkInBatches(ids, (id) => addAssetToBusinessUnit(unit.id, id))
        await refresh()
        return failed
      }}
      onUnlink={async (id) => {
        await removeAssetFromBusinessUnit(unit.id, id)
        await refresh()
      }}
    />
  )
}
