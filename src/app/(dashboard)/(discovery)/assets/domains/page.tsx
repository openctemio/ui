'use client'

import { AssetPage } from '@/features/assets/components/asset-page'
import { domainsConfig } from './config'

export default function DomainsPage() {
  return <AssetPage config={domainsConfig} />
}
