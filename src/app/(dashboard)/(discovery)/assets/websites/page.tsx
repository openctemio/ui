'use client'

import { useSearchParams } from 'next/navigation'
import { AssetPage } from '@/features/assets/components/asset-page'
import { websitesConfig } from './config'

export default function WebsitesPage() {
  const searchParams = useSearchParams()
  return <AssetPage key={searchParams.toString()} config={websitesConfig} />
}
