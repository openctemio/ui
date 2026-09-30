/**
 * Filtering Result Banner Component
 *
 * Displays the result of smart filtering after a scan is triggered
 * Shows how many assets were scanned vs skipped
 */

import { CheckCircle, Filter, Info, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Button } from '@/components/ui/button'
import { ChevronDown } from 'lucide-react'
import { useState } from 'react'
import type { FilteringResult } from '../types/scan.types'
import { getCompatibilityStatus } from '../types/scan.types'
import { ASSET_TYPE_LABELS } from '@/features/assets/types/asset.types'

interface FilteringResultBannerProps {
  result: FilteringResult
  className?: string
  /** Whether the banner can be dismissed */
  dismissible?: boolean
  onDismiss?: () => void
}

export function FilteringResultBanner({
  result,
  className,
  dismissible = false,
  onDismiss,
}: FilteringResultBannerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)

  // Don't render if filtering wasn't applied or already dismissed
  if (!result.wasFiltered || isDismissed) {
    return null
  }

  const status = getCompatibilityStatus(result.compatibilityPercent)
  const handleDismiss = () => {
    setIsDismissed(true)
    onDismiss?.()
  }

  // Fully compatible - show success
  if (status === 'full') {
    return (
      <Alert className={cn('border-success/30 bg-success/5', className)}>
        <Filter className="h-4 w-4 text-success" />
        <AlertTitle className="flex items-center gap-2 text-success">
          <span>All assets scanned</span>
          <Badge variant="outline" className="border-success/30 bg-success/10 text-success">
            {result.scannedAssets} assets
          </Badge>
        </AlertTitle>
        <AlertDescription className="text-success/80">
          All assets in the scan scope are compatible with {result.toolName || 'the selected tool'}.
        </AlertDescription>
        {dismissible && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-2 top-2 h-6 w-6 p-0"
            onClick={handleDismiss}
          >
            <XCircle className="h-4 w-4" />
          </Button>
        )}
      </Alert>
    )
  }

  return (
    <Alert
      className={cn(
        'relative',
        status === 'partial' && 'border-warning/30 bg-warning/5',
        status === 'none' && 'border-destructive/30 bg-destructive/5',
        className
      )}
    >
      <Filter
        className={cn('h-4 w-4', status === 'partial' ? 'text-warning' : 'text-destructive')}
      />
      <AlertTitle
        className={cn(
          'flex items-center gap-2',
          status === 'partial' ? 'text-warning' : 'text-destructive'
        )}
      >
        <span>Smart filtering applied</span>
        {result.toolName && (
          <Badge variant="outline" className="text-xs">
            {result.toolName}
          </Badge>
        )}
      </AlertTitle>
      <AlertDescription className="space-y-3">
        <p className={cn(status === 'partial' ? 'text-warning/80' : 'text-destructive/80')}>
          {result.skippedAssets} of {result.totalAssets} assets were <strong>skipped</strong>{' '}
          because they are not compatible with the scanner.
        </p>

        {/* Progress bar showing scanned vs skipped */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span>
              {result.scannedAssets} scanned / {result.skippedAssets} skipped
            </span>
            <span>{Math.round(result.compatibilityPercent)}% compatible</span>
          </div>
          <Progress
            value={result.compatibilityPercent}
            className={cn(
              'h-2',
              status === 'partial' && '[&>div]:bg-warning',
              status === 'none' && '[&>div]:bg-destructive'
            )}
          />
        </div>

        {/* Stats badges */}
        <div className="flex flex-wrap gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className="border-success/30 bg-success/10">
                  <CheckCircle className="me-1 h-3 w-3 text-success" />
                  <span className="text-success">{result.scannedAssets} scanned</span>
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>Assets that were scanned by the tool</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className="border-destructive/30 bg-destructive/10">
                  <XCircle className="me-1 h-3 w-3 text-destructive" />
                  <span className="text-destructive">{result.skippedAssets} skipped</span>
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>Assets that were skipped (incompatible)</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {result.unclassifiedAssets > 0 && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className="border-slate-500/30 bg-slate-500/10">
                    <Info className="me-1 h-3 w-3 text-slate-500" />
                    <span className="text-slate-500">{result.unclassifiedAssets} unclassified</span>
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Assets with no type assigned - cannot match any scanner</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>

        {/* Skip reasons breakdown (collapsible) */}
        {result.skipReasons && result.skipReasons.length > 0 && (
          <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                <ChevronDown
                  className={cn('me-1 h-3 w-3 transition-transform', isOpen && 'rotate-180')}
                />
                {isOpen ? 'Hide' : 'Show'} skip reasons
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2">
              <div className="rounded-md border bg-background/50 p-2">
                {/* A few-row breakdown inside an alert, not a list: a plain table keeps
                    it compact; DataTable's toolbar and paging would outweigh it. */}
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="pb-1 text-start font-medium">Asset type</th>
                      <th className="pb-1 text-end font-medium">Count</th>
                      <th className="pb-1 text-start font-medium">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {result.skipReasons.map((item) => (
                      <tr key={item.assetType}>
                        <td className="py-1">
                          {ASSET_TYPE_LABELS[item.assetType as keyof typeof ASSET_TYPE_LABELS] ||
                            item.assetType}
                        </td>
                        <td className="py-1 text-end tabular-nums">{item.count}</td>
                        <td className="py-1 text-muted-foreground">{item.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Scanned by type breakdown */}
        {result.scannedByType && Object.keys(result.scannedByType).length > 0 && (
          <div className="flex flex-wrap items-center gap-1 text-xs">
            <span className="text-muted-foreground">Scanned:</span>
            {Object.entries(result.scannedByType).map(([type, count]) => (
              <Badge key={type} variant="secondary" className="text-xs">
                {ASSET_TYPE_LABELS[type as keyof typeof ASSET_TYPE_LABELS] || type}: {count}
              </Badge>
            ))}
          </div>
        )}
      </AlertDescription>

      {dismissible && (
        <Button
          variant="ghost"
          size="sm"
          className="absolute right-2 top-2 h-6 w-6 p-0"
          onClick={handleDismiss}
        >
          <XCircle className="h-4 w-4" />
        </Button>
      )}
    </Alert>
  )
}

/**
 * Compact badge version for inline display
 */
export function FilteringResultBadge({ result }: { result: FilteringResult }) {
  if (!result.wasFiltered || result.skippedAssets === 0) {
    return null
  }

  const status = getCompatibilityStatus(result.compatibilityPercent)

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={cn(
              'cursor-help',
              status === 'partial' && 'border-warning/30 bg-warning/10 text-warning',
              status === 'none' && 'border-destructive/30 bg-destructive/10 text-destructive'
            )}
          >
            <Filter className="me-1 h-3 w-3" />
            {result.skippedAssets} skipped
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>
            {result.skippedAssets} of {result.totalAssets} assets were skipped due to
            incompatibility with {result.toolName || 'the scanner'}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
