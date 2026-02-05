/**
 * Asset Compatibility Warning Component
 *
 * Shows a warning when selected asset groups contain assets
 * incompatible with the selected scanner/tool
 */

import { AlertTriangle, CheckCircle, Info, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Button } from '@/components/ui/button'
import { ChevronDown } from 'lucide-react'
import { useState } from 'react'
import type { AssetCompatibilityPreview, CompatibilityStatus } from '../types/scan.types'
import { getCompatibilityStatus, COMPATIBILITY_STATUS_CONFIG } from '../types/scan.types'
import { ASSET_TYPE_LABELS } from '@/features/assets/types/asset.types'

interface AssetCompatibilityWarningProps {
  preview: AssetCompatibilityPreview
  className?: string
  /** Whether to show detailed breakdown */
  showDetails?: boolean
}

export function AssetCompatibilityWarning({
  preview,
  className,
  showDetails = true,
}: AssetCompatibilityWarningProps) {
  const [isOpen, setIsOpen] = useState(false)
  const status = getCompatibilityStatus(preview.compatibilityPercent)
  const config = COMPATIBILITY_STATUS_CONFIG[status]

  // Don't show if fully compatible
  if (status === 'full') {
    return (
      <Alert className={cn('border-green-500/30 bg-green-500/5', className)}>
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertTitle className="text-green-600">All assets compatible</AlertTitle>
        <AlertDescription className="text-green-600/80">
          All {preview.totalAssets} assets in the selected group(s) can be scanned by{' '}
          {preview.toolName || 'this tool'}.
        </AlertDescription>
      </Alert>
    )
  }

  const StatusIcon = status === 'partial' ? AlertTriangle : XCircle

  return (
    <Alert
      variant={status === 'none' ? 'destructive' : 'default'}
      className={cn(status === 'partial' && 'border-yellow-500/30 bg-yellow-500/5', className)}
    >
      <StatusIcon
        className={cn('h-4 w-4', status === 'partial' ? 'text-yellow-600' : 'text-red-600')}
      />
      <AlertTitle className={cn(status === 'partial' ? 'text-yellow-600' : 'text-red-600')}>
        {status === 'partial' ? 'Some assets incompatible' : 'No compatible assets'}
      </AlertTitle>
      <AlertDescription className="space-y-3">
        <p className={cn(status === 'partial' ? 'text-yellow-600/80' : 'text-red-600/80')}>
          {status === 'partial' ? (
            <>
              {preview.incompatibleAssets} of {preview.totalAssets} assets will be{' '}
              <strong>skipped</strong> because they are not compatible with{' '}
              {preview.toolName || 'this tool'}.
            </>
          ) : (
            <>
              None of the {preview.totalAssets} assets can be scanned by{' '}
              {preview.toolName || 'this tool'}. Consider selecting a different tool or asset group.
            </>
          )}
        </p>

        {/* Progress bar showing compatibility */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span>Compatibility</span>
            <span>{Math.round(preview.compatibilityPercent)}%</span>
          </div>
          <Progress
            value={preview.compatibilityPercent}
            className={cn(
              'h-2',
              status === 'partial' && '[&>div]:bg-yellow-500',
              status === 'none' && '[&>div]:bg-red-500'
            )}
          />
        </div>

        {/* Stats row */}
        <div className="flex gap-4 text-sm">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1">
                  <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                  <span className="text-green-600">{preview.compatibleAssets} compatible</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Assets that will be scanned</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1">
                  <XCircle className="h-3.5 w-3.5 text-red-600" />
                  <span className="text-red-600">{preview.incompatibleAssets} incompatible</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Assets that will be skipped</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {preview.unclassifiedAssets > 0 && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1">
                    <Info className="h-3.5 w-3.5 text-slate-500" />
                    <span className="text-slate-500">
                      {preview.unclassifiedAssets} unclassified
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Assets without a type cannot be matched to any scanner</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>

        {/* Supported targets */}
        {preview.supportedTargets && preview.supportedTargets.length > 0 && (
          <div className="flex flex-wrap items-center gap-1 text-xs">
            <span className="text-muted-foreground">Supported targets:</span>
            {preview.supportedTargets.map((target) => (
              <Badge key={target} variant="outline" className="text-xs">
                {target}
              </Badge>
            ))}
          </div>
        )}

        {/* Detailed breakdown (collapsible) */}
        {showDetails && preview.assetTypeBreakdown && preview.assetTypeBreakdown.length > 0 && (
          <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                <ChevronDown
                  className={cn('mr-1 h-3 w-3 transition-transform', isOpen && 'rotate-180')}
                />
                {isOpen ? 'Hide' : 'Show'} breakdown by asset type
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2">
              <div className="rounded-md border bg-background/50 p-2">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="pb-1 text-left font-medium">Asset Type</th>
                      <th className="pb-1 text-right font-medium">Count</th>
                      <th className="pb-1 text-right font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {preview.assetTypeBreakdown.map((item) => (
                      <tr key={item.assetType}>
                        <td className="py-1">
                          {ASSET_TYPE_LABELS[item.assetType as keyof typeof ASSET_TYPE_LABELS] ||
                            item.assetType}
                        </td>
                        <td className="py-1 text-right">{item.count}</td>
                        <td className="py-1 text-right">
                          {item.isCompatible ? (
                            <Badge
                              variant="outline"
                              className="border-green-500/30 bg-green-500/10 text-green-600"
                            >
                              Compatible
                            </Badge>
                          ) : (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge
                                    variant="outline"
                                    className="border-red-500/30 bg-red-500/10 text-red-600"
                                  >
                                    Skipped
                                  </Badge>
                                </TooltipTrigger>
                                {item.reason && (
                                  <TooltipContent>
                                    <p>{item.reason}</p>
                                  </TooltipContent>
                                )}
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
      </AlertDescription>
    </Alert>
  )
}
