'use client'

import { AssetPage } from '@/features/assets/components/asset-page'
import { iamUserConfig } from '@/features/assets/lib/category-templates'

export default function Page() {
  return <AssetPage config={iamUserConfig} />
}
