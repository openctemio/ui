'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function GlobalError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log error to monitoring service (e.g., Sentry)
    console.error('Global error:', error)
  }, [error])

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
      <div className="text-center">
        <h2 className="text-2xl font-bold">Something went wrong</h2>
        <p className="text-muted-foreground mt-2">
          An unexpected error occurred. Please try again.
        </p>
        {error.digest && (
          <p className="text-muted-foreground mt-1 text-sm">
            Error ID: {error.digest}
          </p>
        )}
      </div>
      <div className="flex gap-2">
        <Button onClick={reset}>Try again</Button>
        <Button variant="outline" onClick={() => (window.location.href = '/')}>
          Go home
        </Button>
      </div>
    </div>
  )
}
