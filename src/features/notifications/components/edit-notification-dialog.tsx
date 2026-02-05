'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import {
  Loader2,
  Bell,
  MessageSquare,
  Send,
  Webhook,
  ChevronDown,
  Settings2,
  Mail,
} from 'lucide-react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Slider } from '@/components/ui/slider'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { Integration } from '@/features/integrations'
import {
  ALL_NOTIFICATION_SEVERITIES,
  DEFAULT_ENABLED_SEVERITIES,
  type NotificationSeverity,
} from '@/features/integrations/types/integration.types'
import { useTenantEventTypes } from '@/features/integrations/api/use-event-types'
import { cn } from '@/lib/utils'
import { getErrorMessage } from '@/lib/api/error-handler'

// Template presets for different use cases
const TEMPLATE_PRESETS = [
  {
    id: 'default',
    name: 'Default',
    template: '',
    description: 'Use system default template',
  },
  {
    id: 'detailed',
    name: 'Detailed Report',
    template: `**{severity} Alert: {title}**

{body}

---
View details: {url}
Timestamp: {timestamp}`,
    description: 'Full details with all fields',
  },
  {
    id: 'minimal',
    name: 'Minimal Alert',
    template: `{title}
{url}`,
    description: 'Title and link only',
  },
  {
    id: 'emoji',
    name: 'With Severity Emoji',
    template: `{severity_emoji} [{severity}] {title}

{body}

{url}`,
    description: 'Includes severity emoji indicator',
  },
  {
    id: 'custom',
    name: 'Custom',
    template: '',
    description: 'Write your own template',
  },
]

const formSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional(),
  credentials: z.string().optional(),
  channel_id: z.string().optional(),
  channel_name: z.string().optional(),
  // Severity filters (dynamic JSONB array)
  enabled_severities: z.array(z.enum(['critical', 'high', 'medium', 'low', 'info', 'none'])),
  // Event type filters (dynamic JSONB array)
  enabled_event_types: z.array(z.string()),
  // Advanced settings
  message_template: z.string().max(2000).optional(),
  include_details: z.boolean(),
  min_interval_minutes: z.number().min(0).max(60),
  // Email-specific fields
  smtp_host: z.string().optional(),
  smtp_port: z.number().optional(),
  smtp_username: z.string().optional(),
  smtp_password: z.string().optional(),
  from_email: z.string().email().optional().or(z.literal('')),
  from_name: z.string().optional(),
  to_emails: z.string().optional(),
  use_tls: z.boolean().optional(),
  use_starttls: z.boolean().optional(),
})

type FormValues = z.infer<typeof formSchema>

interface EditNotificationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  integration: Integration
  onSuccess?: () => Promise<void>
}

const PROVIDER_CONFIG: Record<
  string,
  { icon: typeof Bell; color: string; bgColor: string; credentialLabel: string }
> = {
  slack: {
    icon: MessageSquare,
    color: 'text-[#4A154B]',
    bgColor: 'bg-[#4A154B]/10',
    credentialLabel: 'Webhook URL',
  },
  teams: {
    icon: MessageSquare,
    color: 'text-[#6264A7]',
    bgColor: 'bg-[#6264A7]/10',
    credentialLabel: 'Webhook URL',
  },
  telegram: {
    icon: Send,
    color: 'text-[#0088cc]',
    bgColor: 'bg-[#0088cc]/10',
    credentialLabel: 'Bot Token',
  },
  email: {
    icon: Mail,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    credentialLabel: 'SMTP Password',
  },
  webhook: {
    icon: Webhook,
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    credentialLabel: 'Webhook URL',
  },
}

const PROVIDER_LABELS: Record<string, string> = {
  slack: 'Slack',
  teams: 'Microsoft Teams',
  telegram: 'Telegram',
  email: 'Email (SMTP)',
  webhook: 'Custom Webhook',
}

