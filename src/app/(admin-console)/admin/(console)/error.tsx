'use client'

import { ErrorState } from '@/features/shared'
import { Main } from '@/components/layout'

export default function AdminConsoleError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <Main>
      <ErrorState title="this page" error={error} onRetry={reset} />
    </Main>
  )
}
