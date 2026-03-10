'use client'

import { AssetPage } from '@/features/assets/components/asset-page'
import { mobileConfig } from './config'

export default function MobilePage() {
  return <AssetPage config={mobileConfig} />
}
