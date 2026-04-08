'use client'

import { AssetPage } from '@/features/assets/components/asset-page'
import { containersConfig } from './config'

export default function KubernetesPage() {
  return <AssetPage config={containersConfig} />
}
