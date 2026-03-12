'use client'

import { useState, useEffect } from 'react'
import { Main } from '@/components/layout'
import { PageHeader } from '@/features/shared'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Bell, Mail, AlertTriangle, Save, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  useNotificationPreferencesApi,
  updateNotificationPreferences,
  invalidatePreferencesCache,
  type NotificationPreferences,
} from '@/features/notifications/api/use-notification-api'
import { NOTIFICATION_TYPES } from '@/features/notifications/lib/notification-types'

export default function NotificationsSettingsPage() {
  const [isSaving, setIsSaving] = useState(false)

  // Fetch preferences from API
  const { data: preferences, isLoading, error } = useNotificationPreferencesApi()

  // Local state for editing (initialized from API data)
  const [inAppEnabled, setInAppEnabled] = useState(true)
  const [emailDigest, setEmailDigest] = useState('daily')
  const [mutedTypes, setMutedTypes] = useState<string[]>([])
  const [minSeverity, setMinSeverity] = useState('info')

  // Sync local state when API data loads
  useEffect(() => {
    if (preferences) {
      setInAppEnabled(preferences.in_app_enabled)
      setEmailDigest(preferences.email_digest)
      setMutedTypes(preferences.muted_types ?? [])
      setMinSeverity(preferences.min_severity)
    }
  }, [preferences])

  const toggleMutedType = (typeId: string) => {
    setMutedTypes((prev) =>
      prev.includes(typeId) ? prev.filter((t) => t !== typeId) : [...prev, typeId]
    )
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const update: Partial<NotificationPreferences> = {
        in_app_enabled: inAppEnabled,
        email_digest: emailDigest,
        muted_types: mutedTypes,
        min_severity: minSeverity,
      }
      await updateNotificationPreferences(update)
      await invalidatePreferencesCache()
      toast.success('Notification preferences saved')
    } catch {
      toast.error('Failed to save notification preferences')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <Main>
        <PageHeader
          title="Notification Settings"
          description="Configure how and when you receive notifications"
        />
        <div className="mt-6 flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </Main>
    )
  }

  if (error && !preferences) {
    return (
      <Main>
        <PageHeader
          title="Notification Settings"
          description="Configure how and when you receive notifications"
        />
        <div className="mt-6 flex flex-col items-center justify-center py-12 text-muted-foreground">
          <AlertTriangle className="h-8 w-8 mb-2" />
          <p className="text-sm">Failed to load notification preferences</p>
          <p className="text-xs">Please try refreshing the page</p>
        </div>
      </Main>
    )
  }

  return (
    <>
      <Main>
        <PageHeader
          title="Notification Settings"
          description="Configure how and when you receive notifications"
        >
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </PageHeader>

        <div className="mt-6 grid gap-6">
          {/* In-App Notifications Toggle */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                In-App Notifications
              </CardTitle>
              <CardDescription>Receive notifications within the application</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                    <Bell className="h-5 w-5" />
                  </div>
                  <div>
                    <Label className="text-base">Enable In-App Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      {inAppEnabled ? 'Enabled' : 'Disabled'}
                    </p>
                  </div>
                </div>
                <Switch checked={inAppEnabled} onCheckedChange={setInAppEnabled} />
              </div>
            </CardContent>
          </Card>

          {/* Digest Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Email Digest
              </CardTitle>
              <CardDescription>Receive a summary of security events (coming soon)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Digest Frequency</Label>
                  <p className="text-sm text-muted-foreground">
                    How often to receive email summaries
                  </p>
                </div>
                <Select value={emailDigest} onValueChange={setEmailDigest}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Never</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Minimum Severity Filter */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Severity Filter
              </CardTitle>
              <CardDescription>
                Only receive notifications at or above this severity
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Minimum Severity</Label>
                  <p className="text-sm text-muted-foreground">
                    Notifications below this level will be suppressed
                  </p>
                </div>
                <Select value={minSeverity} onValueChange={setMinSeverity}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">Info (all)</SelectItem>
                    <SelectItem value="low">Low & above</SelectItem>
                    <SelectItem value="medium">Medium & above</SelectItem>
                    <SelectItem value="high">High & above</SelectItem>
                    <SelectItem value="critical">Critical only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Muted Notification Types */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notification Types
              </CardTitle>
              <CardDescription>Toggle individual notification types on or off</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {NOTIFICATION_TYPES.map((notifType, index) => {
                  const isMuted = mutedTypes.includes(notifType.id)
                  return (
                    <div key={notifType.id}>
                      {index > 0 && <Separator className="mb-6" />}
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-base">{notifType.name}</Label>
                          <p className="text-sm text-muted-foreground">{notifType.description}</p>
                        </div>
                        <Switch
                          checked={!isMuted}
                          onCheckedChange={() => toggleMutedType(notifType.id)}
                          disabled={!inAppEnabled}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </Main>
    </>
  )
}
