/**
 * Schedule Step
 *
 * Step 4: Configure when to run and notifications
 */

'use client'

import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { NewScanFormData, ScheduleFrequency } from '../../types'
import { FREQUENCY_OPTIONS, DAY_OPTIONS, TIME_OPTIONS } from '../../types'

interface ScheduleStepProps {
  data: NewScanFormData
  onChange: (data: Partial<NewScanFormData>) => void
}

export function ScheduleStep({ data, onChange }: ScheduleStepProps) {
  const handleRunImmediatelyChange = (runImmediately: boolean) => {
    onChange({
      schedule: {
        ...data.schedule,
        runImmediately,
      },
    })
  }

  const handleFrequencyChange = (frequency: ScheduleFrequency) => {
    onChange({
      schedule: {
        ...data.schedule,
        frequency,
      },
    })
  }

  const handleDayChange = (dayOfWeek: string) => {
    onChange({
      schedule: {
        ...data.schedule,
        dayOfWeek: parseInt(dayOfWeek, 10),
      },
    })
  }

  const handleTimeChange = (time: string) => {
    onChange({
      schedule: {
        ...data.schedule,
        time,
      },
    })
  }

  return (
    <div className="space-y-6 p-4">
      {/* When to run */}
      <div className="space-y-3">
        <Label>When to run?</Label>
        <RadioGroup
          value={data.schedule.runImmediately ? 'now' : 'later'}
          onValueChange={(value) => handleRunImmediatelyChange(value === 'now')}
          className="space-y-3"
        >
          <div
            className={`flex items-center space-x-3 rounded-lg border p-4 transition-colors ${
              data.schedule.runImmediately
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50'
            }`}
          >
            <RadioGroupItem value="now" id="run-now" />
            <Label htmlFor="run-now" className="cursor-pointer font-medium">
              Run immediately
            </Label>
          </div>

          <div
            className={`space-y-4 rounded-lg border p-4 transition-colors ${
              !data.schedule.runImmediately
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50'
            }`}
          >
            <div className="flex items-center space-x-3">
              <RadioGroupItem value="later" id="run-later" />
              <Label htmlFor="run-later" className="cursor-pointer font-medium">
                Schedule for later
              </Label>
            </div>

            {!data.schedule.runImmediately && (
              <div className="ms-6 grid gap-4 sm:grid-cols-3">
                {/* Frequency */}
                <div className="space-y-2">
                  <Label htmlFor="frequency" className="text-sm">
                    Frequency
                  </Label>
                  <Select
                    value={data.schedule.frequency}
                    onValueChange={(value: ScheduleFrequency) => handleFrequencyChange(value)}
                  >
                    <SelectTrigger id="frequency">
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      {FREQUENCY_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Day (for weekly) */}
                {data.schedule.frequency === 'weekly' && (
                  <div className="space-y-2">
                    <Label htmlFor="day" className="text-sm">
                      Day
                    </Label>
                    <Select
                      value={data.schedule.dayOfWeek?.toString()}
                      onValueChange={handleDayChange}
                    >
                      <SelectTrigger id="day">
                        <SelectValue placeholder="Select day" />
                      </SelectTrigger>
                      <SelectContent>
                        {DAY_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value.toString()}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Time */}
                <div className="space-y-2">
                  <Label htmlFor="time" className="text-sm">
                    Time
                  </Label>
                  <Select value={data.schedule.time} onValueChange={handleTimeChange}>
                    <SelectTrigger id="time">
                      <SelectValue placeholder="Select time" />
                    </SelectTrigger>
                    <SelectContent>
                      {TIME_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
        </RadioGroup>
      </div>

      {/* Notification / auto-create-task controls were removed here: the scan
          config API has no field for them, so the checkboxes never persisted
          (write-only phantom). Re-add once the backend DTO supports them. */}
    </div>
  )
}
