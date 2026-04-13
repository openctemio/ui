'use client'

import { useSearchParams } from 'next/navigation'
import { AssetPage } from '@/features/assets/components/asset-page'
import { identityConfig } from './config'

export default function IdentityPage() {
  const searchParams = useSearchParams()
  return <AssetPage key={searchParams.toString()} config={identityConfig} />
}
