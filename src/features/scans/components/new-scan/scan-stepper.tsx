/**
 * Scan Wizard Stepper
 *
 * Visual step indicator for the new scan wizard
 */

import { cn } from '@/lib/utils'
import { Check } from 'lucide-react'

export type ScanWizardStep = 'basic' | 'targets' | 'options' | 'schedule'

interface ScanStepperProps {
  currentStep: ScanWizardStep
  onStepClick?: (step: ScanWizardStep) => void
}

const STEPS: { id: ScanWizardStep; label: string }[] = [
  { id: 'basic', label: 'Basic Info' },
  { id: 'targets', label: 'Targets' },
  { id: 'options', label: 'Options' },
  { id: 'schedule', label: 'Schedule' },
]

export function ScanStepper({ currentStep, onStepClick }: ScanStepperProps) {
  const currentIndex = STEPS.findIndex((s) => s.id === currentStep)

  return (
    <div className="flex items-center justify-between px-4 sm:px-6 py-3">
      {STEPS.map((step, index) => {
        const isCompleted = index < currentIndex
        const isCurrent = index === currentIndex
        const isPending = index > currentIndex

        return (
          <div key={step.id} className="flex items-center flex-1 last:flex-none">
            {/* Step indicator */}
            <button
              type="button"
              onClick={() => isCompleted && onStepClick?.(step.id)}
              disabled={!isCompleted}
              className={cn(
                'flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap',
                isCompleted && 'bg-primary/10 text-primary hover:bg-primary/20 cursor-pointer',
                isCurrent && 'bg-primary text-primary-foreground',
                isPending && 'text-muted-foreground bg-muted/50'
              )}
            >
              {isCompleted ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <span
                  className={cn(
                    'flex h-4 w-4 items-center justify-center rounded-full text-[10px]',
                    isCurrent && 'bg-primary-foreground/20',
                    isPending && 'bg-muted-foreground/20'
                  )}
                >
                  {index + 1}
                </span>
              )}
              <span>{step.label}</span>
            </button>

            {/* Connector line */}
            {index < STEPS.length - 1 && (
              <div
                className={cn(
                  'flex-1 mx-2 h-0.5 min-w-[12px]',
                  index < currentIndex ? 'bg-primary' : 'bg-muted'
                )}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
