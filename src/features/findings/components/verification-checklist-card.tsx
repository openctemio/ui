'use client'

import { useEffect, useState } from 'react'
import useSWR from 'swr'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { get, put } from '@/lib/api/client'
import { ApiClientError } from '@/lib/api/error-handler'
import { CheckCircle2, ClipboardCheck, Loader2 } from 'lucide-react'

// ============================================
// TYPES
// ============================================

export interface VerificationChecklist {
  id: string
  finding_id: string
  exposure_cleared: boolean
  evidence_attached: boolean
  register_updated: boolean
  monitoring_added: boolean | null
  regression_scheduled: boolean | null
  notes: string
  is_complete: boolean
  completed_by?: string
  completed_at?: string
}

interface UpdateChecklistPayload {
  exposure_cleared: boolean
  evidence_attached: boolean
  register_updated: boolean
  monitoring_added: boolean | null
  regression_scheduled: boolean | null
  notes: string
}

interface VerificationChecklistCardProps {
  findingId: string
}

// ============================================
// HELPERS
// ============================================

function formatDateTime(value?: string): string {
  if (!value) return ''
  try {
    return new Date(value).toLocaleString()
  } catch {
    return value
  }
}

// Optional checkboxes use a tri-state: true / false / null (N/A)
type OptionalState = 'yes' | 'no' | 'na'

function fromOptional(value: boolean | null): OptionalState {
  if (value === true) return 'yes'
  if (value === false) return 'no'
  return 'na'
}

function toOptional(state: OptionalState): boolean | null {
  if (state === 'yes') return true
  if (state === 'no') return false
  return null
}

// ============================================
// COMPONENT
// ============================================

