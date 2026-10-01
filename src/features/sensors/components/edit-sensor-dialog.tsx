'use client'

import { useState, useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Settings } from 'lucide-react'
import { toast } from 'sonner'

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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger, TabsCount } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'

import { ToolSelection, type ToolOption } from './tool-selection'
import {
  updateSensorSchema,
  type UpdateSensorFormData,
  SENSOR_STATUS_OPTIONS,
  SENSOR_EXECUTION_MODE_OPTIONS,
} from '../schemas/sensor-schema'
import { useSensorFormOptions } from '../hooks'
import { useUpdateSensor, invalidateSensorsCache } from '@/lib/api/sensor-hooks'
import type { Sensor } from '@/lib/api/sensor-types'

interface EditSensorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sensor: Sensor
  onSuccess?: () => void
}

export function EditSensorDialog({ open, onOpenChange, sensor, onSuccess }: EditSensorDialogProps) {
  const [selectedTools, setSelectedTools] = useState<string[]>([])

  const {
    toolOptions,
    isLoading: isLoadingOptions,
    error: optionsError,
    getCapabilitiesForTools,
  } = useSensorFormOptions()

  const { trigger: updateSensor, isMutating } = useUpdateSensor(sensor.id)

  const form = useForm<UpdateSensorFormData>({
    resolver: zodResolver(updateSensorSchema),
    defaultValues: {
      name: sensor.name,
      description: sensor.description || '',
      capabilities: sensor.capabilities || [],
      tools: sensor.tools || [],
      execution_mode: sensor.execution_mode,
      status: sensor.status,
    },
  })

  // Convert toolOptions to the format expected by ToolSelection
  const toolSelectionOptions: ToolOption[] = toolOptions.map((t) => ({
    value: t.value,
    label: t.label,
    description: t.description,
    category: t.category,
  }))

  // Reset the form when the dialog opens or another sensor is edited, but not
  // when the same sensor is refetched while open (that would wipe the user's
  // edits). The latest sensor and form are read through a ref so the effect
  // depends only on what should trigger a reset.
  const latest = useRef({ sensor, form })
  useEffect(() => {
    latest.current = { sensor, form }
  })
  const sensorId = sensor.id
  useEffect(() => {
    if (!open) return
    const { sensor: s, form: f } = latest.current
    setSelectedTools(s.tools || [])
    f.reset({
      name: s.name,
      description: s.description || '',
      capabilities: s.capabilities || [],
      tools: s.tools || [],
      execution_mode: s.execution_mode,
      status: s.status,
    })
  }, [open, sensorId])

  const onSubmit = async (data: UpdateSensorFormData) => {
    try {
      const capabilities = getCapabilitiesForTools(selectedTools)

      await updateSensor({
        name: data.name,
        description: data.description,
        capabilities: capabilities as never[],
        tools: selectedTools as never[],
        execution_mode: data.execution_mode,
        status: data.status,
      })

      toast.success(`Sensor "${data.name || sensor.name}" updated successfully`)
      await invalidateSensorsCache()
      onOpenChange(false)
      onSuccess?.()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update sensor')
    }
  }

  const handleClose = () => {
    form.reset()
    setSelectedTools([])
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Edit Sensor
          </DialogTitle>
          <DialogDescription>
            Update configuration for <strong>{sensor.name}</strong>
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="settings">
          <TabsList>
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="tools">
              Tools
              {selectedTools.length > 0 && <TabsCount value={selectedTools.length} />}
            </TabsTrigger>
          </TabsList>

          {/* Settings Tab */}
          <TabsContent value="settings" className="mt-4">
            <Form {...form}>
              <form className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Production Scanner" {...field} />
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
                      <FormLabel>
                        Description{' '}
                        <span className="text-muted-foreground font-normal">(optional)</span>
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="What does this sensor do?"
                          className="resize-none"
                          rows={2}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <div className="grid grid-cols-3 gap-2">
                        {SENSOR_STATUS_OPTIONS.map((option) => (
                          <div
                            key={option.value}
                            onClick={() => field.onChange(option.value)}
                            className={cn(
                              'flex items-center justify-center rounded-lg border-2 p-2.5 cursor-pointer transition-colors text-sm',
                              field.value === option.value
                                ? 'border-primary bg-primary/5 font-medium'
                                : 'border-border hover:border-primary/50'
                            )}
                          >
                            {option.label}
                          </div>
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="execution_mode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Execution Mode</FormLabel>
                      <div className="grid grid-cols-2 gap-3">
                        {SENSOR_EXECUTION_MODE_OPTIONS.map((option) => (
                          <div
                            key={option.value}
                            onClick={() => field.onChange(option.value)}
                            className={cn(
                              'flex flex-col gap-1 rounded-lg border-2 p-3 cursor-pointer transition-colors',
                              field.value === option.value
                                ? 'border-primary bg-primary/5'
                                : 'border-border hover:border-primary/50'
                            )}
                          >
                            <span className="font-medium text-sm">{option.label}</span>
                            <span className="text-xs text-muted-foreground">
                              {option.value === 'standalone'
                                ? 'Runs once per command (CI/CD)'
                                : 'Runs continuously, polling for commands'}
                            </span>
                          </div>
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </form>
            </Form>
          </TabsContent>

          {/* Tools Tab - Isolated component */}
          <TabsContent value="tools" className="mt-4">
            <ToolSelection
              tools={toolSelectionOptions}
              selectedTools={selectedTools}
              onSelectionChange={setSelectedTools}
              isLoading={isLoadingOptions}
              error={optionsError}
            />
          </TabsContent>
        </Tabs>

        <DialogFooter className="gap-3">
          <Button type="button" variant="outline" onClick={handleClose} disabled={isMutating}>
            Cancel
          </Button>
          <Button onClick={form.handleSubmit(onSubmit)} disabled={isMutating}>
            {isMutating && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
