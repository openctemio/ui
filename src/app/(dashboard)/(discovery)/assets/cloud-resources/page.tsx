'use client'

import { AssetPage } from '@/features/assets/components/asset-page'
import { cloudConfig } from './config'

export default function CloudPage() {
  return <AssetPage config={cloudConfig} />
}
