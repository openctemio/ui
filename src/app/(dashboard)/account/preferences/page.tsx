'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Palette, Globe, Bell, Clock, Calendar, Save, Loader2, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { getErrorMessage } from '@/lib/api/error-handler'
import { useTheme } from 'next-themes'
import {
  usePreferences,
  useUpdatePreferences,
  SUPPORTED_LANGUAGES,
  SUPPORTED_TIMEZONES,
  DATE_FORMATS,
} from '@/features/account'
import type { UpdatePreferencesInput } from '@/features/account'

export default function PreferencesPage() {
  const { theme, setTheme } = useTheme()
  const { preferences, isLoading, mutate } = usePreferences()
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

  // Populate form when preferences load
  useEffect(() => {
    if (preferences) {
      setFormData({
        theme: preferences.theme || 'system',
        language: preferences.language || 'en',
        timezone: preferences.timezone || 'UTC',
        date_format: preferences.date_format || 'DD/MM/YYYY',
        time_format: preferences.time_format || '24h',
        email_notifications: preferences.email_notifications || {
          security_alerts: true,
          weekly_digest: true,
          scan_completed: true,
          new_findings: true,
          team_updates: true,
        },
        desktop_notifications: preferences.desktop_notifications || false,
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

  // Save preferences
  const handleSave = async () => {
    try {
      const result = await updatePreferences(formData)
      if (result) {
        mutate(result)
        setHasChanges(false)
        toast.success('Preferences saved successfully')
      }
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

  // Loading state
  if (isLoading) {
    return (
      <div className="grid gap-6">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  return (
    <div className="grid gap-6">
      {/* Appearance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Appearance
          </CardTitle>
          <CardDescription>Customize how Rediver looks on your device</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Theme</Label>
            <div className="flex gap-2">
              {(['light', 'dark', 'system'] as const).map((t) => (
                <Button
                  key={t}
                  variant={formData.theme === t ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleChange('theme', t)}
                  className="flex-1"
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </Button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {formData.theme === 'system'
                ? 'Automatically switch based on your system settings'
                : `Always use ${formData.theme} mode`}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Localization */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Localization
          </CardTitle>
          <CardDescription>Language, timezone, and format preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Language */}
            <div className="space-y-2">
              <Label htmlFor="language">Language</Label>
              <Select
                value={formData.language}
                onValueChange={(value) => handleChange('language', value)}
              >
                <SelectTrigger id="language">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <SelectItem key={lang.value} value={lang.value}>
                      {lang.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Timezone */}
            <div className="space-y-2">
              <Label htmlFor="timezone" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Timezone
              </Label>
              <Select
                value={formData.timezone}
                onValueChange={(value) => handleChange('timezone', value)}
              >
                <SelectTrigger id="timezone">
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
          </div>

          <Separator />

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Date Format */}
            <div className="space-y-2">
              <Label htmlFor="date-format" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Date Format
              </Label>
              <Select
                value={formData.date_format}
                onValueChange={(value) => handleChange('date_format', value)}
              >
                <SelectTrigger id="date-format">
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

            {/* Time Format */}
            <div className="space-y-2">
              <Label htmlFor="time-format">Time Format</Label>
              <Select
                value={formData.time_format}
                onValueChange={(value) => handleChange('time_format', value as '12h' | '24h')}
              >
                <SelectTrigger id="time-format">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="24h">24-hour (14:30)</SelectItem>
                  <SelectItem value="12h">12-hour (2:30 PM)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications
          </CardTitle>
          <CardDescription>Manage how you receive notifications</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Desktop Notifications */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Desktop Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Receive push notifications in your browser
              </p>
            </div>
            <Switch
              checked={formData.desktop_notifications}
              onCheckedChange={(checked) => handleChange('desktop_notifications', checked)}
            />
          </div>

          <Separator />

          {/* Email Notifications */}
          <div className="space-y-4">
            <Label>Email Notifications</Label>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Security Alerts</p>
                  <p className="text-xs text-muted-foreground">
                    Login attempts, password changes, and security events
                  </p>
                </div>
                <Switch
                  checked={formData.email_notifications?.security_alerts}
                  onCheckedChange={(checked) =>
                    handleEmailNotificationChange('security_alerts', checked)
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Weekly Digest</p>
                  <p className="text-xs text-muted-foreground">
                    Summary of findings and activity from the past week
                  </p>
                </div>
                <Switch
                  checked={formData.email_notifications?.weekly_digest}
                  onCheckedChange={(checked) =>
                    handleEmailNotificationChange('weekly_digest', checked)
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Scan Completed</p>
                  <p className="text-xs text-muted-foreground">
                    Get notified when security scans finish
                  </p>
                </div>
                <Switch
                  checked={formData.email_notifications?.scan_completed}
                  onCheckedChange={(checked) =>
                    handleEmailNotificationChange('scan_completed', checked)
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">New Findings</p>
                  <p className="text-xs text-muted-foreground">
                    Alerts for critical and high severity findings
                  </p>
                </div>
                <Switch
                  checked={formData.email_notifications?.new_findings}
                  onCheckedChange={(checked) =>
                    handleEmailNotificationChange('new_findings', checked)
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Team Updates</p>
                  <p className="text-xs text-muted-foreground">
                    Member invitations, role changes, and team activity
                  </p>
                </div>
                <Switch
                  checked={formData.email_notifications?.team_updates}
                  onCheckedChange={(checked) =>
                    handleEmailNotificationChange('team_updates', checked)
                  }
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={handleReset}>
          <RotateCcw className="mr-2 h-4 w-4" />
          Reset to Defaults
        </Button>
        <Button onClick={handleSave} disabled={!hasChanges || isUpdating}>
          {isUpdating ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          {isUpdating ? 'Saving...' : 'Save Preferences'}
        </Button>
      </div>
    </div>
  )
}
