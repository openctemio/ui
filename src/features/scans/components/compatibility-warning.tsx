/**
 * Compatibility Warning Component
 *
 * Self-contained component that fetches and displays asset-scanner
 * compatibility information. Shows which asset types will be scanned
 * vs skipped when running a scan with a particular tool.
 *
 * Fetches data via SWR and degrades gracefully if the API is unavailable.
 */

'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { AlertTriangle, Check, ChevronDown, ChevronUp, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Button } from '@/components/ui/button'
import { fetcher } from '@/lib/api/client'
import { ASSET_TYPE_LABELS } from '@/features/assets/types/asset.types'

// ============================================
// TYPES
// ============================================

/**
 * Per-asset-type compatibility detail returned from the API
 */
interface AssetTypeDetail {
  /** Asset type identifier (e.g., 'domain', 'ip_address', 'website') */
  asset_type: string
  /** Number of assets of this type */
  count: number
  /** Whether this type is compatible with the selected tool */
  is_compatible: boolean
  /** Human-readable reason for skipping (only present when incompatible) */
  skip_reason?: string
}

/**
 * Response shape from the compatibility preview API endpoint
 */
interface CompatibilityResponse {
  /** Total number of assets in scope */
  total_assets: number
  /** Number of assets that will be scanned */
  compatible_assets: number
  /** Number of assets that will be skipped */
  skipped_assets: number
  /** Percentage of compatible assets (0-100) */
  compatibility_percent: number
  /** Name of the scanner tool being checked */
  tool_name?: string
  /** Target types supported by the tool */
  supported_targets?: string[]
  /** Per-asset-type breakdown */
  asset_type_details?: AssetTypeDetail[]
}

// ============================================
// PROPS
// ============================================

interface CompatibilityWarningProps {
  /** Scan ID for fetching compatibility data of an existing scan */
  scanId?: string
  /** Asset group ID for previewing compatibility before scan creation */
  assetGroupId?: string
  /** Tool/scanner name for display and preview endpoint */
  toolName?: string
  /** Additional CSS classes */
  className?: string
}

// ============================================
// HELPERS
// ============================================

/**
 * Build the SWR cache key / API endpoint based on available props.
 * Returns null if no identifiers are provided (SWR skips the fetch).
 */
function buildEndpoint(scanId?: string, assetGroupId?: string, toolName?: string): string | null {
  if (scanId) {
    return `/api/v1/scans/${scanId}/compatibility`
  }

  if (assetGroupId && toolName) {
    const params = new URLSearchParams({
      asset_group_id: assetGroupId,
      tool_name: toolName,
    })
    return `/api/v1/scans/compatibility/preview?${params.toString()}`
  }

  if (assetGroupId) {
    return `/api/v1/scans/compatibility/preview?asset_group_id=${assetGroupId}`
  }

  return null
}

/**
 * Get a human-readable label for an asset type.
 * Falls back to the raw type string if no label is defined.
 */
function getAssetTypeLabel(assetType: string): string {
  return ASSET_TYPE_LABELS[assetType as keyof typeof ASSET_TYPE_LABELS] || assetType
}

// ============================================
// COMPONENT
// ============================================

