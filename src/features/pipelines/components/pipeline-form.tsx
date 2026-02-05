'use client'

import { useState, useEffect } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Plus,
  X,
  Trash2,
  GripVertical,
  Clock,
  Settings,
  Zap,
  Tag,
  Play,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Info,
} from 'lucide-react'
import {
  type PipelineTemplate,
  type CreatePipelineRequest,
  type PipelineTrigger,
  PIPELINE_TRIGGERS,
  PIPELINE_TRIGGER_LABELS,
  PIPELINE_AGENT_PREFERENCES,
  PIPELINE_AGENT_PREFERENCE_LABELS,
  PIPELINE_AGENT_PREFERENCE_DESCRIPTIONS,
  type PipelineTriggerType,
  type PipelineAgentPreference,
} from '@/lib/api'
import { useToolsWithConfig } from '@/lib/api/tool-hooks'
import type { ToolWithConfig } from '@/lib/api/tool-types'

interface StepFormData {
  id: string // Unique ID for drag-and-drop
  step_key: string
  name: string
  description: string
  tool: string
  capabilities: string[]
  timeout_seconds: number
  depends_on: string[]
}

interface TriggerFormData {
  type: PipelineTriggerType
  schedule?: string
}

interface PipelineFormProps {
  pipeline?: PipelineTemplate | null
  onSubmit: (data: CreatePipelineRequest) => Promise<void>
  onCancel: () => void
  isSubmitting?: boolean
}

type WizardStep = 'basics' | 'triggers' | 'steps' | 'settings'

const WIZARD_STEPS: { id: WizardStep; label: string; icon: React.ReactNode }[] = [
  { id: 'basics', label: 'Basics', icon: <Info className="h-4 w-4" /> },
  { id: 'triggers', label: 'Triggers', icon: <Zap className="h-4 w-4" /> },
  { id: 'steps', label: 'Steps', icon: <Play className="h-4 w-4" /> },
  { id: 'settings', label: 'Settings', icon: <Settings className="h-4 w-4" /> },
]

