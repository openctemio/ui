'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Save, Loader2, RotateCcw } from 'lucide-react'
import { ErrorState } from '@/features/shared'
import { toast } from 'sonner'
import { getErrorMessage } from '@/lib/api/error-handler'
import { useTheme } from 'next-themes'
import {
  usePreferences,
  useUpdatePreferences,
  getLocalPreferences,
  setLocalPreferences,
  SUPPORTED_TIMEZONES,
  DATE_FORMATS,
} from '@/features/account'
import type { UpdatePreferencesInput, UserPreferences } from '@/features/account'

// The backend only persists user-preference `language` when it is one of
// these (`oneof=en vi` in the API validator). Offering ja/ko/zh here made
// the whole Save fail with a 422. Restrict the dropdown to what round-trips.
// (The org-level general/tenant settings validate a wider set — that is a
// separate endpoint and unaffected.)
const PREF_LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'vi', label: 'Tiếng Việt' },
] as const

export default function PreferencesPage() {
  const { theme, setTheme } = useTheme()
  const { preferences, isLoading, isError, error, mutate } = usePreferences()
  const { updatePreferences, isUpdating } = useUpdatePreferences()

  // Form state
  const [formData, setFormData] = useState<UpdatePreferencesInput>({
    theme: 'system',
    language: 'en',
    timezone: 'UTC',
    date_format: 'DD/MM/YYYY',
    time_format: '24h',
    email_notifications: {
      security_alerts: true,
      weekly_digest: true,
      scan_completed: true,
      new_findings: true,
      team_updates: true,
    },
    desktop_notifications: false,
  })
  const [hasChanges, setHasChanges] = useState(false)

  // Populate form when preferences load.
  // The backend only stores `theme` + `language`. The remaining fields
  // (timezone, date/time format, desktop + email notification toggles) have
  // no backend column, so they are persisted in localStorage — otherwise a
  // Save followed by a reload would silently lose them. This mirrors the
  // browser-local Display Preferences on the General Settings page.
  useEffect(() => {
    if (preferences) {
      const local = getLocalPreferences() || {}
      setFormData({
        theme: preferences.theme || 'system',
        language: preferences.language || 'en',
        timezone: local.timezone || 'UTC',
        date_format: local.date_format || 'DD/MM/YYYY',
        time_format: local.time_format || '24h',
        email_notifications: local.email_notifications || {
          security_alerts: true,
          weekly_digest: true,
          scan_completed: true,
          new_findings: true,
          team_updates: true,
        },
        desktop_notifications: local.desktop_notifications ?? false,
      })
      setHasChanges(false)
    }
  }, [preferences])

  // Sync theme with next-themes
  useEffect(() => {
    if (formData.theme && formData.theme !== theme) {
      // Only sync if different to avoid loops
    }
  }, [formData.theme, theme])

  // Handle field change
  const handleChange = <K extends keyof UpdatePreferencesInput>(
    field: K,
    value: UpdatePreferencesInput[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    setHasChanges(true)

    // Immediately apply theme change
    if (field === 'theme' && typeof value === 'string') {
      setTheme(value)
    }
  }

  // Handle email notification change
  const handleEmailNotificationChange = (
    key: keyof NonNullable<UpdatePreferencesInput['email_notifications']>,
    value: boolean
  ) => {
    setFormData((prev) => ({
      ...prev,
      email_notifications: {
        ...prev.email_notifications,
        [key]: value,
      },
    }))
    setHasChanges(true)
  }

  // Save preferences.
  // Split the write: theme + language go to the server (the only fields it
  // persists); the display + notification preferences are browser-local, so
  // they are written to localStorage. Sending the phantom fields to the API
  // was a no-op (silently dropped), which is the bug this fixes.
  const handleSave = async () => {
    try {
      setLocalPreferences({
        timezone: formData.timezone,
        date_format: formData.date_format,
        time_format: formData.time_format,
        // formData is seeded with all notification keys, so this is always a
        // full object at runtime — the input type just declares them Partial.
        email_notifications: formData.email_notifications as UserPreferences['email_notifications'],
        desktop_notifications: formData.desktop_notifications,
      })
      const result = await updatePreferences({
        theme: formData.theme,
        language: formData.language,
      })
      if (result) {
        mutate(result)
      }
      setHasChanges(false)
      toast.success('Preferences saved')
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to save preferences'))
    }
  }

  // Reset to defaults
  const handleReset = () => {
    const defaults: UpdatePreferencesInput = {
      theme: 'system',
      language: 'en',
      timezone: 'UTC',
      date_format: 'DD/MM/YYYY',
      time_format: '24h',
      email_notifications: {
        security_alerts: true,
        weekly_digest: true,
        scan_completed: true,
        new_findings: true,
        team_updates: true,
      },
      desktop_notifications: false,
    }
    setFormData(defaults)
    setTheme('system')
    setHasChanges(true)
    toast.info('Preferences reset to defaults (unsaved)')
  }

  if (isLoading) {
    return <Skeleton className="h-[640px] w-full" />
  }

  if (isError) {
    return <ErrorState title="your preferences" error={error} onRetry={() => void mutate()} />
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Preferences</CardTitle>
        <CardDescription>How OpenCTEM looks and behaves for you.</CardDescription>
        <CardAction className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RotateCcw className="h-4 w-4" />
            <span className="hidden sm:inline">Reset</span>
            <span className="sr-only sm:hidden">Reset to defaults</span>
          </Button>
          <Button size="sm" onClick={handleSave} disabled={!hasChanges || isUpdating}>
            {isUpdating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save changes
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-6">
        <section className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold">Appearance</h3>
            <p className="text-sm text-muted-foreground">Applies as soon as you pick it.</p>
          </div>
          <div className="flex gap-2" role="group" aria-label="Theme">
            {(['light', 'dark', 'system'] as const).map((t) => (
              <Button
                key={t}
                variant={formData.theme === t ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleChange('theme', t)}
                className="flex-1"
                aria-pressed={formData.theme === t}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </Button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            {formData.theme === 'system'
              ? 'Follows your device setting.'
              : `Always uses ${formData.theme} mode.`}
          </p>
        </section>

        <Separator />

        <section className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold">Language and region</h3>
            <p className="text-sm text-muted-foreground">
              Language is saved to your account; time zone and formats are saved in this browser.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="min-w-0 space-y-2">
              <Label htmlFor="language">Language</Label>
              <Select
                value={formData.language}
                onValueChange={(value) => handleChange('language', value)}
              >
                <SelectTrigger id="language" className="w-full min-w-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PREF_LANGUAGES.map((lang) => (
                    <SelectItem key={lang.value} value={lang.value}>
                      {lang.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="min-w-0 space-y-2">
              <Label htmlFor="timezone">Time zone</Label>
              <Select
                value={formData.timezone}
                onValueChange={(value) => handleChange('timezone', value)}
              >
                <SelectTrigger id="timezone" className="w-full min-w-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SUPPORTED_TIMEZONES.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="min-w-0 space-y-2">
              <Label htmlFor="date-format">Date format</Label>
              <Select
                value={formData.date_format}
                onValueChange={(value) => handleChange('date_format', value)}
              >
                <SelectTrigger id="date-format" className="w-full min-w-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DATE_FORMATS.map((fmt) => (
                    <SelectItem key={fmt.value} value={fmt.value}>
                      {fmt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="min-w-0 space-y-2">
              <Label htmlFor="time-format">Time format</Label>
              <Select
                value={formData.time_format}
                onValueChange={(value) => handleChange('time_format', value as '12h' | '24h')}
              >
                <SelectTrigger id="time-format" className="w-full min-w-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="24h">24-hour (14:30)</SelectItem>
                  <SelectItem value="12h">12-hour (2:30 PM)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </section>

        <Separator />

        <section className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold">Notifications</h3>
            <p className="text-sm text-muted-foreground">Saved in this browser.</p>
          </div>

          <ToggleRow
            id="desktop-notifications"
            label="Desktop notifications"
            description="Push notifications in your browser."
            checked={!!formData.desktop_notifications}
            onChange={(checked) => handleChange('desktop_notifications', checked)}
          />

          <div className="space-y-3">
            <p className="text-sm font-medium">Email</p>
            {EMAIL_TOGGLES.map((t) => (
              <ToggleRow
                key={t.key}
                id={`email-${t.key}`}
                label={t.label}
                description={t.description}
                checked={!!formData.email_notifications?.[t.key]}
                onChange={(checked) => handleEmailNotificationChange(t.key, checked)}
              />
            ))}
          </div>
        </section>
      </CardContent>
    </Card>
  )
}

type EmailToggleKey = keyof NonNullable<UpdatePreferencesInput['email_notifications']>

const EMAIL_TOGGLES: { key: EmailToggleKey; label: string; description: string }[] = [
  {
    key: 'security_alerts',
    label: 'Security alerts',
    description: 'Sign-in attempts, password changes and other security events.',
  },
  {
    key: 'weekly_digest',
    label: 'Weekly digest',
    description: 'A summary of findings and activity from the past week.',
  },
  {
    key: 'scan_completed',
    label: 'Scan completed',
    description: 'When a security scan finishes.',
  },
  {
    key: 'new_findings',
    label: 'New findings',
    description: 'Critical and high severity findings.',
  },
  {
    key: 'team_updates',
    label: 'Team updates',
    description: 'Invitations, role changes and team activity.',
  },
]

function ToggleRow({
  id,
  label,
  description,
  checked,
  onChange,
}: {
  id: string
  label: string
  description: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <Label htmlFor={id} className="text-sm font-normal">
          {label}
        </Label>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  )
}
