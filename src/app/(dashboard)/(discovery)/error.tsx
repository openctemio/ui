'use client'

import { useEffect } from 'react'
import { AlertCircle, Search } from 'lucide-react'
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

export default function DiscoveryError({ error, reset }: ErrorProps) {
  useEffect(() => {
    reportRouteError(error, '/discovery', { section: 'discovery' })
  }, [error])

  return (
    <div className="flex min-h-[50vh] items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertCircle className="h-6 w-6 text-destructive" />
          </div>
          <CardTitle className="flex items-center justify-center gap-2">
            <Search className="h-5 w-5" />
            Discovery Error
          </CardTitle>
          <CardDescription>
            Failed to load discovery data. This could be due to a network issue or service unavailability.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          {error.digest && (
            <p className="text-muted-foreground text-sm">
              Error ID: {error.digest}
            </p>
          )}
        </CardContent>
        <CardFooter className="flex justify-center gap-2">
          <Button onClick={reset}>Retry Discovery</Button>
          <Button variant="outline" onClick={() => window.history.back()}>
            Go back
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
