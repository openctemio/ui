'use client'

import * as React from 'react'
import { useState } from 'react'
import {
  Loader2,
  Radar,
  Zap,
  ShieldCheck,
  ClipboardCheck,
  Check,
  AlertTriangle,
  ChevronDown,
} from 'lucide-react'
import { toast } from 'sonner'
import { getErrorMessage } from '@/lib/api/error-handler'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'

import {
  useCreateScanProfile,
  useScanProfiles,
  invalidateScanProfilesCache,
} from '@/lib/api/scan-profile-hooks'
import {
  PRESET_PROFILES,
  PRESET_PROFILE_TYPES,
  getPresetProfileRequest,
  type PresetProfileType,
  INTENSITY_DISPLAY_NAMES,
  TOOL_DISPLAY_NAMES,
  type ScanProfileTool,
} from '@/lib/api/scan-profile-types'

interface AddPresetDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const PRESET_ICONS: Record<PresetProfileType, React.ReactNode> = {
  discovery: <Radar className="h-5 w-5" />,
  quick: <Zap className="h-5 w-5" />,
  full: <ShieldCheck className="h-5 w-5" />,
  compliance: <ClipboardCheck className="h-5 w-5" />,
}

const PRESET_COLORS: Record<PresetProfileType, string> = {
  discovery: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
  quick: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30',
  full: 'bg-green-500/10 text-green-500 border-green-500/30',
  compliance: 'bg-purple-500/10 text-purple-500 border-purple-500/30',
}

export function AddPresetDialog({ open, onOpenChange }: AddPresetDialogProps) {
  const [selectedPreset, setSelectedPreset] = useState<PresetProfileType | null>(null)
  const { trigger: createProfile, isMutating } = useCreateScanProfile()
  const { data: existingProfiles } = useScanProfiles({ per_page: 100 })

  // Get existing profile names for duplicate check
  const existingNames = React.useMemo(() => {
    return new Set(existingProfiles?.items?.map((p) => p.name.toLowerCase()) ?? [])
  }, [existingProfiles?.items])

  // Check if selected preset name already exists
  const isDuplicateName = selectedPreset
    ? existingNames.has(PRESET_PROFILES[selectedPreset].name.toLowerCase())
    : false

  const handleCreate = async () => {
    if (!selectedPreset) return

    const presetName = PRESET_PROFILES[selectedPreset].name

    // Check for duplicate name before creating
    if (isDuplicateName) {
      toast.error(
        `A profile named "${presetName}" already exists. Please delete or rename the existing profile first.`
      )
      return
    }

    try {
      const request = getPresetProfileRequest(selectedPreset)
      await createProfile(request)
      toast.success(`Preset profile "${presetName}" created successfully`)
      await invalidateScanProfilesCache()
      onOpenChange(false)
      setSelectedPreset(null)
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to create preset profile'))
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setSelectedPreset(null)
    }
    onOpenChange(newOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add Preset Profile</DialogTitle>
          <DialogDescription>
            Choose a preset profile to quickly create a scan configuration optimized for common use
            cases.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-4 md:grid-cols-2">
          {PRESET_PROFILE_TYPES.map((type) => {
            const preset = PRESET_PROFILES[type]
            const isSelected = selectedPreset === type
            const enabledTools = Object.values(preset.tools_config).filter((t) => t.enabled).length
            const nameExists = existingNames.has(preset.name.toLowerCase())

            return (
              <Card
                key={type}
                className={`cursor-pointer transition-all hover:border-primary ${
                  isSelected ? 'border-primary ring-2 ring-primary/20' : ''
                } ${nameExists ? 'opacity-60' : ''}`}
                onClick={() => setSelectedPreset(type)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className={`rounded-lg p-2 ${PRESET_COLORS[type]}`}>
                      {PRESET_ICONS[type]}
                    </div>
                    {nameExists ? (
                      <div className="flex items-center gap-1 text-amber-500">
                        <AlertTriangle className="h-4 w-4" />
                        <span className="text-[10px]">Exists</span>
                      </div>
                    ) : isSelected ? (
                      <div className="rounded-full bg-primary p-1">
                        <Check className="h-3 w-3 text-primary-foreground" />
                      </div>
                    ) : null}
                  </div>
                  <CardTitle className="text-base">{preset.name}</CardTitle>
                  <CardDescription className="text-xs">{preset.description}</CardDescription>
                </CardHeader>
                <CardContent className="pt-0 space-y-2">
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="outline" className="text-xs">
                      {INTENSITY_DISPLAY_NAMES[preset.intensity]}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {enabledTools} tools
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {Math.floor(preset.timeout_seconds / 60)}m timeout
                    </Badge>
                    {preset.quality_gate.enabled && (
                      <Badge variant="secondary" className="text-xs">
                        Quality Gate
                      </Badge>
                    )}
                  </div>
                  <Collapsible>
                    <CollapsibleTrigger
                      className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ChevronDown className="h-3 w-3 transition-transform duration-200 [&[data-state=open]>svg]:rotate-180" />
                      View tools
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pt-1.5">
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(preset.tools_config)
                          .filter(([, config]) => config.enabled)
                          .map(([tool]) => (
                            <Badge
                              key={tool}
                              variant="outline"
                              className="text-[10px] py-0 px-1.5 font-normal"
                            >
                              {TOOL_DISPLAY_NAMES[tool as ScanProfileTool] || tool}
                            </Badge>
                          ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </CardContent>
              </Card>
            )
          })}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {isDuplicateName && (
            <p className="text-amber-500 text-xs flex items-center gap-1 mr-auto">
              <AlertTriangle className="h-3 w-3" />A profile with this name already exists
            </p>
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!selectedPreset || isMutating || isDuplicateName}
            >
              {isMutating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Profile
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
