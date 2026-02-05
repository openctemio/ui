/**
 * Schedule Step
 *
 * Step 4: Configure when to run and notifications
 */

"use client";

import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { NewScanFormData, ScheduleFrequency } from "../../types";
import { FREQUENCY_OPTIONS, DAY_OPTIONS, TIME_OPTIONS } from "../../types";

interface ScheduleStepProps {
  data: NewScanFormData;
  onChange: (data: Partial<NewScanFormData>) => void;
}

export function ScheduleStep({ data, onChange }: ScheduleStepProps) {
  const handleRunImmediatelyChange = (runImmediately: boolean) => {
    onChange({
      schedule: {
        ...data.schedule,
        runImmediately,
      },
    });
  };

  const handleFrequencyChange = (frequency: ScheduleFrequency) => {
    onChange({
      schedule: {
        ...data.schedule,
        frequency,
      },
    });
  };

  const handleDayChange = (dayOfWeek: string) => {
    onChange({
      schedule: {
        ...data.schedule,
        dayOfWeek: parseInt(dayOfWeek, 10),
      },
    });
  };

  const handleTimeChange = (time: string) => {
    onChange({
      schedule: {
        ...data.schedule,
        time,
      },
    });
  };

  const handleNotificationChange = (
    field: "notifyOnComplete" | "autoCreateTasks",
    checked: boolean
  ) => {
    onChange({
      notifications: {
        ...data.notifications,
        [field]: checked,
      },
    });
  };

  return (
    <div className="space-y-6 p-4">
      {/* When to run */}
      <div className="space-y-3">
        <Label>When to run?</Label>
        <RadioGroup
          value={data.schedule.runImmediately ? "now" : "later"}
          onValueChange={(value) =>
            handleRunImmediatelyChange(value === "now")
          }
          className="space-y-3"
        >
          <div
            className={`flex items-center space-x-3 rounded-lg border p-4 transition-colors ${
              data.schedule.runImmediately
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50"
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
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50"
            }`}
          >
            <div className="flex items-center space-x-3">
              <RadioGroupItem value="later" id="run-later" />
              <Label htmlFor="run-later" className="cursor-pointer font-medium">
                Schedule for later
              </Label>
            </div>

            {!data.schedule.runImmediately && (
              <div className="ml-6 grid gap-4 sm:grid-cols-3">
                {/* Frequency */}
                <div className="space-y-2">
                  <Label htmlFor="frequency" className="text-sm">
                    Frequency
                  </Label>
                  <Select
                    value={data.schedule.frequency}
                    onValueChange={(value: ScheduleFrequency) =>
                      handleFrequencyChange(value)
                    }
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
                {data.schedule.frequency === "weekly" && (
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
                          <SelectItem
                            key={option.value}
                            value={option.value.toString()}
                          >
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
                  <Select
                    value={data.schedule.time}
                    onValueChange={handleTimeChange}
                  >
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

      {/* Notifications */}
      <div className="space-y-3">
        <Label>Notifications</Label>
        <div className="space-y-2 rounded-lg border p-3">
          <div className="flex items-start space-x-3 rounded-md p-2 hover:bg-muted/50">
            <Checkbox
              id="notify-complete"
              checked={data.notifications.notifyOnComplete}
              onCheckedChange={(checked) =>
                handleNotificationChange("notifyOnComplete", checked as boolean)
              }
              className="mt-0.5"
            />
            <div className="flex-1">
              <Label
                htmlFor="notify-complete"
                className="cursor-pointer font-medium"
              >
                Send notification when complete
              </Label>
              <p className="text-muted-foreground text-xs">
                Receive an email notification when the scan finishes
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3 rounded-md p-2 hover:bg-muted/50">
            <Checkbox
              id="auto-tasks"
              checked={data.notifications.autoCreateTasks}
              onCheckedChange={(checked) =>
                handleNotificationChange("autoCreateTasks", checked as boolean)
              }
              className="mt-0.5"
            />
            <div className="flex-1">
              <Label
                htmlFor="auto-tasks"
                className="cursor-pointer font-medium"
              >
                Auto-create tasks for critical findings
              </Label>
              <p className="text-muted-foreground text-xs">
                Automatically create remediation tasks for critical and high
                severity findings
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
