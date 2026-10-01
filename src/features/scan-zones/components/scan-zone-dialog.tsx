'use client'

import { useEffect, useMemo, useState } from 'react'
import { AlertCircle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { createScanZone, invalidateScanZonesCache, updateScanZone } from '@/lib/api/scan-zone-hooks'
import type { ScanZone } from '@/lib/api/scan-zone-types'

import { describeScanZoneError } from '../lib/errors'
import {
  MAX_ZONE_DESCRIPTION_LENGTH,
  MAX_ZONE_NAME_LENGTH,
  parseRanges,
  splitRangeInput,
} from '../lib/ranges'
import { RangeChips } from './range-chips'

interface ScanZoneDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Edit this zone; omit to create one. */
  zone?: ScanZone | null
  /** Another zone is already the default (the API allows one). */
  otherDefaultZone?: ScanZone | null
  onSaved?: (zone: ScanZone) => void
}

interface ServerError {
  message: string
  hint?: string
}

export function ScanZoneDialog({
  open,
  onOpenChange,
  zone,
  otherDefaultZone,
  onSaved,
}: ScanZoneDialogProps) {
  const editing = !!zone
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isDefault, setIsDefault] = useState(false)
  const [rangesText, setRangesText] = useState('')
  const [touched, setTouched] = useState(false)
  const [saving, setSaving] = useState(false)
  const [serverError, setServerError] = useState<ServerError | null>(null)

  useEffect(() => {
    if (!open) return
    setName(zone?.name ?? '')
    setDescription(zone?.description ?? '')
    setIsDefault(zone?.is_default ?? false)
    setRangesText((zone?.ranges ?? []).join('\n'))
    setTouched(false)
    setServerError(null)
  }, [open, zone])

  const entries = useMemo(() => splitRangeInput(rangesText), [rangesText])
  const parsed = useMemo(() => parseRanges(entries), [entries])

  const nameError = !name.trim()
    ? 'Name is required.'
    : name.trim().length > MAX_ZONE_NAME_LENGTH
      ? `Name must be at most ${MAX_ZONE_NAME_LENGTH} characters.`
      : null
  const descriptionError =
    description.trim().length > MAX_ZONE_DESCRIPTION_LENGTH
      ? `Description must be at most ${MAX_ZONE_DESCRIPTION_LENGTH} characters.`
      : null
  const rangesRequiredError =
    !isDefault && entries.length === 0
      ? 'A zone that is not the default zone needs at least one range.'
      : null
  const hasClientError =
    !!nameError || !!descriptionError || !!rangesRequiredError || parsed.errors.length > 0

  const handleSave = async () => {
    setTouched(true)
    setServerError(null)
    if (hasClientError) return
    setSaving(true)
    try {
      // The server normalises and validates again; it is the authority.
      const body = {
        name: name.trim(),
        description: description.trim(),
        is_default: isDefault,
        ranges: entries,
      }
      const saved = zone ? await updateScanZone(zone.id, body) : await createScanZone(body)
      toast.success(editing ? `Zone "${saved.name}" saved` : `Zone "${saved.name}" created`)
      await invalidateScanZonesCache()
      onSaved?.(saved)
      onOpenChange(false)
    } catch (err) {
      const d = describeScanZoneError(
        err,
        editing ? 'Failed to save zone' : 'Failed to create zone'
      )
      setServerError({ message: d.message, hint: d.hint })
    } finally {
      setSaving(false)
    }
  }

  const showErrors = touched
  const defaultConflict = isDefault && otherDefaultZone && otherDefaultZone.id !== zone?.id

  return (
    <Dialog open={open} onOpenChange={(o) => !saving && onOpenChange(o)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit scan zone' : 'New scan zone'}</DialogTitle>
          <DialogDescription>
            Address ranges, and the sensors that can reach them. Scans route each target to the
            narrowest zone that holds it.
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            void handleSave()
          }}
        >
          {serverError && (
            <Alert variant="destructive" role="alert" data-testid="zone-server-error">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>{serverError.message}</AlertTitle>
              {serverError.hint && <AlertDescription>{serverError.hint}</AlertDescription>}
            </Alert>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="zone-name">Name</Label>
            <Input
              id="zone-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="HQ data centre"
              maxLength={MAX_ZONE_NAME_LENGTH + 20}
              aria-invalid={showErrors && !!nameError}
              autoFocus
            />
            {showErrors && nameError && <p className="text-xs text-destructive">{nameError}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="zone-description">Description</Label>
            <Textarea
              id="zone-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Optional"
              aria-invalid={showErrors && !!descriptionError}
            />
            {showErrors && descriptionError && (
              <p className="text-xs text-destructive">{descriptionError}</p>
            )}
          </div>

          <div className="flex items-start justify-between gap-4 rounded-md border p-3">
            <div className="min-w-0 space-y-0.5">
              <Label htmlFor="zone-default">Default zone</Label>
              <p className="text-xs text-muted-foreground">
                Receives public targets and hostnames no other zone holds. One per team; it may have
                no ranges.
              </p>
              {defaultConflict && (
                <p className="text-xs text-warning">
                  &quot;{otherDefaultZone.name}&quot; is the default zone now. Unset it there first,
                  or the server refuses this.
                </p>
              )}
            </div>
            <Switch id="zone-default" checked={isDefault} onCheckedChange={setIsDefault} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="zone-ranges">Ranges</Label>
            <Textarea
              id="zone-ranges"
              value={rangesText}
              onChange={(e) => setRangesText(e.target.value)}
              rows={5}
              className="font-mono text-sm"
              placeholder={'10.230.0.0/16\n192.168.10.1-192.168.10.200\nfd00:230::/48'}
              aria-invalid={showErrors && (parsed.errors.length > 0 || !!rangesRequiredError)}
              aria-describedby="zone-ranges-help"
            />
            <p id="zone-ranges-help" className="text-xs text-muted-foreground">
              One per line: an address, a CIDR or a range (a-b). IPv4 up to /8, IPv6 up to /32.
              Loopback, link-local, metadata, multicast and reserved space are refused.
            </p>
            {parsed.errors.length > 0 && (
              <ul className="space-y-0.5" data-testid="zone-range-errors">
                {parsed.errors.map((e) => (
                  <li key={`${e.line}-${e.input}`} className="text-xs text-destructive">
                    {e.line > 0 ? `Line ${e.line}: ` : ''}
                    {e.message}
                  </li>
                ))}
              </ul>
            )}
            {showErrors && rangesRequiredError && (
              <p className="text-xs text-destructive">{rangesRequiredError}</p>
            )}
            {parsed.errors.length === 0 && parsed.ranges.length > 0 && (
              <div className="space-y-1 pt-1">
                <p className="text-xs text-muted-foreground">
                  Saved as {parsed.ranges.length} range{parsed.ranges.length === 1 ? '' : 's'}
                  {parsed.privateCount > 0 ? `, ${parsed.privateCount} private` : ''}:
                </p>
                <RangeChips ranges={parsed.ranges} max={6} />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {editing ? 'Save' : 'Create zone'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
