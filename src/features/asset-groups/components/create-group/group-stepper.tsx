/**
 * Group Wizard Stepper
 *
 * Modern visual step indicator with progress bar for the create group wizard
 * 3-step flow: Basic Info -> Add Assets -> Review
 */

import { cn } from "@/lib/utils";
import { Check, FileText, Package, Eye } from "lucide-react";

export type GroupWizardStep = "basic" | "add-assets" | "review";

interface GroupStepperProps {
  currentStep: GroupWizardStep;
  onStepClick?: (step: GroupWizardStep) => void;
}

const STEPS: { id: GroupWizardStep; label: string; icon: typeof FileText }[] = [
  { id: "basic", label: "Basic Info", icon: FileText },
  { id: "add-assets", label: "Add Assets", icon: Package },
  { id: "review", label: "Review", icon: Eye },
];

export function GroupStepper({ currentStep, onStepClick }: GroupStepperProps) {
  const currentIndex = STEPS.findIndex((s) => s.id === currentStep);

  return (
    <div className="px-6 py-5">
      {/* Progress bar background */}
      <div className="relative">
        {/* Background track */}
        <div className="absolute top-4 left-0 right-0 h-0.5 bg-muted" />

        {/* Progress fill */}
        <div
          className="absolute top-4 left-0 h-0.5 bg-primary transition-all duration-500 ease-out"
          style={{ width: `${(currentIndex / (STEPS.length - 1)) * 100}%` }}
        />

        {/* Steps */}
        <div className="relative flex justify-between">
          {STEPS.map((step, index) => {
            const isCompleted = index < currentIndex;
            const isCurrent = index === currentIndex;
            const isPending = index > currentIndex;
            const StepIcon = step.icon;

            return (
              <button
                key={step.id}
                type="button"
                onClick={() => isCompleted && onStepClick?.(step.id)}
                disabled={!isCompleted}
                className={cn(
                  "flex flex-col items-center gap-2 group",
                  isCompleted && "cursor-pointer"
                )}
              >
                {/* Step circle */}
                <div
                  className={cn(
                    "relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all duration-300",
                    isCompleted && "border-primary bg-primary text-primary-foreground",
                    isCurrent && "border-primary bg-background ring-4 ring-primary/20",
                    isPending && "border-muted bg-background text-muted-foreground"
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <StepIcon className={cn(
                      "h-4 w-4",
                      isCurrent && "text-primary",
                      isPending && "text-muted-foreground"
                    )} />
                  )}
                </div>

                {/* Step label */}
                <span
                  className={cn(
                    "text-xs font-medium transition-colors hidden sm:block",
                    isCompleted && "text-primary group-hover:text-primary/80",
                    isCurrent && "text-foreground",
                    isPending && "text-muted-foreground"
                  )}
                >
                  {step.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
