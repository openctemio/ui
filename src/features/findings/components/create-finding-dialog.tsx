'use client'

import { useState, useDeferredValue, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Loader2, Check, ChevronsUpDown, AlertCircle, Code, Globe, Box, Cloud } from 'lucide-react'
import { toast } from 'sonner'
import { getErrorMessage } from '@/lib/api/error-handler'
import { cn } from '@/lib/utils'
import { useAssets } from '@/features/assets/hooks/use-assets'
import { useCreateFindingApi, invalidateFindingsCache } from '../api/use-findings-api'
import { useFindingSourcesApi, groupFindingSourcesByCategory } from '@/features/config/api'
import { SEVERITY_CONFIG } from '../types'
import type { Severity } from '@/features/shared/types'
import type { FindingSource } from '../types'
import type { AssetType } from '@/features/assets/types'

// Asset type categories for conditional field rendering
const CODE_ASSET_TYPES: AssetType[] = ['repository']
const NETWORK_ASSET_TYPES: AssetType[] = [
  'website',
  'api',
  'domain',
  'ip_address',
  'endpoint',
  'application',
]
const CONTAINER_ASSET_TYPES: AssetType[] = ['container']
const CLOUD_ASSET_TYPES: AssetType[] = ['cloud_account', 'compute', 'storage', 'serverless']

const SEVERITY_OPTIONS = Object.entries(SEVERITY_CONFIG)
  .filter(([key]) => key !== 'none')
  .map(([value, config]) => ({
    value: value as Severity,
    label: config.label,
    color: config.textColor,
    bgColor: config.bgColor,
  }))

interface CreateFindingDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function CreateFindingDialog({ open, onOpenChange, onSuccess }: CreateFindingDialogProps) {
  const [assetId, setAssetId] = useState('')
  const [assetSearch, setAssetSearch] = useState('')
  const [assetPopoverOpen, setAssetPopoverOpen] = useState(false)
  const [source, setSource] = useState<FindingSource>('manual')
  const [severity, setSeverity] = useState<Severity>('medium')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [toolName, setToolName] = useState('Manual Entry')

  // Code-specific fields
  const [filePath, setFilePath] = useState('')
  const [startLine, setStartLine] = useState('')
  const [endLine, setEndLine] = useState('')
  const [snippet, setSnippet] = useState('')

  // Network-specific fields
  const [affectedUrl, setAffectedUrl] = useState('')

  // Container-specific fields
  const [imageName, setImageName] = useState('')

  // Cloud-specific fields
  const [resourceArn, setResourceArn] = useState('')

  const deferredAssetSearch = useDeferredValue(assetSearch)

  // Fetch assets for selection
  const { assets, isLoading: assetsLoading } = useAssets({
    search: deferredAssetSearch,
    pageSize: 20,
    skip: !open,
  })

  // Fetch finding sources from API (dynamic configuration)
  const { data: findingSourcesData, isLoading: sourcesLoading } = useFindingSourcesApi()

  // Group sources by category for the select dropdown
  const sourceGroups = useMemo(() => {
    if (!findingSourcesData?.data) return []
    const grouped = groupFindingSourcesByCategory(findingSourcesData.data)
    return Array.from(grouped.entries()).map(([, group]) => ({
      label: group.label,
      sources: group.options,
    }))
  }, [findingSourcesData])

  const { trigger: createFinding, isMutating: isCreating } = useCreateFindingApi()

  const selectedAsset = assets.find((a) => a.id === assetId)

  // Determine which field category to show based on selected asset type
  const assetCategory = useMemo(() => {
    if (!selectedAsset) return null
    const type = selectedAsset.type
    if (CODE_ASSET_TYPES.includes(type)) return 'code'
    if (NETWORK_ASSET_TYPES.includes(type)) return 'network'
    if (CONTAINER_ASSET_TYPES.includes(type)) return 'container'
    if (CLOUD_ASSET_TYPES.includes(type)) return 'cloud'
    return 'other'
  }, [selectedAsset])

