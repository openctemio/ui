'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
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
import { Palette, Globe, Clock, Calendar, Save, Loader2, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { getErrorMessage } from '@/lib/api/error-handler'
import { useTheme } from 'next-themes'
import {
  usePreferences,
  useUpdatePreferences,
  getLocalPreferences,
  mergeLocalPreferences,
  SUPPORTED_TIMEZONES,
  DATE_FORMATS,
} from '@/features/account'
import type { UpdatePreferencesInput } from '@/features/account'

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
  const { preferences, isLoading, mutate } = usePreferences()
  const { updatePreferences, isUpdating } = useUpdatePreferences()

  // Form state
  const [formData, setFormData] = useState<UpdatePreferencesInput>({
    theme: 'system',
    language: 'en',
    timezone: 'UTC',
    date_format: 'DD/MM/YYYY',
    time_format: '24h',
  })
  const [hasChanges, setHasChanges] = useState(false)

  // Populate form when preferences load.
  // The backend only stores `theme` + `language`. The remaining fields
  // (timezone, date/time format) have no backend column, so they are
  // persisted in localStorage — otherwise a
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

  // Save preferences.
  // Split the write: theme + language go to the server (the only fields it
  // persists); the display preferences are browser-local, so
  // they are written to localStorage. Sending the phantom fields to the API
  // was a no-op (silently dropped), which is the bug this fixes.
  const handleSave = async () => {
    try {
      // Merge: the same browser-local object also holds the desktop
      // notification choice, which /account/notifications owns.
      mergeLocalPreferences({
        timezone: formData.timezone,
        date_format: formData.date_format,
        time_format: formData.time_format,
      })
      const result = await updatePreferences({
        theme: formData.theme,
        language: formData.language,
      })
      if (result) {
        mutate(result)
      }
      setHasChanges(false)
      toast.success('Preferences saved successfully')
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
          <CardDescription>Customize how OpenCTEM looks on your device</CardDescription>
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
                  {PREF_LANGUAGES.map((lang) => (
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

      {/* Actions */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={handleReset}>
          <RotateCcw className="me-2 h-4 w-4" />
          Reset to Defaults
        </Button>
        <Button onClick={handleSave} disabled={!hasChanges || isUpdating}>
          {isUpdating ? (
            <Loader2 className="me-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="me-2 h-4 w-4" />
          )}
          {isUpdating ? 'Saving...' : 'Save Preferences'}
        </Button>
      </div>
    </div>
  )
}
