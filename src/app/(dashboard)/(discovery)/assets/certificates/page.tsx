'use client'

import { AssetPage } from '@/features/assets/components/asset-page'
import { certificatesConfig } from './config'

export default function CertificatesPage() {
  return <AssetPage config={certificatesConfig} />
}
