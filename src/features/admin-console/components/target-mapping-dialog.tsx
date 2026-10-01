'use client'

import { useState, type FormEvent } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { getAssetTypeLabel } from '@/features/assets/lib/asset-type-icon'
import { AdminApiError } from '../api/admin-client'
import {
  createTargetMapping,
  updateTargetMapping,
  useExistingTargetMapping,
} from '../api/use-target-mappings'
import {
  DEFAULT_PRIORITY,
  MAPPABLE_ASSET_TYPES,
  MAX_DESCRIPTION_LENGTH,
  MAX_PRIORITY,
  MIN_PRIORITY,
  PRIMARY_PRIORITY,
  TARGET_TYPE_OPTIONS,
  targetTypeHint,
  targetTypeLabel,
  validateTargetMappingForm,
} from '../lib/target-mappings'
import type { TargetMapping } from '../types'

const ASSET_TYPE_OPTIONS = MAPPABLE_ASSET_TYPES.map((v) => ({
  value: v,
  label: getAssetTypeLabel(v),
})).sort((a, b) => a.label.localeCompare(b.label))

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Edit this mapping; omitted = create. */
  mapping?: TargetMapping | null
  /** Pre-selected target type for a new mapping (the list's filter). */
  defaultTargetType?: string
  onSaved: (mapping: TargetMapping) => void
}

/**
 * Create or edit a target mapping. The pair (target type, asset type) is fixed
 * once created: the API ignores it on update, so editing shows it read-only.
 * Mount with a `key` per mapping so the form starts from that mapping.
 */
export function TargetMappingDialog({
  open,
  onOpenChange,
  mapping,
  defaultTargetType,
  onSaved,
}: Props) {
  const editing = !!mapping
  const [targetType, setTargetType] = useState(mapping?.target_type ?? defaultTargetType ?? '')
  const [assetType, setAssetType] = useState(mapping?.asset_type ?? '')
  const [priority, setPriority] = useState(String(mapping?.priority ?? DEFAULT_PRIORITY))
  const [active, setActive] = useState(mapping?.is_active ?? true)
  const [description, setDescription] = useState(mapping?.description ?? '')
  const [touched, setTouched] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const existing = useExistingTargetMapping(editing ? '' : targetType, editing ? '' : assetType)
  // On edit, a stored priority from before the API's bounds existed must not
  // block an unrelated change, so it is only checked once it is edited.
  const priorityChanged = !editing || priority.trim() !== String(mapping.priority)
  const formErrors = validateTargetMappingForm({ priority, description })
  const errors = priorityChanged ? formErrors : { description: formErrors.description }
  const isPrimary = priority.trim() === String(PRIMARY_PRIORITY)
  const pairMissing = !editing && (!targetType || !assetType)
  const invalid = !!errors.priority || !!errors.description || pairMissing || !!existing

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setTouched(true)
    if (invalid) return
    setBusy(true)
    setError(null)
    const fields = {
      ...(priorityChanged ? { priority: Number(priority.trim()) } : {}),
      is_active: active,
      description: description.trim(),
    }
    try {
      const saved = editing
        ? await updateTargetMapping(mapping.id, fields)
        : await createTargetMapping({ target_type: targetType, asset_type: assetType, ...fields })
      toast.success(
        `${targetTypeLabel(saved.target_type)} → ${getAssetTypeLabel(saved.asset_type)} ${
          editing ? 'updated' : 'created'
        }`
      )
      onSaved(saved)
      onOpenChange(false)
    } catch (err) {
      setError(
        err instanceof AdminApiError
          ? err.status === 409
            ? 'This target type is already mapped to this asset type.'
            : err.message
          : 'The mapping could not be saved'
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={submit} noValidate>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit target mapping' : 'New target mapping'}</DialogTitle>
            <DialogDescription>
              A scanner that declares this target type can scan assets of this type. Scans skip
              assets no active mapping covers.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {editing ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Target type</p>
                  <p className="text-sm">{targetTypeLabel(mapping.target_type)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">Asset type</p>
                  <p className="text-sm">{getAssetTypeLabel(mapping.asset_type)}</p>
                </div>
                <p className="col-span-2 text-xs text-muted-foreground">
                  The pair cannot change. To map a different pair, create a new mapping.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="tm-target">Target type</Label>
                  <Select value={targetType} onValueChange={setTargetType}>
                    <SelectTrigger id="tm-target" className="w-full">
                      <SelectValue placeholder="Choose..." />
                    </SelectTrigger>
                    <SelectContent>
                      {TARGET_TYPE_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {targetTypeHint(targetType) ?? "From a scanner's supported targets."}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tm-asset">Asset type</Label>
                  <Select value={assetType} onValueChange={setAssetType}>
                    <SelectTrigger id="tm-asset" className="w-full">
                      <SelectValue placeholder="Choose..." />
                    </SelectTrigger>
                    <SelectContent>
                      {ASSET_TYPE_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Assets of this type can be scanned.
                  </p>
                </div>
                {touched && pairMissing && (
                  <p className="text-sm text-destructive sm:col-span-2">
                    Choose a target type and an asset type.
                  </p>
                )}
                {existing && (
                  <p className="text-sm text-destructive sm:col-span-2" role="alert">
                    {targetTypeLabel(existing.target_type)} is already mapped to{' '}
                    {getAssetTypeLabel(existing.asset_type)}. Edit that mapping instead.
                  </p>
                )}
              </div>
            )}

            <div className="flex items-start justify-between gap-4">
              <div className="space-y-0.5">
                <Label htmlFor="tm-primary">Primary mapping</Label>
                <p className="text-xs text-muted-foreground">
                  The main asset type for this target type. Sets the priority to {PRIMARY_PRIORITY}.
                </p>
              </div>
              <Switch
                id="tm-primary"
                checked={isPrimary}
                onCheckedChange={(on) =>
                  setPriority(String(on ? PRIMARY_PRIORITY : DEFAULT_PRIORITY))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tm-priority">Priority</Label>
              <Input
                id="tm-priority"
                type="number"
                inputMode="numeric"
                min={MIN_PRIORITY}
                max={MAX_PRIORITY}
                step={1}
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                aria-invalid={!!errors.priority}
                className="sm:max-w-40"
              />
              <p
                className={
                  errors.priority ? 'text-xs text-destructive' : 'text-xs text-muted-foreground'
                }
              >
                {errors.priority ??
                  `${MIN_PRIORITY}–${MAX_PRIORITY}. Lower comes first; ${PRIMARY_PRIORITY} is primary, ${DEFAULT_PRIORITY} is the default.`}
              </p>
            </div>

            <div className="flex items-start justify-between gap-4">
              <div className="space-y-0.5">
                <Label htmlFor="tm-active">Active</Label>
                <p className="text-xs text-muted-foreground">
                  Inactive mappings are kept but ignored when scans are filtered.
                </p>
              </div>
              <Switch id="tm-active" checked={active} onCheckedChange={setActive} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tm-description">Description (optional)</Label>
              <Textarea
                id="tm-description"
                rows={2}
                maxLength={MAX_DESCRIPTION_LENGTH}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                aria-invalid={!!errors.description}
              />
              {errors.description && (
                <p className="text-xs text-destructive">{errors.description}</p>
              )}
            </div>

            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy || (touched && invalid) || !!existing}>
              {busy && <Loader2 className="me-2 size-4 animate-spin" />}
              {editing ? 'Save changes' : 'Create mapping'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
