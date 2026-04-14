'use client'

import { useSearchParams } from 'next/navigation'
import { AssetPage } from '@/features/assets/components/asset-page'
import { hostsConfig } from './config'

export default function HostsPage() {
  const searchParams = useSearchParams()
  // Only remount when type/sub_type changes (overview click-through), NOT on page/q/sort changes
  const remountKey = `${searchParams.get('type') ?? ''}_${searchParams.get('sub_type') ?? ''}`
  return <AssetPage key={remountKey} config={hostsConfig} />
}
