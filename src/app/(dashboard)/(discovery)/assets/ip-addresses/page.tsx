'use client'

import { AssetPage } from '@/features/assets/components/asset-page'
import { ipAddressesConfig } from './config'

export default function IpAddressesPage() {
  return <AssetPage config={ipAddressesConfig} />
}
