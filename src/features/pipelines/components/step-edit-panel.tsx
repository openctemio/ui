'use client'

import { useState, useMemo, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Checkbox } from '@/components/ui/checkbox'
import {
  X,
  Trash2,
  Clock,
  Link2,
  Settings2,
  Hash,
  FileText,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PipelineStep } from '@/lib/api'
import type { ToolWithConfig } from '@/lib/api/tool-types'

interface StepEditPanelProps {
  step: PipelineStep
  allSteps: PipelineStep[]
  tools: ToolWithConfig[]
  toolsLoading: boolean
  onSave: (step: PipelineStep) => void
  onDelete: () => void
  onClose: () => void
}

export function StepEditPanel({
  step,
  allSteps,
  tools: _tools,
  toolsLoading: _toolsLoading,
  onSave,
  onDelete,
  onClose,
}: StepEditPanelProps) {
  const [formData, setFormData] = useState({
    step_key: step.step_key,
    description: step.description || '',
    timeout_seconds: step.timeout_seconds || 3600,
    depends_on: step.depends_on || [],
  })

  // Update form when step changes (e.g., user selects different node)
  useEffect(() => {
    setFormData({
      step_key: step.step_key,
      description: step.description || '',
      timeout_seconds: step.timeout_seconds || 3600,
      depends_on: step.depends_on || [],
    })
  }, [step.id, step.step_key, step.description, step.timeout_seconds, step.depends_on])

  // Available steps for depends_on (exclude current step)
  const availableSteps = useMemo(() => {
    return allSteps.filter((s) => s.id !== step.id)
  }, [allSteps, step.id])

  // Auto-save on change
  const handleFieldChange = <K extends keyof typeof formData>(
    field: K,
    value: (typeof formData)[K]
  ) => {
    const newData = { ...formData, [field]: value }
    setFormData(newData)
    // Auto-save
    onSave({
      ...step,
      ...newData,
    })
  }

  const handleDependsOnToggle = (stepKey: string) => {
    const newDeps = formData.depends_on.includes(stepKey)
      ? formData.depends_on.filter((d) => d !== stepKey)
      : [...formData.depends_on, stepKey]
    handleFieldChange('depends_on', newDeps)
  }

  // Format timeout for display
  const formatTimeout = (seconds: number) => {
    if (seconds >= 3600) {
      const hours = Math.floor(seconds / 3600)
      const mins = Math.floor((seconds % 3600) / 60)
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
    }
    if (seconds >= 60) {
      return `${Math.floor(seconds / 60)}m`
    }
    return `${seconds}s`
  }

  return (
    <div className="w-72 bg-background h-full flex flex-col border-l shadow-lg">
      {/* Header */}
      <div className="px-3 py-2.5 border-b flex items-center justify-between shrink-0 bg-muted/30">
        <div className="flex items-center gap-2 min-w-0">
          <Settings2 className="h-4 w-4 text-primary shrink-0" />
          <div className="min-w-0">
            <span className="text-sm font-semibold truncate block">{step.name}</span>
            <span className="text-[10px] text-muted-foreground truncate block">
              {step.tool || 'No scanner'}
            </span>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={onClose}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-4">
          {/* Step Key */}
          <div className="space-y-1.5">
            <Label htmlFor="step_key" className="text-xs font-medium flex items-center gap-1.5">
              <Hash className="h-3 w-3 text-muted-foreground" />
              Step Key
            </Label>
            <Input
              id="step_key"
              value={formData.step_key}
              onChange={(e) => handleFieldChange('step_key', e.target.value)}
              placeholder="unique-step-key"
              className="h-8 text-xs"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="description" className="text-xs font-medium flex items-center gap-1.5">
              <FileText className="h-3 w-3 text-muted-foreground" />
              Description
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleFieldChange('description', e.target.value)}
              placeholder="Optional description..."
              rows={2}
              className="text-xs resize-none"
            />
          </div>

          {/* Timeout */}
          <div className="space-y-1.5">
            <Label htmlFor="timeout" className="text-xs font-medium flex items-center gap-1.5">
              <Clock className="h-3 w-3 text-muted-foreground" />
              Timeout
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="timeout"
                type="number"
                min={60}
                max={86400}
                step={60}
                value={formData.timeout_seconds}
                onChange={(e) =>
                  handleFieldChange('timeout_seconds', parseInt(e.target.value) || 3600)
                }
                className="h-8 text-xs flex-1"
              />
              <Badge variant="secondary" className="text-[10px] px-1.5 shrink-0">
                {formatTimeout(formData.timeout_seconds)}
              </Badge>
            </div>
          </div>

          {/* Dependencies */}
          <div className="space-y-2">
            <Label className="text-xs font-medium flex items-center gap-1.5">
              <Link2 className="h-3 w-3 text-muted-foreground" />
              Dependencies
              {formData.depends_on.length > 0 && (
                <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4 ml-auto">
                  {formData.depends_on.length}
                </Badge>
              )}
            </Label>

            {availableSteps.length === 0 ? (
              <p className="text-[10px] text-muted-foreground italic py-1">
                No other steps to depend on
              </p>
            ) : (
              <div className="space-y-1 max-h-32 overflow-y-auto rounded-md border bg-muted/20 p-1.5">
                {availableSteps.map((s) => (
                  <label
                    key={s.id}
                    className={cn(
                      'flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors text-xs',
                      formData.depends_on.includes(s.step_key)
                        ? 'bg-primary/10 text-primary'
                        : 'hover:bg-muted'
                    )}
                  >
                    <Checkbox
                      checked={formData.depends_on.includes(s.step_key)}
                      onCheckedChange={() => handleDependsOnToggle(s.step_key)}
                      className="h-3.5 w-3.5"
                    />
                    <span className="truncate flex-1">{s.name}</span>
                  </label>
                ))}
              </div>
            )}

            {/* Selected dependencies badges */}
            {formData.depends_on.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {formData.depends_on.map((dep) => {
                  const depStep = allSteps.find((s) => s.step_key === dep)
                  return (
                    <Badge
                      key={dep}
                      variant="outline"
                      className="text-[10px] px-1.5 py-0.5 gap-1 bg-primary/5"
                    >
                      {depStep?.name || dep}
                      <button
                        type="button"
                        onClick={() => handleDependsOnToggle(dep)}
                        className="hover:text-destructive ml-0.5"
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </Badge>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="px-3 py-2 border-t bg-muted/30 shrink-0">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 h-8 text-xs"
          onClick={onDelete}
        >
          <Trash2 className="mr-1.5 h-3.5 w-3.5" />
          Delete Step
        </Button>
      </div>
    </div>
  )
}
