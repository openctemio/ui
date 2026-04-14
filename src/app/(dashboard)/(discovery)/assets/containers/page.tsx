'use client'

import { useSearchParams } from 'next/navigation'
import { AssetPage } from '@/features/assets/components/asset-page'
import { containersConfig } from './config'

export default function ContainersPage() {
  const searchParams = useSearchParams()
  const remountKey = `${searchParams.get('type') ?? ''}_${searchParams.get('sub_type') ?? ''}`
  return <AssetPage key={remountKey} config={containersConfig} />
}
