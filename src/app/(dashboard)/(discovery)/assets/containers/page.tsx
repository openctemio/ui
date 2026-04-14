'use client'

import { useSearchParams } from 'next/navigation'
import { AssetPage } from '@/features/assets/components/asset-page'
import { containersConfig } from './config'

export default function ContainersPage() {
  const searchParams = useSearchParams()
  return <AssetPage key={searchParams.toString()} config={containersConfig} />
}