export function VerificationChecklistCard({ findingId }: VerificationChecklistCardProps) {
  const swrKey = findingId ? `/api/v1/verification-checklists/${findingId}` : null
  const { data, error, isLoading, mutate } = useSWR<VerificationChecklist>(swrKey, get, {
    revalidateOnFocus: false,
  })

  // Local form state
  const [exposureCleared, setExposureCleared] = useState(false)
  const [evidenceAttached, setEvidenceAttached] = useState(false)
  const [registerUpdated, setRegisterUpdated] = useState(false)
  const [monitoringAdded, setMonitoringAdded] = useState<OptionalState>('na')
  const [regressionScheduled, setRegressionScheduled] = useState<OptionalState>('na')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  // Sync server data into local form when data loads / refreshes
  useEffect(() => {
    if (!data) return
    setExposureCleared(data.exposure_cleared)
    setEvidenceAttached(data.evidence_attached)
    setRegisterUpdated(data.register_updated)
    setMonitoringAdded(fromOptional(data.monitoring_added))
    setRegressionScheduled(fromOptional(data.regression_scheduled))
    setNotes(data.notes ?? '')
  }, [data])

  const requiredComplete = exposureCleared && evidenceAttached && registerUpdated
  const optionalResolved = monitoringAdded !== 'na' ? true : true // optional - always considered resolved
  // is_complete is server-computed; mirror the rule locally for UX
  const localIsComplete = requiredComplete && optionalResolved

  async function handleSave(): Promise<void> {
    if (!swrKey) return
    setSaving(true)
    try {
      const payload: UpdateChecklistPayload = {
        exposure_cleared: exposureCleared,
        evidence_attached: evidenceAttached,
        register_updated: registerUpdated,
        monitoring_added: toOptional(monitoringAdded),
        regression_scheduled: toOptional(regressionScheduled),
        notes,
      }
      const updated = await put<VerificationChecklist>(swrKey, payload)
      await mutate(updated, { revalidate: false })
      toast.success('Verification checklist updated')
    } catch (err) {
      const message =
        err instanceof ApiClientError ? err.message : 'Failed to update verification checklist'
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  // ----- Loading -----
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardCheck className="h-4 w-4" />
            Verification Checklist
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-6 w-full" />
          ))}
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    )
  }

  // ----- Error / not found -----
  if (error || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardCheck className="h-4 w-4" />
            Verification Checklist
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Verification checklist is not available for this finding.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardCheck className="h-4 w-4" />
              Verification Checklist
            </CardTitle>
            <CardDescription>
              Confirm the exposure is closed and evidence is captured.
            </CardDescription>
          </div>
          {data.is_complete && (
            <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
              <CheckCircle2 className="mr-1 h-3 w-3" />
              Complete
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Required checkboxes */}
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Required</p>

          <div className="flex items-start gap-3">
            <Checkbox
              id="exposure-cleared"
              checked={exposureCleared}
              onCheckedChange={(v) => setExposureCleared(v === true)}
            />
            <div className="grid gap-1 leading-none">
              <Label htmlFor="exposure-cleared" className="text-sm font-medium cursor-pointer">
                Exposure Cleared
              </Label>
              <p className="text-xs text-muted-foreground">
                Confirm the underlying exposure is no longer reachable.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Checkbox
              id="evidence-attached"
              checked={evidenceAttached}
              onCheckedChange={(v) => setEvidenceAttached(v === true)}
            />
            <div className="grid gap-1 leading-none">
              <Label htmlFor="evidence-attached" className="text-sm font-medium cursor-pointer">
                Evidence Attached
              </Label>
              <p className="text-xs text-muted-foreground">
                Screenshots, scan output, or links proving remediation.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Checkbox
              id="register-updated"
              checked={registerUpdated}
              onCheckedChange={(v) => setRegisterUpdated(v === true)}
            />
            <div className="grid gap-1 leading-none">
              <Label htmlFor="register-updated" className="text-sm font-medium cursor-pointer">
                Register Updated
              </Label>
              <p className="text-xs text-muted-foreground">
                Risk register / change log reflects this remediation.
              </p>
            </div>
          </div>
        </div>

        {/* Optional checkboxes (with N/A) */}
        <div className="space-y-3 border-t pt-4">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Optional</p>

          <OptionalRow
            id="monitoring-added"
            label="Monitoring Added"
            description="Detection rules or alerts deployed to catch recurrence."
            value={monitoringAdded}
            onChange={setMonitoringAdded}
          />

          <OptionalRow
            id="regression-scheduled"
            label="Regression Scheduled"
            description="Scan or test scheduled to verify the fix holds over time."
            value={regressionScheduled}
            onChange={setRegressionScheduled}
          />
        </div>

        {/* Notes */}
        <div className="space-y-2 border-t pt-4">
          <Label htmlFor="checklist-notes" className="text-sm font-medium">
            Notes
          </Label>
          <Textarea
            id="checklist-notes"
            placeholder="Add context about how the finding was verified..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="min-h-24"
          />
        </div>

        {/* Footer */}
        <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs text-muted-foreground">
            {data.completed_at ? (
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-green-500" />
                Completed {formatDateTime(data.completed_at)}
                {data.completed_by ? ` by ${data.completed_by}` : ''}
              </span>
            ) : (
              <span>
                {requiredComplete
                  ? 'All required items checked. Save to mark complete.'
                  : 'Complete all required items to finalize verification.'}
              </span>
            )}
          </div>
          <Button
            onClick={handleSave}
            disabled={saving || !localIsComplete}
            className={cn(saving && 'opacity-70')}
          >
            {saving ? (
              <>
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                Saving
              </>
            ) : (
              'Complete'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================
// OPTIONAL ROW (Yes / No / N/A)
// ============================================

interface OptionalRowProps {
  id: string
  label: string
  description: string
  value: OptionalState
  onChange: (state: OptionalState) => void
}

function OptionalRow({ id, label, description, value, onChange }: OptionalRowProps) {
  const checked = value === 'yes'
  const isNa = value === 'na'

  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-start gap-3">
        <Checkbox
          id={id}
          checked={checked}
          disabled={isNa}
          onCheckedChange={(v) => onChange(v === true ? 'yes' : 'no')}
        />
        <div className="grid gap-1 leading-none">
          <Label htmlFor={id} className="text-sm font-medium cursor-pointer">
            {label}
          </Label>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <Button
        type="button"
        variant={isNa ? 'default' : 'outline'}
        size="sm"
        onClick={() => onChange(isNa ? 'no' : 'na')}
        className="h-7 px-2 text-xs"
      >
        N/A
      </Button>
    </div>
  )
}
