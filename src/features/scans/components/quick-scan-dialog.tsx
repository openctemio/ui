/**
 * Quick Scan Dialog
 *
 * Simple single-page dialog for triggering a quick scan.
 * Targets are entered as text, with optional scanner/workflow selection.
 */

'use client'

import { useState, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { Loader2, Zap } from 'lucide-react'
import { getErrorMessage } from '@/lib/api/error-handler'
import { useQuickScan } from '@/lib/api/pipeline-hooks'
import { invalidateScanSessionsCache } from '@/lib/api/scan-hooks'

interface QuickScanDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

/** Parse targets from text, supporting newline, comma, and semicolon separators. */
function parseTargets(text: string): string[] {
  return text
    .split(/[\n,;]+/)
    .map((t) => t.trim())
    .filter(Boolean)
}

export function QuickScanDialog({ open, onOpenChange, onSuccess }: QuickScanDialogProps) {
  const [targets, setTargets] = useState('')
  const [scannerName, setScannerName] = useState('nuclei')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { trigger: quickScan } = useQuickScan()

  const targetList = useMemo(() => parseTargets(targets), [targets])

  const handleSubmit = async () => {
    if (targetList.length === 0) {
      toast.error('Please enter at least one target')
      return
    }

    setIsSubmitting(true)
    try {
      await quickScan({
        targets: targetList,
        scanner_name: scannerName || undefined,
      })

      toast.success(`Quick scan triggered for ${targetList.length} target(s)`)
      await invalidateScanSessionsCache()
      onSuccess?.()
      handleClose()
    } catch (error) {
      console.error('Failed to trigger quick scan:', error)
      toast.error(getErrorMessage(error, 'Failed to trigger quick scan'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setTargets('')
    setScannerName('nuclei')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Quick Scan</DialogTitle>
          <DialogDescription>Run an immediate scan against one or more targets.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Targets */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="quick-targets">Targets</Label>
              {targetList.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  {targetList.length} target{targetList.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            <Textarea
              id="quick-targets"
              placeholder={'example.com\n192.168.1.1\nhttps://api.example.com'}
              value={targets}
              onChange={(e) => setTargets(e.target.value)}
              rows={5}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Enter targets separated by newlines, commas, or semicolons.
            </p>
          </div>

          {/* Scanner */}
          <div className="space-y-2">
            <Label htmlFor="quick-scanner">Scanner</Label>
            <Select value={scannerName} onValueChange={setScannerName}>
              <SelectTrigger id="quick-scanner">
                <SelectValue placeholder="Select scanner" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nuclei">Nuclei</SelectItem>
                <SelectItem value="nmap">Nmap</SelectItem>
                <SelectItem value="subfinder">Subfinder</SelectItem>
                <SelectItem value="httpx">HTTPx</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || targetList.length === 0}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Starting...
              </>
            ) : (
              <>
                <Zap className="mr-2 h-4 w-4" />
                Start Scan
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
