'use client'

import { AssetPage } from '@/features/assets/components/asset-page'
import { storageConfig } from './config'

export default function StoragePage() {
  return <AssetPage config={storageConfig} />
}
