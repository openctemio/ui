'use client'

import { useSearchParams } from 'next/navigation'
import { AssetPage } from '@/features/assets/components/asset-page'
import { identityConfig } from './config'

export default function IdentityPage() {
  const searchParams = useSearchParams()
  const remountKey = `${searchParams.get('type') ?? ''}_${searchParams.get('sub_type') ?? ''}`
  return <AssetPage key={remountKey} config={identityConfig} />
}
