'use client'

import { AssetPage } from '@/features/assets/components/asset-page'
import { serverlessConfig } from './config'

export default function ServerlessPage() {
  return <AssetPage config={serverlessConfig} />
}
