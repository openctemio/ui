'use client'

import { useCallback, useMemo, useState } from 'react'
import { AlertCircle, AlertTriangle, Network, Plus, Search } from 'lucide-react'
import { toast } from 'sonner'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { RefreshButton, TableSkeleton } from '@/components/list-page-parts'
import { EmptyState, ErrorState, MetricStrip, type MetricStripItem } from '@/features/shared'
import { useUrlFilter } from '@/hooks/use-url-param'
import { Can, Permission } from '@/lib/permissions'
import {
  deleteScanZone,
  invalidateScanZonesCache,
  useScanZoneCoverage,
  useScanZones,
} from '@/lib/api/scan-zone-hooks'
import type { ScanZone } from '@/lib/api/scan-zone-types'

import { useZoneSensors } from '../hooks/use-zone-sensors'
import { describeScanZoneError } from '../lib/errors'
import { ScanZoneDialog } from './scan-zone-dialog'
import { ScanZoneTable } from './scan-zone-table'
import { ZoneCoverageCard } from './zone-coverage-card'
import { ZoneSensorsDialog } from './zone-sensors-dialog'

interface ScanZonesPanelProps {
  /** Controlled from the page header's "Add zone" button. */
  createOpen: boolean
  onCreateOpenChange: (open: boolean) => void
}

/**
 * Settings → Sensors → Scan zones (RFC-023 §7): the team's zones, their
 * ranges and sensors, and how much of the inventory they cover.
 */
