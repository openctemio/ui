'use client'

import { useSearchParams } from 'next/navigation'
import { AssetPage } from '@/features/assets/components/asset-page'
import { networksConfig } from './config'

export default function NetworksPage() {
  // Only remount when type/sub_type changes (overview click-through), NOT on page/q/sort changes
  const searchParams = useSearchParams()
  const remountKey = `${searchParams.get('type') ?? ''}_${searchParams.get('sub_type') ?? ''}`
  return <AssetPage key={remountKey} config={networksConfig} />
}
