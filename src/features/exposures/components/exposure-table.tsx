'use client'

import type { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { DataTableRowActions, RelativeTime, SeverityBadge } from '@/features/shared'
import { ExposureThreatPills } from './exposure-enrichment'
import {
  Check,
  X,
  AlertTriangle,
  RefreshCw,
  Eye,
  Network,
  Server,
  Globe,
  ShieldCheck,
  Cloud,
  Code,
  Plug,
  Key,
  Database,
  Settings,
  HelpCircle,
} from 'lucide-react'
import type { ExposureEvent, ExposureEventType, ExposureState } from '@/lib/api/exposure-types'

// Icon mapping for event types
const eventTypeIcons: Record<string, typeof Network> = {
  network: Network,
  service: Server,
  domain: Globe,
  certificate: ShieldCheck,
  cloud: Cloud,
  code: Code,
  api: Plug,
  credential: Key,
  data: Database,
  config: Settings,
  other: HelpCircle,
}

const EVENT_TYPE_CATEGORY = {
  port_open: 'network',
  port_closed: 'network',
  service_detected: 'service',
  service_changed: 'service',
  subdomain_discovered: 'domain',
  subdomain_removed: 'domain',
  certificate_expiring: 'certificate',
  certificate_expired: 'certificate',
  bucket_public: 'cloud',
  bucket_private: 'cloud',
  repo_public: 'code',
  repo_private: 'code',
  api_exposed: 'api',
  api_removed: 'api',
  credential_leaked: 'credential',
  sensitive_data_exposed: 'data',
  misconfiguration: 'config',
  custom: 'other',
} as const

function getEventTypeIcon(eventType: ExposureEventType): typeof Network {
  return eventTypeIcons[EVENT_TYPE_CATEGORY[eventType]] || HelpCircle
}

/** Lifecycle state → badge. Only the open ("active") state draws attention. */
export const EXPOSURE_STATE_BADGE: Record<
  ExposureState,
  { label: string; variant: 'destructive' | 'secondary' | 'outline' }
> = {
  active: { label: 'Active', variant: 'destructive' },
  resolved: { label: 'Resolved', variant: 'secondary' },
  accepted: { label: 'Accepted', variant: 'outline' },
  false_positive: { label: 'False positive', variant: 'outline' },
}

export const EXPOSURE_EVENT_TYPE_LABELS: Record<ExposureEventType, string> = {
  port_open: 'Port open',
  port_closed: 'Port closed',
  service_detected: 'Service detected',
  service_changed: 'Service changed',
  subdomain_discovered: 'Subdomain discovered',
  subdomain_removed: 'Subdomain removed',
  certificate_expiring: 'Certificate expiring',
  certificate_expired: 'Certificate expired',
  bucket_public: 'Bucket public',
  bucket_private: 'Bucket private',
  repo_public: 'Repository public',
  repo_private: 'Repository private',
  api_exposed: 'API exposed',
  api_removed: 'API removed',
  credential_leaked: 'Credential leaked',
  sensitive_data_exposed: 'Sensitive data exposed',
  misconfiguration: 'Misconfiguration',
  custom: 'Custom',
}

interface ExposureColumnHandlers {
  onResolve: (exposure: ExposureEvent) => void
  onAccept: (exposure: ExposureEvent) => void
  onMarkFalsePositive: (exposure: ExposureEvent) => void
  onReactivate: (exposure: ExposureEvent) => void
  onViewDetails: (exposure: ExposureEvent) => void
}

/**
 * Columns for the exposure list, rendered by the shared DataTable. The table
 * is server-paginated and the exposures API takes no sort parameter, so no
 * column is sortable (a header that reordered only the rows on screen would
 * mislead).
 */
export function getExposureColumns(handlers: ExposureColumnHandlers): ColumnDef<ExposureEvent>[] {
  return [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && 'indeterminate')
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label={`Select ${row.original.title}`}
          onClick={(e) => e.stopPropagation()}
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'title',
      header: 'Exposure',
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => {
        const exposure = row.original
        const Icon = getEventTypeIcon(exposure.event_type)
        return (
          <div className="flex min-w-0 items-start gap-2.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="mt-0.5 shrink-0 text-muted-foreground">
                  <Icon className="h-4 w-4" aria-hidden />
                  <span className="sr-only">{EXPOSURE_EVENT_TYPE_LABELS[exposure.event_type]}</span>
                </span>
              </TooltipTrigger>
              <TooltipContent>{EXPOSURE_EVENT_TYPE_LABELS[exposure.event_type]}</TooltipContent>
            </Tooltip>
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <p className="line-clamp-1 font-medium">{exposure.title}</p>
                <ExposureThreatPills exposure={exposure} />
              </div>
              {exposure.description && (
                <p className="line-clamp-1 text-xs text-muted-foreground">{exposure.description}</p>
              )}
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: 'severity',
      header: 'Severity',
      enableSorting: false,
      cell: ({ row }) => <SeverityBadge severity={row.original.severity} />,
    },
    {
      accessorKey: 'state',
      header: 'State',
      enableSorting: false,
      cell: ({ row }) => {
        const state = EXPOSURE_STATE_BADGE[row.original.state]
        return state ? <Badge variant={state.variant}>{state.label}</Badge> : null
      },
    },
    {
      accessorKey: 'source',
      header: 'Source',
      enableSorting: false,
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">{row.original.source}</span>
      ),
    },
    {
      accessorKey: 'first_seen_at',
      header: 'First seen',
      enableSorting: false,
      cell: ({ row }) => <RelativeTime date={row.original.first_seen_at} />,
    },
    {
      id: 'actions',
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => {
        const exposure = row.original
        return (
          <div onClick={(e) => e.stopPropagation()}>
            <DataTableRowActions
              actions={[
                {
                  label: 'View details',
                  icon: Eye,
                  onClick: () => handlers.onViewDetails(exposure),
                },
                ...(exposure.state === 'active'
                  ? [
                      {
                        label: 'Mark resolved',
                        icon: Check,
                        onClick: () => handlers.onResolve(exposure),
                        separatorBefore: true,
                      },
                      {
                        label: 'Accept risk',
                        icon: AlertTriangle,
                        onClick: () => handlers.onAccept(exposure),
                      },
                      {
                        label: 'False positive',
                        icon: X,
                        onClick: () => handlers.onMarkFalsePositive(exposure),
                      },
                    ]
                  : [
                      {
                        label: 'Reactivate',
                        icon: RefreshCw,
                        onClick: () => handlers.onReactivate(exposure),
                        separatorBefore: true,
                      },
                    ]),
              ]}
            />
          </div>
        )
      },
    },
  ]
}
