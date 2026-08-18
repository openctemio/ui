'use client'

import { useCallback } from 'react'
import { toast } from 'sonner'
import { ShieldCheck, RefreshCw, Loader2, Eye, EyeOff, Unplug, type LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { SEVERITY_BADGE_SOFT } from '@/lib/severity-colors'
import { getErrorMessage } from '@/lib/api/error-handler'
import { usePermissions } from '@/context/permission-provider'
import {
  useRequestValidationApi,
  useFindingValidationEvidenceApi,
  type ValidationEvidenceItem,
} from '../../api/use-findings-api'

interface ValidationEvidencePanelProps {
  findingId: string
}

const OUTCOME_STYLES: Record<string, string> = {
  not_detected: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  detected: 'bg-red-500/15 text-red-600 dark:text-red-400',
  inconclusive: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  error: 'bg-red-500/15 text-red-600 dark:text-red-400',
  skipped: 'bg-muted text-muted-foreground',
}

const OUTCOME_LABELS: Record<string, string> = {
  not_detected: 'Not detected (fix stood)',
  detected: 'Detected (still exploitable)',
  inconclusive: 'Inconclusive',
  error: 'Error',
  skipped: 'Skipped',
}

/**
 * Detection-correlation verdict → how to render it. This answers a DIFFERENT
 * question from `outcome`: "did any control observe this validation?" — not "is
 * the exposure still reachable?". Deliberately NOT a pass/fail chip: only
 * `not_observed` is a genuine detection gap. `no_telemetry_source` means no
 * telemetry is reaching the platform (UNKNOWN, never a control miss), and
 * `observed` is the good case. `not_applicable` / `not_evaluated` carry no
 * signal and render nothing.
 */
const DETECTION_META: Record<
  string,
  { label: string; title: string; className: string; Icon: LucideIcon }
> = {
  observed: {
    label: 'Observed by controls',
    title: 'A security control observed this validation activity.',
    className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400', // palette-ok: success accent — the theme has no semantic "success" token
    Icon: Eye,
  },
  not_observed: {
    label: 'Detection gap',
    title: 'No control observed this validation — a detection gap worth closing.',
    className: SEVERITY_BADGE_SOFT.medium,
    Icon: EyeOff,
  },
  no_telemetry_source: {
    label: 'No telemetry connected',
    title:
      'No telemetry source is connected for this asset, so detection is unknown — not a control failure.',
    className: 'bg-muted text-muted-foreground',
    Icon: Unplug,
  },
}

function DetectionBadge({ item }: { item: ValidationEvidenceItem }) {
  if (!item.detection_status) return null
  const meta = DETECTION_META[item.detection_status]
  if (!meta) return null
  const { label, title, className, Icon } = meta
  return (
    <Badge variant="secondary" className={cn('gap-1 font-medium', className)} title={title}>
      <Icon className="h-3 w-3" />
      {label}
    </Badge>
  )
}

function formatTimestamp(value?: string): string {
  if (!value) return ''
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString()
}

function EvidenceRow({ item }: { item: ValidationEvidenceItem }) {
  return (
    <li className="flex flex-col gap-1 rounded-md border p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge
          variant="secondary"
          className={cn('font-medium', OUTCOME_STYLES[item.outcome] ?? OUTCOME_STYLES.skipped)}
        >
          {OUTCOME_LABELS[item.outcome] ?? item.outcome}
        </Badge>
        <DetectionBadge item={item} />
        <span className="text-muted-foreground text-xs">{item.executor_kind}</span>
        {item.technique ? (
          <span className="text-muted-foreground text-xs">· {item.technique}</span>
        ) : null}
        <span className="text-muted-foreground ms-auto text-xs">
          {formatTimestamp(item.created_at)}
        </span>
      </div>
      {item.summary ? <p className="text-sm">{item.summary}</p> : null}
    </li>
  )
}

/**
 * ValidationEvidencePanel shows CTEM Stage-4 validation evidence for a finding
 * and lets an operator trigger a fresh safe-check re-validation (RFC-011).
 */
export function ValidationEvidencePanel({ findingId }: ValidationEvidencePanelProps) {
  const { data, isLoading, mutate } = useFindingValidationEvidenceApi(findingId)
  const { trigger: requestValidation, isMutating } = useRequestValidationApi(findingId)
  const { hasPermission } = usePermissions()

  const handleValidate = useCallback(async () => {
    try {
      await requestValidation()
      toast.success('Validation requested', {
        description:
          'A safe-check job was dispatched. Evidence appears here once an agent reports back.',
      })
      // Give the async completion a moment, then refresh the evidence list.
      setTimeout(() => {
        void mutate()
      }, 1500)
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to request validation'))
    }
  }, [requestValidation, mutate])

  const evidence = data?.evidence ?? []

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="text-muted-foreground h-4 w-4" />
          <h3 className="text-sm font-semibold">Validation</h3>
          {evidence.length > 0 ? <Badge variant="secondary">{evidence.length}</Badge> : null}
        </div>
        {hasPermission('findings:write') ? (
          <Button size="sm" variant="outline" onClick={handleValidate} disabled={isMutating}>
            {isMutating ? (
              <Loader2 className="me-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="me-1.5 h-3.5 w-3.5" />
            )}
            Validate now
          </Button>
        ) : null}
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Loading validation evidence…</p>
      ) : evidence.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No validation evidence yet. Run a safe-check to confirm whether this exposure is still
          reachable.
        </p>
      ) : (
        <ul className="space-y-2">
          {evidence.map((item) => (
            <EvidenceRow key={item.id} item={item} />
          ))}
        </ul>
      )}
    </section>
  )
}
