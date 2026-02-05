'use client'

import { useState } from 'react'
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
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'

import {
  createScanProfileSchema,
  type CreateScanProfileFormData,
  INTENSITY_OPTIONS,
  TOOL_OPTIONS,
} from '../schemas/scan-profile-schema'
import { useCreateScanProfile, invalidateScanProfilesCache } from '@/lib/api/scan-profile-hooks'
import type { ToolConfig } from '@/lib/api/scan-profile-types'

interface AddScanProfileDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function AddScanProfileDialog({ open, onOpenChange, onSuccess }: AddScanProfileDialogProps) {
  const [enabledTools, setEnabledTools] = useState<Record<string, boolean>>({})

  const form = useForm<CreateScanProfileFormData>({
    resolver: zodResolver(createScanProfileSchema),
    defaultValues: {
      name: '',
      description: '',
      intensity: 'medium',
      max_concurrent_scans: 5,
      timeout_seconds: 3600,
      is_default: false,
      tags: [],
    },
  })

  const { trigger: createProfile, isMutating } = useCreateScanProfile()

  const handleToolToggle = (toolValue: string, checked: boolean) => {
    setEnabledTools((prev) => ({
      ...prev,
      [toolValue]: checked,
    }))
  }

  const onSubmit = async (data: CreateScanProfileFormData) => {
    // Build tools config from enabled tools
    const tools_config: Record<string, ToolConfig> = {}
    Object.entries(enabledTools).forEach(([tool, enabled]) => {
      if (enabled) {
        tools_config[tool] = {
          enabled: true,
          severity: 'medium',
          timeout: 300,
        }
      }
    })

    try {
      await createProfile({
        ...data,
        tools_config,
      })
      toast.success(`Profile "${data.name}" created`)
      await invalidateScanProfilesCache()
      form.reset()
      setEnabledTools({})
      onOpenChange(false)
      onSuccess?.()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to create profile'))
    }
  }

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      form.reset()
      setEnabledTools({})
    }
    onOpenChange(isOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Scan Profile</DialogTitle>
          <DialogDescription>
            Create a reusable scan configuration with tool settings.
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
                      <Input placeholder="Quick Scan" {...field} />
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
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                          {...field}
                          value={Math.floor(field.value / 60)}
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
                      id={tool.value}
                      checked={enabledTools[tool.value] || false}
                      onCheckedChange={(checked) =>
                        handleToolToggle(tool.value, checked as boolean)
                      }
                    />
                    <div className="grid gap-0.5 leading-none">
                      <Label htmlFor={tool.value} className="cursor-pointer text-sm font-medium">
                        {tool.label}
                      </Label>
                      <p className="text-xs text-muted-foreground">{tool.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Options */}
            <FormField
              control={form.control}
              name="is_default"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Set as Default</FormLabel>
                    <FormDescription>Use this profile as the default for new scans</FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleClose(false)}
                disabled={isMutating}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isMutating}>
                {isMutating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Profile
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
