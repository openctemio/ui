/**
 * Basic Info Step
 *
 * Step 1: Scan name and type selection (simplified UI)
 */

'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  Radar,
  GitBranch,
  Clock,
  Layers,
  ChevronRight,
  ChevronDown,
  Sparkles,
  Server,
  Cloud,
} from 'lucide-react'
import { useState } from 'react'
import type { ScanType, ScanMode, AgentPreference, NewScanFormData } from '../../types'
import {
  SCAN_TYPE_CONFIG,
  SCAN_MODE_CONFIG,
  AGENT_PREFERENCE_CONFIG,
  mockWorkflows,
} from '../../types'

interface BasicInfoStepProps {
  data: NewScanFormData
  onChange: (data: Partial<NewScanFormData>) => void
}

const categoryColors: Record<string, string> = {
  recon: 'bg-blue-500/20 text-blue-400',
  vuln: 'bg-orange-500/20 text-orange-400',
  compliance: 'bg-purple-500/20 text-purple-400',
  full: 'bg-green-500/20 text-green-400',
}

export function BasicInfoStep({ data, onChange }: BasicInfoStepProps) {
  const selectedWorkflow = mockWorkflows.find((w) => w.id === data.workflowId)
  const [advancedOpen, setAdvancedOpen] = useState(false)

  return (
    <div className="space-y-5 px-4 sm:px-6 py-4">
      {/* Scan Name */}
      <div className="space-y-2">
        <Label htmlFor="scan-name">
          Scan Name <span className="text-destructive">*</span>
        </Label>
        <Input
          id="scan-name"
          placeholder="e.g., Production Security Scan"
          value={data.name}
          onChange={(e) => onChange({ name: e.target.value })}
        />
      </div>

      {/* Scan Type Selection - Main content for single mode */}
      {data.mode === 'single' && (
        <div className="space-y-3">
          <Label>
            Scan Type <span className="text-destructive">*</span>
          </Label>
          <RadioGroup
            value={data.type}
            onValueChange={(value: ScanType) => onChange({ type: value })}
            className="space-y-2"
          >
            {(Object.keys(SCAN_TYPE_CONFIG) as ScanType[]).map((type) => (
              <div
                key={type}
                className={`flex items-center space-x-3 rounded-lg border p-3 transition-colors cursor-pointer ${
                  data.type === type
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
                onClick={() => onChange({ type })}
              >
                <RadioGroupItem value={type} id={`type-${type}`} />
                <div className="flex-1 min-w-0">
                  <Label htmlFor={`type-${type}`} className="cursor-pointer font-medium">
                    {SCAN_TYPE_CONFIG[type].label}
                  </Label>
                  <p className="text-muted-foreground text-sm">
                    {SCAN_TYPE_CONFIG[type].description}
                  </p>
                </div>
              </div>
            ))}
          </RadioGroup>
        </div>
      )}

      {/* Workflow Scan: Workflow Selection */}
      {data.mode === 'workflow' && (
        <div className="space-y-3">
          <Label>
            Select Workflow <span className="text-destructive">*</span>
          </Label>
          <Select
            value={data.workflowId || ''}
            onValueChange={(value) => onChange({ workflowId: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose a predefined workflow" />
            </SelectTrigger>
            <SelectContent>
              {mockWorkflows.map((workflow) => (
                <SelectItem key={workflow.id} value={workflow.id}>
                  <div className="flex items-center gap-2">
                    <span>{workflow.name}</span>
                    <Badge
                      variant="outline"
                      className={`text-xs ${categoryColors[workflow.category]}`}
                    >
                      {workflow.category}
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Selected Workflow Details */}
          {selectedWorkflow && (
            <div className="rounded-lg border bg-card p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <h4 className="font-medium truncate">{selectedWorkflow.name}</h4>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {selectedWorkflow.description}
                  </p>
                </div>
                <Badge className={`shrink-0 ${categoryColors[selectedWorkflow.category]}`}>
                  {selectedWorkflow.category}
                </Badge>
              </div>

              {/* Estimated Duration */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4 shrink-0" />
                <span>Estimated: {selectedWorkflow.estimatedDuration}</span>
              </div>

              {/* Workflow Steps */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Layers className="h-4 w-4 shrink-0" />
                  <span>Steps ({selectedWorkflow.steps.length})</span>
                </div>
                <div className="rounded-lg bg-muted/50 p-2">
                  <div className="flex flex-wrap items-center gap-1">
                    {selectedWorkflow.steps.map((step, index) => (
                      <div key={step.id} className="flex items-center">
                        <Badge variant="secondary" className="text-xs">
                          {step.order}. {step.tool}
                        </Badge>
                        {index < selectedWorkflow.steps.length - 1 && (
                          <ChevronRight className="h-3 w-3 text-muted-foreground mx-0.5" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Advanced Options - Collapsible */}
      <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
        <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full py-2 border-t">
          <ChevronDown
            className={`h-4 w-4 transition-transform ${advancedOpen ? 'rotate-180' : ''}`}
          />
          <span>Advanced Options</span>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-4 pt-3">
          {/* Scan Mode */}
          <div className="space-y-2">
            <Label className="text-sm">Scan Mode</Label>
            <RadioGroup
              value={data.mode}
              onValueChange={(value: ScanMode) =>
                onChange({
                  mode: value,
                  workflowId: value === 'single' ? undefined : data.workflowId,
                })
              }
              className="flex flex-wrap gap-3"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="single" id="mode-single" />
                <Label htmlFor="mode-single" className="cursor-pointer text-sm font-normal">
                  <span className="flex items-center gap-1.5">
                    <Radar className="h-3.5 w-3.5" />
                    {SCAN_MODE_CONFIG.single.label}
                  </span>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="workflow" id="mode-workflow" />
                <Label htmlFor="mode-workflow" className="cursor-pointer text-sm font-normal">
                  <span className="flex items-center gap-1.5">
                    <GitBranch className="h-3.5 w-3.5" />
                    {SCAN_MODE_CONFIG.workflow.label}
                  </span>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Agent Preference - Compact */}
          <div className="space-y-2">
            <Label className="text-sm">Agent Preference</Label>
            <RadioGroup
              value={data.agentPreference}
              onValueChange={(value: AgentPreference) => onChange({ agentPreference: value })}
              className="flex flex-wrap gap-3"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="auto" id="agent-auto" />
                <Label htmlFor="agent-auto" className="cursor-pointer text-sm font-normal">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" />
                    {AGENT_PREFERENCE_CONFIG.auto.label}
                  </span>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="tenant" id="agent-tenant" />
                <Label htmlFor="agent-tenant" className="cursor-pointer text-sm font-normal">
                  <span className="flex items-center gap-1.5">
                    <Server className="h-3.5 w-3.5" />
                    {AGENT_PREFERENCE_CONFIG.tenant.label}
                  </span>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="platform" id="agent-platform" />
                <Label htmlFor="agent-platform" className="cursor-pointer text-sm font-normal">
                  <span className="flex items-center gap-1.5">
                    <Cloud className="h-3.5 w-3.5" />
                    {AGENT_PREFERENCE_CONFIG.platform.label}
                  </span>
                </Label>
              </div>
            </RadioGroup>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}
