'use client'

import { useState, useEffect } from 'react'
import { Loader2, KeyRound, AlertTriangle, Check, FileCode } from 'lucide-react'
import { toast } from 'sonner'
import { getErrorMessage } from '@/lib/api/error-handler'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { OneTimeSecretField } from '@/features/shared'

import { useRegenerateSensorKey, invalidateSensorsCache } from '@/lib/api/sensor-hooks'
import { SensorConfigDialog } from './sensor-config-dialog'
import type { Sensor } from '@/lib/api/sensor-types'

interface RegenerateKeyDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sensor: Sensor
  onSuccess?: () => void
}

export function RegenerateKeyDialog({
  open,
  onOpenChange,
  sensor,
  onSuccess,
}: RegenerateKeyDialogProps) {
  const [apiKey, setApiKey] = useState<string | null>(null)
  const [configDialogOpen, setConfigDialogOpen] = useState(false)

  const { trigger: regenerateKey, isMutating } = useRegenerateSensorKey()

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setApiKey(null)
      setConfigDialogOpen(false)
    }
  }, [open])

  const handleRegenerate = async () => {
    try {
      const result = await regenerateKey(sensor.id)

      // Try to extract api_key from various possible structures
      let newApiKey: string | undefined

      if (typeof result === 'object' && result !== null) {
        // Direct access
        if ('api_key' in result && typeof result.api_key === 'string') {
          newApiKey = result.api_key
        }
        // Maybe wrapped in data
        else if ('data' in result && typeof result.data === 'object' && result.data !== null) {
          const data = result.data as Record<string, unknown>
          if ('api_key' in data && typeof data.api_key === 'string') {
            newApiKey = data.api_key
          }
        }
      }

      if (newApiKey) {
        // Set the key first - DO NOT invalidate cache here
        // Cache will be invalidated when dialog is closed
        setApiKey(newApiKey)
        toast.success('API key regenerated successfully')
      } else {
        toast.error('Failed to get new API key from response')
      }
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to regenerate API key'))
    }
  }

  const handleClose = async () => {
    const hadNewKey = !!apiKey
    setApiKey(null)
    onOpenChange(false)

    // Invalidate cache after dialog closes if we regenerated a key
    if (hadNewKey) {
      await invalidateSensorsCache()
      onSuccess?.()
    }
  }

  // Show the new API key after regeneration
  if (apiKey) {
    return (
      <>
        <Dialog open={open} onOpenChange={handleClose}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-green-600">
                <Check className="h-5 w-5" />
                API Key Regenerated
              </DialogTitle>
              <DialogDescription>
                Save this new API key now. You won&apos;t be able to see it again.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-4">
                <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400 mb-2">
                  Important: Save your new API key
                </p>
                <p className="text-xs text-muted-foreground">
                  The old API key has been invalidated. Any sensors using the old key will no longer
                  be able to authenticate.
                </p>
              </div>

              <OneTimeSecretField label="New API key" noun="API key" value={apiKey} />
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                onClick={() => setConfigDialogOpen(true)}
                className="w-full sm:w-auto"
              >
                <FileCode className="me-2 h-4 w-4" />
                View Config
              </Button>
              <Button onClick={handleClose} className="w-full sm:w-auto">
                Done
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Config dialog with actual API key */}
        <SensorConfigDialog
          open={configDialogOpen}
          onOpenChange={setConfigDialogOpen}
          sensor={sensor}
          apiKey={apiKey}
        />
      </>
    )
  }

  // Show warning dialog before regeneration
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            Regenerate API Key
          </DialogTitle>
          <DialogDescription>
            Generate a new API key for <strong>{sensor.name}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-4">
          <div className="flex gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 shrink-0" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400">
                Warning: This will invalidate the current API key
              </p>
              <p className="text-xs text-muted-foreground">
                Any sensors currently using this API key will no longer be able to authenticate.
                Make sure to update your sensor configuration with the new key.
              </p>
            </div>
          </div>
        </div>

        <div className="text-sm text-muted-foreground">
          <p>
            Current API key prefix:{' '}
            <code className="bg-muted px-1 rounded">{sensor.api_key_prefix}...</code>
          </p>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose} disabled={isMutating}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleRegenerate} disabled={isMutating}>
            {isMutating && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
            Regenerate Key
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
