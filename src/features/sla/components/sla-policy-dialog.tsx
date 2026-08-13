'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { getErrorMessage } from '@/lib/api/error-handler'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { SEVERITY_DOT_COLORS } from '@/lib/severity-colors'
import { cn } from '@/lib/utils'

import {
  slaPolicySchema,
  DEFAULT_SLA_FORM,
  type SlaPolicyFormData,
} from '../schemas/sla-policy-schema'
import {
  useCreateSlaPolicy,
  useUpdateSlaPolicy,
  invalidateSlaPoliciesCache,
  type SlaPolicy,
} from '../api/use-sla-policies-api'

interface SlaPolicyDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** When set, the dialog edits this policy; otherwise it creates a new one. */
  policy?: SlaPolicy | null
  onSuccess?: () => void
}

const SEVERITY_DAY_FIELDS: {
  name: keyof Pick<
    SlaPolicyFormData,
    'critical_days' | 'high_days' | 'medium_days' | 'low_days' | 'info_days'
  >
  label: string
  dot: 'critical' | 'high' | 'medium' | 'low' | 'info'
}[] = [
  { name: 'critical_days', label: 'Critical', dot: 'critical' },
  { name: 'high_days', label: 'High', dot: 'high' },
  { name: 'medium_days', label: 'Medium', dot: 'medium' },
  { name: 'low_days', label: 'Low', dot: 'low' },
  { name: 'info_days', label: 'Info', dot: 'info' },
]

function toFormData(policy: SlaPolicy): SlaPolicyFormData {
  return {
    name: policy.name,
    description: policy.description ?? '',
    is_default: policy.is_default,
    critical_days: policy.critical_days,
    high_days: policy.high_days,
    medium_days: policy.medium_days,
    low_days: policy.low_days,
    info_days: policy.info_days,
    warning_threshold_pct: policy.warning_threshold_pct,
    escalation_enabled: policy.escalation_enabled,
  }
}

export function SlaPolicyDialog({ open, onOpenChange, policy, onSuccess }: SlaPolicyDialogProps) {
  const isEdit = Boolean(policy)

  const form = useForm<SlaPolicyFormData>({
    resolver: zodResolver(slaPolicySchema),
    defaultValues: DEFAULT_SLA_FORM,
  })

  // Re-seed the form whenever the target policy (or open state) changes.
  useEffect(() => {
    if (open) {
      form.reset(policy ? toFormData(policy) : DEFAULT_SLA_FORM)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, policy])

  const { trigger: createPolicy, isMutating: isCreating } = useCreateSlaPolicy()
  const { trigger: updatePolicy, isMutating: isUpdating } = useUpdateSlaPolicy()
  const isMutating = isCreating || isUpdating

  const onSubmit = async (data: SlaPolicyFormData) => {
    const payload = {
      name: data.name,
      description: data.description || '',
      is_default: data.is_default,
      critical_days: data.critical_days,
      high_days: data.high_days,
      medium_days: data.medium_days,
      low_days: data.low_days,
      info_days: data.info_days,
      warning_threshold_pct: data.warning_threshold_pct,
      escalation_enabled: data.escalation_enabled,
    }
    try {
      if (isEdit && policy) {
        await updatePolicy({ id: policy.id, ...payload })
        toast.success(`Policy "${data.name}" updated`)
      } else {
        await createPolicy(payload)
        toast.success(`Policy "${data.name}" created`)
      }
      await invalidateSlaPoliciesCache()
      onOpenChange(false)
      onSuccess?.()
    } catch (err) {
      toast.error(getErrorMessage(err, `Failed to ${isEdit ? 'update' : 'create'} SLA policy`))
    }
  }

  const numberChange =
    (field: { onChange: (v: number) => void }) => (e: React.ChangeEvent<HTMLInputElement>) =>
      field.onChange(e.target.value === '' ? NaN : Number(e.target.value))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit SLA Policy' : 'New SLA Policy'}</DialogTitle>
          <DialogDescription>
            Set the remediation window (in days) for each severity. Findings breach their SLA when
            they remain open past the deadline computed from these windows.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Production SLA" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Applied to production-facing assets"
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Separator />

            <div className="space-y-4">
              <h4 className="text-sm font-medium">Remediation windows (days)</h4>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
                {SEVERITY_DAY_FIELDS.map((sev) => (
                  <FormField
                    key={sev.name}
                    control={form.control}
                    name={sev.name}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1.5">
                          <span
                            className={cn('h-2 w-2 rounded-full', SEVERITY_DOT_COLORS[sev.dot])}
                          />
                          {sev.label}
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={1}
                            max={365}
                            {...field}
                            value={Number.isNaN(field.value) ? '' : field.value}
                            onChange={numberChange(field)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ))}
              </div>
            </div>

            <FormField
              control={form.control}
              name="warning_threshold_pct"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Warning threshold (%)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      className="max-w-[140px]"
                      {...field}
                      value={Number.isNaN(field.value) ? '' : field.value}
                      onChange={numberChange(field)}
                    />
                  </FormControl>
                  <FormDescription>
                    A finding is flagged &quot;warning&quot; once this percentage of its window has
                    elapsed.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Separator />

            <FormField
              control={form.control}
              name="is_default"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Default policy</FormLabel>
                    <FormDescription>
                      Apply to every asset without a specific SLA policy.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="escalation_enabled"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Escalation</FormLabel>
                    <FormDescription>
                      Notify on approaching and breached deadlines for this policy.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isMutating}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isMutating}>
                {isMutating && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                {isEdit ? 'Save changes' : 'Create policy'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
