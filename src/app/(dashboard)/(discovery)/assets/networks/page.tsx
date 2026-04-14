'use client'

import { useSearchParams } from 'next/navigation'
import { AssetPage } from '@/features/assets/components/asset-page'
import { networksConfig } from './config'

export default function NetworksPage() {
  // Key on searchParams to force remount when query params change
  // (e.g., navigating from ?sub_type=firewall to ?sub_type=load_balancer)
  const searchParams = useSearchParams()
  return <AssetPage key={searchParams.toString()} config={networksConfig} />
}
