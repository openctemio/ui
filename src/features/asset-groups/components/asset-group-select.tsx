/**
 * Asset Group Select Component
 *
 * A reusable dropdown select for choosing an asset group.
 * Fetches asset groups from API and handles loading states.
 */

'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useAssetGroups } from '../hooks/use-asset-groups'

interface AssetGroupSelectProps {
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  required?: boolean
}

export function AssetGroupSelect({
  value,
  onValueChange,
  placeholder = 'Select group',
  disabled = false,
  required = false,
}: AssetGroupSelectProps) {
  const { data: assetGroups, isLoading } = useAssetGroups()

  if (isLoading) {
    return <Skeleton className="h-10 w-full" />
  }

  const groups = assetGroups ?? []

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled} required={required}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {groups.length === 0 ? (
          <div className="py-2 px-3 text-sm text-muted-foreground">No asset groups found</div>
        ) : (
          groups.map((group) => (
            <SelectItem key={group.id} value={group.id}>
              {group.name}
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  )
}
