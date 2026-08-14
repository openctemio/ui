'use client'

import { useEffect, useMemo } from 'react'
import { useForm, useFieldArray, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, X, Lock, Info, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { DynamicListInput } from '@/components/ui/dynamic-list-input'
import { Can, Permission, usePermissions } from '@/lib/permissions'
import { put } from '@/lib/api/client'
import { getErrorMessage } from '@/lib/api/error-handler'

import type { CtemCycle } from '../types'
import {
  charterFormSchema,
  charterToForm,
  formToCharter,
  charterWarnings,
  type CharterFormData,
} from '../charter.schema'

interface CharterEditorSheetProps {
  cycle: CtemCycle | null
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Called after a successful save so the parent can revalidate its list. */
  onSaved?: () => void
}

/** Read-only rendering of a string list (used when the charter is frozen). */
function ReadOnlyList({ items }: { items: string[] }) {
  const filled = items.filter((s) => s.trim().length > 0)
  if (filled.length === 0) {
    return <p className="text-sm text-muted-foreground">Not set</p>
  }
  return (
    <ul className="list-disc space-y-1 ps-5 text-sm">
      {filled.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  )
}

function ReadOnlyText({ value }: { value: string }) {
  if (!value.trim()) return <p className="text-sm text-muted-foreground">Not set</p>
  return <p className="whitespace-pre-wrap text-sm">{value}</p>
}

/**
 * CharterEditorSheet edits the ctem.org scope-charter for a cycle: what it
 * defends against (threat scenarios), how success is measured, what is
 * deliberately excluded and why, who owns escalation, and the accountable
 * roles. The charter freezes on Activate, so all controls are read-only unless
 * the cycle is in `planning` (matching the API, which only updates the charter
 * WHERE status = 'planning').
 */
export function CharterEditorSheet({
  cycle,
  open,
  onOpenChange,
  onSaved,
}: CharterEditorSheetProps) {
  const { can } = usePermissions()
  const isPlanning = cycle?.status === 'planning'
  const canWrite = can(Permission.CTEMCyclesWrite)
  const editable = isPlanning && canWrite

  const form = useForm<CharterFormData>({
    resolver: zodResolver(charterFormSchema),
    defaultValues: charterToForm(cycle?.charter),
  })

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { isSubmitting },
  } = form

  // Re-hydrate whenever a different cycle is opened.
  useEffect(() => {
    if (open) reset(charterToForm(cycle?.charter))
  }, [open, cycle, reset])

  const exclusions = useFieldArray({ control, name: 'exclusions' })
  const successCriteria = useFieldArray({ control, name: 'success_criteria' })

  const watched = watch()
  const warnings = useMemo(() => charterWarnings(watched), [watched])

  const onSubmit = async (data: CharterFormData) => {
    if (!cycle) return
    try {
      // The cycle Update endpoint rewrites name/dates alongside the charter, so
      // echo the current values back to avoid blanking them.
      await put(`/api/v1/ctem-cycles/${cycle.id}`, {
        name: cycle.name,
        start_date: cycle.start_date || '',
        end_date: cycle.end_date || '',
        charter: formToCharter(data),
      })
      toast.success('Charter saved')
      onSaved?.()
      onOpenChange(false)
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to save charter'))
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full gap-0 p-0 sm:max-w-2xl"
        onInteractOutside={(e) => {
          if (isSubmitting) e.preventDefault()
        }}
      >
        <SheetHeader className="border-b">
          <div className="flex items-center gap-2">
            <SheetTitle>Cycle Charter</SheetTitle>
            {cycle && (
              <Badge variant="outline" className="capitalize">
                {cycle.status}
              </Badge>
            )}
          </div>
          <SheetDescription>
            {cycle?.name
              ? `Scope charter for "${cycle.name}" — threat scenarios, measurable success criteria, reasoned exclusions, escalation and roles.`
              : 'Scope charter for this cycle.'}
          </SheetDescription>
        </SheetHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
            {!editable && (
              <div className="flex items-start gap-2 rounded-md border border-border bg-muted/40 p-3 text-sm">
                <Lock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="text-muted-foreground">
                  {isPlanning
                    ? 'You do not have permission to edit this charter.'
                    : 'The charter is frozen. It can only be edited while the cycle is in planning; activating the cycle locks it in.'}
                </span>
              </div>
            )}

            {/* Scope & objectives */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Scope &amp; Objectives</CardTitle>
                <CardDescription>Frame scope by what the cycle defends against.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ListField
                  control={control}
                  name="threat_scenarios"
                  label="Threat scenarios"
                  description="What this cycle defends against (e.g. ransomware via exposed RDP)."
                  placeholder="e.g. Ransomware via exposed RDP"
                  addLabel="Add threat scenario"
                  editable={editable}
                />
                <ListField
                  control={control}
                  name="objectives"
                  label="Objectives"
                  placeholder="e.g. Reduce KEV exposure on internet-facing assets"
                  addLabel="Add objective"
                  editable={editable}
                  numbered
                />
                <ListField
                  control={control}
                  name="business_priorities"
                  label="Business priorities"
                  placeholder="e.g. Protect the customer payment platform"
                  addLabel="Add business priority"
                  editable={editable}
                />
                <ListField
                  control={control}
                  name="in_scope_services"
                  label="In-scope services"
                  description="Business services in scope. Drives the activation scope snapshot."
                  placeholder="e.g. Checkout API"
                  addLabel="Add in-scope service"
                  editable={editable}
                />
              </CardContent>
            </Card>

            {/* Risk & success */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Risk &amp; Success</CardTitle>
                <CardDescription>
                  How much risk is acceptable and how success is measured.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="risk_appetite">Risk appetite</Label>
                  {editable ? (
                    <Controller
                      control={control}
                      name="risk_appetite"
                      render={({ field }) => (
                        <Textarea
                          id="risk_appetite"
                          placeholder="e.g. No critical KEV exposures tolerated on internet-facing assets; medium risk accepted internally."
                          className="min-h-16"
                          {...field}
                        />
                      )}
                    />
                  ) : (
                    <ReadOnlyText value={watched.risk_appetite} />
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Success criteria</Label>
                    <span className="text-xs text-muted-foreground">
                      Measurable = name + metric + target
                    </span>
                  </div>
                  {editable ? (
                    <div className="space-y-3">
                      {successCriteria.fields.map((row, index) => (
                        <div
                          key={row.id}
                          className="grid grid-cols-1 gap-2 rounded-md border border-border p-3 sm:grid-cols-[1fr_1fr_1fr_auto]"
                        >
                          <Controller
                            control={control}
                            name={`success_criteria.${index}.name`}
                            render={({ field }) => (
                              <Input placeholder="Name (e.g. KEV remediation)" {...field} />
                            )}
                          />
                          <Controller
                            control={control}
                            name={`success_criteria.${index}.metric`}
                            render={({ field }) => (
                              <Input placeholder="Metric (e.g. MTTR)" {...field} />
                            )}
                          />
                          <Controller
                            control={control}
                            name={`success_criteria.${index}.target`}
                            render={({ field }) => (
                              <Input placeholder="Target (e.g. < 14 days)" {...field} />
                            )}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0"
                            onClick={() => successCriteria.remove(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="w-fit"
                        onClick={() => successCriteria.append({ name: '', metric: '', target: '' })}
                      >
                        <Plus className="h-4 w-4" />
                        Add success criterion
                      </Button>
                    </div>
                  ) : watched.success_criteria.filter((c) => c.name || c.metric || c.target)
                      .length === 0 ? (
                    <p className="text-sm text-muted-foreground">Not set</p>
                  ) : (
                    <ul className="space-y-1 text-sm">
                      {watched.success_criteria
                        .filter((c) => c.name || c.metric || c.target)
                        .map((c, i) => (
                          <li key={i}>
                            <span className="font-medium">{c.name || 'Untitled'}</span>
                            {(c.metric || c.target) && (
                              <span className="text-muted-foreground">
                                {' '}
                                — {c.metric || 'no metric'}: {c.target || 'no target'}
                              </span>
                            )}
                          </li>
                        ))}
                    </ul>
                  )}

                  {editable && warnings.length > 0 && (
                    <div className="flex items-start gap-2 rounded-md border border-border bg-muted/40 p-2 text-xs text-muted-foreground">
                      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <ul className="space-y-1">
                        {warnings.map((w, i) => (
                          <li key={i}>{w}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Exclusions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Exclusions</CardTitle>
                <CardDescription>
                  What is deliberately out of scope — and the reason, so a deferral is a decision,
                  not a silent gap.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {editable ? (
                  <div className="space-y-3">
                    {exclusions.fields.map((row, index) => (
                      <div
                        key={row.id}
                        className="grid grid-cols-1 gap-2 rounded-md border border-border p-3 sm:grid-cols-[1fr_1.5fr_auto]"
                      >
                        <Controller
                          control={control}
                          name={`exclusions.${index}.item`}
                          render={({ field }) => (
                            <Input placeholder="Excluded item (e.g. Legacy VPN)" {...field} />
                          )}
                        />
                        <Controller
                          control={control}
                          name={`exclusions.${index}.reason`}
                          render={({ field }) => (
                            <Input
                              placeholder="Reason (e.g. Decommissioned next quarter)"
                              {...field}
                            />
                          )}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0"
                          onClick={() => exclusions.remove(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="w-fit"
                      onClick={() => exclusions.append({ item: '', reason: '' })}
                    >
                      <Plus className="h-4 w-4" />
                      Add exclusion
                    </Button>
                  </div>
                ) : watched.exclusions.filter((e) => e.item || e.reason).length === 0 ? (
                  <p className="text-sm text-muted-foreground">Not set</p>
                ) : (
                  <ul className="space-y-1 text-sm">
                    {watched.exclusions
                      .filter((e) => e.item || e.reason)
                      .map((e, i) => (
                        <li key={i}>
                          <span className="font-medium">{e.item || 'Untitled'}</span>
                          {e.reason && <span className="text-muted-foreground"> — {e.reason}</span>}
                        </li>
                      ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            {/* Governance */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Escalation, Roles &amp; Timeline</CardTitle>
                <CardDescription>Who owns the cycle and where blockers escalate.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="escalation_path">Escalation path</Label>
                  {editable ? (
                    <Controller
                      control={control}
                      name="escalation_path"
                      render={({ field }) => (
                        <Textarea
                          id="escalation_path"
                          placeholder="Who blockers escalate to (person, role or channel)."
                          className="min-h-16"
                          {...field}
                        />
                      )}
                    />
                  ) : (
                    <ReadOnlyText value={watched.escalation_path} />
                  )}
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <RoleField
                    control={control}
                    name="roles.sponsor"
                    label="Sponsor"
                    value={watched.roles.sponsor}
                    editable={editable}
                  />
                  <RoleField
                    control={control}
                    name="roles.operator"
                    label="Operator"
                    value={watched.roles.operator}
                    editable={editable}
                  />
                  <RoleField
                    control={control}
                    name="roles.engineering_partner"
                    label="Engineering partner"
                    value={watched.roles.engineering_partner}
                    editable={editable}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="timeline">Timeline</Label>
                  {editable ? (
                    <Controller
                      control={control}
                      name="timeline"
                      render={({ field }) => (
                        <Input
                          id="timeline"
                          placeholder="e.g. 90-day cycle, weekly triage"
                          {...field}
                        />
                      )}
                    />
                  ) : (
                    <ReadOnlyText value={watched.timeline} />
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <SheetFooter className="flex-row justify-end gap-2 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {editable ? 'Cancel' : 'Close'}
            </Button>
            {isPlanning && (
              <Can permission={Permission.CTEMCyclesWrite} mode="disable">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                  Save Charter
                </Button>
              </Can>
            )}
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}

/** String-list field: editable via DynamicListInput, read-only as a bullet list. */
function ListField({
  control,
  name,
  label,
  description,
  placeholder,
  addLabel,
  editable,
  numbered,
}: {
  control: ReturnType<typeof useForm<CharterFormData>>['control']
  name: 'threat_scenarios' | 'objectives' | 'business_priorities' | 'in_scope_services'
  label: string
  description?: string
  placeholder: string
  addLabel: string
  editable: boolean
  numbered?: boolean
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
      <Controller
        control={control}
        name={name}
        render={({ field }) =>
          editable ? (
            <DynamicListInput
              items={field.value}
              onChange={field.onChange}
              placeholder={placeholder}
              addLabel={addLabel}
              numbered={numbered}
            />
          ) : (
            <ReadOnlyList items={field.value} />
          )
        }
      />
    </div>
  )
}

function RoleField({
  control,
  name,
  label,
  value,
  editable,
}: {
  control: ReturnType<typeof useForm<CharterFormData>>['control']
  name: 'roles.sponsor' | 'roles.operator' | 'roles.engineering_partner'
  label: string
  value: string
  editable: boolean
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      {editable ? (
        <Controller
          control={control}
          name={name}
          render={({ field }) => <Input id={name} placeholder={label} {...field} />}
        />
      ) : (
        <ReadOnlyText value={value} />
      )}
    </div>
  )
}