// Generate unique ID
const generateId = () => `step-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

// ============================================
// SORTABLE STEP ITEM COMPONENT
// ============================================

interface SortableStepProps {
  step: StepFormData
  index: number
  stepsCount: number
  errors: Record<string, string>
  tools: ToolWithConfig[]
  toolsLoading: boolean
  onUpdate: (field: keyof StepFormData, value: unknown) => void
  onRemove: () => void
}

function SortableStepItem({
  step,
  index,
  stepsCount,
  errors,
  tools,
  toolsLoading,
  onUpdate,
  onRemove,
}: SortableStepProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: step.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 'auto',
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-lg border bg-muted/30 overflow-hidden ${isDragging ? 'shadow-lg ring-2 ring-primary' : ''}`}
    >
      {/* Step Header */}
      <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 border-b">
        <button
          type="button"
          className="cursor-grab active:cursor-grabbing touch-none p-0.5 rounded hover:bg-muted"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </button>
        <Badge variant="outline" className="text-xs">
          {index + 1}
        </Badge>
        <span className="flex-1 text-sm font-medium truncate">{step.name || 'Untitled'}</span>
        {stepsCount > 1 && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onRemove}
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {/* Step Content */}
      <div className="p-3 space-y-3">
        <div className="grid gap-3 grid-cols-2">
          <div className="space-y-1">
            <Label className="text-xs">Step Key *</Label>
            <Input
              placeholder="scan-assets"
              value={step.step_key}
              onChange={(e) => onUpdate('step_key', e.target.value)}
              className={`h-9 ${errors[`step_${index}_key`] ? 'border-destructive' : ''}`}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Name *</Label>
            <Input
              placeholder="Scan Assets"
              value={step.name}
              onChange={(e) => onUpdate('name', e.target.value)}
              className={`h-9 ${errors[`step_${index}_name`] ? 'border-destructive' : ''}`}
            />
          </div>
        </div>

        <div className="grid gap-3 grid-cols-2">
          <div className="space-y-1">
            <Label className="text-xs">Tool</Label>
            <Select
              value={step.tool || ''}
              onValueChange={(value) => onUpdate('tool', value === '__none__' ? '' : value)}
              disabled={toolsLoading}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder={toolsLoading ? 'Loading tools...' : 'Select a tool'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">
                  <span className="text-muted-foreground">No tool (manual step)</span>
                </SelectItem>
                {tools
                  .filter((t) => t.is_enabled && t.tool.is_active)
                  .map((t) => (
                    <SelectItem key={t.tool.id} value={t.tool.name}>
                      <div className="flex items-center gap-2">
                        <span>{t.tool.display_name || t.tool.name}</span>
                        {t.tool.capabilities && t.tool.capabilities.length > 0 && (
                          <span className="text-[10px] text-muted-foreground">
                            ({t.tool.capabilities.slice(0, 2).join(', ')})
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Timeout (sec)</Label>
            <Input
              type="number"
              min={60}
              max={86400}
              value={step.timeout_seconds}
              onChange={(e) => onUpdate('timeout_seconds', parseInt(e.target.value) || 3600)}
              className="h-9"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export function PipelineForm({ pipeline, onSubmit, onCancel, isSubmitting }: PipelineFormProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>('basics')

  // Fetch tools for selection
  const { data: toolsData, isLoading: toolsLoading } = useToolsWithConfig({ is_active: true, per_page: 100 })

  // Form state
  const [name, setName] = useState(pipeline?.name || '')
  const [description, setDescription] = useState(pipeline?.description || '')
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>(pipeline?.tags || [])
  const [triggers, setTriggers] = useState<TriggerFormData[]>(
    pipeline?.triggers?.length
      ? pipeline.triggers.map((t) => ({ type: t.type, schedule: t.schedule }))
      : [{ type: 'manual' as PipelineTriggerType }]
  )
  const [steps, setSteps] = useState<StepFormData[]>(
    pipeline?.steps?.length
      ? pipeline.steps.map((s) => ({
          id: s.id || generateId(),
          step_key: s.step_key,
          name: s.name,
          description: s.description || '',
          tool: s.tool || '',
          capabilities: s.capabilities || ['scan'],
          timeout_seconds: s.timeout_seconds || 3600,
          depends_on: s.depends_on || [],
        }))
      : [
          {
            id: generateId(),
            step_key: 'step-1',
            name: 'New Step',
            description: '',
            tool: '',
            capabilities: ['scan'],
            timeout_seconds: 3600,
            depends_on: [],
          },
        ]
  )

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      setSteps((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id)
        const newIndex = items.findIndex((item) => item.id === over.id)

        return arrayMove(items, oldIndex, newIndex)
      })
    }
  }
  const [timeoutSeconds, setTimeoutSeconds] = useState(pipeline?.settings?.timeout_seconds || 3600)
  const [maxParallelSteps, setMaxParallelSteps] = useState(
    pipeline?.settings?.max_parallel_steps || 3
  )
  const [agentPreference, setAgentPreference] = useState<PipelineAgentPreference>(
    pipeline?.settings?.agent_preference || 'auto'
  )
  const [notifyOnFailure, setNotifyOnFailure] = useState(
    pipeline?.settings?.notify_on_failure ?? true
  )
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Sync form state when pipeline prop changes (e.g., after fetching full pipeline with steps)
  useEffect(() => {
    console.log('PipelineForm useEffect triggered, pipeline:', pipeline)
    console.log('Pipeline steps:', pipeline?.steps)
    if (pipeline) {
      setName(pipeline.name || '')
      setDescription(pipeline.description || '')
      setTags(pipeline.tags || [])
      setTriggers(
        pipeline.triggers?.length
          ? pipeline.triggers.map((t) => ({ type: t.type, schedule: t.schedule }))
          : [{ type: 'manual' as PipelineTriggerType }]
      )
      const newSteps = pipeline.steps?.length
        ? pipeline.steps.map((s) => ({
            id: s.id || generateId(),
            step_key: s.step_key,
            name: s.name,
            description: s.description || '',
            tool: s.tool || '',
            capabilities: s.capabilities || ['scan'],
            timeout_seconds: s.timeout_seconds || 3600,
            depends_on: s.depends_on || [],
          }))
        : [
            {
              id: generateId(),
              step_key: 'step-1',
              name: 'New Step',
              description: '',
              tool: '',
              capabilities: ['scan'],
              timeout_seconds: 3600,
              depends_on: [],
            },
          ]
      console.log('Setting steps to:', newSteps)
      setSteps(newSteps)
      setTimeoutSeconds(pipeline.settings?.timeout_seconds || 3600)
      setMaxParallelSteps(pipeline.settings?.max_parallel_steps || 3)
      setAgentPreference(pipeline.settings?.agent_preference || 'auto')
      setNotifyOnFailure(pipeline.settings?.notify_on_failure ?? true)
    }
  }, [pipeline])

  const isEditing = !!pipeline
  const currentStepIndex = WIZARD_STEPS.findIndex((s) => s.id === currentStep)
  const isFirstStep = currentStepIndex === 0
  const isLastStep = currentStepIndex === WIZARD_STEPS.length - 1

  const validateStep = (step: WizardStep): boolean => {
    const newErrors: Record<string, string> = {}

    switch (step) {
      case 'basics':
        if (!name.trim()) {
          newErrors.name = 'Name is required'
        }
        break
      case 'steps':
        // Steps are optional - but validate existing steps
        const seenKeys = new Set<string>()
        steps.forEach((s, idx) => {
          if (!s.step_key.trim()) {
            newErrors[`step_${idx}_key`] = 'Step key is required'
          } else if (seenKeys.has(s.step_key)) {
            newErrors[`step_${idx}_key`] = 'Duplicate step key'
          } else {
            seenKeys.add(s.step_key)
          }
          if (!s.name.trim()) {
            newErrors[`step_${idx}_name`] = 'Step name is required'
          }
        })
        break
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (!validateStep(currentStep)) return
    if (!isLastStep) {
      setCurrentStep(WIZARD_STEPS[currentStepIndex + 1].id)
    }
  }

  const handleBack = () => {
    if (!isFirstStep) {
      setCurrentStep(WIZARD_STEPS[currentStepIndex - 1].id)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate all steps
    for (const step of WIZARD_STEPS) {
      if (!validateStep(step.id)) {
        setCurrentStep(step.id)
        return
      }
    }

    const data: CreatePipelineRequest = {
      name,
      description: description || undefined,
      triggers: triggers as PipelineTrigger[],
      steps: steps.map((s, idx) => ({
        step_key: s.step_key,
        name: s.name,
        description: s.description || undefined,
        order: idx + 1,
        tool: s.tool || undefined,
        capabilities: s.capabilities,
        timeout_seconds: s.timeout_seconds,
        depends_on: s.depends_on,
      })),
      tags,
      settings: {
        timeout_seconds: timeoutSeconds,
        max_parallel_steps: maxParallelSteps,
        agent_preference: agentPreference,
        notify_on_failure: notifyOnFailure,
      },
    }

    await onSubmit(data)
  }

  // Tag handlers
  const addTag = () => {
    const tag = tagInput.trim()
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag])
      setTagInput('')
    }
  }

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove))
  }

  // Step handlers
  const addStep = () => {
    setSteps([
      ...steps,
      {
        id: generateId(),
        step_key: `step-${steps.length + 1}`,
        name: `Step ${steps.length + 1}`,
        description: '',
        tool: '',
        capabilities: ['scan'],
        timeout_seconds: 3600,
        depends_on: [],
      },
    ])
  }

  const removeStep = (index: number) => {
    setSteps(steps.filter((_, i) => i !== index))
  }

  const updateStep = (index: number, field: keyof StepFormData, value: unknown) => {
    const updated = [...steps]
    updated[index] = { ...updated[index], [field]: value }
    setSteps(updated)
  }

  // Trigger handlers
  const addTrigger = () => {
    setTriggers([...triggers, { type: 'manual' }])
  }

  const removeTrigger = (index: number) => {
    if (triggers.length > 1) {
      setTriggers(triggers.filter((_, i) => i !== index))
    }
  }

  const updateTrigger = (index: number, field: keyof TriggerFormData, value: unknown) => {
    const updated = [...triggers]
    updated[index] = { ...updated[index], [field]: value }
    setTriggers(updated)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col">
      {/* Tabs Navigation */}
      <Tabs
        value={currentStep}
        onValueChange={(v) => setCurrentStep(v as WizardStep)}
        className="flex flex-col"
      >
        <TabsList className="grid w-full grid-cols-4 mb-4">
          {WIZARD_STEPS.map((step) => (
            <TabsTrigger
              key={step.id}
              value={step.id}
              className="flex items-center gap-2 text-xs sm:text-sm"
            >
              {step.icon}
              <span className="hidden sm:inline">{step.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Step 1: Basics */}
        <TabsContent value="basics" className="space-y-4 mt-0">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">
                Pipeline Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                placeholder="e.g., Daily Security Scan"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={errors.name ? 'border-destructive' : ''}
              />
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Brief description of what this pipeline does..."
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Tags</Label>
              <div className="flex flex-wrap gap-2 min-h-[32px]">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="gap-1 py-1">
                    <Tag className="h-3 w-3" />
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Add a tag and press Enter"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addTag()
                    }
                  }}
                />
                <Button type="button" variant="outline" size="icon" onClick={addTag}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Step 2: Triggers */}
        <TabsContent value="triggers" className="space-y-4 mt-0">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium">Pipeline Triggers</h3>
              <p className="text-xs text-muted-foreground">Define how this pipeline starts</p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addTrigger}>
              <Plus className="mr-2 h-3 w-3" />
              Add
            </Button>
          </div>

          <div className="space-y-3">
            {triggers.map((trigger, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30"
              >
                <div className="flex-1 space-y-3">
                  <Select
                    value={trigger.type}
                    onValueChange={(v) => updateTrigger(index, 'type', v as PipelineTriggerType)}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Select trigger" />
                    </SelectTrigger>
                    <SelectContent>
                      {PIPELINE_TRIGGERS.map((type) => (
                        <SelectItem key={type} value={type}>
                          {PIPELINE_TRIGGER_LABELS[type]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {trigger.type === 'schedule' && (
                    <div className="space-y-1">
                      <Input
                        placeholder="0 0 * * * (cron expression)"
                        value={trigger.schedule || ''}
                        onChange={(e) => updateTrigger(index, 'schedule', e.target.value)}
                        className="h-9 font-mono text-sm"
                      />
                      <p className="text-[10px] text-muted-foreground">
                        Format: minute hour day month weekday
                      </p>
                    </div>
                  )}
                </div>

                {triggers.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeTrigger(index)}
                    className="h-9 w-9 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </TabsContent>

        {/* Step 3: Pipeline Steps */}
        <TabsContent value="steps" className="space-y-4 mt-0">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium">Pipeline Steps</h3>
              <p className="text-xs text-muted-foreground">
                Drag to reorder • Define the execution steps
              </p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addStep}>
              <Plus className="mr-2 h-3 w-3" />
              Add Step
            </Button>
          </div>

          {errors.steps && <p className="text-xs text-destructive">{errors.steps}</p>}

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={steps.map((s) => s.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-3">
                {steps.map((step, index) => (
                  <SortableStepItem
                    key={step.id}
                    step={step}
                    index={index}
                    stepsCount={steps.length}
                    errors={errors}
                    tools={toolsData?.items || []}
                    toolsLoading={toolsLoading}
                    onUpdate={(field, value) => updateStep(index, field, value)}
                    onRemove={() => removeStep(index)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </TabsContent>

        {/* Step 4: Settings */}
        <TabsContent value="settings" className="space-y-4 mt-0">
          <div className="grid gap-4 grid-cols-2">
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4" />
                Timeout (seconds)
              </Label>
              <Input
                type="number"
                min={60}
                max={86400}
                value={timeoutSeconds}
                onChange={(e) => setTimeoutSeconds(parseInt(e.target.value) || 3600)}
              />
              <p className="text-xs text-muted-foreground">Max time for entire pipeline</p>
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Max Parallel Steps</Label>
              <Input
                type="number"
                min={1}
                max={10}
                value={maxParallelSteps}
                onChange={(e) => setMaxParallelSteps(parseInt(e.target.value) || 3)}
              />
              <p className="text-xs text-muted-foreground">Steps running simultaneously</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm">Agent Selection</Label>
            <Select
              value={agentPreference}
              onValueChange={(v) => setAgentPreference(v as PipelineAgentPreference)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select preference" />
              </SelectTrigger>
              <SelectContent>
                {PIPELINE_AGENT_PREFERENCES.map((pref) => (
                  <SelectItem key={pref} value={pref}>
                    {PIPELINE_AGENT_PREFERENCE_LABELS[pref]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {PIPELINE_AGENT_PREFERENCE_DESCRIPTIONS[agentPreference]}
            </p>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label className="text-sm">Notify on Failure</Label>
              <p className="text-xs text-muted-foreground">
                Send alerts when pipeline fails
              </p>
            </div>
            <Switch checked={notifyOnFailure} onCheckedChange={setNotifyOnFailure} />
          </div>
        </TabsContent>
      </Tabs>

      {/* Footer Actions */}
      <div className="flex items-center justify-between pt-4 mt-4 border-t">
        <div>
          {!isFirstStep && (
            <Button type="button" variant="ghost" onClick={handleBack} disabled={isSubmitting}>
              <ChevronLeft className="mr-1 h-4 w-4" />
              Back
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>

          {isLastStep ? (
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : isEditing ? (
                'Update Pipeline'
              ) : (
                'Create Pipeline'
              )}
            </Button>
          ) : (
            <Button type="button" onClick={handleNext}>
              Next
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </form>
  )
}
