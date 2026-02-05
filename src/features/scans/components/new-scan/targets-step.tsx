/**
 * Targets Step
 *
 * Step 2: Select scan targets
 * All 3 sections (Asset Groups, Individual Assets, Custom Targets) are visible
 * User must select at least one target from any section
 */

'use client'

import { useState, useMemo, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Search,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FolderOpen,
  Target,
  FileText,
  HelpCircle,
  CheckCircle2,
  XCircle,
  AlertCircle,
  X,
  Loader2,
} from 'lucide-react'
import type { NewScanFormData } from '../../types'
import { useAssetGroups } from '@/features/asset-groups'
import { useAssets, ASSET_TYPE_LABELS, ASSET_TYPE_COLORS } from '@/features/assets'
import type { Asset } from '@/features/assets'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

// Target validation patterns (matching backend validator)
const TARGET_PATTERNS = {
  domain:
    /^(?:\*\.)?[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/,
  ipv4: /^(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
  ipv6: /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::(?:[0-9a-fA-F]{1,4}:){0,6}[0-9a-fA-F]{1,4}$|^(?:[0-9a-fA-F]{1,4}:){1,6}::$/,
  cidr: /^(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\/(?:[0-9]|[12][0-9]|3[0-2])$/,
  url: /^https?:\/\/[^\s/$.?#].[^\s]*$/i,
  hostPort: /^[a-zA-Z0-9.-]+:\d{1,5}$/,
}

// Internal IP ranges (blocked by backend SSRF protection)
const INTERNAL_IP_PATTERNS = [
  /^10\./,
  /^172\.(1[6-9]|2[0-9]|3[01])\./,
  /^192\.168\./,
  /^127\./,
  /^0\./,
  /^169\.254\./,
  /^::1$/,
  /^fc00:/i,
  /^fe80:/i,
]

type ValidationStatus = 'valid' | 'invalid' | 'warning'

interface ValidatedTarget {
  target: string
  status: ValidationStatus
  type?: string
  message?: string
}

function validateTarget(target: string): ValidatedTarget {
  const trimmed = target.trim()
  if (!trimmed) {
    return { target: trimmed, status: 'invalid', message: 'Empty target' }
  }

  // Check for dangerous characters
  if (/[;&|`$(){}[\]<>\\'"!#]/.test(trimmed)) {
    return { target: trimmed, status: 'invalid', message: 'Contains invalid characters' }
  }

  // Check for internal IPs (will be blocked by backend)
  for (const pattern of INTERNAL_IP_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        target: trimmed,
        status: 'warning',
        type: 'internal',
        message: 'Internal IP (may be blocked)',
      }
    }
  }

  // Check localhost (including as hostname)
  const localhostPatterns = [/^localhost$/i, /^localhost\.localdomain$/i, /\.localhost$/i]
  if (
    localhostPatterns.some((p) => p.test(trimmed)) ||
    trimmed === '127.0.0.1' ||
    trimmed === '::1'
  ) {
    return {
      target: trimmed,
      status: 'warning',
      type: 'localhost',
      message: 'Localhost (may be blocked)',
    }
  }

  // Check for localhost in URLs (e.g., http://localhost:8080)
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const url = new URL(trimmed)
      const hostname = url.hostname.toLowerCase()
      if (
        hostname === 'localhost' ||
        hostname === 'localhost.localdomain' ||
        hostname.endsWith('.localhost')
      ) {
        return {
          target: trimmed,
          status: 'warning',
          type: 'localhost',
          message: 'Localhost URL (may be blocked)',
        }
      }
      // Check for internal IPs in URLs
      for (const pattern of INTERNAL_IP_PATTERNS) {
        if (pattern.test(hostname)) {
          return {
            target: trimmed,
            status: 'warning',
            type: 'internal',
            message: 'Internal IP URL (may be blocked)',
          }
        }
      }
    } catch {
      // Invalid URL - will be caught later
    }
  }

  // Check for localhost in host:port format
  if (TARGET_PATTERNS.hostPort.test(trimmed)) {
    const [host] = trimmed.split(':')
    const hostLower = host.toLowerCase()
    if (
      hostLower === 'localhost' ||
      hostLower === 'localhost.localdomain' ||
      hostLower.endsWith('.localhost')
    ) {
      return {
        target: trimmed,
        status: 'warning',
        type: 'localhost',
        message: 'Localhost (may be blocked)',
      }
    }
    // Check for internal IPs in host:port
    for (const pattern of INTERNAL_IP_PATTERNS) {
      if (pattern.test(host)) {
        return {
          target: trimmed,
          status: 'warning',
          type: 'internal',
          message: 'Internal IP (may be blocked)',
        }
      }
    }
  }

  // Validate format
  if (TARGET_PATTERNS.domain.test(trimmed)) {
    return { target: trimmed, status: 'valid', type: 'domain' }
  }
  if (TARGET_PATTERNS.ipv4.test(trimmed)) {
    return { target: trimmed, status: 'valid', type: 'ipv4' }
  }
  if (TARGET_PATTERNS.cidr.test(trimmed)) {
    return { target: trimmed, status: 'valid', type: 'cidr' }
  }
  if (TARGET_PATTERNS.ipv6.test(trimmed)) {
    return { target: trimmed, status: 'valid', type: 'ipv6' }
  }
  if (TARGET_PATTERNS.url.test(trimmed)) {
    return { target: trimmed, status: 'valid', type: 'url' }
  }
  if (TARGET_PATTERNS.hostPort.test(trimmed)) {
    return { target: trimmed, status: 'valid', type: 'host:port' }
  }

  return { target: trimmed, status: 'invalid', message: 'Invalid format' }
}

interface TargetsStepProps {
  data: NewScanFormData
  onChange: (data: Partial<NewScanFormData>) => void
}

export function TargetsStep({ data, onChange }: TargetsStepProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [assetPage, setAssetPage] = useState(1)
  const [openSections, setOpenSections] = useState({
    assetGroups: true,
    individual: false,
    custom: true,
  })
  const { data: assetGroups, isLoading: isLoadingGroups } = useAssetGroups()

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery)
      setAssetPage(1) // Reset to page 1 when search changes
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Fetch assets based on search query (only when section is open)
  const {
    assets,
    isLoading: isLoadingAssets,
    total,
    totalPages,
    page,
  } = useAssets({
    search: debouncedSearch || undefined,
    page: assetPage,
    pageSize: 10,
    skip: !openSections.individual,
  })

  // Store selected assets metadata for display
  const [selectedAssetsMeta, setSelectedAssetsMeta] = useState<Map<string, Asset>>(new Map())

  // Validate custom targets in real-time
  const validatedTargets = useMemo(() => {
    return data.targets.customTargets.map(validateTarget)
  }, [data.targets.customTargets])

  const validationStats = useMemo(() => {
    const valid = validatedTargets.filter((t) => t.status === 'valid').length
    const invalid = validatedTargets.filter((t) => t.status === 'invalid').length
    const warning = validatedTargets.filter((t) => t.status === 'warning').length
    return { valid, invalid, warning, total: validatedTargets.length }
  }, [validatedTargets])

  const handleGroupToggle = (groupId: string, checked: boolean) => {
    const newGroupIds = checked
      ? [...data.targets.assetGroupIds, groupId]
      : data.targets.assetGroupIds.filter((id) => id !== groupId)

    onChange({
      targets: {
        ...data.targets,
        assetGroupIds: newGroupIds,
      },
    })
  }

  const handleAssetToggle = (asset: Asset, checked: boolean) => {
    const newAssetIds = checked
      ? [...data.targets.assetIds, asset.id]
      : data.targets.assetIds.filter((id) => id !== asset.id)

    // Update assetNames map for converting to targets later
    const newAssetNames = { ...data.targets.assetNames }
    if (checked) {
      newAssetNames[asset.id] = asset.name
    } else {
      delete newAssetNames[asset.id]
    }

    // Update metadata map for UI display
    if (checked) {
      setSelectedAssetsMeta((prev) => new Map(prev).set(asset.id, asset))
    } else {
      setSelectedAssetsMeta((prev) => {
        const newMap = new Map(prev)
        newMap.delete(asset.id)
        return newMap
      })
    }

    onChange({
      targets: {
        ...data.targets,
        assetIds: newAssetIds,
        assetNames: newAssetNames,
      },
    })
  }

  const handleRemoveAsset = (assetId: string) => {
    setSelectedAssetsMeta((prev) => {
      const newMap = new Map(prev)
      newMap.delete(assetId)
      return newMap
    })

    // Remove from assetNames map too
    const newAssetNames = { ...data.targets.assetNames }
    delete newAssetNames[assetId]

    onChange({
      targets: {
        ...data.targets,
        assetIds: data.targets.assetIds.filter((id) => id !== assetId),
        assetNames: newAssetNames,
      },
    })
  }

  const handleCustomTargetsChange = (value: string) => {
    const targets = value
      .split('\n')
      .map((t) => t.trim())
      .filter(Boolean)
    onChange({
      targets: {
        ...data.targets,
        customTargets: targets,
      },
    })
  }

  // Calculate total selected targets across all sources
  const calculateSelectedCount = (): number => {
    let total = 0

    // Asset groups - count assets in selected groups
    const selectedGroupAssets = (assetGroups ?? [])
      .filter((g) => data.targets.assetGroupIds.includes(g.id))
      .reduce((acc, g) => acc + (g.assetCount ?? 0), 0)
    total += selectedGroupAssets

    // Individual assets
    total += data.targets.assetIds.length

    // Custom targets
    total += data.targets.customTargets.length

    return total
  }

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }))
  }

  const hasAssetGroups = data.targets.assetGroupIds.length > 0
  const hasIndividualAssets = data.targets.assetIds.length > 0
  const hasCustomTargets = data.targets.customTargets.length > 0

  return (
    <div className="space-y-4 p-4">
      <div className="space-y-2">
        <Label>Select Targets</Label>
        <p className="text-muted-foreground text-sm">
          Select at least one target source. You can combine multiple sources.
        </p>
      </div>

      {/* Asset Groups Section */}
      <Collapsible
        open={openSections.assetGroups}
        onOpenChange={() => toggleSection('assetGroups')}
      >
        <div
          className={cn(
            'rounded-lg border transition-colors',
            hasAssetGroups && 'border-primary/50 bg-primary/5'
          )}
        >
          <CollapsibleTrigger className="flex w-full items-center justify-between p-3 hover:bg-muted/50">
            <div className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Asset Groups</span>
              {hasAssetGroups && (
                <Badge variant="secondary" className="ml-2">
                  {data.targets.assetGroupIds.length} selected
                </Badge>
              )}
            </div>
            <ChevronDown
              className={cn(
                'h-4 w-4 text-muted-foreground transition-transform',
                openSections.assetGroups && 'rotate-180'
              )}
            />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="border-t p-3">
              {isLoadingGroups ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center justify-between p-2">
                      <div className="flex items-center space-x-3">
                        <Skeleton className="h-4 w-4" />
                        <Skeleton className="h-4 w-32" />
                      </div>
                      <Skeleton className="h-5 w-16" />
                    </div>
                  ))}
                </div>
              ) : (assetGroups ?? []).length === 0 ? (
                <p className="text-muted-foreground py-4 text-center text-sm">
                  No asset groups found. Create one first.
                </p>
              ) : (
                <div className="max-h-48 space-y-1 overflow-y-auto">
                  {(assetGroups ?? []).map((group) => (
                    <div
                      key={group.id}
                      className="flex items-center justify-between rounded-md p-2 hover:bg-muted/50"
                    >
                      <div className="flex items-center space-x-3">
                        <Checkbox
                          id={`group-${group.id}`}
                          checked={data.targets.assetGroupIds.includes(group.id)}
                          onCheckedChange={(checked) =>
                            handleGroupToggle(group.id, checked as boolean)
                          }
                        />
                        <Label htmlFor={`group-${group.id}`} className="cursor-pointer">
                          {group.name}
                        </Label>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {group.assetCount ?? 0} assets
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>

      {/* Individual Assets Section */}
      <Collapsible open={openSections.individual} onOpenChange={() => toggleSection('individual')}>
        <div
          className={cn(
            'rounded-lg border transition-colors',
            hasIndividualAssets && 'border-primary/50 bg-primary/5'
          )}
        >
          <CollapsibleTrigger className="flex w-full items-center justify-between p-3 hover:bg-muted/50">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Individual Assets</span>
              {hasIndividualAssets && (
                <Badge variant="secondary" className="ml-2">
                  {data.targets.assetIds.length} selected
                </Badge>
              )}
            </div>
            <ChevronDown
              className={cn(
                'h-4 w-4 text-muted-foreground transition-transform',
                openSections.individual && 'rotate-180'
              )}
            />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="border-t p-3 space-y-3">
              {/* Selected assets pills */}
              {hasIndividualAssets && (
                <div className="flex flex-wrap gap-1.5">
                  {data.targets.assetIds.map((assetId) => {
                    const assetMeta = selectedAssetsMeta.get(assetId)
                    return (
                      <Badge key={assetId} variant="secondary" className="gap-1 pr-1">
                        <span className="truncate max-w-[150px]">
                          {assetMeta?.name ?? assetId.slice(0, 8)}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-4 w-4 p-0 hover:bg-transparent"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleRemoveAsset(assetId)
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </Badge>
                    )
                  })}
                </div>
              )}

              {/* Search input */}
              <div className="relative">
                <Search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
                <Input
                  placeholder="Search assets by name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
                {isLoadingAssets && (
                  <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                )}
              </div>

              {/* Asset search results */}
              <ScrollArea className="max-h-48">
                <div className="space-y-1">
                  {isLoadingAssets ? (
                    <div className="space-y-2 py-2">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="flex items-center justify-between p-2">
                          <div className="flex items-center space-x-3">
                            <Skeleton className="h-4 w-4" />
                            <Skeleton className="h-4 w-32" />
                          </div>
                          <Skeleton className="h-5 w-16" />
                        </div>
                      ))}
                    </div>
                  ) : assets.length === 0 ? (
                    <p className="text-muted-foreground py-4 text-center text-sm">
                      {debouncedSearch
                        ? `No assets found for "${debouncedSearch}"`
                        : 'Type to search assets'}
                    </p>
                  ) : (
                    assets.map((asset) => {
                      const isSelected = data.targets.assetIds.includes(asset.id)
                      const typeLabel = ASSET_TYPE_LABELS[asset.type] ?? asset.type
                      const typeColors = ASSET_TYPE_COLORS[asset.type] ?? {
                        bg: 'bg-gray-100',
                        text: 'text-gray-700',
                      }

                      return (
                        <div
                          key={asset.id}
                          className={cn(
                            'flex items-center justify-between rounded-md p-2 hover:bg-muted/50 cursor-pointer',
                            isSelected && 'bg-primary/5'
                          )}
                          onClick={() => handleAssetToggle(asset, !isSelected)}
                        >
                          <div className="flex items-center space-x-3 min-w-0">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={(checked) =>
                                handleAssetToggle(asset, checked as boolean)
                              }
                              onClick={(e) => e.stopPropagation()}
                            />
                            <div className="min-w-0">
                              <p className="font-medium text-sm truncate">{asset.name}</p>
                              {asset.description && (
                                <p className="text-xs text-muted-foreground truncate">
                                  {asset.description}
                                </p>
                              )}
                            </div>
                          </div>
                          <Badge
                            variant="outline"
                            className={cn('text-xs shrink-0', typeColors.bg, typeColors.text)}
                          >
                            {typeLabel}
                          </Badge>
                        </div>
                      )
                    })
                  )}
                </div>
              </ScrollArea>

              {/* Pagination controls */}
              {assets.length > 0 && (
                <div className="flex items-center justify-between pt-1">
                  <p className="text-xs text-muted-foreground">
                    Showing {assets.length} of {total} assets
                    {debouncedSearch && ` matching "${debouncedSearch}"`}
                  </p>
                  {totalPages > 1 && (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        disabled={page <= 1 || isLoadingAssets}
                        onClick={() => setAssetPage((p) => Math.max(1, p - 1))}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-xs text-muted-foreground min-w-[60px] text-center">
                        {page} / {totalPages}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        disabled={page >= totalPages || isLoadingAssets}
                        onClick={() => setAssetPage((p) => Math.min(totalPages, p + 1))}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>

      {/* Custom Targets Section */}
      <Collapsible open={openSections.custom} onOpenChange={() => toggleSection('custom')}>
        <div
          className={cn(
            'rounded-lg border transition-colors',
            hasCustomTargets && validationStats.invalid === 0 && 'border-primary/50 bg-primary/5',
            hasCustomTargets &&
              validationStats.invalid > 0 &&
              'border-destructive/50 bg-destructive/5'
          )}
        >
          <CollapsibleTrigger className="flex w-full items-center justify-between p-3 hover:bg-muted/50">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Custom Targets</span>
              {hasCustomTargets && (
                <div className="flex items-center gap-1 ml-2">
                  {validationStats.valid > 0 && (
                    <Badge
                      variant="secondary"
                      className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                    >
                      {validationStats.valid} valid
                    </Badge>
                  )}
                  {validationStats.invalid > 0 && (
                    <Badge variant="destructive">{validationStats.invalid} invalid</Badge>
                  )}
                  {validationStats.warning > 0 && (
                    <Badge
                      variant="secondary"
                      className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                    >
                      {validationStats.warning} warning
                    </Badge>
                  )}
                </div>
              )}
            </div>
            <ChevronDown
              className={cn(
                'h-4 w-4 text-muted-foreground transition-transform',
                openSections.custom && 'rotate-180'
              )}
            />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="border-t p-3 space-y-3">
              {/* Format hints */}
              <div className="flex items-start gap-2">
                <Label htmlFor="custom-targets" className="text-sm text-muted-foreground flex-1">
                  Enter targets (one per line)
                </Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button type="button" className="text-muted-foreground hover:text-foreground">
                        <HelpCircle className="h-4 w-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="left" className="max-w-xs">
                      <div className="space-y-2 text-xs">
                        <p className="font-medium">Supported formats:</p>
                        <ul className="space-y-1">
                          <li>
                            <code className="bg-muted px-1 rounded">example.com</code> - Domain
                          </li>
                          <li>
                            <code className="bg-muted px-1 rounded">*.example.com</code> - Wildcard
                          </li>
                          <li>
                            <code className="bg-muted px-1 rounded">192.168.1.1</code> - IPv4
                          </li>
                          <li>
                            <code className="bg-muted px-1 rounded">192.168.1.0/24</code> - CIDR
                            range
                          </li>
                          <li>
                            <code className="bg-muted px-1 rounded">https://example.com</code> - URL
                          </li>
                          <li>
                            <code className="bg-muted px-1 rounded">example.com:8080</code> -
                            Host:Port
                          </li>
                          <li>
                            <code className="bg-muted px-1 rounded">2001:db8::1</code> - IPv6
                          </li>
                        </ul>
                        <p className="text-muted-foreground mt-2">
                          Internal IPs (10.x, 192.168.x) are blocked for security.
                        </p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              <Textarea
                id="custom-targets"
                placeholder={
                  'example.com\n192.168.1.0/24\nhttps://api.example.com/v1\nmail.example.com:587'
                }
                rows={5}
                value={data.targets.customTargets.join('\n')}
                onChange={(e) => handleCustomTargetsChange(e.target.value)}
                className={cn(
                  validationStats.invalid > 0 && 'border-destructive focus-visible:ring-destructive'
                )}
              />

              {/* Validation feedback */}
              {hasCustomTargets && (
                <div className="space-y-2">
                  {/* Show invalid targets */}
                  {validatedTargets
                    .filter((t) => t.status === 'invalid')
                    .slice(0, 3)
                    .map((t, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-destructive">
                        <XCircle className="h-3 w-3 flex-shrink-0" />
                        <span className="font-mono truncate">{t.target}</span>
                        <span className="text-muted-foreground">- {t.message}</span>
                      </div>
                    ))}
                  {validatedTargets.filter((t) => t.status === 'invalid').length > 3 && (
                    <p className="text-xs text-destructive">
                      ...and {validatedTargets.filter((t) => t.status === 'invalid').length - 3}{' '}
                      more invalid targets
                    </p>
                  )}

                  {/* Show warnings */}
                  {validatedTargets
                    .filter((t) => t.status === 'warning')
                    .slice(0, 2)
                    .map((t, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 text-xs text-yellow-600 dark:text-yellow-500"
                      >
                        <AlertCircle className="h-3 w-3 flex-shrink-0" />
                        <span className="font-mono truncate">{t.target}</span>
                        <span className="text-muted-foreground">- {t.message}</span>
                      </div>
                    ))}

                  {/* Success summary */}
                  {validationStats.invalid === 0 && validationStats.valid > 0 && (
                    <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-500">
                      <CheckCircle2 className="h-3 w-3" />
                      <span>All {validationStats.valid} targets are valid</span>
                    </div>
                  )}
                </div>
              )}

              {/* Format examples */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                <span className="text-xs text-muted-foreground">Examples:</span>
                {['example.com', '10.0.0.0/8', 'api.site.com:443'].map((example) => (
                  <button
                    key={example}
                    type="button"
                    onClick={() => {
                      const current = data.targets.customTargets
                      if (!current.includes(example)) {
                        onChange({
                          targets: {
                            ...data.targets,
                            customTargets: [...current, example],
                          },
                        })
                      }
                    }}
                    className="text-xs px-1.5 py-0.5 rounded bg-muted hover:bg-muted/80 font-mono text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>

      {/* Selected count summary */}
      <div className="bg-muted/50 rounded-lg border p-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Total Selected Targets</span>
          <Badge variant="default">{calculateSelectedCount()} targets</Badge>
        </div>
        {!hasAssetGroups && !hasIndividualAssets && !hasCustomTargets && (
          <p className="text-muted-foreground mt-2 text-xs">
            Please select at least one target source
          </p>
        )}
      </div>
    </div>
  )
}
