'use client'

import { AssetPage } from '@/features/assets/components/asset-page'
import { networksConfig } from './config'

export default function NetworksPage() {
  return <AssetPage config={networksConfig} />
}
