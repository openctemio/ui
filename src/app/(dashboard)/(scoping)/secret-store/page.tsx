'use client'

import { Main } from '@/components/layout'
import { SecretStoreSection } from '@/features/secret-store'

export default function SecretStorePage() {
  return (
    <>
      <Main>
        <SecretStoreSection />
      </Main>
    </>
  )
}
