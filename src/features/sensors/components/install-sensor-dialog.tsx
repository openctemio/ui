'use client'

import { useRef, useState } from 'react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeaderBar,
  DialogTitle,
  focusDialogBody,
} from '@/components/ui/dialog'
import type { Sensor } from '@/lib/api/sensor-types'

import { SensorInstallFlow, installStepLabel, type InstallStep } from './sensor-install-flow'

/**
 * "Install sensor" from the page header: the install flow in a dialog. The
 * title, the current step and the close button sit in a full-width header
 * bar; the two panes start below it and only the body scrolls.
 */
export function InstallSensorDialog({
  open,
  onOpenChange,
  onOpen,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** "Open sensor" once it sent its first heartbeat. */
  onOpen?: (sensor: Sensor) => void
}) {
  const [step, setStep] = useState<InstallStep>('name')
  const bodyRef = useRef<HTMLDivElement>(null)
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        onOpenAutoFocus={(e) => focusDialogBody(e, bodyRef.current)}
        className="flex max-h-[92svh] flex-col gap-0 overflow-hidden p-0 sm:p-0 sm:max-w-5xl"
      >
        <DialogHeaderBar>
          <DialogTitle>Install a sensor</DialogTitle>
          <DialogDescription>
            <span className="sr-only">
              Name the sensor, run the command on the host, then review the tools it reports.{' '}
            </span>
            <span aria-live="polite">{installStepLabel(step)}</span>
          </DialogDescription>
        </DialogHeaderBar>
        <div ref={bodyRef} tabIndex={-1} className="min-h-0 flex-1 overflow-y-auto outline-none">
          <SensorInstallFlow
            variant="dialog"
            onOpen={onOpen}
            onDone={() => onOpenChange(false)}
            onStepChange={setStep}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
