'use client'

import { AssetPage } from '@/features/assets/components/asset-page'
import { hostsConfig } from './config'

export default function HostsPage() {
  return <AssetPage config={hostsConfig} />
}
