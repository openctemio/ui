'use client'

import { AssetPage } from '@/features/assets/components/asset-page'
import { cloudAccountsConfig } from './config'

export default function CloudAccountsPage() {
  return <AssetPage config={cloudAccountsConfig} />
}
