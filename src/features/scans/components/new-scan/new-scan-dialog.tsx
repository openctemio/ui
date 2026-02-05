/**
 * New Scan Dialog
 *
 * Multi-step wizard dialog for creating new scans.
 * Connects to the scan configuration API to create and optionally trigger scans.
 */

'use client'

import { useState, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { ChevronLeft, ChevronRight, Loader2, Play } from 'lucide-react'

import { ScanStepper, type ScanWizardStep } from './scan-stepper'
import { BasicInfoStep } from './basic-info-step'
import { TargetsStep } from './targets-step'
import { OptionsStep } from './options-step'
import { ScheduleStep } from './schedule-step'
import { DEFAULT_NEW_SCAN, type NewScanFormData, type ScheduleFrequency } from '../../types'
import { getErrorMessage } from '@/lib/api/error-handler'
import { useCreateScanConfig, invalidateScanConfigsCache } from '@/lib/api/scan-hooks'
import type {
  CreateScanConfigRequest,
  ScheduleType,
  AgentPreference,
  ScanType,
} from '@/lib/api/scan-types'

interface NewScanDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit?: (data: NewScanFormData) => void
}

const STEPS: ScanWizardStep[] = ['basic', 'targets', 'options', 'schedule']

/**
 * Map form schedule frequency to API schedule type
 */
