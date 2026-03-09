'use client'

import { AssetPage } from '@/features/assets/components/asset-page'
import { databasesConfig } from './config'

export default function DatabasesPage() {
  return <AssetPage config={databasesConfig} />
}
