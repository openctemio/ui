'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Bot, Check, ChevronRight, ChevronLeft } from 'lucide-react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

import { OneTimeSecretField } from '@/features/shared'
import { SensorTypeIcon } from './sensor-type-icon'
import { ToolSelection, type ToolOption } from './tool-selection'
import {
  createSensorSchema,
  type CreateSensorFormData,
  SENSOR_TYPE_OPTIONS,
  SENSOR_EXECUTION_MODE_OPTIONS,
} from '../schemas/sensor-schema'
import { useSensorFormOptions } from '../hooks'
import { useCreateSensor, invalidateSensorsCache } from '@/lib/api/sensor-hooks'
import type { SensorType } from '@/lib/api/sensor-types'

interface AddSensorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function AddSensorDialog({ open, onOpenChange, onSuccess }: AddSensorDialogProps) {
  const [step, setStep] = useState<1 | 2>(1)
  const [apiKey, setApiKey] = useState<string | null>(null)
  const [selectedTools, setSelectedTools] = useState<string[]>([])

  const {
    toolOptions,
    isLoading: isLoadingOptions,
    error: optionsError,
    getCapabilitiesForTools,
  } = useSensorFormOptions()

  const { trigger: createSensor, isMutating } = useCreateSensor()

  const form = useForm<CreateSensorFormData>({
    resolver: zodResolver(createSensorSchema),
    defaultValues: {
      name: '',
      type: 'worker', // Default to daemon sensor type
      description: '',
      capabilities: [],
      tools: [],
      execution_mode: 'daemon', // Default to daemon mode
    },
  })

  const watchedName = form.watch('name')
  const watchedType = form.watch('type')
  const canProceedToStep2 = watchedName?.trim().length > 0 && !!watchedType

  // Convert toolOptions to the format expected by ToolSelection
  const toolSelectionOptions: ToolOption[] = toolOptions.map((t) => ({
    value: t.value,
    label: t.label,
    description: t.description,
    category: t.category,
  }))

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (open) {
      setStep(1)
      setApiKey(null)
      setSelectedTools([])
      form.reset()
    }
    // useForm returns the same object on every render, so listing it does not
    // re-run the reset while the dialog is open.
  }, [open, form])

  const handleNextStep = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (canProceedToStep2) {
      setStep(2)
    } else {
      form.trigger(['name', 'type'])
    }
  }

  const onSubmit = async (data: CreateSensorFormData) => {
    try {
      const capabilities = getCapabilitiesForTools(selectedTools)

      const result = await createSensor({
        name: data.name,
        type: data.type,
        description: data.description,
        capabilities: capabilities as never[],
        tools: selectedTools as never[],
        execution_mode: data.execution_mode,
      })

      toast.success(`Sensor "${data.name}" created successfully`)
      await invalidateSensorsCache()

      if (result?.api_key) {
        setApiKey(result.api_key)
      } else {
        form.reset()
        onOpenChange(false)
        onSuccess?.()
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create sensor')
    }
  }

  const handleClose = () => {
    form.reset()
    setStep(1)
    setApiKey(null)
    setSelectedTools([])
    onOpenChange(false)
    if (apiKey) {
      onSuccess?.()
    }
  }

  // Success view - API key display
  if (apiKey) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <Check className="h-5 w-5" />
              Sensor Created Successfully
            </DialogTitle>
            <DialogDescription>
              Save this API key now. You won&apos;t be able to see it again.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-4">
              <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400 mb-2">
                Important: Save your API key
              </p>
              <p className="text-xs text-muted-foreground">
                This API key will only be shown once. Please copy it and store it securely.
              </p>
            </div>

            <OneTimeSecretField label="API key" value={apiKey} />
          </div>

          <DialogFooter>
            <Button onClick={handleClose}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Add Sensor
          </DialogTitle>
          <DialogDescription>
            {step === 1
              ? 'Configure the basic settings for your sensor'
              : 'Select the tools this sensor will use'}
          </DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 py-2">
          <div
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium',
              step === 1 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            )}
          >
            1
          </div>
          <div className="h-px w-8 bg-border" />
          <div
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium',
              step === 2 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            )}
          >
            2
          </div>
        </div>

        {/* Step 1: Basic Info */}
        {step === 1 && (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sensor Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select sensor type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {SENSOR_TYPE_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            <div className="flex items-center gap-2">
                              <SensorTypeIcon
                                type={option.value as SensorType}
                                className="h-4 w-4"
                              />
                              <span>{option.label}</span>
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
        )}

        {/* Step 2: Tool Selection - Isolated component */}
        {step === 2 && (
          <div>
            <ToolSelection
              tools={toolSelectionOptions}
              selectedTools={selectedTools}
              onSelectionChange={setSelectedTools}
              isLoading={isLoadingOptions}
              error={optionsError}
            />
          </div>
        )}

        <DialogFooter className="gap-3">
          {step === 1 ? (
            <>
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="button" onClick={handleNextStep} disabled={!canProceedToStep2}>
                Next
                <ChevronRight className="ms-1 h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(1)}
                disabled={isMutating}
              >
                <ChevronLeft className="me-1 h-4 w-4" />
                Back
              </Button>
              <Button onClick={form.handleSubmit(onSubmit)} disabled={isMutating}>
                {isMutating && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                Create Sensor
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