function mapScheduleFrequency(frequency: ScheduleFrequency | undefined): ScheduleType {
  switch (frequency) {
    case 'once':
      return 'manual'
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
 * Map form agent preference to API agent preference
 */
function mapAgentPreference(preference: string): AgentPreference {
  switch (preference) {
    case 'auto':
      return 'auto'
    case 'tenant':
      return 'tenant'
    case 'platform':
      return 'platform'
    default:
      return 'auto'
  }
}

/**
 * Map form data to API request format
 * Combines all target sources (asset groups, individual assets, custom targets)
 */
function mapFormDataToRequest(formData: NewScanFormData): CreateScanConfigRequest {
  const { targets, schedule, options, intensity } = formData

  // Build scanner config from options
  const scannerConfig: Record<string, unknown> = {}
  if (options.portScanning) scannerConfig.port_scanning = true
  if (options.webAppScanning) scannerConfig.web_app_scanning = true
  if (options.sslAnalysis) scannerConfig.ssl_analysis = true
  if (options.bruteForce) scannerConfig.brute_force = true
  if (options.techDetection) scannerConfig.tech_detection = true
  if (options.apiSecurity) scannerConfig.api_security = true
  scannerConfig.intensity = intensity

  // Determine scan type and related fields
  const scanType: ScanType = formData.mode === 'workflow' ? 'workflow' : 'single'
  const scheduleType = schedule.runImmediately ? 'manual' : mapScheduleFrequency(schedule.frequency)

  const request: CreateScanConfigRequest = {
    name: formData.name.trim(),
    description: `Security scan created via UI - ${formData.type}`,
    scan_type: scanType,
    schedule_type: scheduleType,
    agent_preference: mapAgentPreference(formData.agentPreference),
    targets_per_job: formData.maxConcurrent || 10,
    scanner_config: scannerConfig,
  }

  // COMBINE all target sources
  // 1. Asset groups - pass all selected ones
  if (targets.assetGroupIds.length > 0) {
    // Pass all asset group IDs to the API
    request.asset_group_ids = targets.assetGroupIds
    // Also set asset_group_id for backward compatibility with older API versions
    request.asset_group_id = targets.assetGroupIds[0]
  }

  // 2. Combine individual assets and custom targets into targets array
  const allTargets: string[] = []

  // Individual assets - convert asset names to targets
  if (targets.assetIds.length > 0 && targets.assetNames) {
    for (const assetId of targets.assetIds) {
      const assetName = targets.assetNames[assetId]
      if (assetName) {
        allTargets.push(assetName)
      }
    }
  }

  // Custom targets - add directly
  if (targets.customTargets.length > 0) {
    allTargets.push(...targets.customTargets)
  }

  // If we have explicit targets, add to request
  if (allTargets.length > 0) {
    request.targets = allTargets
  }

  // Add pipeline_id if workflow mode
  if (formData.mode === 'workflow' && formData.workflowId) {
    request.pipeline_id = formData.workflowId
  }

  // Add scanner name for single scan mode
  if (formData.mode === 'single') {
    // Default scanner based on scan type
    request.scanner_name = formData.type === 'full' ? 'nuclei' : 'nuclei'
  }

  // Add schedule details if not manual
  if (!schedule.runImmediately && schedule.frequency !== 'once') {
    if (schedule.time) {
      request.schedule_time = schedule.time
    }
    if (schedule.frequency === 'weekly' && schedule.dayOfWeek !== undefined) {
      request.schedule_day = schedule.dayOfWeek
    }
    if (schedule.frequency === 'monthly') {
      request.schedule_day = 1 // First of month
    }
  }

  return request
}

export function NewScanDialog({ open, onOpenChange, onSubmit }: NewScanDialogProps) {
  const [currentStep, setCurrentStep] = useState<ScanWizardStep>('basic')
  const [formData, setFormData] = useState<NewScanFormData>(DEFAULT_NEW_SCAN)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Store created scan config ID for triggering
  const createdConfigIdRef = useRef<string | null>(null)

  // API hooks
  const { trigger: createScanConfig, isMutating: isCreating } = useCreateScanConfig()

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
      case 'targets':
        // NEW: Check if at least ONE target source has data (can have all)
        const { targets } = formData
        const hasAssetGroups = targets.assetGroupIds.length > 0
        const hasIndividualAssets = targets.assetIds.length > 0
        const hasCustomTargets = targets.customTargets.length > 0

        if (!hasAssetGroups && !hasIndividualAssets && !hasCustomTargets) {
          toast.error(
            'Please select at least one target (asset group, individual asset, or custom target)'
          )
          return false
        }
        return true
      case 'options':
        return true
      case 'schedule':
        return true
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

    // Additional validation: ensure we have at least one target source
    const { targets } = formData
    const hasAssetGroups = targets.assetGroupIds.length > 0
    const hasIndividualAssets = targets.assetIds.length > 0
    const hasCustomTargets = targets.customTargets.length > 0

    if (!hasAssetGroups && !hasIndividualAssets && !hasCustomTargets) {
      toast.error('Please select at least one target')
      return
    }

    setIsSubmitting(true)
    try {
      // Map form data to API request format
      const request = mapFormDataToRequest(formData)

      // Validate the mapped request has targets
      // This can happen if asset IDs couldn't be resolved to names
      const requestHasAssetGroups = request.asset_group_ids && request.asset_group_ids.length > 0
      const requestHasTargets = request.targets && request.targets.length > 0
      if (!requestHasAssetGroups && !requestHasTargets) {
        toast.error('Unable to resolve selected assets. Please try selecting them again.')
        return
      }

      // Create the scan configuration
      const scanConfig = await createScanConfig(request)

      if (!scanConfig) {
        throw new Error('Failed to create scan configuration')
      }

      createdConfigIdRef.current = scanConfig.id

      // Trigger scan immediately if requested
      if (formData.schedule.runImmediately) {
        // Import trigger function dynamically to avoid hook rules issue
        const { post } = await import('@/lib/api/client')
        const { scanEndpoints } = await import('@/lib/api/endpoints')

        try {
          await post(scanEndpoints.trigger(scanConfig.id), {})
          toast.success(`Scan "${formData.name}" started successfully`)
        } catch (triggerError) {
          // Scan config was created but trigger failed - show specific error
          const triggerErrorMsg = getErrorMessage(triggerError, 'Unknown error')
          console.error('Failed to trigger scan:', triggerError)

          // Show a persistent error toast with action buttons
          toast.error(
            `Scan "${formData.name}" was created but failed to start: ${triggerErrorMsg}`,
            {
              duration: 10000, // Keep visible for 10 seconds
              action: {
                label: 'View Scan',
                onClick: () => {
                  // Navigate to the scan detail page
                  window.location.href = `/scans/${scanConfig.id}`
                },
              },
              description: 'You can manually trigger the scan from the scan details page.',
            }
          )

          // Still close dialog and refresh - the scan was created successfully
          await invalidateScanConfigsCache()
          onSubmit?.(formData)
          setFormData(DEFAULT_NEW_SCAN)
          setCurrentStep('basic')
          createdConfigIdRef.current = null
          onOpenChange(false)
          return
        }
      } else {
        toast.success(`Scan "${formData.name}" scheduled successfully`)
      }

      // Invalidate caches to refresh lists
      await invalidateScanConfigsCache()

      // Call optional callback
      onSubmit?.(formData)

      // Reset and close
      setFormData(DEFAULT_NEW_SCAN)
      setCurrentStep('basic')
      createdConfigIdRef.current = null
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to create scan:', error)
      toast.error(getErrorMessage(error, 'Failed to create scan. Please try again.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setFormData(DEFAULT_NEW_SCAN)
    setCurrentStep('basic')
    createdConfigIdRef.current = null
    onOpenChange(false)
  }

  const renderStep = () => {
    switch (currentStep) {
      case 'basic':
        return <BasicInfoStep data={formData} onChange={handleDataChange} />
      case 'targets':
        return <TargetsStep data={formData} onChange={handleDataChange} />
      case 'options':
        return <OptionsStep data={formData} onChange={handleDataChange} />
      case 'schedule':
        return <ScheduleStep data={formData} onChange={handleDataChange} />
      default:
        return null
    }
  }

  const isLoading = isSubmitting || isCreating

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[90vh] overflow-hidden p-0 w-full sm:max-w-[600px]">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle>New Scan</DialogTitle>
          <DialogDescription>Configure and launch a new security scan</DialogDescription>
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
                    {formData.schedule.runImmediately ? 'Starting...' : 'Scheduling...'}
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    {formData.schedule.runImmediately ? 'Start Scan' : 'Schedule Scan'}
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
