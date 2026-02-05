'use client'

import * as React from 'react'
import { useState, useEffect } from 'react'
import { Loader2, Copy, Calendar, Target, Settings } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

import { useCloneScanConfig, invalidateScanConfigsCache } from '@/lib/api/scan-hooks'
import { getErrorMessage } from '@/lib/api/error-handler'
import type { ScanConfig } from '@/lib/api/scan-types'
import {
  SCAN_TYPE_LABELS,
  SCHEDULE_TYPE_LABELS,
  SCAN_CONFIG_STATUS_LABELS,
} from '@/lib/api/scan-types'

interface CloneScanDialogProps {
  scan: ScanConfig | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: (newScan: ScanConfig) => void
}

export function CloneScanDialog({ scan, open, onOpenChange, onSuccess }: CloneScanDialogProps) {
  const [newName, setNewName] = useState('')
  const { trigger: cloneScan, isMutating } = useCloneScanConfig(scan?.id ?? '')

  // Reset name when dialog opens with a new scan
  useEffect(() => {
    if (open && scan) {
      setNewName(`${scan.name} (Copy)`)
    }
  }, [open, scan])

  const handleClone = async () => {
    if (!scan || !newName.trim()) return

    try {
      const result = await cloneScan({ name: newName.trim() })
      toast.success(`Scan "${newName}" created successfully`)
      await invalidateScanConfigsCache()
      onOpenChange(false)
      if (onSuccess && result) {
        onSuccess(result)
      }
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to clone scan configuration'))
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setNewName('')
    }
    onOpenChange(newOpen)
  }

  if (!scan) return null

  const assetGroupCount = scan.asset_group_ids?.length || (scan.asset_group_id ? 1 : 0)
  const targetCount = scan.targets?.length || 0

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="h-5 w-5" />
            Clone Scan Configuration
          </DialogTitle>
          <DialogDescription>
            Create a copy of &ldquo;{scan.name}&rdquo; with a new name. All settings will be
            duplicated.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* New name input */}
          <div className="space-y-2">
            <Label htmlFor="clone-name">New Scan Name</Label>
            <Input
              id="clone-name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Enter a unique name"
              autoFocus
            />
          </div>

          {/* What will be cloned summary */}
          <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
            <p className="text-sm font-medium">Configuration to clone:</p>

            <div className="grid gap-2 text-sm">
              {/* Scan Type */}
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Type:</span>
                <Badge variant="outline">{SCAN_TYPE_LABELS[scan.scan_type]}</Badge>
              </div>

              {/* Schedule */}
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Schedule:</span>
                <Badge variant="secondary">{SCHEDULE_TYPE_LABELS[scan.schedule_type]}</Badge>
              </div>

              {/* Targets */}
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Targets:</span>
                <span>
                  {assetGroupCount > 0 && (
                    <Badge variant="secondary" className="mr-1">
                      {assetGroupCount} asset group{assetGroupCount > 1 ? 's' : ''}
                    </Badge>
                  )}
                  {targetCount > 0 && (
                    <Badge variant="secondary">
                      {targetCount} direct target{targetCount > 1 ? 's' : ''}
                    </Badge>
                  )}
                  {assetGroupCount === 0 && targetCount === 0 && (
                    <span className="text-muted-foreground">None configured</span>
                  )}
                </span>
              </div>

              {/* Status */}
              <div className="flex items-center gap-2">
                <div
                  className={`h-2 w-2 rounded-full ${
                    scan.status === 'active'
                      ? 'bg-green-500'
                      : scan.status === 'paused'
                        ? 'bg-yellow-500'
                        : 'bg-gray-500'
                  }`}
                />
                <span className="text-muted-foreground">Status:</span>
                <span>{SCAN_CONFIG_STATUS_LABELS[scan.status]}</span>
                <span className="text-xs text-muted-foreground">(will be cloned as paused)</span>
              </div>
            </div>

            {/* Tags */}
            {scan.tags && scan.tags.length > 0 && (
              <div className="pt-2 border-t">
                <span className="text-xs text-muted-foreground">Tags: </span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {scan.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Note */}
          <p className="text-xs text-muted-foreground">
            The cloned scan will start in &ldquo;paused&rdquo; status. You can activate it after
            reviewing the configuration.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isMutating}>
            Cancel
          </Button>
          <Button onClick={handleClone} disabled={!newName.trim() || isMutating}>
            {isMutating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Cloning...
              </>
            ) : (
              <>
                <Copy className="mr-2 h-4 w-4" />
                Clone Scan
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
