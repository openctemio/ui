'use client'

import { useSearchParams } from 'next/navigation'
import { AssetPage } from '@/features/assets/components/asset-page'
import { hostsConfig } from './config'

export default function HostsPage() {
  const searchParams = useSearchParams()
  return <AssetPage key={searchParams.toString()} config={hostsConfig} />
}
