/**
 * Scan Assets Dialog
 *
 * Confirmation dialog for the attack-surface "scan these assets now" flow.
 * Given a set of assets (already resolved to scan targets by the caller),
 * it shows the resolved target count, warns about skipped / large / capped
 * sets, offers a scanner picker, and triggers POST /api/v1/scans/quick.
 *
 * Distinct from {@link ./quick-scan-dialog QuickScanDialog}, which takes
 * free-text targets. This one is driven by a list of assets.
 */

'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { AlertTriangle, Loader2, Wifi } from 'lucide-react'
import { ApiClientError, getErrorMessage } from '@/lib/api/error-handler'
import { useQuickScan } from '@/lib/api/pipeline-hooks'
import { invalidateScanSessionsCache } from '@/lib/api/scan-hooks'

/** Backend hard cap on targets per quick scan (see POST /scans/quick, 1..1000). */
const MAX_TARGETS = 1000
/** Above this many targets we treat the run as "large" and warn explicitly. */
const LARGE_SET_THRESHOLD = 100
/** How many targets to preview in the dialog before truncating. */
const PREVIEW_LIMIT = 8

/**
 * An asset the caller wants to scan. `target` is the address the scanner
 * will hit (IP / hostname / domain / URL); empty string means the asset
 * has no usable target and will be skipped.
 */
export interface ScanCandidate {
  id: string
  label: string
  target: string
}

interface ScanAssetsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The candidate assets to scan (may include unresolvable ones). */
  candidates: ScanCandidate[]
  /** Optional custom heading, e.g. "Scan Network". */
  title?: string
  /** Called after a scan is successfully triggered. */
  onSuccess?: () => void
}

export function ScanAssetsDialog({
  open,
  onOpenChange,
  candidates,
  title = 'Scan assets',
  onSuccess,
}: ScanAssetsDialogProps) {
  const router = useRouter()
  const [scannerName, setScannerName] = useState('nuclei')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { trigger: quickScan } = useQuickScan()

  // Resolve + de-duplicate targets; track how many were unusable.
  const { targets, skippedCount } = useMemo(() => {
    const seen = new Set<string>()
    const resolved: string[] = []
    let skipped = 0
    for (const c of candidates) {
      const t = c.target?.trim()
      if (!t) {
        skipped += 1
        continue
      }
      if (seen.has(t)) continue
      seen.add(t)
      resolved.push(t)
    }
    return { targets: resolved, skippedCount: skipped }
  }, [candidates])

  const isOverCap = targets.length > MAX_TARGETS
  const cappedTargets = useMemo(() => targets.slice(0, MAX_TARGETS), [targets])
  const isLargeSet = cappedTargets.length > LARGE_SET_THRESHOLD
  const canSubmit = cappedTargets.length > 0 && !isSubmitting

  const handleSubmit = async () => {
    if (cappedTargets.length === 0) {
      toast.error('No scannable targets in the selected assets')
      return
    }

    setIsSubmitting(true)
    try {
      await quickScan({
        targets: cappedTargets,
        scanner_name: scannerName || undefined,
      })

      await invalidateScanSessionsCache()
      toast.success(
        `Scan started for ${cappedTargets.length} target${cappedTargets.length !== 1 ? 's' : ''}`,
        {
          action: {
            label: 'View run',
            onClick: () => router.push('/scans?tab=runs'),
          },
        }
      )
      onSuccess?.()
      onOpenChange(false)
    } catch (error) {
      if (error instanceof ApiClientError && error.statusCode === 429) {
        toast.error('Rate limit reached — please wait a moment before starting another scan.')
      } else if (error instanceof ApiClientError && error.statusCode === 400) {
        toast.error(getErrorMessage(error, 'Some targets were rejected by the scanner.'))
      } else {
        toast.error(getErrorMessage(error, 'Failed to start scan'))
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !isSubmitting && onOpenChange(o)}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {cappedTargets.length > 0
              ? `Run an immediate scan against ${cappedTargets.length} target${
                  cappedTargets.length !== 1 ? 's' : ''
                }.`
              : 'None of the selected assets have a scannable address.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Target preview */}
          {cappedTargets.length > 0 && (
            <div className="space-y-2">
              <Label>Targets</Label>
              <div className="flex flex-wrap gap-2 rounded-md border p-3 max-h-40 overflow-y-auto">
                {cappedTargets.slice(0, PREVIEW_LIMIT).map((t) => (
                  <Badge key={t} variant="secondary" className="font-mono text-xs">
                    {t}
                  </Badge>
                ))}
                {cappedTargets.length > PREVIEW_LIMIT && (
                  <Badge variant="outline" className="text-xs">
                    +{cappedTargets.length - PREVIEW_LIMIT} more
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Guards / warnings */}
          {skippedCount > 0 && (
            <p className="text-xs text-muted-foreground">
              {skippedCount} asset{skippedCount !== 1 ? 's' : ''} skipped (no scannable address).
            </p>
          )}
          {isOverCap && (
            <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-400">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                {targets.length} targets exceed the limit — only the first {MAX_TARGETS} will be
                scanned.
              </span>
            </div>
          )}
          {isLargeSet && (
            <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-400">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                This will scan {cappedTargets.length} targets at once. Confirm you want to proceed.
              </span>
            </div>
          )}

          {/* Scanner picker */}
          <div className="space-y-2">
            <Label htmlFor="scan-assets-scanner">Scanner</Label>
            <Select value={scannerName} onValueChange={setScannerName}>
              <SelectTrigger id="scan-assets-scanner">
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
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {isSubmitting ? (
              <>
                <Loader2 className="me-2 h-4 w-4 animate-spin" />
                Starting...
              </>
            ) : (
              <>
                <Wifi className="me-2 h-4 w-4" />
                Start Scan
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
