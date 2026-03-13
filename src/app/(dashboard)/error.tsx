'use client'

import { useEffect, useState } from 'react'
import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { reportRouteError } from '@/lib/error-reporting'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

/**
 * Check if error is a transient/stream error that should auto-retry.
 * These errors typically occur during page transitions when the backend
 * connection is briefly interrupted (e.g. after tenant selection).
 */
function isTransientError(error: Error): boolean {
  const message = error.message?.toLowerCase() || ''
  return (
    message.includes('input stream') ||
    message.includes('stream error') ||
    message.includes('fetch failed') ||
    message.includes('network error') ||
    message.includes('failed to fetch') ||
    message.includes('proxy_error') ||
    message.includes('stream_error')
  )
}

const MAX_AUTO_RETRIES = 2

export default function DashboardError({ error, reset }: ErrorProps) {
  const [retryCount, setRetryCount] = useState(0)
  const [autoRetrying, setAutoRetrying] = useState(false)

  useEffect(() => {
    reportRouteError(error, '/dashboard', { section: 'dashboard' })

    // Auto-retry for transient errors (stream errors during page transition)
    if (isTransientError(error) && retryCount < MAX_AUTO_RETRIES) {
      setAutoRetrying(true)
      console.log(
        `[DashboardError] Transient error detected, auto-retrying (${retryCount + 1}/${MAX_AUTO_RETRIES})...`
      )
      const timer = setTimeout(() => {
        setRetryCount((c) => c + 1)
        reset()
      }, 500)
      return () => clearTimeout(timer)
    }

    setAutoRetrying(false)
  }, [error, reset, retryCount])

  // Don't render error UI while auto-retrying transient errors
  if (autoRetrying) {
    return null
  }

  return (
    <div className="flex min-h-[50vh] items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertCircle className="h-6 w-6 text-destructive" />
          </div>
          <CardTitle>Something went wrong</CardTitle>
          <CardDescription>An error occurred while loading this page.</CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          {error.digest && (
            <p className="text-muted-foreground text-sm">Error ID: {error.digest}</p>
          )}
        </CardContent>
        <CardFooter className="flex justify-center gap-2">
          <Button onClick={reset}>Try again</Button>
          <Button variant="outline" onClick={() => window.history.back()}>
            Go back
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
