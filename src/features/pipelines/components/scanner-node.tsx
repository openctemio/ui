'use client'

import { memo, useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react'
import { Radar, Play, Flag, Clock, Link2, AlertTriangle } from 'lucide-react'
import { cn, slugify } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CapabilityBadgeList } from '@/components/capability-badge'

// =============================================================================
// UTILITIES
// =============================================================================

/**
 * Format timeout seconds to human readable
 */
function formatTimeout(seconds: number): string {
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

// =============================================================================
// SCANNER NODE - Main pipeline step node with full inline editing
// =============================================================================

export type ScannerNodeData = {
  label: string
  description?: string
  tool?: string
  toolDisplayName?: string
  capabilities?: string[]
  stepKey?: string
  timeout?: number
  dependsOn?: string[]
  // Category info from tool
  categoryIcon?: string
  categoryColor?: string
  // Validation state - steps without tool AND without capabilities are invalid
  isValid?: boolean
  validationMessage?: string
  // Available tools for selection (with capabilities for auto-setting)
  availableTools?: Array<{ name: string; displayName: string; capabilities?: string[] }>
  // Available steps for dependencies (other steps in the pipeline)
  availableSteps?: Array<{ stepKey: string; name: string }>
  // Callbacks for inline editing
  onLabelChange?: (label: string) => void
  onToolChange?: (tool: string) => void
  onDescriptionChange?: (description: string) => void
  onStepKeyChange?: (stepKey: string) => void
  onTimeoutChange?: (timeout: number) => void
}

export type ScannerNode = Node<ScannerNodeData, 'scanner'>

// Map category colors to Tailwind classes
const COLOR_MAP: Record<string, { bg: string; border: string; iconBg: string }> = {
  blue: {
    bg: 'bg-white dark:bg-slate-900',
    border: 'border-slate-200 dark:border-slate-700',
    iconBg: 'bg-blue-100 dark:bg-blue-900/30',
  },
  purple: {
    bg: 'bg-white dark:bg-slate-900',
    border: 'border-slate-200 dark:border-slate-700',
    iconBg: 'bg-purple-100 dark:bg-purple-900/30',
  },
  green: {
    bg: 'bg-white dark:bg-slate-900',
    border: 'border-slate-200 dark:border-slate-700',
    iconBg: 'bg-green-100 dark:bg-green-900/30',
  },
  red: {
    bg: 'bg-white dark:bg-slate-900',
    border: 'border-slate-200 dark:border-slate-700',
    iconBg: 'bg-red-100 dark:bg-red-900/30',
  },
  orange: {
    bg: 'bg-white dark:bg-slate-900',
    border: 'border-slate-200 dark:border-slate-700',
    iconBg: 'bg-orange-100 dark:bg-orange-900/30',
  },
  cyan: {
    bg: 'bg-white dark:bg-slate-900',
    border: 'border-slate-200 dark:border-slate-700',
    iconBg: 'bg-cyan-100 dark:bg-cyan-900/30',
  },
  yellow: {
    bg: 'bg-white dark:bg-slate-900',
    border: 'border-slate-200 dark:border-slate-700',
    iconBg: 'bg-yellow-100 dark:bg-yellow-900/30',
  },
  pink: {
    bg: 'bg-white dark:bg-slate-900',
    border: 'border-slate-200 dark:border-slate-700',
    iconBg: 'bg-pink-100 dark:bg-pink-900/30',
  },
  indigo: {
    bg: 'bg-white dark:bg-slate-900',
    border: 'border-slate-200 dark:border-slate-700',
    iconBg: 'bg-indigo-100 dark:bg-indigo-900/30',
  },
  violet: {
    bg: 'bg-white dark:bg-slate-900',
    border: 'border-slate-200 dark:border-slate-700',
    iconBg: 'bg-violet-100 dark:bg-violet-900/30',
  },
  emerald: {
    bg: 'bg-white dark:bg-slate-900',
    border: 'border-slate-200 dark:border-slate-700',
    iconBg: 'bg-emerald-100 dark:bg-emerald-900/30',
  },
  amber: {
    bg: 'bg-white dark:bg-slate-900',
    border: 'border-slate-200 dark:border-slate-700',
    iconBg: 'bg-amber-100 dark:bg-amber-900/30',
  },
  slate: {
    bg: 'bg-white dark:bg-slate-900',
    border: 'border-slate-200 dark:border-slate-700',
    iconBg: 'bg-slate-100 dark:bg-slate-800',
  },
}

const DEFAULT_COLORS = COLOR_MAP.slate

function getColorsForCategory(categoryColor?: string) {
  if (categoryColor && COLOR_MAP[categoryColor]) {
    return COLOR_MAP[categoryColor]
  }
  return DEFAULT_COLORS
}

function ScannerNodeComponent({ data, selected }: NodeProps<ScannerNode>) {
  const colors = getColorsForCategory(data.categoryColor)

  // Validation: step must have either a tool or capabilities
  // If isValid is explicitly set, use it; otherwise calculate based on tool/capabilities
  const hasToolOrCapabilities = !!(data.tool || (data.capabilities && data.capabilities.length > 0))
  const isValid = data.isValid !== undefined ? data.isValid : hasToolOrCapabilities
  const validationMessage =
    data.validationMessage ||
    (!hasToolOrCapabilities ? 'Step requires a scanner or capabilities' : '')

  // Local state for controlled inputs
  const [localLabel, setLocalLabel] = useState(data.label)
  const [localDescription, setLocalDescription] = useState(data.description || '')
  const [localTimeout, setLocalTimeout] = useState(data.timeout || 3600)
  const [localStepKey, setLocalStepKey] = useState(data.stepKey || '')
  const [localCapabilities, setLocalCapabilities] = useState<string[]>(data.capabilities || [])
  const [showDescription, setShowDescription] = useState(!!data.description)

  // Track if step key was manually edited
  const stepKeyManualRef = useRef(false)

  // Sync local state when data changes from outside
  useEffect(() => {
    setLocalLabel(data.label)
  }, [data.label])

  useEffect(() => {
    setLocalDescription(data.description || '')
    setShowDescription(!!data.description)
  }, [data.description])

  useEffect(() => {
    setLocalTimeout(data.timeout || 3600)
  }, [data.timeout])

  useEffect(() => {
    setLocalStepKey(data.stepKey || '')
  }, [data.stepKey])

  // Sync capabilities when data changes (e.g., when tool is changed)
  // Use JSON.stringify to detect array content changes (not just reference)
  const capabilitiesJson = JSON.stringify(data.capabilities || [])
  useEffect(() => {
    setLocalCapabilities(data.capabilities || [])
  }, [capabilitiesJson, data.capabilities])

  // Handle label change with auto step key generation
  const handleLabelChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newLabel = e.target.value
      setLocalLabel(newLabel)
      data.onLabelChange?.(newLabel)

      // Auto-generate step key if not manually edited
      if (!stepKeyManualRef.current) {
        const newKey = slugify(newLabel)
        setLocalStepKey(newKey)
        data.onStepKeyChange?.(newKey)
      }
    },
    [data]
  )

  const handleStepKeyChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      stepKeyManualRef.current = true
      const newKey = e.target.value
      setLocalStepKey(newKey)
      data.onStepKeyChange?.(newKey)
    },
    [data]
  )

  const handleToolChange = useCallback(
    (value: string) => {
      const toolName = value === '__none__' ? '' : value
      data.onToolChange?.(toolName)
    },
    [data]
  )

  const handleDescriptionChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newDesc = e.target.value
      setLocalDescription(newDesc)
      data.onDescriptionChange?.(newDesc)
    },
    [data]
  )

  const handleTimeoutChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newTimeout = parseInt(e.target.value) || 3600
      setLocalTimeout(newTimeout)
      data.onTimeoutChange?.(newTimeout)
    },
    [data]
  )

  // Get display names for dependencies (read-only, managed via drag-drop arrows)
  const dependencyLabels = useMemo(() => {
    return (data.dependsOn || []).map((key) => {
      const step = data.availableSteps?.find((s) => s.stepKey === key)
      return step?.name || key
    })
  }, [data.dependsOn, data.availableSteps])

  return (
    <div
      className={cn(
        'rounded-xl shadow-sm border w-[280px] overflow-hidden transition-all',
        colors.bg,
        // Show red border when invalid
        !isValid ? 'border-red-500 dark:border-red-400' : colors.border,
        selected ? 'shadow-lg ring-2 ring-primary ring-offset-2' : 'hover:shadow-md'
      )}
    >
      {/* Target Handle */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-2.5 !h-2.5 !bg-slate-400 !border-2 !border-white dark:!border-slate-800 !-left-1"
      />

      {/* Header with icon and name */}
      <div
        className={cn(
          'px-3 py-2 border-b',
          !isValid
            ? 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20'
            : 'border-slate-100 dark:border-slate-800'
        )}
      >
        <div className="flex items-center gap-2">
          <div
            className={cn(
              'h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0',
              !isValid ? 'bg-red-100 dark:bg-red-900/30' : colors.iconBg
            )}
          >
            {!isValid ? (
              <AlertTriangle className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
            ) : (
              <Radar className="h-3.5 w-3.5 text-slate-600 dark:text-slate-400" />
            )}
          </div>
          <Input
            value={localLabel}
            onChange={handleLabelChange}
            className="h-7 px-1.5 text-sm font-medium border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 p-0"
            placeholder="Step name"
          />
        </div>
      </div>

      {/* Body with inline form */}
      <div className="px-3 py-2 space-y-2">
        {/* Step Key (auto-generated) */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-muted-foreground w-12 shrink-0">Key:</span>
          <Input
            value={localStepKey}
            onChange={handleStepKeyChange}
            className="h-5 px-1 text-[10px] font-mono border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50 focus-visible:ring-0"
            placeholder="step-key"
          />
        </div>

        {/* Tool Selector */}
        <Select value={data.tool || '__none__'} onValueChange={handleToolChange}>
          <SelectTrigger
            className={cn(
              'h-7 text-xs bg-slate-50 dark:bg-slate-800',
              !isValid
                ? 'border-red-500 dark:border-red-400'
                : 'border-slate-200 dark:border-slate-700'
            )}
          >
            <SelectValue placeholder="Select scanner">
              {data.toolDisplayName || data.tool || 'No scanner'}
            </SelectValue>
          </SelectTrigger>
          <SelectContent position="popper" className="max-h-60">
            <SelectItem value="__none__">
              <span className="text-muted-foreground">No scanner</span>
            </SelectItem>
            {data.availableTools?.map((tool) => (
              <SelectItem key={tool.name} value={tool.name}>
                {tool.displayName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Validation Warning */}
        {!isValid && validationMessage && (
          <div className="flex items-center gap-1.5 text-[10px] text-red-600 dark:text-red-400">
            <AlertTriangle className="h-3 w-3 shrink-0" />
            <span>{validationMessage}</span>
          </div>
        )}

        {/* Timeout */}
        <div className="flex items-center gap-1.5">
          <Clock className="h-3 w-3 text-muted-foreground shrink-0" />
          <Input
            type="number"
            min={60}
            max={86400}
            step={60}
            value={localTimeout}
            onChange={handleTimeoutChange}
            className="h-6 px-1.5 text-xs flex-1 border-slate-200 dark:border-slate-700"
          />
          <Badge variant="secondary" className="text-[9px] px-1 py-0 shrink-0">
            {formatTimeout(localTimeout)}
          </Badge>
        </div>

        {/* Capabilities (read-only, derived from selected tool) */}
        {localCapabilities.length > 0 && (
          <CapabilityBadgeList capabilities={localCapabilities} size="sm" />
        )}

        {/* Dependencies (read-only, managed via drag-drop arrows) */}
        {dependencyLabels.length > 0 && (
          <div className="flex flex-wrap gap-1 items-center">
            <Link2 className="h-3 w-3 text-muted-foreground shrink-0" />
            {dependencyLabels.map((label, i) => (
              <Badge
                key={data.dependsOn?.[i] || i}
                variant="outline"
                className="text-[9px] px-1 py-0 bg-blue-500/10 border-blue-500/30"
              >
                {label}
              </Badge>
            ))}
          </div>
        )}

        {/* Description toggle and textarea */}
        {!showDescription ? (
          <button
            type="button"
            onClick={() => setShowDescription(true)}
            className="text-[10px] text-muted-foreground hover:text-foreground"
          >
            + Add description
          </button>
        ) : (
          <Textarea
            value={localDescription}
            onChange={handleDescriptionChange}
            placeholder="Optional description..."
            rows={2}
            className="text-xs resize-none border-slate-200 dark:border-slate-700"
          />
        )}
      </div>

      {/* Source Handle */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-2.5 !h-2.5 !bg-slate-400 !border-2 !border-white dark:!border-slate-800 !-right-1"
      />
    </div>
  )
}

// Note: Not using memo() here because ReactFlow's internal caching can prevent
// re-renders when node data changes (e.g., when tool/capabilities are updated inline).
// The component uses local state synced via useEffect to handle data updates.
export const ScannerNode = ScannerNodeComponent

// =============================================================================
// START NODE - Entry point of the pipeline
// =============================================================================

export type StartNodeData = {
  label?: string
}

export type StartNode = Node<StartNodeData, 'start'>

function StartNodeComponent({ selected }: NodeProps<StartNode>) {
  return (
    <div
      className={cn(
        'bg-emerald-50 dark:bg-emerald-900/30 rounded-full w-12 h-12 flex items-center justify-center border-2 border-emerald-500 shadow-sm transition-all',
        selected ? 'shadow-md ring-2 ring-primary ring-offset-1' : 'hover:shadow-md'
      )}
    >
      <Play className="h-5 w-5 text-emerald-600 dark:text-emerald-400 ml-0.5" />

      {/* Source Handle only - Start nodes connect forward */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-2.5 !h-2.5 !bg-emerald-500 !border-2 !border-white dark:!border-slate-800 !-right-1"
      />
    </div>
  )
}

export const StartNode = memo(StartNodeComponent)

// =============================================================================
// END NODE - Exit point of the pipeline
// =============================================================================

export type EndNodeData = {
  label?: string
}

export type EndNode = Node<EndNodeData, 'end'>

function EndNodeComponent({ selected }: NodeProps<EndNode>) {
  return (
    <div
      className={cn(
        'bg-red-50 dark:bg-red-900/30 rounded-full w-12 h-12 flex items-center justify-center border-2 border-red-500 shadow-sm transition-all',
        selected ? 'shadow-md ring-2 ring-primary ring-offset-1' : 'hover:shadow-md'
      )}
    >
      <Flag className="h-5 w-5 text-red-600 dark:text-red-400" />

      {/* Target Handle only - End nodes receive connections */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-2.5 !h-2.5 !bg-red-500 !border-2 !border-white dark:!border-slate-800 !-left-1"
      />
    </div>
  )
}

export const EndNode = memo(EndNodeComponent)
