/**
 * Options Step
 *
 * Step 3: Configure scan options, intensity, and concurrency
 */

'use client'

import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { NewScanFormData, ScanIntensity, ScanOptions } from '../../types'
import { SCAN_OPTIONS_CONFIG } from '../../types'

interface OptionsStepProps {
  data: NewScanFormData
  onChange: (data: Partial<NewScanFormData>) => void
}

export function OptionsStep({ data, onChange }: OptionsStepProps) {
  const handleOptionToggle = (option: keyof ScanOptions, checked: boolean) => {
    onChange({
      options: {
        ...data.options,
        [option]: checked,
      },
    })
  }

  const handleIntensityChange = (values: number[]) => {
    const value = values[0]
    let intensity: ScanIntensity = 'low'
    if (value >= 66) {
      intensity = 'high'
    } else if (value >= 33) {
      intensity = 'medium'
    }
    onChange({ intensity })
  }

  const getIntensityValue = (): number => {
    switch (data.intensity) {
      case 'high':
        return 100
      case 'medium':
        return 50
      case 'low':
      default:
        return 0
    }
  }

  return (
    <div className="space-y-6 p-4">
      {/* Scan Options */}
      <div className="space-y-3">
        <Label>Scan Options</Label>
        <div className="space-y-2 rounded-lg border p-3">
          {(Object.keys(SCAN_OPTIONS_CONFIG) as (keyof ScanOptions)[]).map((option) => (
            <div
              key={option}
              className="flex items-start space-x-3 rounded-md p-2 hover:bg-muted/50"
            >
              <Checkbox
                id={`option-${option}`}
                checked={data.options[option]}
                onCheckedChange={(checked) => handleOptionToggle(option, checked as boolean)}
                className="mt-0.5"
              />
              <div className="flex-1">
                <Label htmlFor={`option-${option}`} className="cursor-pointer font-medium">
                  {SCAN_OPTIONS_CONFIG[option].label}
                </Label>
                <p className="text-muted-foreground text-xs">
                  {SCAN_OPTIONS_CONFIG[option].description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Intensity */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label>Intensity</Label>
          <span className="text-muted-foreground text-sm capitalize">{data.intensity}</span>
        </div>
        <div className="px-2">
          <Slider
            value={[getIntensityValue()]}
            onValueChange={handleIntensityChange}
            max={100}
            step={50}
            className="w-full"
          />
          <div className="mt-2 flex justify-between text-xs text-muted-foreground">
            <span>Low</span>
            <span>Medium</span>
            <span>High</span>
          </div>
        </div>
        <p className="text-muted-foreground text-xs">
          {data.intensity === 'low' &&
            'Slower, less aggressive scanning. Recommended for production systems.'}
          {data.intensity === 'medium' &&
            'Balanced speed and thoroughness. Good for most environments.'}
          {data.intensity === 'high' && 'Fast, aggressive scanning. May impact target performance.'}
        </p>
      </div>

      {/* Max Concurrent */}
      <div className="space-y-2">
        <Label htmlFor="max-concurrent">Max Concurrent Connections</Label>
        <Select
          value={data.maxConcurrent.toString()}
          onValueChange={(value) => onChange({ maxConcurrent: parseInt(value, 10) })}
        >
          <SelectTrigger id="max-concurrent" className="w-full">
            <SelectValue placeholder="Select max concurrent" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="5">5 connections</SelectItem>
            <SelectItem value="10">10 connections</SelectItem>
            <SelectItem value="15">15 connections</SelectItem>
            <SelectItem value="20">20 connections</SelectItem>
            <SelectItem value="25">25 connections</SelectItem>
            <SelectItem value="50">50 connections</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-muted-foreground text-xs">
          Higher values speed up scanning but may trigger rate limiting or IDS alerts.
        </p>
      </div>

      {/* Execution timeout & retry config — wired to backend pipeline_runs
          fields. Kept under a "Reliability" group so it's discoverable but not
          in the way of the main options. */}
      <div className="space-y-4 rounded-lg border p-4">
        <div>
          <Label className="text-sm font-semibold">Reliability</Label>
          <p className="text-muted-foreground text-xs mt-0.5">
            Control how long a run can take and how aggressively the platform retries failures.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="timeout-seconds" className="text-xs">
              Timeout (seconds)
            </Label>
            <Input
              id="timeout-seconds"
              type="number"
              min={30}
              max={86400}
              value={data.timeoutSeconds}
              onChange={(e) =>
                onChange({
                  timeoutSeconds: Math.max(
                    30,
                    Math.min(86400, parseInt(e.target.value || '0', 10) || 3600)
                  ),
                })
              }
            />
            <p className="text-muted-foreground text-[11px]">30s – 24h</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="max-retries" className="text-xs">
              Max retries
            </Label>
            <Input
              id="max-retries"
              type="number"
              min={0}
              max={10}
              value={data.maxRetries}
              onChange={(e) =>
                onChange({
                  maxRetries: Math.max(0, Math.min(10, parseInt(e.target.value || '0', 10) || 0)),
                })
              }
            />
            <p className="text-muted-foreground text-[11px]">0 = no retries</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="retry-backoff" className="text-xs">
              Retry backoff (s)
            </Label>
            <Input
              id="retry-backoff"
              type="number"
              min={10}
              max={86400}
              value={data.retryBackoffSeconds}
              onChange={(e) =>
                onChange({
                  retryBackoffSeconds: Math.max(
                    10,
                    Math.min(86400, parseInt(e.target.value || '0', 10) || 60)
                  ),
                })
              }
              disabled={data.maxRetries === 0}
            />
            <p className="text-muted-foreground text-[11px]">Initial wait between retries</p>
          </div>
        </div>
      </div>
    </div>
  )
}
