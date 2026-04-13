'use client'

import { useSearchParams } from 'next/navigation'
import { AssetPage } from '@/features/assets/components/asset-page'
import { servicesConfig } from './config'

export default function ServicesPage() {
  const searchParams = useSearchParams()
  return <AssetPage key={searchParams.toString()} config={servicesConfig} />
}
