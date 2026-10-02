'use client'

import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import type { Sensor } from '@/lib/api/sensor-types'

import { SensorInstallFlow } from './sensor-install-flow'

/** "Install sensor" from the page header: the install flow in a dialog. */
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
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92svh] overflow-y-auto p-0 sm:max-w-5xl">
        <DialogTitle className="sr-only">Install a sensor</DialogTitle>
        <DialogDescription className="sr-only">
          Name the sensor, run the command on the host and wait for its first heartbeat.
        </DialogDescription>
        <SensorInstallFlow onOpen={onOpen} className="rounded-none border-0" />
      </DialogContent>
    </Dialog>
  )
}
