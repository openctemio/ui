/**
 * Edit Scan Dialog
 *
 * Multi-step wizard dialog for editing an existing scan configuration.
 * Reuses the same step components as NewScanDialog with pre-populated data.
 */

'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { ChevronLeft, ChevronRight, Loader2, Save } from 'lucide-react'

import { ScanStepper, type ScanWizardStep } from './new-scan/scan-stepper'
import { BasicInfoStep } from './new-scan/basic-info-step'
import { TargetsStep } from './new-scan/targets-step'
import { OptionsStep } from './new-scan/options-step'
import { ScheduleStep } from './new-scan/schedule-step'
import { DEFAULT_NEW_SCAN, type NewScanFormData, type ScheduleFrequency } from '../types'
import { getErrorMessage } from '@/lib/api/error-handler'
import { useUpdateScanConfig, invalidateScanConfigsCache } from '@/lib/api/scan-hooks'
import type {
  ScanConfig,
  UpdateScanConfigRequest,
  ScheduleType,
  AgentPreference,
} from '@/lib/api/scan-types'

interface EditScanDialogProps {
  scanConfig: ScanConfig | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

const STEPS: ScanWizardStep[] = ['basic', 'targets', 'options', 'schedule']

function mapScheduleTypeToFrequency(scheduleType?: string): ScheduleFrequency {
  switch (scheduleType) {
    case 'daily':
      return 'daily'
    case 'weekly':
      return 'weekly'
    case 'monthly':
      return 'monthly'
    default:
      return 'once'
  }
}

function mapScheduleFrequencyToType(frequency: ScheduleFrequency | undefined): ScheduleType {
  switch (frequency) {
    case 'daily':
      return 'daily'
    case 'weekly':
      return 'weekly'
    case 'monthly':
      return 'monthly'
    default:
      return 'manual'
  }
}

/**
 * Convert a ScanConfig from the API into form data for the wizard steps.
 */
function scanConfigToFormData(config: ScanConfig): NewScanFormData {
  const scannerConfig = (config.scanner_config ?? {}) as Record<string, boolean | string>
  const isManual = config.schedule_type === 'manual'

  return {
    name: config.name,
    mode: config.scan_type === 'workflow' ? 'workflow' : 'single',
    type: 'full',
    workflowId: config.pipeline_id,
    agentPreference: config.agent_preference || 'auto',
    targets: {
      type: 'asset_groups',
      assetGroupIds:
        config.asset_group_ids ?? (config.asset_group_id ? [config.asset_group_id] : []),
      assetIds: [],
      assetNames: {},
      customTargets: config.targets ?? [],
    },
    options: {
      portScanning: !!scannerConfig.port_scanning,
      webAppScanning: !!scannerConfig.web_app_scanning,
      sslAnalysis: !!scannerConfig.ssl_analysis,
      bruteForce: !!scannerConfig.brute_force,
      techDetection: !!scannerConfig.tech_detection,
      apiSecurity: !!scannerConfig.api_security,
    },
    intensity: (scannerConfig.intensity as 'low' | 'medium' | 'high') || 'medium',
    maxConcurrent: config.targets_per_job || 10,
    schedule: {
      runImmediately: isManual,
      frequency: mapScheduleTypeToFrequency(config.schedule_type),
      dayOfWeek: config.schedule_day,
      time: config.schedule_time,
    },
    notifications: {
      notifyOnComplete: false,
      autoCreateTasks: false,
    },
  }
}

export function EditScanDialog({ scanConfig, open, onOpenChange, onSuccess }: EditScanDialogProps) {
  const [currentStep, setCurrentStep] = useState<ScanWizardStep>('basic')
  const [formData, setFormData] = useState<NewScanFormData>(DEFAULT_NEW_SCAN)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { trigger: updateScanConfig, isMutating: isUpdating } = useUpdateScanConfig(
    scanConfig?.id ?? ''
  )

  // Pre-populate form when scanConfig changes
  useEffect(() => {
    if (scanConfig && open) {
      setFormData(scanConfigToFormData(scanConfig))
      setCurrentStep('basic')
    }
  }, [scanConfig, open])

  const currentStepIndex = STEPS.indexOf(currentStep)
  const isFirstStep = currentStepIndex === 0
  const isLastStep = currentStepIndex === STEPS.length - 1

  const handleDataChange = (data: Partial<NewScanFormData>) => {
    setFormData((prev) => ({ ...prev, ...data }))
  }

  const validateCurrentStep = (): boolean => {
    switch (currentStep) {
      case 'basic':
        if (!formData.name.trim()) {
          toast.error('Please enter a scan name')
          return false
        }
        if (formData.mode === 'workflow' && !formData.workflowId) {
          toast.error('Please select a workflow')
          return false
        }
        return true
      case 'targets': {
        const { targets } = formData
        const hasAssetGroups = targets.assetGroupIds.length > 0
        const hasIndividualAssets = targets.assetIds.length > 0
        const hasCustomTargets = targets.customTargets.length > 0
        if (!hasAssetGroups && !hasIndividualAssets && !hasCustomTargets) {
          toast.error('Please select at least one target')
          return false
        }
        return true
      }
      default:
        return true
    }
  }

  const handleNext = () => {
    if (!validateCurrentStep()) return
    if (!isLastStep) {
      setCurrentStep(STEPS[currentStepIndex + 1])
    }
  }

  const handleBack = () => {
    if (!isFirstStep) {
      setCurrentStep(STEPS[currentStepIndex - 1])
    }
  }

  const handleStepClick = (step: ScanWizardStep) => {
    const stepIndex = STEPS.indexOf(step)
    if (stepIndex < currentStepIndex) {
      setCurrentStep(step)
    }
  }

  const handleSubmit = async () => {
    if (!validateCurrentStep()) return
    if (!scanConfig) return

    setIsSubmitting(true)
    try {
      const { options, intensity, schedule } = formData
      // Send all scanner options explicitly (including false) so the API
      // knows which options to disable vs enable.
      const scannerConfig: Record<string, unknown> = {
        port_scanning: options.portScanning,
        web_app_scanning: options.webAppScanning,
        ssl_analysis: options.sslAnalysis,
        brute_force: options.bruteForce,
        tech_detection: options.techDetection,
        api_security: options.apiSecurity,
        intensity,
      }

      const scheduleType = schedule.runImmediately
        ? 'manual'
        : mapScheduleFrequencyToType(schedule.frequency)

      const request: UpdateScanConfigRequest = {
        name: formData.name.trim(),
        description: scanConfig?.description || undefined,
        scanner_config: scannerConfig,
        targets_per_job: formData.maxConcurrent || 10,
        schedule_type: scheduleType as ScheduleType,
        agent_preference: formData.agentPreference as AgentPreference,
      }

      if (formData.mode === 'workflow' && formData.workflowId) {
        request.pipeline_id = formData.workflowId
      }
      if (formData.mode === 'single') {
        request.scanner_name = 'nuclei'
      }

      if (!schedule.runImmediately && schedule.frequency !== 'once') {
        if (schedule.time) request.schedule_time = schedule.time
        if (schedule.frequency === 'weekly' && schedule.dayOfWeek !== undefined) {
          request.schedule_day = schedule.dayOfWeek
        }
        if (schedule.frequency === 'monthly') {
          request.schedule_day = 1
        }
      }

      await updateScanConfig(request)

      toast.success(`Scan "${formData.name}" updated successfully`)
      await invalidateScanConfigsCache()
      onSuccess?.()
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to update scan:', error)
      toast.error(getErrorMessage(error, 'Failed to update scan. Please try again.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setCurrentStep('basic')
    onOpenChange(false)
  }

  const renderStep = () => {
    switch (currentStep) {
      case 'basic':
        return <BasicInfoStep data={formData} onChange={handleDataChange} />
      case 'targets':
        return (
          <div>
            <div className="mx-6 mt-4 rounded-md border border-muted bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
              Target changes require creating a new scan configuration. Targets shown here are
              read-only.
            </div>
            <TargetsStep data={formData} onChange={handleDataChange} />
          </div>
        )
      case 'options':
        return <OptionsStep data={formData} onChange={handleDataChange} />
      case 'schedule':
        return <ScheduleStep data={formData} onChange={handleDataChange} />
      default:
        return null
    }
  }

  const isLoading = isSubmitting || isUpdating

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[90vh] overflow-hidden p-0 w-full sm:max-w-[600px]">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle>Edit Scan</DialogTitle>
          <DialogDescription>
            Update the configuration for &quot;{scanConfig?.name}&quot;
          </DialogDescription>
        </DialogHeader>

        {/* Stepper */}
        <div className="border-b">
          <ScanStepper currentStep={currentStep} onStepClick={handleStepClick} />
        </div>

        {/* Step Content */}
        <div className="max-h-[50vh] overflow-y-auto overflow-x-hidden">{renderStep()}</div>

        {/* Footer */}
        <div className="flex flex-col-reverse gap-3 border-t px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex justify-center sm:justify-start">
            {!isFirstStep && (
              <Button
                type="button"
                variant="ghost"
                onClick={handleBack}
                disabled={isLoading}
                className="w-full sm:w-auto"
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                Back
              </Button>
            )}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
              className="w-full sm:w-auto order-2 sm:order-1"
            >
              Cancel
            </Button>

            {isLastStep ? (
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={isLoading}
                className="w-full sm:w-auto order-1 sm:order-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleNext}
                className="w-full sm:w-auto order-1 sm:order-2"
              >
                Next
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