export function CompatibilityWarning({
  scanId,
  assetGroupId,
  toolName,
  className,
}: CompatibilityWarningProps) {
  const [isOpen, setIsOpen] = useState(false)

  const endpoint = buildEndpoint(scanId, assetGroupId, toolName)

  const { data, error, isLoading } = useSWR<CompatibilityResponse>(endpoint, fetcher, {
    revalidateOnFocus: false,
    // Don't retry on 4xx -- the endpoint may not exist yet
    shouldRetryOnError: (err) => {
      if (err?.statusCode >= 400 && err?.statusCode < 500) {
        return false
      }
      return true
    },
    errorRetryCount: 1,
  })

  // -------------------------------------------
  // No identifiers provided -- nothing to show
  // -------------------------------------------
  if (!endpoint) {
    return null
  }

  // -------------------------------------------
  // Loading state
  // -------------------------------------------
  if (isLoading) {
    return (
      <Alert className={cn('border-muted', className)}>
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        <AlertTitle className="text-muted-foreground">Checking compatibility...</AlertTitle>
        <AlertDescription className="text-muted-foreground/80">
          Analyzing asset types against {toolName || 'the selected scanner'}.
        </AlertDescription>
      </Alert>
    )
  }

  // -------------------------------------------
  // Error / API unavailable -- graceful degradation
  // -------------------------------------------
  if (error || !data) {
    return null
  }

  // -------------------------------------------
  // Derive display values
  // -------------------------------------------
  const {
    total_assets: totalAssets,
    compatible_assets: compatibleAssets,
    skipped_assets: skippedAssets,
    compatibility_percent: compatibilityPercent,
    tool_name: apiToolName,
    supported_targets: supportedTargets,
    asset_type_details: assetTypeDetails,
  } = data

  const displayToolName = toolName || apiToolName || 'this tool'
  const isFullyCompatible = compatibilityPercent >= 100
  const hasNoCompatible = compatibilityPercent <= 0 && totalAssets > 0
  const skippedDetails = assetTypeDetails?.filter((d) => !d.is_compatible) ?? []
  const compatibleDetails = assetTypeDetails?.filter((d) => d.is_compatible) ?? []

  // -------------------------------------------
  // Fully compatible -- brief success message
  // -------------------------------------------
  if (isFullyCompatible) {
    return (
      <Alert className={cn('border-green-500/30 bg-green-500/5', className)}>
        <Check className="h-4 w-4 text-green-600" />
        <AlertTitle className="text-green-600">All assets compatible</AlertTitle>
        <AlertDescription className="text-green-600/80">
          All {totalAssets} asset{totalAssets !== 1 ? 's' : ''} can be scanned by {displayToolName}.
        </AlertDescription>
      </Alert>
    )
  }

  // -------------------------------------------
  // Partial or no compatibility -- warning / error
  // -------------------------------------------
  const variant = hasNoCompatible ? 'destructive' : 'default'
  const accentColor = hasNoCompatible ? 'red' : 'yellow'

  return (
    <Alert
      variant={variant}
      className={cn(!hasNoCompatible && 'border-yellow-500/30 bg-yellow-500/5', className)}
    >
      <AlertTriangle
        className={cn('h-4 w-4', accentColor === 'yellow' ? 'text-yellow-600' : 'text-red-600')}
      />

      <AlertTitle className={cn(accentColor === 'yellow' ? 'text-yellow-600' : 'text-red-600')}>
        {hasNoCompatible
          ? 'No compatible assets'
          : `${skippedAssets} of ${totalAssets} assets will be skipped`}
      </AlertTitle>

      <AlertDescription className="space-y-3">
        {/* Summary text */}
        <p className={cn(accentColor === 'yellow' ? 'text-yellow-600/80' : 'text-red-600/80')}>
          {hasNoCompatible ? (
            <>
              None of the {totalAssets} asset{totalAssets !== 1 ? 's' : ''} in scope are compatible
              with {displayToolName}. Consider selecting a different tool or asset group.
            </>
          ) : (
            <>
              {skippedAssets} asset{skippedAssets !== 1 ? 's' : ''} will be <strong>skipped</strong>{' '}
              because {skippedAssets !== 1 ? 'they are' : 'it is'} not compatible with{' '}
              {displayToolName}. {compatibleAssets} asset
              {compatibleAssets !== 1 ? 's' : ''} will still be scanned.
            </>
          )}
        </p>

        {/* Count badges */}
        <div className="flex flex-wrap gap-2 text-sm">
          <Badge variant="outline" className="border-green-500/30 bg-green-500/10 text-green-600">
            <Check className="mr-1 h-3 w-3" />
            {compatibleAssets} compatible
          </Badge>
          <Badge
            variant="outline"
            className={cn(
              accentColor === 'yellow'
                ? 'border-yellow-500/30 bg-yellow-500/10 text-yellow-600'
                : 'border-red-500/30 bg-red-500/10 text-red-600'
            )}
          >
            <AlertTriangle className="mr-1 h-3 w-3" />
            {skippedAssets} skipped
          </Badge>
        </div>

        {/* Supported targets */}
        {supportedTargets && supportedTargets.length > 0 && (
          <div className="flex flex-wrap items-center gap-1 text-xs">
            <span className="text-muted-foreground">Supported targets:</span>
            {supportedTargets.map((target) => (
              <Badge key={target} variant="outline" className="text-xs">
                {getAssetTypeLabel(target)}
              </Badge>
            ))}
          </div>
        )}

        {/* Collapsible details */}
        {assetTypeDetails && assetTypeDetails.length > 0 && (
          <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                aria-label={isOpen ? 'Hide asset type details' : 'Show asset type details'}
              >
                {isOpen ? (
                  <ChevronUp className="mr-1 h-3 w-3" />
                ) : (
                  <ChevronDown className="mr-1 h-3 w-3" />
                )}
                {isOpen ? 'Hide' : 'Show'} details by asset type
              </Button>
            </CollapsibleTrigger>

            <CollapsibleContent className="mt-2">
              <div className="rounded-md border bg-background/50 p-2 overflow-x-auto">
                <table className="w-full text-xs" role="table">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th scope="col" className="pb-1 text-left font-medium">
                        Asset Type
                      </th>
                      <th scope="col" className="pb-1 text-right font-medium hidden md:table-cell">
                        Count
                      </th>
                      <th scope="col" className="pb-1 text-right font-medium">
                        Status
                      </th>
                      <th scope="col" className="pb-1 text-left font-medium hidden md:table-cell">
                        Reason
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {/* Compatible types first */}
                    {compatibleDetails.map((item) => (
                      <tr key={item.asset_type}>
                        <td className="py-1">{getAssetTypeLabel(item.asset_type)}</td>
                        <td className="py-1 text-right hidden md:table-cell">{item.count}</td>
                        <td className="py-1 text-right">
                          <Badge
                            variant="outline"
                            className="border-green-500/30 bg-green-500/10 text-green-600"
                          >
                            Scanned
                          </Badge>
                        </td>
                        <td className="py-1 text-muted-foreground hidden md:table-cell">-</td>
                      </tr>
                    ))}

                    {/* Skipped types */}
                    {skippedDetails.map((item) => (
                      <tr key={item.asset_type}>
                        <td className="py-1">{getAssetTypeLabel(item.asset_type)}</td>
                        <td className="py-1 text-right hidden md:table-cell">{item.count}</td>
                        <td className="py-1 text-right">
                          <Badge
                            variant="outline"
                            className={cn(
                              accentColor === 'yellow'
                                ? 'border-yellow-500/30 bg-yellow-500/10 text-yellow-600'
                                : 'border-red-500/30 bg-red-500/10 text-red-600'
                            )}
                          >
                            Skipped
                          </Badge>
                        </td>
                        <td className="py-1 text-muted-foreground hidden md:table-cell">
                          {item.skip_reason || 'Incompatible asset type'}
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