  const resetForm = () => {
    setAssetId('')
    setAssetSearch('')
    setSource('manual')
    setSeverity('medium')
    setTitle('')
    setDescription('')
    setToolName('Manual Entry')
    // Code fields
    setFilePath('')
    setStartLine('')
    setEndLine('')
    setSnippet('')
    // Network fields
    setAffectedUrl('')
    // Container fields
    setImageName('')
    // Cloud fields
    setResourceArn('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!assetId) {
      toast.error('Please select an asset')
      return
    }

    if (!title.trim()) {
      toast.error('Please enter a title')
      return
    }

    if (!description.trim()) {
      toast.error('Please enter a description')
      return
    }

    try {
      await createFinding({
        asset_id: assetId,
        source,
        severity,
        message: title,
        tool_name: toolName || 'Manual Entry',
        // Code fields
        file_path: filePath || undefined,
        start_line: startLine ? parseInt(startLine, 10) : undefined,
        end_line: endLine ? parseInt(endLine, 10) : undefined,
        snippet: snippet || undefined,
      })

      toast.success('Finding created successfully')
      await invalidateFindingsCache()
      resetForm()
      onOpenChange(false)
      onSuccess?.()
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to create finding'))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Finding</DialogTitle>
          <DialogDescription>
            Manually create a security finding. Required fields are marked with *.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Asset Selection */}
          <div className="space-y-2">
            <Label htmlFor="asset">Asset *</Label>
            <Popover open={assetPopoverOpen} onOpenChange={setAssetPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={assetPopoverOpen}
                  className="w-full justify-between font-normal"
                >
                  {selectedAsset ? (
                    <span className="truncate">{selectedAsset.name}</span>
                  ) : (
                    <span className="text-muted-foreground">Select an asset...</span>
                  )}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                <Command shouldFilter={false}>
                  <CommandInput
                    placeholder="Search assets..."
                    value={assetSearch}
                    onValueChange={setAssetSearch}
                  />
                  <CommandList>
                    {assetsLoading && (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      </div>
                    )}
                    {!assetsLoading && assets.length === 0 && (
                      <CommandEmpty>No assets found.</CommandEmpty>
                    )}
                    {!assetsLoading && assets.length > 0 && (
                      <CommandGroup>
                        {assets.map((asset) => (
                          <CommandItem
                            key={asset.id}
                            value={asset.id}
                            onSelect={() => {
                              setAssetId(asset.id)
                              setAssetPopoverOpen(false)
                            }}
                          >
                            <Check
                              className={cn(
                                'mr-2 h-4 w-4',
                                assetId === asset.id ? 'opacity-100' : 'opacity-0'
                              )}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="truncate font-medium">{asset.name}</p>
                              <p className="text-xs text-muted-foreground capitalize">
                                {asset.type}
                              </p>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    )}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Source & Severity Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="source">Source *</Label>
              <Select
                value={source}
                onValueChange={(v) => setSource(v as FindingSource)}
                disabled={sourcesLoading}
              >
                <SelectTrigger>
                  {sourcesLoading ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span className="text-muted-foreground">Loading...</span>
                    </div>
                  ) : (
                    <SelectValue />
                  )}
                </SelectTrigger>
                <SelectContent>
                  {sourceGroups.map((group) => (
                    <SelectGroup key={group.label}>
                      <SelectLabel className="text-xs text-muted-foreground">
                        {group.label}
                      </SelectLabel>
                      {group.sources.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="severity">Severity *</Label>
              <Select value={severity} onValueChange={(v) => setSeverity(v as Severity)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SEVERITY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <div className="flex items-center gap-2">
                        <div
                          className={cn('h-2 w-2 rounded-full', opt.bgColor.replace('/20', ''))}
                        />
                        {opt.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              placeholder="e.g., SQL Injection in login form"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              placeholder="Describe the security finding..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          {/* Type-specific fields - shown based on selected asset type */}
          {selectedAsset && (
            <div className="space-y-4 rounded-lg border bg-muted/30 p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                {assetCategory === 'code' && <Code className="h-4 w-4" />}
                {assetCategory === 'network' && <Globe className="h-4 w-4" />}
                {assetCategory === 'container' && <Box className="h-4 w-4" />}
                {assetCategory === 'cloud' && <Cloud className="h-4 w-4" />}
                <span>
                  {assetCategory === 'code' && 'Code Location'}
                  {assetCategory === 'network' && 'Network Details'}
                  {assetCategory === 'container' && 'Container Details'}
                  {assetCategory === 'cloud' && 'Cloud Resource'}
                  {assetCategory === 'other' && 'Location Details'}
                </span>
              </div>

              {/* Code asset fields */}
              {assetCategory === 'code' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="filePath">File Path</Label>
                    <Input
                      id="filePath"
                      placeholder="e.g., src/auth/login.ts"
                      value={filePath}
                      onChange={(e) => setFilePath(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="startLine">Start Line</Label>
                      <Input
                        id="startLine"
                        type="number"
                        placeholder="42"
                        value={startLine}
                        onChange={(e) => setStartLine(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="endLine">End Line</Label>
                      <Input
                        id="endLine"
                        type="number"
                        placeholder="45"
                        value={endLine}
                        onChange={(e) => setEndLine(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="snippet">Code Snippet</Label>
                    <Textarea
                      id="snippet"
                      placeholder="Paste the vulnerable code snippet..."
                      value={snippet}
                      onChange={(e) => setSnippet(e.target.value)}
                      rows={3}
                      className="font-mono text-xs"
                    />
                  </div>
                </>
              )}

              {/* Network asset fields */}
              {assetCategory === 'network' && (
                <div className="space-y-2">
                  <Label htmlFor="affectedUrl">Affected URL/Endpoint</Label>
                  <Input
                    id="affectedUrl"
                    placeholder="e.g., /api/v1/users/login or https://example.com/page"
                    value={affectedUrl}
                    onChange={(e) => setAffectedUrl(e.target.value)}
                  />
                </div>
              )}

              {/* Container asset fields */}
              {assetCategory === 'container' && (
                <div className="space-y-2">
                  <Label htmlFor="imageName">Container Image</Label>
                  <Input
                    id="imageName"
                    placeholder="e.g., nginx:1.21-alpine"
                    value={imageName}
                    onChange={(e) => setImageName(e.target.value)}
                  />
                </div>
              )}

              {/* Cloud asset fields */}
              {assetCategory === 'cloud' && (
                <div className="space-y-2">
                  <Label htmlFor="resourceArn">Resource ARN/ID</Label>
                  <Input
                    id="resourceArn"
                    placeholder="e.g., arn:aws:s3:::my-bucket"
                    value={resourceArn}
                    onChange={(e) => setResourceArn(e.target.value)}
                  />
                </div>
              )}

              {/* Other asset types - generic file path */}
              {assetCategory === 'other' && (
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="filePath">File/Resource Path</Label>
                    <Input
                      id="filePath"
                      placeholder="e.g., /etc/config.yaml"
                      value={filePath}
                      onChange={(e) => setFilePath(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="startLine">Line</Label>
                    <Input
                      id="startLine"
                      type="number"
                      placeholder="42"
                      value={startLine}
                      onChange={(e) => setStartLine(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tool Name */}
          <div className="space-y-2">
            <Label htmlFor="toolName">Tool/Scanner Name</Label>
            <Input
              id="toolName"
              placeholder="e.g., Manual Review"
              value={toolName}
              onChange={(e) => setToolName(e.target.value)}
            />
          </div>

          {/* Info Banner */}
          <div className="flex items-start gap-2 rounded-lg border bg-muted/50 p-3 text-sm">
            <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-muted-foreground">
              The finding will be created with status <strong>New</strong> and can be triaged later.
            </p>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isCreating || !assetId || !title.trim()}>
              {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Finding
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