export function ScanZonesPanel({ createOpen, onCreateOpenChange }: ScanZonesPanelProps) {
  const { data, error, isLoading, mutate } = useScanZones()
  const { data: coverage, mutate: mutateCoverage } = useScanZoneCoverage()
  const { byId: sensorsById } = useZoneSensors()
  const zones = useMemo(() => data?.data ?? [], [data?.data])

  const [search, setSearch] = useUrlFilter('zq', '')
  const [editZone, setEditZone] = useState<ScanZone | null>(null)
  const [sensorsZone, setSensorsZone] = useState<ScanZone | null>(null)
  const [deleteZone, setDeleteZone] = useState<ScanZone | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<{ message: string; hint?: string } | null>(null)

  const coverageByZone = useMemo(
    () => new Map((coverage?.zones ?? []).map((z) => [z.zone_id, z])),
    [coverage?.zones]
  )
  const defaultZone = useMemo(() => zones.find((z) => z.is_default) ?? null, [zones])

  // Keep the sensors dialog showing the live zone after each assignment.
  const liveSensorsZone = useMemo(
    () => (sensorsZone ? (zones.find((z) => z.id === sensorsZone.id) ?? sensorsZone) : null),
    [sensorsZone, zones]
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return zones
    return zones.filter(
      (z) =>
        z.name.toLowerCase().includes(q) ||
        z.description.toLowerCase().includes(q) ||
        z.ranges.some((r) => r.includes(q))
    )
  }, [zones, search])

  const refresh = useCallback(async () => {
    await Promise.all([mutate(), mutateCoverage()])
  }, [mutate, mutateCoverage])

  const handleDelete = async () => {
    if (!deleteZone) return
    setDeleting(true)
    setDeleteError(null)
    try {
      await deleteScanZone(deleteZone.id)
      toast.success(`Zone "${deleteZone.name}" deleted`)
      await invalidateScanZonesCache()
      setDeleteZone(null)
    } catch (err) {
      // 409 ZONE_IN_USE: keep the dialog open and say why.
      const d = describeScanZoneError(err, 'Failed to delete zone')
      setDeleteError({ message: d.message, hint: d.hint })
    } finally {
      setDeleting(false)
    }
  }

  const unassigned = zones.filter((z) => z.sensor_ids.length === 0).length
  const metrics: MetricStripItem[] = [
    { key: 'zones', label: 'Zones', value: zones.length },
    {
      key: 'addresses',
      label: 'Inventory addresses',
      value: coverage?.inventory_addresses ?? '—',
    },
    { key: 'in', label: 'Inside a zone', value: coverage?.in_zones ?? '—' },
    {
      key: 'private',
      label: 'Private, no zone',
      value: coverage?.outside_private ?? '—',
      tone: 'danger',
      hint: 'Scans skip these',
    },
    { key: 'unassigned', label: 'Zones without sensors', value: unassigned, tone: 'danger' },
  ]

  let body: React.ReactNode
  if (error) {
    body = <ErrorState title="scan zones" error={error} onRetry={refresh} />
  } else if (isLoading) {
    body = <TableSkeleton rows={3} />
  } else if (zones.length === 0) {
    body = (
      <EmptyState
        icon={Network}
        title="No scan zones"
        description="Zones are optional. Add one to scan private ranges through your own sensors; without zones, scans dispatch as before."
        action={
          <Can permission={Permission.ScanZonesWrite}>
            <Button size="sm" onClick={() => onCreateOpenChange(true)}>
              <Plus className="h-4 w-4" />
              Add zone
            </Button>
          </Can>
        }
      />
    )
  } else {
    body = (
      <ScanZoneTable
        zones={filtered}
        coverageByZone={coverageByZone}
        sensorsById={sensorsById}
        onEdit={setEditZone}
        onSensors={setSensorsZone}
        onDelete={(z) => {
          setDeleteError(null)
          setDeleteZone(z)
        }}
        toolbarStart={
          <div className="relative min-w-0 flex-1 sm:max-w-sm">
            <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search name or range…"
              aria-label="Search scan zones"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 ps-9"
            />
          </div>
        }
        toolbarEnd={<RefreshButton onClick={refresh} loading={isLoading} />}
      />
    )
  }

  const warnings = coverage?.warnings ?? []

  return (
    <>
      <MetricStrip className="mt-5" loading={isLoading} items={metrics} />

      {warnings.length > 0 && (
        <Alert className="mt-5" data-testid="zone-coverage-warnings">
          <AlertTriangle className="h-4 w-4 text-warning" />
          <AlertTitle>Coverage needs attention</AlertTitle>
          <AlertDescription>
            <ul className="list-disc space-y-0.5 ps-4">
              {warnings.map((w, i) => (
                <li key={`${w.code}-${w.zone_id ?? i}`}>{w.message}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <div className="mt-5">{body}</div>

      {coverage && zones.length > 0 && (
        <div className="mt-5">
          <ZoneCoverageCard coverage={coverage} zones={zones} />
        </div>
      )}

      <ScanZoneDialog
        open={createOpen || !!editZone}
        onOpenChange={(o) => {
          if (!o) {
            onCreateOpenChange(false)
            setEditZone(null)
          }
        }}
        zone={editZone}
        otherDefaultZone={defaultZone}
      />

      <ZoneSensorsDialog
        open={!!sensorsZone}
        onOpenChange={(o) => !o && setSensorsZone(null)}
        zone={liveSensorsZone}
      />

      <ConfirmDialog
        open={!!deleteZone}
        onOpenChange={(o) => {
          if (!o) {
            setDeleteZone(null)
            setDeleteError(null)
          }
        }}
        title="Delete scan zone"
        desc={
          <>
            Delete <strong>{deleteZone?.name}</strong>? Its ranges stop routing scans: private
            targets in them will not be scanned until another zone holds them.
          </>
        }
        confirmText="Delete"
        destructive
        isLoading={deleting}
        handleConfirm={handleDelete}
      >
        {deleteError && (
          <Alert variant="destructive" role="alert" data-testid="zone-delete-error">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{deleteError.message}</AlertTitle>
            {deleteError.hint && <AlertDescription>{deleteError.hint}</AlertDescription>}
          </Alert>
        )}
      </ConfirmDialog>
    </>
  )
}