export function EditNotificationDialog({
  open,
  onOpenChange,
  integration,
  onSuccess,
}: EditNotificationDialogProps) {
  const ext = integration.notification_extension
  const providerConfig = PROVIDER_CONFIG[integration.provider] || PROVIDER_CONFIG.webhook
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [selectedPreset, setSelectedPreset] = useState('custom')
  const [templateTab, setTemplateTab] = useState<'edit' | 'preview'>('edit')

  // Get event types from API (database-driven, filtered by tenant's plan)
  // Only fetch when dialog is open (lazy loading)
  const {
    eventTypes: availableEventTypes,
    defaultEventIds,
    isLoading: eventTypesLoading,
  } = useTenantEventTypes(open)

  // Get default event type IDs (used as fallback)
  const defaultEventTypes = defaultEventIds

  const handlePresetChange = (presetId: string) => {
    setSelectedPreset(presetId)
    const preset = TEMPLATE_PRESETS.find((p) => p.id === presetId)
    if (preset && presetId !== 'custom') {
      setValue('message_template', preset.template)
    }
  }

  // Preview template with sample data
  const renderTemplatePreview = (template: string) => {
    if (!template) return 'Using default system template'

    const sampleData: Record<string, string> = {
      title: 'SQL Injection Vulnerability Detected',
      severity: 'CRITICAL',
      severity_emoji: '\u{1F6A8}',
      body: 'A potential SQL injection vulnerability was found in the login endpoint.',
      url: 'https://app.rediver.io/findings/123',
      timestamp: new Date().toLocaleString(),
    }

    let preview = template
    Object.entries(sampleData).forEach(([key, value]) => {
      preview = preview.replace(new RegExp(`\\{${key}\\}`, 'g'), value)
    })
    return preview
  }

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: integration.name,
      description: integration.description || '',
      credentials: '',
      channel_id: ext?.channel_id || '',
      channel_name: ext?.channel_name || '',
      // Severity defaults
      enabled_severities: ext?.enabled_severities ?? [...DEFAULT_ENABLED_SEVERITIES],
      // Event type defaults - will be updated by useEffect with module-filtered defaults
      enabled_event_types: ext?.enabled_event_types ?? [],
      // Advanced settings
      message_template: ext?.message_template || '',
      include_details: ext?.include_details ?? true,
      min_interval_minutes: ext?.min_interval_minutes ?? 0,
      // Email defaults (leave empty - user must re-enter for security)
      smtp_host: '',
      smtp_port: 587,
      smtp_username: '',
      smtp_password: '',
      from_email: '',
      from_name: 'Rediver.io',
      to_emails: '',
      use_tls: false,
      use_starttls: true,
    },
  })

  // Reset form when integration changes
  useEffect(() => {
    if (open) {
      // Get metadata from integration (non-sensitive config is now stored here)
      const metadata = integration.metadata || {}

      reset({
        name: integration.name,
        description: integration.description || '',
        credentials: '',
        // Read chat_id and channel_name from metadata (new location)
        channel_id: (metadata.chat_id as string) || '',
        channel_name: (metadata.channel_name as string) || '',
        // Severity defaults
        enabled_severities: ext?.enabled_severities ?? [...DEFAULT_ENABLED_SEVERITIES],
        // Event type defaults - use filtered defaults based on enabled modules
        enabled_event_types: ext?.enabled_event_types ?? defaultEventTypes,
        // Advanced settings
        message_template: ext?.message_template || '',
        include_details: ext?.include_details ?? true,
        min_interval_minutes: ext?.min_interval_minutes ?? 0,
        // Email config from metadata (non-sensitive fields)
        smtp_host: (metadata.smtp_host as string) || '',
        smtp_port: (metadata.smtp_port as number) || 587,
        smtp_username: '', // Sensitive - leave empty
        smtp_password: '', // Sensitive - leave empty
        from_email: (metadata.from_email as string) || '',
        from_name: (metadata.from_name as string) || 'Rediver.io',
        to_emails: Array.isArray(metadata.to_emails)
          ? (metadata.to_emails as string[]).join(', ')
          : '',
        use_tls: (metadata.use_tls as boolean) || false,
        use_starttls: (metadata.use_starttls as boolean) ?? true,
      })
      // Open advanced section if any advanced settings are configured
      setAdvancedOpen(!!(ext?.message_template || ext?.min_interval_minutes))
    }
  }, [open, integration, ext, reset, defaultEventTypes])

  const handleClose = () => {
    onOpenChange(false)
  }

  const onSubmit = async (data: FormValues) => {
    try {
      // Build credentials based on provider
      let credentials: string | undefined = data.credentials || undefined

      // For email provider, build JSON credentials only if any email field is filled
      if (integration.provider === 'email') {
        const hasEmailChanges =
          data.smtp_host ||
          data.smtp_username ||
          data.smtp_password ||
          data.from_email ||
          data.to_emails

        if (hasEmailChanges) {
          const toEmailsList = (data.to_emails || '')
            .split(',')
            .map((e) => e.trim())
            .filter((e) => e.length > 0)

          credentials = JSON.stringify({
            smtp_host: data.smtp_host,
            smtp_port: data.smtp_port,
            username: data.smtp_username,
            password: data.smtp_password,
            from_email: data.from_email,
            from_name: data.from_name,
            to_emails: toEmailsList.length > 0 ? toEmailsList : undefined,
            use_tls: data.use_tls,
            use_starttls: data.use_starttls,
            skip_verify: false,
          })
        }
      }

      const response = await fetch(`/api/v1/integrations/${integration.id}/notification`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          description: data.description,
          credentials,
          channel_id: data.channel_id,
          channel_name: data.channel_name,
          // Severity filters (dynamic JSONB array)
          enabled_severities: data.enabled_severities,
          // Event type filters (dynamic JSONB array)
          enabled_event_types: data.enabled_event_types,
          // Advanced settings
          message_template: data.message_template || undefined,
          include_details: data.include_details,
          min_interval_minutes: data.min_interval_minutes,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to update')
      }

      toast.success(`Notification channel "${data.name}" updated`)
      handleClose()
      await onSuccess?.()
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to update notification channel'))
    }
  }

  const Icon = providerConfig.icon

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-lg',
                providerConfig.bgColor
              )}
            >
              <Icon className={cn('h-4 w-4', providerConfig.color)} />
            </div>
            Edit {PROVIDER_LABELS[integration.provider] || 'Notification'} Channel
          </DialogTitle>
          <DialogDescription>
            Update the configuration for this notification channel
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
          {/* Scrollable content area */}
          <div className="space-y-4 py-4 overflow-y-auto flex-1 pr-1">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" placeholder="e.g., Security Alerts" {...register('name')} />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>

            {/* Non-email providers: single credential field */}
            {integration.provider !== 'email' && (
              <div className="space-y-2">
                <Label htmlFor="credentials">
                  {providerConfig.credentialLabel} (leave empty to keep current)
                </Label>
                <Input
                  id="credentials"
                  type="password"
                  placeholder="Enter new value to update..."
                  {...register('credentials')}
                />
              </div>
            )}

            {/* Email provider: SMTP configuration fields */}
            {integration.provider === 'email' && (
              <div className="space-y-4 rounded-lg border p-4 bg-muted/30">
                <p className="text-sm font-medium">
                  SMTP Configuration (leave empty to keep current)
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="edit_smtp_host">SMTP Host</Label>
                    <Input
                      id="edit_smtp_host"
                      placeholder="smtp.gmail.com"
                      {...register('smtp_host')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit_smtp_port">Port</Label>
                    <Input
                      id="edit_smtp_port"
                      type="number"
                      placeholder="587"
                      {...register('smtp_port', { valueAsNumber: true })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="edit_smtp_username">Username</Label>
                    <Input
                      id="edit_smtp_username"
                      placeholder="your@email.com"
                      {...register('smtp_username')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit_smtp_password">Password</Label>
                    <Input
                      id="edit_smtp_password"
                      type="password"
                      placeholder="App password"
                      {...register('smtp_password')}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="edit_from_email">From Email</Label>
                    <Input
                      id="edit_from_email"
                      type="email"
                      placeholder="alerts@company.com"
                      {...register('from_email')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit_from_name">From Name</Label>
                    <Input
                      id="edit_from_name"
                      placeholder="Rediver.io"
                      {...register('from_name')}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit_to_emails">Recipients</Label>
                  <Input
                    id="edit_to_emails"
                    placeholder="security@company.com, admin@company.com"
                    {...register('to_emails')}
                  />
                  <p className="text-xs text-muted-foreground">
                    Comma-separated list of email addresses
                  </p>
                </div>

                <div className="flex items-center gap-6">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="edit_use_starttls"
                      checked={watch('use_starttls')}
                      onCheckedChange={(checked) => setValue('use_starttls', !!checked)}
                    />
                    <label htmlFor="edit_use_starttls" className="text-sm cursor-pointer">
                      STARTTLS (Port 587)
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="edit_use_tls"
                      checked={watch('use_tls')}
                      onCheckedChange={(checked) => setValue('use_tls', !!checked)}
                    />
                    <label htmlFor="edit_use_tls" className="text-sm cursor-pointer">
                      Direct TLS (Port 465)
                    </label>
                  </div>
                </div>
              </div>
            )}

            {integration.provider === 'telegram' && (
              <div className="space-y-2">
                <Label htmlFor="channel_id">
                  Chat ID <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="channel_id"
                  placeholder="e.g., -1001234567890 or @channelname"
                  {...register('channel_id', { required: integration.provider === 'telegram' })}
                />
                <p className="text-xs text-muted-foreground">
                  Get your chat ID: Add @userinfobot to your group/channel. For groups/channels, use
                  the numeric ID (e.g., -1001234567890).
                </p>
              </div>
            )}

            {(integration.provider === 'slack' || integration.provider === 'teams') && (
              <div className="space-y-2">
                <Label htmlFor="channel_name">Channel Name (optional)</Label>
                <Input
                  id="channel_name"
                  placeholder="e.g., security-alerts"
                  {...register('channel_name')}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                placeholder="Describe the purpose of this channel..."
                className="resize-none"
                {...register('description')}
              />
            </div>

            <div className="space-y-3">
              <Label>Severity Filters</Label>
              <p className="text-xs text-muted-foreground">
                Select which severity levels should trigger notifications
              </p>
              <div className="grid grid-cols-3 gap-3">
                {ALL_NOTIFICATION_SEVERITIES.map((severity) => {
                  const enabledSeverities = watch('enabled_severities')
                  const isChecked = enabledSeverities.includes(severity.value)
                  const colorClass = {
                    critical: 'text-red-600',
                    high: 'text-orange-600',
                    medium: 'text-yellow-600',
                    low: 'text-blue-600',
                    info: 'text-gray-600',
                    none: 'text-gray-400',
                  }[severity.value]
                  return (
                    <div key={severity.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={`edit_severity_${severity.value}`}
                        checked={isChecked}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setValue('enabled_severities', [...enabledSeverities, severity.value])
                          } else {
                            setValue(
                              'enabled_severities',
                              enabledSeverities.filter(
                                (s: NotificationSeverity) => s !== severity.value
                              )
                            )
                          }
                        }}
                      />
                      <label
                        htmlFor={`edit_severity_${severity.value}`}
                        className={cn('text-sm font-normal cursor-pointer', colorClass)}
                      >
                        {severity.label}
                      </label>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="space-y-3">
              <Label>Event Types</Label>
              <p className="text-xs text-muted-foreground">
                Select which event types should be sent to this channel
                {eventTypesLoading && ' (loading...)'}
              </p>
              <div className="grid grid-cols-2 gap-3">
                {availableEventTypes.map((eventType) => {
                  const enabledTypes = watch('enabled_event_types')
                  const isChecked = enabledTypes.includes(eventType.id)
                  return (
                    <div key={eventType.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`edit_event_${eventType.id}`}
                        checked={isChecked}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setValue('enabled_event_types', [...enabledTypes, eventType.id])
                          } else {
                            setValue(
                              'enabled_event_types',
                              enabledTypes.filter((t) => t !== eventType.id)
                            )
                          }
                        }}
                      />
                      <label
                        htmlFor={`edit_event_${eventType.id}`}
                        className="text-sm font-normal cursor-pointer"
                      >
                        {eventType.name}
                      </label>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Advanced Settings */}
            <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
              <CollapsibleTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  className="flex w-full items-center justify-between p-0 h-auto hover:bg-transparent"
                >
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Settings2 className="h-4 w-4" />
                    Advanced Settings
                  </div>
                  <ChevronDown
                    className={cn('h-4 w-4 transition-transform', advancedOpen && 'rotate-180')}
                  />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 pt-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Message Template</Label>
                    <Select value={selectedPreset} onValueChange={handlePresetChange}>
                      <SelectTrigger className="w-[180px] h-8">
                        <SelectValue placeholder="Select preset" />
                      </SelectTrigger>
                      <SelectContent>
                        {TEMPLATE_PRESETS.map((preset) => (
                          <SelectItem key={preset.id} value={preset.id}>
                            {preset.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Tabs
                    value={templateTab}
                    onValueChange={(v) => setTemplateTab(v as 'edit' | 'preview')}
                  >
                    <TabsList className="grid w-full grid-cols-2 h-8">
                      <TabsTrigger value="edit" className="text-xs">
                        Edit
                      </TabsTrigger>
                      <TabsTrigger value="preview" className="text-xs">
                        Preview
                      </TabsTrigger>
                    </TabsList>
                    <TabsContent value="edit" className="mt-2">
                      <Textarea
                        id="edit_message_template"
                        placeholder="Custom notification message (leave empty for default)"
                        className="resize-none min-h-[100px] font-mono text-sm"
                        disabled={selectedPreset !== 'custom' && selectedPreset !== 'default'}
                        {...register('message_template')}
                      />
                      <p className="text-xs text-muted-foreground mt-2">
                        Variables: <code className="bg-muted px-1 rounded">{'{title}'}</code>{' '}
                        <code className="bg-muted px-1 rounded">{'{severity}'}</code>{' '}
                        <code className="bg-muted px-1 rounded">{'{severity_emoji}'}</code>{' '}
                        <code className="bg-muted px-1 rounded">{'{body}'}</code>{' '}
                        <code className="bg-muted px-1 rounded">{'{url}'}</code>{' '}
                        <code className="bg-muted px-1 rounded">{'{timestamp}'}</code>
                      </p>
                    </TabsContent>
                    <TabsContent value="preview" className="mt-2">
                      <div className="rounded-md border bg-muted/50 p-3 min-h-[100px]">
                        <pre className="text-sm whitespace-pre-wrap font-sans">
                          {renderTemplatePreview(watch('message_template') || '')}
                        </pre>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">Preview with sample data</p>
                    </TabsContent>
                  </Tabs>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="edit_include_details"
                    checked={watch('include_details')}
                    onCheckedChange={(checked) => setValue('include_details', !!checked)}
                  />
                  <label
                    htmlFor="edit_include_details"
                    className="text-sm font-normal cursor-pointer"
                  >
                    Include detailed information in notifications
                  </label>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="edit_min_interval">Rate Limiting</Label>
                    <span className="text-sm text-muted-foreground">
                      {watch('min_interval_minutes') === 0
                        ? 'No limit'
                        : `${watch('min_interval_minutes')} min`}
                    </span>
                  </div>
                  <Slider
                    id="edit_min_interval"
                    min={0}
                    max={60}
                    step={5}
                    value={[watch('min_interval_minutes')]}
                    onValueChange={([value]) => setValue('min_interval_minutes', value)}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    Minimum interval between notifications (0 = no limit). Prevents notification
                    spam.
                  </p>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>

          {/* Fixed footer with buttons */}
          <div className="flex justify-end gap-2 pt-4 border-t mt-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
