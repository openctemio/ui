'use client'

import { AssetPage } from '@/features/assets/components/asset-page'
import { computeConfig } from './config'

export default function ComputePage() {
  return <AssetPage config={computeConfig} />
}
