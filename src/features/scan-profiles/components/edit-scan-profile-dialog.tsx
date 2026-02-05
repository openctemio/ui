'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
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
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'

import {
  updateScanProfileSchema,
  type UpdateScanProfileFormData,
  INTENSITY_OPTIONS,
  TOOL_OPTIONS,
} from '../schemas/scan-profile-schema'
import { useUpdateScanProfile, invalidateScanProfilesCache } from '@/lib/api/scan-profile-hooks'
import type { ScanProfile, ToolConfig } from '@/lib/api/scan-profile-types'

interface EditScanProfileDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  profile: ScanProfile
  onSuccess?: () => void
}

export function EditScanProfileDialog({
  open,
  onOpenChange,
  profile,
  onSuccess,
}: EditScanProfileDialogProps) {
  const [enabledTools, setEnabledTools] = useState<Record<string, boolean>>({})

  const form = useForm<UpdateScanProfileFormData>({
    resolver: zodResolver(updateScanProfileSchema),
    defaultValues: {
      name: profile.name,
      description: profile.description || '',
      intensity: profile.intensity,
      max_concurrent_scans: profile.max_concurrent_scans,
      timeout_seconds: profile.timeout_seconds,
      tags: profile.tags || [],
    },
  })

  const { trigger: updateProfile, isMutating } = useUpdateScanProfile(profile.id)

  // Initialize enabled tools from profile
  useEffect(() => {
    const tools: Record<string, boolean> = {}
    Object.entries(profile.tools_config || {}).forEach(([tool, config]) => {
      tools[tool] = config.enabled
    })
    setEnabledTools(tools)

    // Reset form when profile changes
    form.reset({
      name: profile.name,
      description: profile.description || '',
      intensity: profile.intensity,
      max_concurrent_scans: profile.max_concurrent_scans,
      timeout_seconds: profile.timeout_seconds,
      tags: profile.tags || [],
    })
  }, [profile, form])

  const handleToolToggle = (toolValue: string, checked: boolean) => {
    setEnabledTools((prev) => ({
      ...prev,
      [toolValue]: checked,
    }))
  }

  const onSubmit = async (data: UpdateScanProfileFormData) => {
    // Build tools config from enabled tools
    const tools_config: Record<string, ToolConfig> = {}
    Object.entries(enabledTools).forEach(([tool, enabled]) => {
      // Preserve existing config or create new
      const existingConfig = profile.tools_config?.[tool]
      tools_config[tool] = {
        enabled,
        severity: existingConfig?.severity || 'medium',
        timeout: existingConfig?.timeout || 300,
        options: existingConfig?.options,
      }
    })

    try {
      await updateProfile({
        ...data,
        tools_config,
      })
      toast.success(`Profile "${data.name || profile.name}" updated`)
      await invalidateScanProfilesCache()
      onOpenChange(false)
      onSuccess?.()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to update profile'))
    }
  }

  const isSystemProfile = profile.is_system

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Scan Profile</DialogTitle>
          <DialogDescription>
            {isSystemProfile
              ? 'System profiles cannot be modified.'
              : 'Update scan configuration and tool settings.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Quick Scan" disabled={isSystemProfile} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Fast scan with basic security checks"
                        className="resize-none"
                        disabled={isSystemProfile}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            {/* Scan Settings */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium">Scan Settings</h4>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="intensity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Intensity</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={isSystemProfile}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select intensity" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {INTENSITY_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              <div>
                                <div>{option.label}</div>
                                <div className="text-xs text-muted-foreground">
                                  {option.description}
                                </div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="timeout_seconds"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Timeout (minutes)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          max={1440}
                          disabled={isSystemProfile}
                          {...field}
                          value={Math.floor((field.value || 3600) / 60)}
                          onChange={(e) => field.onChange(parseInt(e.target.value, 10) * 60)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="max_concurrent_scans"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max Concurrent Scans</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={100}
                        disabled={isSystemProfile}
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value, 10))}
                      />
                    </FormControl>
                    <FormDescription>
                      Maximum number of scans that can run simultaneously
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            {/* Tools Configuration */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium">Tools</h4>
              <p className="text-sm text-muted-foreground">
                Select which tools should be enabled for scans using this profile.
              </p>

              <div className="grid grid-cols-2 gap-3">
                {TOOL_OPTIONS.map((tool) => (
                  <div
                    key={tool.value}
                    className="flex items-start space-x-3 rounded-lg border p-3"
                  >
                    <Checkbox
                      id={`edit-${tool.value}`}
                      checked={enabledTools[tool.value] || false}
                      disabled={isSystemProfile}
                      onCheckedChange={(checked) =>
                        handleToolToggle(tool.value, checked as boolean)
                      }
                    />
                    <div className="grid gap-0.5 leading-none">
                      <Label
                        htmlFor={`edit-${tool.value}`}
                        className="cursor-pointer text-sm font-medium"
                      >
                        {tool.label}
                      </Label>
                      <p className="text-xs text-muted-foreground">{tool.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isMutating}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isMutating || isSystemProfile}>
                {isMutating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
