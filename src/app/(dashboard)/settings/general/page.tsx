'use client'

import { useEffect, useState } from 'react'
import { Main } from '@/components/layout'
import { PageHeader } from '@/features/shared'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Settings, Globe, Clock, Calendar, Save, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { useTenant } from '@/context/tenant-provider'
import {
  useTenantSettings,
  useUpdateGeneralSettings,
} from '@/features/organization/api/use-tenant-settings'
import { VALID_TIMEZONES, VALID_LANGUAGES } from '@/features/organization/types/settings.types'
import { getErrorMessage } from '@/lib/api/error-handler'

const LOCAL_SETTINGS_KEY = 'openctem_display_settings'

interface DisplaySettings {
  dateFormat: string
  timeFormat: string
  autoRefresh: boolean
  refreshInterval: string
  compactMode: boolean
}

const DEFAULT_DISPLAY: DisplaySettings = {
  dateFormat: 'DD/MM/YYYY',
  timeFormat: '24h',
  autoRefresh: true,
  refreshInterval: '60',
  compactMode: false,
}

function loadDisplaySettings(): DisplaySettings {
  if (typeof window === 'undefined') return DEFAULT_DISPLAY
  try {
    const stored = localStorage.getItem(LOCAL_SETTINGS_KEY)
    return stored ? { ...DEFAULT_DISPLAY, ...JSON.parse(stored) } : DEFAULT_DISPLAY
  } catch {
    return DEFAULT_DISPLAY
  }
}

function saveDisplaySettings(settings: DisplaySettings) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(settings))
  } catch {
    // Ignore localStorage errors
  }
}

function LoadingSkeleton() {
  return (
    <Main>
      <Skeleton className="mb-6 h-8 w-56" />
      <div className="grid gap-6">
        <Skeleton className="h-48 rounded-lg" />
        <Skeleton className="h-48 rounded-lg" />
        <Skeleton className="h-32 rounded-lg" />
      </div>
    </Main>
  )
}

export default function GeneralSettingsPage() {
  const { currentTenant } = useTenant()
  const tenantId = currentTenant?.id
  const { settings, isLoading } = useTenantSettings(tenantId)
  const { updateGeneralSettings, isUpdating } = useUpdateGeneralSettings(tenantId)

  const [timezone, setTimezone] = useState('')
  const [language, setLanguage] = useState('')
  const [display, setDisplay] = useState<DisplaySettings>(DEFAULT_DISPLAY)
  const [initialized, setInitialized] = useState(false)

  // Initialize from server settings + localStorage
  useEffect(() => {
    if (settings && !initialized) {
      setTimezone(settings.general.timezone || 'UTC')
      setLanguage(settings.general.language || 'en')
      setDisplay(loadDisplaySettings())
      setInitialized(true)
    }
  }, [settings, initialized])

  const handleSave = async () => {
    // Save display settings to localStorage
    saveDisplaySettings(display)

    // Save tenant settings to server
    try {
      await updateGeneralSettings({
        timezone,
        language,
      })
      toast.success('Settings saved successfully')
    } catch (err) {
      toast.error(getErrorMessage(err))
    }
  }

  const handleReset = () => {
    if (settings) {
      setTimezone(settings.general.timezone || 'UTC')
      setLanguage(settings.general.language || 'en')
    }
    setDisplay(DEFAULT_DISPLAY)
    saveDisplaySettings(DEFAULT_DISPLAY)
    toast.info('Settings reset to defaults')
  }

  if (isLoading) {
    return <LoadingSkeleton />
  }

  return (
    <>
      <Main>
        <PageHeader
          title="General Settings"
          description="Configure general platform settings and preferences"
        >
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleReset} disabled={isUpdating}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset
            </Button>
            <Button onClick={handleSave} disabled={isUpdating}>
              <Save className="mr-2 h-4 w-4" />
              {isUpdating ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </PageHeader>

        <div className="mt-6 grid gap-6">
          {/* Localization Settings (saved to server) */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Localization
              </CardTitle>
              <CardDescription>
                Language and timezone settings for your organization
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="language">Language</Label>
                  <Select value={language} onValueChange={setLanguage}>
                    <SelectTrigger id="language">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {VALID_LANGUAGES.map((lang) => (
                        <SelectItem key={lang.value} value={lang.value}>
                          {lang.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select value={timezone} onValueChange={setTimezone}>
                    <SelectTrigger id="timezone">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {VALID_TIMEZONES.map((tz) => (
                        <SelectItem key={tz.value} value={tz.value}>
                          {tz.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Display Preferences (saved to localStorage) */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Display Preferences
              </CardTitle>
              <CardDescription>
                Date, time, and layout preferences stored locally in your browser
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="dateFormat" className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Date Format
                  </Label>
                  <Select
                    value={display.dateFormat}
                    onValueChange={(value) => setDisplay({ ...display, dateFormat: value })}
                  >
                    <SelectTrigger id="dateFormat">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                      <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                      <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="timeFormat" className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Time Format
                  </Label>
                  <Select
                    value={display.timeFormat}
                    onValueChange={(value) => setDisplay({ ...display, timeFormat: value })}
                  >
                    <SelectTrigger id="timeFormat">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="24h">24-hour (14:30)</SelectItem>
                      <SelectItem value="12h">12-hour (2:30 PM)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Compact Mode</Label>
                  <p className="text-sm text-muted-foreground">
                    Use compact layout for tables and lists
                  </p>
                </div>
                <Switch
                  checked={display.compactMode}
                  onCheckedChange={(checked) => setDisplay({ ...display, compactMode: checked })}
                />
              </div>
            </CardContent>
          </Card>

          {/* Auto Refresh Settings (saved to localStorage) */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RotateCcw className="h-5 w-5" />
                Data Refresh
              </CardTitle>
              <CardDescription>
                Configure automatic data refresh behavior (stored locally)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Auto Refresh</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically refresh dashboard and data tables
                  </p>
                </div>
                <Switch
                  checked={display.autoRefresh}
                  onCheckedChange={(checked) => setDisplay({ ...display, autoRefresh: checked })}
                />
              </div>

              {display.autoRefresh && (
                <div className="space-y-2">
                  <Label htmlFor="refreshInterval">Refresh Interval</Label>
                  <Select
                    value={display.refreshInterval}
                    onValueChange={(value) => setDisplay({ ...display, refreshInterval: value })}
                  >
                    <SelectTrigger id="refreshInterval">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30 seconds</SelectItem>
                      <SelectItem value="60">1 minute</SelectItem>
                      <SelectItem value="300">5 minutes</SelectItem>
                      <SelectItem value="600">10 minutes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </Main>
    </>
  )
}
